import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export const metadata = {
  title: 'Hackathon Submission Video | VeriqoMesh Network',
  description:
    'Official hackathon submission video (02:55 • 1080p) demonstrating programmable trust infrastructure for human and AI commerce on Monad Metropolis Testnet.',
};

export default function DemoVideoPage() {
  return (
    <div className="min-h-screen bg-[#07080d] text-gray-100 font-sans flex flex-col justify-between">
      {/* Top Global Navigation Bar */}
      <header className="border-b border-gray-900 bg-[#090a10]/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-full border border-purple-500/40 p-0.5 bg-purple-950/40 overflow-hidden">
                <Image
                  src="/brand/veriqomesh-mark.png"
                  alt="VeriqoMesh Mark"
                  width={32}
                  height={32}
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="font-bold text-white tracking-tight group-hover:text-purple-300 transition">
                VERIQOMESH <span className="text-purple-400">NETWORK</span>
              </span>
            </Link>
            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-purple-950/70 border border-purple-800 text-[11px] font-mono text-purple-300 font-semibold">
              SUBMISSION VIDEO
            </span>
          </div>

          <nav className="flex items-center gap-2 sm:gap-4 text-xs font-mono">
            <Link
              href="/"
              className="px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-gray-300 border border-gray-800 transition"
            >
              ← Back to Web App
            </Link>
            <Link
              href="/initiator"
              className="px-3 py-1.5 rounded-lg bg-purple-950/50 hover:bg-purple-900/60 text-purple-300 border border-purple-800/60 transition hidden md:inline-block"
            >
              Initiator Portal
            </Link>
            <Link
              href="/receiver"
              className="px-3 py-1.5 rounded-lg bg-blue-950/50 hover:bg-blue-900/60 text-blue-300 border border-blue-800/60 transition hidden md:inline-block"
            >
              Receiver Portal
            </Link>
            <Link
              href="/transactions"
              className="px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-gray-300 border border-gray-800 transition hidden sm:inline-block"
            >
              Transactions
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {/* Header / Hero Titles */}
        <div className="text-center mb-8 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-950/80 border border-purple-600/60 text-purple-300 font-mono text-xs shadow-sm">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            <span>Monad Metropolis Testnet • Chain ID: 10143</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
            VERIQOMESH <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-300">NETWORK</span>
          </h1>

          <p className="text-lg sm:text-xl font-bold text-gray-200 uppercase tracking-wider font-mono">
            HACKATHON SUBMISSION VIDEO
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs font-mono pt-1">
            <span className="px-2.5 py-1 rounded bg-purple-900/40 border border-purple-700/60 text-purple-300 font-bold">
              02:55 DURATION
            </span>
            <span className="px-2.5 py-1 rounded bg-blue-900/40 border border-blue-700/60 text-blue-300">
              1080p FULL HD
            </span>
            <span className="px-2.5 py-1 rounded bg-emerald-900/40 border border-emerald-700/60 text-emerald-300">
              16:9 FORMAT
            </span>
            <span className="px-2.5 py-1 rounded bg-gray-900 border border-gray-800 text-gray-400">
              H.264 / AAC
            </span>
          </div>
        </div>

        {/* Video Player Container */}
        <div className="relative w-full aspect-video bg-[#030712] rounded-2xl border border-purple-500/30 overflow-hidden shadow-2xl shadow-purple-950/40 mb-8">
          <video
            controls
            preload="metadata"
            className="w-full h-full object-contain bg-black"
            poster="/video/veriqomesh-hackathon-submission-thumbnail.png"
          >
            <source src="/video/veriqomesh-hackathon-submission.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>

        {/* Core Narrative & Architecture Callouts */}
        <div className="space-y-6">
          {/* Mission & Principle Box */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-[#120e24] to-[#0c0d18] border border-purple-700/40 shadow-lg text-center space-y-3">
            <p className="text-lg sm:text-xl font-medium text-gray-200">
              &ldquo;VeriqoMesh is a programmable trust layer for human and AI-assisted commerce on Monad.&rdquo;
            </p>
            <div className="text-base sm:text-lg font-bold font-mono text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-sky-300 to-emerald-400">
              AI assists. Humans authorize. Verifiers verify. Blockchain enforces.
            </div>
          </div>

          {/* 7-Stage End-to-End Workflow Ribbon */}
          <div className="p-5 rounded-2xl bg-[#090b14] border border-gray-800/80 space-y-3">
            <div className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider text-center">
              The 7-Stage Commercial Lifecycle
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 text-center text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-800/50 text-purple-300">
                <div className="font-bold">1. INTENT</div>
                <div className="text-[10px] text-gray-400 mt-0.5">Natural Need</div>
              </div>
              <div className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-800/50 text-purple-300">
                <div className="font-bold">2. AGREEMENT</div>
                <div className="text-[10px] text-gray-400 mt-0.5">Canonical Hash</div>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-950/30 border border-blue-800/50 text-blue-300">
                <div className="font-bold">3. ESCROW</div>
                <div className="text-[10px] text-gray-400 mt-0.5">Solvent Vault</div>
              </div>
              <div className="p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-800/50 text-cyan-300">
                <div className="font-bold">4. EVIDENCE</div>
                <div className="text-[10px] text-gray-400 mt-0.5">Offchain Proof</div>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-800/50 text-emerald-300">
                <div className="font-bold">5. VERIFY</div>
                <div className="text-[10px] text-gray-400 mt-0.5">Auditor PASS</div>
              </div>
              <div className="p-2.5 rounded-xl bg-teal-950/30 border border-teal-800/50 text-teal-300">
                <div className="font-bold">6. SETTLE</div>
                <div className="text-[10px] text-gray-400 mt-0.5">State 11</div>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-800/50 text-amber-300 col-span-2 sm:col-span-1">
                <div className="font-bold">7. RECEIPT</div>
                <div className="text-[10px] text-gray-400 mt-0.5">Soulbound NFT</div>
              </div>
            </div>
          </div>

          {/* Verifiable Onchain Evidence Card */}
          <div className="p-5 rounded-2xl bg-[#080912] border border-gray-800 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
              <span className="font-bold text-gray-300 uppercase tracking-wider">
                Verifiable Testnet Evidence Showcase
              </span>
              <span className="text-[11px] text-purple-400">
                Monad Metropolis Testnet (10143)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-gray-300">
              <div className="p-3 rounded-xl bg-gray-950/80 border border-gray-800/80 space-y-1">
                <div className="text-[10px] text-gray-400 uppercase">Settlement Transaction Hash</div>
                <div className="font-mono text-emerald-400 text-[11px] break-all">
                  0x691f7a80d65fe1deece2f45e8b6600ee4b2b0ffc14f3fe733d995566e2d83b52
                </div>
                <div className="text-[10px] text-gray-400">
                  Block Number: <span className="text-gray-200">66436615</span> • Status: <span className="text-emerald-400">Success</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-gray-950/80 border border-gray-800/80 space-y-1">
                <div className="text-[10px] text-gray-400 uppercase">Internal Transaction Identifier</div>
                <div className="font-mono text-purple-400 text-[11px] break-all">
                  0x961c70865bf6097eb16d1b3a19d90f950b2cdd789eda5554c93baba1de0954e1
                </div>
                <div className="text-[10px] text-gray-400">
                  Seller Node: <span className="text-gray-200">0x0e73...6Ee8</span> • Amount: <span className="text-emerald-400">0.001 MON</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-gray-950/80 border border-gray-800/80 space-y-1">
                <div className="text-[10px] text-gray-400 uppercase">Smart Escrow Vault Contract</div>
                <div className="font-mono text-sky-400 text-[11px] break-all">
                  0x925ea880cA53DE0352b84B24d0C0dee5B258015A
                </div>
                <div className="text-[10px] text-gray-400">
                  Solvency Invariant: <span className="text-emerald-400">Balance &gt;= Liabilities</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-gray-950/80 border border-gray-800/80 space-y-1">
                <div className="text-[10px] text-gray-400 uppercase">Trust Receipt Registry Contract</div>
                <div className="font-mono text-amber-400 text-[11px] break-all">
                  0xE1994e0dF7CD5A836be4b02AE2164A542418B819
                </div>
                <div className="text-[10px] text-gray-400">
                  Soulbound Record: <span className="text-amber-400">Token ID #3 Minted</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Safety Designation & Institutional Footer */}
      <footer className="border-t border-gray-900 bg-[#06070b] py-6 text-xs text-gray-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-gray-400 font-semibold">Monad Metropolis Testnet</span>
            <span>•</span>
            <span>Chain ID: 10143</span>
            <span>•</span>
            <span className="text-amber-400/80">Testnet assets only</span>
          </div>

          <div className="flex items-center gap-6 text-gray-400">
            <a
              href="mailto:veriqomeshnetwork@gmail.com"
              className="hover:text-purple-300 transition underline underline-offset-4"
            >
              veriqomeshnetwork@gmail.com
            </a>
            <a
              href="https://x.com/veriqomesh_ai"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-purple-300 transition underline underline-offset-4"
            >
              @veriqomesh_ai
            </a>
            <Link href="/" className="hover:text-gray-200 transition">
              veriqomesh.xyz
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
