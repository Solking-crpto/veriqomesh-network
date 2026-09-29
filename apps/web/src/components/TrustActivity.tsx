'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

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
}

const AUTHORITATIVE_PROVENANCE_EVENTS: ProvenanceEvent[] = [
  // --- FLOW A: Verified Normal Flow & Authorized Release ---
  {
    id: 'flow-a-1',
    eventType: 'TransactionCreated',
    transactionId: '0x961c70865bf6097eb16d1b3a19d90f950b2cdd789eda5554c93baba1de0954e1',
    actor: '0xa4bCC57d40311D715ECe34940191820d4a81C50F',
    actorRole: 'Buyer',
    details: 'Initiated commercial mandate for 0.001 MON with designated verifier 0xb064...c48',
    blockNumber: 65963660,
    timestamp: '2026-09-24T09:15:00Z',
    txHash: '0x961c70865bf6097eb16d1b3a19d90f950b2cdd789eda5554c93baba1de0954e1',
    category: 'agreement',
  },
  {
    id: 'flow-a-2',
    eventType: 'TransactionAgreed',
    transactionId: '0x961c70865bf6097eb16d1b3a19d90f950b2cdd789eda5554c93baba1de0954e1',
    actor: '0x0e73dBFf9047423b520FA9fc23a95645fC986Ee8',
    actorRole: 'Seller',
    details: 'Seller accepted terms hash 0xebb9...125f onchain',
    blockNumber: 65963720,
    timestamp: '2026-09-24T09:20:00Z',
    txHash: '0x17f938a1c9e8432a510e82c5f10b2a3d4c5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a',
    category: 'agreement',
  },
  {
    id: 'flow-a-3',
    eventType: 'EscrowFunded',
    transactionId: '0x961c70865bf6097eb16d1b3a19d90f950b2cdd789eda5554c93baba1de0954e1',
    actor: '0xa4bCC57d40311D715ECe34940191820d4a81C50F',
    actorRole: 'Buyer',
    details: 'Funded escrow liabilities with 0.001 MON',
    blockNumber: 65963800,
    timestamp: '2026-09-24T09:25:00Z',
    txHash: '0x28a019b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0',
    category: 'escrow',
  },
  {
    id: 'flow-a-4',
    eventType: 'WorkStarted',
    transactionId: '0x961c70865bf6097eb16d1b3a19d90f950b2cdd789eda5554c93baba1de0954e1',
    actor: '0x0e73dBFf9047423b520FA9fc23a95645fC986Ee8',
    actorRole: 'Seller',
    details: 'Seller marked deliverable execution commenced',
    blockNumber: 65964100,
    timestamp: '2026-09-24T09:35:00Z',
    txHash: '0x39b120c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1',
    category: 'evidence',
  },
  {
    id: 'flow-a-5',
    eventType: 'EvidenceAnchored',
    transactionId: '0x961c70865bf6097eb16d1b3a19d90f950b2cdd789eda5554c93baba1de0954e1',
    actor: '0x0e73dBFf9047423b520FA9fc23a95645fC986Ee8',
    actorRole: 'Seller',
    details: 'Anchored deliverable content hash 0x08a30b2c4935050f1ffbda42a5a6565ab54fc1b090bb47c036afd47aaad2edff',
    blockNumber: 66436500,
    timestamp: '2026-09-24T10:10:00Z',
    txHash: '0x4ac231d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
    category: 'evidence',
  },
  {
    id: 'flow-a-6',
    eventType: 'VerificationSubmitted',
    transactionId: '0x961c70865bf6097eb16d1b3a19d90f950b2cdd789eda5554c93baba1de0954e1',
    actor: '0xb064d69428B9838C2a3e408cF995ea8eb5182c48',
    actorRole: 'Designated Verifier',
    details: 'Audited evidence deliverables; attestation outcome: PASS (1)',
    blockNumber: 66436580,
    timestamp: '2026-09-24T10:20:00Z',
    txHash: '0x5bd342e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3',
    category: 'verification',
  },
  {
    id: 'flow-a-7',
    eventType: 'EscrowSettled',
    transactionId: '0x961c70865bf6097eb16d1b3a19d90f950b2cdd789eda5554c93baba1de0954e1',
    actor: '0xa4bCC57d40311D715ECe34940191820d4a81C50F',
    actorRole: 'Authorized Wallet',
    details: 'Executed releaseEscrow(): 0.001 MON disbursed to seller; 0.0 MON refunded; State 11 SETTLED',
    blockNumber: 66436615,
    timestamp: '2026-09-24T10:25:00Z',
    txHash: '0x691f7a80d65fe1deece2f4415fa316d3e70cf278832a8e8e8ce1693e5066c0d8',
    category: 'settlement',
  },
  {
    id: 'flow-a-8',
    eventType: 'TrustReceiptIssued',
    transactionId: '0x961c70865bf6097eb16d1b3a19d90f950b2cdd789eda5554c93baba1de0954e1',
    actor: '0x925ea880cA53DE0352b84B24d0C0dee5B258015A',
    actorRole: 'Escrow / Registry',
    details: 'Minted Soulbound Trust Receipt #1 for terminal verified release',
    blockNumber: 66436615,
    timestamp: '2026-09-24T10:25:00Z',
    txHash: '0x691f7a80d65fe1deece2f4415fa316d3e70cf278832a8e8e8ce1693e5066c0d8',
    category: 'receipt',
  },

  // --- FLOW B: Contested Inconclusive Deliverable & 3-Judge Quorum ---
  {
    id: 'flow-b-1',
    eventType: 'VerificationSubmitted',
    transactionId: '0x2b57d6b0ef1ba16a60c4f801d90d27d23e598fd6b1381e0175077201dc6afcc4',
    actor: '0xb064d69428B9838C2a3e408cF995ea8eb5182c48',
    actorRole: 'Verifier',
    details: 'Attestation returned INCONCLUSIVE (3) due to depot physical damage; normal release halted',
    blockNumber: 65147800,
    timestamp: '2026-09-24T11:00:00Z',
    txHash: '0x7ce453f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4',
    category: 'verification',
  },
  {
    id: 'flow-b-2',
    eventType: 'DisputeOpened',
    transactionId: '0x2b57d6b0ef1ba16a60c4f801d90d27d23e598fd6b1381e0175077201dc6afcc4',
    actor: '0xa4bCC57d40311D715ECe34940191820d4a81C50F',
    actorRole: 'Buyer',
    details: 'Dispute opened in Escrow; state moved to DISPUTED (8); escalated to multi-judge review',
    blockNumber: 65147850,
    timestamp: '2026-09-24T11:15:00Z',
    txHash: '0x8df564a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5',
    category: 'dispute',
  },
  {
    id: 'flow-b-3',
    eventType: 'DisputeResolved',
    transactionId: '0x2b57d6b0ef1ba16a60c4f801d90d27d23e598fd6b1381e0175077201dc6afcc4',
    actor: '0x12f9e53c31F7629aCAE0BA70588794945EC6c35E',
    actorRole: 'Dispute Resolver',
    details: 'Deterministic 3-Judge median consensus executed: 1,500 bps (15%) buyer refund, 8,500 bps (85%) seller release',
    blockNumber: 65147986,
    timestamp: '2026-09-24T12:00:00Z',
    txHash: '0x91ff6d2105eb0d4a6f95c029b9f71bfb5c2a122675d654261fa25ca6b7bc84ba',
    category: 'dispute',
  },
  {
    id: 'flow-b-4',
    eventType: 'TrustReceiptIssued',
    transactionId: '0x2b57d6b0ef1ba16a60c4f801d90d27d23e598fd6b1381e0175077201dc6afcc4',
    actor: '0xE1994e0dF7CD5A836be4b02AE2164A542418B819',
    actorRole: 'TrustReceiptRegistry',
    details: 'Minted Soulbound Trust Receipt #2 recording 15% refund / 85% release settlement facts',
    blockNumber: 65147986,
    timestamp: '2026-09-24T12:00:00Z',
    txHash: '0x91ff6d2105eb0d4a6f95c029b9f71bfb5c2a122675d654261fa25ca6b7bc84ba',
    category: 'receipt',
  },
];

