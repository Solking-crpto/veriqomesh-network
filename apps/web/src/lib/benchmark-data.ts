/**
 * VeriqoMesh Network — Single Source of Truth for Benchmark Data
 * All values verified against Monad Testnet RPC (Chain ID 10143) and Envio HyperIndex.
 * 
 * Invariants:
 * - Real tx hashes only (eth_getTransactionReceipt confirmed)
 * - Real block numbers and timestamps from onchain headers
 * - Canonical explorer: https://testnet.monadvision.com
 */

export const MONAD_CHAIN_ID = 10143;
export const MONAD_EXPLORER_URL = 'https://testnet.monadvision.com';
export const DEFAULT_ENVIO_GRAPHQL_URL = 'https://indexer.dev.hyperindex.xyz/bd02c3f/v1/graphql';

export const DEPLOYED_ESCROW_ADDRESS = '0x925ea880cA53DE0352b84B24d0C0dee5B258015A';
export const DEPLOYED_REGISTRY_ADDRESS = '0xE1994e0dF7CD5A836be4b02AE2164A542418B819';
export const CANONICAL_RESOLVER_ADDRESS = '0x12f9e53c31F7629aCAE0BA70588794945EC6c35E';

export const CANONICAL_FLOW_A_TX_ID = '0x961c70865bf6097eb16d1b3a19d90f950b2cdd789eda5554c93baba1de0954e1';
export const CANONICAL_FLOW_B_TX_ID = '0x2b57d6b0ef1ba16a60c4f801d90d27d23e598fd6b1381e0175077201dc6afcc4';

export function getExplorerTxUrl(txHash: string): string {
  return `${MONAD_EXPLORER_URL}/tx/${txHash}`;
}

export function getExplorerAddressUrl(address: string): string {
  return `${MONAD_EXPLORER_URL}/address/${address}`;
}

export function getExplorerBlockUrl(blockNumber: number): string {
  return `${MONAD_EXPLORER_URL}/block/${blockNumber}`;
}

export function getExplorerSearchUrl(query: string): string {
  return `${MONAD_EXPLORER_URL}/search?q=${encodeURIComponent(query)}`;
}

export interface BenchmarkEvent {
  id: string;
  eventType: string;
  transactionId: string;
  flow: 'Flow A' | 'Flow B' | 'Genesis';
  actor: string;
  actorRole: string;
  details: string;
  blockNumber: number;
  timestamp: string;
  txHash: string;
  category: 'agreement' | 'escrow' | 'evidence' | 'verification' | 'dispute' | 'settlement' | 'receipt';
}

export interface BenchmarkReceipt {
  receiptId: number;
  transactionId: string;
  flowName: string;
  partyA: string;
  partyB: string;
  tokenAddress: string;
  settledAmount: string;
  outcomeText: string;
  outcomeCode: number;
  termsSummaryHash: string;
  evidenceRoot: string;
  issuedBlock: number;
  issuedAt: string;
  txHash: string;
  statusLabel: string;
  isLocked: boolean;
}

/**
 * Onchain Soulbound Trust Receipts (ERC-5192) verified from TrustReceiptRegistry (0xE1994e...B819)
 */
