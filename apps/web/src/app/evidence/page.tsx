'use client';

import React from 'react';
import Link from 'next/link';

export default function EvidenceExplorerPage() {
  const evidenceItems = [
    {
      id: 'EV-01',
      title: 'Carrier Bill of Lading (Freight Driver Sign-Off)',
      submitter: 'Dallas Solar Supply Co. (0x6f30...3c873)',
      role: 'Seller / Fulfillment Node',
      storageUri: 'ipfs://QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco',
      contentHash: '0xa1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e',
      metadataHash: '0x1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff',
      status: 'VERIFIED',
      details: 'Signed electronic BOL verifying dispatch of 100 palletized photovoltaic units via Apex Freight.',
    },
    {
      id: 'EV-02',
      title: 'Geotagged Depot Delivery Photo (Exif Verified)',
      submitter: 'Apex Grid Logistics (0x91A4...3e11)',
      role: 'Logistics Carrier Node',
      storageUri: 'ipfs://QmZ4tDuvesekSs4qM5ZBKpXiZGun7S2CYtEZRB3DYXkjGx',
      contentHash: '0xb2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f',
      metadataHash: '0x222233334444555566667777888899990000aaaabbbbccccddddeeeeffff1111',
      status: 'VERIFIED',
      details: 'Depot staging photo with cryptographic GPS telemetry match: 32.7767° N, 96.7970° W (Dallas Terminal).',
    },
    {
      id: 'EV-03',
      title: '100-Unit Serial Number Barcode Manifest',
      submitter: 'Dallas Solar Supply Co. (0x6f30...3c873)',
      role: 'Seller / Supplier',
      storageUri: 'ipfs://QmPZ9gcCEpqKTo6aq61g2nXGUhM4iCL3ewB6LXZv7K7S8Y',
      contentHash: '0xc3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a',
      metadataHash: '0x33334444555566667777888899990000aaaabbbbccccddddeeeeffff11112222',
      status: 'FLAGGED DEFECT',
      details: 'Manufacturer barcode list. 15 modules flagged with micro-fractures during depot EL testing.',
    },
    {
      id: 'EV-04',
      title: 'Independent Verifier Physical Inspection Attestation',
      submitter: 'Bureau Veritas Node (0x16D7...4EA)',
      role: 'Accredited Verifier Node (Canonical Dispute Audit)',
      storageUri: 'ipfs://QmW2WQi7j6c7UgJTarActp7tDNikE4B2qdog7QqsuA6247',
      contentHash: '0xd4e5f60718293a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b',
      metadataHash: '0x4444555566667777888899990000aaaabbbbccccddddeeeeffff111122223333',
      status: 'INCONCLUSIVE (DISPUTE TRIGGER)',
      details: 'Formal inspection finding 85 units fully functional and 15 units damaged. Triggered human adjudication panel.',
    },
  ];

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

          <Link
            href="/transactions/0x2b57d6b0ef1ba16a60c4f801d90d27d23e598fd6b1381e0175077201dc6afcc4"
            className="px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-mono text-xs font-bold transition shadow-lg shadow-purple-950 flex items-center gap-2 self-start sm:self-auto"
          >
            <span>Inspect Live Transaction Room →</span>
          </Link>
        </div>

        {/* Prominent Historical Benchmark Context Label */}
        <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-600/70 font-mono text-xs space-y-1">
          <div className="flex items-center gap-2 text-purple-300 font-bold">
            <span className="px-2 py-0.5 rounded bg-purple-900 border border-purple-500 text-[10px] uppercase">
              HISTORICAL BENCHMARK EVIDENCE
            </span>
            <span>Read-Only Architectural Reference</span>
          </div>
          <p className="text-gray-300 font-sans text-xs">
            These records demonstrate the VeriqoMesh evidence and verification architecture using historical testnet scenarios. They are read-only and are not submissions from your current wallet.
          </p>
        </div>

        {/* Transaction Association Banner */}
        <div className="p-4 rounded-xl bg-gray-900/80 border border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-3 font-mono text-xs">
          <div className="space-y-1">
            <div className="text-gray-400 text-[10px]">ASSOCIATED ESCROW TRANSACTION:</div>
            <div className="text-white font-bold">100 Commercial Solar Panels (Disputed Texas Delivery)</div>
            <div className="text-gray-400 text-[11px]">
              Tx ID: <code className="text-purple-300">0x2b57d6b0ef1ba16a60c4f801d90d27d23e598fd6b1381e0175077201dc6afcc4</code>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded bg-purple-950 text-purple-300 border border-purple-800 text-[11px]">
              Evidence Root: <code className="text-gray-200">0x8f2a...7b19</code>
            </span>
          </div>
        </div>

        {/* Evidence Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {evidenceItems.map((item) => (
            <div
              key={item.id}
              className={`p-6 rounded-2xl border transition-all flex flex-col justify-between ${
                item.status.includes('INCONCLUSIVE') || item.status.includes('FLAGGED')
                  ? 'bg-gradient-to-b from-[#18111e] via-[#0f0c16] to-[#07080d] border-amber-600/70 shadow-xl shadow-amber-950/20'
                  : 'bg-gray-900/60 border-gray-800'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3 font-mono text-xs">
                  <span className="text-purple-400 font-bold">{item.id}</span>
                  <span
                    className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                      item.status === 'VERIFIED'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                        : 'bg-amber-950 text-amber-300 border border-amber-700'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white mb-2">{item.title}</h3>
                <p className="text-xs text-gray-300 font-sans mb-4 leading-relaxed">{item.details}</p>

                <div className="bg-gray-950/80 p-3.5 rounded-xl border border-gray-800 space-y-2 font-mono text-[11px] mb-4">
                  <div>
                    <span className="text-gray-500 block text-[10px]">SUBMITTER &amp; ROLE:</span>
                    <span className="text-gray-200">{item.submitter}</span>
                    <span className="text-gray-500 text-[10px] block">({item.role})</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px]">IPFS STORAGE URI:</span>
                    <code className="text-blue-400 break-all">{item.storageUri}</code>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px]">KECCAK256 CONTENT HASH:</span>
                    <code className="text-purple-300 break-all">{item.contentHash}</code>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-800/80 flex items-center justify-between text-xs font-mono text-gray-400">
                <span>Cryptographic integrity verified</span>
                <span className="text-emerald-400">✓ Onchain Bound</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