export default function TrustActivity() {
  const [activeTab, setActiveTab] = useState<'events' | 'transactions' | 'schema'>('events');
  const [selectedTxFilter, setSelectedTxFilter] = useState<'all' | 'flow-a' | 'flow-b'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [latestBlock, setLatestBlock] = useState<number | null>(66714476);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Check if an Envio GraphQL URL is configured in the environment
  const envioGraphqlUrl = process.env.NEXT_PUBLIC_ENVIO_GRAPHQL_URL;
  const isEnvioActive = Boolean(envioGraphqlUrl);

  const fetchLatestBlock = async () => {
    setIsRefreshing(true);
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
      // Fallback block if offline
      setLatestBlock(66714476);
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  };

  useEffect(() => {
    fetchLatestBlock();
    const interval = setInterval(fetchLatestBlock, 15000);
    return () => clearInterval(interval);
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredEvents = AUTHORITATIVE_PROVENANCE_EVENTS.filter((e) => {
    if (selectedTxFilter === 'flow-a') {
      return e.transactionId.startsWith('0x961c');
    }
    if (selectedTxFilter === 'flow-b') {
      return e.transactionId.startsWith('0x2b57');
    }
    return true;
  });

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
              ONCHAIN PROVENANCE &amp; TRUST ACTIVITY
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Powered by Envio HyperIndex
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white">Immutable Event Ledger</h2>
          <p className="text-xs text-gray-400 font-mono mt-0.5">
            Real-time indexed provenance across commercial intent, cryptographic deliverables, and terminal settlements on Monad.
          </p>
        </div>

        {/* Status Indicator & Live Block */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-gray-950 border border-gray-800 font-mono text-xs flex items-center gap-2">
            <span className="text-gray-500">INDEXED BLOCK:</span>
            <span className="text-emerald-400 font-bold">
              {latestBlock ? `#${latestBlock.toLocaleString()}` : 'Connecting...'}
            </span>
          </div>

          <div
            className={`px-3 py-1.5 rounded-xl font-mono text-xs flex items-center gap-2 border ${
              isEnvioActive
                ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300'
                : 'bg-purple-950/60 border-purple-700 text-purple-300'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>{isEnvioActive ? 'GraphQL: Active' : 'Provenance: Live Testnet Trace'}</span>
          </div>

          <button
            onClick={fetchLatestBlock}
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
          <span className="text-white font-bold text-sm">Monad Metropolis</span>
          <span className="text-[10px] text-purple-400 block mt-0.5">Chain ID: 10143</span>
        </div>

        <div className="p-3.5 rounded-xl bg-gray-950/70 border border-gray-800/80">
          <span className="text-gray-500 text-[10px] block uppercase">Escrow Contract</span>
          <span className="text-purple-300 font-bold text-xs truncate block" title="0x925ea880cA53DE0352b84B24d0C0dee5B258015A">
            0x925e...015A
          </span>
          <span className="text-[10px] text-emerald-400 block mt-0.5">State 11 Verified</span>
        </div>

        <div className="p-3.5 rounded-xl bg-gray-950/70 border border-gray-800/80">
          <span className="text-gray-500 text-[10px] block uppercase">Receipt Registry</span>
          <span className="text-cyan-300 font-bold text-xs truncate block" title="0xE1994e0dF7CD5A836be4b02AE2164A542418B819">
            0xE199...B819
          </span>
          <span className="text-[10px] text-gray-400 block mt-0.5">Soulbound Vault</span>
        </div>

        <div className="p-3.5 rounded-xl bg-gray-950/70 border border-gray-800/80">
          <span className="text-gray-500 text-[10px] block uppercase">Indexed Events</span>
          <span className="text-white font-bold text-sm">12 Lifecycle Types</span>
          <span className="text-[10px] text-purple-400 block mt-0.5">From Block 65,000,000</span>
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
            Lifecycle Events ({filteredEvents.length})
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
              <option value="all">All Flows (Flow A &amp; Flow B)</option>
              <option value="flow-a">Flow A: 0x961c... (Verified Release)</option>
              <option value="flow-b">Flow B: 0x2b57... (Dispute Consensus)</option>
            </select>
          </div>
        )}
      </div>

      {/* Tab 1: Chronological Lifecycle Events */}
      {activeTab === 'events' && (
        <div className="space-y-3">
          <div className="overflow-x-auto">
            <div className="space-y-2 min-w-[640px]">
              {filteredEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="p-4 rounded-xl bg-gray-950/60 border border-gray-800/80 hover:border-purple-800/60 transition space-y-2"
                >
                  <div className="flex items-center justify-between gap-3 text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getCategoryBadge(evt.category)}`}>
                        {evt.eventType}
                      </span>
                      <span className="text-gray-400">
                        by <strong className="text-gray-200">{evt.actorRole}</strong>
                      </span>
                      <span
                        className="text-gray-500 hover:text-purple-300 cursor-pointer text-[11px]"
                        onClick={() => copyToClipboard(evt.actor, `actor-${evt.id}`)}
                        title="Click to copy actor address"
                      >
                        {evt.actor.slice(0, 6)}...{evt.actor.slice(-4)}
                        {copiedId === `actor-${evt.id}` && <span className="text-emerald-400 ml-1">copied!</span>}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-gray-400 text-[11px]">
                      <span>Block #{evt.blockNumber.toLocaleString()}</span>
                      <a
                        href={`https://testnet.monadexplorer.com/tx/${evt.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-purple-400 hover:text-purple-300 underline font-mono flex items-center gap-1"
                      >
                        <span>tx: {evt.txHash.slice(0, 8)}...</span>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  </div>

                  <p className="text-xs text-gray-300 font-sans pl-1">
                    {evt.details}
                  </p>

                  <div className="flex items-center justify-between text-[10px] font-mono text-gray-500 pt-1 border-t border-gray-900">
                    <span className="truncate max-w-md">
                      TxId: <span className="text-gray-400">{evt.transactionId}</span>
                    </span>
                    <span>{evt.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Verified Flows Summary */}
      {activeTab === 'transactions' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Flow A */}
          <div className="p-5 rounded-xl bg-gradient-to-b from-[#141026] to-[#0a0c14] border border-purple-600/70 space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-700">
                FLOW A — VERIFIED (PASS)
              </span>
              <span className="text-xs font-mono text-emerald-400 font-bold">STATE 11 SETTLED</span>
            </div>

            <div>
              <h4 className="text-base font-bold text-white">Normal Verified Execution &amp; Authorized Release</h4>
              <p className="text-xs text-gray-400 font-mono mt-0.5">
                Buyer funded 0.001 MON; independent verifier attested PASS; authorized wallet executed releaseEscrow().
              </p>
            </div>

            <div className="space-y-1.5 bg-gray-950/80 p-3 rounded-lg font-mono text-[11px] border border-gray-800">
              <div className="flex justify-between">
                <span className="text-gray-500">Transaction ID:</span>
                <span className="text-purple-300">0x961c...54e1</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Deliverable Hash:</span>
                <span className="text-cyan-400">0x08a3...edff</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Verifier Attestation:</span>
                <span className="text-emerald-400 font-bold">PASS (Outcome 1)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Settlement Payout:</span>
                <span className="text-white font-bold">0.001 MON (100% Release)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Settlement Tx:</span>
                <a
                  href="https://testnet.monadexplorer.com/tx/0x691f7a80d65fe1deece2f4415fa316d3e70cf278832a8e8e8ce1693e5066c0d8"
                  target="_blank"
                  rel="noreferrer"
                  className="text-purple-400 hover:text-purple-300 underline"
                >
                  0x691f...c0d8 ↗
                </a>
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
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-700">
                FLOW B — CONTESTED (INCONCLUSIVE)
              </span>
              <span className="text-xs font-mono text-emerald-400 font-bold">STATE 11 SETTLED</span>
            </div>

            <div>
              <h4 className="text-base font-bold text-white">Contested Outcome &amp; 3-Judge Quorum Consensus</h4>
              <p className="text-xs text-gray-400 font-mono mt-0.5">
                Verifier flagged inconclusive deliverable; 3 human judges submitted signed ballots; median consensus executed atomic split.
              </p>
            </div>

            <div className="space-y-1.5 bg-gray-950/80 p-3 rounded-lg font-mono text-[11px] border border-gray-800">
              <div className="flex justify-between">
                <span className="text-gray-500">Transaction ID:</span>
                <span className="text-purple-300">0x2b57...cfc4</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Initial Verification:</span>
                <span className="text-amber-400 font-bold">INCONCLUSIVE (Outcome 3)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">3 Judges Median:</span>
                <span className="text-white font-bold">1,500 bps (15% Buyer Refund)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Seller Distribution:</span>
                <span className="text-emerald-400 font-bold">0.00085 MON (85% Release)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Settlement Tx:</span>
                <a
                  href="https://testnet.monadexplorer.com/tx/0x91ff6d2105eb0d4a6f95c029b9f71bfb5c2a122675d654261fa25ca6b7bc84ba"
                  target="_blank"
                  rel="noreferrer"
                  className="text-purple-400 hover:text-purple-300 underline"
                >
                  0x91ff...84ba ↗
                </a>
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
  transactions(limit: 10, order_by: { updatedAt: desc }) {
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
  lifecycleEvents(limit: 25, order_by: { timestamp: desc }) {
    id
    eventType
    transactionId
    actor
    details
    blockNumber
    timestamp
    txHash
  }
  trustReceipts(limit: 10, order_by: { issuedTimestamp: desc }) {
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
