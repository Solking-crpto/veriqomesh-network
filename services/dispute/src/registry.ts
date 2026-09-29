import type { JudgeAssignment, JudgeProfile } from '@trustmesh/types';
import { hashCanonicalJson } from './canonical.js';

export interface AssignPanelParams {
  transactionId: string;
  buyer: string;
  seller: string;
  verifier?: string;
  requiredDomain?: string;
}

export class JudgeRegistry {
  private _judges: Map<string, JudgeProfile> = new Map();

  constructor() {
    this._seedDefaultJudges();
  }

  private _seedDefaultJudges(): void {
    const defaultJudges: JudgeProfile[] = [
      {
        address: '0x2055106A19263432777B6349dBE03C874749f7b1',
        domains: ['GENERAL_COMMERCE', 'FREIGHT_LOGISTICS'],
        casesParticipated: 14,
        casesCompleted: 14,
        participationTimestamps: ['2026-09-01T12:00:00Z', '2026-09-15T14:30:00Z'],
        conflictAttestationsCount: 14,
        invalidBallotEvents: 0,
        averageResponseTimeSeconds: 3600,
        rationalePresenceRate: 1.0,
        isActive: true,
      },
      {
        address: '0x71bE63f3384f5fb98995898A86B02Fb2426c5788',
        domains: ['HARDWARE_INSPECTION', 'FREIGHT_LOGISTICS'],
        casesParticipated: 22,
        casesCompleted: 22,
        participationTimestamps: ['2026-08-20T10:00:00Z', '2026-09-10T16:00:00Z'],
        conflictAttestationsCount: 22,
        invalidBallotEvents: 0,
        averageResponseTimeSeconds: 4200,
        rationalePresenceRate: 1.0,
        isActive: true,
      },
      {
        address: '0xFABB0ac9d68B0B445fB7357272Ff202C5651694a',
        domains: ['GENERAL_COMMERCE', 'SOFTWARE_DELIVERY'],
        casesParticipated: 9,
        casesCompleted: 9,
        participationTimestamps: ['2026-09-05T09:00:00Z'],
        conflictAttestationsCount: 9,
        invalidBallotEvents: 0,
        averageResponseTimeSeconds: 2800,
        rationalePresenceRate: 1.0,
        isActive: true,
      },
      {
        address: '0x1CBD3b2770411244e34374c94044738E44b49445',
        domains: ['SOFTWARE_DELIVERY', 'FINANCIAL_MODELS'],
        casesParticipated: 17,
        casesCompleted: 17,
        participationTimestamps: ['2026-08-15T11:00:00Z'],
        conflictAttestationsCount: 17,
        invalidBallotEvents: 0,
        averageResponseTimeSeconds: 3100,
        rationalePresenceRate: 1.0,
        isActive: true,
      },
      {
        address: '0xdF3e18d64BC6A983f673Ab319CCaE4f1a57C7097',
        domains: ['FINANCIAL_MODELS', 'GENERAL_COMMERCE'],
        casesParticipated: 31,
        casesCompleted: 31,
        participationTimestamps: ['2026-07-10T08:00:00Z'],
        conflictAttestationsCount: 31,
        invalidBallotEvents: 0,
        averageResponseTimeSeconds: 2400,
        rationalePresenceRate: 1.0,
        isActive: true,
      },
    ];

    for (const judge of defaultJudges) {
      this.registerJudge(judge);
    }
  }

  public registerJudge(profile: JudgeProfile): void {
    this._judges.set(profile.address.toLowerCase(), {
      ...profile,
      address: profile.address,
    });
  }

  public clear(): void {
    this._judges.clear();
  }

  public getJudge(address: string): JudgeProfile | undefined {
    return this._judges.get(address.toLowerCase());
  }

  public listActiveJudges(domain?: string): JudgeProfile[] {
    const list = Array.from(this._judges.values()).filter((j) => j.isActive);
    if (!domain) return list;
    return list.filter((j) => j.domains.includes(domain));
  }

  public assignPanel(params: AssignPanelParams): JudgeAssignment {
    const buyerLower = params.buyer.toLowerCase();
    const sellerLower = params.seller.toLowerCase();
    const verifierLower = params.verifier?.toLowerCase();

    // Filter eligible judges
    const eligible = Array.from(this._judges.values()).filter((j) => {
      if (!j.isActive) return false;
      const addrLower = j.address.toLowerCase();
      // Strict role isolation: Buyer, Seller, and Verifier can NEVER judge their own case
      if (addrLower === buyerLower) return false;
      if (addrLower === sellerLower) return false;
      if (verifierLower && addrLower === verifierLower) return false;
      if (params.requiredDomain && !j.domains.includes(params.requiredDomain)) return false;
      return true;
    });

    if (eligible.length < 3) {
      throw new Error(
        `Insufficient eligible judges for transaction ${params.transactionId}. Required: 3, Available: ${eligible.length}`
      );
    }

    // Select first 3 eligible judges deterministically
    const selected = eligible.slice(0, 3).map((j) => j.address);
    const assignedAt = new Date().toISOString();

    const assignmentPayload = {
      transactionId: params.transactionId,
      assignedJudgeAddresses: selected,
      assignedAt,
    };

    const assignmentHash = hashCanonicalJson(assignmentPayload);

    return {
      transactionId: params.transactionId,
      assignedJudgeAddresses: selected,
      assignedAt,
      assignmentHash,
    };
  }
}
