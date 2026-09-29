import { ethers } from 'ethers';
import type { JudgeBallot } from '@trustmesh/types';

export interface VerifyBallotContext {
  transactionId: string;
  assignedJudges: string[];
  buyer: string;
  seller: string;
  verifier?: string;
  existingBallots: Record<string, JudgeBallot>;
}

export class JudgeBallotVerifier {
  public static createBallotMessage(
    transactionId: string,
    judgeAddress: string,
    buyerShareBps: number,
    rationale: string,
    submittedAt: string
  ): string {
    return [
      'VeriqoMesh Judge Ballot',
      `Transaction: ${transactionId.toLowerCase()}`,
      `Judge: ${judgeAddress.toLowerCase()}`,
      `Buyer Share (bps): ${buyerShareBps}`,
      `Rationale: ${rationale.trim()}`,
      `Submitted: ${submittedAt}`,
    ].join('\n');
  }

  /**
   * Strictly validates judge ballot requirements according to Stage 4 rules.
   */
  public verify(
    ballot: JudgeBallot,
    context: VerifyBallotContext
  ): { isValid: boolean; reason?: string } {
    // 1. Transaction ID match
    if (ballot.transactionId.toLowerCase() !== context.transactionId.toLowerCase()) {
      return {
        isValid: false,
        reason: `Ballot transactionId ${ballot.transactionId} does not match docket ${context.transactionId}`,
      };
    }

    const judgeNormalized = ballot.judgeAddress.toLowerCase();
    const assignedNormalized = context.assignedJudges.map((a) => a.toLowerCase());

    // 2. Judge must be assigned
    if (!assignedNormalized.includes(judgeNormalized)) {
      return {
        isValid: false,
        reason: `Judge ${ballot.judgeAddress} is not assigned to this dispute panel`,
      };
    }

    // 3. Strict role isolation: Buyer cannot be judge
    if (judgeNormalized === context.buyer.toLowerCase()) {
      return { isValid: false, reason: 'Dispute rule violation: Buyer cannot be a judge' };
    }

    // 4. Strict role isolation: Seller cannot be judge
    if (judgeNormalized === context.seller.toLowerCase()) {
      return { isValid: false, reason: 'Dispute rule violation: Seller cannot be a judge' };
    }

    // 5. Strict role isolation: Verifier cannot be judge
    if (context.verifier && judgeNormalized === context.verifier.toLowerCase()) {
      return {
        isValid: false,
        reason: 'Dispute rule violation: Designated Verifier cannot be a judge',
      };
    }

    // 6. Range bounds for basis points
    if (typeof ballot.buyerShareBps !== 'number' || isNaN(ballot.buyerShareBps)) {
      return { isValid: false, reason: 'Invalid buyerShareBps: must be a valid number' };
    }
    if (ballot.buyerShareBps < 0 || ballot.buyerShareBps > 10000) {
      return {
        isValid: false,
        reason: `Invalid buyerShareBps: ${ballot.buyerShareBps} is out of range [0, 10000]`,
      };
    }

    // 7. Compulsory non-empty rationale
    if (!ballot.rationale || ballot.rationale.trim().length === 0) {
      return { isValid: false, reason: 'Compulsory written rationale is missing or empty' };
    }

    // 8. Single ballot rule: ballot cannot be submitted twice
    if (context.existingBallots[judgeNormalized]) {
      return {
        isValid: false,
        reason: `Duplicate ballot rejected: Judge ${ballot.judgeAddress} has already cast a ballot for this dispute`,
      };
    }

    // 9. Signature verification
    const message = JudgeBallotVerifier.createBallotMessage(
      ballot.transactionId,
      ballot.judgeAddress,
      ballot.buyerShareBps,
      ballot.rationale,
      ballot.submittedAt
    );

    try {
      const recovered = ethers.verifyMessage(message, ballot.signature);
      if (recovered.toLowerCase() !== judgeNormalized) {
        return {
          isValid: false,
          reason: `Ballot signature recovered address ${recovered} does not match judge address ${ballot.judgeAddress}`,
        };
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return { isValid: false, reason: `Failed to verify ballot signature: ${errorMsg}` };
    }

    return { isValid: true };
  }
}
