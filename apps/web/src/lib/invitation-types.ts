/**
 * Persistent Invitation Data Types
 * Governs the off-chain invitation & proposal lifecycle in Upstash Redis.
 * Strictly decoupled from onchain transaction state authority.
 */

export interface ProposalData {
  title: string;
  description: string;
  amount: string; // in MON
  asset: string; // 'MON'
  deadlineDays: number;
  termsText: string;
  termsHash: string;
  evidenceRequirements: string[];
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

export interface UpdateInvitationRequest {
  status?: InvitationStatus;
  onchainTxHash?: string;
  transactionId?: string;
  counterInvitationCode?: string;
  callerWallet?: string;
}
