'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDemoNetwork, INDEPENDENT_VERIFIER_ADDRESS, APPROVED_OPERATOR_VERIFIER_ADDRESS } from '../../context/DemoNetworkContext';

interface ReceiverNode {
  id: string;
  name: string;
  category: string;
  location: string;
  wallet: string;
  score: number;
  completedTx: number;
  disputedTx: number;
  trustReceipts: number;
  capabilities: string[];
  badges: string[];
  description: string;
  isPrimaryDemo?: boolean;
}

export default function ReceiversDirectoryPage() {
  const router = useRouter();
  const { switchRole } = useDemoNetwork();
  const [searchQuery, setSearchQuery] = useState('');

  const nodes: ReceiverNode[] = [
    {
      id: 'dallas-solar',
      name: 'Dallas Solar Supply Co.',
      category: 'Commercial Solar PV & Logistics',
      location: 'Dallas, Texas',
      wallet: '0x6f30D20b8c5bE781bADD86341415b556fB13c873',
      score: 98,
      completedTx: 24,
      disputedTx: 2,
      trustReceipts: 22,
      capabilities: ['Commercial Solar PV', 'Freight Logistics', 'Depot Staging', 'Physical Inspection Ready'],
      badges: ['Tier-1 Verified Node', 'Monad Testnet Active', 'Adjudication Settled'],
      description:
        'Accredited commercial solar distributor and physical logistics node with direct rail & freight depot access in Dallas.',
      isPrimaryDemo: true,
    },
    {
      id: 'apex-logistics',
      name: 'Apex Grid Logistics',
      category: 'Heavy Freight & Intermodal Chain of Custody',
      location: 'Houston, Texas',
      wallet: '0x91A4F0C3B7825E6cD841C52A9D57C89F82143e11',
      score: 95,
      completedTx: 19,
      disputedTx: 1,
      trustReceipts: 18,
      capabilities: ['Intermodal Freight', 'Geotagged Telemetry', 'Depot Transfer Attestation'],
      badges: ['Verified Carrier', 'IoT Telemetry'],
      description:
        'Industrial freight carrier specialized in sensitive renewable equipment transit with immutable telematics logs.',
    },
    {
      id: 'soltech-inspections',
      name: 'SolTech Independent Verifier Node',
      category: 'Accredited Physical Inspection Node',
      location: 'Austin, Texas',
      wallet: INDEPENDENT_VERIFIER_ADDRESS || APPROVED_OPERATOR_VERIFIER_ADDRESS,
      score: 100,
      completedTx: 42,
      disputedTx: 3,
      trustReceipts: 39,
      capabilities: ['Depot Physical Inspection', 'EL Flaw Testing', 'Serial Number Verification', 'Cryptographic Attestation'],
      badges: ['Accredited Verifier', 'Bureau Veritas Partner'],
      description:
        'Independent engineering inspection node issuing cryptographic attestations for hardware delivery compliance.',
    },
    {
      id: 'lonestar-energy',
      name: 'LoneStar Industrial Energy',
      category: 'Commercial Inverters & Storage',
      location: 'Fort Worth, Texas',
      wallet: '0x34C89eB48f1025a5B612C59D11293a127B0e77a2',
      score: 92,
      completedTx: 15,
      disputedTx: 0,
      trustReceipts: 15,
      capabilities: ['Utility Inverters', 'BESS Systems', 'Direct Delivery'],
      badges: ['Verified Supplier'],
      description:
        'Wholesale distributor of high-voltage solar power electronics and utility battery energy storage modules.',
    },
  ];

  const filteredNodes = nodes.filter(
    (n) =>
      n.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStartDeal = (node: ReceiverNode) => {
    switchRole('INITIATOR');
    router.push('/initiator/intent');
  };

  return (
    <div className="min-h-screen bg-[#07080d] text-gray-100 py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-6">
          <div>
            <div className="text-xs font-mono text-purple-400 font-bold uppercase tracking-wider mb-1">
              COUNTERPARTY DISCOVERY
            </div>
            <h1 className="text-3xl font-extrabold text-white">Verified Receiver Nodes</h1>
            <p className="text-xs sm:text-sm text-gray-400 font-mono mt-1">
              Explore accredited suppliers, logistics handlers, and independent inspection nodes operating on VeriqoMesh.
            </p>
          </div>

          <Link
            href="/initiator/intent"
            className="px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-mono text-xs font-bold transition shadow-lg shadow-purple-950 flex items-center gap-2 self-start sm:self-auto"
          >
            <span>+ Create Direct Intent</span>
          </Link>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search by supplier name, capability, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-xl bg-gray-900 border border-gray-800 text-white text-xs font-mono focus:border-purple-500 focus:outline-none"
          />
          <div className="flex items-center gap-2 text-xs font-mono text-gray-400 px-2">
            <span>Showing: <strong className="text-white">{filteredNodes.length}</strong> nodes</span>
          </div>
        </div>

        {/* Directory Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredNodes.map((node) => (
            <div
              key={node.id}
              className={`p-6 rounded-2xl border transition-all flex flex-col justify-between ${
                node.isPrimaryDemo
                  ? 'bg-gradient-to-b from-[#0f172a] via-[#0b101e] to-[#070b14] border-blue-600/80 shadow-xl shadow-blue-950/20'
                  : 'bg-gray-900/50 border-gray-800 hover:border-gray-700'
              }`}
            >
              <div>
                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {node.badges.map((b, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-950 text-blue-300 border border-blue-800"
                    >
                      {b}
                    </span>
                  ))}
                  {node.isPrimaryDemo && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                      ★ Canonical Demo Receiver
                    </span>
                  )}
                </div>

                <h3 className="text-xl font-bold text-white mb-1">{node.name}</h3>
                <div className="text-xs font-mono text-purple-400 mb-2">{node.category}</div>
                <p className="text-xs text-gray-300 mb-4 font-sans leading-relaxed">{node.description}</p>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-2 bg-gray-950/80 p-3 rounded-xl border border-gray-800 text-xs font-mono mb-4 text-center">
                  <div>
                    <div className="text-[10px] text-gray-400">Trust Score</div>
                    <div className="text-emerald-400 font-bold text-sm">{node.score}/100</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-400">Settled Deals</div>
                    <div className="text-white font-bold text-sm">{node.completedTx}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-400">Receipts</div>
                    <div className="text-indigo-400 font-bold text-sm">{node.trustReceipts}</div>
                  </div>
                </div>

                {/* Capabilities pills */}
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {node.capabilities.map((cap, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-full bg-gray-900 border border-gray-800 text-gray-300 text-[10px] font-mono"
                    >
                      {cap}
                    </span>
                  ))}
                </div>

                <div className="text-[11px] font-mono text-gray-400 mb-4 truncate">
                  Wallet: <code className="text-gray-300">{node.wallet}</code>
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-800/80">
                <Link
                  href={`/receivers/${node.id}`}
                  className="py-2.5 px-3 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-200 text-center font-mono text-xs font-semibold transition"
                >
                  View Profile
                </Link>
                <button
                  onClick={() => handleStartDeal(node)}
                  className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-600 hover:to-indigo-500 text-white font-mono text-xs font-bold transition shadow-md shadow-purple-950"
                >
                  Send Proposal →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
