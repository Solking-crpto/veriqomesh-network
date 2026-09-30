import { NextRequest, NextResponse } from 'next/server';
import { PersistentInvitation, UpdateInvitationRequest } from '../../../../lib/invitation-types';
import { redisGet, redisSet } from '../../../../lib/redis';
import { authorizeInvitationMutation } from '../../../../lib/mutation-auth';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    if (!code) {
      return NextResponse.json({ success: false, error: 'Invitation code required' }, { status: 400 });
    }

    const normalizedCode = code.trim().toUpperCase();
    const invitation = await redisGet<PersistentInvitation>(`veriqomesh:invitation:${normalizedCode}`);

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: `Invitation ${normalizedCode} not found or expired` },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, invitation });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    if (!code) {
      return NextResponse.json({ success: false, error: 'Invitation code required' }, { status: 400 });
    }

    const normalizedCode = code.trim().toUpperCase();
    const invitation = await redisGet<PersistentInvitation>(`veriqomesh:invitation:${normalizedCode}`);

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: `Invitation ${normalizedCode} not found` },
        { status: 404 }
      );
    }

    const body: UpdateInvitationRequest = await req.json();

    // Determine the expected mutation action string
    let expectedAction = '';
    if (body.status === 'AGREED') {
      expectedAction = 'MUTATION:STATUS_AGREED';
    } else if (body.status === 'DECLINED') {
      expectedAction = 'MUTATION:STATUS_DECLINED';
    } else if (body.status === 'COUNTERED') {
      expectedAction = 'MUTATION:STATUS_COUNTERED';
    } else if (body.onchainTxHash && !body.status) {
      expectedAction = 'MUTATION:RECORD_ONCHAIN_TX';
    } else if (body.auth?.action) {
      expectedAction = body.auth.action;
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid mutation request. Status or broadcast hash must be specified.' },
        { status: 400 }
      );
    }

    // 1. Authorize via cryptographic signature (EIP-191) & replay check
    const authResult = await authorizeInvitationMutation({
      invitation,
      auth: body.auth,
      expectedAction,
    });

    if (!authResult.isAuthorized) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.statusCode }
      );
    }

    // 2. Strict Role & State Transition Rules
    if (body.status === 'AGREED') {
      // Only the designated receiver (Seller) can agree/ratify!
      if (!authResult.isReceiver) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized: only the designated counterparty (seller) can ratify an agreement.' },
          { status: 403 }
        );
      }
      if (invitation.status !== 'PROPOSED') {
        return NextResponse.json(
          { success: false, error: `Invalid state transition: cannot ratify invitation in ${invitation.status} state.` },
          { status: 400 }
        );
      }
      invitation.status = 'AGREED';
    } else if (body.status === 'DECLINED') {
      // Receiver can decline, or initiator can cancel/withdraw
      if (invitation.status !== 'PROPOSED') {
        return NextResponse.json(
          { success: false, error: `Invalid state transition: cannot decline invitation in ${invitation.status} state.` },
          { status: 400 }
        );
      }
      invitation.status = 'DECLINED';
    } else if (body.status === 'COUNTERED') {
      if (!authResult.isReceiver) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized: only the designated counterparty can counter a proposal.' },
          { status: 403 }
        );
      }
      if (invitation.status !== 'PROPOSED') {
        return NextResponse.json(
          { success: false, error: `Invalid state transition: cannot counter invitation in ${invitation.status} state.` },
          { status: 400 }
        );
      }
      invitation.status = 'COUNTERED';
    } else if (body.status) {
      // Reject any arbitrary unknown status strings
      return NextResponse.json(
        { success: false, error: `Unauthorized status value: "${body.status}". Only legal transitions are permitted.` },
        { status: 400 }
      );
    }

    // Apply allowed secondary metadata fields
    if (body.onchainTxHash) {
      if (!body.onchainTxHash.startsWith('0x') || body.onchainTxHash.length !== 66) {
        return NextResponse.json(
          { success: false, error: 'Invalid onchainTxHash: must be a 66-character hex EVM hash.' },
          { status: 400 }
        );
      }
      invitation.onchainTxHash = body.onchainTxHash;
    }

    if (body.counterInvitationCode) {
      invitation.counterInvitationCode = body.counterInvitationCode;
    }

    // Update timestamp
    invitation.updatedAt = Date.now();

    // Persist updated invitation
    await redisSet(`veriqomesh:invitation:${normalizedCode}`, invitation);

    return NextResponse.json({ success: true, invitation });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
