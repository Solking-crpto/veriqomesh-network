import crypto from 'crypto';
import { ethers } from 'ethers';

// Alphabet excluding easily confused characters: 0, O, 1, I, L
const CANONICAL_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export const CANONICAL_FLOW_A_TX_ID =
  '0x961c70865bf6097eb16d1b3a19d90f950b2cdd789eda5554c93baba1de0954e1';
export const CANONICAL_FLOW_B_TX_ID =
  '0x2b57d6b0ef1ba16a60c4f801d90d27d23e598fd6b1381e0175077201dc6afcc4';
export const TARGET_BUYER_ADDRESS = '0xa4bCC57d40311D715ECe34940191820d4a81C50F';
export const TARGET_SELLER_ADDRESS = '0x0e73dBFf9047423b520FA9fc23a95645fC986Ee8';

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

export const CANONICAL_TESTNET_TX_ID =
  '0xbbd0176291d62b32c3e096d0314c0fab6bcfa9131c1b26a825b3ce994e645f5e';

/**
 * Checks if a request record is an immutable historical demo benchmark.
 * These records are immutable audit logs and must never be counted as actionable.
 */
export function isBenchmarkRequest(r: { id?: string; transactionId?: string }): boolean {
  const tx = (r.transactionId || '').toLowerCase();
  return (
    tx === CANONICAL_FLOW_A_TX_ID.toLowerCase() ||
    tx === CANONICAL_FLOW_B_TX_ID.toLowerCase() ||
    tx === CANONICAL_TESTNET_TX_ID.toLowerCase() ||
    r.id === 'VM-REQ-0001' ||
    r.id === 'VM-REQ-0002' ||
    r.id === 'VM-REQ-0003' ||
    r.id === 'VM-REQ-0004'
  );
}

/**
 * Checks if a request is in an actionable state awaiting receiver action.
 * A request is actionable if:
 * 1. It is NOT a benchmark/demo record.
 * 2. Its status is NOT AGREED, AGREEMENT_ACTIVE, COUNTERED, DECLINED, FUNDED, or SETTLED.
 * 3. If onchain state is known: onchain state must be PROPOSED (state 1).
 * 4. If onchain state is not known: status must be AWAITING_RECEIVER_ACCEPTANCE or PROPOSED.
 */
export function isAwaitingReceiverAction(
  r: {
    id?: string;
    transactionId?: string;
    status?: string;
    [key: string]: any;
  },
  onchainTxMap?: Record<string, { stateName: string }>
): boolean {
  if (isBenchmarkRequest(r)) return false;

  const normalizedStatus = (r.status || '').toUpperCase();
  if (
    normalizedStatus === 'COUNTERED' ||
    normalizedStatus === 'DECLINED' ||
    normalizedStatus === 'AGREED' ||
    normalizedStatus === 'AGREEMENT_ACTIVE' ||
    normalizedStatus === 'FUNDED' ||
    normalizedStatus === 'SETTLED'
  ) {
    return false;
  }

  const onchain = r.transactionId && onchainTxMap ? onchainTxMap[r.transactionId] : null;
  if (onchain) {
    return onchain.stateName === 'PROPOSED';
  }

  return (
    normalizedStatus === 'AWAITING_RECEIVER_ACCEPTANCE' ||
    normalizedStatus === 'PROPOSED'
  );
}

/**
 * Calculates the number of actionable requests for the connected wallet.
 * Strict invariants:
 * - When disconnected (isConnected === false or !connectedWallet): ALWAYS returns 0.
 * - Intended receiver/seller MUST match the connected wallet (case-insensitive).
 * - Must be awaiting receiver action (not agreed, not countered, not declined, not settled).
 * - Benchmarks/demo defaults NEVER increment the count.
 */
