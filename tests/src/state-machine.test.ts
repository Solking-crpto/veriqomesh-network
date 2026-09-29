import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  TransactionState,
  TransactionStateIndex,
  IndexToTransactionState,
  ActorRole,
  canTransition,
  isAuthorizedTransition,
  assertValidTransition,
  isTerminalState,
  getValidNextStates,
} from '@trustmesh/types';

describe('Phase B — State Machine Reconciliation & Verification', () => {
  it('1. Numeric indices match Solidity enum 0-13 perfectly', () => {
    assert.equal(TransactionStateIndex[TransactionState.DRAFT], 0);
    assert.equal(TransactionStateIndex[TransactionState.PROPOSED], 1);
    assert.equal(TransactionStateIndex[TransactionState.NEGOTIATING], 2);
    assert.equal(TransactionStateIndex[TransactionState.AGREED], 3);
    assert.equal(TransactionStateIndex[TransactionState.FUNDED], 4);
    assert.equal(TransactionStateIndex[TransactionState.IN_PROGRESS], 5);
    assert.equal(TransactionStateIndex[TransactionState.EVIDENCE_SUBMITTED], 6);
    assert.equal(TransactionStateIndex[TransactionState.VERIFICATION], 7);
    assert.equal(TransactionStateIndex[TransactionState.DISPUTED], 8);
    assert.equal(TransactionStateIndex[TransactionState.JUDGING], 9);
    assert.equal(TransactionStateIndex[TransactionState.RESOLVED], 10);
    assert.equal(TransactionStateIndex[TransactionState.SETTLED], 11);
    assert.equal(TransactionStateIndex[TransactionState.REFUNDED], 12);
    assert.equal(TransactionStateIndex[TransactionState.CANCELLED], 13);

    for (let i = 0; i <= 13; i++) {
      const stateName = IndexToTransactionState[i];
      assert.ok(stateName, `Index ${i} must have valid name`);
      assert.equal(TransactionStateIndex[stateName], i);
    }
  });

  it('2. Valid happy-path transitions', () => {
    // DRAFT -> PROPOSED -> AGREED -> FUNDED -> IN_PROGRESS -> EVIDENCE_SUBMITTED -> VERIFICATION -> SETTLED
    assert.equal(canTransition(TransactionState.DRAFT, TransactionState.PROPOSED), true);
    assert.equal(canTransition(TransactionState.PROPOSED, TransactionState.AGREED), true);
    assert.equal(canTransition(TransactionState.AGREED, TransactionState.FUNDED), true);
    assert.equal(canTransition(TransactionState.FUNDED, TransactionState.IN_PROGRESS), true);
    assert.equal(canTransition(TransactionState.IN_PROGRESS, TransactionState.EVIDENCE_SUBMITTED), true);
    assert.equal(canTransition(TransactionState.EVIDENCE_SUBMITTED, TransactionState.VERIFICATION), true);
    assert.equal(canTransition(TransactionState.VERIFICATION, TransactionState.SETTLED), true);
  });

  it('3. Invalid forward skips are rejected', () => {
    assert.equal(canTransition(TransactionState.DRAFT, TransactionState.FUNDED), false);
    assert.equal(canTransition(TransactionState.DRAFT, TransactionState.SETTLED), false);
    assert.equal(canTransition(TransactionState.PROPOSED, TransactionState.IN_PROGRESS), false);
    assert.equal(canTransition(TransactionState.AGREED, TransactionState.SETTLED), false);
    assert.equal(canTransition(TransactionState.FUNDED, TransactionState.SETTLED), false);
    assert.equal(canTransition(TransactionState.IN_PROGRESS, TransactionState.SETTLED), false);
    assert.equal(canTransition(TransactionState.DISPUTED, TransactionState.SETTLED), false);
  });

  it('4. Invalid backward transitions are rejected', () => {
    assert.equal(canTransition(TransactionState.FUNDED, TransactionState.AGREED), false);
    assert.equal(canTransition(TransactionState.IN_PROGRESS, TransactionState.FUNDED), false);
    assert.equal(canTransition(TransactionState.SETTLED, TransactionState.VERIFICATION), false);
    assert.equal(canTransition(TransactionState.RESOLVED, TransactionState.JUDGING), false);
    assert.equal(canTransition(TransactionState.DISPUTED, TransactionState.IN_PROGRESS), false);
  });

  it('5. Unauthorized role transitions are rejected', () => {
    // Buyer cannot mark work as IN_PROGRESS (only Seller can)
    assert.equal(isAuthorizedTransition(TransactionState.FUNDED, TransactionState.IN_PROGRESS, ActorRole.BUYER), false);
    assert.equal(isAuthorizedTransition(TransactionState.FUNDED, TransactionState.IN_PROGRESS, ActorRole.SELLER), true);

    // Seller cannot FUND escrow (only Buyer can)
    assert.equal(isAuthorizedTransition(TransactionState.AGREED, TransactionState.FUNDED, ActorRole.SELLER), false);
    assert.equal(isAuthorizedTransition(TransactionState.AGREED, TransactionState.FUNDED, ActorRole.BUYER), true);

    // Arbitrary role cannot resolve dispute
    assert.equal(isAuthorizedTransition(TransactionState.JUDGING, TransactionState.RESOLVED, ActorRole.SELLER), false);
    assert.equal(isAuthorizedTransition(TransactionState.JUDGING, TransactionState.RESOLVED, ActorRole.DISPUTE_RESOLVER), true);

    assert.throws(
      () => assertValidTransition(TransactionState.FUNDED, TransactionState.IN_PROGRESS, ActorRole.BUYER),
      /Unauthorized state transition/,
    );
  });

  it('6. Terminal-state protection (SETTLED, REFUNDED, CANCELLED cannot transition anywhere)', () => {
    const allStates = Object.values(TransactionState);
    const terminalStates = [TransactionState.SETTLED, TransactionState.REFUNDED, TransactionState.CANCELLED];

    for (const term of terminalStates) {
      assert.equal(isTerminalState(term), true);
      assert.equal(getValidNextStates(term).length, 0);

      for (const target of allStates) {
        assert.equal(canTransition(term, target), false, `${term} should not transition to ${target}`);
      }
    }
  });

  it('7. Dispute entry and resolution path', () => {
    // Can enter dispute from FUNDED, IN_PROGRESS, EVIDENCE_SUBMITTED, VERIFICATION
    assert.equal(canTransition(TransactionState.FUNDED, TransactionState.DISPUTED), true);
    assert.equal(canTransition(TransactionState.IN_PROGRESS, TransactionState.DISPUTED), true);
    assert.equal(canTransition(TransactionState.EVIDENCE_SUBMITTED, TransactionState.DISPUTED), true);
    assert.equal(canTransition(TransactionState.VERIFICATION, TransactionState.DISPUTED), true);

    // Progress through adjudication
    assert.equal(canTransition(TransactionState.DISPUTED, TransactionState.JUDGING), true);
    assert.equal(canTransition(TransactionState.JUDGING, TransactionState.RESOLVED), true);

    // Resolved can disburse to SETTLED or REFUNDED
    assert.equal(canTransition(TransactionState.RESOLVED, TransactionState.SETTLED), true);
    assert.equal(canTransition(TransactionState.RESOLVED, TransactionState.REFUNDED), true);
  });

  it('8. Refund path protection', () => {
    // If FUNDED, cancellation triggers REFUNDED
    assert.equal(canTransition(TransactionState.FUNDED, TransactionState.REFUNDED), true);
    assert.equal(isAuthorizedTransition(TransactionState.FUNDED, TransactionState.REFUNDED, ActorRole.BUYER), true);

    // Pre-funding cancel stays CANCELLED
    assert.equal(canTransition(TransactionState.AGREED, TransactionState.CANCELLED), true);
    assert.equal(canTransition(TransactionState.PROPOSED, TransactionState.CANCELLED), true);
    assert.equal(canTransition(TransactionState.DRAFT, TransactionState.CANCELLED), true);

    // Double refund or refund after settled is impossible
    assert.equal(canTransition(TransactionState.REFUNDED, TransactionState.REFUNDED), false);
    assert.equal(canTransition(TransactionState.SETTLED, TransactionState.REFUNDED), false);
  });
});
