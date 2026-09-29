import { ethers } from 'ethers';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

/**
 * Stage 4 Dispute Resolver Funding Script
 *
 * Transfers exactly 0.10 MON from the authorized deployer account
 * (0x19539685BD5ceC58f00B3EfE8b76B2Cc48cb2B70)
 * to the active secure dispute resolver:
 * (0x12f9e53c31F7629aCAE0BA70588794945EC6c35E)
 *
 * Strictly validates all required pre-flight invariants prior to broadcast.
 */

const EXPECTED_CHAIN_ID = 10143n;
const EXPECTED_DEPLOYER = ethers.getAddress('0x19539685BD5ceC58f00B3EfE8b76B2Cc48cb2B70');
const EXPECTED_RESOLVER = ethers.getAddress('0x12f9e53c31F7629aCAE0BA70588794945EC6c35E');
const FUNDING_AMOUNT = ethers.parseEther('0.10');

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
  console.log('VERIQOMESH NETWORK — NEW STAGE 4 RESOLVER FUNDING');
  console.log(`Mode: ${isPreflightOnly ? 'READ-ONLY PREFLIGHT AUDIT' : 'LIVE 0.10 MON TRANSFER'}`);
  console.log('================================================================\n');

  if (!fs.existsSync(DEPLOYMENTS_FILE)) {
    throw new Error(`Deployment record not found at: ${DEPLOYMENTS_FILE}`);
  }
  const deployment = JSON.parse(fs.readFileSync(DEPLOYMENTS_FILE, 'utf8'));
  const escrowAddress = ethers.getAddress(deployment.contracts.TrustMeshEscrow.address);
  const registryAddress = ethers.getAddress(deployment.contracts.TrustReceiptRegistry.address);

  const provider = new ethers.JsonRpcProvider(RPC_URL);

  console.log('--- PRE-BROADCAST SAFETY INVARIANTS ---');

  // Check 1: chainId == 10143
  const network = await provider.getNetwork();
  console.log(`[1/10] Chain ID:              ${network.chainId} (Expected: ${EXPECTED_CHAIN_ID})`);
  if (network.chainId !== EXPECTED_CHAIN_ID) {
    throw new Error(`Chain ID mismatch: ${network.chainId} !== ${EXPECTED_CHAIN_ID}`);
  }

  // Contract instances
  const escrowAbi = [
    'function disputeResolver() view returns (address)',
    'function receiptRegistry() view returns (address)',
    'function totalEscrowLiabilities() view returns (uint256)',
  ];
  const registryAbi = ['function escrowContract() view returns (address)'];

  const escrow = new ethers.Contract(escrowAddress, escrowAbi, provider);
  const registry = new ethers.Contract(registryAddress, registryAbi, provider);

  // Check 2: escrow.disputeResolver() == new resolver
  const onchainResolver = ethers.getAddress(await escrow.disputeResolver());
  console.log(`[2/10] escrow.disputeResolver: ${onchainResolver}`);
  if (onchainResolver !== EXPECTED_RESOLVER) {
    throw new Error(
      `Onchain escrow disputeResolver mismatch: ${onchainResolver} !== ${EXPECTED_RESOLVER}`,
    );
  }

  // Check 3: new resolver code == 0x
  const resolverCode = await provider.getCode(EXPECTED_RESOLVER);
  console.log(`[3/10] New Resolver Code:     ${resolverCode} (Is EOA: ${resolverCode === '0x'})`);
  if (resolverCode !== '0x') {
    throw new Error(`New resolver has code deployed: ${resolverCode}`);
  }

  // Check 4: new resolver has no EIP-7702 delegation
  const hasDelegation = resolverCode.startsWith('0xef0100');
  console.log(`[4/10] EIP-7702 Delegation:   ${hasDelegation ? 'DETECTED!' : 'CLEAN (NONE)'}`);
  if (hasDelegation) {
    throw new Error('EIP-7702 delegation detected on new resolver account');
  }

  // Check 5: new resolver nonce == 0
  const resolverNonce = await provider.getTransactionCount(EXPECTED_RESOLVER, 'latest');
  console.log(`[5/10] New Resolver Nonce:    ${resolverNonce} (Expected: 0)`);
  if (resolverNonce !== 0) {
    throw new Error(`New resolver nonce is not 0: ${resolverNonce}`);
  }

  // Check 6: escrow liabilities == 0.001 MON
  const liabilities = await escrow.totalEscrowLiabilities();
  console.log(
    `[6/10] Escrow Liabilities:    ${ethers.formatEther(liabilities)} MON (Expected: 0.001 MON)`,
  );
  if (liabilities !== ethers.parseEther('0.001')) {
    throw new Error(
      `Escrow liabilities invariant mismatch: ${ethers.formatEther(liabilities)} MON`,
    );
  }

  // Check 7: escrow balance == 0.001 MON
  const escrowBal = await provider.getBalance(escrowAddress);
  console.log(
    `[7/10] Escrow Balance:        ${ethers.formatEther(escrowBal)} MON (Expected: 0.001 MON)`,
  );
  if (escrowBal !== ethers.parseEther('0.001')) {
    throw new Error(`Escrow balance invariant mismatch: ${ethers.formatEther(escrowBal)} MON`);
  }

  // Check 8: registry balance == 0
  const registryBal = await provider.getBalance(registryAddress);
  console.log(
    `[8/10] Registry Balance:      ${ethers.formatEther(registryBal)} MON (Expected: 0.0 MON)`,
  );
  if (registryBal !== 0n) {
    throw new Error(`Registry balance invariant mismatch: ${ethers.formatEther(registryBal)} MON`);
  }

  // Check 9: deployer is the secure encrypted-keystore account
  const deployerAddress = ethers.getAddress(deployment.deployerAddress);
  console.log(`[9/10] Deployer Address:      ${deployerAddress}`);
  if (deployerAddress !== EXPECTED_DEPLOYER) {
    throw new Error(`Deployer address mismatch: ${deployerAddress} !== ${EXPECTED_DEPLOYER}`);
  }

  // Check 10: deployer balance is sufficient for 0.10 MON plus gas
  const deployerBal = await provider.getBalance(deployerAddress);
  console.log(
    `[10/10] Deployer Balance:     ${ethers.formatEther(deployerBal)} MON (Required: >= 0.15 MON)`,
  );
  if (deployerBal < ethers.parseEther('0.15')) {
    throw new Error(`Insufficient deployer balance: ${ethers.formatEther(deployerBal)} MON`);
  }

  console.log('\n✓ ALL 10 PRE-BROADCAST SAFETY INVARIANTS PASSED 100% CLEANLY.\n');

  if (isPreflightOnly) {
    console.log('Preflight check complete. No transactions broadcast.');
    return;
  }

  // UNLOCK DEPLOYER WALLET
  const defaultKeystoreDir = path.join(
    process.env.USERPROFILE || process.env.HOME || '',
    '.foundry',
    'keystores',
  );
  const deployerAccountName = process.env.DEPLOYER_ACCOUNT || 'monad-deployer';
  const keystorePath = path.join(defaultKeystoreDir, deployerAccountName);

  if (!fs.existsSync(keystorePath)) {
    throw new Error(`Deployer keystore not found at: ${keystorePath}`);
  }

  const keystoreJson = JSON.parse(fs.readFileSync(keystorePath, 'utf8'));
  let deployerPassword = process.env.DEPLOYER_PASSWORD || process.env.ETH_PASSWORD;

  if (!deployerPassword) {
    console.log('[?] Enter keystore password to unlock deployer wallet:');
    deployerPassword = await promptPasswordInteractive('Enter Keystore Password: ');
  }

  const deployer = ethers.Wallet.fromEncryptedJsonSync(
    JSON.stringify(keystoreJson),
    deployerPassword,
  ).connect(provider);

  if (ethers.getAddress(deployer.address) !== EXPECTED_DEPLOYER) {
    throw new Error(
      `FATAL: Decrypted address ${deployer.address} does not match expected deployer ${EXPECTED_DEPLOYER}`,
    );
  }

  console.log(`✓ Deployer Keystore Unlocked: ${deployer.address}`);
  console.log(
    `Broadcasting funding transaction: ${ethers.formatEther(FUNDING_AMOUNT)} MON -> ${EXPECTED_RESOLVER}...`,
  );

  const currentDeployerNonce = await provider.getTransactionCount(deployer.address, 'latest');

  const tx = await deployer.sendTransaction({
    to: EXPECTED_RESOLVER,
    value: FUNDING_AMOUNT,
    nonce: currentDeployerNonce,
  });

  console.log(`Transaction Broadcast! Hash: ${tx.hash}`);
  console.log('Waiting for block confirmation...');

  const receipt = await tx.wait(1);
  console.log(`Transaction Confirmed in Block #${receipt.blockNumber}!\n`);

  // READ-ONLY POST-FUNDING VERIFICATION
  console.log('--- POST-FUNDING READ-ONLY VERIFICATION ---');
  const postResolverBal = await provider.getBalance(EXPECTED_RESOLVER);
  const postResolverCode = await provider.getCode(EXPECTED_RESOLVER);
  const postResolverNonce = await provider.getTransactionCount(EXPECTED_RESOLVER, 'latest');
  const postDeployerBal = await provider.getBalance(EXPECTED_DEPLOYER);
  const postDeployerNonce = await provider.getTransactionCount(EXPECTED_DEPLOYER, 'latest');
  const postEscrowBal = await provider.getBalance(escrowAddress);
  const postEscrowLiabilities = await escrow.totalEscrowLiabilities();
  const postRegistryBal = await provider.getBalance(registryAddress);

  console.log(`Funding Transaction Hash:    ${receipt.hash}`);
  console.log(`Block Number:                ${receipt.blockNumber}`);
  console.log(`Transaction Status:          ${receipt.status} (1 = SUCCESS)`);
  console.log(`Sender:                      ${deployer.address}`);
  console.log(`Recipient:                   ${EXPECTED_RESOLVER}`);
  console.log(`Exact Value:                 ${ethers.formatEther(FUNDING_AMOUNT)} MON`);
  console.log(`Resolver Balance After:      ${ethers.formatEther(postResolverBal)} MON`);
  console.log(`Resolver Nonce:              ${postResolverNonce}`);
  console.log(`Resolver Code:               ${postResolverCode}`);
  console.log(
    `Resolver EIP-7702 Status:    ${postResolverCode.startsWith('0xef0100') ? 'DELEGATED' : 'CLEAN'}`,
  );
  console.log(`Deployer Balance After:      ${ethers.formatEther(postDeployerBal)} MON`);
  console.log(`Deployer Nonce After:        ${postDeployerNonce}`);
  console.log(`Escrow Balance:              ${ethers.formatEther(postEscrowBal)} MON`);
  console.log(`Escrow Liabilities:          ${ethers.formatEther(postEscrowLiabilities)} MON`);
  console.log(`Registry Balance:            ${ethers.formatEther(postRegistryBal)} MON`);

  // Assertions
  if (receipt.status !== 1) throw new Error('Transaction reverted');
  if (postResolverBal !== FUNDING_AMOUNT)
    throw new Error(
      `Resolver balance ${ethers.formatEther(postResolverBal)} MON !== expected 0.10 MON`,
    );
  if (postResolverNonce !== 0) throw new Error(`Resolver nonce ${postResolverNonce} !== 0`);
  if (postResolverCode !== '0x') throw new Error('Resolver has code');
  if (postEscrowLiabilities !== ethers.parseEther('0.001'))
    throw new Error('Escrow liabilities altered');
  if (postEscrowBal !== ethers.parseEther('0.001')) throw new Error('Escrow balance altered');
  if (postRegistryBal !== 0n) throw new Error('Registry balance altered');

  console.log('\n================================================================');
  console.log('STAGE 4 RESOLVER PREFUND COMPLETE');
  console.log('RESOLVER BALANCE CONFIRMED: 0.10 MON');
  console.log('ADDITIONAL TESTNET TRANSACTIONS BROADCAST: 0');
  console.log('NO STAGE 4 EXECUTION IS AUTHORIZED IN THIS STEP');
  console.log('================================================================\n');
}

main().catch((err) => {
  console.error('\nFatal Error in Resolver Funding:', err.message);
  process.exit(1);
});
