'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import {
  useDemoNetwork,
  DealRequest,
  CANONICAL_TESTNET_TX_ID,
  CANONICAL_RESOLVER_ADDRESS,
  FRESH_LIVE_TESTNET_TX_ID,
  FRESH_LIVE_TESTNET_TERMS_HASH,
  APPROVED_OPERATOR_VERIFIER_ADDRESS,
  TARGET_SELLER_ADDRESS,
} from '../../context/DemoNetworkContext';
import {
  CANONICAL_FLOW_A_TX_ID,
  CANONICAL_FLOW_B_TX_ID,
  buildMutationAuthMessage,
  isBenchmarkRequest,
  isAwaitingReceiverAction,
} from '../../lib/invitation-utils';

import { PersistentInvitation } from '../../lib/invitation-types';
import { TransactionState } from '@trustmesh/types';

export default function RequestsPage() {
  const router = useRouter();
  const {
    role,
    switchRole,
    requests,
    acceptDealRequest,
    counterDealRequest,
    declineDealRequest,
    wallet,
    client,
  } = useDemoNetwork();

  // Active section tab: 'AWAITING' vs 'PROCESSED' vs 'ALL'
  const [activeTab, setActiveTab] = useState<'AWAITING' | 'PROCESSED' | 'ALL'>('AWAITING');

  // Counter modal state
  const [counterNote, setCounterNote] = useState('Propose 21 days for physical delivery inspection');
  const [counterDeadline, setCounterDeadline] = useState(21);
  const [counterAmount, setCounterAmount] = useState('0.0012');
  const [activeCounterModal, setActiveCounterModal] = useState<string | null>(null);
  const [isSubmittingCounter, setIsSubmittingCounter] = useState(false);

  // Onchain Acceptance State
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [acceptPendingHash, setAcceptPendingHash] = useState<string | null>(null);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [acceptTxHash, setAcceptTxHash] = useState<string | null>(null);

  // Persistent invitations loaded from Upstash Redis
  const [persistentInvitations, setPersistentInvitations] = useState<PersistentInvitation[]>([]);
  const [isLoadingPersistent, setIsLoadingPersistent] = useState(false);

  // Authoritative Onchain State Reconciliation from Monad Testnet RPC
  const [onchainTxMap, setOnchainTxMap] = useState<
    Record<
      string,
      {
        stateName: TransactionState;
        termsHash: string;
        buyer: string;
        seller: string;
        verifier: string;
        totalAmountMon: string;
        fundedAt: bigint;
      }
    >
  >({});
  const [isRefreshingOnchain, setIsRefreshingOnchain] = useState(false);

  // 1. Fetch persistent invitations from Upstash Redis API
  const fetchPersistentInvitations = useCallback(async () => {
    setIsLoadingPersistent(true);
    try {
      // Query for connected wallet if available; otherwise for default demo seller
      const targetAddress = wallet.address || TARGET_SELLER_ADDRESS;
      const res = await fetch(`/api/invitations?receiver=${targetAddress}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.invitations)) {
        setPersistentInvitations(data.invitations);
      }
    } catch (err) {
      console.error('Failed to load persistent invitations from Redis:', err);
    } finally {
      setIsLoadingPersistent(false);
    }
  }, [wallet.address]);

  useEffect(() => {
    fetchPersistentInvitations();
  }, [fetchPersistentInvitations]);

  // 2. Merge local demo requests with Redis persistent invitations
  const allRequests = useMemo(() => {
    const combined: (DealRequest & { invitationCode?: string; version?: number; parentInvitationCode?: string })[] = [
      ...requests,
    ];

    for (const inv of persistentInvitations) {
      // Deduplicate by transactionId or invitationCode
      const exists = combined.some(
        (r) =>
          (r.transactionId && inv.transactionId && r.transactionId.toLowerCase() === inv.transactionId.toLowerCase()) ||
          r.id === inv.invitationCode
      );

      if (!exists) {
        combined.unshift({
          id: inv.invitationCode,
          title: inv.proposal.title,
          initiator: `${inv.initiatorWallet.slice(0, 6)}...${inv.initiatorWallet.slice(-4)}`,
          initiatorWallet: inv.initiatorWallet,
          receiver: `${inv.intendedReceiverWallet.slice(0, 6)}...${inv.intendedReceiverWallet.slice(-4)}`,
          receiverWallet: inv.intendedReceiverWallet,
          deliverable: inv.proposal.title,
          location: 'Designated Delivery Depot',
          deadlineDays: inv.proposal.deadlineDays,
          escrowAmountMon: inv.proposal.amount,
          evidenceRequirements: inv.proposal.evidenceRequirements || [],
          verifierAddress: inv.roles.verifier,
          aiPolicy: {
            maxSpend: inv.proposal.amount,
            autoExecute: false,
            humanEscalation: true,
          },
          status:
            inv.status === 'AGREED'
              ? 'AGREEMENT_ACTIVE'
              : inv.status === 'COUNTERED'
              ? 'COUNTERED'
              : inv.status === 'DECLINED'
              ? 'DECLINED'
              : 'AWAITING_RECEIVER_ACCEPTANCE',
          isOnchain: Boolean(inv.transactionId && inv.transactionId.startsWith('0x')),
          transactionId: inv.transactionId,
          onchainTxHash: inv.onchainTxHash,
          invitationCode: inv.invitationCode,
          version: inv.version,
          parentInvitationCode: inv.parentInvitationCode,
          createdAt: new Date(inv.createdAt).toISOString().split('T')[0],
        });
      } else {
        // Tag invitationCode onto existing request if matched
        const existingIdx = combined.findIndex(
          (r) =>
            r.transactionId &&
            inv.transactionId &&
            r.transactionId.toLowerCase() === inv.transactionId.toLowerCase()
        );
        if (existingIdx !== -1) {
          combined[existingIdx].invitationCode = inv.invitationCode;
        }
      }
    }

    return combined;
  }, [requests, persistentInvitations]);

  // 3. Reconcile onchain transaction states
  const refreshOnchainRequests = useCallback(async () => {
    setIsRefreshingOnchain(true);
    try {
      const onchainReqs = allRequests.filter(
        (r) => r.isOnchain && r.transactionId && r.transactionId.startsWith('0x') && r.transactionId.length === 66
      );
      const updates: Record<
        string,
        {
          stateName: TransactionState;
          termsHash: string;
          buyer: string;
          seller: string;
          verifier: string;
          totalAmountMon: string;
          fundedAt: bigint;
        }
      > = {};

      await Promise.all(
        onchainReqs.map(async (r) => {
          try {
            if (!r.transactionId) return;
            const onTx = await client.getOnchainTransaction(r.transactionId);
            if (onTx && onTx.buyer !== ethers.ZeroAddress) {
              updates[r.transactionId] = {
                stateName: onTx.stateName,
                termsHash: onTx.termsHash,
                buyer: onTx.buyer,
                seller: onTx.seller,
                verifier: onTx.verifier,
                totalAmountMon: ethers.formatEther(onTx.totalAmount),
                fundedAt: onTx.fundedAt,
              };
            }
          } catch {
            // Ignore offline or nonexistent tx query
          }
        })
      );

      setOnchainTxMap((prev) => ({ ...prev, ...updates }));
    } finally {
      setIsRefreshingOnchain(false);
    }
  }, [client, allRequests]);

  useEffect(() => {
    refreshOnchainRequests();
  }, [refreshOnchainRequests]);

  // Helper: check if record is an immutable historical demo benchmark
  const isBenchmark = (r: DealRequest) => isBenchmarkRequest(r);

  // Helper: check if request is ratified onchain or offchain
  const isRequestRatified = (r: DealRequest) => {
    const onchain = r.transactionId ? onchainTxMap[r.transactionId] : null;
    if (onchain && onchain.stateName !== 'PROPOSED' && onchain.stateName !== 'DRAFT') {
      return true;
    }
    return r.status === 'AGREEMENT_ACTIVE';
  };

  // Helper: check if request is awaiting receiver action
  const isAwaitingAction = (r: DealRequest) => isAwaitingReceiverAction(r, onchainTxMap);


  // 4. Strict Wallet & Status Partitioning
  // A. Incoming Requests: Awaiting Your Action
  const incomingRequests = useMemo(() => {
    return allRequests.filter((r) => {
      // Must be awaiting action and NOT benchmark
      if (!isAwaitingAction(r)) return false;

      // Strict wallet filter:
      // If wallet is connected, only show where wallet is the receiver
      if (wallet.isConnected && wallet.address) {
        return r.receiverWallet?.toLowerCase() === wallet.address.toLowerCase();
      }

      // If demo perspective is active and wallet not connected, show target seller
      if (role === 'RECEIVER') {
        return (
          r.receiverWallet?.toLowerCase() === TARGET_SELLER_ADDRESS.toLowerCase()
        );
      }

      return true;
    });
  }, [allRequests, wallet.isConnected, wallet.address, role, onchainTxMap]);

  // B. Processed Requests: Ratified, Settled, Countered, Declined, Benchmarks
  const processedRequests = useMemo(() => {
    return allRequests.filter((r) => !isAwaitingAction(r));
  }, [allRequests, onchainTxMap]);

  // Handle agreeTransaction
  const handleAccept = async (req: DealRequest & { invitationCode?: string }) => {
    setAcceptError(null);
    setAcceptTxHash(null);
    setAcceptPendingHash(null);

    if (isBenchmark(req)) {
      setAcceptError('Canonical testnet record is immutable read-only audit data. Mutation actions are permanently disabled.');
      return;
    }

    if (req.isOnchain) {
      if (!wallet.isConnected) {
        await wallet.connect();
        return;
      }
      if (!wallet.isMonadTestnet) {
        await wallet.switchNetwork();
        return;
      }
      if (wallet.address && req.receiverWallet && wallet.address.toLowerCase() !== req.receiverWallet.toLowerCase()) {
        setAcceptError(
          `Strict Role Isolation: Connected wallet (${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}) is not the designated Seller (${req.receiverWallet.slice(0, 6)}...${req.receiverWallet.slice(-4)}). In Monad smart contracts, only the designated seller can call agreeTransaction().`
        );
        return;
      }

      setAcceptingId(req.id);
      try {
        // 1. Broadcast transaction via connected seller wallet
        const txHash = await client.agreeTransaction(req.transactionId!);
        setAcceptPendingHash(txHash);

        // 2. Wait for block inclusion and receipt confirmation
        const receipt = await client.waitForConfirmation(txHash);
        if (!receipt || receipt.status !== 1) {
          throw new Error(`Transaction reverted on Monad Testnet (hash: ${txHash}). Execution failed in block ${receipt?.blockNumber ?? 'unknown'}.`);
        }

        // 3. Reread authoritative onchain state from contract
        const onchainState = await client.getOnchainTransactionState(req.transactionId!);
        if (onchainState !== 'AGREED') {
          throw new Error(`State verification failed: expected AGREED, authoritative onchain state is ${onchainState}.`);
        }

        setAcceptTxHash(txHash);
        setAcceptPendingHash(null);
        acceptDealRequest(req.id);

        // 4. Update offchain Redis status if invitationCode exists
        if (req.invitationCode) {
          const nonce = `nonce_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
          const expiresAt = Date.now() + 5 * 60 * 1000;
          const action = 'MUTATION:STATUS_AGREED';
          const authMessage = buildMutationAuthMessage({
            invitationCode: req.invitationCode,
            action,
            nonce,
            expiresAt,
          });
          const signature = await wallet.signMessage(authMessage);

          await fetch(`/api/invitations/${req.invitationCode}`, {
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
        }

        await refreshOnchainRequests();
        await fetchPersistentInvitations();
      } catch (err: unknown) {
        setAcceptPendingHash(null);
        setAcceptTxHash(null);
        const msg = err instanceof Error ? err.message : 'Transaction failed or rejected on Monad';
        if (msg.includes('0x406c311e') || msg.toLowerCase().includes('unauthorizedactor')) {
          setAcceptError('UnauthorizedActor: The connected wallet is not the authorized seller for this transaction. Only the seller can sign acceptance.');
        } else if (msg.includes('0x6b46fcbe') || msg.toLowerCase().includes('invalidstatetransition')) {
          setAcceptError('InvalidStateTransition: Transaction is not in PROPOSED state onchain (it may already be agreed or settled).');
        } else {
          setAcceptError(msg);
        }
        await refreshOnchainRequests();
      } finally {
        setAcceptingId(null);
      }
    } else {
      acceptDealRequest(req.id);
    }
  };

  // Handle counter submit
  const handleCounterSubmit = async (req: DealRequest & { invitationCode?: string }) => {
    setIsSubmittingCounter(true);
    try {
      if (req.invitationCode) {
        await fetch('/api/invitations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            parentInvitationCode: req.invitationCode,
            initiatorWallet: req.receiverWallet,
            intendedReceiverWallet: req.initiatorWallet,
            proposal: {
              title: `${req.title} (Counter-Offer)`,
              description: counterNote,
              amount: counterAmount,
              asset: 'MON',
              deadlineDays: Number(counterDeadline),
              termsText: `[Counter-Proposal]: ${counterNote} (Window: ${counterDeadline} days, Escrow: ${counterAmount} MON)`,
              evidenceRequirements: req.evidenceRequirements,
            },
            roles: {
              buyer: req.initiatorWallet,
              seller: req.receiverWallet,
              verifier: req.verifierAddress || APPROVED_OPERATOR_VERIFIER_ADDRESS,
            },
          }),
        });
      }

      counterDealRequest(req.id, counterNote, counterDeadline, counterAmount);
      setActiveCounterModal(null);
      await fetchPersistentInvitations();
    } catch (err) {
      console.error('Error submitting counter:', err);
    } finally {
      setIsSubmittingCounter(false);
    }
  };

  // Handle decline
  const handleDecline = async (req: DealRequest & { invitationCode?: string }) => {
    if (!window.confirm('Are you sure you want to decline this commercial proposal?')) return;
    try {
      if (req.invitationCode) {
        if (!wallet.isConnected) {
          await wallet.connect();
        }
        const nonce = `nonce_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
        const expiresAt = Date.now() + 5 * 60 * 1000;
        const action = 'MUTATION:STATUS_DECLINED';
        const authMessage = buildMutationAuthMessage({
          invitationCode: req.invitationCode,
          action,
          nonce,
          expiresAt,
        });
        const signature = await wallet.signMessage(authMessage);

        await fetch(`/api/invitations/${req.invitationCode}`, {
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
      }
      declineDealRequest(req.id);
      await fetchPersistentInvitations();
    } catch (err) {
      console.error('Error declining request:', err);
    }
  };

  // Render a Deal Request Card
  const renderRequestCard = (
    req: DealRequest & { invitationCode?: string; version?: number; parentInvitationCode?: string },
    isIncomingSection: boolean
  ) => {
    const onchainData = req.isOnchain && req.transactionId ? onchainTxMap[req.transactionId] : null;
    const isHistorical = isBenchmark(req);

    const isOnchainProposed =
      req.isOnchain &&
      (onchainData?.stateName === 'PROPOSED' ||
        (!onchainData && req.transactionId === FRESH_LIVE_TESTNET_TX_ID && !isHistorical));

    const isRatified = isRequestRatified(req);
    const isAwaitingRatification = isAwaitingAction(req);

    const effectiveTermsHash =
      onchainData?.termsHash ||
      (req.transactionId === CANONICAL_TESTNET_TX_ID
        ? '0x6abc2ff972c3d115e4f45da8129035e0536c9786412cf4dab847ff65a917a163'
        : '0xebb931936199ae988129d1eed8501a6ad3311035f0d72dd0e52e0c92454a125f');

    return (
      <div
        key={req.id}
        className={`p-6 rounded-2xl border transition-all ${
          isHistorical
            ? 'bg-gray-950/70 border-purple-900/60 shadow-lg'
            : isRatified
            ? 'bg-gradient-to-b from-[#0a1a14] to-[#070d0a] border-emerald-500/80 shadow-2xl shadow-emerald-950/20'
            : isAwaitingRatification && req.isOnchain
            ? 'bg-gradient-to-b from-[#14120a] to-[#0d0c07] border-amber-500/60 shadow-xl shadow-amber-950/10'
            : 'bg-gray-900/60 border-gray-800 shadow-lg'
        }`}
      >
        {/* Header Info */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800/80 pb-4 mb-5">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 mb-1 font-mono text-xs">
              <span className="text-white font-bold text-sm">{req.id}</span>
              {req.version && req.version > 1 && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-600">
                  VERSION {req.version}
                </span>
              )}
              <span className="text-gray-500">•</span>
              <span className="text-gray-400">Created: {req.createdAt}</span>
              <span className="text-gray-500">•</span>
              {req.isOnchain ? (
                <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-500 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE MONAD TESTNET
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono text-purple-300 bg-purple-950/80 border border-purple-800">
                  SIMULATED DEMO
                </span>
              )}
            </div>

            <h3 className="text-xl font-bold text-white">{req.title}</h3>

            {/* Canonical Invitation Code link */}
            {req.invitationCode && (
              <div className="text-[11px] font-mono text-purple-300 mt-1 flex items-center gap-2">
                <span>Invitation Code:</span>
                <code className="px-2 py-0.5 rounded bg-purple-950/80 border border-purple-800 font-bold select-all">
                  {req.invitationCode}
                </code>
                <Link
                  href={`/receive/${req.invitationCode}`}
                  className="text-purple-400 hover:text-purple-200 underline"
                >
                  Open /receive/{req.invitationCode} ↗
                </Link>
              </div>
            )}

            {req.isOnchain && req.onchainTxHash && (
              <div className="text-[11px] font-mono text-gray-400 mt-1 flex items-center gap-1.5">
                <span>Onchain Init:</span>
                <a
                  href={`https://testnet.monadvision.com/tx/${req.onchainTxHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-purple-300 hover:text-purple-200 underline font-mono"
                >
                  {req.onchainTxHash.slice(0, 10)}...{req.onchainTxHash.slice(-8)} ↗
                </a>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-mono font-bold ${
                isHistorical
                  ? 'bg-purple-950 text-purple-300 border border-purple-600'
                  : isRatified
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                  : isAwaitingRatification
                  ? 'bg-amber-950 text-amber-300 border border-amber-600'
                  : req.status === 'COUNTERED'
                  ? 'bg-amber-950 text-amber-300 border border-amber-600'
                  : req.status === 'DECLINED'
                  ? 'bg-red-950 text-red-300 border border-red-600'
                  : 'bg-purple-950 text-purple-300 border border-purple-600'
              }`}
            >
              {isHistorical
                ? 'CANONICAL DEMO (SETTLED)'
                : isRatified
                ? '✓ MUTUAL AGREEMENT RATIFIED'
                : isAwaitingRatification
                ? 'AWAITING SELLER RATIFICATION'
                : req.status.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        {/* 3-Sided Architecture Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-950/80 p-4 rounded-xl border border-gray-800/80 font-mono text-xs mb-5">
          <div className="space-y-1">
            <span className="text-[10px] text-purple-400 uppercase tracking-wide">INITIATOR (BUYER)</span>
            <div className="text-white font-bold text-sm">{req.initiator}</div>
            <div className="text-gray-400 text-[11px] truncate">
              Wallet: <code>{req.initiatorWallet}</code>
            </div>
          </div>

          <div className="space-y-1 border-t md:border-t-0 md:border-l border-gray-800 pt-3 md:pt-0 md:pl-4">
            <span className="text-[10px] text-blue-400 uppercase tracking-wide">RECEIVER (SELLER)</span>
            <div className="text-white font-bold text-sm">{req.receiver}</div>
            <div className="text-gray-400 text-[11px] truncate">
              Wallet: <code>{req.receiverWallet}</code>
            </div>
            {wallet.isConnected && wallet.address?.toLowerCase() === req.receiverWallet?.toLowerCase() && (
              <span className="text-emerald-400 text-[10px] font-bold block">
                ✓ Connected as Seller
              </span>
            )}
          </div>

          <div className="space-y-1 border-t md:border-t-0 md:border-l border-gray-800 pt-3 md:pt-0 md:pl-4">
            <span className="text-[10px] text-emerald-400 uppercase tracking-wide">DESIGNATED VERIFIER</span>
            <div className="text-white font-bold text-sm">
              {isHistorical ? 'Historical Verifier' : 'Operator-Controlled Verifier'}
            </div>
            <div className="text-gray-400 text-[11px] truncate">
              Wallet: <code className="text-emerald-300">{req.verifierAddress || APPROVED_OPERATOR_VERIFIER_ADDRESS}</code>
            </div>
          </div>
        </div>

        {/* Commercial Terms Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs mb-5">
          <div className="p-3 bg-gray-950/60 rounded-xl border border-gray-800">
            <span className="text-gray-400 text-[10px] block">DELIVERABLE:</span>
            <span className="text-white font-semibold">{req.deliverable}</span>
          </div>
          <div className="p-3 bg-gray-950/60 rounded-xl border border-gray-800">
            <span className="text-gray-400 text-[10px] block">ESCROW CAPITAL:</span>
            <span className="text-emerald-400 font-bold text-sm">{req.escrowAmountMon} MON</span>
            <span className="text-[10px] text-gray-500 block">Monad Testnet</span>
          </div>
          <div className="p-3 bg-gray-950/60 rounded-xl border border-gray-800">
            <span className="text-gray-400 text-[10px] block">INSPECTION DEADLINE:</span>
            <span className="text-white font-semibold">{req.deadlineDays} Days</span>
            <span className="text-[10px] text-gray-500 block">Depot Staging Window</span>
          </div>
        </div>

        {/* Evidence Requirements */}
        <div className="p-4 rounded-xl bg-gray-950/60 border border-gray-800/80 mb-5 font-mono text-xs">
          <span className="text-gray-400 text-[10px] uppercase font-bold block mb-2">
            MANDATORY EVIDENCE REQUIREMENTS FOR ESCROW RELEASE:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            {req.evidenceRequirements.map((reqItem, idx) => (
              <div key={idx} className="flex items-center gap-2 text-gray-300">
                <span className="text-purple-400">✓</span>
                <span>{reqItem}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RATIFIED CARD */}
        {isRatified && (
          <div className="p-5 rounded-xl bg-emerald-950/30 border border-emerald-600/70 mb-5 font-mono text-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                <span>✓ MUTUAL AGREEMENT RATIFIED</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-900 text-emerald-300 text-[10px] font-bold">
                {req.isOnchain ? 'RATIFIED ONCHAIN' : 'RATIFIED'}
              </span>
            </div>
            <div className="text-gray-300 font-sans text-xs">
              Both parties have established bilateral consent. Escrow initialization is authorized under the VeriqoMesh Monad smart contract state machine.
            </div>
            <div className="p-3 bg-black/50 rounded-lg border border-emerald-800/60 space-y-1 text-[11px]">
              <div>Terms Hash: <code className="text-emerald-300 font-mono break-all">{effectiveTermsHash}</code></div>
              <div>Resolver Contract: <code className="text-purple-300 font-mono">{CANONICAL_RESOLVER_ADDRESS}</code></div>
            </div>
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Link
                href={`/transactions/${req.transactionId}`}
                className="py-3 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-black font-bold font-mono text-xs transition shadow-lg shadow-emerald-950 flex items-center gap-2"
              >
                <span>ENTER TRANSACTION ROOM &amp; INITIALIZE ESCROW</span>
                <span className="text-sm">→</span>
              </Link>
            </div>
          </div>
        )}

        {/* PENDING SELLER RATIFICATION CARD */}
        {isAwaitingRatification && req.isOnchain && (
          <div className="p-5 rounded-xl bg-amber-950/20 border border-amber-600/50 mb-5 font-mono text-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                <span>⏳ BILATERAL AGREEMENT PROPOSAL (AWAITING SELLER RATIFICATION)</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-amber-900/80 text-amber-200 text-[10px] font-bold border border-amber-600">
                PROPOSED ONCHAIN (STATE: 1)
              </span>
            </div>
            <div className="text-gray-300 font-sans text-xs">
              The designated Seller must sign and ratify the agreement onchain (calling <code className="text-amber-300 font-mono">agreeTransaction()</code>) before escrow funding is permitted by the smart contract state machine.
            </div>
            <div className="p-3 bg-black/50 rounded-lg border border-amber-800/40 space-y-1 text-[11px]">
              <div>Terms Hash: <code className="text-amber-300 font-mono break-all">{effectiveTermsHash}</code></div>
              <div>Designated Seller: <code className="text-blue-300 font-mono">{req.receiverWallet}</code></div>
              <div>Required Smart Contract Action: <span className="text-purple-300 font-bold">agreeTransaction(bytes32 transactionId)</span></div>
            </div>
          </div>
        )}

        {/* HISTORICAL BENCHMARK NOTICE (Read-only) */}
        {isHistorical && (
          <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-700/60 mb-5 font-mono text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-purple-300 font-bold uppercase">
                CANONICAL TESTNET BENCHMARK RECORD (READ-ONLY)
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-purple-900 text-purple-200">
                SETTLED AUDIT LOG
              </span>
            </div>
            <p className="text-gray-300 text-[11px]">
              This is a canonical public verification benchmark on Monad Metropolis Testnet. All mutation actions (agree, counter, decline) are permanently disabled.
            </p>
            <div className="pt-2">
              <Link
                href={`/transactions/${req.transactionId}`}
                className="py-2 px-4 rounded-xl bg-purple-900 hover:bg-purple-800 text-purple-200 font-mono text-xs font-bold transition inline-flex items-center gap-1.5"
              >
                <span>View Historical Audit Record</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        )}

        {/* COUNTERED OR DECLINED NOTICES */}
        {req.status === 'COUNTERED' && req.counterProposal && (
          <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-600/70 mb-5 font-mono text-xs space-y-2">
            <div className="text-amber-300 font-bold">Counter-Proposal Submitted by Receiver:</div>
            <div className="text-gray-200">Note: {req.counterProposal.note}</div>
            <div className="text-gray-400">
              Proposed Inspection Window: <strong className="text-white">{req.counterProposal.proposedDeadlineDays} days</strong> • Proposed Escrow: <strong className="text-emerald-400">{req.counterProposal.proposedAmountMon} MON</strong>
            </div>
          </div>
        )}

        {req.status === 'DECLINED' && (
          <div className="p-4 rounded-xl bg-red-950/30 border border-red-600/70 mb-5 font-mono text-xs text-red-200">
            <span className="font-bold">Declined: </span>
            This commercial deal request was declined and is no longer active.
          </div>
        )}

        {/* ACTION BUTTONS (Context-Aware by Role and Status — ONLY in Incoming Section & when awaiting ratification) */}
        {isAwaitingRatification && !isHistorical && isIncomingSection && (
          <div className="pt-4 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs font-mono text-gray-400">
              As the designated counterparty, choose your action on this inbound deal request:
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => handleAccept(req)}
                disabled={acceptingId === req.id}
                className={`py-2.5 px-5 rounded-xl font-mono text-xs font-bold transition shadow-md flex items-center gap-1.5 ${
                  acceptingId === req.id
                    ? 'bg-purple-900 text-purple-200 cursor-wait'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-black shadow-emerald-950'
                }`}
              >
                {acceptingId === req.id ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-purple-300 border-t-transparent rounded-full animate-spin" />
                    <span>{acceptPendingHash ? 'AWAITING ONCHAIN CONFIRMATION...' : 'CONFIRMING IN WALLET...'}</span>
                  </>
                ) : (
                  <>
                    <span>{req.isOnchain ? 'SIGN & RATIFY AGREEMENT (agreeTransaction)' : 'ACCEPT TERMS & SIGN AGREEMENT'}</span>
                    <span>✓</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setActiveCounterModal(req.id)}
                className="py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-black font-mono text-xs font-bold transition"
              >
                Propose Counter
              </button>

              <button
                onClick={() => handleDecline(req)}
                className="py-2.5 px-4 rounded-xl bg-gray-800 hover:bg-red-950 hover:text-red-300 text-gray-300 font-mono text-xs font-bold transition border border-gray-700"
              >
                Decline
              </button>
            </div>
          </div>
        )}

        {/* Error / Pending / Success messages for this request */}
        {acceptingId === req.id && acceptPendingHash && (
          <div className="w-full mt-3 p-2.5 bg-blue-950/60 border border-blue-500/60 rounded-lg text-[11px] font-mono text-blue-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <span>Transaction broadcasted. Awaiting block inclusion &amp; state confirmation...</span>
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

        {acceptingId === req.id && acceptError && (
          <div className="w-full mt-3 p-2.5 bg-red-950/60 border border-red-500/60 rounded-lg text-[11px] font-mono text-red-200">
            <span className="font-bold text-red-400">Error: </span>
            {acceptError}
          </div>
        )}

        {acceptingId === req.id && acceptTxHash && (
          <div className="w-full mt-3 p-2.5 bg-emerald-950/60 border border-emerald-500/60 rounded-lg text-[11px] font-mono text-emerald-200 flex items-center justify-between">
            <span>✓ Agreement ratified on Monad Testnet!</span>
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

        {/* Counter Modal */}
        {activeCounterModal === req.id && (
          <div className="mt-4 p-4 rounded-xl bg-gray-950 border border-amber-600/60 font-mono text-xs space-y-3">
            <div className="text-amber-300 font-bold uppercase">Propose Counter-Terms to Initiator</div>
            <div>
              <label className="block text-gray-400 text-[10px] mb-1">Reason / Note</label>
              <input
                type="text"
                value={counterNote}
                onChange={(e) => setCounterNote(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-400 text-[10px] mb-1">Proposed Days</label>
                <input
                  type="number"
                  value={counterDeadline}
                  onChange={(e) => setCounterDeadline(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white text-xs"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-[10px] mb-1">Proposed Escrow (MON)</label>
                <input
                  type="text"
                  value={counterAmount}
                  onChange={(e) => setCounterAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white text-xs"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveCounterModal(null)}
                className="px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingCounter}
                onClick={() => handleCounterSubmit(req)}
                className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-black font-bold text-xs"
              >
                {isSubmittingCounter ? 'Submitting...' : 'Send Counter-Offer'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#07080d] text-gray-100 py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header & Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-6">
          <div>
            <div className="text-xs font-mono text-purple-400 font-bold uppercase tracking-wider mb-1">
              COMMERCIAL NEGOTIATION &amp; MUTUAL RATIFICATION
            </div>
            <h1 className="text-3xl font-extrabold text-white">Receiver Action Inbox</h1>
            <p className="text-xs sm:text-sm text-gray-400 font-mono mt-1">
              VeriqoMesh establishes programmatic mutual consent between counterparties before escrow initialization.
            </p>
          </div>

          {/* Quick Access to /receive */}
          <div className="flex items-center gap-3">
            <Link
              href="/receive"
              className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-600 hover:to-indigo-500 text-white font-mono text-xs font-bold transition shadow-lg shadow-purple-950 flex items-center gap-1.5"
            >
              <span>LOOKUP BY CODE (/receive)</span>
              <span>→</span>
            </Link>
          </div>
        </div>

        {/* Connected Wallet & Role Status Bar */}
        <div className="p-4 rounded-xl bg-gray-900/80 border border-gray-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs font-mono">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${wallet.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="text-gray-400">Connected Wallet:</span>
              {wallet.isConnected ? (
                <code className="text-emerald-300 font-bold">{wallet.address}</code>
              ) : (
                <span className="text-amber-300">Disconnected (Viewing Demo Defaults)</span>
              )}
            </div>
            <div className="text-[11px] text-gray-500">
              Only incoming requests addressed to this wallet can be signed and ratified onchain.
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!wallet.isConnected ? (
              <button
                onClick={() => wallet.connect()}
                className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition text-xs"
              >
                Connect Wallet
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Balance:</span>
                <span className="text-emerald-400 font-bold">{wallet.balanceMon || '0.0000'} MON</span>
              </div>
            )}
          </div>
        </div>

        {/* Section Tabs: Incoming vs Processed */}
        <div className="flex items-center gap-3 border-b border-gray-800 pb-2 font-mono text-xs">
          <button
            onClick={() => setActiveTab('AWAITING')}
            className={`py-2 px-4 rounded-xl font-bold transition flex items-center gap-2 ${
              activeTab === 'AWAITING'
                ? 'bg-amber-950/80 text-amber-300 border border-amber-600 shadow-md'
                : 'text-gray-400 hover:text-white bg-gray-900/50'
            }`}
          >
            <span>Incoming Requests — Awaiting Your Action</span>
            <span className="px-2 py-0.5 rounded-full bg-amber-900/80 text-amber-200 text-[10px]">
              {incomingRequests.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('PROCESSED')}
            className={`py-2 px-4 rounded-xl font-bold transition flex items-center gap-2 ${
              activeTab === 'PROCESSED'
                ? 'bg-purple-950/80 text-purple-300 border border-purple-600 shadow-md'
                : 'text-gray-400 hover:text-white bg-gray-900/50'
            }`}
          >
            <span>Processed Requests</span>
            <span className="px-2 py-0.5 rounded-full bg-purple-900/80 text-purple-200 text-[10px]">
              {processedRequests.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('ALL')}
            className={`py-2 px-3 rounded-xl font-bold transition ${
              activeTab === 'ALL'
                ? 'bg-gray-800 text-white border border-gray-600'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            All ({allRequests.length})
          </button>
        </div>

        {/* TAB CONTENT */}

        {/* TAB 1: Incoming Requests — Awaiting Your Action */}
        {(activeTab === 'AWAITING' || activeTab === 'ALL') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2 font-mono">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span>Incoming Requests — Awaiting Your Action</span>
                <span className="text-xs text-gray-400">({incomingRequests.length})</span>
              </h2>
              {isLoadingPersistent && (
                <span className="text-[11px] font-mono text-purple-400 animate-pulse">
                  Syncing Redis persistent store...
                </span>
              )}
            </div>

            {incomingRequests.length === 0 ? (
              <div className="p-8 rounded-2xl bg-gray-900/40 border border-gray-800 text-center font-mono space-y-3">
                <div className="text-gray-400 text-sm">
                  {wallet.isConnected ? (
                    <>No pending requests awaiting action for connected wallet <code className="text-white font-bold">{wallet.address?.slice(0, 6)}...{wallet.address?.slice(-4)}</code>.</>
                  ) : (
                    <>No pending requests in active view. Connect your designated seller wallet to sign inbound deal requests.</>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  Counterparties can initiate new transactions and dispatch invitations to your address.
                </div>
                <div className="pt-2">
                  <Link
                    href="/receive"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-950 hover:bg-purple-900 text-purple-200 border border-purple-800 text-xs font-bold transition"
                  >
                    <span>Enter an Invitation Code Manually</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {incomingRequests.map((req) => renderRequestCard(req, true))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Processed Requests */}
        {(activeTab === 'PROCESSED' || activeTab === 'ALL') && (
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2 font-mono">
                <span className="w-2 h-2 rounded-full bg-purple-400" />
                <span>Processed Requests &amp; Historical Benchmarks</span>
                <span className="text-xs text-gray-400">({processedRequests.length})</span>
              </h2>
            </div>

            {processedRequests.length === 0 ? (
              <div className="p-6 rounded-2xl bg-gray-900/40 border border-gray-800 text-center font-mono text-xs text-gray-500">
                No processed requests to display.
              </div>
            ) : (
              <div className="space-y-6">
                {processedRequests.map((req) => renderRequestCard(req, false))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
