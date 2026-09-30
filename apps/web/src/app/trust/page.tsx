'use client';

import React from 'react';
import Link from 'next/link';
import TrustActivity from '@/components/TrustActivity';

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
      resolverContract: '0x12f9e53c31F7629aCAE0BA70588794945EC6c35E',
      onchainTxHash: '0x91ff6d2105eb0d4a6f95c029b9f71bfb5c2a122675d654261fa25ca6b7bc84ba',
      network: 'Monad Metropolis Testnet (Chain ID: 10143)',
      issuedAt: '2026-09-24T12:00:00Z',
      accountability:
        'Escrow locked upon inconclusive physical depot verification. Three accredited human judges submitted independent signed ballots; the protocol calculated the deterministic median of 1,500 bps and executed atomic distribution via the Monad resolver contract.',
    },
    {
      id: 3,
      tag: 'CANONICAL MONAD TESTNET VERIFIED SETTLEMENT',
      isTestnet: true,
      title: 'Verified Deliverable Release (100% Payout to Seller)',
      transactionId: '0x961c70865bf6097eb16d1b3a19d90f950b2cdd789eda5554c93baba1de0954e1',
      settledAmount: '0.001 MON',
      buyerRefundBps: 0,
      sellerReleaseBps: 10000,
      buyerRefundAmount: '0.0 MON (0%)',
      sellerReleaseAmount: '0.001 MON (100%)',
      outcome: 'VERIFIED_PASS_AUTHORIZED_RELEASE',
      termsSummaryHash: '0xebb931936199ae988129d1eed8501a6ad3311035f0d72dd0e52e0c92454a125f',
      evidenceRoot: '0x08a30b2c4935050f1ffbda42a5a6565ab54fc1b090bb47c036afd47aaad2edff',
      resolverContract: 'Uncontested (Direct Escrow Release)',
      onchainTxHash: '0x691f7a80d65fe1deece2f45e8b6600ee4b2b0ffc14f3fe733d995566e2d83b52',
      network: 'Monad Metropolis Testnet (Chain ID: 10143)',
      issuedAt: '2026-09-24T10:25:00Z',
      accountability:
        'Seller deliverable verified by designated verifier 0xb064...c48 with outcome PASS (1). Authorized wallet executed releaseEscrow(), transferring 0.001 MON to seller on Monad Metropolis Testnet.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#07080d] text-gray-100 py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-6">
          <div>
            <div className="text-xs font-mono text-purple-400 font-bold uppercase tracking-wider mb-1">
              PORTABLE REPUTATION &amp; ACCOUNTABILITY
            </div>
            <h1 className="text-3xl font-extrabold text-white">Trust Receipts &amp; Provenance Vault</h1>
            <p className="text-xs sm:text-sm text-gray-400 font-mono mt-1">
              Cryptographic, portable receipts binding commercial intent, attested evidence roots, and immutable onchain settlement.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/demo-video"
              className="px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-200 border border-gray-700 font-mono text-xs font-bold transition flex items-center gap-2"
            >
              <span>Demo Video Studio →</span>
            </Link>
            <Link
              href="/transactions"
              className="px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-mono text-xs font-bold transition shadow-lg shadow-purple-950 flex items-center gap-2"
            >
              <span>Transaction Directory →</span>
            </Link>
          </div>
        </div>

        {/* Conceptual Explainer */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-purple-950/40 to-indigo-950/40 border border-purple-900/60 font-mono text-xs space-y-1">
          <div className="text-purple-300 font-bold flex items-center gap-2">
            <span>🛡 What is a VeriqoMesh Trust Receipt?</span>
          </div>
          <p className="text-gray-300 font-sans text-xs">
            A Trust Receipt is generated upon final settlement. It establishes non-repudiable auditability for both verified deliveries and human dispute adjudication without exposing private commercial terms.
          </p>
        </div>

        {/* Onchain Provenance & Trust Activity (Envio HyperIndex) */}
        <TrustActivity />

        {/* Canonical Receipts List Section Header */}
        <div className="pt-4 border-t border-gray-800/80">
          <div className="text-xs font-mono text-purple-400 font-bold uppercase tracking-wider mb-1">
            IMMUTABLE SETTLEMENT RECORDS
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Soulbound Trust Receipts</h2>
          <p className="text-xs text-gray-400 font-mono">
            Non-transferable ERC-5192 Soulbound receipts issued by <code>0xE199...B819</code> on Monad Metropolis Testnet.
          </p>
        </div>

        {/* Receipts List */}
        <div className="space-y-6">
          {receipts.map((rcpt) => (
            <div
              key={rcpt.id}
              className="p-6 rounded-2xl border transition-all bg-gradient-to-b from-[#141026] via-[#0d0e18] to-[#07080d] border-purple-600/80 shadow-2xl shadow-purple-950/20"
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800/80 pb-4 mb-5">
                <div>
                  <div className="flex items-center gap-2.5 mb-1 font-mono text-xs">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700">
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
                <div>
                  <span className="text-gray-500 block text-[10px]">RESOLVER CONTRACT:</span>
                  <code className="text-emerald-400 break-all">{rcpt.resolverContract}</code>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px]">ONCHAIN EXECUTION TX:</span>
                  <a
                    href={`https://testnet.monadexplorer.com/tx/${rcpt.onchainTxHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-purple-300 hover:text-purple-200 underline break-all font-mono"
                  >
                    {rcpt.onchainTxHash} ↗
                  </a>
                </div>
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
                  href={`/transactions/${rcpt.transactionId}`}
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
