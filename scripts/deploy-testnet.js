import { ethers } from 'ethers';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { execSync } from 'node:child_process';

/**
 * TrustMesh Monad Metropolis Testnet Deployment Script
 *
 * Deterministic sequence:
 * 1. Preflight Chain ID, Wallet, Resolver & Artifact Verification
 * 2. Deploy TrustMeshEscrow(temporaryDesignatedResolver)
 * 3. Deploy TrustReceiptRegistry(escrowAddress)
 * 4. Wire Escrow Authorization: escrow.setReceiptRegistry(registryAddress)
 * 5. Independent Onchain Readback & Invariant Verification
 * 6. Update deployments/monad-testnet.json
 *
 * Usage:
 *   node scripts/deploy-testnet.js --preflight  # Checks network and env without broadcasting
 *   node scripts/deploy-testnet.js              # Executes full live deployment
 */

const EXPECTED_CHAIN_ID = 10143n;
const DEFAULT_RPC_URL = 'https://testnet-rpc.monad.xyz';
const MIN_GAS_BALANCE = ethers.parseEther('0.05'); // Minimum 0.05 MON recommended for deployment
const DEPLOYMENTS_FILE = path.resolve('deployments/monad-testnet.json');
// Simple local .env parser if present
if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) {
        process.env[key] = val;
      }
    }
  }
}

