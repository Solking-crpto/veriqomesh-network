'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Wallet,
  ArrowRight,
  ExternalLink,
  Shield,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Search,
  Filter,
} from 'lucide-react';
import {
  useDemoNetwork,
  CANONICAL_TESTNET_TX_ID,
  HISTORICAL_LIVE_TESTNET_TX_ID,
  HISTORICAL_PARKED_TESTNET_TX_ID,
  HISTORICAL_PARKED_TESTNET_TX_HASH,
  FRESH_LIVE_TESTNET_TX_ID,
  TARGET_BUYER_ADDRESS,
  TARGET_SELLER_ADDRESS,
  APPROVED_OPERATOR_VERIFIER_ADDRESS,
} from '../../context/DemoNetworkContext';
import { isDefinitiveBenchmark } from '../../lib/invitation-utils';
import { TransactionState } from '@trustmesh/types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Tabs } from '../../components/ui/Tabs';
import { StatusChip, StatusType } from '../../components/ui/StatusChip';
import { EmptyState } from '../../components/ui/EmptyState';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';

interface TransactionSummary {
  id: string;
  sourceLabel: string;
  title: string;
  deliverable?: string;
  buyer: string;
  buyerWallet: string;
  seller: string;
  sellerWallet: string;
  verifier: string;
  amountMon: string;
  state: string;
  settlementType: string;
  receiptId?: number;
  onchainTxHash?: string;
  isCanonicalDemo?: boolean;
  isUserParticipant?: boolean;
  userRole?: 'BUYER' | 'SELLER' | 'VERIFIER';
}

function getStatusType(state: string): StatusType {
  const s = state.toUpperCase();
  if (s === 'SETTLED' || s === 'COMPLETED' || s === 'RELEASED') return 'success';
  if (s === 'DISPUTED' || s === 'CONTESTED') return 'warning';
  if (s === 'FAILED' || s === 'CANCELLED' || s === 'REFUNDED') return 'error';
  if (s === 'ESCROW_FUNDED' || s === 'VERIFICATION' || s === 'IN_PROGRESS') return 'accent';
  return 'neutral';
}

function TransactionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');

  const { allRequests, client, wallet } = useDemoNetwork();

  // Hard URL authority: only ?tab=demo opens the demo tab.
  // /transactions, /transactions?tab=personal, or anything else ALWAYS defaults to personal.
  const activeTab: 'personal' | 'demo' = tabParam === 'demo' ? 'demo' : 'personal';

  const handleSelectTab = (targetTab: string) => {
    if (targetTab === 'demo') {
      router.push('/transactions?tab=demo');
    } else {
      router.push('/transactions');
    }
  };

  const [demoFilter, setDemoFilter] = useState<'ALL' | 'FLOW_A' | 'FLOW_B' | 'AUTONOMOUS'>('ALL');
  const [liveOnchainStates, setLiveOnchainStates] = useState<Record<string, string>>({});
  const [isLoadingOnchain, setIsLoadingOnchain] = useState(false);

  // Query live onchain state for fresh testnet transactions
  useEffect(() => {
    let mounted = true;
    const checkOnchain = async () => {
      setIsLoadingOnchain(true);
      try {
        const [freshTx, histParkedTx, histTx] = await Promise.all([
          client.getOnchainTransaction(FRESH_LIVE_TESTNET_TX_ID).catch(() => null),
          client.getOnchainTransaction(HISTORICAL_PARKED_TESTNET_TX_ID).catch(() => null),
          client.getOnchainTransaction(HISTORICAL_LIVE_TESTNET_TX_ID).catch(() => null),
        ]);
        if (mounted) {
          const updates: Record<string, string> = {};
          if (freshTx && freshTx.stateName) {
            updates[FRESH_LIVE_TESTNET_TX_ID] = freshTx.stateName;
          }
          if (histParkedTx && histParkedTx.stateName) {
            updates[HISTORICAL_PARKED_TESTNET_TX_ID] = histParkedTx.stateName;
          }
          if (histTx && histTx.stateName) {
            updates[HISTORICAL_LIVE_TESTNET_TX_ID] = histTx.stateName;
          }
          setLiveOnchainStates((prev) => ({ ...prev, ...updates }));
        }
      } catch {
        // Fallback to local state if offline
      } finally {
        if (mounted) setIsLoadingOnchain(false);
      }
    };
    checkOnchain();
    return () => {
      mounted = false;
    };
  }, [client]);

  // Canonical Flow A state
  const flowAState = liveOnchainStates[FRESH_LIVE_TESTNET_TX_ID] || TransactionState.SETTLED;

  // 1. PUBLIC DEMO & BENCHMARK TRANSACTIONS (Strictly segregated into demoTransactions)
  const demoTransactions: TransactionSummary[] = [
    // Flow A: Verified Normal Flow & Authorized Release
    {
      id: FRESH_LIVE_TESTNET_TX_ID,
      sourceLabel: 'PUBLIC DEMO: FLOW A (CANONICAL BENCHMARK)',
      title: 'Commercial Solar Procurement (Verified Deliverable Release)',
      deliverable:
        'Supply and deliver 2 solar panels to buyer. Seller anchors serial numbers and proof of delivery; designated verifier attests PASS; escrow releases 100% payout.',
      buyer: 'Solar Procurement Ltd.',
      buyerWallet: TARGET_BUYER_ADDRESS,
      seller: 'Dallas Solar Supply Co.',
      sellerWallet: TARGET_SELLER_ADDRESS,
      verifier: APPROVED_OPERATOR_VERIFIER_ADDRESS,
      amountMon: '0.001 MON',
      state: flowAState,
      settlementType: 'VERIFIED MILESTONE RELEASE (SOULBOUND RECEIPT #3)',
      receiptId: 3,
      onchainTxHash: '0x691f7a80d65fe1deece2f45e8b6600ee4b2b0ffc14f3fe733d995566e2d83b52',
      isCanonicalDemo: true,
    },
    // Flow B: Contested Deliverable & 3-Judge Quorum
    {
      id: CANONICAL_TESTNET_TX_ID,
      sourceLabel: 'PUBLIC DEMO: FLOW B (CANONICAL BENCHMARK)',
      title: '100 Commercial Solar Panels (Disputed Delivery)',
      deliverable:
        'Escrow locked upon inconclusive physical depot verification. Three accredited human judges submitted independent signed ballots; the protocol calculated the deterministic median of 1,500 bps and executed atomic distribution via the Monad resolver contract.',
      buyer: 'Solar Procurement Ltd.',
      buyerWallet: '0x287196Cdbf41da13Cb7083392e47eaAf105b58A0',
      seller: 'Dallas Solar Supply Co.',
      sellerWallet: '0x6f30D20b8c5bE781bADD86341415b556fB13c873',
      verifier: '0x16D7bD08Ad79bBCdBa116A652f68589FE5d6F4EA',
      amountMon: '0.001 MON',
      state: 'SETTLED',
      settlementType: 'HUMAN ADJUDICATION (1,500 bps MEDIAN QUORUM)',
      receiptId: 2,
      onchainTxHash: '0x91ff62584f4386250ccb09f28808453bb373273d9fa5f56cf04378c2a78084ba',
      isCanonicalDemo: true,
    },
    // Historical Parked Testnet Run
    {
      id: HISTORICAL_PARKED_TESTNET_TX_ID,
      sourceLabel: 'PUBLIC AUDIT: HISTORICAL RUN (VERIFICATION DEPOT)',
      title: 'Commercial Solar Procurement (Parked at Verification)',
      deliverable:
        'Supply and deliver 2 solar panels to the buyer. Historical diagnostic trace parked at independent verification review.',
      buyer: 'Solar Procurement Ltd.',
      buyerWallet: TARGET_BUYER_ADDRESS,
      seller: 'Dallas Solar Supply Co.',
      sellerWallet: TARGET_SELLER_ADDRESS,
      verifier: '0x16D7bD08Ad79bBCdBa116A652f68589FE5d6F4EA',
      amountMon: '0.001 MON',
      state: liveOnchainStates[HISTORICAL_PARKED_TESTNET_TX_ID] || TransactionState.VERIFICATION,
      settlementType: 'MONAD TESTNET ESCROW (HISTORICAL AUDIT)',
      onchainTxHash: HISTORICAL_PARKED_TESTNET_TX_HASH,
      isCanonicalDemo: true,
    },
    // Simulated Autonomous Agent Track
    {
      id: 'story-a',
      sourceLabel: 'PUBLIC DEMO: SIMULATED AUTONOMOUS AGENT',
      title: 'Tier-1 Solar PV Procurement (Autonomous Fulfillment)',
      deliverable: 'Autonomous agent procurement policy simulation under pre-authorized threshold.',
      buyer: 'Solar Procurement Ltd.',
      buyerWallet: '0x287196Cdbf41da13Cb7083392e47eaAf105b58A0',
      seller: 'Dallas Solar Supply Co.',
      sellerWallet: '0x6f30D20b8c5bE781bADD86341415b556fB13c873',
      verifier: '0x16D7bD08Ad79bBCdBa116A652f68589FE5d6F4EA',
      amountMon: '12.5 MON',
      state: 'SETTLED',
      settlementType: 'AUTONOMOUS AGENT (100% RELEASE)',
      receiptId: 1,
      isCanonicalDemo: true,
    },
  ];

  // 2. CONNECTED-USER PERSONAL TRANSACTIONS
  const connectedAddress =
    wallet.isConnected && wallet.address ? wallet.address.toLowerCase().trim() : null;

  const personalTransactions: TransactionSummary[] = useMemo(() => {
    // Hard invariant: Disconnected wallet => strictly []
    if (!connectedAddress) {
      return [];
    }

    const list: TransactionSummary[] = [];

    // Filter genuine requests from allRequests
    allRequests.forEach((req) => {
      // Hard benchmark exclusion guard
      if (isDefinitiveBenchmark(req)) {
        return;
      }

      const buyer = (req.initiatorWallet || '').toLowerCase().trim();
      const seller = (req.receiverWallet || '').toLowerCase().trim();

      const isBuyer = buyer === connectedAddress;
      const isSeller = seller === connectedAddress;

      if (isBuyer || isSeller) {
        list.push({
          id: req.transactionId || req.id,
          sourceLabel: req.isOnchain ? 'LIVE MONAD ESCROW' : 'COMMERCIAL REQUEST',
          title: req.title,
          deliverable: req.deliverable,
          buyer: req.initiator,
          buyerWallet: req.initiatorWallet,
          seller: req.receiver,
          sellerWallet: req.receiverWallet,
          verifier: req.verifierAddress || APPROVED_OPERATOR_VERIFIER_ADDRESS,
          amountMon: `${req.escrowAmountMon} MON`,
          state: req.status,
          settlementType: req.isOnchain ? 'ONCHAIN ESCROW WORKSPACE' : 'PRE-ESCROW AGREEMENT STAGE',
          onchainTxHash: req.onchainTxHash,
          isUserParticipant: true,
          userRole: isBuyer ? 'BUYER' : 'SELLER',
        });
      }
    });

    return list;
  }, [connectedAddress, allRequests]);

  // Filter public demo cards
  const filteredDemos = demoTransactions.filter((tx) => {
    if (demoFilter === 'FLOW_A') return tx.id === FRESH_LIVE_TESTNET_TX_ID;
    if (demoFilter === 'FLOW_B') return tx.id === CANONICAL_TESTNET_TX_ID;
    if (demoFilter === 'AUTONOMOUS') return tx.id === 'story-a';
    return true;
  });

  const tabsConfig = [
    {
      id: 'personal',
      label: 'Your Transactions',
      count: wallet.isConnected ? personalTransactions.length : 0,
    },
    {
      id: 'demo',
      label: 'Public Benchmarks',
      count: demoTransactions.length,
    },
  ];

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
            Transactions Directory
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Authenticated personal workspace and verifiable Monad testnet benchmarks.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="shrink-0">
          <Tabs
            tabs={tabsConfig}
            activeTab={activeTab}
            onChange={handleSelectTab}
          />
        </div>
      </div>

      {/* TAB 1: YOUR TRANSACTIONS (Personal Workspace) */}
      {activeTab === 'personal' && (
        <div className="space-y-6">
          {!wallet.isConnected ? (
            /* Scenario A: Disconnected State */
            <EmptyState
              icon={<Wallet className="w-6 h-6 text-accent" />}
              title="Connect Wallet to View Transactions"
              description="Your transactions are cryptographically isolated to your authenticated Monad account. Disconnected sessions display zero private activity."
              action={
                <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => wallet.connect()}
                    isLoading={wallet.isConnecting}
                    leftIcon={<Wallet className="w-4 h-4" />}
                  >
                    Connect Wallet
                  </Button>
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => handleSelectTab('demo')}
                  >
                    View Public Benchmarks
                  </Button>
                </div>
              }
            />
          ) : personalTransactions.length === 0 ? (
            /* Scenario B: Connected with No Transactions */
            <EmptyState
              icon={<FileText className="w-6 h-6 text-text-tertiary" />}
              title="No Personal Transactions Yet"
              description="Your connected wallet has not initiated or participated in any active commercial escrow transactions on Monad."
              action={
                <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
                  <Link href="/initiator/intent">
                    <Button
                      variant="primary"
                      size="md"
                      rightIcon={<ArrowRight className="w-4 h-4" />}
                    >
                      Create Agreement
                    </Button>
                  </Link>
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => handleSelectTab('demo')}
                  >
                    Explore Flow A Benchmark
                  </Button>
                </div>
              }
            />
          ) : (
            /* Scenario C: Connected with Transactions */
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs text-text-secondary">
                  Showing {personalTransactions.length} transaction(s) for{' '}
                  <code className="font-mono text-text-primary">
                    {wallet.address?.slice(0, 6)}...{wallet.address?.slice(-4)}
                  </code>
                </span>
              </div>

              {personalTransactions.map((tx) => (
                <Card key={tx.id} variant="default" className="space-y-5 hover:border-border-strong transition">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="accent">{tx.sourceLabel}</Badge>
                        {tx.userRole && (
                          <Badge variant="default">
                            {tx.userRole === 'BUYER' ? 'Buyer Role' : 'Seller Role'}
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-text-primary">
                        {tx.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <StatusChip
                        status={getStatusType(tx.state)}
                        size="md"
                        label={tx.state}
                      />
                    </div>
                  </div>

                  {/* Metadata Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div className="p-3 rounded-control bg-surface-elevated/60 border border-border space-y-1">
                      <span className="text-text-tertiary block text-[11px]">Buyer</span>
                      <div className="font-medium text-text-primary truncate">{tx.buyer}</div>
                      <div className="font-mono text-text-secondary text-[11px] truncate">
                        {tx.buyerWallet.slice(0, 8)}...{tx.buyerWallet.slice(-6)}
                      </div>
                    </div>

                    <div className="p-3 rounded-control bg-surface-elevated/60 border border-border space-y-1">
                      <span className="text-text-tertiary block text-[11px]">Seller</span>
                      <div className="font-medium text-text-primary truncate">{tx.seller}</div>
                      <div className="font-mono text-text-secondary text-[11px] truncate">
                        {tx.sellerWallet.slice(0, 8)}...{tx.sellerWallet.slice(-6)}
                      </div>
                    </div>

                    <div className="p-3 rounded-control bg-surface-elevated/60 border border-border space-y-1">
                      <span className="text-text-tertiary block text-[11px]">Escrow Amount</span>
                      <div className="font-bold text-text-primary text-sm">{tx.amountMon}</div>
                      <div className="text-[11px] text-text-tertiary">Monad Testnet</div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-border text-xs">
                    <div className="font-mono text-text-tertiary text-[11px]">
                      ID: <span className="text-text-secondary">{tx.id.slice(0, 14)}...{tx.id.slice(-6)}</span>
                    </div>

                    <Link href={`/transactions/${tx.id}`} className="w-full sm:w-auto">
                      <Button
                        variant="primary"
                        size="sm"
                        fullWidth
                        rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                      >
                        Enter Transaction Room
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PUBLIC DEMO & BENCHMARKS */}
      {activeTab === 'demo' && (
        <div className="space-y-6">
          {/* Header Notice */}
          <div className="p-4 rounded-card bg-surface-elevated border border-border text-xs space-y-1.5">
            <div className="flex items-center gap-2 text-accent font-semibold">
              <Shield className="w-4 h-4" />
              <span>Public Demonstration &amp; Audit Benchmarks</span>
            </div>
            <p className="text-text-secondary leading-relaxed">
              These records represent canonical verification and dispute scenarios executed on Monad Metropolis Testnet (Chain ID 10143). They are read-only and independent of authenticated personal workspaces.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setDemoFilter('ALL')}
              className={`px-3 py-1.5 rounded-control text-xs font-medium transition min-h-[36px] ${
                demoFilter === 'ALL'
                  ? 'bg-surface-elevated text-text-primary border border-border shadow-subtle'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface'
              }`}
            >
              All Benchmarks ({demoTransactions.length})
            </button>
            <button
              onClick={() => setDemoFilter('FLOW_A')}
              className={`px-3 py-1.5 rounded-control text-xs font-medium transition min-h-[36px] ${
                demoFilter === 'FLOW_A'
                  ? 'bg-surface-elevated text-text-primary border border-border shadow-subtle'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface'
              }`}
            >
              Flow A (Normal Release)
            </button>
            <button
              onClick={() => setDemoFilter('FLOW_B')}
              className={`px-3 py-1.5 rounded-control text-xs font-medium transition min-h-[36px] ${
                demoFilter === 'FLOW_B'
                  ? 'bg-surface-elevated text-text-primary border border-border shadow-subtle'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface'
              }`}
            >
              Flow B (Dispute Quorum)
            </button>
            <button
              onClick={() => setDemoFilter('AUTONOMOUS')}
              className={`px-3 py-1.5 rounded-control text-xs font-medium transition min-h-[36px] ${
                demoFilter === 'AUTONOMOUS'
                  ? 'bg-surface-elevated text-text-primary border border-border shadow-subtle'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface'
              }`}
            >
              Autonomous Simulation
            </button>
          </div>

          {/* Benchmark Cards List */}
          <div className="space-y-4">
            {filteredDemos.map((tx) => (
              <Card key={tx.id} variant="default" className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="accent">{tx.sourceLabel}</Badge>
                      {tx.receiptId && (
                        <Badge variant="default">Trust Receipt #{tx.receiptId}</Badge>
                      )}
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-text-primary">
                      {tx.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <StatusChip
                      status={getStatusType(tx.state)}
                      size="md"
                      label={tx.state}
                    />
                  </div>
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-3 rounded-control bg-surface-elevated/60 border border-border space-y-1">
                    <span className="text-text-tertiary block text-[11px]">Buyer</span>
                    <div className="font-medium text-text-primary truncate">{tx.buyer}</div>
                    <div className="font-mono text-text-secondary text-[11px] truncate">
                      {tx.buyerWallet.slice(0, 8)}...{tx.buyerWallet.slice(-6)}
                    </div>
                  </div>

                  <div className="p-3 rounded-control bg-surface-elevated/60 border border-border space-y-1">
                    <span className="text-text-tertiary block text-[11px]">Seller</span>
                    <div className="font-medium text-text-primary truncate">{tx.seller}</div>
                    <div className="font-mono text-text-secondary text-[11px] truncate">
                      {tx.sellerWallet.slice(0, 8)}...{tx.sellerWallet.slice(-6)}
                    </div>
                  </div>

                  <div className="p-3 rounded-control bg-surface-elevated/60 border border-border space-y-1">
                    <span className="text-text-tertiary block text-[11px]">Escrow &amp; Settlement</span>
                    <div className="font-bold text-text-primary text-sm">{tx.amountMon}</div>
                    <div className="text-[11px] text-text-secondary truncate">
                      {tx.settlementType}
                    </div>
                  </div>
                </div>

                {/* Deliverable Description */}
                {tx.deliverable && (
                  <div className="p-3 rounded-control bg-surface-elevated/40 border border-border text-xs text-text-secondary leading-relaxed">
                    <span className="font-medium text-text-primary block mb-0.5">
                      Deliverable Specification:
                    </span>
                    {tx.deliverable}
                  </div>
                )}

                {/* Footer */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-border text-xs">
                  <div className="space-y-1 font-mono text-[11px] text-text-tertiary">
                    <div>
                      ID: <span className="text-text-secondary">{tx.id.slice(0, 14)}...{tx.id.slice(-6)}</span>
                    </div>
                    {tx.onchainTxHash && (
                      <div>
                        Settlement Tx:{' '}
                        <a
                          href={`https://testnet.monadvision.com/tx/${tx.onchainTxHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent hover:underline inline-flex items-center gap-1"
                        >
                          <span>{tx.onchainTxHash.slice(0, 12)}...{tx.onchainTxHash.slice(-6)}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>

                  <Link href={`/transactions/${tx.id}`} className="w-full sm:w-auto">
                    <Button
                      variant="secondary"
                      size="sm"
                      fullWidth
                      rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                    >
                      Inspect Demo Room
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TransactionsDirectoryPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-6xl mx-auto py-12 px-4 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
          <div className="pt-6 space-y-4">
            <Skeleton className="h-32 w-full rounded-card" />
            <Skeleton className="h-32 w-full rounded-card" />
          </div>
        </div>
      }
    >
      <TransactionsContent />
    </Suspense>
  );
}
