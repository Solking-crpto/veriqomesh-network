import { redisGet, redisSet } from './redis';
import { verifyMutationSignature } from './invitation-utils';
import { MutationAuthorization, PersistentInvitation } from './invitation-types';

export interface AuthorizeMutationResult {
  isAuthorized: boolean;
  statusCode: number;
  error?: string;
  recoveredAddress?: string;
  isInitiator?: boolean;
  isReceiver?: boolean;
}

/**
 * Validates cryptographic authorization (EIP-191 personal_sign), participant binding,
 * expiration, domain, action match, and executes nonce replay protection via Redis.
 */
export async function authorizeInvitationMutation(params: {
  invitation: PersistentInvitation;
  auth: MutationAuthorization;
  expectedAction: string;
}): Promise<AuthorizeMutationResult> {
  const { invitation, auth, expectedAction } = params;

  if (!auth) {
    return {
      isAuthorized: false,
      statusCode: 401,
      error: 'Missing mutation authorization payload. Cryptographic signature is required.',
    };
  }

  // 1. Cryptographic signature verification, participant binding, domain, code, and expiry checks
  const sigResult = verifyMutationSignature({
    invitationCode: invitation.invitationCode,
    action: auth.action,
    signature: auth.signature,
    nonce: auth.nonce,
    expiresAt: auth.expiresAt,
    initiatorWallet: invitation.initiatorWallet,
    intendedReceiverWallet: invitation.intendedReceiverWallet,
  });

  if (!sigResult.isValid) {
    let statusCode = 401;
    if (sigResult.error?.includes('not a participating wallet')) {
      statusCode = 403;
    } else if (
      sigResult.error?.includes('Missing') ||
      sigResult.error?.includes('Invalid') ||
      sigResult.error?.includes('window')
    ) {
      statusCode = 400;
    }
    return {
      isAuthorized: false,
      statusCode,
      error: sigResult.error || 'Invalid mutation authorization signature.',
    };
  }

  // 2. Strict action match enforcement
  if (auth.action !== expectedAction) {
    return {
      isAuthorized: false,
      statusCode: 403,
      error: `Authorization action mismatch: signature authorized "${auth.action}", but attempted "${expectedAction}".`,
    };
  }

  // 3. Replay Protection: Check if nonce has already been consumed
  const nonceKey = `veriqomesh:nonce:${auth.nonce}`;
  try {
    const existingNonce = await redisGet<string>(nonceKey);
    if (existingNonce) {
      return {
        isAuthorized: false,
        statusCode: 409,
        error: 'Authorization nonce has already been consumed (replay rejected).',
      };
    }

    // 4. Consume nonce with TTL matching the expiration window (+ 60s buffer)
    const ttlSeconds = Math.max(60, Math.ceil((auth.expiresAt - Date.now()) / 1000) + 60);
    await redisSet(nonceKey, sigResult.recoveredAddress, ttlSeconds);
  } catch (redisErr) {
    // If Redis is unreachable, fail securely rather than silently skipping replay protection
    console.error('Redis error during nonce replay verification:', redisErr);
    return {
      isAuthorized: false,
      statusCode: 503,
      error: 'Replay protection service temporarily unavailable. Please retry.',
    };
  }

  return {
    isAuthorized: true,
    statusCode: 200,
    recoveredAddress: sigResult.recoveredAddress,
    isInitiator: sigResult.isInitiator,
    isReceiver: sigResult.isReceiver,
  };
}
