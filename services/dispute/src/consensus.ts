import type { ConsensusResult, JudgeBallot } from '@trustmesh/types';
import { DisputeConsensusState } from '@trustmesh/types';

export class ConsensusEngine {
  /**
   * Calculates 3-Judge Median Consensus according to Stage 4 rules.
   *
   * Formally:
   * Given three ballots B1 <= B2 <= B3:
   * Consensus BPS = B2 (the median vote).
   *
   * Polarization Rule:
   * If (maxVote - minVote) > 4000 bps (i.e. > 40% divergence):
   * Dispute is marked POLARIZED and transitions to REQUIRES_SENIOR_REVIEW.
   * Settlement is strictly blocked.
   */
  public calculate3JudgeMedianConsensus(
    transactionId: string,
    ballots: JudgeBallot[]
  ): ConsensusResult {
    if (ballots.length !== 3) {
      throw new Error(
        `3-Judge Median Consensus requires exactly 3 submitted ballots. Provided: ${ballots.length}`
      );
    }

    const participatingJudges = ballots.map((b) => b.judgeAddress);
    const votes = ballots.map((b) => ({
      judgeAddress: b.judgeAddress,
      buyerShareBps: b.buyerShareBps,
      rationale: b.rationale,
    }));

    // Sort ascending
    const sortedBps = ballots.map((b) => b.buyerShareBps).sort((a, b) => a - b);
    const minVote = sortedBps[0];
    const consensusBuyerShareBps = sortedBps[1]; // B2 is the median
    const maxVote = sortedBps[2];
    const spreadBps = maxVote - minVote;

    const isPolarized = spreadBps > 4000;

    const state = isPolarized
      ? DisputeConsensusState.REQUIRES_SENIOR_REVIEW
      : DisputeConsensusState.READY_FOR_SETTLEMENT;

    return {
      transactionId,
      method: '3-Judge Median Consensus',
      participatingJudges,
      votes,
      sortedBps,
      consensusBuyerShareBps,
      maxVote,
      minVote,
      spreadBps,
      isPolarized,
      state,
      calculatedAt: new Date().toISOString(),
    };
  }
}
