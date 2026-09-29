/**
 * TrustMesh Protocol System Constants
 */

export const PROTOCOL_CONSTANTS = {
  // Protocol Version
  VERSION: '0.1.0-alpha',

  // Timeouts & Windows (in seconds)
  DEFAULT_AGREEMENT_EXPIRY_SECONDS: 7 * 24 * 3600, // 7 days
  DEFAULT_FUNDING_EXPIRY_SECONDS: 3 * 24 * 3600, // 3 days
  DEFAULT_DISPUTE_WINDOW_SECONDS: 5 * 24 * 3600, // 5 days
  DEFAULT_ADJUDICATION_WINDOW_SECONDS: 7 * 24 * 3600, // 7 days
  DEFAULT_APPEAL_WINDOW_SECONDS: 2 * 24 * 3600, // 48 hours

  // Dispute & Adjudication Parameters
  MINIMUM_JUDGE_QUORUM: 3,
  APPELLATE_JUDGE_QUORUM: 5,
  MINIMUM_JUDGE_STAKE_WEI: '1000000000000000000', // 1 MON
  DISPUTE_BOND_PERCENTAGE: 10, // 10% of transaction value required as dispute deposit

  // Reputation Scoring
  MAX_REPUTATION_SCORE: 1000,
  MIN_REPUTATION_SCORE: 0,
  INITIAL_REPUTATION_SCORE: 100,

  // Architecture Guardrails (Principles 4, 6 & 7)
  MAX_ONCHAIN_EVIDENCE_BYTES: 256, // Only hashes & metadata allowed onchain
  AI_MAX_DISPUTE_PENALTY_AUTONOMOUS_WEI: '0', // Autonomous AI penalties strictly forbidden ($0)
} as const;
