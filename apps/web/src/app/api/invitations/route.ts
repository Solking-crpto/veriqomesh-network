import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import {
  CreateInvitationRequest,
  PersistentInvitation,
} from '../../../lib/invitation-types';
import {
  redisGet,
  redisSet,
  redisSAdd,
  redisSMembers,
} from '../../../lib/redis';
import {
  generateCanonicalInvitationCode,
  generateCounterInvitationCode,
  generateFreshTransactionId,
  computeCanonicalTermsHash,
  computeCanonicalAgreementHash,
  serializeCanonicalAgreement,
  CANONICAL_FLOW_A_TX_ID,
  CANONICAL_FLOW_B_TX_ID,
} from '../../../lib/invitation-utils';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body: CreateInvitationRequest = await req.json();

    // 1. Validate required fields
    if (!body.initiatorWallet || !ethers.isAddress(body.initiatorWallet)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing initiatorWallet address' },
        { status: 400 }
      );
    }
    if (!body.intendedReceiverWallet || !ethers.isAddress(body.intendedReceiverWallet)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing intendedReceiverWallet address' },
        { status: 400 }
      );
    }
    if (!body.proposal || !body.proposal.title || !body.proposal.amount) {
      return NextResponse.json(
        { success: false, error: 'Missing required proposal fields (title, amount)' },
        { status: 400 }
      );
    }

    const initiator = body.initiatorWallet.toLowerCase();
    const receiver = body.intendedReceiverWallet.toLowerCase();

    // Role isolation: initiator and receiver cannot be the same address
    if (initiator === receiver) {
      return NextResponse.json(
        { success: false, error: 'Initiator and receiver cannot be the same address' },
        { status: 400 }
      );
    }

    const canonicalAgreement = body.proposal.canonicalAgreement;
    let termsHash: string;
    let termsText: string;

    if (canonicalAgreement) {
      termsHash = computeCanonicalAgreementHash(canonicalAgreement);
      termsText = body.proposal.termsText || serializeCanonicalAgreement(canonicalAgreement);
    } else {
      termsText = body.proposal.termsText || body.proposal.description || body.proposal.title;
      termsHash = body.proposal.termsHash || computeCanonicalTermsHash(termsText);
    }

    // 2. Handle counter vs fresh proposal
    let invitationCode = '';
    let version = 1;
    let parentInvitation: PersistentInvitation | null = null;

    if (body.parentInvitationCode) {
      const parentCode = body.parentInvitationCode.toUpperCase();
      parentInvitation = await redisGet<PersistentInvitation>(`veriqomesh:invitation:${parentCode}`);
      if (!parentInvitation) {
        return NextResponse.json(
          { success: false, error: `Parent invitation ${parentCode} not found` },
          { status: 404 }
        );
      }
      version = (parentInvitation.version || 1) + 1;
      invitationCode = generateCounterInvitationCode(parentCode, version);
    } else {
      // Fresh invitation: generate unique canonical code and verify no collision
      let attempts = 0;
      do {
        invitationCode = generateCanonicalInvitationCode();
        const existing = await redisGet(`veriqomesh:invitation:${invitationCode}`);
        if (!existing) break;
        attempts++;
      } while (attempts < 5);

      if (attempts >= 5) {
        return NextResponse.json(
          { success: false, error: 'Failed to generate a unique invitation code. Please retry.' },
          { status: 500 }
        );
      }
    }

    // 3. Generate or validate fresh bytes32 transactionId
    // INVARIANT: Never allow Flow A (0x961c...54e1) or Flow B ID to be reused!
    let effectiveTxId = body.transactionId;
    if (
      !effectiveTxId ||
      !effectiveTxId.startsWith('0x') ||
      effectiveTxId.length !== 66 ||
      effectiveTxId.toLowerCase() === CANONICAL_FLOW_A_TX_ID.toLowerCase() ||
      effectiveTxId.toLowerCase() === CANONICAL_FLOW_B_TX_ID.toLowerCase()
    ) {
      effectiveTxId = generateFreshTransactionId(initiator, invitationCode);
    }

    const buyer = body.roles?.buyer || body.initiatorWallet;
    const seller = body.roles?.seller || body.intendedReceiverWallet;
    const verifier =
      body.roles?.verifier ||
      process.env.NEXT_PUBLIC_DEFAULT_VERIFIER_ADDRESS ||
      '0xb064d69428B9838C2a3e408cF995ea8eb5182c48';

    const now = Date.now();
    const newInvitation: PersistentInvitation = {
      invitationCode,
      version,
      status: 'PROPOSED',
      createdAt: now,
      updatedAt: now,
      initiatorWallet: ethers.getAddress(body.initiatorWallet),
      intendedReceiverWallet: ethers.getAddress(body.intendedReceiverWallet),
      transactionId: effectiveTxId,
      onchainTxHash: body.onchainTxHash || undefined,
      parentInvitationCode: parentInvitation ? parentInvitation.invitationCode : undefined,
      proposal: {
        title: body.proposal.title,
        description: body.proposal.description || (canonicalAgreement ? canonicalAgreement.naturalLanguageNeed : termsText),
        amount: body.proposal.amount,
        asset: body.proposal.asset || 'MON',
        deadlineDays: Number(body.proposal.deadlineDays) || 14,
        termsText,
        termsHash,
        evidenceRequirements: body.proposal.evidenceRequirements || (canonicalAgreement ? canonicalAgreement.structuredParameters.evidenceRequirements : [
          'Carrier Bill of Lading (signed)',
          'Geotagged Delivery Photo',
          `Independent Verifier Attestation (${verifier.slice(0, 6)}...${verifier.slice(-4)})`,
        ]),
        canonicalAgreement: canonicalAgreement || undefined,
        location: body.proposal.location || (canonicalAgreement ? canonicalAgreement.structuredParameters.location : undefined),
        additionalConditions: body.proposal.additionalConditions || (canonicalAgreement ? canonicalAgreement.structuredParameters.additionalConditions : undefined),
      },
      roles: {
        buyer: ethers.getAddress(buyer),
        seller: ethers.getAddress(seller),
        verifier: ethers.getAddress(verifier),
      },
    };

    // 4. Save new invitation in Redis
    await redisSet(`veriqomesh:invitation:${invitationCode}`, newInvitation);

    // 5. Index for fast querying by receiver and initiator
    await redisSAdd(`veriqomesh:invitation:index:receiver:${receiver}`, invitationCode);
    await redisSAdd(`veriqomesh:invitation:index:initiator:${initiator}`, invitationCode);

    // 6. If countering, update parent status to COUNTERED without mutating original terms
    if (parentInvitation) {
      parentInvitation.status = 'COUNTERED';
      parentInvitation.counterInvitationCode = invitationCode;
      parentInvitation.updatedAt = now;
      await redisSet(`veriqomesh:invitation:${parentInvitation.invitationCode}`, parentInvitation);
    }

    return NextResponse.json(
      {
        success: true,
        invitationCode,
        shareUrl: `/receive/${invitationCode}`,
        invitation: newInvitation,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const receiver = searchParams.get('receiver');
    const initiator = searchParams.get('initiator');

    if (!receiver && !initiator) {
      return NextResponse.json(
        { success: false, error: 'Query parameter "receiver" or "initiator" is required' },
        { status: 400 }
      );
    }

    let codes: string[] = [];
    if (receiver && ethers.isAddress(receiver)) {
      const receiverCodes = await redisSMembers(`veriqomesh:invitation:index:receiver:${receiver.toLowerCase()}`);
      codes = [...codes, ...receiverCodes];
    }
    if (initiator && ethers.isAddress(initiator)) {
      const initiatorCodes = await redisSMembers(`veriqomesh:invitation:index:initiator:${initiator.toLowerCase()}`);
      codes = [...codes, ...initiatorCodes];
    }

    const uniqueCodes = Array.from(new Set(codes));
    const invitations: PersistentInvitation[] = [];

    for (const code of uniqueCodes) {
      const inv = await redisGet<PersistentInvitation>(`veriqomesh:invitation:${code}`);
      if (inv) {
        invitations.push(inv);
      }
    }

    // Sort descending by creation timestamp
    invitations.sort((a, b) => b.createdAt - a.createdAt);

    return NextResponse.json({ success: true, invitations });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
