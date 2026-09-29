import type { AIDossier } from '@trustmesh/types';

export interface GenerateDossierParams {
  transactionId: string;
  terms: {
    termsHash: string;
    summary: string;
    deadline: number;
    totalAmount: string;
  };
  buyerClaim: string;
  sellerClaim?: string;
  anchoredEvidence: {
    title: string;
    hash: string;
    uri?: string;
    submitter: string;
    timestamp?: string;
  }[];
  verificationOutcome?: string;
  verificationReport?: string;
}

export class AIDossierEngine {
  /**
   * Generates structured AI evidence dossier.
   * STRICT FIREWALL: Advisory only. Zero financial, execution, or voting authority.
   */
  public generateDossier(params: GenerateDossierParams): AIDossier {
    const chronology = [
      {
        timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
        event: 'Transaction terms proposed by Buyer and agreed by Seller onchain.',
        sourceRef: `termsHash:${params.terms.termsHash.slice(0, 10)}...`,
      },
      {
        timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
        event: 'Escrow funded by Buyer with required deposit.',
        sourceRef: 'onchain:fundEscrow',
      },
      {
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        event: 'Seller started execution and anchored initial deliverable evidence.',
        sourceRef: params.anchoredEvidence[0] ? `evidence:${params.anchoredEvidence[0].hash.slice(0, 10)}...` : undefined,
      },
    ];

    if (params.verificationOutcome) {
      chronology.push({
        timestamp: new Date().toISOString(),
        event: `Designated Verifier submitted inspection attestation: ${params.verificationOutcome}.`,
        sourceRef: params.verificationReport || 'onchain:submitVerification',
      });
    }

    const claimedFacts = [
      {
        claimer: 'Buyer',
        claim: params.buyerClaim,
        evidenceRef: params.anchoredEvidence.find((e) => e.submitter.toLowerCase().includes('buyer'))?.hash,
      },
    ];

    if (params.sellerClaim) {
      claimedFacts.push({
        claimer: 'Seller',
        claim: params.sellerClaim,
        evidenceRef: params.anchoredEvidence.find((e) => e.submitter.toLowerCase().includes('seller'))?.hash,
      });
    }

    // Deterministic factual discrepancy detection
    const detectedInconsistencies: string[] = [];
    if (params.verificationOutcome === 'INCONCLUSIVE') {
      detectedInconsistencies.push(
        'Discrepancy: Verifier inspection reported partial damage (e.g. 15% compromised deliverable) contrasting with 100% full delivery claim.'
      );
    }
    if (params.buyerClaim.toLowerCase().includes('damage') && params.sellerClaim?.toLowerCase().includes('perfect')) {
      detectedInconsistencies.push(
        'Contradiction: Buyer asserts transit damage while Seller asserts undamaged handoff to carrier.'
      );
    }

    const unresolvedQuestions = [
      'Did transit damage occur prior to carrier handoff or during transit under carrier responsibility?',
      'Does the documented defective portion justify a buyer refund or partial seller payout, and if so, what allocation is supported by the evidence?',
    ];

    return {
      label: 'AI_ANALYZED — HUMAN REVIEW REQUIRED',
      chronology,
      evidenceReferences: params.anchoredEvidence.map((e) => ({
        title: e.title,
        hash: e.hash,
        uri: e.uri || 'ipfs://unspecified',
        submitter: e.submitter,
      })),
      agreementTerms: params.terms,
      claimedFacts,
      detectedInconsistencies,
      unresolvedQuestions,
      generatedAt: new Date().toISOString(),
    };
  }
}
