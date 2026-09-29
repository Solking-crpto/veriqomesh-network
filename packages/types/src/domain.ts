/**
 * TrustMesh Core Domain Models & Module Boundaries
 *
 * Covers the 15 Core Domain Modules:
 * 1. Transaction Engine
 * 2. Identity
 * 3. Privacy
 * 4. Policy/Authorization
 * 5. Escrow/Payment Protection
 * 6. Evidence
 * 7. Verification
 * 8. Dispute Resolution
 * 9. Human Judge Network
 * 10. Accountability
 * 11. Reputation
 * 12. Trust Receipts
 * 13. AI Agent Infrastructure
 * 14. Notification/Event System
 * 15. Developer SDK/API
 */

import type { TransactionState } from './state-machine.js';

// =============================================================================
// MODULE 1: TRANSACTION ENGINE
// =============================================================================

export interface NaturalLanguageIntent {
  rawPrompt: string;
  sourceChannel: 'web' | 'api' | 'agent' | 'terminal';
  extractedAt: string; // ISO 8601
  detectedLanguage?: string;
  suggestedTerms?: Record<string, unknown>;
}

export interface Milestone {
  id: string;
  index: number;
  title: string;
  description: string;
  payoutAmount: string; // BigNumber in wei or base units
  deadline: string; // ISO 8601
  verificationRequired: boolean;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DISPUTED';
}