export const VERIFIED_BENCHMARK_RECEIPTS: BenchmarkReceipt[] = [
  {
    receiptId: 1,
    transactionId: '0x22fac00f8a77ff545501fc8b7e560c770b647717249050bb7eb500965eb2763e',
    flowName: 'Initial protocol validation run (Sept 23), before Flows A and B.',
    partyA: '0x9b1c7f74EC79b6E657745DE052dAfacF171bD9aC',
    partyB: '0xc8f40a695db107F3f8d624955ef642d81513d583',
    tokenAddress: '0x0000000000000000000000000000000000000000',
    settledAmount: '0.001 MON',
    outcomeText: 'VALID (Outcome 1 / PASS)',
    outcomeCode: 11,
    termsSummaryHash: '0x36e953c31dfa95bdd3ff6204c545b24e0517c5d61c16a762f4bb0eecfa5c4f35',
    evidenceRoot: '0x344e3adaeeba7cdc2585f81c6918772e43f09793a69204d59be8746f95e0703f',
    issuedBlock: 65092494,
    issuedAt: '2026-09-23T19:04:52.000Z',
    txHash: '0x1ef8e57e6b29787428476b1bb44db5241e65ec97cc64c3a7e4aad37fc98b1cb3',
    statusLabel: 'Initial protocol validation run (Sept 23), before Flows A and B.',
    isLocked: true,
  },
  {
    receiptId: 2,
    transactionId: CANONICAL_FLOW_B_TX_ID,
    flowName: 'Flow B: Dispute Resolution Settlement',
    partyA: '0x287196Cdbf41da13Cb7083392e47eaAf105b58A0',
    partyB: '0x6f30D20b8c5bE781bADD86341415b556fB13c873',
    tokenAddress: '0x0000000000000000000000000000000000000000',
    settledAmount: '0.001 MON',
    outcomeText: 'INCONCLUSIVE (Outcome 3 — 15% Buyer Refund, 85% Seller Payout)',
    outcomeCode: 11,
    termsSummaryHash: '0x76d78fa0565ff73844d5a51cdda6c21cc7e8ce81906f704cf5108d084c2c7696',
    evidenceRoot: '0xe8fd73f129c4c1124fa548c0d28ed31a769f983186b08cf51ed849f177903ad4',
    issuedBlock: 65129932,
    issuedAt: '2026-09-23T22:15:39.000Z',
    txHash: '0x91ff62584f4386250ccb09f28808453bb373273d9fa5f56cf04378c2a78084ba',
    statusLabel: 'Dispute Resolution Settlement',
    isLocked: true,
  },
  {
    receiptId: 3,
    transactionId: CANONICAL_FLOW_A_TX_ID,
    flowName: 'Flow A: Verified Release Settlement',
    partyA: '0xa4bCC57d40311D715ECe34940191820d4a81C50F',
    partyB: '0x0e73dBFf9047423b520FA9fc23a95645fC986Ee8',
    tokenAddress: '0x0000000000000000000000000000000000000000',
    settledAmount: '0.001 MON',
    outcomeText: 'VALID (Outcome 1 / PASS — 100% Milestone Release)',
    outcomeCode: 11,
    termsSummaryHash: '0xebb931936199ae988129d1eed8501a6ad3311035f0d72dd0e52e0c92454a125f',
    evidenceRoot: '0x08a30b2c4935050f1ffbda42a5a6565ab54fc1b090bb47c036afd47aaad2edff',
    issuedBlock: 66436615,
    issuedAt: '2026-09-28T14:58:09.000Z',
    txHash: '0x691f7a80d65fe1deece2f45e8b6600ee4b2b0ffc14f3fe733d995566e2d83b52',
    statusLabel: 'Verified Release Settlement',
    isLocked: true,
  },
];

/**
 * Chronological, authoritative onchain lifecycle events for Flow B (Sept 23, 2026) and Flow A (Sept 26-28, 2026).
 * Sorted strictly by blockNumber ascending.
 */
