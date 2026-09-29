/**
 * TrustMesh Transaction State Machine
 * Deterministic 14-state model governing the transaction lifecycle.
 *
 * CRITICAL: The numeric indices and transitions here must strictly match
 * the Solidity contract definitions in ITrustMeshTypes.sol.
 */

export const TransactionState = {
  DRAFT: 'DRAFT',
  PROPOSED: 'PROPOSED',
  NEGOTIATING: 'NEGOTIATING',
  AGREED: 'AGREED',
  FUNDED: 'FUNDED',
  IN_PROGRESS: 'IN_PROGRESS',
  EVIDENCE_SUBMITTED: 'EVIDENCE_SUBMITTED',
  VERIFICATION: 'VERIFICATION',
  DISPUTED: 'DISPUTED',
  JUDGING: 'JUDGING',
  RESOLVED: 'RESOLVED',
  SETTLED: 'SETTLED',
  REFUNDED: 'REFUNDED',
  CANCELLED: 'CANCELLED',
} as const;

export type TransactionState = (typeof TransactionState)[keyof typeof TransactionState];

/**
 * Numeric indices strictly matching Solidity `enum TransactionState` in ITrustMeshTypes.sol
 */
export const TransactionStateIndex: Record<TransactionState, number> = {
  [TransactionState.DRAFT]: 0,
  [TransactionState.PROPOSED]: 1,
  [TransactionState.NEGOTIATING]: 2,
  [TransactionState.AGREED]: 3,
  [TransactionState.FUNDED]: 4,
  [TransactionState.IN_PROGRESS]: 5,
  [TransactionState.EVIDENCE_SUBMITTED]: 6,
  [TransactionState.VERIFICATION]: 7,
  [TransactionState.DISPUTED]: 8,
  [TransactionState.JUDGING]: 9,
  [TransactionState.RESOLVED]: 10,
  [TransactionState.SETTLED]: 11,
  [TransactionState.REFUNDED]: 12,
  [TransactionState.CANCELLED]: 13,
};

export const IndexToTransactionState: Record<number, TransactionState> = {
  0: TransactionState.DRAFT,
  1: TransactionState.PROPOSED,
  2: TransactionState.NEGOTIATING,
  3: TransactionState.AGREED,
  4: TransactionState.FUNDED,
  5: TransactionState.IN_PROGRESS,
  6: TransactionState.EVIDENCE_SUBMITTED,
  7: TransactionState.VERIFICATION,
  8: TransactionState.DISPUTED,
  9: TransactionState.JUDGING,
  10: TransactionState.RESOLVED,
  11: TransactionState.SETTLED,
  12: TransactionState.REFUNDED,
  13: TransactionState.CANCELLED,
};

/**
 * Roles permitted to initiate transitions
 */
export const ActorRole = {
  BUYER: 'BUYER',
  SELLER: 'SELLER',
  VERIFIER: 'VERIFIER',
  DISPUTE_RESOLVER: 'DISPUTE_RESOLVER',
  SYSTEM: 'SYSTEM',
} as const;
export type ActorRole = (typeof ActorRole)[keyof typeof ActorRole];

/**
 * Explicit state transition table defining permissible next states.
 * Reconciled invariant: Once FUNDED, cancellation triggers REFUNDED to protect escrow funds.
 */
export const VALID_TRANSITIONS: Readonly<Record<TransactionState, readonly TransactionState[]>> = {
  [TransactionState.DRAFT]: [
    TransactionState.PROPOSED,
    TransactionState.CANCELLED,
  ],
  [TransactionState.PROPOSED]: [
    TransactionState.NEGOTIATING,
    TransactionState.AGREED,
    TransactionState.CANCELLED,
  ],
  [TransactionState.NEGOTIATING]: [
    TransactionState.PROPOSED,
    TransactionState.AGREED,
    TransactionState.CANCELLED,
  ],
  [TransactionState.AGREED]: [
    TransactionState.FUNDED,
    TransactionState.CANCELLED,
  ],
  [TransactionState.FUNDED]: [
    TransactionState.IN_PROGRESS,
    TransactionState.DISPUTED,
    TransactionState.REFUNDED,
  ],
  [TransactionState.IN_PROGRESS]: [
    TransactionState.EVIDENCE_SUBMITTED,
    TransactionState.DISPUTED,
  ],
  [TransactionState.EVIDENCE_SUBMITTED]: [
    TransactionState.VERIFICATION,
    TransactionState.DISPUTED,
  ],
  [TransactionState.VERIFICATION]: [
    TransactionState.SETTLED,
    TransactionState.EVIDENCE_SUBMITTED,
    TransactionState.DISPUTED,
  ],
  [TransactionState.DISPUTED]: [
    TransactionState.JUDGING,
  ],
  [TransactionState.JUDGING]: [
    TransactionState.RESOLVED,
  ],
  [TransactionState.RESOLVED]: [
    TransactionState.SETTLED,
    TransactionState.REFUNDED,
  ],
  [TransactionState.SETTLED]: [], // Terminal State
  [TransactionState.REFUNDED]: [], // Terminal State
  [TransactionState.CANCELLED]: [], // Terminal State
};

/**
 * Authorized actor roles for each specific state transition
 */
