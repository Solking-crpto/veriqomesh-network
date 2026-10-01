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
    // Re-roll with additional entropy
    return generateFreshTransactionId(buyerAddress, invitationCode + '_REROLL');
  }

  return txId;
}

export {
  serializeCanonicalAgreement,
  computeCanonicalAgreementHash,
  computeCanonicalTermsHash,
  type CanonicalAgreementTerms,
  type StructuredAgreementParameters,
  buildMutationAuthMessage,
  verifyMutationSignature,
  type VerifyMutationSignatureParams,
  type VerifyMutationSignatureResult,
  CANONICAL_TESTNET_TX_ID,
  TARGET_BUYER_ADDRESS,
  TARGET_SELLER_ADDRESS,
  isBenchmarkRequest,
  isAwaitingReceiverAction,
  calculateActionableRequestsCount,
  getRequestsNavBadge,
  isWalletCompatibleWithRole,
  type RoleCompatibility,
  type RoleCompatibilityParams,
} from '@trustmesh/sdk';


