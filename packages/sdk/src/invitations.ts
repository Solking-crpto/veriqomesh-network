import crypto from 'crypto';
import { ethers } from 'ethers';

// Alphabet excluding easily confused characters: 0, O, 1, I, L
const CANONICAL_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export const CANONICAL_FLOW_A_TX_ID =
  '0x961c70865bf6097eb16d1b3a19d90f950b2cdd789eda5554c93baba1de0954e1';
export const CANONICAL_FLOW_B_TX_ID =
  '0x2b57d6b0ef1ba16a60c4f801d90d27d23e598fd6b1381e0175077201dc6afcc4';

/**
 * Generates a human-friendly, high-entropy invitation code: VM-XXXX-XXXX
 * Uses cryptographic randomness (crypto.randomBytes). NEVER Math.random().
 */
export function generateCanonicalInvitationCode(): string {
  const bytes = crypto.randomBytes(8);
  let part1 = '';
  let part2 = '';

  for (let i = 0; i < 4; i++) {
    part1 += CANONICAL_ALPHABET[bytes[i] % CANONICAL_ALPHABET.length];
  }
  for (let i = 4; i < 8; i++) {
    part2 += CANONICAL_ALPHABET[bytes[i] % CANONICAL_ALPHABET.length];
  }

  return `VM-${part1}-${part2}`;
}

/**
 * Generates a versioned counter invitation code based on a parent code.
 * e.g. "VM-7K4Q-92XP" -> "VM-7K4Q-92XP-v2" or "VM-7K4Q-92XP-v2" -> "VM-7K4Q-92XP-v3"
 */
export function generateCounterInvitationCode(parentCode: string, nextVersion: number): string {
  const base = parentCode.split('-v')[0].toUpperCase();
  return `${base}-v${nextVersion}`;
}

/**
 * Generates a cryptographically secure, unique bytes32 transactionId for Monad smart contracts.
 * Guaranteed to NEVER collide with canonical Flow A (0x961c...54e1) or Flow B.
 */
export function generateFreshTransactionId(buyerAddress: string, invitationCode: string): string {
  const randomEntropy = crypto.randomBytes(32).toString('hex');
  const payload = `VERIQOMESH_ESCROW_TX_${buyerAddress.toLowerCase()}_${invitationCode}_${Date.now()}_${randomEntropy}`;
  const txId = ethers.keccak256(ethers.toUtf8Bytes(payload));

  // Hard safety check: Never generate or match canonical Flow A or B
  if (
    txId.toLowerCase() === CANONICAL_FLOW_A_TX_ID.toLowerCase() ||
    txId.toLowerCase() === CANONICAL_FLOW_B_TX_ID.toLowerCase()
  ) {
    return generateFreshTransactionId(buyerAddress, invitationCode + '_REROLL');
  }

  return txId;
}

/**
 * Computes canonical terms hash: keccak256(utf8(termsText))
 * Preserves the exact onchain format required by TrustMeshEscrow.sol
 */
export function computeCanonicalTermsHash(termsText: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(termsText || ''));
}

/**
 * Builds the canonical domain-separated authorization message for invitation mutations (PATCH).
 * Binds domain, invitationCode, mutationAction, nonce, and expiration.
 */
export function buildMutationAuthMessage(params: {
  invitationCode: string;
  action: string;
  nonce: string;
  expiresAt: number;
}): string {
  return [
    'VeriqoMesh Invitation Mutation Authorization',
    'Domain: veriqomesh.xyz',
    `Invitation Code: ${params.invitationCode.toUpperCase()}`,
    `Action: ${params.action}`,
    `Nonce: ${params.nonce}`,
    `Expires At: ${params.expiresAt}`,
  ].join('\n');
}

export interface VerifyMutationSignatureParams {
  invitationCode: string;
  action: string;
  signature: string;
  nonce: string;
  expiresAt: number;
  initiatorWallet: string;
  intendedReceiverWallet: string;
  currentTime?: number;
}

export interface VerifyMutationSignatureResult {
  isValid: boolean;
  recoveredAddress?: string;
  isInitiator?: boolean;
  isReceiver?: boolean;
  error?: string;
}

/**
 * Cryptographically verifies an invitation mutation signature (EIP-191).
 * Recovers the signer's address from the signature and verifies participation.
 */
export function verifyMutationSignature(
  params: VerifyMutationSignatureParams
): VerifyMutationSignatureResult {
  if (!params.signature || typeof params.signature !== 'string') {
    return { isValid: false, error: 'Missing or invalid signature' };
  }
  if (!params.nonce || typeof params.nonce !== 'string' || params.nonce.trim().length === 0) {
    return { isValid: false, error: 'Missing or empty nonce' };
  }
  if (!params.action || typeof params.action !== 'string') {
    return { isValid: false, error: 'Missing mutation action' };
  }
  if (typeof params.expiresAt !== 'number' || isNaN(params.expiresAt)) {
    return { isValid: false, error: 'Invalid expiresAt timestamp' };
  }

  const now = params.currentTime ?? Date.now();
  if (now > params.expiresAt) {
    return { isValid: false, error: 'Mutation authorization has expired' };
  }
  if (params.expiresAt > now + 15 * 60 * 1000) {
    return { isValid: false, error: 'Mutation authorization expiry exceeds maximum 15-minute window' };
  }

  const message = buildMutationAuthMessage({
    invitationCode: params.invitationCode,
    action: params.action,
    nonce: params.nonce,
    expiresAt: params.expiresAt,
  });

  let recovered: string;
  try {
    recovered = ethers.verifyMessage(message, params.signature);
  } catch {
    return { isValid: false, error: 'Malformed or invalid cryptographic signature' };
  }

  const recoveredNormalized = recovered.toLowerCase();
  const initiatorNormalized = params.initiatorWallet.toLowerCase();
  const receiverNormalized = params.intendedReceiverWallet.toLowerCase();

  const isInitiator = recoveredNormalized === initiatorNormalized;
  const isReceiver = recoveredNormalized === receiverNormalized;

  if (!isInitiator && !isReceiver) {
    return {
      isValid: false,
      recoveredAddress: recovered,
      error: 'Recovered signer is not a participating wallet in this invitation',
    };
  }

  return {
    isValid: true,
    recoveredAddress: ethers.getAddress(recovered),
    isInitiator,
    isReceiver,
  };
}
