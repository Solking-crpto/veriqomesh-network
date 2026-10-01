'use client';

import React from 'react';
import Link from 'next/link';

export default function EvidenceExplorerPage() {
  return (
    <div className="min-h-screen bg-[#07080d] text-gray-100 py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-6">
          <div>
            <div className="text-xs font-mono text-purple-400 font-bold uppercase tracking-wider mb-1">
              CRYPTOGRAPHIC EVIDENCE REGISTRY
            </div>
            <h1 className="text-3xl font-extrabold text-white">Evidence Explorer</h1>
            <p className="text-xs sm:text-sm text-gray-400 font-mono mt-1">
              Inspect content-addressed IPFS records, keccak256 hashes, and independent verifier attestations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/initiator/intent"
              className="px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-mono text-xs font-bold transition shadow-lg shadow-purple-950 flex items-center gap-2"
            >
              <span>+ Create Commercial Intent</span>
            </Link>
            <Link
              href="/transactions"
              className="px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-200 font-mono text-xs font-bold transition flex items-center gap-2"
            >
              <span>Transaction Rooms →</span>
            </Link>
          </div>
        </div>

        {/* Technical Architecture Notice */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-purple-950/40 via-gray-900/60 to-purple-950/30 border border-purple-800/50 font-mono text-xs space-y-2">
          <div className="flex items-center gap-2 text-purple-300 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Onchain Evidence Commitment Standard</span>
          </div>
          <p className="text-gray-300 font-sans text-xs leading-relaxed">
            VeriqoMesh anchors commercial deliverables on Monad Metropolis Testnet via dual cryptographic commitments: an immutable IPFS content URI (<code className="text-purple-300">ipfs://...</code>) and a 32-byte Keccak-256 deliverable content hash. Before funds release, designated verifiers must attest compliance directly onchain.
          </p>
        </div>

        {/* Live Empty State */}
        <div className="p-12 sm:p-16 rounded-2xl bg-gradient-to-b from-[#0f111c] via-[#090b14] to-[#07080d] border border-gray-800 text-center space-y-6 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-purple-950/80 border border-purple-600/60 mx-auto flex items-center justify-center text-2xl shadow-lg shadow-purple-950">
            📄
          </div>

          <div className="max-w-md mx-auto space-y-2 font-mono">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-900 border border-gray-800 text-gray-400 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>LIVE EVIDENCE REGISTRY ACTIVE</span>
            </div>
            <h2 className="text-2xl font-bold text-white">No Live Evidence Records Yet</h2>
            <p className="text-xs text-gray-400 font-sans leading-relaxed">
              Evidence records (carrier Bills of Lading, geotagged depot inspection photos, and serial manifests) are created when counterparties anchor deliverables for active escrow transactions on Monad Metropolis Testnet.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/initiator/intent"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-mono text-xs font-bold transition shadow-md shadow-purple-950 flex items-center justify-center gap-2"
            >
              <span>Initiate New Commercial Intent</span>
              <span>→</span>
            </Link>
            <Link
              href="/transactions"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-300 font-mono text-xs font-bold transition"
            >
              Explore Transactions Directory
            </Link>
          </div>

          {/* Verification Protocol Specs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto pt-6 text-left font-mono text-xs border-t border-gray-800/80">
            <div className="p-3.5 rounded-xl bg-gray-950/60 border border-gray-800">
              <span className="text-gray-500 block text-[10px]">CONTENT ADDRESSING:</span>
              <span className="text-white font-semibold">IPFS CIDs</span>
              <p className="text-gray-400 text-[11px] font-sans mt-1">
                Storage pointers reference content-hash commitments immutable across carrier and depot handoffs.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-gray-950/60 border border-gray-800">
              <span className="text-gray-500 block text-[10px]">ONCHAIN ATTESTATION:</span>
              <span className="text-purple-300 font-semibold">Keccak256 Anchors</span>
              <p className="text-gray-400 text-[11px] font-sans mt-1">
                Deliverable hashes are immutably anchored in TrustMeshEscrow prior to verification inspection.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-gray-950/60 border border-gray-800">
              <span className="text-gray-500 block text-[10px]">VERIFIER DISPATCH:</span>
              <span className="text-emerald-400 font-semibold">PASS / INCONCLUSIVE</span>
              <p className="text-gray-400 text-[11px] font-sans mt-1">
                Independent verifiers submit onchain cryptographic attestations determining escrow settlement path.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
