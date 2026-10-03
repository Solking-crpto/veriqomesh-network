'use client';

import React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useDemoNetwork, INDEPENDENT_VERIFIER_ADDRESS, APPROVED_OPERATOR_VERIFIER_ADDRESS } from '../../../context/DemoNetworkContext';

export default function ReceiverDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { switchRole } = useDemoNetwork();
  const id = (params?.id as string) || '';

  const effectiveVerifier = INDEPENDENT_VERIFIER_ADDRESS || APPROVED_OPERATOR_VERIFIER_ADDRESS;

  const handleStartRequest = () => {
    switchRole('INITIATOR');
    router.push(`/initiator/intent?receiver=${encodeURIComponent(id)}`);
  };

  return (
    <div className="min-h-screen bg-[#07080d] text-gray-100 py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
          <Link href="/receivers" className="hover:text-purple-300">Receivers Directory</Link>
          <span>/</span>
          <span className="text-purple-400 font-bold truncate max-w-xs">{id}</span>
        </div>

        {/* Profile Header Box */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-[#0d162a] via-[#091122] to-[#070b14] border border-blue-600/80 shadow-2xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-950 text-blue-300 border border-blue-800">
                  RECEIVER FULFILLMENT NODE
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                  Monad Testnet
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white break-all">
                {id}
              </h1>
              <div className="text-xs font-mono text-gray-400 mt-1">
                Designated counterparty fulfillment profile on Monad Testnet (Chain ID: 10143)
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
            <div>Counterparty ID / Address: <code className="text-purple-300">{id}</code></div>
            <div className="text-emerald-400 font-semibold">Active Testnet Escrow Capable</div>
          </div>
        </div>

        {/* Operational Capabilities & Accreditations */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
          <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 space-y-1">
            <span className="text-gray-400 text-[10px]">FULFILLMENT CAPACITY</span>
            <div className="text-white font-bold text-sm">Commercial Deliverables</div>
            <p className="text-gray-400 text-[11px] font-sans mt-1">
              Fulfillment nodes receive commercial invitations, review agreement milestones, and execute deliverable commitments.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 space-y-1">
            <span className="text-gray-400 text-[10px]">EVIDENCE INTEGRATION</span>
            <div className="text-white font-bold text-sm">IPFS Content Anchoring</div>
            <p className="text-gray-400 text-[11px] font-sans mt-1">
              Supports electronic BOLs, geotagged depot imagery, and serialized manifests hashed to Keccak-256 onchain roots.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 space-y-1">
            <span className="text-gray-400 text-[10px]">VERIFIER COMPATIBILITY</span>
            <div className="text-white font-bold text-sm">Independent Attestation</div>
            <p className="text-gray-400 text-[11px] font-sans mt-1">
              Supports accredited verifier node (<code className="text-purple-300">{`${effectiveVerifier.slice(0, 6)}...${effectiveVerifier.slice(-4)}`}</code>) attestation prior to escrow release.
            </p>
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
            Create Intent with This Counterparty →
          </button>
        </div>
      </div>
    </div>
  );
}
