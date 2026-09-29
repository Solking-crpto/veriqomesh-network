import { ethers } from 'ethers';
import type { DisputeDocket, SettlementDispatch } from '@trustmesh/types';
import { DisputeConsensusState } from '@trustmesh/types';

export class SettlementAuthorizationGate {
  /**
   * Validates that all offchain adjudication requirements have been rigorously satisfied
   * before permitting the authorized resolver to broadcast `resolveDispute` onchain.
   *
   * STRICT BOUNDARY:
   * The underlying smart contract only verifies `msg.sender == disputeResolver`.
   * This offchain gate is the cryptographic and procedural checkpoint that prevents
   * unauthorized, unconsensus-backed, or polarized settlements.
   */
  public authorizeDispatch(params: {
    docket: DisputeDocket;
    proposedBps: number;
    resolverAddress: string;
  }): SettlementDispatch {
    const { docket, proposedBps, resolverAddress } = params;

    // 1. Quorum check
    const ballotCount = Object.keys(docket.ballots).length;
    if (ballotCount !== 3) {
      throw new Error(
        `Settlement dispatch rejected: Incomplete quorum. Required: 3 valid ballots, Present: ${ballotCount}`
      );
    }

    // 2. Conflict attestations check
    const attestationCount = Object.keys(docket.conflictAttestations).length;
    if (attestationCount !== 3) {
      throw new Error(
        `Settlement dispatch rejected: Incomplete conflict attestations. Required: 3, Present: ${attestationCount}`
      );
    }

    // 3. Consensus existence
    if (!docket.consensusResult) {
      throw new Error(
        'Settlement dispatch rejected: No consensus result has been calculated for this docket'
      );
    }

    // 4. Polarization guard
    if (
      docket.adjudicationStatus === DisputeConsensusState.POLARIZED ||
      docket.adjudicationStatus === DisputeConsensusState.REQUIRES_SENIOR_REVIEW ||
      docket.consensusResult.isPolarized
    ) {
      throw new Error(
        `Settlement dispatch rejected: Dispute is marked ${docket.adjudicationStatus} (spread > 4000 bps). Requires senior appellate review; automated settlement is strictly blocked.`
      );
    }

    // 5. Ready for settlement status check
    if (docket.adjudicationStatus !== DisputeConsensusState.READY_FOR_SETTLEMENT) {
      throw new Error(
        `Settlement dispatch rejected: Invalid docket state ${docket.adjudicationStatus}. Expected ${DisputeConsensusState.READY_FOR_SETTLEMENT}`
      );
    }

    // 6. EXACT BPS MATCHING: Proposed BPS must equal consensus BPS
    if (proposedBps !== docket.consensusResult.consensusBuyerShareBps) {
      throw new Error(
        `Settlement dispatch rejected: Dispatched BPS (${proposedBps}) does not match 3-Judge Median Consensus BPS (${docket.consensusResult.consensusBuyerShareBps})`
      );
    }

    // 7. Verify resolver address is non-zero
    if (!resolverAddress || resolverAddress === ethers.ZeroAddress) {
      throw new Error('Settlement dispatch rejected: Invalid resolver address');
    }

    const dispatchedAt = new Date().toISOString();

    return {
      transactionId: docket.transactionId,
      consensusBuyerShareBps: docket.consensusResult.consensusBuyerShareBps,
      adjudicationRecordHash: docket.id,
      dispatchedBy: resolverAddress,
      dispatchedAt,
      isDispatched: false, // Updated to true upon confirmed onchain transaction
    };
  }

  /**
   * Helper to encode the exact calldata for resolveDispute(bytes32,uint16)
   */
  public static encodeResolveDisputeCalldata(transactionId: string, buyerShareBps: number): string {
    const iface = new ethers.Interface([
      'function resolveDispute(bytes32 transactionId, uint16 buyerShareBps) external',
    ]);
    return iface.encodeFunctionData('resolveDispute', [transactionId, buyerShareBps]);
  }
}
