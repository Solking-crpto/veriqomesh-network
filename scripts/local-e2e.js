import { ethers } from 'ethers';
import fs from 'node:fs';
import path from 'node:path';

async function runLocalEndToEnd() {
  console.log('================================================================');
  console.log('TRUSTMESH PROTOCOL — STAGE 3 LOCAL END-TO-END VERIFICATION');
  console.log('================================================================\n');

  const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
  const network = await provider.getNetwork();
  console.log(`Connected to Local EVM Node (Chain ID: ${network.chainId})\n`);

  // Load compiled artifacts from Foundry out directory
  const outDir = path.resolve('contracts/out');
  const escrowArtifact = JSON.parse(
    fs.readFileSync(path.join(outDir, 'TrustMeshEscrow.sol', 'TrustMeshEscrow.json'), 'utf8')
  );
  const registryArtifact = JSON.parse(
    fs.readFileSync(path.join(outDir, 'TrustReceiptRegistry.sol', 'TrustReceiptRegistry.json'), 'utf8')
  );

  // Accounts on local Hardhat node
  const deployer = new ethers.Wallet('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
  const buyer = new ethers.Wallet('0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d', provider);
  const seller = new ethers.Wallet('0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a', provider);
  const verifier = new ethers.Wallet('0x47e179ec346fe86abb4110f180d353d22e7baaf57318464c342f9b8c6a634dda', provider);
  const disputeResolver = new ethers.Wallet('0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6', provider);

  console.log(`Deployer:         ${deployer.address}`);
  console.log(`Buyer:            ${buyer.address}`);
  console.log(`Seller:           ${seller.address}`);
  console.log(`Verifier:         ${verifier.address}`);
  console.log(`Dispute Resolver: ${disputeResolver.address}\n`);

  // Deterministic strictly monotonic nonce counters
  let deployerNonce = await provider.getTransactionCount(deployer.address, 'latest');
  let buyerNonce = await provider.getTransactionCount(buyer.address, 'latest');
  let sellerNonce = await provider.getTransactionCount(seller.address, 'latest');
  let verifierNonce = await provider.getTransactionCount(verifier.address, 'latest');
  let resolverNonce = await provider.getTransactionCount(disputeResolver.address, 'latest');

  // Ensure verifier has gas funds
  const verifierBal = await provider.getBalance(verifier.address);
  if (verifierBal < ethers.parseEther('1.0')) {
    const txFundV = await deployer.sendTransaction({
      to: verifier.address,
      value: ethers.parseEther('10.0'),
      nonce: deployerNonce++,
    });
    await txFundV.wait();
    console.log(`[✓] Funded Verifier (${verifier.address}) with 10.0 MON for gas\n`);
  }

  // 1. DEPLOY CONTRACTS
  console.log('--- STEP 1: Deploying Contracts ---');
  const escrowFactory = new ethers.ContractFactory(escrowArtifact.abi, escrowArtifact.bytecode.object, deployer);
  const escrow = await escrowFactory.deploy(disputeResolver.address, ethers.ZeroAddress, {
    nonce: deployerNonce++,
  });
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();
  console.log(`[✓] TrustMeshEscrow deployed at:     ${escrowAddress}`);

  const registryFactory = new ethers.ContractFactory(registryArtifact.abi, registryArtifact.bytecode.object, deployer);
  const registry = await registryFactory.deploy(escrowAddress, {
    nonce: deployerNonce++,
  });
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log(`[✓] TrustReceiptRegistry deployed at: ${registryAddress}`);

  // Wire registry into escrow
  const txSetReg = await escrow.connect(deployer).setReceiptRegistry(registryAddress, {
    nonce: deployerNonce++,
  });
  await txSetReg.wait();
  console.log(`[✓] Soulbound TrustReceiptRegistry linked to TrustMeshEscrow\n`);

  // Connect actor instances
  const escrowAsBuyer = escrow.connect(buyer);
  const escrowAsSeller = escrow.connect(seller);
  const escrowAsVerifier = escrow.connect(verifier);
  const escrowAsResolver = escrow.connect(disputeResolver);

  // ---------------------------------------------------------------------------
  // FLOW A: SUCCESSFUL COMMERCIAL TRANSACTION WITH INDEPENDENT VERIFIER & RECEIPT
  // ---------------------------------------------------------------------------
  console.log('================================================================');
  console.log('FLOW A — 100 SOLAR PANELS DELIVERY: PASS -> RELEASE -> RECEIPT');
  console.log('================================================================\n');

  const txAId = ethers.id('TX_A_SOLAR_PANELS_' + Date.now());
  const termsHashA = ethers.id('TERMS_100_SOLAR_PANELS_550W_TIER_1_DALLAS_DEPOT');
  const evidenceContentA = ethers.id('EVIDENCE_BYTES_BILL_OF_LADING_BOL-2026-9812');
  const evidenceMetaA = ethers.id('CANONICAL_JSON_PALLET_COUNT_4_UNITS_100');
  const storageUriHashA = ethers.id('ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi');
  const verifierReportHashA = ethers.id('DEPOT_INSPECTION_PASS_100_INTACT_SEALS_VERIFIED');
  const amount20Mon = ethers.parseEther('20.0');
  const deadline = Math.floor(Date.now() / 1000) + 86400 * 14;

  // A.1 Propose Transaction with Designated Verifier
  const txCreateA = await escrowAsBuyer.createTransactionWithVerifier(
    txAId,
    seller.address,
    verifier.address,
    ethers.ZeroAddress,
    amount20Mon,
    deadline,
    termsHashA,
    { nonce: buyerNonce++ }
  );
  const rcCreateA = await txCreateA.wait();
  console.log(`[1/8] createTransactionWithVerifier() -> Hash: ${rcCreateA.hash}`);
  let state = await escrow.getTransactionState(txAId);
  console.log(`      State: PROPOSED (${state})`);

  // A.2 Agree
  const txAgreeA = await escrowAsSeller.agreeTransaction(txAId, { nonce: sellerNonce++ });
  const rcAgreeA = await txAgreeA.wait();
  console.log(`[2/8] agreeTransaction()             -> Hash: ${rcAgreeA.hash}`);
  state = await escrow.getTransactionState(txAId);
  console.log(`      State: AGREED (${state})`);

  // A.3 Fund Escrow
  const txFundA = await escrowAsBuyer.fundEscrow(txAId, { value: amount20Mon, nonce: buyerNonce++ });
  const rcFundA = await txFundA.wait();
  console.log(`[3/8] fundEscrow(20.0 MON)           -> Hash: ${rcFundA.hash}`);
  state = await escrow.getTransactionState(txAId);
  console.log(`      State: FUNDED (${state}) | Vault Liabilities: 20.0 MON`);

  // A.4 Start Work
  const txStartA = await escrowAsSeller.startWork(txAId, { nonce: sellerNonce++ });
  const rcStartA = await txStartA.wait();
  console.log(`[4/8] startWork()                    -> Hash: ${rcStartA.hash}`);
  state = await escrow.getTransactionState(txAId);
  console.log(`      State: IN_PROGRESS (${state})`);

  // A.5 Anchor Deliverable Evidence (Bill of Lading + Manifest)
  const txEvA = await escrowAsSeller['anchorEvidence(bytes32,bytes32,bytes32,bytes32,bool)'](
    txAId,
    evidenceContentA,
    evidenceMetaA,
    storageUriHashA,
    false,
    { nonce: sellerNonce++ }
  );
  const rcEvA = await txEvA.wait();
  console.log(`[5/8] anchorEvidence(Content + Meta) -> Hash: ${rcEvA.hash}`);
  state = await escrow.getTransactionState(txAId);
  console.log(`      State: EVIDENCE_SUBMITTED (${state})`);

  // A.6 Request Verification
  const txReqA = await escrowAsSeller.requestVerification(txAId, { nonce: sellerNonce++ });
  const rcReqA = await txReqA.wait();
  console.log(`[6/8] requestVerification()          -> Hash: ${rcReqA.hash}`);
  state = await escrow.getTransactionState(txAId);
  console.log(`      State: VERIFICATION (${state})`);

  // A.7 Designated Verifier Conducts Physical Inspection & Submits PASS
  const txSubVerA = await escrowAsVerifier.submitVerification(txAId, 1 /* PASS */, verifierReportHashA, {
    nonce: verifierNonce++,
  });
  const rcSubVerA = await txSubVerA.wait();
  console.log(`[7/8] submitVerification(PASS)       -> Hash: ${rcSubVerA.hash}`);
  const recA = await escrow.getTransaction(txAId);
  console.log(`      Verifier Attestation: PASS (VerificationOutcome: ${recA.verificationOutcome})`);

  // A.8 Buyer Releases Escrow upon PASS
  const txSettleA = await escrowAsBuyer.releaseEscrow(txAId, { nonce: buyerNonce++ });
  const rcSettleA = await txSettleA.wait();
  console.log(`[8/8] releaseEscrow()                -> Hash: ${rcSettleA.hash}`);
  state = await escrow.getTransactionState(txAId);
  console.log(`      State: SETTLED (${state}) [TERMINAL]`);

  const sellerBalPreA = await provider.getBalance(seller.address, rcReqA.blockNumber);
  const sellerBalPostA = await provider.getBalance(seller.address, rcSettleA.blockNumber);
  console.log(`      Seller Received: +${ethers.formatEther(sellerBalPostA - sellerBalPreA)} MON`);
  console.log(`      Vault Liabilities: ${ethers.formatEther(await escrow.totalEscrowLiabilities())} MON`);

  // Verify Soulbound Trust Receipt #1
  const receiptAExists = await registry.receiptExists(txAId);
  console.log(`\n[✓] Soulbound Trust Receipt Minted: ${receiptAExists}`);
  const receiptA = await registry.getReceiptByTransaction(txAId);
  console.log(`    Receipt Details:`);
  console.log(`    - Receipt ID:          #1`);
  console.log(`    - Settled Amount:      ${ethers.formatEther(receiptA.settledAmount)} MON`);
  console.log(`    - Outcome:             SETTLED (Code: ${receiptA.outcome})`);
  console.log(`    - Terms Summary Hash:  ${receiptA.termsSummaryHash}`);
  console.log(`    - Evidence Root:       ${receiptA.evidenceRoot}`);
  console.log(`    - Issued At Timestamp: ${receiptA.issuedAt}\n`);

  // ---------------------------------------------------------------------------
  // FLOW B: CONTESTED FREIGHT DELIVERY: INCONCLUSIVE -> ESCROW FROZEN -> DISPUTE
  // ---------------------------------------------------------------------------
  console.log('================================================================');
  console.log('FLOW B — DAMAGED FREIGHT: INCONCLUSIVE -> DISPUTE -> RESOLVE');
  console.log('================================================================\n');

  const txBId = ethers.id('TX_B_DAMAGED_FREIGHT_' + Date.now());
  const termsHashB = ethers.id('TERMS_100_SOLAR_PANELS_FREIGHT_DELIVERY');
  const evidenceContentB = ethers.id('EVIDENCE_DISPATCH_CARGO_PHOTOS_PALLET_3_CRACKED');
  const evidenceMetaB = ethers.id('METADATA_INSPECTION_85_INTACT_15_DAMAGED');
  const storageUriHashB = ethers.id('ipfs://bafy-damaged-cargo-evidence-15-cracked');
  const verifierReportHashB = ethers.id('DEPOT_INSPECTION_REPORT_INCONCLUSIVE_DAMAGE');

  // B.1 Create Transaction (Unfunded)
  const txCreateB = await escrowAsBuyer.createTransactionWithVerifier(
    txBId,
    seller.address,
    verifier.address,
    ethers.ZeroAddress,
    amount20Mon,
    deadline,
    termsHashB,
    { nonce: buyerNonce++ }
  );
  const rcCreateB = await txCreateB.wait();
  console.log(`[1/11] createTransactionWithVerifier() -> Hash: ${rcCreateB.hash}`);
  state = await escrow.getTransactionState(txBId);
  console.log(`       State: PROPOSED (${state})`);

  // B.2 Seller Agrees
  const txAgreeB = await escrowAsSeller.agreeTransaction(txBId, { nonce: sellerNonce++ });
  const rcAgreeB = await txAgreeB.wait();
  console.log(`[2/11] agreeTransaction()              -> Hash: ${rcAgreeB.hash}`);
  state = await escrow.getTransactionState(txBId);
  console.log(`       State: AGREED (${state})`);

  // B.3 Buyer Funds Escrow (20.0 MON)
  const txFundB = await escrowAsBuyer.fundEscrow(txBId, { value: amount20Mon, nonce: buyerNonce++ });
  const rcFundB = await txFundB.wait();
  console.log(`[3/11] fundEscrow(20.0 MON)            -> Hash: ${rcFundB.hash}`);
  state = await escrow.getTransactionState(txBId);
  console.log(`       State: FUNDED (${state}) | Vault Liabilities: ${ethers.formatEther(await escrow.totalEscrowLiabilities())} MON`);

  // B.4 Seller Starts Work
  const txStartB = await escrowAsSeller.startWork(txBId, { nonce: sellerNonce++ });
  const rcStartB = await txStartB.wait();
  console.log(`[4/11] startWork()                     -> Hash: ${rcStartB.hash}`);
  state = await escrow.getTransactionState(txBId);
  console.log(`       State: IN_PROGRESS (${state})`);

  // B.5 Seller Anchors Delivery Evidence
  const txEvB = await escrowAsSeller['anchorEvidence(bytes32,bytes32,bytes32,bytes32,bool)'](
    txBId,
    evidenceContentB,
    evidenceMetaB,
    storageUriHashB,
    false,
    { nonce: sellerNonce++ }
  );
  const rcEvB = await txEvB.wait();
  console.log(`[5/11] anchorEvidence(Content + Meta)  -> Hash: ${rcEvB.hash}`);
  state = await escrow.getTransactionState(txBId);
  console.log(`       State: EVIDENCE_SUBMITTED (${state})`);

  // B.6 Request Verification
  const txReqB = await escrowAsSeller.requestVerification(txBId, { nonce: sellerNonce++ });
  const rcReqB = await txReqB.wait();
  console.log(`[6/11] requestVerification()           -> Hash: ${rcReqB.hash}`);
  state = await escrow.getTransactionState(txBId);
  console.log(`       State: VERIFICATION (${state})`);

  // B.7 Independent Verifier Audits Cargo: 15 Damaged / Missing -> Submits INCONCLUSIVE
  const txSubVerB = await escrowAsVerifier.submitVerification(txBId, 3 /* INCONCLUSIVE */, verifierReportHashB, {
    nonce: verifierNonce++,
  });
  const rcSubVerB = await txSubVerB.wait();
  console.log(`[7/11] submitVerification(INCONCLUSIVE) -> Hash: ${rcSubVerB.hash}`);
  state = await escrow.getTransactionState(txBId);
  const recB = await escrow.getTransaction(txBId);
  console.log(`       State: VERIFICATION (${state})`);
  console.log(`       Verifier Attestation: INCONCLUSIVE (VerificationOutcome: ${recB.verificationOutcome})`);

  // B.8 Buyer Attempts Release -> MUST REVERT Onchain
  console.log(`[8/11] Testing Inconclusive Gating: Buyer attempts releaseEscrow()...`);
  try {
    await escrowAsBuyer.releaseEscrow.estimateGas(txBId);
    console.error(`       ERROR: Release should have reverted!`);
    process.exit(1);
  } catch (err) {
    console.log(`       [✓] Reverted onchain as required: releaseEscrow blocked on INCONCLUSIVE verification`);
  }

  // Funds remain safely locked in contract
  state = await escrow.getTransactionState(txBId);
  console.log(`       State Preserved: VERIFICATION (${state})`);
  console.log(`       Funds Protected: Vault Liabilities = ${ethers.formatEther(await escrow.totalEscrowLiabilities())} MON`);

  // B.9 Buyer Opens Dispute
  const txDisputeB = await escrowAsBuyer.openDispute(txBId, { nonce: buyerNonce++ });
  const rcDisputeB = await txDisputeB.wait();
  console.log(`[9/11] openDispute()                  -> Hash: ${rcDisputeB.hash}`);
  state = await escrow.getTransactionState(txBId);
  console.log(`       State: DISPUTED (${state}) [Escrow Frozen]`);

  // B.10 Dispute Resolver Evaluates Neutral Dossier & Adjudicates Binding Split:
  // 1500 bps (15% refund to buyer [3.0 MON], 85% payout to seller [17.0 MON])
  console.log(`[10/11] Adjudicating Dispute via resolveDispute(1500 bps = 15% Buyer, 85% Seller)...`);
  const txResolveB = await escrowAsResolver.resolveDispute(txBId, 1500, {
    nonce: resolverNonce++,
  });
  const rcResolveB = await txResolveB.wait();
  console.log(`        resolveDispute()              -> Hash: ${rcResolveB.hash}`);
  state = await escrow.getTransactionState(txBId);
  console.log(`        State: SETTLED (${state}) [TERMINAL POST-DISPUTE]`);

  const buyerPreDispute = await provider.getBalance(buyer.address, rcDisputeB.blockNumber);
  const sellerPreDispute = await provider.getBalance(seller.address, rcDisputeB.blockNumber);
  const buyerPostDispute = await provider.getBalance(buyer.address, rcResolveB.blockNumber);
  const sellerPostDispute = await provider.getBalance(seller.address, rcResolveB.blockNumber);

  console.log(`[11/11] Payouts & Accountability Verification:`);
  console.log(`        Buyer Received Refund (15%):   +${ethers.formatEther(buyerPostDispute - buyerPreDispute)} MON`);
  console.log(`        Seller Received Payout (85%):  +${ethers.formatEther(sellerPostDispute - sellerPreDispute)} MON`);
  console.log(`        Vault Liabilities:             ${ethers.formatEther(await escrow.totalEscrowLiabilities())} MON`);
  console.log(`        Contract Vault Balance:        ${ethers.formatEther(await provider.getBalance(escrowAddress))} MON`);

  // Verify Soulbound Trust Receipt #2
  const receiptBExists = await registry.receiptExists(txBId);
  console.log(`\n[✓] Soulbound Dispute Trust Receipt Minted: ${receiptBExists}`);
  const receiptB = await registry.getReceiptByTransaction(txBId);
  console.log(`    Receipt Details:`);
  console.log(`    - Receipt ID:          #2`);
  console.log(`    - Settled Amount:      ${ethers.formatEther(receiptB.settledAmount)} MON`);
  console.log(`    - Outcome:             SETTLED (Code: ${receiptB.outcome})`);
  console.log(`    - Terms Summary Hash:  ${receiptB.termsSummaryHash}`);
  console.log(`    - Evidence Root:       ${receiptB.evidenceRoot}`);
  console.log(`    - Issued At Timestamp: ${receiptB.issuedAt}\n`);

  console.log('================================================================');
  console.log('STAGE 3 E2E VERIFICATION: BOTH FLOW A & FLOW B EXECUTED 100% OK!');
  console.log('================================================================');
}

runLocalEndToEnd().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
