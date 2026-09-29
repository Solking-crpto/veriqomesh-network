import { ethers } from 'ethers';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

/**
 * VeriqoMesh Network Monad Metropolis Testnet Smoke Test Script
 *
 * Exercises minimal live smoke test:
 * 1. Checks deployed contract addresses from deployments/monad-testnet.json
 * 2. Preflight chain ID assertion
 * 3. Minimal Flow:
 *    create -> agree -> fund -> startWork -> anchorEvidence -> requestVerification
 *    -> submitVerification(PASS) -> releaseEscrow -> Trust Receipt verification
 *
 * Usage:
 *   node scripts/testnet-smoke.js --preflight               # Checks deployed contracts onchain
 *   node scripts/testnet-smoke.js --ephemeral --preflight   # Preflight checks including deployer balance & gas sufficiency
 *   node scripts/testnet-smoke.js --ephemeral               # Runs live smoke test with deployer-funded ephemeral wallets
 *   node scripts/testnet-smoke.js                           # Runs live smoke test with configured participant env keys
 */

const EXPECTED_CHAIN_ID = 10143n;
const DEPLOYMENTS_FILE = path.resolve('deployments/monad-testnet.json');

// Planned participant funding amounts for ephemeral runs
const PLANNED_FUNDING = {
  buyer: ethers.parseEther('0.10'),
  seller: ethers.parseEther('0.10'),
  verifier: ethers.parseEther('0.04'),
};
const TOTAL_REQUIRED_FUNDING =
  PLANNED_FUNDING.buyer + PLANNED_FUNDING.seller + PLANNED_FUNDING.verifier; // 0.24 MON
const DEPLOYER_GAS_RESERVE = ethers.parseEther('0.05'); // 0.05 MON safety reserve for deployer transactions

// Simple local .env parser if present
if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) {
        process.env[key] = val;
      }
    }
  }
}

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

/**
 * Validates that planned participant funding meets or exceeds upfront EIP-1559 gas reservations.
 *
 * Uses live estimation for createTransactionWithVerifier and forensic observed baselines
 * (with +20% safety margin) for state-dependent transactions.
 */
