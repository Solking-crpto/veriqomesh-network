'use client';

import React from 'react';
import Link from 'next/link';

export default function TrustReceiptsPage() {
  const receipts = [
    {
      id: 2,
      tag: 'CANONICAL MONAD TESTNET DISPUTE RESOLUTION',
      isTestnet: true,
      title: 'Disputed Delivery Settlement (1,500 bps Median Refund)',
      transactionId: '0x2b57d6b0ef1ba16a60c4f801d90d27d23e598fd6b1381e0175077201dc6afcc4',
      settledAmount: '0.001 MON',
      buyerRefundBps: 1500,
      sellerReleaseBps: 8500,
      buyerRefundAmount: '0.00015 MON (15%)',
      sellerReleaseAmount: '0.00085 MON (85%)',
      outcome: 'RESOLVED_VIA_3_JUDGE_MEDIAN_QUORUM',
      termsSummaryHash: '0x9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b',
      evidenceRoot: '0x8f2a1b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a',
      resolverContract: '0x12f9e54a9386fb0ba3f2e1a329fa91dafb5bc35E',
      onchainTxHash: '0x2b57d6b0ef1ba16a60c4f801d90d27d23e598fd6b1381e0175077201dc6afcc4',
      network: 'Monad Metropolis Testnet (Chain ID: 10143)',
      issuedAt: '2026-09-24T12:00:00Z',
      accountability:
        'Escrow locked upon inconclusive physical depot verification. Three accredited human judges submitted independent signed ballots; the protocol calculated the deterministic median of 1,500 bps and executed atomic distribution via the Monad resolver contract.',
    },
    {
      id: 1,
      tag: 'AUTONOMOUS AGENT SETTLEMENT DEMO',
      isTestnet: false,
      title: 'Tier-1 Solar PV Procurement (100% Release to Seller)',
      transactionId: '0x891e4a2c076598c1a5b8e9f0d1c2b3a4f5e6d7c8b9a0f1e2d3c4b5a6f7e8d9c0',
      settledAmount: '12.5 MON',
      buyerRefundBps: 0,
      sellerReleaseBps: 10000,
      buyerRefundAmount: '0.0 MON (0%)',
      sellerReleaseAmount: '12.5 MON (100%)',
      outcome: 'VERIFICATION_PASS_AUTONOMOUS_SETTLEMENT',
      termsSummaryHash: '0x7a8b6c4d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b',
      evidenceRoot: '0x4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f',
      resolverContract: 'Uncontested (Direct Escrow Release)',
      network: 'VeriqoMesh Execution Layer',
      issuedAt: '2026-09-24T10:30:00Z',
      accountability:
        'All 4 deliverable milestones verified intact with 100% serial manifest match. Authorized AI agent invoked autonomous capital release under pre-configured policy without manual human signature.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#07080d] text-gray-100 py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-6">
          <div>
            <div className="text-xs font-mono text-purple-400 font-bold uppercase tracking-wider mb-1">
              PORTABLE REPUTATION &amp; ACCOUNTABILITY
            </div>
            <h1 className="text-3xl font-extrabold text-white">Trust Receipts Vault</h1>
            <p className="text-xs sm:text-sm text-gray-400 font-mono mt-1">
              Cryptographic, portable receipts binding commercial intent, attested evidence roots, and immutable onchain settlement.
            </p>
          </div>

          <Link
            href="/transactions"
            className="px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-mono text-xs font-bold transition shadow-lg shadow-purple-950 flex items-center gap-2 self-start sm:self-auto"
          >
            <span>Transaction Directory →</span>
          </Link>
        </div>

        {/* Conceptual Explainer */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-purple-950/40 to-indigo-950/40 border border-purple-900/60 font-mono text-xs space-y-1">
          <div className="text-purple-300 font-bold flex items-center gap-2">
            <span>🛡 What is a VeriqoMesh Trust Receipt?</span>
          </div>
          <p className="text-gray-300 font-sans text-xs">
            A Trust Receipt is generated upon final settlement. It establishes non-repudiable auditability for both autonomous agent commerce and human dispute adjudication without exposing private commercial terms.
          </p>
        </div>

        {/* Receipts List */}
        <div className="space-y-6">
          {receipts.map((rcpt) => (
            <div
              key={rcpt.id}
              className={`p-6 rounded-2xl border transition-all ${
                rcpt.isTestnet
                  ? 'bg-gradient-to-b from-[#141026] via-[#0d0e18] to-[#07080d] border-purple-600/80 shadow-2xl shadow-purple-950/20'
                  : 'bg-gradient-to-b from-[#0e172a] via-[#09101c] to-[#07080d] border-blue-600/80 shadow-2xl shadow-blue-950/20'
              }`}
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800/80 pb-4 mb-5">
                <div>
                  <div className="flex items-center gap-2.5 mb-1 font-mono text-xs">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        rcpt.isTestnet
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                          : 'bg-blue-950 text-blue-300 border border-blue-700'
                      }`}
                    >
                      {rcpt.tag}
                    </span>
                    <span className="text-gray-400 font-bold">RECEIPT #{rcpt.id}</span>
                  </div>
                  <h3 className="text-xl font-bold text-white">{rcpt.title}</h3>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-600 text-xs font-mono font-bold">
                    ✓ IMMUTABLE SETTLEMENT
                  </span>
                </div>
              </div>

              {/* Settlement Distribution Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-gray-950/80 p-4 rounded-xl border border-gray-800/80 font-mono text-xs mb-5">
                <div>
                  <span className="text-gray-500 text-[10px] block">TOTAL ESCROW:</span>
                  <span className="text-white font-bold text-sm">{rcpt.settledAmount}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px] block">BUYER REFUND:</span>
                  <span className="text-amber-400 font-bold text-sm">{rcpt.buyerRefundAmount}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px] block">SELLER RELEASE:</span>
                  <span className="text-emerald-400 font-bold text-sm">{rcpt.sellerReleaseAmount}</span>
                </div>
              </div>

              {/* Cryptographic Hashes & Technical Ledger */}
              <div className="space-y-2 bg-gray-950/60 p-4 rounded-xl border border-gray-800/80 font-mono text-[11px] mb-5">
                <div>
                  <span className="text-gray-500 block text-[10px]">TRANSACTION ID:</span>
                  <code className="text-purple-300 break-all">{rcpt.transactionId}</code>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px]">TERMS SUMMARY HASH:</span>
                  <code className="text-gray-300 break-all">{rcpt.termsSummaryHash}</code>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px]">EVIDENCE MERKLE ROOT:</span>
                  <code className="text-blue-400 break-all">{rcpt.evidenceRoot}</code>
                </div>
                {rcpt.isTestnet && (
                  <>
                    <div>
                      <span className="text-gray-500 block text-[10px]">RESOLVER CONTRACT:</span>
                      <code className="text-emerald-400 break-all">{rcpt.resolverContract}</code>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[10px]">ONCHAIN EXECUTION TX:</span>
                      <code className="text-purple-300 break-all">{rcpt.onchainTxHash}</code>
                    </div>
                  </>
                )}
                <div>
                  <span className="text-gray-500 block text-[10px]">NETWORK ENVIRONMENT:</span>
                  <span className="text-gray-300">{rcpt.network}</span>
                </div>
              </div>

              {/* Accountability Statement */}
              <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-900/40 mb-5 font-mono text-xs">
                <span className="text-purple-300 font-bold block mb-1 text-[11px]">
                  ACCOUNTABILITY ATTESTATION:
                </span>
                <p className="text-gray-300 font-sans text-xs leading-relaxed">
                  {rcpt.accountability}
                </p>
              </div>

              {/* Footer Links */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-gray-800/80">
                <span className="text-xs font-mono text-gray-500">
                  Issued: {rcpt.issuedAt}
                </span>
                <Link
                  href={
                    rcpt.isTestnet
                      ? `/transactions/${rcpt.transactionId}`
                      : '/transactions/story-a'
                  }
                  className="w-full sm:w-auto py-2 px-5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-mono text-xs font-bold transition shadow-md text-center"
                >
                  Inspect Settlement Room →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
