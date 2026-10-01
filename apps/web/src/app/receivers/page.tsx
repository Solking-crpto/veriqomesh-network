'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDemoNetwork, DEPLOYED_REGISTRY_ADDRESS, APPROVED_OPERATOR_VERIFIER_ADDRESS } from '../../context/DemoNetworkContext';

export default function ReceiversDirectoryPage() {
  const router = useRouter();
  const { switchRole } = useDemoNetwork();
  const [customAddress, setCustomAddress] = useState('');

  const handleStartDealWithAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customAddress.trim()) return;
    switchRole('INITIATOR');
    router.push(`/initiator/intent?receiver=${customAddress.trim()}`);
  };

  return (
    <div className="min-h-screen bg-[#07080d] text-gray-100 py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-6">
          <div>
            <div className="text-xs font-mono text-purple-400 font-bold uppercase tracking-wider mb-1">
              COUNTERPARTY DISCOVERY &amp; REGISTRY
            </div>
            <h1 className="text-3xl font-extrabold text-white">Verified Receiver Nodes</h1>
            <p className="text-xs sm:text-sm text-gray-400 font-mono mt-1">
              Fulfillment suppliers, logistics providers, and independent verifiers on Monad Metropolis Testnet.
            </p>
          </div>

          <Link
            href="/initiator/intent"
            className="px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-mono text-xs font-bold transition shadow-lg shadow-purple-950 flex items-center gap-2 self-start sm:self-auto"
          >
            <span>+ Create Direct Intent</span>
          </Link>
        </div>

        {/* Registry Contract Status Notice */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950/40 via-gray-900/60 to-purple-950/30 border border-blue-800/50 font-mono text-xs space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-blue-300 font-bold">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Monad Metropolis Registry Contract Active</span>
            </div>
            <code className="text-gray-400 text-[11px]">{DEPLOYED_REGISTRY_ADDRESS}</code>
          </div>
          <p className="text-gray-300 font-sans text-xs leading-relaxed">
            The TrustReceiptRegistry records participant capabilities, accredited verifier credentials, and soulbound trust receipts. You can initiate agreements directly with any counterparty address without requiring pre-registration.
          </p>
        </div>

        {/* Propose Direct Intent Card */}
        <div className="p-6 rounded-2xl bg-gradient-to-b from-[#0f1424] to-[#0a0d18] border border-blue-600/60 shadow-xl space-y-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono text-blue-400 font-bold">
              <span>DIRECT COUNTERPARTY ENGAGEMENT</span>
            </div>
            <h2 className="text-xl font-bold text-white">Propose Deal to Any Counterparty Address</h2>
            <p className="text-xs text-gray-400 font-sans">
              Enter any Monad Metropolis EVM address to initiate a commercial intent, structure milestones, and establish an escrow agreement.
            </p>
          </div>

          <form onSubmit={handleStartDealWithAddress} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Enter counterparty seller address (0x...)"
              value={customAddress}
              onChange={(e) => setCustomAddress(e.target.value)}
              className="flex-1 px-4 py-3 rounded-xl bg-gray-950 border border-gray-800 text-white text-xs font-mono focus:border-blue-500 focus:outline-none"
            />
            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-mono text-xs font-bold transition shadow-md whitespace-nowrap"
            >
              Start Deal Proposal →
            </button>
          </form>
        </div>

        {/* Directory State */}
        <div className="p-10 rounded-2xl bg-gray-900/30 border border-gray-800 text-center font-mono space-y-4">
          <div className="w-12 h-12 rounded-xl bg-gray-950 border border-gray-800 mx-auto flex items-center justify-center text-xl text-gray-500">
            🔍
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">No Public Directory Listings Yet</h3>
            <p className="text-xs text-gray-400 font-sans max-w-md mx-auto">
              Verified counterparties appear here as network participants register their capabilities on the TrustReceiptRegistry contract.
            </p>
          </div>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/initiator/intent"
              className="px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold transition shadow-md"
            >
              + Create Commercial Intent
            </Link>
            <Link
              href="/receive"
              className="px-5 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-300 text-xs font-bold transition"
            >
              Look Up Existing Invitation Code
            </Link>
          </div>
        </div>

        {/* Operator Verifier Node Card */}
        <div className="p-5 rounded-2xl bg-gray-950/60 border border-gray-800 font-mono text-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 font-bold uppercase tracking-wider text-[11px]">
              DEFAULT NETWORK VERIFIER NODE
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 text-[10px] font-bold">
              ACTIVE OPERATOR
            </span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-gray-300">
            <div>
              <div className="text-white font-bold text-sm">VeriqoMesh Accredited Operator Node</div>
              <div className="text-[11px] text-gray-500 mt-0.5">
                Designated independent verifier address for deliverable physical inspection and serial attestation.
              </div>
            </div>
            <code className="text-purple-300 bg-purple-950/50 p-2 rounded-lg border border-purple-900 text-[11px]">
              {APPROVED_OPERATOR_VERIFIER_ADDRESS}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