export const AUTHORIZED_ROLES: Readonly<Record<string, readonly ActorRole[]>> = {
  [`${TransactionState.DRAFT}->${TransactionState.PROPOSED}`]: [ActorRole.BUYER],
  [`${TransactionState.DRAFT}->${TransactionState.CANCELLED}`]: [ActorRole.BUYER],
  [`${TransactionState.PROPOSED}->${TransactionState.NEGOTIATING}`]: [ActorRole.BUYER, ActorRole.SELLER],
  [`${TransactionState.PROPOSED}->${TransactionState.AGREED}`]: [ActorRole.SELLER],
  [`${TransactionState.PROPOSED}->${TransactionState.CANCELLED}`]: [ActorRole.BUYER],
  [`${TransactionState.NEGOTIATING}->${TransactionState.PROPOSED}`]: [ActorRole.BUYER, ActorRole.SELLER],
  [`${TransactionState.NEGOTIATING}->${TransactionState.AGREED}`]: [ActorRole.BUYER, ActorRole.SELLER],
  [`${TransactionState.NEGOTIATING}->${TransactionState.CANCELLED}`]: [ActorRole.BUYER],
  [`${TransactionState.AGREED}->${TransactionState.FUNDED}`]: [ActorRole.BUYER],
  [`${TransactionState.AGREED}->${TransactionState.CANCELLED}`]: [ActorRole.BUYER, ActorRole.SELLER],
  [`${TransactionState.FUNDED}->${TransactionState.IN_PROGRESS}`]: [ActorRole.SELLER],
  [`${TransactionState.FUNDED}->${TransactionState.DISPUTED}`]: [ActorRole.BUYER, ActorRole.SELLER],
  [`${TransactionState.FUNDED}->${TransactionState.REFUNDED}`]: [ActorRole.BUYER, ActorRole.SYSTEM],
  [`${TransactionState.IN_PROGRESS}->${TransactionState.EVIDENCE_SUBMITTED}`]: [ActorRole.SELLER],
  [`${TransactionState.IN_PROGRESS}->${TransactionState.DISPUTED}`]: [ActorRole.BUYER, ActorRole.SELLER],
  [`${TransactionState.EVIDENCE_SUBMITTED}->${TransactionState.VERIFICATION}`]: [ActorRole.SELLER, ActorRole.BUYER],
  [`${TransactionState.EVIDENCE_SUBMITTED}->${TransactionState.DISPUTED}`]: [ActorRole.BUYER, ActorRole.SELLER],
  [`${TransactionState.VERIFICATION}->${TransactionState.SETTLED}`]: [ActorRole.BUYER, ActorRole.VERIFIER],
  [`${TransactionState.VERIFICATION}->${TransactionState.EVIDENCE_SUBMITTED}`]: [ActorRole.BUYER, ActorRole.VERIFIER],
  [`${TransactionState.VERIFICATION}->${TransactionState.DISPUTED}`]: [ActorRole.BUYER, ActorRole.SELLER],
  [`${TransactionState.DISPUTED}->${TransactionState.JUDGING}`]: [ActorRole.DISPUTE_RESOLVER, ActorRole.SYSTEM],
  [`${TransactionState.JUDGING}->${TransactionState.RESOLVED}`]: [ActorRole.DISPUTE_RESOLVER],
  [`${TransactionState.RESOLVED}->${TransactionState.SETTLED}`]: [ActorRole.BUYER, ActorRole.SELLER, ActorRole.SYSTEM, ActorRole.DISPUTE_RESOLVER],
  [`${TransactionState.RESOLVED}->${TransactionState.REFUNDED}`]: [ActorRole.BUYER, ActorRole.SELLER, ActorRole.SYSTEM, ActorRole.DISPUTE_RESOLVER],
};

/**
 * Terminal states where no further transitions are allowed.
 */
export const TERMINAL_STATES: ReadonlySet<TransactionState> = new Set([
  TransactionState.SETTLED,
  TransactionState.REFUNDED,
  TransactionState.CANCELLED,
]);

/**
 * Check if a transition between two states is valid according to deterministic protocol rules.
 */
export function canTransition(from: TransactionState, to: TransactionState): boolean {
  const allowed = VALID_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

/**
 * Check if a specific actor role is authorized to perform the transition.
 */
export function isAuthorizedTransition(from: TransactionState, to: TransactionState, role: ActorRole): boolean {
  if (!canTransition(from, to)) return false;
  const roles = AUTHORIZED_ROLES[`${from}->${to}`];
  return roles ? roles.includes(role) : false;
}

/**
 * Enforce deterministic state transition; throws error if invalid.
 */
export function assertValidTransition(from: TransactionState, to: TransactionState, role?: ActorRole): void {
  if (!canTransition(from, to)) {
    throw new Error(
      `Invalid state transition: Cannot transition from '${from}' to '${to}'. Allowed target states: [${(VALID_TRANSITIONS[from] || []).join(', ')}]`,
    );
  }
  if (role && !isAuthorizedTransition(from, to, role)) {
    throw new Error(
      `Unauthorized state transition: Role '${role}' cannot execute transition from '${from}' to '${to}'.`,
    );
  }
}

/**
 * Retrieve all permissible next states from the given state.
 */
export function getValidNextStates(from: TransactionState): readonly TransactionState[] {
  return VALID_TRANSITIONS[from] || [];
}

/**
 * Check whether a state is terminal.
 */
export function isTerminalState(state: TransactionState): boolean {
  return TERMINAL_STATES.has(state);
}
