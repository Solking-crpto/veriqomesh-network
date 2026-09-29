import { ethers } from 'ethers';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

/**
 * VeriqoMesh Network — Stage 4 Dispute Resolver Rotation Script
 *
 * Rotates the onchain dispute resolver in TrustMeshEscrow from:
 * Old Compromised Test Resolver: 0x90F79bf6EB2c4f870365E785982E1f101E93b906
 * To Fresh Secure Resolver:       0x12f9e53c31F7629aCAE0BA70588794945EC6c35E
 *
 * Strictly authorized via escrow.setDisputeResolver() signed by contract owner:
 * 0x19539685BD5ceC58f00B3EfE8b76B2Cc48cb2B70 (~/.foundry/keystores/monad-deployer)
 */

const EXPECTED_CHAIN_ID = 10143n;
const ESCROW_ADDRESS = ethers.getAddress('0x925ea880cA53DE0352b84B24d0C0dee5B258015A');
const REGISTRY_ADDRESS = ethers.getAddress('0xE1994e0dF7CD5A836be4b02AE2164A542418B819');
const EXPECTED_OWNER = ethers.getAddress('0x19539685BD5ceC58f00B3EfE8b76B2Cc48cb2B70');
const OLD_RESOLVER = ethers.getAddress('0x90F79bf6EB2c4f870365E785982E1f101E93b906');
const NEW_RESOLVER = ethers.getAddress('0x12f9e53c31F7629aCAE0BA70588794945EC6c35E');

const RPC_URL = process.env.MONAD_TESTNET_RPC_URL || 'https://testnet-rpc.monad.xyz';
const DEPLOYMENTS_FILE = path.resolve('deployments/monad-testnet.json');

async function promptPasswordInteractive(promptText = 'Enter Keystore Password: ') {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    try {
      if (process.stdin.isTTY && typeof process.stdin.setRawMode === 'function') {
        process.stdout.write(promptText);
        const stdin = process.stdin;
        stdin.setRawMode(true);
        stdin.resume();
        let pwd = '';
        const onData = (buffer) => {
          const char = buffer.toString('utf8');
          if (char === '\n' || char === '\r' || char === '\u0004') {
            stdin.setRawMode(false);
            stdin.pause();
            stdin.removeListener('data', onData);
            process.stdout.write('\n');
            rl.close();
            resolve(pwd);
          } else if (char === '\u0003') {
            process.exit(1);
          } else if (char === '\b' || char === '\x7f') {
            if (pwd.length > 0) pwd = pwd.slice(0, -1);
          } else {
            pwd += char;
          }
        };
        stdin.on('data', onData);
      } else {
        rl.question(promptText, (ans) => {
          rl.close();
          resolve(ans);
        });
      }
    } catch {
      rl.question(promptText, (ans) => {
        rl.close();
        resolve(ans);
      });
    }
  });
}

