import type {
  AdjudicationRecord,
  AIDossier,
  ConflictAttestation,
  ConsensusResult,
  JudgeBallot,
} from '@trustmesh/types';
import { hashCanonicalJson } from './canonical.js';

export class AdjudicationRecordManager {
  /**
   * Constructs an immutable, canonical adjudication record binding all human juror inputs.
   */
  public createRecord(params: {
    transactionId: string;
    docketId: string;
    consensus: ConsensusResult;
    ballots: JudgeBallot[];
    attestations: ConflictAttestation[];
    aiDossier?: AIDossier;
    createdAt?: string;
  }): AdjudicationRecord {
    const ballotHashes = params.ballots
      .map((b) => hashCanonicalJson({
        judge: b.judgeAddress,
        bps: b.buyerShareBps,
        sig: b.signature,
      }))
      .sort();

    const conflictAttestationHashes = params.attestations
      .map((a) => hashCanonicalJson({
        judge: a.judgeAddress,
        timestamp: a.timestamp,
        sig: a.signature,
      }))
      .sort();

    const aiDossierHash = params.aiDossier
      ? hashCanonicalJson(params.aiDossier)
      : '0x0000000000000000000000000000000000000000000000000000000000000000';

    const createdAt = params.createdAt || new Date().toISOString();

    const canonicalData = {
      transactionId: params.transactionId,
      docketId: params.docketId,
      consensusBuyerShareBps: params.consensus.consensusBuyerShareBps,
      consensusMethod: params.consensus.method,
      participatingJudges: params.consensus.participatingJudges.sort(),
      ballotHashes,
      conflictAttestationHashes,
      aiDossierHash,
      status: params.consensus.state,
      createdAt,
    };

    const adjudicationId = hashCanonicalJson(canonicalData);
    const adjudicationCid = `ipfs://bafy-adjudication-${adjudicationId.slice(2, 18)}`;

    return {
      adjudicationId,
      transactionId: params.transactionId,
      docketId: params.docketId,
      consensusBuyerShareBps: params.consensus.consensusBuyerShareBps,
      consensusMethod: '3-Judge Median Consensus',
      participatingJudges: params.consensus.participatingJudges,
      ballotHashes,
      conflictAttestationHashes,
      aiDossierHash,
      status: params.consensus.state,
      adjudicationCid,
      createdAt,
    };
  }
}