export function calculateActionableRequestsCount(params: {
  requests: Array<{
    id?: string;
    transactionId?: string;
    status?: string;
    receiverWallet?: string;
    [key: string]: any;
  }>;
  connectedWallet?: string | null;
  isConnected?: boolean;
  onchainTxMap?: Record<string, { stateName: string }>;
}): number {
  const { requests, connectedWallet, isConnected, onchainTxMap } = params;

  if (!isConnected || !connectedWallet) {
    return 0;
  }

  const normalizedWallet = connectedWallet.toLowerCase();

  return requests.filter((r) => {
    if (!isAwaitingReceiverAction(r, onchainTxMap)) {
      return false;
    }
    const receiver = (r.receiverWallet || '').toLowerCase();
    return receiver === normalizedWallet;
  }).length;
}

/**
 * Returns the badge number for the Requests navigation item.
 * Returns undefined when count is 0 to hide the badge according to navigation conventions,
 * or the positive count when actionable requests exist.
 */
export function getRequestsNavBadge(actionableCount: number): number | undefined {
  return actionableCount > 0 ? actionableCount : undefined;
}

export interface RoleCompatibility {
  isCompatible: boolean;
  status: 'DISCONNECTED' | 'WRONG_WALLET' | 'COMPATIBLE';
  connectedWallet: string | null;
  designatedWallet: string;
  role: 'INITIATOR' | 'RECEIVER';
  message: string;
}

export interface RoleCompatibilityParams {
  role: 'INITIATOR' | 'RECEIVER';
  connectedWallet?: string | null;
  isConnected?: boolean;
  designatedInitiator?: string;
  designatedReceiver?: string;
  designatedWallet?: string;
}

/**
 * Checks cryptographic role compatibility between connected browser wallet and designated participant.
 * Invariants:
 * - When disconnected: isCompatible=false, status='DISCONNECTED'
 * - When connected with matching designated wallet: isCompatible=true, status='COMPATIBLE'
 * - When connected with non-matching wallet (e.g. initiator on receiver view): isCompatible=false, status='WRONG_WALLET'
 */
export function isWalletCompatibleWithRole(
  paramsOrRole: 'INITIATOR' | 'RECEIVER' | RoleCompatibilityParams,
  connectedWalletArg?: string | null,
  designatedWalletArg?: string
): RoleCompatibility {
  let role: 'INITIATOR' | 'RECEIVER';
  let connectedWallet: string | null = null;
  let isConnected: boolean;
  let designatedWallet: string;

  if (typeof paramsOrRole === 'string') {
    role = paramsOrRole;
    connectedWallet = connectedWalletArg || null;
    isConnected = Boolean(connectedWalletArg);
    designatedWallet = designatedWalletArg || (role === 'RECEIVER' ? TARGET_SELLER_ADDRESS : TARGET_BUYER_ADDRESS);
  } else {
    role = paramsOrRole.role;
    connectedWallet = paramsOrRole.connectedWallet || null;
    isConnected = paramsOrRole.isConnected !== undefined ? paramsOrRole.isConnected : Boolean(paramsOrRole.connectedWallet);
    designatedWallet =
      paramsOrRole.designatedWallet ||
      (role === 'RECEIVER'
        ? paramsOrRole.designatedReceiver || TARGET_SELLER_ADDRESS
        : paramsOrRole.designatedInitiator || TARGET_BUYER_ADDRESS);
  }

  if (!isConnected || !connectedWallet) {
    return {
      isCompatible: false,
      status: 'DISCONNECTED',
      connectedWallet: null,
      designatedWallet,
      role,
      message: `${role === 'RECEIVER' ? 'Receiver' : 'Initiator'} wallet required. Connect wallet to continue.`,
    };
  }

  const normConnected = connectedWallet.toLowerCase();
  const normDesignated = designatedWallet.toLowerCase();

  if (normConnected === normDesignated) {
    return {
      isCompatible: true,
      status: 'COMPATIBLE',
      connectedWallet,
      designatedWallet,
      role,
      message: `Authenticated as designated ${role.toLowerCase()} node.`,
    };
  }

  return {
    isCompatible: false,
    status: 'WRONG_WALLET',
    connectedWallet,
    designatedWallet,
    role,
    message: `Connected wallet (${connectedWallet.slice(0, 6)}...${connectedWallet.slice(-4)}) is not the designated ${role.toLowerCase()} (${designatedWallet.slice(0, 6)}...${designatedWallet.slice(-4)}).`,
  };
}


