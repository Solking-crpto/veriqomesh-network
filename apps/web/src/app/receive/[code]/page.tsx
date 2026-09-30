'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import { useDemoNetwork } from '../../../context/DemoNetworkContext';
import { PersistentInvitation } from '../../../lib/invitation-types';
import { TransactionState } from '@trustmesh/types';
import {
  CANONICAL_FLOW_A_TX_ID,
  CANONICAL_FLOW_B_TX_ID,
  buildMutationAuthMessage,
} from '../../../lib/invitation-utils';

export default function ReceiveInvitationPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const code = (resolvedParams.code || '').trim().toUpperCase();

  const { wallet, client } = useDemoNetwork();

  const [invitation, setInvitation] = useState<PersistentInvitation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Onchain reconciliation state
  const [onchainState, setOnchainState] = useState<{
    stateName: TransactionState;
    buyer: string;
    seller: string;
    verifier: string;
    totalAmountMon: string;
    fundedAt: bigint;
  } | null>(null);
  const [isRefreshingOnchain, setIsRefreshingOnchain] = useState(false);

  // Agree state
  const [isAccepting, setIsAccepting] = useState(false);
  const [acceptPendingHash, setAcceptPendingHash] = useState<string | null>(null);
  const [acceptTxHash, setAcceptTxHash] = useState<string | null>(null);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  // Counter state
  const [isCounterModalOpen, setIsCounterModalOpen] = useState(false);
  const [counterNote, setCounterNote] = useState('Propose updated inspection window and terms');
  const [counterDeadline, setCounterDeadline] = useState(21);
  const [counterAmount, setCounterAmount] = useState('');
  const [isSubmittingCounter, setIsSubmittingCounter] = useState(false);
  const [counterError, setCounterError] = useState<string | null>(null);

  // Decline state
  const [isDeclining, setIsDeclining] = useState(false);
  const [declineError, setDeclineError] = useState<string | null>(null);

  // Fetch invitation from Upstash Redis API
  const fetchInvitation = useCallback(async () => {
    if (!code) return;
    setIsLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/invitations/${code}`);
      const data = await res.json();
      if (!res.ok || !data.success || !data.invitation) {
        throw new Error(data.error || `Invitation "${code}" could not be found.`);
      }
      setInvitation(data.invitation);
      if (data.invitation.proposal?.amount) {
        setCounterAmount(data.invitation.proposal.amount);
      }
      if (data.invitation.proposal?.deadlineDays) {
        setCounterDeadline(data.invitation.proposal.deadlineDays);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load invitation.';
      setFetchError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [code]);

  useEffect(() => {
    fetchInvitation();
  }, [fetchInvitation]);

  // Reconcile onchain state from Monad RPC
  const reconcileOnchain = useCallback(async (txId: string) => {
    if (!txId || !txId.startsWith('0x') || txId.length !== 66) return;
    setIsRefreshingOnchain(true);
    try {
      const onTx = await client.getOnchainTransaction(txId);
      if (onTx && onTx.buyer !== ethers.ZeroAddress) {
        setOnchainState({
          stateName: onTx.stateName,
          buyer: onTx.buyer,
          seller: onTx.seller,
          verifier: onTx.verifier,
          totalAmountMon: ethers.formatEther(onTx.totalAmount),
          fundedAt: onTx.fundedAt,
        });
      }
    } catch {
      // Graceful fallback if tx not onchain or client unavailable
    } finally {
      setIsRefreshingOnchain(false);
    }
  }, [client]);

  useEffect(() => {
    if (invitation?.transactionId) {
      reconcileOnchain(invitation.transactionId);
    }
  }, [invitation?.transactionId, reconcileOnchain]);

  // Authorization and role checks
  const isConnected = wallet.isConnected;
  const connectedAddress = wallet.address ? wallet.address.toLowerCase() : null;
  const designatedSeller = invitation?.intendedReceiverWallet ? invitation.intendedReceiverWallet.toLowerCase() : null;
  const designatedBuyer = invitation?.initiatorWallet ? invitation.initiatorWallet.toLowerCase() : null;
  const isDesignatedSellerConnected = Boolean(connectedAddress && designatedSeller && connectedAddress === designatedSeller);
  const isDesignatedBuyerConnected = Boolean(connectedAddress && designatedBuyer && connectedAddress === designatedBuyer);

  const isCanonicalFlowA = invitation?.transactionId?.toLowerCase() === CANONICAL_FLOW_A_TX_ID.toLowerCase();
  const isCanonicalFlowB = invitation?.transactionId?.toLowerCase() === CANONICAL_FLOW_B_TX_ID.toLowerCase();
  const isHistoricalBenchmark = isCanonicalFlowA || isCanonicalFlowB;

  // Derive effective status
  const effectiveStatus = onchainState
    ? onchainState.stateName === 'PROPOSED'
      ? 'PROPOSED'
      : onchainState.stateName
    : invitation?.status || 'PROPOSED';

  const isRatified = effectiveStatus === 'AGREED' || (onchainState && onchainState.stateName !== 'PROPOSED' && onchainState.stateName !== 'DRAFT');
  const isAwaitingAction = effectiveStatus === 'PROPOSED' && !isHistoricalBenchmark;

  // 1. Action: Agree onchain via agreeTransaction(transactionId)
  const handleAgree = async () => {
    if (!invitation) return;
    setAcceptError(null);
    setAcceptTxHash(null);
    setAcceptPendingHash(null);

    if (isHistoricalBenchmark) {
      setAcceptError('This transaction is an immutable historical demo benchmark. It cannot be mutated or re-agreed.');
      return;
    }

    if (!wallet.isConnected) {
      await wallet.connect();
      return;
    }
    if (!wallet.isMonadTestnet) {
      await wallet.switchNetwork();
      return;
    }

    if (!isDesignatedSellerConnected) {
      setAcceptError(
        `Strict Role Isolation: Connected wallet (${wallet.address?.slice(0, 6)}...${wallet.address?.slice(-4)}) is not the designated Seller (${invitation.intendedReceiverWallet.slice(0, 6)}...${invitation.intendedReceiverWallet.slice(-4)}). In Monad smart contracts, only the designated seller can call agreeTransaction().`
      );
      return;
    }

    setIsAccepting(true);
    try {
      // 1. Broadcast agreeTransaction to Monad Metropolis Testnet
      const txHash = await client.agreeTransaction(invitation.transactionId);
      setAcceptPendingHash(txHash);

      // 2. Wait for block confirmation
      const receipt = await client.waitForConfirmation(txHash);
      if (!receipt || receipt.status !== 1) {
        throw new Error(`Transaction reverted on Monad Testnet (hash: ${txHash}). Execution failed in block ${receipt?.blockNumber ?? 'unknown'}.`);
      }

      // 3. Confirm onchain state is AGREED
      const updatedState = await client.getOnchainTransactionState(invitation.transactionId);
      if (updatedState !== 'AGREED') {
        throw new Error(`State verification failed: expected AGREED, authoritative onchain state is ${updatedState}.`);
      }

      setAcceptTxHash(txHash);
      setAcceptPendingHash(null);

      // 4. Generate cryptographic mutation authorization (EIP-191)
      const nonce = `nonce_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      const expiresAt = Date.now() + 5 * 60 * 1000;
      const action = 'MUTATION:STATUS_AGREED';
      const authMessage = buildMutationAuthMessage({
        invitationCode: code,
        action,
        nonce,
        expiresAt,
      });
      const signature = await wallet.signMessage(authMessage);

      // 5. Update offchain Redis status with verified authorization
      const patchRes = await fetch(`/api/invitations/${code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'AGREED',
          onchainTxHash: txHash,
          auth: {
            signature,
            nonce,
            expiresAt,
            action,
          },
        }),
      });
      const patchData = await patchRes.json();
      if (!patchRes.ok || !patchData.success) {
        console.warn('Failed to update offchain Redis agreement state:', patchData.error);
      }

      // Refresh local view
      await fetchInvitation();
      if (invitation.transactionId) {
        await reconcileOnchain(invitation.transactionId);
      }
    } catch (err: unknown) {
      setAcceptPendingHash(null);
      setAcceptTxHash(null);
      const msg = err instanceof Error ? err.message : 'Transaction failed on Monad';
      if (msg.includes('0x406c311e') || msg.toLowerCase().includes('unauthorizedactor')) {
        setAcceptError('UnauthorizedActor: Connected wallet is not the authorized seller for this transaction. Only the designated seller can call agreeTransaction().');
      } else if (msg.includes('0x6b46fcbe') || msg.toLowerCase().includes('invalidstatetransition')) {
        setAcceptError('InvalidStateTransition: Transaction is not in PROPOSED state onchain (it may already be agreed or settled).');
      } else {
        setAcceptError(msg);
      }
    } finally {
      setIsAccepting(false);
    }
  };

  // 2. Action: Submit versioned counter-proposal
  const handleCounterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitation) return;
    setCounterError(null);
    setIsSubmittingCounter(true);

    try {
      if (!wallet.isConnected) {
        await wallet.connect();
      }

      const counterPayload = {
        parentInvitationCode: code,
        initiatorWallet: invitation.intendedReceiverWallet, // counterparty becomes the initiator of the counter
        intendedReceiverWallet: invitation.initiatorWallet, // original initiator becomes counterparty
        proposal: {
          title: `${invitation.proposal.title} (Counter-Offer)`,
          description: counterNote,
          amount: counterAmount || invitation.proposal.amount,
          asset: invitation.proposal.asset || 'MON',
          deadlineDays: Number(counterDeadline) || invitation.proposal.deadlineDays,
          termsText: `${invitation.proposal.termsText}\n\n[Counter-Proposal by Seller]: ${counterNote} (Window: ${counterDeadline} days, Escrow: ${counterAmount} MON)`,
          evidenceRequirements: invitation.proposal.evidenceRequirements,
        },
        roles: {
          buyer: invitation.roles.buyer,
          seller: invitation.roles.seller,
          verifier: invitation.roles.verifier,
        },
      };

      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(counterPayload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit counter-proposal.');
      }

      setIsCounterModalOpen(false);
      // Navigate to the newly created versioned counter invitation page
      router.push(`/receive/${data.invitationCode}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error submitting counter-offer';
      setCounterError(msg);
    } finally {
      setIsSubmittingCounter(false);
    }
  };

  // 3. Action: Decline invitation
  const handleDecline = async () => {
    if (!invitation) return;
    if (!window.confirm('Are you sure you want to decline this commercial proposal? This will mark the invitation as DECLINED.')) {
      return;
    }
    setDeclineError(null);
    setIsDeclining(true);
    try {
      if (!wallet.isConnected) {
        await wallet.connect();
      }

      // Generate cryptographic mutation authorization (EIP-191)
      const nonce = `nonce_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      const expiresAt = Date.now() + 5 * 60 * 1000;
      const action = 'MUTATION:STATUS_DECLINED';
      const authMessage = buildMutationAuthMessage({
        invitationCode: code,
        action,
        nonce,
        expiresAt,
      });
      const signature = await wallet.signMessage(authMessage);

      const res = await fetch(`/api/invitations/${code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'DECLINED',
          auth: {
            signature,
            nonce,
            expiresAt,
            action,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to decline invitation.');
      }
      await fetchInvitation();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to decline proposal.';
      setDeclineError(msg);
    } finally {
      setIsDeclining(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#07080d] text-gray-100 py-20 px-4 flex flex-col items-center justify-center font-mono">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4" />
        <div className="text-gray-300 text-sm">Resolving Invitation {code} from Persistent Store...</div>
      </div>
    );
  }

  if (fetchError || !invitation) {
    return (
      <div className="min-h-screen bg-[#07080d] text-gray-100 py-16 px-4 font-sans">
        <div className="max-w-xl mx-auto p-8 rounded-2xl bg-gray-900/80 border border-red-500/50 shadow-2xl space-y-5 text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-red-950/80 border border-red-500 flex items-center justify-center text-red-400 text-xl font-bold">
            !
          </div>
          <h2 className="text-2xl font-bold text-white">Invitation Not Found</h2>
          <p className="text-sm text-gray-300 font-mono">
            {fetchError || `Invitation code "${code}" could not be resolved from Upstash Redis.`}
          </p>
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/receive"
              className="py-2.5 px-5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold transition"
            >
              Try Another Code
            </Link>
            <Link
              href="/requests"
              className="py-2.5 px-5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 font-mono text-xs font-bold transition"
            >
              Go to Receiver Inbox
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07080d] text-gray-100 py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between text-xs font-mono text-gray-400 border-b border-gray-800 pb-4">
          <div className="flex items-center gap-2">
            <Link href="/requests" className="hover:text-purple-300 transition">
              ← Requests Inbox
            </Link>
            <span>/</span>
            <span className="text-gray-200 font-bold">Receive Proposal</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Status:</span>
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                isRatified
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500'
                  : effectiveStatus === 'DECLINED'
                  ? 'bg-red-950 text-red-300 border border-red-500'
                  : effectiveStatus === 'COUNTERED'
                  ? 'bg-amber-950 text-amber-300 border border-amber-500'
                  : 'bg-purple-950 text-purple-300 border border-purple-500 animate-pulse'
              }`}
            >
              {isRatified ? '✓ RATIFIED AGREEMENT' : effectiveStatus}
            </span>
          </div>
        </div>

        {/* Counter-Proposal Version Header Notice if applicable */}
        {invitation.version > 1 && (
          <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/60 font-mono text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-amber-300 font-bold uppercase">
                VERSIONED COUNTER-PROPOSAL ({invitation.invitationCode})
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-900 text-amber-200 text-[10px] font-bold">
                VERSION {invitation.version}
              </span>
            </div>
            <p className="text-gray-300 text-[11px]">
              This proposal is a counter-offer originating from parent invitation{' '}
              {invitation.parentInvitationCode && (
                <Link
                  href={`/receive/${invitation.parentInvitationCode}`}
                  className="text-purple-300 underline font-bold"
                >
                  {invitation.parentInvitationCode}
                </Link>
              )}
              . The parent record remains archived as COUNTERED and is not mutated.
            </p>
          </div>
        )}

        {/* THREE-TIER IDENTIFIER SEPARATION CARD */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-950/30 via-gray-900 to-purple-950/20 border border-purple-800/60 space-y-3 font-mono">
          <div className="flex items-center justify-between text-xs">
            <span className="text-purple-300 font-bold uppercase tracking-wider">
              THREE-TIER IDENTIFIER SEPARATION
            </span>
            <span className="text-[10px] text-gray-500">Cross-Device Resolvable</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {/* Tier 1: Canonical Human Invitation Code */}
            <div className="p-3 bg-black/60 rounded-xl border border-purple-500/50 space-y-1">
              <div className="text-[10px] text-purple-400 uppercase font-bold">
                1. HUMAN INVITATION CODE
              </div>
              <div className="text-lg font-bold text-white tracking-wider flex items-center justify-between">
                <span>{invitation.invitationCode}</span>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(invitation.invitationCode)}
                  className="text-[10px] px-2 py-0.5 rounded bg-purple-900/60 hover:bg-purple-800 text-purple-200"
                >
                  Copy
                </button>
              </div>
              <div className="text-[10px] text-gray-400">Opaque link identifier</div>
            </div>

            {/* Tier 2: Escrow bytes32 transactionId */}
            <div className="p-3 bg-black/60 rounded-xl border border-blue-500/40 space-y-1">
              <div className="text-[10px] text-blue-400 uppercase font-bold">
                2. ESCROW TRANSACTION ID (bytes32)
              </div>
              <div className="text-xs font-bold text-blue-200 truncate select-all">
                {invitation.transactionId}
              </div>
              <div className="text-[10px] text-gray-400">
                {isHistoricalBenchmark ? 'Benchmark Demo ID' : 'Fresh cryptographically generated'}
              </div>
            </div>

            {/* Tier 3: EVM Transaction Hash */}
            <div className="p-3 bg-black/60 rounded-xl border border-emerald-500/40 space-y-1">
              <div className="text-[10px] text-emerald-400 uppercase font-bold">
                3. EVM CONTRACT TX HASH
              </div>
              <div className="text-xs font-bold text-emerald-200 truncate">
                {invitation.onchainTxHash ? (
                  <a
                    href={`https://testnet.monadvision.com/tx/${invitation.onchainTxHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline flex items-center gap-1"
                  >
                    <span>{invitation.onchainTxHash.slice(0, 10)}...{invitation.onchainTxHash.slice(-8)}</span>
                    <span className="text-[10px]">↗</span>
                  </a>
                ) : (
                  <span className="text-gray-500">Pending Onchain Broadcast</span>
                )}
              </div>
              <div className="text-[10px] text-gray-400">Monad Metropolis Testnet</div>
            </div>
          </div>
        </div>

        {/* Main Proposal Card */}
        <div className="p-6 rounded-2xl bg-gray-900/70 border border-gray-800 space-y-6">
          <div>
            <div className="text-xs font-mono text-purple-400 font-bold uppercase mb-1">
              COMMERCIAL PROPOSAL DETAILS
            </div>
            <h1 className="text-2xl font-bold text-white">{invitation.proposal.title}</h1>
            <p className="text-sm text-gray-300 font-mono mt-2 leading-relaxed whitespace-pre-wrap">
              {invitation.proposal.description}
            </p>
          </div>

          {/* Three-Sided Participant Architecture */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-black/40 p-4 rounded-xl border border-gray-800 font-mono text-xs">
            <div className="space-y-1">
              <span className="text-[10px] text-purple-400 uppercase tracking-wide">
                INITIATOR (BUYER)
              </span>
              <div className="text-white font-bold text-sm">
                {invitation.initiatorWallet.slice(0, 6)}...{invitation.initiatorWallet.slice(-4)}
              </div>
              <div className="text-[11px] text-gray-400 truncate">
                <code>{invitation.initiatorWallet}</code>
              </div>
              {isDesignatedBuyerConnected && (
                <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] bg-purple-950 text-purple-300 border border-purple-700">
                  Connected as Buyer
                </span>
              )}
            </div>

            <div className="space-y-1 border-t md:border-t-0 md:border-l border-gray-800 pt-3 md:pt-0 md:pl-4">
              <span className="text-[10px] text-blue-400 uppercase tracking-wide">
                DESIGNATED COUNTERPARTY (SELLER)
              </span>
              <div className="text-white font-bold text-sm">
                {invitation.intendedReceiverWallet.slice(0, 6)}...{invitation.intendedReceiverWallet.slice(-4)}
              </div>
              <div className="text-[11px] text-gray-400 truncate">
                <code>{invitation.intendedReceiverWallet}</code>
              </div>
              {isDesignatedSellerConnected ? (
                <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700 font-bold">
                  ✓ Designated Seller Connected
                </span>
              ) : (
                <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] bg-amber-950 text-amber-300 border border-amber-700">
                  Seller Signature Required
                </span>
              )}
            </div>

            <div className="space-y-1 border-t md:border-t-0 md:border-l border-gray-800 pt-3 md:pt-0 md:pl-4">
              <span className="text-[10px] text-emerald-400 uppercase tracking-wide">
                DESIGNATED INDEPENDENT VERIFIER
              </span>
              <div className="text-white font-bold text-sm">Accredited Inspection</div>
              <div className="text-[11px] text-gray-400 truncate">
                <code>{invitation.roles.verifier}</code>
              </div>
              <div className="text-emerald-400 text-[10px]">
                Role: PASS/FAIL Attestation
              </div>
            </div>
          </div>

          {/* Commercial Terms Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
            <div className="p-3 bg-black/40 rounded-xl border border-gray-800">
              <span className="text-gray-400 text-[10px] block">ESCROW CAPITAL:</span>
              <span className="text-emerald-400 font-bold text-base">
                {invitation.proposal.amount} {invitation.proposal.asset || 'MON'}
              </span>
              <span className="text-[10px] text-gray-500 block">Locked upon mutual agreement</span>
            </div>

            <div className="p-3 bg-black/40 rounded-xl border border-gray-800">
              <span className="text-gray-400 text-[10px] block">INSPECTION WINDOW:</span>
              <span className="text-white font-bold text-base">
                {invitation.proposal.deadlineDays} Days
              </span>
              <span className="text-[10px] text-gray-500 block">Depot Staging &amp; Verification</span>
            </div>

            <div className="p-3 bg-black/40 rounded-xl border border-gray-800">
              <span className="text-gray-400 text-[10px] block">TERMS HASH (keccak256):</span>
              <div className="text-cyan-300 font-bold text-[11px] truncate select-all">
                {invitation.proposal.termsHash}
              </div>
              <span className="text-[10px] text-gray-500 block">Cryptographic content integrity</span>
            </div>
          </div>

          {/* Mandatory Evidence Requirements */}
          {invitation.proposal.evidenceRequirements && invitation.proposal.evidenceRequirements.length > 0 && (
            <div className="p-4 rounded-xl bg-black/40 border border-gray-800 font-mono text-xs space-y-2">
              <span className="text-gray-400 text-[10px] uppercase font-bold block">
                MANDATORY EVIDENCE REQUIREMENTS FOR ESCROW RELEASE:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                {invitation.proposal.evidenceRequirements.map((reqItem, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-gray-300">
                    <span className="text-emerald-400">✓</span>
                    <span>{reqItem}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RATIFIED MUTUAL AGREEMENT BANNER */}
          {isRatified && (
            <div className="p-5 rounded-xl bg-emerald-950/30 border border-emerald-600/70 font-mono text-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                  <span>✓ MUTUAL AGREEMENT RATIFIED</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-900 text-emerald-300 text-[10px] font-bold">
                  ONCHAIN AGREED
                </span>
              </div>
              <p className="text-gray-300 text-xs font-sans">
                Both counterparty wallets have established bilateral consent. Escrow deposit is authorized under the VeriqoMesh Monad smart contract state machine.
              </p>
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <Link
                  href={`/transactions/${invitation.transactionId}`}
                  className="py-3 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-black font-bold font-mono text-xs transition shadow-lg shadow-emerald-950 flex items-center gap-2"
                >
                  <span>ENTER TRANSACTION ROOM &amp; FUND ESCROW</span>
                  <span>→</span>
                </Link>
              </div>
            </div>
          )}

          {/* COUNTER-PROPOSAL OR DECLINED STATE BANNER */}
          {effectiveStatus === 'DECLINED' && (
            <div className="p-4 rounded-xl bg-red-950/30 border border-red-600/70 font-mono text-xs text-red-200">
              <span className="font-bold">Proposal Declined: </span>
              This commercial offer was declined by the counterparty and is no longer actionable.
            </div>
          )}

          {effectiveStatus === 'COUNTERED' && invitation.counterInvitationCode && (
            <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-600/70 font-mono text-xs text-amber-200 flex items-center justify-between">
              <div>
                <span className="font-bold">Counter-Proposal Active: </span>
                A counter-offer was submitted under code{' '}
                <strong className="text-white">{invitation.counterInvitationCode}</strong>.
              </div>
              <Link
                href={`/receive/${invitation.counterInvitationCode}`}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-black font-bold rounded text-xs transition"
              >
                View Counter-Offer →
              </Link>
            </div>
          )}

          {/* ACTION SECTION FOR AWAITING PROPOSALS */}
          {isAwaitingAction && (
            <div className="pt-4 border-t border-gray-800 space-y-4">
              {!isConnected ? (
                <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-600/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
                  <div className="text-blue-200">
                    Connect your wallet (<code className="text-white font-bold">{invitation.intendedReceiverWallet.slice(0, 6)}...{invitation.intendedReceiverWallet.slice(-4)}</code>) to sign and ratify this agreement on Monad Testnet.
                  </div>
                  <button
                    onClick={() => wallet.connect()}
                    className="py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition whitespace-nowrap"
                  >
                    Connect Wallet
                  </button>
                </div>
              ) : !wallet.isMonadTestnet ? (
                <div className="p-4 rounded-xl bg-red-950/40 border border-red-600/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
                  <div className="text-red-200">
                    Your wallet is connected to Chain ID {wallet.chainId || 'unknown'}. Please switch to Monad Metropolis Testnet (10143).
                  </div>
                  <button
                    onClick={() => wallet.switchNetwork()}
                    className="py-2 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition whitespace-nowrap"
                  >
                    Switch Network
                  </button>
                </div>
              ) : !isDesignatedSellerConnected ? (
                <div className="p-4 rounded-xl bg-amber-950/50 border border-amber-600/60 font-mono text-xs space-y-2">
                  <div className="flex items-center gap-2 text-amber-300 font-bold uppercase">
                    <span>⚠️</span>
                    <span>Role Isolation Notice</span>
                  </div>
                  <p className="text-gray-300 text-[11px] leading-relaxed">
                    Connected wallet (<code className="text-amber-200 font-bold">{wallet.address}</code>) is not the designated Seller (<code className="text-blue-300 font-bold">{invitation.intendedReceiverWallet}</code>).
                    In the Monad smart contract state machine, only the designated seller address can call <code className="text-white">agreeTransaction()</code>.
                  </p>
                  <div className="text-[10px] text-gray-400">
                    Switch to the counterparty account in your browser wallet to enable agreement actions.
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-xs font-mono text-gray-300">
                    As the authorized counterparty (<code className="text-emerald-300 font-bold">{wallet.address?.slice(0, 6)}...{wallet.address?.slice(-4)}</code>), select your action:
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={handleAgree}
                      disabled={isAccepting}
                      className={`py-3 px-6 rounded-xl font-mono text-xs font-bold transition shadow-lg flex items-center gap-2 ${
                        isAccepting
                          ? 'bg-purple-900 text-purple-200 cursor-wait'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-black shadow-emerald-950'
                      }`}
                    >
                      {isAccepting ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-purple-300 border-t-transparent rounded-full animate-spin" />
                          <span>{acceptPendingHash ? 'AWAITING ONCHAIN CONFIRMATION...' : 'SIGNING IN WALLET...'}</span>
                        </>
                      ) : (
                        <>
                          <span>SIGN &amp; RATIFY AGREEMENT (agreeTransaction)</span>
                          <span>✓</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => setIsCounterModalOpen(true)}
                      className="py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-black font-mono text-xs font-bold transition"
                    >
                      Propose Counter
                    </button>

                    <button
                      onClick={handleDecline}
                      disabled={isDeclining}
                      className="py-3 px-4 rounded-xl bg-gray-800 hover:bg-red-950 hover:text-red-300 text-gray-300 font-mono text-xs font-bold transition border border-gray-700"
                    >
                      {isDeclining ? 'Declining...' : 'Decline Proposal'}
                    </button>
                  </div>

                  {acceptPendingHash && (
                    <div className="p-3 bg-blue-950/60 border border-blue-500/60 rounded-lg text-xs font-mono text-blue-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                        <span>Broadcasting agreeTransaction. Awaiting block inclusion...</span>
                      </div>
                      <a
                        href={`https://testnet.monadvision.com/tx/${acceptPendingHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-300 underline font-bold"
                      >
                        View on MonadVision ↗
                      </a>
                    </div>
                  )}

                  {acceptError && (
                    <div className="p-3 rounded-lg bg-red-950/60 border border-red-500/60 text-xs font-mono text-red-200">
                      <span className="font-bold text-red-400">Error: </span>
                      {acceptError}
                    </div>
                  )}

                  {declineError && (
                    <div className="p-3 rounded-lg bg-red-950/60 border border-red-500/60 text-xs font-mono text-red-200">
                      <span className="font-bold text-red-400">Decline Error: </span>
                      {declineError}
                    </div>
                  )}

                  {acceptTxHash && (
                    <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-500/60 text-xs font-mono text-emerald-200 flex items-center justify-between">
                      <span>✓ Agreement ratified on Monad Metropolis Testnet!</span>
                      <a
                        href={`https://testnet.monadvision.com/tx/${acceptTxHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-purple-300 underline font-bold"
                      >
                        View on MonadVision ↗
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Counter Modal */}
          {isCounterModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm font-mono text-xs">
              <div className="max-w-lg w-full p-6 rounded-2xl bg-gray-950 border border-amber-600/70 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                  <span className="text-amber-300 font-bold uppercase text-sm">
                    Propose Versioned Counter-Offer
                  </span>
                  <button
                    onClick={() => setIsCounterModalOpen(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleCounterSubmit} className="space-y-4">
                  <div>
                    <label className="block text-gray-400 text-[11px] mb-1">
                      Counter Reason &amp; Proposed Adjustments
                    </label>
                    <textarea
                      rows={3}
                      value={counterNote}
                      onChange={(e) => setCounterNote(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white text-xs focus:border-amber-500 focus:outline-none"
                      placeholder="Explain requested modifications to inspection days or escrow capital..."
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-400 text-[11px] mb-1">
                        Proposed Inspection (Days)
                      </label>
                      <input
                        type="number"
                        value={counterDeadline}
                        onChange={(e) => setCounterDeadline(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white text-xs focus:border-amber-500 focus:outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-gray-400 text-[11px] mb-1">
                        Proposed Escrow Capital (MON)
                      </label>
                      <input
                        type="text"
                        value={counterAmount}
                        onChange={(e) => setCounterAmount(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white text-xs focus:border-amber-500 focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-black/50 rounded-lg border border-amber-900/50 text-[10px] text-gray-400">
                    Submitting this counter-offer generates a new versioned invitation (<code className="text-amber-300">{code}-v{(invitation.version || 1) + 1}</code>) stored in Upstash Redis, while preserving the parent proposal intact.
                  </div>

                  {counterError && (
                    <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-500/60 text-red-200 text-[11px]">
                      {counterError}
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsCounterModalOpen(false)}
                      className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 text-xs hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingCounter}
                      className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-black font-bold text-xs flex items-center gap-1.5"
                    >
                      {isSubmittingCounter ? (
                        <>
                          <span className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
                          <span>Creating Counter...</span>
                        </>
                      ) : (
                        <span>Publish Counter-Proposal →</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