export const VERIFIED_BENCHMARK_PROVENANCE_EVENTS: BenchmarkEvent[] = [
  // --- Flow B: Contested Adjudication & Dispute Resolution (Blocks 65,122,781 - 65,129,932) ---
  {
    id: 'flow-b-create',
    eventType: 'TransactionCreated',
    transactionId: CANONICAL_FLOW_B_TX_ID,
    flow: 'Flow B',
    actor: '0x287196Cdbf41da13Cb7083392e47eaAf105b58A0',
    actorRole: 'Buyer',
    details: 'Escrow deal proposed onchain. Terms: 0.001 MON. Designated verifier: 0x16D7...F4EA.',
    blockNumber: 65122781,
    timestamp: '2026-09-23T21:39:10.000Z',
    txHash: '0x3a9ec0ea9cff2882c80a875812cfd63737f894867c64465038e975f233a18310',
    category: 'agreement',
  },
  {
    id: 'flow-b-agree',
    eventType: 'TransactionAgreed',
    transactionId: CANONICAL_FLOW_B_TX_ID,
    flow: 'Flow B',
    actor: '0x6f30D20b8c5bE781bADD86341415b556fB13c873',
    actorRole: 'Seller',
    details: 'Seller accepted agreement onchain.',
    blockNumber: 65122843,
    timestamp: '2026-09-23T21:39:29.000Z',
    txHash: '0xc60a3ebf14f0b36818b510d971505781b70d52e5073036fc7f051180f179d5b1',
    category: 'agreement',
  },
  {
    id: 'flow-b-fund',
    eventType: 'TransactionFunded',
    transactionId: CANONICAL_FLOW_B_TX_ID,
    flow: 'Flow B',
    actor: '0x287196Cdbf41da13Cb7083392e47eaAf105b58A0',
    actorRole: 'Buyer',
    details: 'Buyer deposited 0.001 MON into escrow contract.',
    blockNumber: 65122921,
    timestamp: '2026-09-23T21:39:52.000Z',
    txHash: '0xf466a3acb09a0dee38525b36bbe3809ce88853098fea327d9b09c1178c3f3227',
    category: 'escrow',
  },
  {
    id: 'flow-b-start',
    eventType: 'TransactionStarted',
    transactionId: CANONICAL_FLOW_B_TX_ID,
    flow: 'Flow B',
    actor: '0x6f30D20b8c5bE781bADD86341415b556fB13c873',
    actorRole: 'Seller',
    details: 'Seller commenced transaction lifecycle.',
    blockNumber: 65122938,
    timestamp: '2026-09-23T21:39:58.000Z',
    txHash: '0x7456f91e842f2842133f92b75ce80eae3b2af455a53de3d7f176c26daab8054f',
    category: 'agreement',
  },
  {
    id: 'flow-b-evidence',
    eventType: 'EvidenceAnchored',
    transactionId: CANONICAL_FLOW_B_TX_ID,
    flow: 'Flow B',
    actor: '0x6f30D20b8c5bE781bADD86341415b556fB13c873',
    actorRole: 'Seller',
    details: 'Deliverable evidence hash anchored: 0xe8fd73f129c4c1124fa548c0d28ed31a769f983186b08cf51ed849f177903ad4.',
    blockNumber: 65122948,
    timestamp: '2026-09-23T21:40:01.000Z',
    txHash: '0x722d4a339f888b5ea50e4738b53e1dcf4ad5461e954275a50004ea3d2c05c91c',
    category: 'evidence',
  },
  {
    id: 'flow-b-vstart',
    eventType: 'VerificationStarted',
    transactionId: CANONICAL_FLOW_B_TX_ID,
    flow: 'Flow B',
    actor: '0x16D7bD08Ad79bBCdBa116A652f68589FE5d6F4EA',
    actorRole: 'Designated Verifier',
    details: 'Verification initiated by designated verifier 0x16D7bD08Ad79bBCdBa116A652f68589FE5d6F4EA.',
    blockNumber: 65122960,
    timestamp: '2026-09-23T21:40:04.000Z',
    txHash: '0x753f2b5c98d1e784887e6ce0697b4596aa56ba9fa4eabe201b4f34f5dd0c5994',
    category: 'verification',
  },
  {
    id: 'flow-b-vsubmit',
    eventType: 'VerificationSubmitted',
    transactionId: CANONICAL_FLOW_B_TX_ID,
    flow: 'Flow B',
    actor: '0x16D7bD08Ad79bBCdBa116A652f68589FE5d6F4EA',
    actorRole: 'Designated Verifier',
    details: 'Verification submitted. Outcome: INCONCLUSIVE (Outcome 3).',
    blockNumber: 65122972,
    timestamp: '2026-09-23T21:40:08.000Z',
    txHash: '0x5778e6a8d77db4f77bf04d9cfc9e51896b1e7a6de1a0e17d27b09f355b3f1485',
    category: 'verification',
  },
  {
    id: 'flow-b-dispute',
    eventType: 'DisputeOpened',
    transactionId: CANONICAL_FLOW_B_TX_ID,
    flow: 'Flow B',
    actor: '0x287196Cdbf41da13Cb7083392e47eaAf105b58A0',
    actorRole: 'Buyer',
    details: 'Dispute opened onchain following INCONCLUSIVE verification outcome.',
    blockNumber: 65122986,
    timestamp: '2026-09-23T21:40:12.000Z',
    txHash: '0xb01a687de4c65113a647b7bd7f3db23d440c7088eda0445bf5d32a05495106e4',
    category: 'dispute',
  },
  {
    id: 'flow-b-resolved',
    eventType: 'DisputeResolved',
    transactionId: CANONICAL_FLOW_B_TX_ID,
    flow: 'Flow B',
    actor: '0x12f9e53c31F7629aCAE0BA70588794945EC6c35E',
    actorRole: 'Dispute Resolver',
    details: 'Dispute resolved by authorized resolver 0x12f9e53c31F7629aCAE0BA70588794945EC6c35E. Allocation: 1,500 bps (15% buyer refund). Transaction State: SETTLED (11). Payout: 0.00085 MON to seller, 0.00015 MON to buyer.',
    blockNumber: 65129932,
    timestamp: '2026-09-23T22:15:39.000Z',
    txHash: '0x91ff62584f4386250ccb09f28808453bb373273d9fa5f56cf04378c2a78084ba',
    category: 'settlement',
  },
  {
    id: 'flow-b-receipt',
    eventType: 'TrustReceiptIssued',
    transactionId: CANONICAL_FLOW_B_TX_ID,
    flow: 'Flow B',
    actor: '0xE1994e0dF7CD5A836be4b02AE2164A542418B819',
    actorRole: 'TrustReceipt Registry',
    details: 'Trust Receipt #2 issued. Verification Outcome: INCONCLUSIVE (Outcome 3). Transaction State: SETTLED (11). Non-transferable ERC-5192 minted.',
    blockNumber: 65129932,
    timestamp: '2026-09-23T22:15:39.000Z',
    txHash: '0x91ff62584f4386250ccb09f28808453bb373273d9fa5f56cf04378c2a78084ba',
    category: 'receipt',
  },

  // --- Flow A: Verified Autonomous Milestone Release (Blocks 65,963,660 - 66,436,615) ---
  {
    id: 'flow-a-create',
    eventType: 'TransactionCreated',
    transactionId: CANONICAL_FLOW_A_TX_ID,
    flow: 'Flow A',
    actor: '0xa4bCC57d40311D715ECe34940191820d4a81C50F',
    actorRole: 'Buyer',
    details: 'Escrow deal proposed onchain. Terms: 0.001 MON. Designated verifier: 0xb064...2c48.',
    blockNumber: 65963660,
    timestamp: '2026-09-26T22:12:58.000Z',
    txHash: '0xeddd26b03699fa0dd8aabd5a8ff260abca029ece60c13dae916fe4060f33e2cd',
    category: 'agreement',
  },
  {
    id: 'flow-a-agree',
    eventType: 'TransactionAgreed',
    transactionId: CANONICAL_FLOW_A_TX_ID,
    flow: 'Flow A',
    actor: '0x0e73dBFf9047423b520FA9fc23a95645fC986Ee8',
    actorRole: 'Seller',
    details: 'Seller accepted agreement onchain.',
    blockNumber: 65963910,
    timestamp: '2026-09-26T22:14:17.000Z',
    txHash: '0x4ac4c4b6cdf18b753f5e5f536f83a93545c5c185129ea58418ca9e38cdf11f8a',
    category: 'agreement',
  },
  {
    id: 'flow-a-fund',
    eventType: 'TransactionFunded',
    transactionId: CANONICAL_FLOW_A_TX_ID,
    flow: 'Flow A',
    actor: '0xa4bCC57d40311D715ECe34940191820d4a81C50F',
    actorRole: 'Buyer',
    details: 'Buyer deposited 0.001 MON into escrow contract.',
    blockNumber: 66096522,
    timestamp: '2026-09-27T09:41:38.000Z',
    txHash: '0xdcb8564b899b06f9bd8eb2d6bcacc92d9f51838cf23bfb0ac3faba7703a04f3e',
    category: 'escrow',
  },
  {
    id: 'flow-a-start',
    eventType: 'TransactionStarted',
    transactionId: CANONICAL_FLOW_A_TX_ID,
    flow: 'Flow A',
    actor: '0x0e73dBFf9047423b520FA9fc23a95645fC986Ee8',
    actorRole: 'Seller',
    details: 'Seller commenced transaction lifecycle.',
    blockNumber: 66098350,
    timestamp: '2026-09-27T09:51:08.000Z',
    txHash: '0xb085f04396db481be7d06034a6b86c345d522b5ce79bf968fb24b05b3dfb470b',
    category: 'agreement',
  },
  {
    id: 'flow-a-evidence',
    eventType: 'EvidenceAnchored',
    transactionId: CANONICAL_FLOW_A_TX_ID,
    flow: 'Flow A',
    actor: '0x0e73dBFf9047423b520FA9fc23a95645fC986Ee8',
    actorRole: 'Seller',
    details: 'Deliverable evidence hash anchored: 0x08a30b2c4935050f1ffbda42a5a6565ab54fc1b090bb47c036afd47aaad2edff.',
    blockNumber: 66434952,
    timestamp: '2026-09-28T14:49:29.000Z',
    txHash: '0x698ef9bed9a8007db66a6047187783dd97d026055b0f2e30cfe75826ad7b923e',
    category: 'evidence',
  },
  {
    id: 'flow-a-vstart',
    eventType: 'VerificationStarted',
    transactionId: CANONICAL_FLOW_A_TX_ID,
    flow: 'Flow A',
    actor: '0xb064d69428B9838C2a3e408cF995ea8eb5182c48',
    actorRole: 'Designated Verifier',
    details: 'Verification initiated by designated verifier 0xb064d69428B9838C2a3e408cF995ea8eb5182c48.',
    blockNumber: 66436074,
    timestamp: '2026-09-28T14:55:22.000Z',
    txHash: '0x0c1a3b6b468da55a01f11bf77ae0b016a6053cef4d3673aabf56c5995131a121',
    category: 'verification',
  },
  {
    id: 'flow-a-vsubmit',
    eventType: 'VerificationSubmitted',
    transactionId: CANONICAL_FLOW_A_TX_ID,
    flow: 'Flow A',
    actor: '0xb064d69428B9838C2a3e408cF995ea8eb5182c48',
    actorRole: 'Designated Verifier',
    details: 'Verification submitted. Outcome: VALID (Outcome 1 / PASS).',
    blockNumber: 66436440,
    timestamp: '2026-09-28T14:57:14.000Z',
    txHash: '0x4d4ff904821b9d3fe145b00a0e27f2096e567155a6d20c50e7b6913095f29bb0',
    category: 'verification',
  },
  {
    id: 'flow-a-settle',
    eventType: 'TransactionSettled',
    transactionId: CANONICAL_FLOW_A_TX_ID,
    flow: 'Flow A',
    actor: '0xa4bCC57d40311D715ECe34940191820d4a81C50F',
    actorRole: 'Buyer (releaseEscrow caller)',
    details: 'Escrow release executed onchain. Transaction State: SETTLED (11). Payout: 0.001 MON (100%) transferred to seller.',
    blockNumber: 66436615,
    timestamp: '2026-09-28T14:58:09.000Z',
    txHash: '0x691f7a80d65fe1deece2f45e8b6600ee4b2b0ffc14f3fe733d995566e2d83b52',
    category: 'settlement',
  },
  {
    id: 'flow-a-receipt',
    eventType: 'TrustReceiptIssued',
    transactionId: CANONICAL_FLOW_A_TX_ID,
    flow: 'Flow A',
    actor: '0xE1994e0dF7CD5A836be4b02AE2164A542418B819',
    actorRole: 'TrustReceipt Registry',
    details: 'Trust Receipt #3 issued. Verification Outcome: VALID (Outcome 1 / PASS). Transaction State: SETTLED (11). Non-transferable ERC-5192 minted.',
    blockNumber: 66436615,
    timestamp: '2026-09-28T14:58:09.000Z',
    txHash: '0x691f7a80d65fe1deece2f45e8b6600ee4b2b0ffc14f3fe733d995566e2d83b52',
    category: 'receipt',
  },
];

