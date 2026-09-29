'use client';

import React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useDemoNetwork, INDEPENDENT_VERIFIER_ADDRESS, APPROVED_OPERATOR_VERIFIER_ADDRESS } from '../../../context/DemoNetworkContext';

export default function ReceiverDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { switchRole } = useDemoNetwork();
  const id = params?.id as string;

  const isDallas = id === 'dallas-solar' || !id;

  const handleStartRequest = () => {
    switchRole('INITIATOR');
    router.push('/initiator/intent');
  };

  return (
    <div className="min-h-screen bg-[#07080d] text-gray-100 py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
          <Link href="/receivers" className="hover:text-purple-300">Receivers Directory</Link>
          <span>/</span>
          <span className="text-purple-400 font-bold">{isDallas ? 'Dallas Solar Supply Co.' : id}</span>
        </div>

        {/* Profile Header Box */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-[#0d162a] via-[#091122] to-[#070b14] border border-blue-600/80 shadow-2xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-950 text-blue-300 border border-blue-800">
                  TIER-1 VERIFIED NODE
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                  Active Monad Node
                </span>
              </div>
              <h1 className="text-3xl font-extrabold text-white">
                {isDallas ? 'Dallas Solar Supply Co.' : 'Commercial Fulfillment Node'}
              </h1>
              <div className="text-xs font-mono text-gray-400 mt-1">
                Depot: {isDallas ? 'Dallas, Texas (Direct Rail & Truck Bay Access)' : 'North America Logistics Hub'}
              </div>
            </div>

            <button
              onClick={handleStartRequest}
              className="py-3 px-6 rounded-xl bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-600 hover:to-indigo-500 text-white font-mono text-xs font-bold transition shadow-lg shadow-purple-950 flex items-center gap-2"
            >
              <span>+ Propose Deal Agreement</span>
              <span>→</span>
            </button>
          </div>

          <div className="p-3 bg-gray-950/80 rounded-xl border border-gray-800 text-xs font-mono text-gray-300 flex flex-wrap items-center justify-between gap-2">
            <div>Connected Wallet: <code className="text-purple-300">0x6f30D20b8c5bE781bADD86341415b556fB13c873</code></div>
            <div className="text-emerald-400 font-bold">Trust Score: 98/100 (Accredited)</div>
          </div>
        </div>

        {/* Operational Capabilities & Accreditations */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
          <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 space-y-1">
            <span className="text-gray-400 text-[10px]">FULFILLMENT CAPACITY</span>
            <div className="text-white font-bold text-sm">Commercial Tier-1 PV</div>
            <p className="text-gray-400 text-[11px] font-sans mt-1">
              Maintains on-site inventory of bifacial 550W Tier-1 commercial solar modules with manufacturer warranty manifests.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 space-y-1">
            <span className="text-gray-400 text-[10px]">LOGISTICS &amp; DEPOT</span>
            <div className="text-white font-bold text-sm">Dallas Staging Bay</div>
            <p className="text-gray-400 text-[11px] font-sans mt-1">
              Equipped for pallet-level chain-of-custody tracking, freight BOL generation, and geotagged photographic inspection.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 space-y-1">
            <span className="text-gray-400 text-[10px]">VERIFIER INTEGRATION</span>
            <div className="text-white font-bold text-sm">Bureau Veritas Accredited</div>
            <p className="text-gray-400 text-[11px] font-sans mt-1">
              Supports independent on-site verifier node (<code className="text-purple-300">{`${(INDEPENDENT_VERIFIER_ADDRESS || APPROVED_OPERATOR_VERIFIER_ADDRESS).slice(0, 6)}...${(INDEPENDENT_VERIFIER_ADDRESS || APPROVED_OPERATOR_VERIFIER_ADDRESS).slice(-4)}`}</code>) prior to escrow release authorization.
            </p>
          </div>
        </div>

        {/* Onchain Performance & Dispute Record */}
        <div className="p-6 rounded-2xl bg-gray-900/60 border border-gray-800 space-y-4">
          <h2 className="text-lg font-bold text-white font-mono flex items-center justify-between">
            <span>Onchain Transaction History &amp; Dispute Track Record</span>
            <span className="text-xs text-gray-400 font-normal">Monad Metropolis Testnet</span>
          </h2>

          <div className="space-y-3 font-mono text-xs">
            {/* Record 1: Canonical Live Testnet Dispute */}
            <div className="p-4 rounded-xl bg-gray-950 border border-purple-900/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 text-[10px] font-bold">
                    CANONICAL MONAD RESOLUTION
                  </span>
                  <span className="text-gray-300 font-bold">Tx: 0x2b57d6b0...afcc4</span>
                </div>
                <p className="text-[11px] text-gray-400 font-sans">
                  Deliverable: 100 Commercial Solar Panels. Inconclusive physical inspection triggered human adjudication. Deterministic 3-judge median resolved 1,500 bps buyer refund, 8,500 bps release to Dallas Solar Supply.
                </p>
              </div>
              <Link
                href="/transactions/0x2b57d6b0ef1ba16a60c4f801d90d27d23e598fd6b1381e0175077201dc6afcc4"
                className="px-3 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs transition whitespace-nowrap self-start md:self-auto"
              >
                Inspect Settlement
              </Link>
            </div>

            {/* Record 2: Autonomous Delivery */}
            <div className="p-4 rounded-xl bg-gray-950 border border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-700 text-[10px] font-bold">
                    AUTHORIZED SETTLEMENT
                  </span>
                  <span className="text-gray-300 font-bold">Demo Scenario A</span>
                </div>
                <p className="text-[11px] text-gray-400 font-sans">
                  Deliverable: Tier-1 PV Modules. Bureau Veritas verified intact packaging and matching serial manifest. Autonomous agent invoked settlement upon verification PASS.
                </p>
              </div>
              <Link
                href="/transactions/story-a"
                className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold text-xs transition whitespace-nowrap self-start md:self-auto"
              >
                Inspect Room
              </Link>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between border-t border-gray-800 pt-6">
          <Link href="/receivers" className="text-xs font-mono text-gray-400 hover:text-white transition">
            ← Back to Directory
          </Link>
          <button
            onClick={handleStartRequest}
            className="py-2.5 px-6 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-mono text-xs font-bold transition shadow-md shadow-purple-950"
          >
            Create Intent with Dallas Solar Supply Co. →
          </button>
        </div>
      </div>
    </div>
  );
}
