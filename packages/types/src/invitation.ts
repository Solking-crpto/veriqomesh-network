export type InvitationStatus = 'PROPOSED' | 'AGREED' | 'COUNTERED' | 'DECLINED';

export interface ProposalData {
  title: string;
  description: string;
  amount: string; // formatted MON (e.g. "0.001")
  asset: string; // e.g. "MON"
  deadlineDays: number;
  termsText: string;
  termsHash: string; // keccak256
  evidenceRequirements?: string[];
}

export interface ProposalRoles {
  buyer: string; // Ethereum address
  seller: string; // Ethereum address
  verifier: string; // Ethereum address
}

export interface PersistentInvitation {
  invitationCode: string; // VM-XXXX-XXXX or VM-XXXX-XXXX-v2
  version: number; // 1, 2, ...
  status: InvitationStatus;
  createdAt: number; // epoch ms
  updatedAt: number; // epoch ms
  initiatorWallet: string; // Ethereum address
  intendedReceiverWallet: string; // Ethereum address
  proposal: ProposalData;
  roles: ProposalRoles;
  transactionId: string; // bytes32
  onchainTxHash?: string; // EVM tx hash
  parentInvitationCode?: string; // For counter-offers: VM-XXXX-XXXX
  counterInvitationCode?: string; // If countered, points to child invitation code
}

export interface CreateInvitationRequest {
  initiatorWallet: string;
  intendedReceiverWallet: string;
  proposal: {
    title: string;
    description?: string;
    amount: string;
    asset?: string;
    deadlineDays: number;
    termsText?: string;
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