async function validateGasSufficiency(provider, escrow, plannedFunding, sampleAddrs) {
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || 102000000000n;
  const maxFeePerGas = feeData.maxFeePerGas || gasPrice * 2n;
  const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || 2000000000n;

  console.log('--- Gas Sufficiency & Fee Data Validation ---');
  console.log(`Current Base/Gas Price:  ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);
  console.log(`EIP-1559 Max Fee:        ${ethers.formatUnits(maxFeePerGas, 'gwei')} gwei`);
  console.log(`Max Priority Fee:        ${ethers.formatUnits(maxPriorityFeePerGas, 'gwei')} gwei`);

  // 1. Live estimation for createTransactionWithVerifier
  let estCreateGas = 205000n;
  try {
    const dummyBuyer = sampleAddrs?.buyer || ethers.Wallet.createRandom().address;
    const dummySeller = sampleAddrs?.seller || ethers.Wallet.createRandom().address;
    const dummyVerifier = sampleAddrs?.verifier || ethers.Wallet.createRandom().address;
    const tempTxId = ethers.id('PREFLIGHT_GAS_EST_' + Date.now());
    const est = await escrow
      .connect(new ethers.VoidSigner(dummyBuyer, provider))
      .createTransactionWithVerifier.estimateGas(
        tempTxId,
        dummySeller,
        dummyVerifier,
        ethers.ZeroAddress,
        ethers.parseEther('0.001'),
        Math.floor(Date.now() / 1000) + 86400,
        ethers.id('PREFLIGHT_TERMS'),
      );
    estCreateGas = (est * 110n) / 100n; // 10% buffer above live estimate
    console.log(
      `Live Gas Estimate (createTransactionWithVerifier): ${est.toString()} gas (with +10% buffer: ${estCreateGas.toString()})`,
    );
  } catch (err) {
    console.warn(
      `[!] Live gas estimate fell back to conservative baseline (${estCreateGas.toString()} gas): ${err.message}`,
    );
  }

  // Forensic baselines observed on Monad Metropolis Testnet with 20% safety margin:
  // agreeTransaction: 43,439 observed -> 52,000 baseline
  // fundEscrow: 74,749 observed -> 90,000 baseline
  // startWork: 43,325 observed -> 52,000 baseline
  // anchorEvidence: 173,443 observed -> 210,000 baseline
  // requestVerification: ~50,000 observed -> 60,000 baseline
  // submitVerification: ~65,000 observed -> 80,000 baseline
  // releaseEscrow: ~135,000 observed -> 165,000 baseline
  const gasBaselines = {
    agree: 52000n,
    fund: 90000n,
    start: 52000n,
    anchor: 210000n,
    reqVer: 60000n,
    subVer: 80000n,
    release: 165000n,
  };

  const escrowDeposit = ethers.parseEther('0.001');

  // Buyer: createTransactionWithVerifier + fundEscrow + releaseEscrow + 0.001 MON deposit
  const buyerGasNeeded = estCreateGas + gasBaselines.fund + gasBaselines.release;
  const buyerMinRequired = buyerGasNeeded * maxFeePerGas + escrowDeposit;

  // Seller: agreeTransaction + startWork + anchorEvidence + requestVerification
  const sellerGasNeeded =
    gasBaselines.agree + gasBaselines.start + gasBaselines.anchor + gasBaselines.reqVer;
  const sellerMinRequired = sellerGasNeeded * maxFeePerGas;

  // Verifier: submitVerification
  const verifierGasNeeded = gasBaselines.subVer;
  const verifierMinRequired = verifierGasNeeded * maxFeePerGas;

  console.log(
    `\nParticipant Gas Sufficiency Gate (Max Upfront Reservation @ ${ethers.formatUnits(maxFeePerGas, 'gwei')} gwei):`,
  );
  console.log(
    `  Buyer:    Planned ${ethers.formatEther(plannedFunding.buyer)} MON | Required Upfront: ~${ethers.formatEther(buyerMinRequired)} MON (${buyerGasNeeded.toString()} gas + 0.001 MON deposit)`,
  );
  console.log(
    `  Seller:   Planned ${ethers.formatEther(plannedFunding.seller)} MON | Required Upfront: ~${ethers.formatEther(sellerMinRequired)} MON (${sellerGasNeeded.toString()} gas)`,
  );
  console.log(
    `  Verifier: Planned ${ethers.formatEther(plannedFunding.verifier)} MON | Required Upfront: ~${ethers.formatEther(verifierMinRequired)} MON (${verifierGasNeeded.toString()} gas)`,
  );

  let ok = true;
  if (plannedFunding.buyer < buyerMinRequired) {
    console.error(
      `✗ Buyer planned funding (${ethers.formatEther(plannedFunding.buyer)} MON) is less than required (${ethers.formatEther(buyerMinRequired)} MON).`,
    );
    ok = false;
  }
  if (plannedFunding.seller < sellerMinRequired) {
    console.error(
      `✗ Seller planned funding (${ethers.formatEther(plannedFunding.seller)} MON) is less than required (${ethers.formatEther(sellerMinRequired)} MON).`,
    );
    ok = false;
  }
  if (plannedFunding.verifier < verifierMinRequired) {
    console.error(
      `✗ Verifier planned funding (${ethers.formatEther(plannedFunding.verifier)} MON) is less than required (${ethers.formatEther(verifierMinRequired)} MON).`,
    );
    ok = false;
  }

  if (!ok) {
    throw new Error('Gas sufficiency validation failed for one or more participants.');
  }

  console.log(
    '✓ All participant budgets have substantial headroom above EIP-1559 peak requirements.\n',
  );
}

async function main() {
  const isPreflightOnly = process.argv.includes('--preflight');
  const allowLocal = process.argv.includes('--local');
  const isEphemeral = process.argv.includes('--ephemeral');

  console.log('================================================================');
  console.log('VERIQOMESH NETWORK — MONAD METROPOLIS TESTNET SMOKE TEST');
  console.log(
    `Execution Mode:   ${isPreflightOnly ? 'PREFLIGHT VERIFICATION ONLY' : 'FULL SMOKE TEST EXECUTION'}`,
  );
  console.log(
    `Participant Mode: ${isEphemeral ? 'EPHEMERAL IN-MEMORY WALLETS (Deployer-funded)' : 'CONFIGURED KEYS'}`,
  );
  console.log('================================================================\n');

  // Load deployment record
  if (!fs.existsSync(DEPLOYMENTS_FILE)) {
    console.error(`✗ Missing deployment record at: ${DEPLOYMENTS_FILE}`);
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(DEPLOYMENTS_FILE, 'utf8'));
  const escrowAddress = deployment.contracts?.TrustMeshEscrow?.address;
  const registryAddress = deployment.contracts?.TrustReceiptRegistry?.address;

  console.log(`Deployment Target: ${deployment.network}`);
  console.log(`Escrow Address:    ${escrowAddress || 'NOT DEPLOYED'}`);
  console.log(`Registry Address:  ${registryAddress || 'NOT DEPLOYED'}\n`);

  if (!escrowAddress || !registryAddress) {
    if (isPreflightOnly) {
      console.log('[!] Contracts are not yet deployed to Monad Testnet.');
      console.log('    Run `node scripts/deploy-testnet.js` after funding deployer wallet.');
      console.log('    Preflight checks completed (Deployment pending).\n');
      return;
    } else {
      console.error('✗ Cannot run smoke test: Contracts not yet deployed.');
      process.exit(1);
    }
  }

  const rpcUrl =
    process.env.MONAD_TESTNET_RPC_URL || deployment.rpcUrl || 'https://testnet-rpc.monad.xyz';
  console.log(`Connecting to RPC: ${rpcUrl}...`);
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const network = await provider.getNetwork();
  console.log(`Connected to Chain ID: ${network.chainId}`);

  const targetChainId = allowLocal ? network.chainId : EXPECTED_CHAIN_ID;
  if (network.chainId !== targetChainId) {
    console.error(
      `\n✗ FATAL: Chain ID Mismatch! Detected ${network.chainId}, expected ${targetChainId}`,
    );
    process.exit(1);
  }

  // Verify Bytecode Exists
  const escrowCode = await provider.getCode(escrowAddress);
  const registryCode = await provider.getCode(registryAddress);

  if (escrowCode === '0x' || registryCode === '0x') {
    console.error('✗ Contracts not found at specified addresses onchain.');
    process.exit(1);
  }
  console.log('✓ Bytecode verified onchain for both Escrow and Registry.\n');

  // Load compiled artifacts
  const outDir = path.resolve('contracts/out');
  const escrowArtifact = JSON.parse(
    fs.readFileSync(path.join(outDir, 'TrustMeshEscrow.sol', 'TrustMeshEscrow.json'), 'utf8'),
  );
  const registryArtifact = JSON.parse(
    fs.readFileSync(
      path.join(outDir, 'TrustReceiptRegistry.sol', 'TrustReceiptRegistry.json'),
      'utf8',
    ),
  );

  const escrowAbi = escrowArtifact.abi.abi || escrowArtifact.abi;
  const registryAbi = registryArtifact.abi.abi || registryArtifact.abi;

  const escrowContract = new ethers.Contract(escrowAddress, escrowAbi, provider);
  const registryContract = new ethers.Contract(registryAddress, registryAbi, provider);

  if (isPreflightOnly) {
    if (isEphemeral) {
      const defaultKeystoreDir = path.join(
        process.env.USERPROFILE || process.env.HOME || '',
        '.foundry',
        'keystores',
      );
      const deployerAccountName = process.env.DEPLOYER_ACCOUNT || 'monad-deployer';
      const selectedKeystorePath = path.join(defaultKeystoreDir, deployerAccountName);
      let deployerAddress = deployment.deployerAddress;
      if (fs.existsSync(selectedKeystorePath)) {
        try {
          const k = JSON.parse(fs.readFileSync(selectedKeystorePath, 'utf8'));
          if (k.address) deployerAddress = ethers.getAddress('0x' + k.address.replace(/^0x/, ''));
        } catch {}
      }
      if (deployerAddress) {
        const depBal = await provider.getBalance(deployerAddress);
        console.log(`Deployer Keystore: Found (${deployerAccountName})`);
        console.log(`Deployer Address:  ${deployerAddress}`);
        console.log(`Deployer Balance:  ${ethers.formatEther(depBal)} MON`);
        const totalNeededWithReserve = TOTAL_REQUIRED_FUNDING + DEPLOYER_GAS_RESERVE;
        if (depBal >= totalNeededWithReserve) {
          console.log(
            `✓ Deployer has sufficient funds for participant funding (${ethers.formatEther(TOTAL_REQUIRED_FUNDING)} MON) + gas reserve (${ethers.formatEther(DEPLOYER_GAS_RESERVE)} MON).\n`,
          );
        } else {
          console.warn(
            `[!] Deployer balance (${ethers.formatEther(depBal)} MON) is less than planned (${ethers.formatEther(totalNeededWithReserve)} MON).\n`,
          );
        }
      }

      // Run gas sufficiency validation in preflight
      await validateGasSufficiency(provider, escrowContract, PLANNED_FUNDING);
    }
    console.log('================================================================');
    console.log('PREFLIGHT VERIFICATION SUCCESSFUL: Contracts, RPC, and gas budgets verified.');
    console.log('================================================================\n');
    return;
  }

  let buyer;
  let seller;
  let verifier;
  let deployer = null;

  if (isEphemeral) {
    console.log('--- Setting Up Ephemeral Testnet Participants ---');
    // Locate deployer keystore
    const defaultKeystoreDir = path.join(
      process.env.USERPROFILE || process.env.HOME || '',
      '.foundry',
      'keystores',
    );
    const deployerAccountName = process.env.DEPLOYER_ACCOUNT || 'monad-deployer';
    const selectedKeystorePath = path.join(defaultKeystoreDir, deployerAccountName);

    if (!fs.existsSync(selectedKeystorePath)) {
      console.error(`✗ Deployer keystore not found at: ${selectedKeystorePath}`);
      process.exit(1);
    }

    const keystoreJson = JSON.parse(fs.readFileSync(selectedKeystorePath, 'utf8'));
    let deployerPassword = process.env.DEPLOYER_PASSWORD || process.env.ETH_PASSWORD;

    if (!deployerPassword) {
      console.log('      [?] Enter password to unlock deployer wallet for participant funding:');
      deployerPassword = await promptPasswordInteractive('      Enter Keystore Password: ');
    }

    try {
      deployer = ethers.Wallet.fromEncryptedJsonSync(
        JSON.stringify(keystoreJson),
        deployerPassword,
      ).connect(provider);
    } catch (err) {
      console.error(`✗ FATAL: Failed to decrypt deployer keystore: ${err.message}`);
      process.exit(1);
    }

    const deployerBalance = await provider.getBalance(deployer.address);
    console.log(`✓ Deployer Unlocked:     ${deployer.address}`);
    console.log(`✓ Deployer Balance:      ${ethers.formatEther(deployerBalance)} MON\n`);

    const totalNeededWithReserve = TOTAL_REQUIRED_FUNDING + DEPLOYER_GAS_RESERVE;
    if (deployerBalance < totalNeededWithReserve) {
      console.error(
        `✗ Insufficient deployer balance. Required: ${ethers.formatEther(totalNeededWithReserve)} MON (${ethers.formatEther(TOTAL_REQUIRED_FUNDING)} MON funding + ${ethers.formatEther(DEPLOYER_GAS_RESERVE)} MON gas reserve), Available: ${ethers.formatEther(deployerBalance)} MON`,
      );
      process.exit(1);
    }

    // Generate distinct ephemeral in-memory wallets
    buyer = ethers.Wallet.createRandom().connect(provider);
    seller = ethers.Wallet.createRandom().connect(provider);
    verifier = ethers.Wallet.createRandom().connect(provider);

    // Collision check
    const participantAddrs = [buyer.address, seller.address, verifier.address];
    const uniqueAddrs = new Set(participantAddrs);
    if (uniqueAddrs.size !== 3 || participantAddrs.includes(deployer.address)) {
      console.error('✗ Collision in generated participant addresses');
      process.exit(1);
    }

    console.log(`Participant Wallets Generated (Private keys strictly in-memory):`);
    console.log(`  Buyer:    ${buyer.address}`);
    console.log(`  Seller:   ${seller.address}`);
    console.log(`  Verifier: ${verifier.address}\n`);

    // Preflight gas sufficiency check before any funding transaction
    await validateGasSufficiency(provider, escrowContract, PLANNED_FUNDING, {
      buyer: buyer.address,
      seller: seller.address,
      verifier: verifier.address,
    });

    // Fund participants sequentially from deployer
    console.log('Funding Ephemeral Participants from Deployer...');
    let deployerNonce = await provider.getTransactionCount(deployer.address, 'latest');

    const txFundBuyer = await deployer.sendTransaction({
      to: buyer.address,
      value: PLANNED_FUNDING.buyer,
      nonce: deployerNonce++,
    });
    const rcFundBuyer = await txFundBuyer.wait();
    console.log(
      `  -> Funded Buyer (${ethers.formatEther(PLANNED_FUNDING.buyer)} MON)    Tx: ${txFundBuyer.hash} (Gas: ${rcFundBuyer.gasUsed}, Fee: ${ethers.formatEther(rcFundBuyer.gasUsed * (rcFundBuyer.gasPrice || rcFundBuyer.effectiveGasPrice))} MON)`,
    );

    const txFundSeller = await deployer.sendTransaction({
      to: seller.address,
      value: PLANNED_FUNDING.seller,
      nonce: deployerNonce++,
    });
    const rcFundSeller = await txFundSeller.wait();
    console.log(
      `  -> Funded Seller (${ethers.formatEther(PLANNED_FUNDING.seller)} MON)   Tx: ${txFundSeller.hash} (Gas: ${rcFundSeller.gasUsed}, Fee: ${ethers.formatEther(rcFundSeller.gasUsed * (rcFundSeller.gasPrice || rcFundSeller.effectiveGasPrice))} MON)`,
    );

    const txFundVerifier = await deployer.sendTransaction({
      to: verifier.address,
      value: PLANNED_FUNDING.verifier,
      nonce: deployerNonce++,
    });
    const rcFundVerifier = await txFundVerifier.wait();
    console.log(
      `  -> Funded Verifier (${ethers.formatEther(PLANNED_FUNDING.verifier)} MON) Tx: ${txFundVerifier.hash} (Gas: ${rcFundVerifier.gasUsed}, Fee: ${ethers.formatEther(rcFundVerifier.gasUsed * (rcFundVerifier.gasPrice || rcFundVerifier.effectiveGasPrice))} MON)`,
    );

    console.log('✓ All participants funded and confirmed onchain.\n');
  } else {
    // For live smoke testing with pre-configured keys
    const buyerKey = process.env.BUYER_PRIVATE_KEY;
    const sellerKey = process.env.SELLER_PRIVATE_KEY;
    const verifierKey = process.env.VERIFIER_PRIVATE_KEY;

    if (!buyerKey || !sellerKey || !verifierKey) {
      console.error('✗ Missing participant keys for smoke test.');
      console.error('Either run with --ephemeral mode (node scripts/testnet-smoke.js --ephemeral)');
      console.error(
        'Or configure BUYER_PRIVATE_KEY, SELLER_PRIVATE_KEY, and VERIFIER_PRIVATE_KEY in your local environment.',
      );
      process.exit(1);
    }

    buyer = new ethers.Wallet(buyerKey, provider);
    seller = new ethers.Wallet(sellerKey, provider);
    verifier = new ethers.Wallet(verifierKey, provider);
  }

  const escrowAsBuyer = escrowContract.connect(buyer);
  const escrowAsSeller = escrowContract.connect(seller);
  const escrowAsVerifier = escrowContract.connect(verifier);
  const registry = registryContract;

  const smokeAmount = ethers.parseEther('0.001'); // 0.001 MON micro-test
  const txId = ethers.id('TESTNET_SMOKE_' + Date.now());
  const termsHash = ethers.id('SMOKE_TEST_TERMS');
  const deadline = Math.floor(Date.now() / 1000) + 86400; // 1 day

  // Record baseline liabilities before lifecycle begins
  const baselineLiabilities = await escrowContract.totalEscrowLiabilities();

  console.log('Executing Testnet Smoke Lifecycle...');
  console.log(`Transaction ID:        ${txId}`);
  console.log(`Test Amount:           0.001 MON`);
  console.log(`Baseline Liabilities:  ${ethers.formatEther(baselineLiabilities)} MON\n`);

  // 1. Create with Verifier
  const txCreate = await escrowAsBuyer.createTransactionWithVerifier(
    txId,
    seller.address,
    verifier.address,
    ethers.ZeroAddress,
    smokeAmount,
    deadline,
    termsHash,
  );
  const rcCreate = await txCreate.wait();
  console.log(
    `[1/8] createTransactionWithVerifier -> Tx: ${txCreate.hash} (Gas: ${rcCreate.gasUsed}, Fee: ${ethers.formatEther(rcCreate.gasUsed * (rcCreate.gasPrice || rcCreate.effectiveGasPrice))} MON)`,
  );

  // 2. Agree
  const txAgree = await escrowAsSeller.agreeTransaction(txId);
  const rcAgree = await txAgree.wait();
  console.log(
    `[2/8] agreeTransaction              -> Tx: ${txAgree.hash} (Gas: ${rcAgree.gasUsed}, Fee: ${ethers.formatEther(rcAgree.gasUsed * (rcAgree.gasPrice || rcAgree.effectiveGasPrice))} MON)`,
  );

  // 3. Fund
  const txFund = await escrowAsBuyer.fundEscrow(txId, { value: smokeAmount });
  const rcFund = await txFund.wait();
  console.log(
    `[3/8] fundEscrow(0.001 MON)         -> Tx: ${txFund.hash} (Gas: ${rcFund.gasUsed}, Fee: ${ethers.formatEther(rcFund.gasUsed * (rcFund.gasPrice || rcFund.effectiveGasPrice))} MON)`,
  );

  // 4. Start Work
  const txStart = await escrowAsSeller.startWork(txId);
  const rcStart = await txStart.wait();
  console.log(
    `[4/8] startWork                     -> Tx: ${txStart.hash} (Gas: ${rcStart.gasUsed}, Fee: ${ethers.formatEther(rcStart.gasUsed * (rcStart.gasPrice || rcStart.effectiveGasPrice))} MON)`,
  );

  // 5. Anchor Evidence
  const txEv = await escrowAsSeller['anchorEvidence(bytes32,bytes32,bytes32,bytes32,bool)'](
    txId,
    ethers.id('SMOKE_EVIDENCE_CONTENT'),
    ethers.id('SMOKE_EVIDENCE_META'),
    ethers.id('ipfs://bafy-smoke-test-evidence'),
    false,
  );
  const rcEv = await txEv.wait();
  console.log(
    `[5/8] anchorEvidence                -> Tx: ${txEv.hash} (Gas: ${rcEv.gasUsed}, Fee: ${ethers.formatEther(rcEv.gasUsed * (rcEv.gasPrice || rcEv.effectiveGasPrice))} MON)`,
  );

  // 6. Request Verification
  const txReq = await escrowAsSeller.requestVerification(txId);
  const rcReq = await txReq.wait();
  console.log(
    `[6/8] requestVerification           -> Tx: ${txReq.hash} (Gas: ${rcReq.gasUsed}, Fee: ${ethers.formatEther(rcReq.gasUsed * (rcReq.gasPrice || rcReq.effectiveGasPrice))} MON)`,
  );

  // 7. Submit Verification PASS
  const txVer = await escrowAsVerifier.submitVerification(
    txId,
    1 /* PASS */,
    ethers.id('SMOKE_REPORT'),
  );
  const rcVer = await txVer.wait();
  console.log(
    `[7/8] submitVerification(PASS)      -> Tx: ${txVer.hash} (Gas: ${rcVer.gasUsed}, Fee: ${ethers.formatEther(rcVer.gasUsed * (rcVer.gasPrice || rcVer.effectiveGasPrice))} MON)`,
  );

  // Record seller balance pre-release
  const sellerBalPre = await provider.getBalance(seller.address);

  // 8. Release Escrow
  const txRelease = await escrowAsBuyer.releaseEscrow(txId);
  const rcRelease = await txRelease.wait();
  console.log(
    `[8/8] releaseEscrow                 -> Tx: ${txRelease.hash} (Gas: ${rcRelease.gasUsed}, Fee: ${ethers.formatEther(rcRelease.gasUsed * (rcRelease.gasPrice || rcRelease.effectiveGasPrice))} MON)`,
  );

  // Verify Terminal State & Invariants
  const state = await escrowAsBuyer.getTransactionState(txId);
  const finalLiabilities = await escrowContract.totalEscrowLiabilities();
  const liabilityDelta = finalLiabilities - baselineLiabilities;
  const txRec = await escrowAsBuyer.getTransaction(txId);
  const receiptExists = await registry.receiptExists(txId);
  const receipt = await registry.getReceiptByTransaction(txId);
  const totalReceipts = await registry.totalReceipts();
  const registryBalance = await provider.getBalance(registryAddress);
  const sellerBalPost = await provider.getBalance(seller.address);
  const buyerBalPost = await provider.getBalance(buyer.address);
  const verifierBalPost = await provider.getBalance(verifier.address);

  console.log('\n================================================================');
  console.log('SMOKE TEST VERIFICATION RESULTS:');
  console.log(`Terminal State:             ${state} (Expected 11: SETTLED)`);
  console.log(`Verification Outcome:       ${txRec.verificationOutcome} (Expected 1: PASS)`);
  console.log(`Baseline Liabilities:       ${ethers.formatEther(baselineLiabilities)} MON`);
  console.log(`Final Liabilities:          ${ethers.formatEther(finalLiabilities)} MON`);
  console.log(
    `Liability Delta:            ${ethers.formatEther(liabilityDelta)} MON (Expected 0.0)`,
  );
  console.log(
    `Seller Payout Delta:        +${ethers.formatEther(sellerBalPost - sellerBalPre)} MON`,
  );
  console.log(
    `Receipt Registry Balance:   ${ethers.formatEther(registryBalance)} MON (Expected 0.0 - Financially Isolated)`,
  );
  console.log(
    `VeriqoMesh Trust Receipt:   ${receiptExists} (Total Receipts: #${totalReceipts.toString()})`,
  );
  console.log(`Receipt Linked Tx:          ${receipt.transactionId}`);
  console.log(`Receipt Settled Val:        ${ethers.formatEther(receipt.settledAmount)} MON`);
  console.log(`Explorer Link:              https://testnet.monadvision.com/tx/${txRelease.hash}`);
  console.log('----------------------------------------------------------------');
  console.log(`Final Buyer Balance:        ${ethers.formatEther(buyerBalPost)} MON`);
  console.log(`Final Seller Balance:       ${ethers.formatEther(sellerBalPost)} MON`);
  console.log(`Final Verifier Balance:     ${ethers.formatEther(verifierBalPost)} MON`);
  if (deployer) {
    const deployerBalPost = await provider.getBalance(deployer.address);
    console.log(`Final Deployer Balance:     ${ethers.formatEther(deployerBalPost)} MON`);
  }
  console.log('================================================================\n');

  if (
    state === 11n &&
    finalLiabilities === baselineLiabilities &&
    finalLiabilities - baselineLiabilities === 0n &&
    txRec.verificationOutcome === 1 &&
    receiptExists &&
    receipt.transactionId === txId &&
    registryBalance === 0n
  ) {
    console.log(
      '✓ TESTNET SMOKE GATE PASSED: VeriqoMesh contract execution verified on live network!',
    );
  } else {
    console.error('✗ Invariant check failed post-release.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('\nFatal smoke test error:', err);
  process.exit(1);
});
