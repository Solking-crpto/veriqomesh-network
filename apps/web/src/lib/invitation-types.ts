/**
 * Persistent Invitation Data Types
 * Governs the off-chain invitation & proposal lifecycle in Upstash Redis.
 * Strictly decoupled from onchain transaction state authority.
 */

export interface StructuredAgreementParameters {
  title: string;
  deliverable: string;
  amountMon: string;
  asset: string;
  deadlineDays: number;
  receiverWallet: string;
  verifierAddress: string;
  evidenceRequirements: string[];
  location?: string;
  additionalConditions?: string;
}

export interface CanonicalAgreementTerms {
  version: '1.0';
  naturalLanguageNeed: string;
  structuredParameters: StructuredAgreementParameters;
}

export interface ProposalData {
  title: string;
  description: string;
  amount: string; // in MON
  asset: string; // 'MON'
  deadlineDays: number;
  termsText: string;
  termsHash: string;
  evidenceRequirements: string[];
  canonicalAgreement?: CanonicalAgreementTerms;
  location?: string;
  additionalConditions?: string;
}

export interface ProposalRoles {
  buyer: string;
  seller: string;
  verifier: string;
}

export type InvitationStatus =
  | 'PROPOSED'
  | 'AGREED'
  | 'COUNTERED'
  | 'DECLINED'
  | 'EXPIRED';

export interface PersistentInvitation {
  invitationCode: string; // e.g. "VM-7K4Q-92XP" or "VM-7K4Q-92XP-v2"
  version: number;
  status: InvitationStatus;
  createdAt: number;
  updatedAt: number;

  initiatorWallet: string;
  intendedReceiverWallet: string;

  transactionId: string; // 32-byte hex string (0x...)
  onchainTxHash?: string; // EVM broadcast hash if already submitted to Monad
  parentInvitationCode?: string;
  counterInvitationCode?: string;

  proposal: ProposalData;
  roles: ProposalRoles;
}

export interface CreateInvitationRequest {
  initiatorWallet: string;
  intendedReceiverWallet: string;
  proposal: {
    title: string;
    description: string;
    amount: string;
    asset?: string;
    deadlineDays: number;
    termsText: string;
    termsHash?: string;
    evidenceRequirements?: string[];
    canonicalAgreement?: CanonicalAgreementTerms;
    location?: string;
    additionalConditions?: string;
  };
  roles?: {
    buyer?: string;
    seller?: string;
    verifier?: string;
  };
  transactionId?: string;
  onchainTxHash?: string;
  parentInvitationCode?: string;
}

export interface MutationAuthorization {
  signature: string; // 0x... hex signature from personal_sign
  nonce: string; // unique random alphanumeric string
  expiresAt: number; // epoch ms timestamp
  action: string; // e.g. "MUTATION:STATUS_AGREED", "MUTATION:STATUS_DECLINED"
}

export interface UpdateInvitationRequest {
  status?: InvitationStatus;
  onchainTxHash?: string;
  counterInvitationCode?: string;
  callerWallet?: string; // Informational only; server strictly recovers signer from auth.signature
  auth: MutationAuthorization;
}
