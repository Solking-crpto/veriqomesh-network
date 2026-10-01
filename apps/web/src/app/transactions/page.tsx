'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  useDemoNetwork,
  CANONICAL_TESTNET_TX_ID,
  HISTORICAL_LIVE_TESTNET_TX_ID,
  HISTORICAL_LIVE_TESTNET_TX_HASH,
  HISTORICAL_PARKED_TESTNET_TX_ID,
  HISTORICAL_PARKED_TESTNET_TX_HASH,
  FRESH_LIVE_TESTNET_TX_ID,
  FRESH_LIVE_TESTNET_TX_HASH,
  TARGET_BUYER_ADDRESS,
  TARGET_SELLER_ADDRESS,
  APPROVED_OPERATOR_VERIFIER_ADDRESS,
} from '../../context/DemoNetworkContext';
import { isDefinitiveBenchmark } from '../../lib/invitation-utils';
import { TransactionState } from '@trustmesh/types';

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

function TransactionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');

  const { allRequests, client, wallet } = useDemoNetwork();

  // Hard URL authority: only ?tab=demo opens the demo tab.
  // /transactions, /transactions?tab=personal, or anything else ALWAYS defaults to personal.
  const activeTab: 'personal' | 'demo' = tabParam === 'demo' ? 'demo' : 'personal';

  const handleSelectTab = (targetTab: 'personal' | 'demo') => {
    if (targetTab === 'demo') {
      router.push('/transactions?tab=demo');
    } else {
      router.push('/transactions');
    }
  };

  const [demoFilter, setDemoFilter] = useState<'ALL' | 'FLOW_A' | 'FLOW_B' | 'AUTONOMOUS'>('ALL');
  const [liveOnchainStates, setLiveOnchainStates] = useState<Record<string, string>>({});

  // Query live onchain state for fresh testnet transactions
  useEffect(() => {
    let mounted = true;
    const checkOnchain = async () => {
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

  // 2. CONNECTED-USER PERSONAL TRANSACTIONS (Strictly scoped to genuine wallet participant relationships)
  const connectedAddress =
    wallet.isConnected && wallet.address ? wallet.address.toLowerCase().trim() : null;

  const personalTransactions: TransactionSummary[] = useMemo(() => {
    // Hard invariant: Disconnected wallet => strictly []
    if (!connectedAddress) {
      return [];
    }

    const list: TransactionSummary[] = [];

    // Filter genuine requests from allRequests (combining local requests and persistent Redis invitations)
    allRequests.forEach((req) => {
      // Hard benchmark exclusion guard: NEVER allow any benchmark/demo fixture into personalTransactions
      if (isDefinitiveBenchmark(req)) {
        return;
      }

      const buyer = (req.initiatorWallet || '').toLowerCase().trim();
      const seller = (req.receiverWallet || '').toLowerCase().trim();

      const isBuyer = buyer === connectedAddress;
      const isSeller = seller === connectedAddress;

      // Only include if connected wallet is genuinely buyer or seller
      if (isBuyer || isSeller) {
        list.push({
          id: req.transactionId || req.id,
          sourceLabel: req.isOnchain ? 'LIVE MONAD TESTNET ESCROW' : 'COMMERCIAL DEAL REQUEST',
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

  return (
    <div className="min-h-screen bg-[#07080d] text-gray-100 py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-6">
          <div>
            <div className="text-xs font-mono text-purple-400 font-bold uppercase tracking-wider mb-1">
              ESCROW STATE MACHINE &amp; TRANSACTION DIRECTORY
            </div>
            <h1 className="text-3xl font-extrabold text-white">Transactions Directory</h1>
            <p className="text-xs sm:text-sm text-gray-400 font-mono mt-1">
              Distinguishing your authenticated personal workspace from verifiable public demonstration benchmarks.
            </p>
          </div>

          {/* Top-Level Workspace vs Public Demo Switcher */}
          <div className="flex items-center gap-2 bg-gray-950 p-1.5 rounded-xl border border-gray-800 font-mono text-xs">
            <button
              onClick={() => handleSelectTab('personal')}
              className={`px-4 py-2 rounded-lg font-bold transition flex items-center gap-2 ${
                activeTab === 'personal'
                  ? 'bg-purple-700 text-white shadow-md shadow-purple-950'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <span>Your Transactions</span>
              {wallet.isConnected && personalTransactions.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-black text-[10px] font-extrabold">
                  {personalTransactions.length}
                </span>
              )}
            </button>
            <button
              onClick={() => handleSelectTab('demo')}
              className={`px-4 py-2 rounded-lg font-bold transition flex items-center gap-2 ${
                activeTab === 'demo'
                  ? 'bg-purple-700 text-white shadow-md shadow-purple-950'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <span>Public Demo &amp; Benchmarks</span>
              <span className="px-1.5 py-0.2 rounded-full bg-purple-900 text-purple-200 text-[10px]">
                {demoTransactions.length}
              </span>
            </button>
          </div>
        </div>

        {/* TAB 1: YOUR TRANSACTIONS (Personal Workspace) */}
        {activeTab === 'personal' && (
          <div className="space-y-6">
            {!wallet.isConnected ? (
              /* Scenario A: Disconnected / First-Visit State */
              <div className="p-8 sm:p-12 rounded-2xl bg-gradient-to-b from-[#110f22] via-[#0b0c16] to-[#07080d] border border-purple-800/60 text-center space-y-6 shadow-2xl">
                <div className="w-16 h-16 rounded-2xl bg-purple-950/80 border border-purple-600/60 mx-auto flex items-center justify-center text-2xl shadow-lg shadow-purple-950">
                  🔒
                </div>
                <div className="max-w-md mx-auto space-y-2 font-mono">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/70 border border-amber-600/60 text-amber-300 text-[11px] font-bold">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>WALLET REQUIRED</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white">Your Personal Transaction Workspace</h2>
                  <p className="text-xs sm:text-sm text-gray-400">
                    Connect your Monad wallet to view transactions associated with your account.
                  </p>
                  <div className="text-xs text-gray-500 pt-1">
                    0 transactions
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => wallet.connect()}
                    disabled={wallet.isConnecting}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-600 hover:to-indigo-500 text-white font-mono text-xs font-bold transition shadow-lg shadow-purple-950 flex items-center justify-center gap-2"
                  >
                    <span>{wallet.isConnecting ? 'Connecting...' : 'Connect Wallet to View Transactions'}</span>
                    <span>→</span>
                  </button>
                  <button
                    onClick={() => handleSelectTab('demo')}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-300 font-mono text-xs font-bold transition"
                  >
                    Explore Public Demo Instead →
                  </button>
                </div>

                {/* Safe Context Callout */}
                <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-900/40 max-w-xl mx-auto text-left font-mono text-xs text-gray-300 space-y-1">
                  <div className="text-purple-300 font-bold flex items-center gap-1.5">
                    <span>🛡 Workspace Isolation Invariant</span>
                  </div>
                  <p className="text-gray-400 text-[11px] font-sans">
                    VeriqoMesh enforces strict workspace isolation. When disconnected, no transactions from other participants or historical benchmarks will ever appear in your personal transaction list.
                  </p>
                </div>
              </div>
            ) : personalTransactions.length === 0 ? (
              /* Scenario B: Connected Wallet with No Relevant Transactions */
              <div className="p-8 sm:p-12 rounded-2xl bg-gradient-to-b from-[#0d101a] to-[#07080d] border border-gray-800 text-center space-y-6 shadow-xl">
                <div className="w-16 h-16 rounded-2xl bg-gray-900 border border-gray-700 mx-auto flex items-center justify-center text-2xl">
                  📁
                </div>
                <div className="max-w-md mx-auto space-y-2 font-mono">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/70 border border-emerald-700 text-emerald-300 text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>CONNECTED: {wallet.address?.slice(0, 6)}...{wallet.address?.slice(-4)}</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white">No Transactions Found</h2>
                  <p className="text-xs text-gray-400">
                    Your connected wallet has not initiated, accepted, or verified any escrow transactions on Monad Metropolis Testnet.
                  </p>
                  <div className="text-xs text-gray-500 pt-1">
                    0 transactions
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <Link
                    href="/initiator/intent"
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-mono text-xs font-bold transition shadow-md shadow-purple-950 flex items-center justify-center gap-2"
                  >
                    <span>+ Create Commercial Intent</span>
                    <span>→</span>
                  </Link>
                  <button
                    onClick={() => handleSelectTab('demo')}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-300 font-mono text-xs font-bold transition"
                  >
                    See Public Demo (Flow A) →
                  </button>
                </div>
              </div>
            ) : (
              /* Scenario C: Connected Wallet that Participates in a Transaction */
              <div className="space-y-6">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/60 font-mono text-xs">
                  <div className="flex items-center gap-2 text-emerald-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Active Account: <strong>{wallet.address?.slice(0, 8)}...{wallet.address?.slice(-6)}</strong></span>
                  </div>
                  <span className="text-gray-400">{personalTransactions.length} transaction(s) associated with your wallet</span>
                </div>

                {personalTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-6 rounded-2xl bg-gradient-to-b from-[#0e172a] via-[#09101c] to-[#07080d] border border-blue-500/80 shadow-2xl space-y-5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800/80 pb-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-950 text-blue-300 border border-blue-500">
                            {tx.sourceLabel}
                          </span>
                          {tx.userRole && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-700">
                              YOUR ROLE: {tx.userRole}
                            </span>
                          )}
                          {tx.receiptId && (
                            <span className="text-xs font-mono text-gray-400">
                              Receipt #{tx.receiptId}
                            </span>
                          )}
                        </div>
                        <h3 className="text-xl font-bold text-white">{tx.title}</h3>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-600">
                          STATE: {tx.state}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-950/80 p-4 rounded-xl border border-gray-800/80 font-mono text-xs">
                      <div>
                        <span className="text-[10px] text-purple-400 uppercase font-bold block mb-1">
                          BUYER / INITIATOR
                        </span>
                        <div className="text-white font-bold">{tx.buyer}</div>
                        <div className="text-gray-400 text-[11px] truncate">
                          Wallet: <code className="text-purple-300">{tx.buyerWallet}</code>
                        </div>
                      </div>

                      <div className="border-t md:border-t-0 md:border-l border-gray-800 pt-3 md:pt-0 md:pl-4">
                        <span className="text-[10px] text-blue-400 uppercase font-bold block mb-1">
                          SELLER / RECEIVER
                        </span>
                        <div className="text-white font-bold">{tx.seller}</div>
                        <div className="text-gray-400 text-[11px] truncate">
                          Wallet: <code className="text-blue-300">{tx.sellerWallet}</code>
                        </div>
                      </div>

                      <div className="border-t md:border-t-0 md:border-l border-gray-800 pt-3 md:pt-0 md:pl-4">
                        <span className="text-[10px] text-teal-400 uppercase font-bold block mb-1">
                          DESIGNATED VERIFIER
                        </span>
                        <div className="text-white font-bold">Independent Depot Auditor</div>
                        <div className="text-gray-400 text-[11px] truncate">
                          Wallet: <code className="text-teal-300">{tx.verifier}</code>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-gray-800/80">
                      <div className="text-xs font-mono text-gray-400">
                        Tx ID: <code className="text-purple-300">{tx.id.slice(0, 16)}...{tx.id.slice(-8)}</code>
                      </div>
                      <Link
                        href={`/transactions/${tx.id}`}
                        className="w-full sm:w-auto py-2.5 px-6 rounded-xl font-mono text-xs font-bold transition shadow-md bg-blue-600 hover:bg-blue-500 text-white"
                      >
                        Enter Transaction Room →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PUBLIC DEMO & CANONICAL BENCHMARKS */}
        {activeTab === 'demo' && (
          <div className="space-y-6">
            {/* Explicit Demo Disclaimer Banner */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-indigo-950/40 to-purple-950/30 border border-purple-700/80 font-mono text-xs space-y-2 shadow-xl">
              <div className="flex items-center gap-2 text-purple-300 font-bold uppercase tracking-wider">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse" />
                <span>PUBLIC DEMONSTRATION &amp; AUDIT BENCHMARKS</span>
              </div>
              <p className="text-gray-300 font-sans text-xs sm:text-sm">
                These records are verified public demonstrations executed on Monad Metropolis Testnet (Chain ID 10143). They illustrate normal verified deliverable release (Flow A) and multi-judge dispute resolution (Flow B). They are independent of your personal transaction workspace.
              </p>
            </div>

            {/* Filter Pills for Demo */}
            <div className="flex flex-wrap items-center gap-2 bg-gray-900/80 p-1.5 rounded-xl border border-gray-800 font-mono text-xs">
              <button
                onClick={() => setDemoFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  demoFilter === 'ALL' ? 'bg-purple-700 text-white font-bold' : 'text-gray-400 hover:text-white'
                }`}
              >
                All Benchmarks ({demoTransactions.length})
              </button>
              <button
                onClick={() => setDemoFilter('FLOW_A')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  demoFilter === 'FLOW_A' ? 'bg-emerald-600 text-white font-bold' : 'text-gray-400 hover:text-white'
                }`}
              >
                Flow A (Verified Release)
              </button>
              <button
                onClick={() => setDemoFilter('FLOW_B')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  demoFilter === 'FLOW_B' ? 'bg-amber-600 text-white font-bold' : 'text-gray-400 hover:text-white'
                }`}
              >
                Flow B (Dispute Quorum)
              </button>
              <button
                onClick={() => setDemoFilter('AUTONOMOUS')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  demoFilter === 'AUTONOMOUS' ? 'bg-purple-700 text-white font-bold' : 'text-gray-400 hover:text-white'
                }`}
              >
                Autonomous Simulation
              </button>
            </div>

            {/* List of Public Demo Cards */}
            <div className="space-y-6">
              {filteredDemos.map((tx) => (
                <div
                  key={tx.id}
                  className="p-6 rounded-2xl bg-gradient-to-b from-[#141026] via-[#0d0e18] to-[#07080d] border border-purple-700/70 shadow-2xl space-y-5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800/80 pb-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-700">
                          {tx.sourceLabel}
                        </span>
                        {tx.receiptId && (
                          <span className="text-xs font-mono text-gray-400">
                            Receipt #{tx.receiptId}
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-950/80 text-purple-400 border border-purple-800">
                          PUBLIC DEMO
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-white">{tx.title}</h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-600">
                        STATE: {tx.state}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-950/80 p-4 rounded-xl border border-gray-800/80 font-mono text-xs">
                    <div>
                      <span className="text-[10px] text-purple-400 uppercase font-bold block mb-1">
                        BUYER / INITIATOR
                      </span>
                      <div className="text-white font-bold">{tx.buyer}</div>
                      <div className="text-gray-400 text-[11px] truncate">
                        Wallet: <code className="text-purple-300">{tx.buyerWallet}</code>
                      </div>
                    </div>

                    <div className="border-t md:border-t-0 md:border-l border-gray-800 pt-3 md:pt-0 md:pl-4">
                      <span className="text-[10px] text-blue-400 uppercase font-bold block mb-1">
                        SELLER / RECEIVER
                      </span>
                      <div className="text-white font-bold">{tx.seller}</div>
                      <div className="text-gray-400 text-[11px] truncate">
                        Wallet: <code className="text-blue-300">{tx.sellerWallet}</code>
                      </div>
                    </div>

                    <div className="border-t md:border-t-0 md:border-l border-gray-800 pt-3 md:pt-0 md:pl-4">
                      <span className="text-[10px] text-teal-400 uppercase font-bold block mb-1">
                        DESIGNATED VERIFIER
                      </span>
                      <div className="text-white font-bold">Independent Depot Auditor</div>
                      <div className="text-gray-400 text-[11px] truncate">
                        Wallet: <code className="text-teal-300">{tx.verifier}</code>
                      </div>
                    </div>
                  </div>

                  {tx.deliverable && (
                    <div className="p-3 bg-gray-950/60 rounded-xl border border-gray-800 font-mono text-xs">
                      <span className="text-gray-400 text-[10px] block uppercase font-bold mb-0.5">
                        DELIVERABLE INTENT:
                      </span>
                      <span className="text-gray-200 font-sans text-xs">{tx.deliverable}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
                    <div className="p-3 bg-gray-950/60 rounded-xl border border-gray-800">
                      <span className="text-gray-400 text-[10px] block">ESCROW CAPITAL</span>
                      <span className="text-emerald-400 font-bold text-sm">{tx.amountMon}</span>
                      <span className="text-[10px] text-gray-500 block">Monad Metropolis Testnet</span>
                    </div>
                    <div className="p-3 bg-gray-950/60 rounded-xl border border-gray-800 sm:col-span-2">
                      <span className="text-gray-400 text-[10px] block">SETTLEMENT METHOD</span>
                      <span className="text-white font-bold text-xs">{tx.settlementType}</span>
                      <span className="text-[10px] text-gray-400 block mt-0.5">
                        Immutable settlement facts recorded on Monad and indexed by Envio HyperIndex
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-gray-800/80">
                    <div className="text-xs font-mono text-gray-400 space-y-0.5">
                      <div>
                        Internal Tx ID: <code className="text-purple-300">{tx.id.length > 30 ? `${tx.id.slice(0, 16)}...${tx.id.slice(-8)}` : tx.id}</code>
                      </div>
                      {tx.onchainTxHash && (
                        <div className="text-[11px]">
                          Settlement Tx:{' '}
                          <a
                            href={`https://testnet.monadvision.com/tx/${tx.onchainTxHash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-400 hover:text-emerald-300 underline font-bold"
                          >
                            {tx.onchainTxHash.slice(0, 14)}...{tx.onchainTxHash.slice(-6)} ↗
                          </a>
                        </div>
                      )}
                    </div>
                    <Link
                      href={`/transactions/${tx.id}`}
                      className="w-full sm:w-auto py-2.5 px-6 rounded-xl font-mono text-xs font-bold transition shadow-md bg-purple-700 hover:bg-purple-600 text-white text-center"
                    >
                      Inspect Public Demo Room →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TransactionsDirectoryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#07080d] text-gray-100 py-10 px-4 text-center font-mono text-sm">
          Loading Transactions Directory...
        </div>
      }
    >
      <TransactionsContent />
    </Suspense>
  );
}
