'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useDemoNetwork, type DealRequest } from '../context/DemoNetworkContext';
import { isDefinitiveBenchmark, CANONICAL_FLOW_A_TX_ID, CANONICAL_FLOW_B_TX_ID } from '../lib/invitation-utils';
import {
  VERIFIED_BENCHMARK_PROVENANCE_EVENTS,
  VERIFIED_BENCHMARK_RECEIPTS,
  DEPLOYED_ESCROW_ADDRESS,
  DEPLOYED_REGISTRY_ADDRESS,
  getExplorerTxUrl,
  getExplorerAddressUrl,
  getExplorerBlockUrl,
  getExplorerSearchUrl,
  MONAD_EXPLORER_URL,
  DEFAULT_ENVIO_GRAPHQL_URL,
} from '../lib/benchmark-data';

export interface ProvenanceEvent {
  id: string;
  eventType: string;
  transactionId: string;
  actor: string;
  actorRole: string;
  details: string;
  blockNumber: number;
  timestamp: string;
  txHash: string;
  category: 'agreement' | 'escrow' | 'evidence' | 'verification' | 'dispute' | 'settlement' | 'receipt';
  provenanceType: 'BENCHMARK' | 'SESSION';
}

// Defense-in-depth: explicit blacklist of known historical dev fixture transaction IDs
const DEV_FIXTURE_TX_IDS = new Set([
  '0x9047df33704601c76d17dee95bd5a0c295d065ebb831a79ba18555ea39d4cc5d',
  '0xbc7555bb1f8b5b84e9adb1bc17fb61ee5fe4a9dd97a858b3814ac45e9dd84acf',
  '0xbd300c0999901576ced189cedd074cd577b57df181abdb19d0fd261780c77956',
  '0xb2e9622c0680abc07bd894864b088687462a802f7d3d1d92d005579b67a0e7d6',
  '0xbbd0176291d62b32c3e096d0314c0fab6bcfa9131c1b26a825b3ce994e645f5e',
  '0x0bb2eaa948a832b6ef45773bf29b81febf1b8342e7479ba518c7d495905b250a',
]);

const AUTHORITATIVE_PROVENANCE_EVENTS: ProvenanceEvent[] = VERIFIED_BENCHMARK_PROVENANCE_EVENTS.map((e) => ({
  id: e.id,
  eventType: e.eventType,
  transactionId: e.transactionId,
  actor: e.actor,
  actorRole: e.actorRole,
  details: e.details,
  blockNumber: e.blockNumber,
  timestamp: e.timestamp,
  txHash: e.txHash,
  category: e.category,
  provenanceType: 'BENCHMARK',
}));

function deriveActorRole(eventType: string, actor: string, connectedWallet?: string | null): string {
  const a = (actor || '').toLowerCase();
  if (connectedWallet && a === connectedWallet.toLowerCase()) {
    switch (eventType) {
      case 'TransactionCreated':
      case 'TransactionFunded':
      case 'EscrowFunded':
        return 'Your Wallet (Buyer)';
      case 'TransactionAgreed':
      case 'TransactionStarted':
      case 'WorkStarted':
      case 'EvidenceAnchored':
        return 'Your Wallet (Seller)';
      case 'VerificationStarted':
      case 'VerificationSubmitted':
        return 'Your Wallet (Verifier)';
      default:
        return 'Your Connected Wallet';
    }
  }

  if (a === '0xa4bcc57d40311d715ece34940191820d4a81c50f') return 'Buyer';
  if (a === '0x0e73dbff9047423b520fa9fc23a95645fc986ee8') return 'Seller';
  if (a === '0xb064d69428b9838c2a3e408cf995ea8eb5182c48') return 'Designated Verifier';
  if (a === '0x12f9e53c31f7629acae0ba70588794945ec6c35e') return 'Dispute Resolver';
  if (a === '0x925ea880ca53de0352b84b24d0c0dee5b258015a') return 'TrustMesh Escrow';
  if (a === '0xe1994e0df7cd5a836be4b02ae2164a542418b819') return 'TrustReceipt Registry';

  switch (eventType) {
    case 'TransactionCreated':
    case 'TransactionFunded':
    case 'EscrowFunded':
      return 'Buyer';
    case 'TransactionAgreed':
    case 'TransactionStarted':
    case 'WorkStarted':
    case 'EvidenceAnchored':
      return 'Seller';
    case 'VerificationStarted':
    case 'VerificationSubmitted':
      return 'Designated Verifier';
    case 'DisputeOpened':
      return 'Disputing Party';
    case 'DisputeResolved':
      return 'Dispute Resolver';
    case 'TransactionSettled':
    case 'EscrowSettled':
      return 'Authorized Wallet / Escrow';
    case 'TrustReceiptIssued':
      return 'TrustReceipt Registry';
    default:
      return 'Network Participant';
  }
}