async function main() {
  const isPreflightOnly = process.argv.includes('--preflight');

  console.log('================================================================');
  console.log('VERIQOMESH NETWORK — ROTATE STAGE 4 DISPUTE RESOLVER');
  console.log(
    `Execution Mode: ${isPreflightOnly ? 'PREFLIGHT READ-ONLY AUDIT' : 'LIVE ONCHAIN ROTATION'}`,
  );
  console.log('================================================================\n');

  const provider = new ethers.JsonRpcProvider(RPC_URL);

  const escrowAbi = [
    'function owner() view returns (address)',
    'function disputeResolver() view returns (address)',
    'function receiptRegistry() view returns (address)',
    'function totalEscrowLiabilities() view returns (uint256)',
    'function setDisputeResolver(address newResolver) external',
    'event DisputeResolverUpdated(address indexed oldResolver, address indexed newResolver)',
  ];
  const registryAbi = ['function escrowContract() view returns (address)'];

  const escrow = new ethers.Contract(ESCROW_ADDRESS, escrowAbi, provider);
  const registry = new ethers.Contract(REGISTRY_ADDRESS, registryAbi, provider);

  console.log('--- 1. PRE-BROADCAST INVARIANT ASSERTIONS ---');

  // 1. chainId == 10143
  const network = await provider.getNetwork();
  console.log(`[1/10] Chain ID:              ${network.chainId} (Expected: ${EXPECTED_CHAIN_ID})`);
  if (network.chainId !== EXPECTED_CHAIN_ID) {
    throw new Error(`Chain ID mismatch: ${network.chainId} !== ${EXPECTED_CHAIN_ID}`);
  }

  // 2. escrow.owner() == secure deployer
  const onchainOwner = ethers.getAddress(await escrow.owner());
  console.log(`[2/10] escrow.owner():        ${onchainOwner}`);
  if (onchainOwner !== EXPECTED_OWNER) {
    throw new Error(`Escrow owner mismatch: ${onchainOwner} !== ${EXPECTED_OWNER}`);
  }

  // 3. escrow.disputeResolver() == OLD resolver
  const currentResolver = ethers.getAddress(await escrow.disputeResolver());
  console.log(`[3/10] Current onchain resolver: ${currentResolver}`);
  if (currentResolver !== OLD_RESOLVER) {
    throw new Error(`Current dispute resolver mismatch: ${currentResolver} !== ${OLD_RESOLVER}`);
  }

  // 4. new resolver == 0x12f9e53c31F7629aCAE0BA70588794945EC6c35E
  console.log(`[4/10] New resolver target:   ${NEW_RESOLVER}`);
  if (NEW_RESOLVER === OLD_RESOLVER) {
    throw new Error('New resolver cannot be equal to old resolver');
  }

  // 5. new resolver code == 0x
  const newResolverCode = await provider.getCode(NEW_RESOLVER);
  console.log(
    `[5/10] New resolver code:     ${newResolverCode} (Is EOA: ${newResolverCode === '0x'})`,
  );
  if (newResolverCode !== '0x') {
    throw new Error(`New resolver is not a clean EOA. Code length: ${newResolverCode.length}`);
  }

  // 6. new resolver nonce == 0
  const newResolverNonce = await provider.getTransactionCount(NEW_RESOLVER, 'latest');
  console.log(`[6/10] New resolver nonce:    ${newResolverNonce} (Expected: 0)`);
  if (newResolverNonce !== 0) {
    throw new Error(`New resolver nonce is not 0: ${newResolverNonce}`);
  }

  // 7. existing escrow & registry addresses unchanged
  const registryEscrow = ethers.getAddress(await registry.escrowContract());
  const escrowRegistry = ethers.getAddress(await escrow.receiptRegistry());
  console.log(
    `[7/10] Wiring readback:       escrow.receiptRegistry=${escrowRegistry}, registry.escrowContract=${registryEscrow}`,
  );
  if (registryEscrow !== ESCROW_ADDRESS || escrowRegistry !== REGISTRY_ADDRESS) {
    throw new Error('Escrow/Registry contract wiring mismatch');
  }

  // 8. escrow liabilities == 0.001 MON
  const liabilities = await escrow.totalEscrowLiabilities();
  console.log(
    `[8/10] Escrow Liabilities:    ${ethers.formatEther(liabilities)} MON (Expected: 0.001 MON)`,
  );
  if (liabilities !== ethers.parseEther('0.001')) {
    throw new Error(
      `Escrow liabilities invariant mismatch: ${ethers.formatEther(liabilities)} MON`,
    );
  }

  // 9. escrow balance == 0.001 MON
  const escrowBal = await provider.getBalance(ESCROW_ADDRESS);
  console.log(
    `[9/10] Escrow Balance:        ${ethers.formatEther(escrowBal)} MON (Expected: 0.001 MON)`,
  );
  if (escrowBal !== ethers.parseEther('0.001')) {
    throw new Error(`Escrow balance invariant mismatch: ${ethers.formatEther(escrowBal)} MON`);
  }

  // 10. registry balance == 0
  const registryBal = await provider.getBalance(REGISTRY_ADDRESS);
  console.log(
    `[10/10] Registry Balance:     ${ethers.formatEther(registryBal)} MON (Expected: 0.0 MON)`,
  );
  if (registryBal !== 0n) {
    throw new Error(`Registry balance invariant mismatch: ${ethers.formatEther(registryBal)} MON`);
  }

  console.log('\n✓ ALL 10 PRE-ROTATION SAFETY CHECKS PASSED 100% CLEANLY.\n');

  if (isPreflightOnly) {
    console.log('Preflight audit complete. Zero transactions broadcast.');
    return;
  }

  // UNLOCK DEPLOYER WALLET INTERACTIVELY
  console.log('--- 2. SECURE DEPLOYER UNLOCK ---');
  const defaultKeystoreDir = path.join(
    process.env.USERPROFILE || process.env.HOME || '',
    '.foundry',
    'keystores',
  );
  const keystorePath = path.join(defaultKeystoreDir, 'monad-deployer');
  if (!fs.existsSync(keystorePath)) {
    throw new Error(`Deployer keystore not found at: ${keystorePath}`);
  }

  const keystoreJson = JSON.parse(fs.readFileSync(keystorePath, 'utf8'));
  let deployerPassword = process.env.DEPLOYER_PASSWORD || process.env.ETH_PASSWORD;

  if (!deployerPassword) {
    console.log('[?] Enter keystore password for monad-deployer:');
    deployerPassword = await promptPasswordInteractive('Enter Keystore Password: ');
  }

  const deployer = ethers.Wallet.fromEncryptedJsonSync(
    JSON.stringify(keystoreJson),
    deployerPassword,
  ).connect(provider);

  if (ethers.getAddress(deployer.address) !== EXPECTED_OWNER) {
    throw new Error(
      `Decrypted address ${deployer.address} does not match expected owner ${EXPECTED_OWNER}`,
    );
  }
  console.log(`✓ Owner Unlocked: ${deployer.address}`);

  // BROADCAST SETDISPUTERESOLVER
  console.log('\n--- 3. BROADCASTING ONCHAIN ROTATION ---');
  console.log(`Calling escrow.setDisputeResolver(${NEW_RESOLVER})...`);

  const escrowAsOwner = escrow.connect(deployer);
  const tx = await escrowAsOwner.setDisputeResolver(NEW_RESOLVER);
  console.log(`Transaction Broadcast! Hash: ${tx.hash}`);
  console.log('Waiting for block confirmation...');

  const receipt = await tx.wait(1);
  console.log(`Transaction Confirmed in Block #${receipt.blockNumber}!\n`);

  // POST-TRANSACTION VERIFICATION
  console.log('--- 4. POST-ROTATION READ-ONLY VERIFICATION ---');
  const finalActiveResolver = ethers.getAddress(await escrow.disputeResolver());
  const finalLiabilities = await escrow.totalEscrowLiabilities();
  const finalEscrowBal = await provider.getBalance(ESCROW_ADDRESS);
  const finalRegistryBal = await provider.getBalance(REGISTRY_ADDRESS);
  const finalDeployerBal = await provider.getBalance(EXPECTED_OWNER);
  const finalDeployerNonce = await provider.getTransactionCount(EXPECTED_OWNER, 'latest');

  console.log(`Rotation Tx Hash:            ${receipt.hash}`);
  console.log(`Block Number:                ${receipt.blockNumber}`);
  console.log(`Transaction Status:          ${receipt.status} (1 = SUCCESS)`);
  console.log(`Old Resolver:                ${OLD_RESOLVER}`);
  console.log(`New Resolver:                ${NEW_RESOLVER}`);
  console.log(`Final Active Resolver:       ${finalActiveResolver}`);
  console.log(`Old Resolver Inactive:       ${finalActiveResolver !== OLD_RESOLVER}`);
  console.log(`Active Matches New:          ${finalActiveResolver === NEW_RESOLVER}`);
  console.log(`Deployer Balance After:      ${ethers.formatEther(finalDeployerBal)} MON`);
  console.log(`Deployer Nonce After:        ${finalDeployerNonce}`);
  console.log(`Escrow Liabilities:          ${ethers.formatEther(finalLiabilities)} MON`);
  console.log(`Escrow Balance:              ${ethers.formatEther(finalEscrowBal)} MON`);
  console.log(`Registry Balance:            ${ethers.formatEther(finalRegistryBal)} MON`);

  // Assertions
  if (receipt.status !== 1) throw new Error('Transaction reverted');
  if (finalActiveResolver !== NEW_RESOLVER) throw new Error('Onchain resolver not updated');
  if (finalLiabilities !== ethers.parseEther('0.001'))
    throw new Error('Escrow liabilities altered');
  if (finalEscrowBal !== ethers.parseEther('0.001')) throw new Error('Escrow balance altered');
  if (finalRegistryBal !== 0n) throw new Error('Registry balance altered');

  // UPDATE RUNTIME CONFIGURATION & DEPLOYMENT RECORDS
  console.log('\n--- 5. UPDATING CONFIGURATION & DEPLOYMENT RECORDS ---');
  // 1. Update deployments/monad-testnet.json
  if (fs.existsSync(DEPLOYMENTS_FILE)) {
    const depData = JSON.parse(fs.readFileSync(DEPLOYMENTS_FILE, 'utf8'));
    depData.historicalDisputeResolver = OLD_RESOLVER;
    depData.disputeResolverAddress = NEW_RESOLVER;
    depData.disputeResolverRotationTx = receipt.hash;
    depData.disputeResolverRotatedBlock = receipt.blockNumber;
    depData.updatedAt = new Date().toISOString();
    fs.writeFileSync(DEPLOYMENTS_FILE, JSON.stringify(depData, null, 2) + '\n');
    console.log(`✓ Updated ${DEPLOYMENTS_FILE}: Recorded historical + active resolver.`);
  }

  // 2. Update .env
  if (fs.existsSync('.env')) {
    let envData = fs.readFileSync('.env', 'utf8');
    envData = envData.replace(
      /DISPUTE_RESOLVER_ADDRESS=0x[0-9a-fA-F]+/,
      `DISPUTE_RESOLVER_ADDRESS=${NEW_RESOLVER}`,
    );
    if (!envData.includes('RESOLVER_KEYSTORE_ACCOUNT=')) {
      envData += `\nRESOLVER_KEYSTORE_ACCOUNT=veriqomesh-stage4-resolver\n`;
    }
    fs.writeFileSync('.env', envData);
    console.log(`✓ Updated .env: DISPUTE_RESOLVER_ADDRESS=${NEW_RESOLVER}`);
  }

  console.log('================================================================');
  console.log('STAGE 4 RESOLVER ONCHAIN ROTATION SUCCESSFUL');
  console.log(`ACTIVE DISPUTE RESOLVER: ${finalActiveResolver}`);
  console.log('NO RESOLVER FUNDING AUTHORIZED IN THIS STEP');
  console.log('NO STAGE 4 EXECUTION AUTHORIZED IN THIS STEP');
  console.log('================================================================\n');
}

main().catch((err) => {
  console.error('\nFatal Rotation Error:', err.message);
  process.exit(1);
});
