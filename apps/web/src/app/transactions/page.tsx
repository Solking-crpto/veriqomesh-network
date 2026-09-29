'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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
  INDEPENDENT_VERIFIER_ADDRESS,
  APPROVED_OPERATOR_VERIFIER_ADDRESS,
} from '../../context/DemoNetworkContext';
import { TransactionState } from '@trustmesh/types';

interface TransactionSummary {
  id: string;
  sourceLabel:
    | 'LIVE MONAD TESTNET (FRESH LIVE TX)'
    | 'LIVE MONAD TESTNET RECORD (READ-ONLY AUDIT)'
    | 'SIMULATED AUTONOMOUS AGENT DEMO';
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
  isFreshLive?: boolean;
  isReadOnly?: boolean;
}

export default function TransactionsDirectoryPage() {
  const { requests, client } = useDemoNetwork();
  const [filter, setFilter] = useState<'ALL' | 'FRESH_LIVE' | 'TESTNET' | 'AUTONOMOUS'>('ALL');
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

  // Find active fresh live onchain request
  const activeFreshReq = requests.find(
    (r) =>
      r &&
      r.isOnchain &&
      r.transactionId &&
      r.transactionId !== CANONICAL_TESTNET_TX_ID &&
      r.transactionId !== HISTORICAL_LIVE_TESTNET_TX_ID &&
      r.transactionId !== HISTORICAL_PARKED_TESTNET_TX_ID
  );

  const freshState =
    (activeFreshReq?.transactionId && liveOnchainStates[activeFreshReq.transactionId]) ||
    liveOnchainStates[FRESH_LIVE_TESTNET_TX_ID] ||
    TransactionState.AGREED;

  const transactions: TransactionSummary[] = [
    // 1. Fresh Live Monad Testnet Transaction (with designated seller 0x0e73... and verifier 0xb064...2c48)
    {
      id: activeFreshReq?.transactionId || FRESH_LIVE_TESTNET_TX_ID,
      sourceLabel: 'LIVE MONAD TESTNET (FRESH LIVE TX)',
      title: activeFreshReq?.title || 'Commercial Solar Procurement (Live Monad Metropolis Testnet)',
      deliverable: activeFreshReq?.deliverable,
      buyer: activeFreshReq?.initiator || 'Solar Procurement Ltd.',
      buyerWallet: activeFreshReq?.initiatorWallet || TARGET_BUYER_ADDRESS,
      seller: activeFreshReq?.receiver || 'Dallas Solar Supply Co.',
      sellerWallet: activeFreshReq?.receiverWallet || TARGET_SELLER_ADDRESS,
      verifier: activeFreshReq?.verifierAddress || APPROVED_OPERATOR_VERIFIER_ADDRESS,
      amountMon: `${activeFreshReq?.escrowAmountMon || '0.001'} MON`,
      state: freshState,
      settlementType:
        freshState === TransactionState.AGREED
          ? 'MONAD TESTNET ESCROW (STAGE 2: ESCROW FUNDING)'
          : freshState === TransactionState.FUNDED
          ? 'MONAD TESTNET ESCROW (STAGE 3: IN PROGRESS)'
          : freshState === TransactionState.IN_PROGRESS
          ? 'MONAD TESTNET ESCROW (STAGE 4: EVIDENCE SUBMISSION)'
          : freshState === TransactionState.EVIDENCE_SUBMITTED
          ? 'MONAD TESTNET ESCROW (STAGE 5: VERIFICATION REQUEST)'
          : freshState === TransactionState.VERIFICATION
          ? 'MONAD TESTNET ESCROW (STAGE 6: INDEPENDENT VERIFICATION)'
          : freshState === TransactionState.SETTLED
          ? 'MONAD TESTNET ESCROW (SETTLED - SOULBOUND RECEIPT ISSUED)'
          : 'MONAD TESTNET ESCROW (STAGE 1: AWAITING SELLER RATIFICATION)',
      onchainTxHash: activeFreshReq?.onchainTxHash || FRESH_LIVE_TESTNET_TX_HASH,
      isFreshLive: true,
    },
    // 2. Historical Parked Testnet Run (Read-Only Audit - Parked at Verification)
    {
      id: HISTORICAL_PARKED_TESTNET_TX_ID,
      sourceLabel: 'LIVE MONAD TESTNET RECORD (READ-ONLY AUDIT)',
      title: 'Commercial Solar Procurement (Historical Testnet Run - Parked at Verification)',
      deliverable: 'Supply and deliver 2 solar panels to the buyer. Seller provides product serial numbers, delivery evidence and installation/site evidence.',
      buyer: 'Solar Procurement Ltd.',
      buyerWallet: TARGET_BUYER_ADDRESS,
      seller: 'Dallas Solar Supply Co.',
      sellerWallet: TARGET_SELLER_ADDRESS,
      verifier: '0x16D7bD08Ad79bBCdBa116A652f68589FE5d6F4EA',
      amountMon: '0.001 MON',
      state: liveOnchainStates[HISTORICAL_PARKED_TESTNET_TX_ID] || TransactionState.VERIFICATION,
      settlementType: 'MONAD TESTNET ESCROW (HISTORICAL AUDIT - PARKED AT VERIFICATION)',
      onchainTxHash: HISTORICAL_PARKED_TESTNET_TX_HASH,
      isReadOnly: true,
    },
    // 3. Previous Live Monad Testnet Run (Read-Only Audit)
    {
      id: HISTORICAL_LIVE_TESTNET_TX_ID,
      sourceLabel: 'LIVE MONAD TESTNET RECORD (READ-ONLY AUDIT)',
      title: 'Commercial Solar Procurement (Previous Live Run)',
      buyer: 'Solar Procurement Ltd.',
      buyerWallet: '0xa4bCC57d40311D715ECe34940191820d4a81C50F',
      seller: 'Dallas Solar Supply Co.',
      sellerWallet: '0x6f30D20b8c5bE781bADD86341415b556fB13c873',
      verifier: '0x16D7bD08Ad79bBCdBa116A652f68589FE5d6F4EA',
      amountMon: '0.001 MON',
      state: liveOnchainStates[HISTORICAL_LIVE_TESTNET_TX_ID] || TransactionState.PROPOSED,
      settlementType: 'MONAD TESTNET ESCROW (READ-ONLY HISTORICAL RUN)',
      onchainTxHash: HISTORICAL_LIVE_TESTNET_TX_HASH,
      isReadOnly: true,
    },
    // 3. Canonical Historical Dispute Transaction
    {
      id: CANONICAL_TESTNET_TX_ID,
      sourceLabel: 'LIVE MONAD TESTNET RECORD (READ-ONLY AUDIT)',
      title: '100 Commercial Solar Panels (Disputed Delivery)',
      buyer: 'Solar Procurement Ltd.',
      buyerWallet: '0x287196Cdbf41da13Cb7083392e47eaAf105b58A0',
      seller: 'Dallas Solar Supply Co.',
      sellerWallet: '0x6f30D20b8c5bE781bADD86341415b556fB13c873',
      verifier: '0x16D7bD08Ad79bBCdBa116A652f68589FE5d6F4EA',
      amountMon: '0.001 MON',
      state: 'SETTLED',
      settlementType: 'HUMAN ADJUDICATION (1,500 bps MEDIAN)',
      receiptId: 2,
      onchainTxHash: '0x91ff62584f4386250ccb09f28808453bb373273d9fa5f56cf04378c2a78084ba',
      isReadOnly: true,
    },
    // 4. Simulated Demo A
    {
      id: 'story-a',
      sourceLabel: 'SIMULATED AUTONOMOUS AGENT DEMO',
      title: 'Tier-1 Solar PV Procurement (Autonomous Fulfillment)',
      buyer: 'Solar Procurement Ltd.',
      buyerWallet: '0x287196Cdbf41da13Cb7083392e47eaAf105b58A0',
      seller: 'Dallas Solar Supply Co.',
      sellerWallet: '0x6f30D20b8c5bE781bADD86341415b556fB13c873',
      verifier: '0x16D7bD08Ad79bBCdBa116A652f68589FE5d6F4EA',
      amountMon: '12.5 MON',
      state: 'SETTLED',
      settlementType: 'AUTONOMOUS AGENT (100% RELEASE)',
      receiptId: 1,
    },
  ];

  const filtered = transactions.filter((tx) => {
    if (filter === 'FRESH_LIVE') return tx.isFreshLive;
    if (filter === 'TESTNET') return Boolean(tx?.id && tx.id.startsWith('0x'));
    if (filter === 'AUTONOMOUS') return tx.sourceLabel === 'SIMULATED AUTONOMOUS AGENT DEMO';
    return true;
  });

  return (
    <div className="min-h-screen bg-[#07080d] text-gray-100 py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-6">
          <div>
            <div className="text-xs font-mono text-purple-400 font-bold uppercase tracking-wider mb-1">
              ESCROW STATE MACHINE &amp; TRANSACTION ROOMS
            </div>
            <h1 className="text-3xl font-extrabold text-white">Transaction Rooms Directory</h1>
            <p className="text-xs sm:text-sm text-gray-400 font-mono mt-1">
              Inspect active and settled transactions across live Monad Testnet executions and simulation tracks.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 bg-gray-900/80 p-1.5 rounded-xl border border-gray-800 font-mono text-xs">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg transition ${
                filter === 'ALL' ? 'bg-purple-700 text-white font-bold' : 'text-gray-400 hover:text-white'
              }`}
            >
              All ({transactions.length})
            </button>
            <button
              onClick={() => setFilter('FRESH_LIVE')}
              className={`px-3 py-1.5 rounded-lg transition ${
                filter === 'FRESH_LIVE'
                  ? 'bg-blue-600 text-white font-bold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Fresh Live ({transactions.filter((t) => t.isFreshLive).length})
            </button>
            <button
              onClick={() => setFilter('TESTNET')}
              className={`px-3 py-1.5 rounded-lg transition ${
                filter === 'TESTNET' ? 'bg-purple-700 text-white font-bold' : 'text-gray-400 hover:text-white'
              }`}
            >
              Monad Testnet ({transactions.filter((t) => Boolean(t?.id && t.id.startsWith('0x')) || t.isFreshLive).length})
            </button>
            <button
              onClick={() => setFilter('AUTONOMOUS')}
              className={`px-3 py-1.5 rounded-lg transition ${
                filter === 'AUTONOMOUS' ? 'bg-purple-700 text-white font-bold' : 'text-gray-400 hover:text-white'
              }`}
            >
              Simulated Demo ({transactions.filter((t) => t.sourceLabel === 'SIMULATED AUTONOMOUS AGENT DEMO').length})
            </button>
          </div>
        </div>

        {/* Transactions List */}
        <div className="space-y-6">
          {filtered.map((tx) => (
            <div
              key={tx.id}
              className={`p-6 rounded-2xl border transition-all ${
                tx.isFreshLive
                  ? 'bg-gradient-to-b from-[#0e172a] via-[#09101c] to-[#07080d] border-blue-500/80 shadow-2xl shadow-blue-950/30 ring-1 ring-blue-500/20'
                  : tx.isReadOnly
                  ? 'bg-gradient-to-b from-[#141026] via-[#0d0e18] to-[#07080d] border-purple-700/70 shadow-2xl shadow-purple-950/20'
                  : 'bg-gradient-to-b from-[#0a121d] via-[#080d16] to-[#07080d] border-gray-800 shadow-xl'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800/80 pb-4 mb-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span
                      className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                        tx.isFreshLive
                          ? 'bg-blue-950 text-blue-300 border border-blue-500'
                          : tx.isReadOnly
                          ? 'bg-purple-950 text-purple-300 border border-purple-700'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                      }`}
                    >
                      {tx.sourceLabel}
                    </span>
                    {tx.receiptId && (
                      <span className="text-xs font-mono text-gray-400">
                        Receipt #{tx.receiptId}
                      </span>
                    )}
                    {tx.isFreshLive && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-700 animate-pulse">
                        LIVE ONCHAIN
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-white">{tx.title}</h3>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-mono font-bold ${
                      tx.state === 'SETTLED'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                        : 'bg-blue-950 text-blue-300 border border-blue-600'
                    }`}
                  >
                    STATE: {tx.state}
                  </span>
                </div>
              </div>

              {/* Three-Sided Counterparty Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-950/80 p-4 rounded-xl border border-gray-800/80 font-mono text-xs mb-5">
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

              {/* Deliverable Intent */}
              {tx.deliverable && (
                <div className="p-3 bg-gray-950/60 rounded-xl border border-gray-800 font-mono text-xs mb-4">
                  <span className="text-gray-400 text-[10px] block uppercase font-bold mb-0.5">
                    DELIVERABLE INTENT:
                  </span>
                  <span className="text-gray-200 font-sans text-xs">{tx.deliverable}</span>
                </div>
              )}

              {/* Parameters & Settlement Detail */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs mb-5">
                <div className="p-3 bg-gray-950/60 rounded-xl border border-gray-800">
                  <span className="text-gray-400 text-[10px] block">ESCROW CAPITAL</span>
                  <span className="text-emerald-400 font-bold text-sm">{tx.amountMon}</span>
                  <span className="text-[10px] text-gray-500 block">Monad Metropolis Testnet</span>
                </div>
                <div className="p-3 bg-gray-950/60 rounded-xl border border-gray-800 sm:col-span-2">
                  <span className="text-gray-400 text-[10px] block">SETTLEMENT METHOD</span>
                  <span className="text-white font-bold text-xs">{tx.settlementType}</span>
                  <span className="text-[10px] text-gray-400 block mt-0.5">
                    {tx.isFreshLive
                      ? 'Interactive browser wallet execution • Stage 1 Agreement pending'
                      : tx.isReadOnly
                      ? 'Adjudicated onchain by dispute resolver 0x12f9...c35E with 3 signed judge ballots'
                      : 'Executed autonomously by buyer agent under pre-authorized policy'}
                  </span>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-gray-800/80">
                <div className="text-xs font-mono text-gray-400 space-y-0.5">
                  <div>
                    Tx ID: <code className="text-purple-300">{tx.id.length > 30 ? `${tx.id.slice(0, 16)}...${tx.id.slice(-8)}` : tx.id}</code>
                  </div>
                  {tx.onchainTxHash && (
                    <div className="text-[11px]">
                      Onchain Tx:{' '}
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
                  href={tx.id === 'new-live-escrow' ? '/initiator/intent' : `/transactions/${tx.id}`}
                  className={`w-full sm:w-auto py-2.5 px-6 rounded-xl font-mono text-xs font-bold transition shadow-md text-center flex items-center justify-center gap-2 ${
                    tx.isFreshLive
                      ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-950'
                      : 'bg-purple-700 hover:bg-purple-600 text-white shadow-purple-950'
                  }`}
                >
                  <span>
                    {tx.id === 'new-live-escrow'
                      ? 'Initialize Live Escrow (Seller: 0x0e73...)'
                      : tx.isFreshLive
                      ? 'Enter Fresh Transaction Room'
                      : tx.isReadOnly
                      ? 'View Historical Audit Record'
                      : 'Enter Transaction Room'}
                  </span>
                  <span>→</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
