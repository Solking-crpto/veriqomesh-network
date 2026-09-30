import { NextRequest, NextResponse } from 'next/server';
import { PersistentInvitation, UpdateInvitationRequest } from '../../../../lib/invitation-types';
import { redisGet, redisSet } from '../../../../lib/redis';

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

    // Verify caller authorization if callerWallet provided
    if (body.callerWallet) {
      const caller = body.callerWallet.toLowerCase();
      const isInitiator = caller === invitation.initiatorWallet.toLowerCase();
      const isReceiver = caller === invitation.intendedReceiverWallet.toLowerCase();

      if (!isInitiator && !isReceiver) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized: caller does not participate in this invitation' },
          { status: 403 }
        );
      }
    }

    // Apply allowed updates
    if (body.status) {
      invitation.status = body.status;
    }
    if (body.onchainTxHash) {
      invitation.onchainTxHash = body.onchainTxHash;
    }
    if (body.transactionId) {
      invitation.transactionId = body.transactionId;
    }
    if (body.counterInvitationCode) {
      invitation.counterInvitationCode = body.counterInvitationCode;
    }

    invitation.updatedAt = Date.now();

    await redisSet(`veriqomesh:invitation:${normalizedCode}`, invitation);

    return NextResponse.json({ success: true, invitation });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
