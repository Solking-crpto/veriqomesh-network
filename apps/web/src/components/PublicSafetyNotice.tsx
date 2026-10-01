import React from 'react';
import Image from 'next/image';

export function PublicSafetyNotice() {
  return (
    <footer className="mt-12 border-t border-gray-800 bg-[#07080d]/90 py-6 text-xs text-gray-400 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-900 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="relative w-6 h-6 rounded-md overflow-hidden flex items-center justify-center flex-shrink-0 bg-[#090a10]">
              <Image
                src="/brand/veriqomesh-mark.png"
                alt="VeriqoMesh"
                width={24}
                height={24}
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="font-mono text-white font-bold text-xs uppercase tracking-wider">
                VeriqoMesh Network
              </div>
              <div className="text-[10px] text-gray-400 font-mono">
                Trust. Verify. Transact.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 font-mono text-[10px] text-gray-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>Monad Metropolis Testnet • Chain ID: 10143 • EVM Compatible</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[11px] leading-relaxed">
          <div className="p-2.5 rounded bg-gray-950/60 border border-gray-900">
            <span className="text-gray-300 font-medium block mb-1">Testnet Assets Only</span>
            All tokens, deposits, and settlement transactions operate on Monad Metropolis Testnet. Testnet MON assets carry zero real-world monetary value.
          </div>
          <div className="p-2.5 rounded bg-gray-950/60 border border-gray-900">
            <span className="text-gray-300 font-medium block mb-1">Privacy & Data Boundary</span>
            Do not submit sensitive personal, proprietary, or confidential data. Onchain commitments and evidence hashes are immutably preserved onchain.
          </div>
          <div className="p-2.5 rounded bg-gray-950/60 border border-gray-900">
            <span className="text-gray-300 font-medium block mb-1">Cryptographic Evidence & Settlement</span>
            Storage pointers (<code className="text-gray-300 font-mono">ipfs://</code>) serve as content-hash reference commitments. Once verified and authorized, onchain settlements and Trust Receipts are final and irreversible.
          </div>
        </div>

        <div className="pt-2 text-[10px] text-gray-400 flex flex-wrap items-center justify-between gap-2 font-mono">
          <div>
            Built for Monad Metropolis Hackathon • Track: Trust, Identity & AI Infrastructure
          </div>
          <div className="flex items-center gap-3">
            <span>Escrow: <code className="text-gray-300">0x925ea8...015A</code></span>
            <span>•</span>
            <span>Registry: <code className="text-gray-300">0xE1994e...B819</code></span>
          </div>
        </div>

        <div className="pt-3 border-t border-gray-900/80 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono">
          <div className="flex flex-wrap items-center gap-2 text-gray-400">
            <span className="text-gray-300 font-semibold">Official Network Operations & Contact:</span>
            <a
              href="mailto:veriqomeshnetwork@gmail.com"
              className="text-purple-400 hover:text-purple-300 underline transition"
            >
              veriqomeshnetwork@gmail.com
            </a>
            <span className="text-gray-600">•</span>
            <a
              href="https://x.com/veriqomesh_ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 underline transition"
            >
              X: @veriqomesh_ai ↗
            </a>
          </div>
          <div className="text-[10px] text-gray-500">
            EVM Chain ID: 10143 • Metropolis Testnet
          </div>
        </div>
      </div>
    </footer>
  );
}