/**
 * Onchain Evidence Anchors (Keccak-256 Deliverable Hashes)
 */
export interface EvidenceRecord {
  transactionId: string;
  flowName: string;
  contentHash: string;
  submitter: string;
  submitterLabel: string;
  blockNumber: number;
  timestamp: string;
  txHash: string;
}

export const VERIFIED_BENCHMARK_EVIDENCE: EvidenceRecord[] = [
  {
    transactionId: CANONICAL_FLOW_B_TX_ID,
    flowName: 'Flow B: Contested Deliverable (Outcome 3)',
    contentHash: '0xe8fd73f129c4c1124fa548c0d28ed31a769f983186b08cf51ed849f177903ad4',
    submitter: '0x6f30D20b8c5bE781bADD86341415b556fB13c873',
    submitterLabel: 'Seller (Commercial Supplier)',
    blockNumber: 65122948,
    timestamp: '2026-09-23T21:40:01.000Z',
    txHash: '0x722d4a339f888b5ea50e4738b53e1dcf4ad5461e954275a50004ea3d2c05c91c',
  },
  {
    transactionId: CANONICAL_FLOW_A_TX_ID,
    flowName: 'Flow A: Verified Deliverable (Outcome 1)',
    contentHash: '0x08a30b2c4935050f1ffbda42a5a6565ab54fc1b090bb47c036afd47aaad2edff',
    submitter: '0x0e73dBFf9047423b520FA9fc23a95645fC986Ee8',
    submitterLabel: 'Seller (Commercial Supplier)',
    blockNumber: 66434952,
    timestamp: '2026-09-28T14:49:29.000Z',
    txHash: '0x698ef9bed9a8007db66a6047187783dd97d026055b0f2e30cfe75826ad7b923e',
  },
];