export interface CustomTransaction {
  id: string;
  chainTransactionId?: string; // Onchain transaction ID (bytes32 hex)
  creatorId: string;
  counterpartyId: string;
  intent?: NaturalLanguageIntent;
  state: TransactionState;
  terms: {
    title: string;
    description: string;
    deliverables: string[];
    deadlines: {
      agreementDeadline: string;
      fundingDeadline: string;
      fulfillmentDeadline: string;
      disputeWindowSeconds: number;
    };
    milestones: Milestone[];
  };
  identityRequirements: IdentityRequirement;
  privacyPreferences: PrivacyPreference;
  paymentProtection: EscrowConfiguration;
  verificationRequirements: VerificationRequirement;
  disputeRules: DisputeRules;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// MODULE 2: IDENTITY
// =============================================================================

export const ParticipantType = {
  HUMAN: 'HUMAN',
  BUSINESS: 'BUSINESS',
  ORGANIZATION: 'ORGANIZATION',
  AI_AGENT: 'AI_AGENT',
} as const;
export type ParticipantType = (typeof ParticipantType)[keyof typeof ParticipantType];

export interface ParticipantIdentity {
  id: string; // Internal address or UUID
  address: string; // EVM address
  type: ParticipantType;
  did?: string; // Decentralized Identifier (e.g. did:pkh:eip155:...)
  ensName?: string;
  verifiedCredentials: string[]; // Merkle roots or verifiable credential IDs
  erc8004AgentId?: string; // ERC-8004 compatible identity token ID if AI agent
}

export interface IdentityRequirement {
  allowedParticipantTypes: ParticipantType[];
  minimumReputationScore?: number;
  requiresKycOrCredentialVerification: boolean;
  acceptedCredentialIssuers?: string[];
}

// =============================================================================
// MODULE 3: PRIVACY
// =============================================================================

export const PrivacyLevel = {
  PUBLIC: 'PUBLIC',
  PSEUDONYMOUS: 'PSEUDONYMOUS',
  SELECTIVE_DISCLOSURE: 'SELECTIVE_DISCLOSURE',
  CONFIDENTIAL_OFFCHAIN: 'CONFIDENTIAL_OFFCHAIN',
} as const;
export type PrivacyLevel = (typeof PrivacyLevel)[keyof typeof PrivacyLevel];

export interface PrivacyPreference {
  level: PrivacyLevel;
  encryptedFields: string[]; // Field names that must be encrypted offchain
  zkProofCommitments?: {
    commitmentHash: string; // bytes32 commitment onchain
    circuitIdentifier: string;
  };
  discloseToRoles: {
    counterparty: boolean;
    assignedJudges: boolean;
    verifier: boolean;
    auditor: boolean;
  };
}

// =============================================================================
// MODULE 4: POLICY & AUTHORIZATION
// =============================================================================

export interface PolicyRule {
  id: string;
  ruleType: 'MAX_SPEND_PER_TX' | 'MAX_SPEND_DAILY' | 'RESTRICTED_RECIPIENTS' | 'MULTISIG_APPROVAL';
  parameters: Record<string, unknown>;
  enforcedBy: 'CLIENT' | 'API' | 'SMART_CONTRACT';
}

export interface AuthorizationPolicy {
  policyId: string;
  ownerAddress: string;
  authorizedSigners: string[];
  requiredSignatures: number;
  rules: PolicyRule[];
  delegatedAgentPermissions?: {
    agentAddress: string;
    maxAllowanceWei: string;
    expiryTimestamp: number;
    allowedContractCalls: string[];
  };
}

// =============================================================================
// MODULE 5: ESCROW / PAYMENT PROTECTION
// =============================================================================

export const PaymentTokenStandard = {
  NATIVE: 'NATIVE', // e.g. MON on Monad
  ERC20: 'ERC20',
  X402: 'X402', // Machine-to-machine payment protocol integration
} as const;
export type PaymentTokenStandard = (typeof PaymentTokenStandard)[keyof typeof PaymentTokenStandard];

export interface EscrowConfiguration {
  tokenStandard: PaymentTokenStandard;
  tokenAddress?: string; // Zero address for native currency
  totalAmount: string; // Base units (wei)
  depositedAmount: string;
  timelockReleaseTimestamp?: number;
  escrowContractAddress: string;
  autoReleaseAfterVerification: boolean;
}

// =============================================================================
// MODULE 6: EVIDENCE
// =============================================================================

export const EvidenceType = {
  TEXT_DOCUMENT: 'TEXT_DOCUMENT',
  CODE_COMMIT: 'CODE_COMMIT',
  CRYPTOGRAPHIC_SIGNATURE: 'CRYPTOGRAPHIC_SIGNATURE',
  ONCHAIN_EVENT: 'ONCHAIN_EVENT',
  FILE_ATTACHMENT: 'FILE_ATTACHMENT',
  API_ORACLE_RESPONSE: 'API_ORACLE_RESPONSE',
  PHYSICAL_INSPECTION: 'PHYSICAL_INSPECTION',
  BILL_OF_LADING: 'BILL_OF_LADING',
} as const;
export type EvidenceType = (typeof EvidenceType)[keyof typeof EvidenceType];

export const EvidenceVerificationStatus = {
  SELF_REPORTED: 'SELF_REPORTED',
  ATTESTED: 'ATTESTED',
  AI_ANALYZED: 'AI_ANALYZED',
  VERIFIED: 'VERIFIED',
  DISPUTED: 'DISPUTED',
  REVOKED: 'REVOKED',
} as const;
export type EvidenceVerificationStatus = (typeof EvidenceVerificationStatus)[keyof typeof EvidenceVerificationStatus];

/**
 * Structured Evidence Record
 * INVARIANTS:
 * 1. AI_ANALYZED != VERIFIED
 * 2. contentHash is the identity of the exact evidence bytes, independent of storageReference
 * 3. Evidence anchors cannot alter escrow economics or terms
 */
export interface EvidenceRecord {
  evidenceId: string;
  transactionId: string;
  submitter: string;
  evidenceType: EvidenceType;
  title: string;
  contentHash: string; // Cryptographic hash (sha256/keccak256) of raw evidence bytes
  metadataHash: string; // Cryptographic hash of canonicalized metadata
  storageReference: string; // Storage pointer / URI (retrieval location only; NOT evidence identity)
  isEncrypted: boolean;
  encryptionPublicKey?: string;
  createdAt: string; // ISO 8601
  verificationStatus: EvidenceVerificationStatus;
  verificationMethod: string;
  anchorBlockNumber?: number;
  anchorTxHash?: string;
}

// =============================================================================
// MODULE 7: VERIFICATION
// =============================================================================

export const VerificationOutcome = {
  NONE: 'NONE',
  PASS: 'PASS',
  FAIL: 'FAIL',
  INCONCLUSIVE: 'INCONCLUSIVE',
} as const;
export type VerificationOutcome = (typeof VerificationOutcome)[keyof typeof VerificationOutcome];

export const VerificationMode = {
  MANUAL_COUNTERPARTY: 'MANUAL_COUNTERPARTY',
  AUTOMATED_ORACLE: 'AUTOMATED_ORACLE',
  INDEPENDENT_VERIFIER: 'INDEPENDENT_VERIFIER',
  MULTI_VERIFIER_CONSENSUS: 'MULTI_VERIFIER_CONSENSUS',
} as const;
export type VerificationMode = (typeof VerificationMode)[keyof typeof VerificationMode];

export interface VerificationRequirement {
  mode: VerificationMode;
  assignedVerifierAddress?: string;
  verifierPoolStakeRequirement?: string;
  verificationDeadlineSeconds: number;
  criteriaDescription: string;
}

export interface VerificationResult {
  id: string;
  transactionId: string;
  verifierId: string;
  verifiedAt: string;
  outcome: VerificationOutcome;
  passed: boolean;
  reportHash: string;
  notes: string;
  signature?: string;
}

// =============================================================================
// MODULE 8: DISPUTE RESOLUTION
// =============================================================================

export const DisputeReason = {
  NON_DELIVERY: 'NON_DELIVERY',
  DEFECTIVE_DELIVERABLE: 'DEFECTIVE_DELIVERABLE',
  BREACH_OF_TERMS: 'BREACH_OF_TERMS',
  UNAUTHORIZED_ACTION: 'UNAUTHORIZED_ACTION',
  PAYMENT_FAILURE: 'PAYMENT_FAILURE',
} as const;
export type DisputeReason = (typeof DisputeReason)[keyof typeof DisputeReason];

export const DisputeStatus = {
  SUBMITTED: 'SUBMITTED',
  AI_ORGANIZING: 'AI_ORGANIZING',
  IN_REVIEW: 'IN_REVIEW',
  VOTING: 'VOTING',
  APPEAL_WINDOW: 'APPEAL_WINDOW',
  RESOLVED: 'RESOLVED',
} as const;
export type DisputeStatus = (typeof DisputeStatus)[keyof typeof DisputeStatus];

export const DisputeConsensusState = {
  OPEN: 'OPEN',
  JUDGES_ASSIGNED: 'JUDGES_ASSIGNED',
  CONFLICTS_CLEARED: 'CONFLICTS_CLEARED',
  AWAITING_BALLOTS: 'AWAITING_BALLOTS',
  QUORUM_REACHED: 'QUORUM_REACHED',
  CONSENSUS_REACHED: 'CONSENSUS_REACHED',
  POLARIZED: 'POLARIZED',
  REQUIRES_SENIOR_REVIEW: 'REQUIRES_SENIOR_REVIEW',
  READY_FOR_SETTLEMENT: 'READY_FOR_SETTLEMENT',
  SETTLEMENT_DISPATCHED: 'SETTLEMENT_DISPATCHED',
  SETTLED: 'SETTLED',
} as const;
export type DisputeConsensusState = (typeof DisputeConsensusState)[keyof typeof DisputeConsensusState];

export interface DisputeRules {
  adjudicationPeriodSeconds: number;
  appealWindowSeconds: number;
  requiredJudgeQuorum: number;
  disputeDepositAmountWei: string;
}

export interface AIDossier {
  label: 'AI_ANALYZED — HUMAN REVIEW REQUIRED';
  chronology: { timestamp: string; event: string; sourceRef?: string }[];
  evidenceReferences: { title: string; hash: string; uri?: string; submitter: string }[];
  agreementTerms: { termsHash: string; summary: string; deadline: number; totalAmount: string };
  claimedFacts: { claimer: string; claim: string; evidenceRef?: string }[];
  detectedInconsistencies: string[];
  unresolvedQuestions: string[];
  generatedAt: string;
}

export interface ConflictAttestation {
  transactionId: string;
  judgeAddress: string;
  declaration: string;
  timestamp: number;
  signature: string;
}

export interface JudgeBallot {
  transactionId: string;
  judgeAddress: string;
  buyerShareBps: number; // 0 to 10000
  rationale: string;
  submittedAt: string;
  signature: string;
}

export interface ConsensusResult {
  transactionId: string;
  method: '3-Judge Median Consensus';
  participatingJudges: string[];
  votes: { judgeAddress: string; buyerShareBps: number; rationale: string }[];
  sortedBps: number[];
  consensusBuyerShareBps: number;
  maxVote: number;
  minVote: number;
  spreadBps: number;
  isPolarized: boolean;
  state: DisputeConsensusState;
  calculatedAt: string;
}

export interface AdjudicationRecord {
  adjudicationId: string;
  transactionId: string;
  docketId: string;
  consensusBuyerShareBps: number;
  consensusMethod: '3-Judge Median Consensus';
  participatingJudges: string[];
  ballotHashes: string[];
  conflictAttestationHashes: string[];
  aiDossierHash: string;
  status: DisputeConsensusState;
  adjudicationCid?: string;
  createdAt: string;
}

export interface SettlementDispatch {
  transactionId: string;
  consensusBuyerShareBps: number;
  adjudicationRecordHash: string;
  dispatchedBy: string;
  dispatchedAt: string;
  txHash?: string;
  isDispatched: boolean;
}

export interface JudgeAssignment {
  transactionId: string;
  assignedJudgeAddresses: string[];
  assignedAt: string;
  assignmentHash: string;
}

export interface DisputeDocket {
  id: string;
  transactionId: string;
  transactionState: TransactionState;
  terms: {
    termsHash: string;
    totalAmountWei: string;
    deadline: number;
    description?: string;
  };
  buyer: string;
  seller: string;
  verifier?: string;
  anchoredEvidence: {
    contentHash: string;
    metadataHash: string;
    storageUriHash?: string;
    isEncrypted?: boolean;
  }[];
  verificationOutcome: VerificationOutcome;
  disputeReason: DisputeReason;
  disputeClaims: string;
  aiDossier?: AIDossier;
  assignedJudges: string[];
  conflictAttestations: Record<string, ConflictAttestation>;
  ballots: Record<string, JudgeBallot>;
  consensusResult?: ConsensusResult;
  adjudicationStatus: DisputeConsensusState;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// MODULE 9: HUMAN JUDGE NETWORK
// =============================================================================

export const JudgeTier = {
  APPRENTICE: 'APPRENTICE',
  SENIOR: 'SENIOR',
  SPECIALIST_CODE: 'SPECIALIST_CODE',
  SPECIALIST_FINANCE: 'SPECIALIST_FINANCE',
  APPELLATE: 'APPELLATE',
} as const;
export type JudgeTier = (typeof JudgeTier)[keyof typeof JudgeTier];

export interface JudgeProfile {
  address: string;
  domains: string[];
  casesParticipated: number;
  casesCompleted: number;
  participationTimestamps: string[];
  conflictAttestationsCount: number;
  invalidBallotEvents: number;
  averageResponseTimeSeconds: number;
  rationalePresenceRate: number;
  isActive: boolean;
}

// Retained for backward-compatibility with earlier prototype tests
export type JudgeVote = JudgeBallot;

// =============================================================================
// MODULE 10: ACCOUNTABILITY
// =============================================================================

export interface AccountabilityPenalty {
  targetAddress: string;
  reason: 'PROVEN_BAD_FAITH' | 'MALICIOUS_DISPUTE' | 'PERJURY' | 'CONTRACT_BREACH';
  slashedStakeWei?: string;
  reputationDeduction: number;
  cooldownPeriodSeconds: number;
  enforcedOnchainTx?: string;
}

// =============================================================================
// MODULE 11: REPUTATION
// =============================================================================

export interface ReputationProfile {
  address: string;
  overallScore: number; // Scale: 0 to 1000
  categoryScores: {
    fulfillmentRate: number;
    promptPaymentRate: number;
    disputeRatio: number;
    verifierScore: number;
  };
  totalTransactionsCompleted: number;
  totalVolumeSettledUSD: string;
  lastUpdated: string;
}

export interface ReputationEvent {
  id: string;
  participantAddress: string;
  transactionId: string;
  delta: number;
  reason: string;
  blockNumber: number;
}

// =============================================================================
// MODULE 12: TRUST RECEIPTS
// =============================================================================

/**
 * Soulbound Trust Receipt
 * Invariants:
 * 1. Non-transferable accountability artifact
 * 2. Exactly one receipt per settled or refunded transaction
 * 3. Cannot hold, transfer, or modify funds
 */
export interface TrustReceipt {
  receiptId: string;
  transactionId: string;
  partyA: string;
  partyB: string;
  settledAmount: string;
  tokenAddress: string;
  outcome: TransactionState;
  termsSummaryHash: string;
  evidenceRoot: string;
  issuedAt: string;
}

// =============================================================================
// MODULE 13: AI AGENT INFRASTRUCTURE
// =============================================================================

export interface AIAgentMetadata {
  agentAddress: string;
  ownerAddress: string;
  name: string;
  version: string;
  erc8004Identifier?: string; // Standardized agent registration reference
  capabilities: string[];
  maxSpendingLimitPerTxWei: string;
  autoSignEnabled: boolean;
  fallbackHumanReviewer?: string;
}

// =============================================================================
// MODULE 14: NOTIFICATION / EVENT SYSTEM
// =============================================================================

export type EventTopic =
  | 'TRANSACTION_CREATED'
  | 'TRANSACTION_AGREED'
  | 'ESCROW_FUNDED'
  | 'EVIDENCE_SUBMITTED'
  | 'VERIFICATION_REQUESTED'
  | 'VERIFICATION_PASSED'
  | 'DISPUTE_OPENED'
  | 'JUDGE_ASSIGNED'
  | 'VERDICT_RENDERED'
  | 'SETTLEMENT_EXECUTED'
  | 'REPUTATION_UPDATED';

export interface TrustMeshEvent<T = unknown> {
  id: string;
  topic: EventTopic;
  transactionId: string;
  actorAddress: string;
  payload: T;
  timestamp: string;
  blockNumber?: number;
}

// =============================================================================
// MODULE 15: DEVELOPER SDK / API
// =============================================================================

export interface TrustMeshClientConfig {
  rpcUrl: string;
  chainId: number;
  escrowContractAddress: string;
  disputeContractAddress?: string;
  receiptRegistryAddress?: string;
  apiBaseUrl?: string;
  apiKey?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: string;
}