async function promptPasswordInteractive(promptText = 'Enter Keystore Password: ') {
  return new Promise((resolve, reject) => {
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
  console.log('VERIQOMESH NETWORK — MONAD METROPOLIS TESTNET DEPLOYMENT');
  console.log(`Execution Mode: ${isPreflightOnly ? 'PREFLIGHT VERIFICATION ONLY' : 'LIVE BROADCAST DEPLOYMENT'}`);
  console.log('================================================================\n');

  // 1. RPC Connection & Chain ID Verification
  const rpcUrl = process.env.MONAD_TESTNET_RPC_URL || DEFAULT_RPC_URL;
  console.log(`[1/6] Connecting to RPC endpoint: ${rpcUrl}...`);

  let provider;
  let network;
  try {
    provider = new ethers.JsonRpcProvider(rpcUrl);
    network = await provider.getNetwork();
    console.log(`      ✓ Connected successfully. Detected Chain ID: ${network.chainId}`);
  } catch (err) {
    console.error(`      ✗ FATAL: Failed to connect to RPC endpoint: ${rpcUrl}`);
    console.error(`      Error: ${err.message}`);
    process.exit(1);
  }

  const configuredExpectedChainId = process.env.EXPECTED_CHAIN_ID
    ? BigInt(process.env.EXPECTED_CHAIN_ID)
    : EXPECTED_CHAIN_ID;

  if (network.chainId !== configuredExpectedChainId) {
    console.error(`\n[!] FATAL CHAIN ID MISMATCH:`);
    console.error(`    Expected Chain ID: ${configuredExpectedChainId} (Monad Metropolis Testnet)`);
    console.error(`    Detected Chain ID: ${network.chainId}`);
    console.error(`    Aborting to prevent accidental deployment to incorrect network.\n`);
    process.exit(1);
  }

  // 2. Artifact Verification
  console.log('\n[2/6] Verifying compiled contract artifacts...');
  const outDir = path.resolve('contracts/out');
  const escrowArtifactPath = path.join(outDir, 'TrustMeshEscrow.sol', 'TrustMeshEscrow.json');
  const registryArtifactPath = path.join(outDir, 'TrustReceiptRegistry.sol', 'TrustReceiptRegistry.json');

  const escrowArtifactExists = fs.existsSync(escrowArtifactPath);
  const registryArtifactExists = fs.existsSync(registryArtifactPath);

  if (!escrowArtifactExists || !registryArtifactExists) {
    console.error('      ✗ FATAL: Missing contract artifacts. Run "forge build" in contracts/ first.');
    process.exit(1);
  }

  const escrowArtifact = JSON.parse(fs.readFileSync(escrowArtifactPath, 'utf8'));
  const registryArtifact = JSON.parse(fs.readFileSync(registryArtifactPath, 'utf8'));
  console.log('      ✓ Escrow artifact verified.');
  console.log('      ✓ Receipt Registry artifact verified.');

  // 3. Resolver Address Format & Checksum Validation
  console.log('\n[3/6] Validating Dispute Resolver configuration...');
  const rawResolver = process.env.DISPUTE_RESOLVER_ADDRESS;
  let disputeResolver = null;
  let resolverValid = false;

  if (rawResolver) {
    try {
      disputeResolver = ethers.getAddress(rawResolver); // Enforces checksum format
      if (disputeResolver === ethers.ZeroAddress) {
        throw new Error('Zero address (0x0) cannot be used as dispute resolver.');
      }
      resolverValid = true;
      console.log(`      ✓ Validated Resolver Address: ${disputeResolver}`);
      console.log(`      ✓ Role: Temporary designated testnet dispute resolver`);
      console.log(`        (Note: Explicitly NOT the Stage 4 Human Judge Network)`);
    } catch (err) {
      console.error(`      ✗ Invalid DISPUTE_RESOLVER_ADDRESS format: ${err.message}`);
    }
  } else {
    console.warn('      [!] DISPUTE_RESOLVER_ADDRESS is not set.');
  }

  // 4. Deployer Wallet & Balance Preflight (Foundry Account & Secure Key Support)
  console.log('\n[4/6] Checking deployer credentials (Foundry account / secure key)...');
  const deployerAccountName = process.env.DEPLOYER_ACCOUNT || process.env.ETH_KEYSTORE_ACCOUNT;
  const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;
  let deployer = null;
  let deployerAddress = 'UNAVAILABLE';
  let deployerBalance = 0n;
  let deployerAccountAvailable = false;
  let keystoreJson = null;

  // Option A: Foundry Keystore Account (~/.foundry/keystores/<account_name>)
  const defaultKeystoreDir = path.join(process.env.USERPROFILE || process.env.HOME || '', '.foundry', 'keystores');
  let selectedKeystorePath = null;

  if (deployerAccountName) {
    const candidatePath = path.join(defaultKeystoreDir, deployerAccountName);
    if (fs.existsSync(candidatePath)) {
      selectedKeystorePath = candidatePath;
    } else {
      console.warn(`      [!] Specified Foundry account "${deployerAccountName}" not found at: ${candidatePath}`);
    }
  } else if (fs.existsSync(defaultKeystoreDir)) {
    const availableKeystores = fs.readdirSync(defaultKeystoreDir).filter((f) => !f.startsWith('.'));
    if (availableKeystores.length === 1) {
      selectedKeystorePath = path.join(defaultKeystoreDir, availableKeystores[0]);
      console.log(`      [i] Auto-detected Foundry keystore: ${availableKeystores[0]}`);
    }
  }

  if (selectedKeystorePath && fs.existsSync(selectedKeystorePath)) {
    try {
      keystoreJson = JSON.parse(fs.readFileSync(selectedKeystorePath, 'utf8'));
      const rawAddress = keystoreJson.address || process.env.DEPLOYER_ADDRESS;
      if (rawAddress) {
        deployerAddress = ethers.getAddress('0x' + rawAddress.replace(/^0x/, ''));
        deployerAccountAvailable = true;
        deployerBalance = await provider.getBalance(deployerAddress);
        console.log(`      ✓ Foundry Keystore Account: ${path.basename(selectedKeystorePath)}`);
        console.log(`      ✓ Derived Deployer Address: ${deployerAddress}`);
        console.log(`      ✓ Native MON Balance:       ${ethers.formatEther(deployerBalance)} MON`);

        if (!isPreflightOnly) {
          let password = process.env.DEPLOYER_PASSWORD || process.env.ETH_PASSWORD;
          if (!password) {
            try {
              console.log('      [?] Prompting for keystore password interactively...');
              password = await promptPasswordInteractive('      Enter Keystore Password: ');
            } catch (promptErr) {
              console.error(`      ✗ FATAL: Failed to obtain keystore password: ${promptErr.message}`);
              process.exit(1);
            }
          }
          deployer = ethers.Wallet.fromEncryptedJsonSync(JSON.stringify(keystoreJson), password).connect(provider);
        }
      }
    } catch (err) {
      console.error(`      ✗ Failed to parse Foundry keystore file: ${err.message}`);
    }
  } else if (deployerKey) {
    try {
      deployer = new ethers.Wallet(deployerKey, provider);
      deployerAddress = deployer.address;
      deployerAccountAvailable = true;
      deployerBalance = await provider.getBalance(deployerAddress);
      console.log(`      ✓ Secure Environment Wallet Initialized`);
      console.log(`      ✓ Derived Deployer Address: ${deployerAddress}`);
      console.log(`      ✓ Native MON Balance:       ${ethers.formatEther(deployerBalance)} MON`);
    } catch (err) {
      console.error(`      ✗ Failed to parse DEPLOYER_PRIVATE_KEY: ${err.message}`);
    }
  } else {
    console.log('      [i] No Foundry keystore or deployer key detected in environment.');
  }

  // Preflight Status Summary Table
  const chainIdValid = network.chainId === configuredExpectedChainId;
  const balanceSufficient = deployerBalance >= MIN_GAS_BALANCE;
  const artifactsReady = escrowArtifactExists && registryArtifactExists;
  const allPreflightPass = chainIdValid && resolverValid && deployerAccountAvailable && balanceSufficient && artifactsReady;

  console.log('\n================================================================');
  console.log('DEPLOYMENT PREFLIGHT CHECK REPORT:');
  console.log(`  Target Network:            Monad Metropolis Testnet`);
  console.log(`  RPC Endpoint:              ${rpcUrl}`);
  console.log(`  Detected Chain ID:         ${network.chainId} (Expected: ${configuredExpectedChainId}) [${chainIdValid ? 'PASS' : 'FAIL'}]`);
  console.log(`  Deployer Address:          ${deployerAddress} [${deployerAccountAvailable ? 'PASS' : 'FAIL: UNAVAILABLE'}]`);
  console.log(`  Deployer Native Balance:   ${ethers.formatEther(deployerBalance)} MON [${balanceSufficient ? 'PASS' : 'FAIL: INSUFFICIENT (<0.05 MON)'}]`);
  console.log(`  Dispute Resolver Address:  ${disputeResolver || 'NOT CONFIGURED'} [${resolverValid ? 'PASS' : 'FAIL: INVALID/MISSING'}]`);
  console.log(`  Resolver Classification:   Temporary designated testnet dispute resolver`);
  console.log(`  Escrow Artifact:           ${escrowArtifactExists ? 'READY' : 'MISSING'}`);
  console.log(`  Registry Artifact:         ${registryArtifactExists ? 'READY' : 'MISSING'}`);
  console.log('================================================================\n');

  if (isPreflightOnly || !allPreflightPass) {
    if (allPreflightPass) {
      console.log('================================================================');
      console.log('PREFLIGHT STATUS: ALL CHECKS PASSED!');
      console.log('Stage Classification: Stage 3.6 — Pre-Deployment Ready');
      console.log('STOPPING: Awaiting explicit user confirmation before broadcasting.');
      console.log('================================================================\n');
      process.exit(0);
    } else {
      console.log('================================================================');
      console.log('PREFLIGHT STATUS: STOPPED (Prerequisites pending)');
      console.log('The following prerequisites must be met before deployment:');
      if (!chainIdValid) console.log(' - Chain ID must be 10143');
      if (!resolverValid) console.log(' - DISPUTE_RESOLVER_ADDRESS must be set to a valid non-zero checksummed address');
      if (!deployerAccountAvailable) console.log(' - Deployer account must be configured via DEPLOYER_ACCOUNT (Foundry keystore) or DEPLOYER_PRIVATE_KEY');
      if (!balanceSufficient) console.log(' - Deployer account must have at least 0.05 MON (fund via https://faucet.monad.xyz)');
      if (!artifactsReady) console.log(' - Contract artifacts must be compiled (run `forge build`)');
      console.log('Stage Classification: Stage 3.6 — Pre-Deployment Ready');
      console.log('================================================================\n');
      process.exit(1);
    }
  }

  // Live Deployment Guard
  if (!deployer) {
    console.error('✗ FATAL: Cannot execute deployment without DEPLOYER_PRIVATE_KEY.');
    process.exit(1);
  }

  if (deployerBalance < MIN_GAS_BALANCE) {
    console.error(`✗ FATAL: Insufficient balance. Deployer has ${ethers.formatEther(deployerBalance)} MON.`);
    console.error(`  Minimum required: ${ethers.formatEther(MIN_GAS_BALANCE)} MON.`);
    console.error(`  Claim testnet funds at https://faucet.monad.xyz`);
    process.exit(1);
  }

  // 5. LIVE BROADCAST DEPLOYMENT
  console.log('[5/6] EXECUTING LIVE TESTNET DEPLOYMENT...');

  // Step A: Deploy TrustMeshEscrow
  console.log('\n  -> Step 5.1: Deploying TrustMeshEscrow...');
  console.log(`     Constructor Args: disputeResolver=${disputeResolver}, receiptRegistry=${ethers.ZeroAddress}`);
  const EscrowFactory = new ethers.ContractFactory(
    escrowArtifact.abi.abi || escrowArtifact.abi,
    escrowArtifact.bytecode.object || escrowArtifact.bytecode,
    deployer
  );
  const escrow = await EscrowFactory.deploy(
    disputeResolver,
    ethers.ZeroAddress
  );
  const escrowDeployTx = escrow.deploymentTransaction();
  console.log(`     Broadcast Tx: ${escrowDeployTx?.hash}`);
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();
  const escrowReceipt = await escrowDeployTx.wait();
  console.log(`     ✓ Confirmed in Block: ${escrowReceipt.blockNumber}`);
  console.log(`     ✓ TrustMeshEscrow Address: ${escrowAddress}`);

  // Step B: Deploy TrustReceiptRegistry
  console.log('\n  -> Step 5.2: Deploying TrustReceiptRegistry...');
  console.log(`     Constructor Arg (escrowContract): ${escrowAddress}`);
  const RegistryFactory = new ethers.ContractFactory(
    registryArtifact.abi.abi || registryArtifact.abi,
    registryArtifact.bytecode.object || registryArtifact.bytecode,
    deployer
  );
  const registry = await RegistryFactory.deploy(escrowAddress);
  const registryDeployTx = registry.deploymentTransaction();
  console.log(`     Broadcast Tx: ${registryDeployTx?.hash}`);
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  const registryReceipt = await registryDeployTx.wait();
  console.log(`     ✓ Confirmed in Block: ${registryReceipt.blockNumber}`);
  console.log(`     ✓ TrustReceiptRegistry Address: ${registryAddress}`);

  // Step C: Wire Authorization on Escrow
  console.log('\n  -> Step 5.3: Wiring Authorization: escrow.setReceiptRegistry(registryAddress)...');
  const wireTx = await escrow.setReceiptRegistry(registryAddress);
  console.log(`     Broadcast Tx: ${wireTx.hash}`);
  const wireReceipt = await wireTx.wait();
  console.log(`     ✓ Confirmed in Block: ${wireReceipt.blockNumber}`);

  // 6. INDEPENDENT ONCHAIN READBACK VERIFICATION
  console.log('\n[6/6] INDEPENDENT ONCHAIN READBACK & INVARIANT VERIFICATION...');
  const escrowAbi = escrowArtifact.abi.abi || escrowArtifact.abi;
  const registryAbi = registryArtifact.abi.abi || registryArtifact.abi;

  const escrowRead = new ethers.Contract(escrowAddress, escrowAbi, provider);
  const registryRead = new ethers.Contract(registryAddress, registryAbi, provider);

  const readResolver = await escrowRead.disputeResolver();
  const readRegistryOnEscrow = await escrowRead.receiptRegistry();
  const readEscrowOnRegistry = await registryRead.escrowContract();
  const readChainId = (await provider.getNetwork()).chainId;

  console.log(`  Readback escrow.disputeResolver():  ${readResolver}`);
  console.log(`  Readback escrow.receiptRegistry():  ${readRegistryOnEscrow}`);
  console.log(`  Readback registry.escrowContract(): ${readEscrowOnRegistry}`);
  console.log(`  Readback Network Chain ID:          ${readChainId}`);

  // Invariant Assertions
  if (readResolver.toLowerCase() !== disputeResolver.toLowerCase()) {
    console.error('✗ FATAL INVARIANT VIOLATION: Dispute resolver onchain does not match configured address!');
    process.exit(1);
  }
  if (readRegistryOnEscrow.toLowerCase() !== registryAddress.toLowerCase()) {
    console.error('✗ FATAL INVARIANT VIOLATION: Escrow receiptRegistry does not match deployed registry address!');
    process.exit(1);
  }
  if (readEscrowOnRegistry.toLowerCase() !== escrowAddress.toLowerCase()) {
    console.error('✗ FATAL INVARIANT VIOLATION: Registry escrowContract does not match deployed escrow address!');
    process.exit(1);
  }
  if (readChainId !== configuredExpectedChainId) {
    console.error('✗ FATAL INVARIANT VIOLATION: Readback chain ID mismatch!');
    process.exit(1);
  }

  console.log('\n✓ ALL INVARIANTS INDEPENDENTLY CONFIRMED ON MONAD TESTNET!');

  // 7. Source Code Verification Step (Sourcify / Monad Explorer)
  console.log('\n[7/7] CONTRACT SOURCE CODE VERIFICATION...');
  let escrowVerified = false;
  let registryVerified = false;
  let escrowVerifyDetails = 'NOT_ATTEMPTED';
  let registryVerifyDetails = 'NOT_ATTEMPTED';
  const forgePath = path.join(process.env.USERPROFILE || process.env.HOME || '', '.foundry', 'bin', 'forge.exe');

  if (fs.existsSync(forgePath)) {
    try {
      console.log('  -> Attempting Sourcify verification for TrustMeshEscrow...');
      const escrowArgs = ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'address'],
        [disputeResolver, ethers.ZeroAddress]
      );
      const escrowVerifyCmd = `"${forgePath}" verify-contract ${escrowAddress} src/TrustMeshEscrow.sol:TrustMeshEscrow --root contracts --chain 10143 --verifier sourcify --verifier-url https://sourcify-api-monad.blockvision.org/ --constructor-args ${escrowArgs}`;
      const escrowOutput = execSync(escrowVerifyCmd, { encoding: 'utf8', stdio: 'pipe', timeout: 30000 });
      console.log('     ✓ TrustMeshEscrow verification output: ' + escrowOutput.trim());
      escrowVerified = escrowOutput.includes('OK') || escrowOutput.includes('Successfully') || escrowOutput.includes('verified');
      escrowVerifyDetails = escrowOutput.trim();
    } catch (err) {
      const errMsg = (err.stdout || err.stderr || err.message || '').toString().trim();
      console.warn('     [!] TrustMeshEscrow verification status: UNVERIFIED (' + errMsg.slice(0, 120) + '...)');
      escrowVerifyDetails = errMsg;
    }

    try {
      console.log('  -> Attempting Sourcify verification for TrustReceiptRegistry...');
      const registryArgs = ethers.AbiCoder.defaultAbiCoder().encode(['address'], [escrowAddress]);
      const registryVerifyCmd = `"${forgePath}" verify-contract ${registryAddress} src/TrustReceiptRegistry.sol:TrustReceiptRegistry --root contracts --chain 10143 --verifier sourcify --verifier-url https://sourcify-api-monad.blockvision.org/ --constructor-args ${registryArgs}`;
      const registryOutput = execSync(registryVerifyCmd, { encoding: 'utf8', stdio: 'pipe', timeout: 30000 });
      console.log('     ✓ TrustReceiptRegistry verification output: ' + registryOutput.trim());
      registryVerified = registryOutput.includes('OK') || registryOutput.includes('Successfully') || registryOutput.includes('verified');
      registryVerifyDetails = registryOutput.trim();
    } catch (err) {
      const errMsg = (err.stdout || err.stderr || err.message || '').toString().trim();
      console.warn('     [!] TrustReceiptRegistry verification status: UNVERIFIED (' + errMsg.slice(0, 120) + '...)');
      registryVerifyDetails = errMsg;
    }
  }

  // Save Deployment Record
  const deploymentRecord = {
    network: 'Monad Metropolis Testnet',
    chainId: Number(readChainId),
    status: 'DEPLOYED',
    contracts: {
      TrustMeshEscrow: {
        address: escrowAddress,
        deployedBlock: escrowReceipt.blockNumber,
        transactionHash: escrowDeployTx.hash,
      },
      TrustReceiptRegistry: {
        address: registryAddress,
        deployedBlock: registryReceipt.blockNumber,
        transactionHash: registryDeployTx.hash,
      },
      authorizationWiring: {
        wired: true,
        transactionHash: wireTx.hash,
        blockNumber: wireReceipt.blockNumber,
      },
    },
    verification: {
      TrustMeshEscrow: {
        status: escrowVerified ? 'VERIFIED' : 'UNVERIFIED',
        details: escrowVerifyDetails,
      },
      TrustReceiptRegistry: {
        status: registryVerified ? 'VERIFIED' : 'UNVERIFIED',
        details: registryVerifyDetails,
      },
    },
    deployerAddress: deployerAddress,
    disputeResolverAddress: disputeResolver,
    disputeResolverClassification: 'Temporary designated testnet dispute resolver',
    rpcUrl: rpcUrl,
    explorerUrl: 'https://testnet.monadvision.com',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(DEPLOYMENTS_FILE, JSON.stringify(deploymentRecord, null, 2), 'utf8');
  console.log(`✓ Deployment record saved to: ${DEPLOYMENTS_FILE}\n`);

  console.log('================================================================');
  console.log('STAGE 3.6 — TESTNET DEPLOYED');
  console.log(`Escrow Address:   ${escrowAddress}`);
  console.log(`Registry Address: ${registryAddress}`);
  console.log(`Explorer Link:    https://testnet.monadvision.com/address/${escrowAddress}`);
  console.log('================================================================\n');
}

main().catch((err) => {
  console.error('\nFatal deployment error:', err);
  process.exit(1);
});