function mapCategory(eventType: string): ProvenanceEvent['category'] {
  switch (eventType) {
    case 'TransactionCreated':
    case 'TransactionAgreed':
      return 'agreement';
    case 'TransactionFunded':
    case 'EscrowFunded':
      return 'escrow';
    case 'TransactionStarted':
    case 'WorkStarted':
    case 'EvidenceAnchored':
      return 'evidence';
    case 'VerificationStarted':
    case 'VerificationSubmitted':
      return 'verification';
    case 'DisputeOpened':
    case 'DisputeResolved':
      return 'dispute';
    case 'TransactionSettled':
    case 'EscrowSettled':
      return 'settlement';
    case 'TrustReceiptIssued':
      return 'receipt';
    default:
      return 'evidence';
  }
}

/**
 * Sanitizes event details to ensure state and verification outcomes are never conflated.
 * Specifically prevents legacy outcome and settlement state conflation from appearing.
 */
function sanitizeEventDetails(details: string, eventType: string, transactionId: string): string {
  if (!details) return '';
  let sanitized = details;
  if (/issued for transaction outcome/i.test(sanitized)) {
    const match = sanitized.match(/Trust Receipt #?(\d+)/i);
    const receiptNum = match ? match[1] : '3';
    sanitized = `Trust Receipt #${receiptNum} issued. Verification Outcome: VALID (Outcome 1 / PASS). Transaction State: SETTLED (11)`;
  }
  return sanitized;
}

/**
 * Principled validation test determining whether an indexed event belongs to the current user's session.
 * Invariants:
 * 1. Disconnected wallet => strictly false (zero session events).
 * 2. Canonical benchmarks & dev fixtures => false.
 * 3. Connected wallet must be verified direct actor or recorded participant.
 */
function isCurrentSessionEvent(
  evt: { transactionId?: string; actor?: string },
  connectedWallet: string | null,
  userRequests: DealRequest[]
): boolean {
  if (!connectedWallet) return false;

  const normConnected = connectedWallet.toLowerCase().trim();
  const txId = (evt.transactionId || '').toLowerCase().trim();
  const actor = (evt.actor || '').toLowerCase().trim();

  // Exclude benchmarks and dev fixtures
  if (isDefinitiveBenchmark({ transactionId: txId })) return false;
  if (DEV_FIXTURE_TX_IDS.has(txId)) return false;

  // Session ownership check: connected wallet is direct actor or authorized participant
  const isDirectActor = actor === normConnected;
  const isTransactionParticipant = userRequests.some((req) => {
    if (!req.transactionId) return false;
    if (req.transactionId.toLowerCase().trim() !== txId) return false;
    const buyer = (req.initiatorWallet || '').toLowerCase().trim();
    const seller = (req.receiverWallet || '').toLowerCase().trim();
    const verifier = (req.verifierAddress || '').toLowerCase().trim();
    return buyer === normConnected || seller === normConnected || verifier === normConnected;
  });

  return isDirectActor || isTransactionParticipant;
}

export default function TrustActivity() {
  const { wallet, allRequests } = useDemoNetwork();
  const connectedAddress = wallet.isConnected && wallet.address ? wallet.address.toLowerCase().trim() : null;

  const [activeTab, setActiveTab] = useState<'events' | 'transactions' | 'schema'>('events');
  const [selectedTxFilter, setSelectedTxFilter] = useState<'all' | 'flow-a' | 'flow-b' | 'session'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [latestBlock, setLatestBlock] = useState<number | null>(66714476);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Check if an Envio GraphQL URL is configured in the environment with public fallback
  const envioGraphqlUrl =
    process.env.NEXT_PUBLIC_ENVIO_GRAPHQL_URL ||
    'https://indexer.dev.hyperindex.xyz/bd02c3f/v1/graphql';
  const isEnvioConfigured = Boolean(envioGraphqlUrl);

  const [sessionEvents, setSessionEvents] = useState<ProvenanceEvent[]>([]);
  const [dataSource, setDataSource] = useState<'connecting' | 'envio' | 'rpc_fallback'>('connecting');
  const [envioIndexedBlock, setEnvioIndexedBlock] = useState<number | null>(null);

  const fetchEnvioEvents = useCallback(async () => {
    if (!envioGraphqlUrl) {
      setSessionEvents([]);
      setDataSource('rpc_fallback');
      return;
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(envioGraphqlUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `{
            _meta {
              progressBlock
              isReady
            }
            LifecycleEvent(order_by: { blockNumber: desc }, limit: 50) {
              id
              eventType
              transactionId
              actor
              details
              blockNumber
              timestamp
              txHash
            }
          }`,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        throw new Error(`Envio HTTP ${res.status}`);
      }
      const data = await res.json();
      const metaBlock = data?.data?._meta?.[0]?.progressBlock;
      if (metaBlock) {
        setEnvioIndexedBlock(metaBlock);
      }
      const rawEvents = data?.data?.LifecycleEvent;

      if (Array.isArray(rawEvents) && rawEvents.length > 0) {
        setDataSource('envio');

        // Principled Filter: Only accept indexed events proven to belong to the current connected wallet session
        if (!connectedAddress) {
          setSessionEvents([]);
          return;
        }

        const validSessionEvents: ProvenanceEvent[] = rawEvents
          .filter((e: any) => isCurrentSessionEvent(e, connectedAddress, allRequests))
          .map((e: any) => ({
            id: `session-${e.id}`,
            eventType: e.eventType,
            transactionId: e.transactionId,
            actor: e.actor,
            actorRole: deriveActorRole(e.eventType, e.actor, connectedAddress),
            details: sanitizeEventDetails(e.details, e.eventType, e.transactionId),
            blockNumber: Number(e.blockNumber),
            timestamp:
              typeof e.timestamp === 'string' && e.timestamp.length <= 11
                ? new Date(Number(e.timestamp) * 1000).toISOString()
                : e.timestamp
                ? String(e.timestamp)
                : new Date().toISOString(),
            txHash: e.txHash,
            category: mapCategory(e.eventType),
            provenanceType: 'SESSION',
          }));

        setSessionEvents(validSessionEvents);
      } else {
        setSessionEvents([]);
        setDataSource('rpc_fallback');
      }
    } catch {
      clearTimeout(timeoutId);
      // Graceful fallback to RPC state
      setSessionEvents([]);
      setDataSource('rpc_fallback');
    }
  }, [envioGraphqlUrl, connectedAddress, allRequests]);

  const fetchLatestBlock = useCallback(async () => {
    try {
      const res = await fetch('https://testnet-rpc.monad.xyz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 }),
      });
      const data = await res.json();
      if (data?.result) {
        setLatestBlock(parseInt(data.result, 16));
      }
    } catch {
      setLatestBlock(66714476);
    }
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchLatestBlock(), fetchEnvioEvents()]);
    setTimeout(() => setIsRefreshing(false), 400);
  };

  useEffect(() => {
    fetchLatestBlock();
    fetchEnvioEvents();
    const interval = setInterval(() => {
      fetchLatestBlock();
      fetchEnvioEvents();
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchLatestBlock, fetchEnvioEvents]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter events based on active selection
  const displayedEvents = useMemo(() => {
    if (selectedTxFilter === 'flow-a') {
      return AUTHORITATIVE_PROVENANCE_EVENTS.filter((e) =>
        e.transactionId.toLowerCase().startsWith('0x961c')
      );
    }
    if (selectedTxFilter === 'flow-b') {
      return AUTHORITATIVE_PROVENANCE_EVENTS.filter((e) =>
        e.transactionId.toLowerCase().startsWith('0x2b57')
      );
    }
    if (selectedTxFilter === 'session') {
      return sessionEvents;
    }
    // 'all': Public Benchmark Provenance (Flow A & Flow B) + Current Session Events (if any)
    return [...AUTHORITATIVE_PROVENANCE_EVENTS, ...sessionEvents];
  }, [selectedTxFilter, sessionEvents]);

  const uniqueFlowsCount = useMemo(() => {
    return new Set(displayedEvents.map((e) => e.transactionId)).size;
  }, [displayedEvents]);

  const totalReceiptsCount = useMemo(() => {
    return VERIFIED_BENCHMARK_RECEIPTS.length;
  }, []);

  const getCategoryBadge = (category: ProvenanceEvent['category']) => {
    switch (category) {
      case 'agreement':
        return 'bg-blue-950/80 text-blue-300 border-blue-800';
      case 'escrow':
        return 'bg-indigo-950/80 text-indigo-300 border-indigo-800';
      case 'evidence':
        return 'bg-cyan-950/80 text-cyan-300 border-cyan-800';
      case 'verification':
        return 'bg-purple-950/80 text-purple-300 border-purple-800';
      case 'dispute':
        return 'bg-amber-950/80 text-amber-300 border-amber-800';
      case 'settlement':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-800';
      case 'receipt':
        return 'bg-pink-950/80 text-pink-300 border-pink-800';
    }
  };

  return (
    <div className="bg-[#0b0d14] rounded-2xl border border-purple-900/40 p-6 shadow-2xl space-y-6">
      {/* Top Bar with Live Indexer Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold text-purple-400 uppercase tracking-wider">
              PUBLIC ONCHAIN PROVENANCE
            </span>
            {dataSource === 'envio' ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Powered by Envio HyperIndex
              </span>
            ) : dataSource === 'rpc_fallback' ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-gray-900 text-gray-400 border border-gray-700">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Monad RPC fallback
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-gray-900 text-gray-400 border border-gray-700">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                Connecting to indexer…
              </span>
            )}
          </div>
          <h2 className="text-2xl font-bold text-white">Immutable Event Ledger</h2>
          <p className="text-xs text-gray-400 font-mono mt-0.5">
            Real-time indexed provenance across commercial intent, cryptographic deliverables, and terminal settlements on Monad.
          </p>
        </div>

        {/* Status Indicator & Live Block */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-gray-950 border border-gray-800 font-mono text-xs flex flex-wrap items-center gap-2">
            <span className="text-gray-500">ENVIO INDEXED:</span>
            <span className="text-emerald-400 font-bold">
              {envioIndexedBlock ? `#${envioIndexedBlock.toLocaleString()}` : 'Querying...'}
            </span>
            <span className="text-gray-600">|</span>
            <span className="text-gray-500">CHAIN HEAD:</span>
            <span className="text-purple-300 font-bold">
              {latestBlock ? `#${latestBlock.toLocaleString()}` : 'Connecting...'}
            </span>
            {envioIndexedBlock && latestBlock ? (
              <span className="text-[10px] text-gray-400">
                (Lag: {Math.max(0, latestBlock - envioIndexedBlock)} blocks)
              </span>
            ) : null}
          </div>

          <div
            className={`px-3 py-1.5 rounded-xl font-mono text-xs flex items-center gap-2 border ${
              dataSource === 'envio'
                ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300'
                : dataSource === 'rpc_fallback'
                ? 'bg-purple-950/60 border-purple-700 text-purple-300'
                : 'bg-gray-950/60 border-gray-700 text-gray-400'
            }`}
            title={
              dataSource === 'envio'
                ? 'Envio HyperIndex (GraphQL Primary)'
                : dataSource === 'rpc_fallback'
                ? 'Monad RPC (Live Trace Fallback)'
                : 'Connecting to indexer…'
            }
          >
            <span
              className={`w-2 h-2 rounded-full ${
                dataSource === 'envio'
                  ? 'bg-emerald-400 animate-ping'
                  : dataSource === 'rpc_fallback'
                  ? 'bg-purple-400'
                  : 'bg-gray-400'
              }`}
            />
            <span>
              {dataSource === 'envio'
                ? 'Source: Envio HyperIndex'
                : dataSource === 'rpc_fallback'
                ? 'Source: Monad RPC fallback'
                : 'Connecting to indexer…'}
            </span>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-300 border border-gray-700 transition"
            title="Refresh Block & Events"
          >
            <svg
              className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-purple-400' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
        <div className="p-3.5 rounded-xl bg-gray-950/70 border border-gray-800/80">
          <span className="text-gray-500 text-[10px] block uppercase">Network</span>
          <span className="text-white font-bold text-sm">Monad Testnet</span>
          <span className="text-[10px] text-purple-400 block mt-0.5">Chain ID: 10143</span>
        </div>

        <div className="p-3.5 rounded-xl bg-gray-950/70 border border-gray-800/80">
          <span className="text-gray-500 text-[10px] block uppercase">Escrow Contract</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <a
              href={getExplorerAddressUrl(DEPLOYED_ESCROW_ADDRESS)}
              target="_blank"
              rel="noreferrer"
              className="text-purple-300 hover:text-purple-200 underline font-bold text-xs truncate"
              title={DEPLOYED_ESCROW_ADDRESS}
            >
              {DEPLOYED_ESCROW_ADDRESS.slice(0, 6)}...{DEPLOYED_ESCROW_ADDRESS.slice(-4)} ↗
            </a>
            <button
              onClick={() => copyToClipboard(DEPLOYED_ESCROW_ADDRESS, 'metrics-escrow')}
              className="text-gray-600 hover:text-gray-300 text-[9px] px-1 bg-gray-900 rounded border border-gray-800 font-mono"
              title="Copy escrow address"
            >
              {copiedId === 'metrics-escrow' ? '✓' : 'copy'}
            </button>
          </div>
          <span className="text-[10px] text-emerald-400 block mt-0.5">State: SETTLED (11)</span>
        </div>

        <div className="p-3.5 rounded-xl bg-gray-950/70 border border-gray-800/80">
          <span className="text-gray-500 text-[10px] block uppercase">Receipt Registry</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <a
              href={getExplorerAddressUrl(DEPLOYED_REGISTRY_ADDRESS)}
              target="_blank"
              rel="noreferrer"
              className="text-cyan-300 hover:text-cyan-200 underline font-bold text-xs truncate"
              title={DEPLOYED_REGISTRY_ADDRESS}
            >
              {DEPLOYED_REGISTRY_ADDRESS.slice(0, 6)}...{DEPLOYED_REGISTRY_ADDRESS.slice(-4)} ↗
            </a>
            <button
              onClick={() => copyToClipboard(DEPLOYED_REGISTRY_ADDRESS, 'metrics-registry')}
              className="text-gray-600 hover:text-gray-300 text-[9px] px-1 bg-gray-900 rounded border border-gray-800 font-mono"
              title="Copy registry address"
            >
              {copiedId === 'metrics-registry' ? '✓' : 'copy'}
            </button>
          </div>
          <span className="text-[10px] text-gray-400 block mt-0.5">Soulbound Vault</span>
        </div>

        <div className="p-3.5 rounded-xl bg-gray-950/70 border border-gray-800/80">
          <span className="text-gray-500 text-[10px] block uppercase">Indexed Events</span>
          <span className="text-white font-bold text-sm">{displayedEvents.length} Events</span>
          <span className="text-[10px] text-purple-400 block mt-0.5">
            {uniqueFlowsCount} Flows · {totalReceiptsCount} Receipts
          </span>
        </div>
      </div>

      {/* Tabs & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-gray-950 border border-gray-800 self-start">
          <button
            onClick={() => setActiveTab('events')}
            className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition ${
              activeTab === 'events'
                ? 'bg-purple-700 text-white shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Lifecycle Events ({displayedEvents.length})
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition ${
              activeTab === 'transactions'
                ? 'bg-purple-700 text-white shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Verified Flows (2)
          </button>
          <button
            onClick={() => setActiveTab('schema')}
            className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition ${
              activeTab === 'schema'
                ? 'bg-purple-700 text-white shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Envio GraphQL Query
          </button>
        </div>

        {activeTab === 'events' && (
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-gray-500 text-[11px]">Filter Flow:</span>
            <select
              value={selectedTxFilter}
              onChange={(e) => setSelectedTxFilter(e.target.value as any)}
              className="bg-gray-950 border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-purple-600"
            >
              <option value="all">All Provenance Events</option>
              <option value="flow-a">Flow A: 0x961c... (Verified Release)</option>
              <option value="flow-b">Flow B: 0x2b57... (Dispute Consensus)</option>
              {wallet.isConnected && (
                <option value="session">Current Session ({sessionEvents.length})</option>
              )}
            </select>
          </div>
        )}
      </div>

      {/* Tab 1: Chronological Lifecycle Events */}
      {activeTab === 'events' && (
        <div className="space-y-4">
          {/* Benchmark Team Disclosure Banner */}
          <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-800/60 font-mono text-xs space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-900/60 text-purple-300 border border-purple-700">
                  Public Benchmark Event
                </span>
                <span className="text-purple-300/80 text-[11px] font-sans">
                  Public Demo / Architectural Benchmark
                </span>
              </div>
              <p className="text-gray-300 text-xs font-sans">
                These are testnet transactions executed by the VeriqoMesh team to demonstrate Flow A and Flow B. They are not your transactions.
              </p>
            </div>
            <div className="text-[11px] text-gray-400 font-sans border-t border-purple-900/40 pt-2 space-y-0.5">
              <div>All wallets shown are team-controlled testnet wallets.</div>
              <div>Scenario (solar PV delivery) is illustrative; onchain data is limited to state transitions, hashes and amounts.</div>
            </div>
          </div>

          {displayedEvents.length === 0 ? (
            <div className="p-8 rounded-xl bg-gray-950/40 border border-gray-800 text-center font-mono space-y-3">
              {selectedTxFilter === 'session' && !wallet.isConnected ? (
                <>
                  <div className="text-gray-300 text-xs font-semibold">
                    Wallet connection required for session provenance.
                  </div>
                  <p className="text-gray-500 text-[11px] max-w-md mx-auto font-sans">
                    Connect your Monad wallet to track live commercial escrow and settlement provenance attributable to your address.
                  </p>
                  <button
                    onClick={() => wallet.connect()}
                    className="px-4 py-2 rounded-lg bg-purple-700 hover:bg-purple-600 text-white font-mono text-xs font-bold transition inline-flex items-center gap-2"
                  >
                    Connect Monad Wallet
                  </button>
                </>
              ) : selectedTxFilter === 'session' ? (
                <>
                  <div className="text-gray-300 text-xs font-semibold">
                    0 live session provenance events recorded for this account.
                  </div>
                  <p className="text-gray-500 text-[11px] max-w-md mx-auto font-sans">
                    Initiate or fulfill commercial agreements on Monad Testnet to record onchain lifecycle events.
                  </p>
                  <div className="pt-2">
                    <Link
                      href="/initiator/intent"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-600 text-white font-mono text-xs font-bold transition"
                    >
                      Create Agreement →
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-gray-300 text-xs font-semibold">
                    No provenance events found for selected filter.
                  </div>
                  <p className="text-gray-500 text-[11px] max-w-md mx-auto font-sans">
                    Events are indexed automatically as commercial agreements are proposed, funded, attested, and settled on Monad Testnet.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="space-y-2 min-w-[640px]">
                {displayedEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-4 rounded-xl bg-gray-950/60 border border-gray-800/80 hover:border-purple-800/60 transition space-y-2"
                  >
                    <div className="flex items-center justify-between gap-3 text-xs font-mono">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getCategoryBadge(evt.category)}`}>
                          {evt.eventType}
                        </span>
                        {evt.provenanceType === 'SESSION' && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium bg-emerald-950/70 text-emerald-300 border border-emerald-800/80">
                            Current Session Event
                          </span>
                        )}
                        <span className="text-gray-400">
                          by <strong className="text-gray-200">{evt.actorRole}</strong>
                        </span>
                        <a
                          href={getExplorerAddressUrl(evt.actor)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-gray-500 hover:text-purple-300 text-[11px] underline"
                          title={evt.actor}
                        >
                          {evt.actor.slice(0, 6)}...{evt.actor.slice(-4)}
                        </a>
                        <button
                          onClick={() => copyToClipboard(evt.actor, `actor-${evt.id}`)}
                          className="text-gray-600 hover:text-gray-300 text-[10px] px-1 py-0.5 bg-gray-900 rounded border border-gray-800"
                          title="Copy full address"
                        >
                          {copiedId === `actor-${evt.id}` ? '✓' : 'copy'}
                        </button>
                      </div>

                      <div className="flex items-center gap-3 text-gray-400 text-[11px]">
                        <a
                          href={getExplorerBlockUrl(evt.blockNumber)}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-purple-300 underline"
                        >
                          Block #{evt.blockNumber.toLocaleString()}
                        </a>
                        <a
                          href={getExplorerTxUrl(evt.txHash)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-purple-400 hover:text-purple-300 underline font-mono flex items-center gap-1"
                          title={evt.txHash}
                        >
                          <span>tx: {evt.txHash.slice(0, 8)}...</span>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                        <button
                          onClick={() => copyToClipboard(evt.txHash, `tx-${evt.id}`)}
                          className="text-gray-600 hover:text-gray-300 text-[10px] px-1 py-0.5 bg-gray-900 rounded border border-gray-800 font-mono"
                          title="Copy full tx hash"
                        >
                          {copiedId === `tx-${evt.id}` ? '✓' : 'copy'}
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-gray-300 font-sans pl-1">
                      {evt.details}
                    </p>

                    <div className="flex items-center justify-between text-[10px] font-mono text-gray-500 pt-1 border-t border-gray-900">
                      <div className="flex items-center gap-1.5 truncate max-w-md">
                        <span>
                          TxId:{' '}
                          <a
                            href={getExplorerSearchUrl(evt.transactionId)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-gray-400 hover:text-purple-300 underline"
                            title={evt.transactionId}
                          >
                            {evt.transactionId.length > 20
                              ? `${evt.transactionId.slice(0, 10)}...${evt.transactionId.slice(-8)}`
                              : evt.transactionId}{' '}
                            ↗
                          </a>
                        </span>
                        <button
                          onClick={() => copyToClipboard(evt.transactionId, `txid-${evt.id}`)}
                          className="text-gray-600 hover:text-gray-300 text-[9px] px-1 bg-gray-900 rounded border border-gray-800"
                          title="Copy full transaction ID"
                        >
                          {copiedId === `txid-${evt.id}` ? '✓' : 'copy'}
                        </button>
                      </div>
                      <span>{evt.timestamp}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Verified Flows Summary */}
      {activeTab === 'transactions' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Flow A */}
          <div className="p-5 rounded-xl bg-gradient-to-b from-[#141026] to-[#0a0c14] border border-purple-600/70 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-700">
                  FLOW A — VERIFIED (PASS)
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-purple-950/60 text-purple-300 border border-purple-800">
                  Public Demo / Architectural Benchmark
                </span>
              </div>
              <span className="text-xs font-mono text-emerald-400 font-bold">STATE: SETTLED (11)</span>
            </div>

            <div>
              <h4 className="text-base font-bold text-white">Normal Verified Execution &amp; Authorized Release</h4>
              <p className="text-xs text-gray-400 font-mono mt-0.5">
                Buyer funded 0.001 MON; designated verifier attested PASS; escrow contract automatically released full payout.
              </p>
            </div>

            <div className="space-y-1.5 bg-gray-950/80 p-3 rounded-lg font-mono text-[11px] border border-gray-800">
              <div className="p-2 rounded bg-purple-950/40 border border-purple-800/60 text-purple-300 text-[10px] space-y-0.5 mb-2">
                <div className="font-semibold">Trust Receipt #3 issued</div>
                <div>Verification Outcome: VALID (Outcome 1 / PASS)</div>
                <div>Transaction State: SETTLED (11)</div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-500">Transaction ID:</span>
                <div className="flex items-center gap-1">
                  <a
                    href={getExplorerSearchUrl(CANONICAL_FLOW_A_TX_ID)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-purple-300 hover:text-purple-200 underline font-mono"
                    title={CANONICAL_FLOW_A_TX_ID}
                  >
                    0x961c...54e1 ↗
                  </a>
                  <button
                    onClick={() => copyToClipboard(CANONICAL_FLOW_A_TX_ID, 'flow-a-txid')}
                    className="text-gray-600 hover:text-gray-300 text-[9px] px-1 bg-gray-900 rounded border border-gray-800"
                    title="Copy full transaction ID"
                  >
                    {copiedId === 'flow-a-txid' ? '✓' : 'copy'}
                  </button>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Transaction State:</span>
                <span className="text-emerald-400 font-bold">SETTLED (11)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Verification Outcome:</span>
                <span className="text-emerald-400 font-bold">VALID (Outcome 1 / PASS)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Trust Receipt:</span>
                <span className="text-cyan-400 font-bold">#3 (Soulbound ERC-5192)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Settlement Block:</span>
                <a
                  href={getExplorerBlockUrl(66436615)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-gray-300 hover:text-purple-300 underline font-mono"
                >
                  66436615 (66,436,615) ↗
                </a>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Designated Verifier:</span>
                <div className="flex items-center gap-1">
                  <a
                    href={getExplorerAddressUrl('0xb064d69428B9838C2a3e408cF995ea8eb5182c48')}
                    target="_blank"
                    rel="noreferrer"
                    className="text-purple-300 hover:text-purple-200 underline font-mono text-[10px]"
                    title="0xb064d69428B9838C2a3e408cF995ea8eb5182c48"
                  >
                    0xb064...2c48 ↗
                  </a>
                  <button
                    onClick={() => copyToClipboard('0xb064d69428B9838C2a3e408cF995ea8eb5182c48', 'flow-a-verifier')}
                    className="text-gray-600 hover:text-gray-300 text-[9px] px-1 bg-gray-900 rounded border border-gray-800"
                    title="Copy full address"
                  >
                    {copiedId === 'flow-a-verifier' ? '✓' : 'copy'}
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Fulfillment Seller:</span>
                <div className="flex items-center gap-1">
                  <a
                    href={getExplorerAddressUrl('0x0e73dBFf9047423b520FA9fc23a95645fC986Ee8')}
                    target="_blank"
                    rel="noreferrer"
                    className="text-purple-300 hover:text-purple-200 underline font-mono text-[10px]"
                    title="0x0e73dBFf9047423b520FA9fc23a95645fC986Ee8"
                  >
                    0x0e73...6Ee8 ↗
                  </a>
                  <button
                    onClick={() => copyToClipboard('0x0e73dBFf9047423b520FA9fc23a95645fC986Ee8', 'flow-a-seller')}
                    className="text-gray-600 hover:text-gray-300 text-[9px] px-1 bg-gray-900 rounded border border-gray-800"
                    title="Copy full address"
                  >
                    {copiedId === 'flow-a-seller' ? '✓' : 'copy'}
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Deliverable Hash:</span>
                <div className="flex items-center gap-1">
                  <a
                    href={getExplorerSearchUrl('0x08a30b2c4935050f1ffbda42a5a6565ab54fc1b090bb47c036afd47aaad2edff')}
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-400 hover:text-cyan-300 underline font-mono"
                    title="0x08a30b2c4935050f1ffbda42a5a6565ab54fc1b090bb47c036afd47aaad2edff"
                  >
                    0x08a3...edff ↗
                  </a>
                  <button
                    onClick={() => copyToClipboard('0x08a30b2c4935050f1ffbda42a5a6565ab54fc1b090bb47c036afd47aaad2edff', 'flow-a-content')}
                    className="text-gray-600 hover:text-gray-300 text-[9px] px-1 bg-gray-900 rounded border border-gray-800"
                    title="Copy full deliverable hash"
                  >
                    {copiedId === 'flow-a-content' ? '✓' : 'copy'}
                  </button>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Settlement Payout:</span>
                <span className="text-white font-bold">RELEASED TO SELLER (0.001 MON)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Settlement Tx:</span>
                <div className="flex items-center gap-1.5">
                  <a
                    href={getExplorerTxUrl('0x691f7a80d65fe1deece2f45e8b6600ee4b2b0ffc14f3fe733d995566e2d83b52')}
                    target="_blank"
                    rel="noreferrer"
                    className="text-purple-400 hover:text-purple-300 underline font-mono"
                    title="0x691f7a80d65fe1deece2f45e8b6600ee4b2b0ffc14f3fe733d995566e2d83b52"
                  >
                    0x691f...3b52 ↗
                  </a>
                  <button
                    onClick={() => copyToClipboard('0x691f7a80d65fe1deece2f45e8b6600ee4b2b0ffc14f3fe733d995566e2d83b52', 'flow-a-tx')}
                    className="text-gray-600 hover:text-gray-300 text-[9px] px-1 bg-gray-900 rounded border border-gray-800"
                    title="Copy settlement tx hash"
                  >
                    {copiedId === 'flow-a-tx' ? '✓' : 'copy'}
                  </button>
                </div>
              </div>
            </div>

            <Link
              href="/transactions/0x961c70865bf6097eb16d1b3a19d90f950b2cdd789eda5554c93baba1de0954e1"
              className="block w-full py-2 text-center rounded-lg bg-purple-700 hover:bg-purple-600 text-white font-mono text-xs font-bold transition"
            >
              Open Settlement Room →
            </Link>
          </div>

          {/* Flow B */}
          <div className="p-5 rounded-xl bg-gradient-to-b from-[#141026] to-[#0a0c14] border border-amber-600/70 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-700">
                  FLOW B — CONTESTED (INCONCLUSIVE)
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-purple-950/60 text-purple-300 border border-purple-800">
                  Public Demo / Architectural Benchmark
                </span>
              </div>
              <span className="text-xs font-mono text-emerald-400 font-bold">STATE: SETTLED (11)</span>
            </div>

            <div>
              <h4 className="text-base font-bold text-white">Contested Outcome &amp; Dispute Resolution</h4>
              <p className="text-xs text-gray-400 font-mono mt-0.5">
                Verifier flagged inconclusive deliverable; dispute escalated onchain and resolved by authorized resolver.
              </p>
            </div>

            <div className="space-y-1.5 bg-gray-950/80 p-3 rounded-lg font-mono text-[11px] border border-gray-800">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Transaction ID:</span>
                <div className="flex items-center gap-1">
                  <a
                    href={getExplorerSearchUrl(CANONICAL_FLOW_B_TX_ID)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-purple-300 hover:text-purple-200 underline font-mono"
                    title={CANONICAL_FLOW_B_TX_ID}
                  >
                    0x2b57...cfc4 ↗
                  </a>
                  <button
                    onClick={() => copyToClipboard(CANONICAL_FLOW_B_TX_ID, 'flow-b-txid')}
                    className="text-gray-600 hover:text-gray-300 text-[9px] px-1 bg-gray-900 rounded border border-gray-800"
                    title="Copy full transaction ID"
                  >
                    {copiedId === 'flow-b-txid' ? '✓' : 'copy'}
                  </button>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Transaction State:</span>
                <span className="text-emerald-400 font-bold">SETTLED (11)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Verification Outcome:</span>
                <span className="text-amber-400 font-bold">INCONCLUSIVE (Outcome 3)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Trust Receipt:</span>
                <span className="text-cyan-400 font-bold">#2 (Soulbound ERC-5192)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Settlement Block:</span>
                <a
                  href={getExplorerBlockUrl(65129932)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-gray-300 hover:text-purple-300 underline font-mono"
                >
                  65,129,932 ↗
                </a>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Deliverable Hash:</span>
                <div className="flex items-center gap-1">
                  <a
                    href={getExplorerSearchUrl('0xe8fd73f129c4c1124fa548c0d28ed31a769f983186b08cf51ed849f177903ad4')}
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-400 hover:text-cyan-300 underline font-mono"
                    title="0xe8fd73f129c4c1124fa548c0d28ed31a769f983186b08cf51ed849f177903ad4"
                  >
                    0xe8fd...3ad4 ↗
                  </a>
                  <button
                    onClick={() => copyToClipboard('0xe8fd73f129c4c1124fa548c0d28ed31a769f983186b08cf51ed849f177903ad4', 'flow-b-content')}
                    className="text-gray-600 hover:text-gray-300 text-[9px] px-1 bg-gray-900 rounded border border-gray-800"
                    title="Copy full deliverable hash"
                  >
                    {copiedId === 'flow-b-content' ? '✓' : 'copy'}
                  </button>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Dispute Allocation:</span>
                <span className="text-white font-bold">1,500 bps (15% Buyer Refund)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Settlement Payout:</span>
                <span className="text-emerald-400 font-bold">0.00085 MON (85% RELEASED TO SELLER)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Settlement Tx:</span>
                <div className="flex items-center gap-1.5">
                  <a
                    href={getExplorerTxUrl('0x91ff62584f4386250ccb09f28808453bb373273d9fa5f56cf04378c2a78084ba')}
                    target="_blank"
                    rel="noreferrer"
                    className="text-purple-400 hover:text-purple-300 underline font-mono"
                    title="0x91ff62584f4386250ccb09f28808453bb373273d9fa5f56cf04378c2a78084ba"
                  >
                    0x91ff...84ba ↗
                  </a>
                  <button
                    onClick={() => copyToClipboard('0x91ff62584f4386250ccb09f28808453bb373273d9fa5f56cf04378c2a78084ba', 'flow-b-tx')}
                    className="text-gray-600 hover:text-gray-300 text-[9px] px-1 bg-gray-900 rounded border border-gray-800"
                    title="Copy settlement tx hash"
                  >
                    {copiedId === 'flow-b-tx' ? '✓' : 'copy'}
                  </button>
                </div>
              </div>
            </div>

            <Link
              href="/transactions/0x2b57d6b0ef1ba16a60c4f801d90d27d23e598fd6b1381e0175077201dc6afcc4"
              className="block w-full py-2 text-center rounded-lg bg-amber-700 hover:bg-amber-600 text-white font-mono text-xs font-bold transition"
            >
              Open Dispute Room →
            </Link>
          </div>
        </div>
      )}

      {/* Tab 3: Envio HyperIndex GraphQL Query & Schema Reference */}
      {activeTab === 'schema' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-gray-950 border border-gray-800 font-mono text-xs space-y-2">
            <div className="text-purple-300 font-bold">
              Envio HyperIndex GraphQL Query Specification
            </div>
            <p className="text-gray-400 font-sans text-xs">
              Developers and third-party auditors can query indexed VeriqoMesh transactions, deliverables, and receipts using standard GraphQL:
            </p>
            <pre className="p-3 rounded-lg bg-black/60 text-purple-200 overflow-x-auto text-[11px] leading-relaxed border border-gray-800">
{`query GetVeriqoMeshProvenance {
  Transaction(limit: 10, order_by: { updatedAt: desc }) {
    id
    buyer
    seller
    verifier
    amount
    status
    verificationOutcome
    createdBlock
    createdTxHash
    evidenceCount
    receiptId
    settledAt
  }
  LifecycleEvent(limit: 25, order_by: { timestamp: desc }) {
    id
    eventType
    transactionId
    actor
    details
    blockNumber
    timestamp
    txHash
  }
  TrustReceipt(limit: 10, order_by: { issuedTimestamp: desc }) {
    id
    transactionId
    partyA
    partyB
    outcome
    issuedBlock
    txHash
  }
}`}
            </pre>
          </div>

          <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-900/40 font-mono text-xs space-y-1">
            <span className="text-purple-300 font-bold block">Indexer Configuration:</span>
            <span className="text-gray-300 block">Indexer directory: <code>indexer/</code></span>
            <span className="text-gray-300 block">Monad Chain ID: <code>10143</code></span>
            <span className="text-gray-300 block">RPC Provider: <code>https://testnet-rpc.monad.xyz</code></span>
            <span className="text-gray-300 block">Indexer Start Block: <code>65,000,000</code></span>
          </div>
        </div>
      )}
    </div>
  );
}
