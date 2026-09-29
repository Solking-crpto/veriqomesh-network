/**
 * Real-Time Monad Metropolis Testnet E2E Transaction Inspector
 * Queries deployed contracts to verify onchain state machine transitions.
 */

const { JsonRpcProvider, Contract, formatEther, ZeroAddress } = require('ethers');

const RPC_URL = 'https://testnet-rpc.monad.xyz';
const CHAIN_ID = 10143;
const ESCROW_ADDRESS = '0x925ea880cA53DE0352b84B24d0C0dee5B258015A';
const REGISTRY_ADDRESS = '0xE1994e0dF7CD5A836be4b02AE2164A542418B819';

const STATE_NAMES = [
  'DRAFT', 'PROPOSED', 'NEGOTIATING', 'AGREED', 'FUNDED',
  'IN_PROGRESS', 'EVIDENCE_SUBMITTED', 'VERIFICATION', 'DISPUTED',
  'JUDGING', 'RESOLVED', 'SETTLED', 'REFUNDED', 'CANCELLED'
];

const OUTCOME_NAMES = ['NONE', 'PASS', 'FAIL', 'INCONCLUSIVE'];

const ESCROW_ABI = [
  'function getTransaction(bytes32 transactionId) external view returns (tuple(bytes32 transactionId, address buyer, address seller, address verifier, address tokenAddress, uint256 totalAmount, uint8 state, uint8 verificationOutcome, uint64 agreementDeadline, uint64 fulfillmentDeadline, uint64 disputeDeadline, bytes32 termsHash, bytes32 evidenceRoot, uint64 createdAt, uint64 fundedAt, uint64 settledAt))',
  'function totalEscrowLiabilities() external view returns (uint256)',
  'function getEvidenceAnchors(bytes32 transactionId) external view returns (tuple(bytes32 contentHash, bytes32 metadataHash, bytes32 storageUriHash, address submitter, uint64 timestamp, bool isEncrypted, uint8 status)[])',
];

const REGISTRY_ABI = [
  'function getReceiptByTransaction(bytes32 transactionId) external view returns (tuple(uint256 receiptId, bytes32 transactionId, address buyer, address seller, uint256 settledAmount, uint8 outcome, bytes32 termsSummaryHash, bytes32 evidenceRoot, uint64 issuedAt))',
  'function nextReceiptId() external view returns (uint256)',
];

async function inspectTransaction(targetTxId) {
  if (!targetTxId || targetTxId.length !== 66) {
    console.error('Error: Please provide a valid 32-byte hex transaction ID (0x...)');
    process.exit(1);
  }

  const provider = new JsonRpcProvider(RPC_URL, CHAIN_ID);
  const escrow = new Contract(ESCROW_ADDRESS, ESCROW_ABI, provider);
  const registry = new Contract(REGISTRY_ADDRESS, REGISTRY_ABI, provider);

  console.log('============================================================');
  console.log('VERIQOMESH NETWORK — MONAD TESTNET ONCHAIN AUDIT');
  console.log('============================================================');
  console.log('RPC Endpoint:        ', RPC_URL);
  console.log('Chain ID:            ', CHAIN_ID);
  console.log('Escrow Contract:     ', ESCROW_ADDRESS);
  console.log('Registry Contract:   ', REGISTRY_ADDRESS);
  console.log('Target TransactionId:', targetTxId);
  console.log('------------------------------------------------------------');

  const [rawTx, liabilities, anchors, receipt] = await Promise.all([
    escrow.getTransaction(targetTxId).catch((err) => {
      console.error('Failed to get transaction:', err.message);
      return null;
    }),
    escrow.totalEscrowLiabilities().catch(() => 0n),
    escrow.getEvidenceAnchors(targetTxId).catch(() => []),
    registry.getReceiptByTransaction(targetTxId).catch(() => null),
  ]);

  if (!rawTx || rawTx.buyer === ZeroAddress) {
    console.log('Transaction does not exist yet on Monad Testnet (buyer = 0x0).');
    console.log('Total Escrow Liabilities:', formatEther(liabilities), 'MON');
    return;
  }

  const stateIndex = Number(rawTx.state);
  const stateName = STATE_NAMES[stateIndex] || `UNKNOWN(${stateIndex})`;
  const outcomeIndex = Number(rawTx.verificationOutcome);
  const outcomeName = OUTCOME_NAMES[outcomeIndex] || `UNKNOWN(${outcomeIndex})`;

  console.log('Buyer:               ', rawTx.buyer);
  console.log('Seller:              ', rawTx.seller);
  console.log('Verifier:            ', rawTx.verifier);
  console.log('Total Amount:        ', formatEther(rawTx.totalAmount), 'MON (', rawTx.totalAmount.toString(), 'wei )');
  console.log('State:               ', stateName, `(Index: ${stateIndex})`);
  console.log('Verification Outcome:', outcomeName, `(Index: ${outcomeIndex})`);
  console.log('Terms Hash:          ', rawTx.termsHash);
  console.log('Evidence Root:       ', rawTx.evidenceRoot);
  console.log('Created At:          ', new Date(Number(rawTx.createdAt) * 1000).toISOString());
  console.log('Funded At:           ', Number(rawTx.fundedAt) > 0 ? new Date(Number(rawTx.fundedAt) * 1000).toISOString() : 'Not Funded Yet');
  console.log('Settled At:          ', Number(rawTx.settledAt) > 0 ? new Date(Number(rawTx.settledAt) * 1000).toISOString() : 'Not Settled Yet');
  console.log('Evidence Anchors:    ', anchors.length, 'anchored item(s)');
  for (let i = 0; i < anchors.length; i++) {
    console.log(`  [${i + 1}] ContentHash: ${anchors[i].contentHash} | Submitter: ${anchors[i].submitter}`);
  }

  console.log('------------------------------------------------------------');
  console.log('PROTOCOL VAULT STATUS');
  console.log('Total Liabilities:   ', formatEther(liabilities), 'MON');

  if (receipt && receipt.receiptId > 0n) {
    console.log('------------------------------------------------------------');
    console.log('TRUST RECEIPT CONFIRMED (Registry)');
    console.log('Receipt ID:          ', receipt.receiptId.toString());
    console.log('Settled Amount:      ', formatEther(receipt.settledAmount), 'MON');
    console.log('Issued At:           ', new Date(Number(receipt.issuedAt) * 1000).toISOString());
    console.log('Terms Hash:          ', receipt.termsSummaryHash);
  }

  console.log('------------------------------------------------------------');
  console.log('EXPLORER LINKS');
  console.log('Escrow Contract:     https://testnet.monadvision.com/address/' + ESCROW_ADDRESS);
  console.log('Registry Contract:   https://testnet.monadvision.com/address/' + REGISTRY_ADDRESS);
  console.log('============================================================');
}

const txArg = process.argv[2];
inspectTransaction(txArg);
