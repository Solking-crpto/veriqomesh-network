import { ethers } from 'ethers';
import type { ConflictAttestation } from '@trustmesh/types';

export class ConflictAttestationVerifier {
  public static createDeclarationMessage(
    transactionId: string,
    judgeAddress: string,
    declaration: string,
    timestamp: number
  ): string {
    return [
      'VeriqoMesh Conflict of Interest Declaration',
      `Transaction: ${transactionId.toLowerCase()}`,
      `Judge: ${judgeAddress.toLowerCase()}`,
      `Declaration: ${declaration}`,
      `Timestamp: ${timestamp}`,
    ].join('\n');
  }

  /**
   * Verifies cryptographic validity and panel membership of a conflict attestation.
   * NOTE ON TRUST BOUNDARY:
   * A valid cryptographic signature proves strictly that the designated Ethereum address signed
   * this declaration. It does NOT magically prove real-world absence of bias; it provides
   * non-repudiable legal and reputational accountability for the attesting adjudicator.
   */
  public verify(
    attestation: ConflictAttestation,
    assignedJudges: string[],
    existingAttestations?: Record<string, ConflictAttestation> | string[]
  ): { isValid: boolean; reason?: string } {
    if (!attestation.declaration || attestation.declaration.trim().length === 0) {
      return { isValid: false, reason: 'Empty conflict-of-interest declaration string' };
    }

    const assignedNormalized = assignedJudges.map((a) => a.toLowerCase());
    const judgeNormalized = attestation.judgeAddress.toLowerCase();

    if (!assignedNormalized.includes(judgeNormalized)) {
      return {
        isValid: false,
        reason: `Judge ${attestation.judgeAddress} is not assigned to this dispute panel`,
      };
    }

    if (existingAttestations) {
      const existingKeys = Array.isArray(existingAttestations)
        ? existingAttestations.map((a) => a.toLowerCase())
        : Object.keys(existingAttestations).map((k) => k.toLowerCase());
      if (existingKeys.includes(judgeNormalized)) {
        return {
          isValid: false,
          reason: `Duplicate conflict attestation rejected: Judge ${attestation.judgeAddress} has already submitted a declaration for this dispute`,
        };
      }
    }

    const message = ConflictAttestationVerifier.createDeclarationMessage(
      attestation.transactionId,
      attestation.judgeAddress,
      attestation.declaration,
      attestation.timestamp
    );

    try {
      const recovered = ethers.verifyMessage(message, attestation.signature);
      if (recovered.toLowerCase() !== judgeNormalized) {
        return {
          isValid: false,
          reason: `Signature recovered address ${recovered} does not match judge address ${attestation.judgeAddress}`,
        };
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return { isValid: false, reason: `Failed to recover signature: ${errorMsg}` };
    }

    return { isValid: true };
  }
}
