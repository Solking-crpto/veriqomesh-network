'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import {
  Inbox,
  ArrowRight,
  Check,
  X,
  RotateCcw,
  ExternalLink,
  Shield,
  FileText,
  Clock,
  AlertCircle,
  Lock,
} from 'lucide-react';
import {
  useDemoNetwork,
  DealRequest,
  CANONICAL_TESTNET_TX_ID,
  FRESH_LIVE_TESTNET_TX_ID,
  APPROVED_OPERATOR_VERIFIER_ADDRESS,
} from '../../context/DemoNetworkContext';
import {
  buildMutationAuthMessage,
  isBenchmarkRequest,
  isAwaitingReceiverAction,
} from '../../lib/invitation-utils';
import { PersistentInvitation } from '../../lib/invitation-types';
import { TransactionState } from '@trustmesh/types';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader } from '../../components/ui/Card';
import { Tabs } from '../../components/ui/Tabs';
import { StatusChip, StatusType } from '../../components/ui/StatusChip';
import { EmptyState } from '../../components/ui/EmptyState';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input, Textarea } from '../../components/ui/Input';

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
    if (!wallet.isConnected || !wallet.address) {
      setPersistentInvitations([]);
      setIsLoadingPersistent(false);
      return;
    }
    setIsLoadingPersistent(true);
    try {
      const res = await fetch(`/api/invitations?receiver=${wallet.address}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.invitations)) {
        setPersistentInvitations(data.invitations);
      }
    } catch (err) {
      console.error('Failed to load persistent invitations from Redis:', err);
    } finally {
      setIsLoadingPersistent(false);
    }
  }, [wallet.isConnected, wallet.address]);

  useEffect(() => {
    fetchPersistentInvitations();
  }, [fetchPersistentInvitations]);

  // 2. Merge local user requests with Redis persistent invitations
  const allRequests = useMemo(() => {
    const combined: (DealRequest & { invitationCode?: string; version?: number; parentInvitationCode?: string })[] = [
      ...requests.filter((r) => !isBenchmarkRequest(r)),
    ];

    for (const inv of persistentInvitations) {
      if (
        isBenchmarkRequest({
          transactionId: inv.transactionId,
          invitationCode: inv.invitationCode,
          title: inv.proposal.title,
          deliverable: inv.proposal.description,
          initiator: inv.initiatorWallet,
          receiver: inv.intendedReceiverWallet,
        })
      ) {
        continue;
      }
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

  const isBenchmark = (r: DealRequest) => isBenchmarkRequest(r);

  const isRequestRatified = (r: DealRequest) => {
    const onchain = r.transactionId ? onchainTxMap[r.transactionId] : null;
    if (onchain && onchain.stateName !== 'PROPOSED' && onchain.stateName !== 'DRAFT') {
      return true;
    }
    return r.status === 'AGREEMENT_ACTIVE';
  };

  const isAwaitingAction = (r: DealRequest) => isAwaitingReceiverAction(r, onchainTxMap);

  // 4. Strict Wallet Partitioning
  const incomingRequests = useMemo(() => {
    if (!wallet.isConnected || !wallet.address) return [];
    const connectedAddr = wallet.address.toLowerCase();
    return allRequests.filter((r) => {
      if (!isAwaitingAction(r)) return false;
      return r.receiverWallet?.toLowerCase() === connectedAddr;
    });
  }, [allRequests, wallet.isConnected, wallet.address, onchainTxMap]);

  const processedRequests = useMemo(() => {
    if (!wallet.isConnected || !wallet.address) return [];
    const connectedAddr = wallet.address.toLowerCase();
    return allRequests.filter(
      (r) =>
        !isBenchmarkRequest(r) &&
        !isAwaitingAction(r) &&
        (r.receiverWallet?.toLowerCase() === connectedAddr || r.initiatorWallet?.toLowerCase() === connectedAddr)
    );
  }, [allRequests, onchainTxMap, wallet.isConnected, wallet.address]);

  // Handle Acceptance
  const handleAccept = async (req: DealRequest & { invitationCode?: string }) => {
    setAcceptError(null);
    setAcceptTxHash(null);
    setAcceptPendingHash(null);

    if (isBenchmark(req)) {
      setAcceptError('Canonical testnet record is immutable read-only audit data.');
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
          `Strict Role Isolation: Connected wallet (${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}) is not the designated Seller (${req.receiverWallet.slice(0, 6)}...${req.receiverWallet.slice(-4)}).`
        );
        return;
      }

      setAcceptingId(req.id);
      try {
        const txHash = await client.agreeTransaction(req.transactionId!);
        setAcceptPendingHash(txHash);

        const receipt = await client.waitForConfirmation(txHash);
        if (!receipt || receipt.status !== 1) {
          throw new Error(`Transaction reverted on Monad Testnet (hash: ${txHash}).`);
        }

        const onchainState = await client.getOnchainTransactionState(req.transactionId!);
        if (onchainState !== 'AGREED') {
          throw new Error(`State verification failed: expected AGREED, got ${onchainState}.`);
        }

        setAcceptTxHash(txHash);
        setAcceptPendingHash(null);
        acceptDealRequest(req.id);

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
        setAcceptError(msg);
        await refreshOnchainRequests();
      } finally {
        setAcceptingId(null);
      }
    } else {
      acceptDealRequest(req.id);
    }
  };

  // Handle Counter
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

  // Handle Decline
  const handleDecline = async (req: DealRequest & { invitationCode?: string }) => {
    if (!window.confirm('Are you sure you want to decline this proposal?')) return;
    try {
      if (req.invitationCode) {
        if (!wallet.isConnected) await wallet.connect();
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

  // Selected list based on active tab
  const displayList = useMemo(() => {
    if (activeTab === 'AWAITING') return incomingRequests;
    if (activeTab === 'PROCESSED') return processedRequests;
    return [...incomingRequests, ...processedRequests];
  }, [activeTab, incomingRequests, processedRequests]);

  const tabsConfig = [
    {
      id: 'AWAITING',
      label: 'Awaiting you',
      count: incomingRequests.length,
    },
    {
      id: 'PROCESSED',
      label: 'Processed',
      count: processedRequests.length,
    },
    {
      id: 'ALL',
      label: 'All',
      count: incomingRequests.length + processedRequests.length,
    },
  ];

  const targetCounterReq = allRequests.find((r) => r.id === activeCounterModal);

  return (
    <div className="py-6 sm:py-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
            Requests for you
          </h1>
          <p className="text-sm text-text-secondary">
            Review agreements and authorize the ones you accept.
          </p>
        </div>

        <div className="shrink-0">
          <Tabs
            tabs={tabsConfig}
            activeTab={activeTab}
            onChange={(id) => setActiveTab(id as 'AWAITING' | 'PROCESSED' | 'ALL')}
          />
        </div>
      </div>

      {/* Accept Error Banner */}
      {acceptError && (
        <div className="p-4 rounded-card bg-status-error/10 border border-status-error/30 text-xs text-status-error flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{acceptError}</span>
        </div>
      )}

      {/* Success Acceptance Banner */}
      {acceptTxHash && (
        <div className="p-4 rounded-card bg-status-success/10 border border-status-success/30 text-xs text-status-success flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>Agreement confirmed on Monad Testnet!</span>
          </div>
          <a
            href={`https://testnet.monadvision.com/tx/${acceptTxHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline flex items-center gap-1 font-mono"
          >
            <span>View Tx</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* Main Content Area */}
      <div className="space-y-3">
        {!wallet.isConnected ? (
          <Card className="p-5 bg-surface border-border space-y-3">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-text-primary">
                Wallet required
              </h2>
              <p className="text-xs text-text-secondary leading-relaxed">
                Connect your wallet to see agreements addressed to you.
              </p>
            </div>
            <Button
              variant="primary"
              size="md"
              fullWidth
              onClick={() => wallet.connect()}
              isLoading={wallet.isConnecting}
              className="sm:w-auto"
            >
              Connect wallet
            </Button>
          </Card>
        ) : displayList.length === 0 ? (
          <EmptyState
            icon={<Inbox className="w-5 h-5 text-text-tertiary" />}
            title={
              activeTab === 'AWAITING'
                ? '0 awaiting your action'
                : activeTab === 'PROCESSED'
                ? 'No processed requests yet'
                : 'Your inbox is clear'
            }
            description="When counterparties designate your wallet for commercial deals, their proposals will appear here for review."
            action={
              <Link href="/initiator/intent">
                <Button variant="secondary" size="sm">
                  Create agreement
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {displayList.map((req) => {
              const isAwaiting = isAwaitingAction(req);
              const isRatified = isRequestRatified(req);
              const isAcceptingThis = acceptingId === req.id;

              return (
                <Card key={req.id} variant="default" className="p-4 sm:p-5 space-y-3">
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-accent uppercase tracking-wider">
                      {req.isOnchain ? 'Monad Escrow' : 'Agreement Proposal'}
                    </span>
                    <StatusChip
                      status={
                        isRatified
                          ? 'success'
                          : isAwaiting
                          ? 'warning'
                          : req.status === 'DECLINED'
                          ? 'error'
                          : 'neutral'
                      }
                      size="sm"
                      label={
                        isRatified
                          ? 'Agreement active'
                          : isAwaiting
                          ? 'Awaiting your authorization'
                          : req.status.replace(/_/g, ' ')
                      }
                    />
                  </div>

                  {/* Summary Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-control bg-surface-elevated/60 border border-border space-y-0.5">
                      <span className="text-text-tertiary block text-[11px]">Initiator (Buyer)</span>
                      <div className="font-medium text-text-primary truncate">{req.initiator}</div>
                      <div className="font-mono text-text-secondary text-[11px] truncate">
                        {req.initiatorWallet}
                      </div>
                    </div>

                    <div className="p-3 rounded-control bg-surface-elevated/60 border border-border space-y-0.5">
                      <span className="text-text-tertiary block text-[11px]">Escrow Deposit</span>
                      <div className="font-bold text-status-success text-sm font-mono">
                        {req.escrowAmountMon} MON
                      </div>
                      <div className="text-[11px] text-text-secondary">
                        Window: {req.deadlineDays} days
                      </div>
                    </div>

                    <div className="p-3 rounded-control bg-surface-elevated/60 border border-border space-y-0.5">
                      <span className="text-text-tertiary block text-[11px]">Designated Verifier</span>
                      <div className="font-mono text-text-primary text-[11px] truncate">
                        {req.verifierAddress || APPROVED_OPERATOR_VERIFIER_ADDRESS}
                      </div>
                      <div className="text-[11px] text-text-tertiary">Inspection Auditor</div>
                    </div>
                  </div>

                  {/* Deliverable description */}
                  {req.deliverable && (
                    <div className="p-3 rounded-control bg-surface-elevated/30 border border-border text-xs text-text-secondary">
                      <span className="font-medium text-text-primary block mb-0.5">Deliverable:</span>
                      {req.deliverable}
                    </div>
                  )}

                  {/* Action Bar */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-border">
                    <div className="text-[11px] font-mono text-text-tertiary">
                      {req.transactionId && (
                        <span>Tx ID: <code className="text-text-secondary">{req.transactionId.slice(0, 10)}...{req.transactionId.slice(-6)}</code></span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {isAwaiting && (
                        <>
                          <Button
                            variant="primary"
                            size="sm"
                            isLoading={isAcceptingThis}
                            onClick={() => handleAccept(req)}
                            leftIcon={<Check className="w-3.5 h-3.5" />}
                          >
                            Sign Agreement
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setActiveCounterModal(req.id);
                              setCounterAmount(req.escrowAmountMon);
                              setCounterDeadline(req.deadlineDays + 7);
                            }}
                          >
                            Counter
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDecline(req)}
                          >
                            Decline
                          </Button>
                        </>
                      )}

                      {req.transactionId && (
                        <Link href={`/transactions/${req.transactionId}`}>
                          <Button variant="secondary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                            View Room
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Counter Offer Modal */}
      {activeCounterModal && targetCounterReq && (
        <Modal
          isOpen={Boolean(activeCounterModal)}
          onClose={() => setActiveCounterModal(null)}
          title="Submit Counter Proposal"
          description={`Propose modified terms for "${targetCounterReq.title}"`}
          footer={
            <>
              <Button
                variant="ghost"
                size="md"
                onClick={() => setActiveCounterModal(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                isLoading={isSubmittingCounter}
                onClick={() => handleCounterSubmit(targetCounterReq)}
              >
                Send Counter
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Textarea
              label="Counter Proposal Note"
              rows={3}
              value={counterNote}
              onChange={(e) => setCounterNote(e.target.value)}
              placeholder="Explain the proposed adjustment..."
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Requested Escrow Amount"
                value={counterAmount}
                onChange={(e) => setCounterAmount(e.target.value)}
                rightElement="MON"
              />
              <Input
                label="Fulfillment Window"
                type="number"
                value={counterDeadline}
                onChange={(e) => setCounterDeadline(parseInt(e.target.value) || 21)}
                rightElement="days"
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
