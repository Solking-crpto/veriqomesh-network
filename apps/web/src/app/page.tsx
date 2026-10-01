'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDemoNetwork } from '../context/DemoNetworkContext';

export default function LandingPage() {
  const router = useRouter();
  const { role, switchRole, initiator, receiver, requests } = useDemoNetwork();

  const handleEnterInitiator = () => {
    switchRole('INITIATOR');
    router.push('/initiator');
  };

  const handleEnterReceiver = () => {
    switchRole('RECEIVER');
    router.push('/receiver');
  };

  return (
    <div className="min-h-screen bg-[#07080d] text-gray-100 flex flex-col font-sans">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 px-4 sm:px-6 lg:px-8 border-b border-gray-900 bg-gradient-to-b from-[#110f1e] via-[#090a12] to-[#07080d]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent pointer-events-none" />

        <div className="max-w-6xl mx-auto text-center relative z-10">
          {/* Institutional Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/80 border border-purple-600/50 text-purple-300 font-mono text-xs mb-6 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            <span>VeriqoMesh Network Protocol • Monad Testnet Active</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white mb-4">
            VERIQOMESH <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-300">NETWORK</span>
          </h1>

          <p className="text-xl sm:text-2xl font-semibold text-gray-200 mb-3 tracking-wide">
            Trusted Commerce for Humans &amp; AI
          </p>

          <p className="text-base sm:text-lg text-gray-400 max-w-2xl mx-auto mb-10 font-mono">
            Define the deal. Protect the transaction. Verify the outcome.
          </p>

          {/* Core Architectural Principle Strip */}
          <div className="max-w-4xl mx-auto mb-10 p-3 rounded-xl bg-gray-900/90 border border-gray-800 shadow-inner flex flex-wrap items-center justify-around gap-4 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-purple-900/80 text-purple-300 font-bold">1</span>
              <span className="text-gray-200 font-semibold">AI Assists</span>
              <span className="text-gray-500 text-[10px]">(intent structuring)</span>
            </div>
            <div className="text-gray-600 hidden sm:inline">•</div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-blue-900/80 text-blue-300 font-bold">2</span>
              <span className="text-gray-200 font-semibold">Humans Authorize</span>
              <span className="text-gray-500 text-[10px]">(wallet ratification)</span>
            </div>
            <div className="text-gray-600 hidden sm:inline">•</div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-amber-900/80 text-amber-300 font-bold">3</span>
              <span className="text-gray-200 font-semibold">Verifiers Verify</span>
              <span className="text-gray-500 text-[10px]">(evidence attestation)</span>
            </div>
            <div className="text-gray-600 hidden sm:inline">•</div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-emerald-900/80 text-emerald-300 font-bold">4</span>
              <span className="text-gray-200 font-semibold">Blockchain Enforces</span>
              <span className="text-gray-500 text-[10px]">(Monad onchain escrow)</span>
            </div>
          </div>

          {/* TWO PRIMARY ENTRY POINTS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto text-left">
            {/* INITIATOR CARD */}
            <div className="p-6 rounded-2xl bg-gradient-to-b from-[#141224] to-[#0c0d16] border border-purple-700/60 shadow-xl shadow-purple-950/20 hover:border-purple-500 transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="px-2.5 py-1 rounded bg-purple-900/80 text-purple-200 font-mono text-xs font-bold border border-purple-700">
                    BUYER / CLIENT / PRINCIPAL
                  </span>
                  <span className="text-purple-400 font-mono text-xs">Origin Node</span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2 group-hover:text-purple-300 transition">
                  Transaction Initiator
                </h2>
                <p className="text-xs text-gray-300 mb-4 leading-relaxed">
                  Commission commercial procurement, set spending limits, define deliverable milestones, and mandate independent verification before capital release.
                </p>
                <div className="bg-purple-950/40 rounded-lg p-3 border border-purple-900/60 mb-5 text-[11px] font-mono space-y-1">
                  <div className="text-gray-400">Demo Persona: <span className="text-white font-semibold">{initiator.name}</span></div>
                  <div className="text-gray-400">Agent: <span className="text-purple-300">{initiator.agentName}</span> (Autonomous Policy)</div>
                  <div className="text-gray-400">Wallet: <code className="text-gray-300">{initiator.wallet.slice(0, 10)}...{initiator.wallet.slice(-6)}</code></div>
                </div>
              </div>
              <button
                onClick={handleEnterInitiator}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-600 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-purple-900/50 transition flex items-center justify-center gap-2"
              >
                <span>ENTER AS INITIATOR</span>
                <span className="text-lg">→</span>
              </button>
            </div>

            {/* RECEIVER CARD */}
            <div className="p-6 rounded-2xl bg-gradient-to-b from-[#0d1624] to-[#0a0d16] border border-blue-700/60 shadow-xl shadow-blue-950/20 hover:border-blue-500 transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="px-2.5 py-1 rounded bg-blue-900/80 text-blue-200 font-mono text-xs font-bold border border-blue-700">
                    SELLER / SUPPLIER / FULFILLMENT
                  </span>
                  <span className="text-blue-400 font-mono text-xs">Fulfillment Node</span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2 group-hover:text-blue-300 transition">
                  Transaction Receiver
                </h2>
                <p className="text-xs text-gray-300 mb-4 leading-relaxed">
                  Receive inbound commercial requests, review &amp; sign agreements, fulfill deliverables, submit cryptographically hashed proof, and claim escrow.
                </p>
                <div className="bg-blue-950/40 rounded-lg p-3 border border-blue-900/60 mb-5 text-[11px] font-mono space-y-1">
                  <div className="text-gray-400">Demo Persona: <span className="text-white font-semibold">{receiver.name}</span></div>
                  <div className="text-gray-400">Capabilities: <span className="text-blue-300">Commercial Solar PV, Freight, Inspection</span></div>
                  <div className="text-gray-400">Wallet: <code className="text-gray-300">{receiver.wallet.slice(0, 10)}...{receiver.wallet.slice(-6)}</code></div>
                </div>
              </div>
              <button
                onClick={handleEnterReceiver}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-sm shadow-lg shadow-blue-900/50 transition flex items-center justify-center gap-2"
              >
                <span>ENTER AS RECEIVER</span>
                <span className="text-lg">→</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Complete Two-Sided Product Lifecycle Visual Track */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-b border-gray-900 bg-[#090b12]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-xs font-mono font-bold text-purple-400 uppercase tracking-widest">
              END-TO-END COMMERCIAL INFRASTRUCTURE
            </span>
            <h2 className="text-3xl font-extrabold text-white mt-1">
              How VeriqoMesh Connects &amp; Protects Commerce
            </h2>
            <p className="text-gray-400 text-sm max-w-xl mx-auto mt-2">
              From natural intent and direct counterparty negotiation to independent verification and multi-path settlement.
            </p>
          </div>

          {/* Step Sequence Grid */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 font-mono text-xs">
            {/* Step 1 */}
            <div className="p-4 rounded-xl bg-gray-900/70 border border-gray-800 flex flex-col">
              <div className="text-purple-400 font-bold text-[10px] mb-1">01 • IDENTITIES</div>
              <div className="text-white font-bold mb-2">Dual Profiles</div>
              <p className="text-gray-400 text-[11px] font-sans flex-1">
                Initiator (Buyer/Agent) and Receiver (Fulfillment Supplier) configure policy boundaries, identities, and verified wallets.
              </p>
              <div className="mt-3 text-[10px] text-purple-300 bg-purple-950/60 p-1.5 rounded border border-purple-900">
                Solar Procurement Ltd. ↔ Dallas Solar Supply
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-4 rounded-xl bg-gray-900/70 border border-gray-800 flex flex-col">
              <div className="text-purple-400 font-bold text-[10px] mb-1">02 • CONNECTION</div>
              <div className="text-white font-bold mb-2">Deal Proposal</div>
              <p className="text-gray-400 text-[11px] font-sans flex-1">
                Initiator parses natural language intent into structured parameters and transmits direct commercial request to counterparty.
              </p>
              <div className="mt-3 text-[10px] text-gray-300 bg-gray-950 p-1.5 rounded border border-gray-800">
                Req: <code className="text-purple-300">VM-REQ-0001</code>
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-4 rounded-xl bg-gray-900/70 border border-gray-800 flex flex-col">
              <div className="text-purple-400 font-bold text-[10px] mb-1">03 • RATIFICATION</div>
              <div className="text-white font-bold mb-2">Mutual Agreement</div>
              <p className="text-gray-400 text-[11px] font-sans flex-1">
                Receiver reviews, counters, or accepts terms. Mutual consent generates onchain terms hash and ratifies escrow authorization.
              </p>
              <div className="mt-3 text-[10px] text-emerald-300 bg-emerald-950/60 p-1.5 rounded border border-emerald-900">
                Ratified Agreement Card
              </div>
            </div>

            {/* Step 4 */}
            <div className="p-4 rounded-xl bg-gray-900/70 border border-gray-800 flex flex-col">
              <div className="text-purple-400 font-bold text-[10px] mb-1">04 • ESCROW</div>
              <div className="text-white font-bold mb-2">Protected Funds</div>
              <p className="text-gray-400 text-[11px] font-sans flex-1">
                Escrow initialized on Monad. Funds are held in strict smart contract state machine. AI Preflight advisory verifies safety.
              </p>
              <div className="mt-3 text-[10px] text-gray-300 bg-gray-950 p-1.5 rounded border border-gray-800">
                Contract: <code className="text-gray-400">0x925e...015A</code>
              </div>
            </div>

            {/* Step 5 */}
            <div className="p-4 rounded-xl bg-gray-900/70 border border-gray-800 flex flex-col">
              <div className="text-purple-400 font-bold text-[10px] mb-1">05 • VERIFY</div>
              <div className="text-white font-bold mb-2">Attestation</div>
              <p className="text-gray-400 text-[11px] font-sans flex-1">
                Carrier BOL, delivery photo, &amp; serial manifest submitted to IPFS. Independent inspector node issues cryptographic attestation.
              </p>
              <div className="mt-3 text-[10px] text-amber-300 bg-amber-950/60 p-1.5 rounded border border-amber-900">
                PASS or INCONCLUSIVE
              </div>
            </div>

            {/* Step 6 */}
            <div className="p-4 rounded-xl bg-gray-900/70 border border-gray-800 flex flex-col">
              <div className="text-purple-400 font-bold text-[10px] mb-1">06 • SETTLE</div>
              <div className="text-white font-bold mb-2">Dual Settlement</div>
              <p className="text-gray-400 text-[11px] font-sans flex-1">
                PASS: Authorized settlement. CONTESTED: 3-judge median quorum determines basis points, verified onchain.
              </p>
              <div className="mt-3 text-[10px] text-indigo-300 bg-indigo-950/60 p-1.5 rounded border border-indigo-900">
                Trust Receipt Generated
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Testnet Dispute Adjudication Callout */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-purple-950/40 border-b border-gray-900">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-mono font-bold text-emerald-400">
                CANONICAL MONAD TESTNET DISPUTE SETTLEMENT
              </span>
            </div>
            <h3 className="text-xl font-bold text-white">
              Demonstrated Live on Monad Metropolis (Chain ID: 10143)
            </h3>
            <p className="text-xs text-gray-300 max-w-2xl font-mono">
              Transaction <code className="text-purple-300">0x2b57d6b0...afcc4</code> was contested due to physical module micro-cracks. Three human judges submitted signed ballots; the protocol computed a deterministic median consensus of 1,500 bps (15% refund, 85% release) executed onchain by resolver <code className="text-purple-300">0x12f9...c35E</code>.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/transactions/0x2b57d6b0ef1ba16a60c4f801d90d27d23e598fd6b1381e0175077201dc6afcc4"
              className="px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-mono text-xs font-bold transition shadow-md"
            >
              Inspect Live Record
            </Link>
            <Link
              href="/trust"
              className="px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-200 font-mono text-xs font-bold transition"
            >
              View Trust Receipt #2
            </Link>
          </div>
        </div>
      </section>

      {/* Quick Navigation Hub */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
        <h3 className="text-sm font-mono text-gray-400 font-bold uppercase tracking-wider mb-6">
          Explore Network Modules
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/initiator/intent"
            className="p-5 rounded-xl bg-gray-900/60 border border-gray-800 hover:border-purple-600/60 transition group flex flex-col justify-between"
          >
            <div>
              <div className="w-8 h-8 rounded-lg bg-purple-900/50 flex items-center justify-center text-purple-300 text-sm mb-3 font-mono font-bold">
                01
              </div>
              <div className="text-sm font-bold text-white group-hover:text-purple-300 transition">
                Create Commercial Intent
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Parse natural language procurement instructions into onchain terms with AI policy bounds.
              </div>
            </div>
            <div className="text-purple-400 text-xs font-mono font-bold mt-4">Start Intent →</div>
          </Link>

          <Link
            href="/receivers"
            className="p-5 rounded-xl bg-gray-900/60 border border-gray-800 hover:border-blue-600/60 transition group flex flex-col justify-between"
          >
            <div>
              <div className="w-8 h-8 rounded-lg bg-blue-900/50 flex items-center justify-center text-blue-300 text-sm mb-3 font-mono font-bold">
                02
              </div>
              <div className="text-sm font-bold text-white group-hover:text-blue-300 transition">
                Receiver Directory
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Discover verified fulfillment suppliers, logistics nodes, and independent physical inspection providers.
              </div>
            </div>
            <div className="text-blue-400 text-xs font-mono font-bold mt-4">Browse Directory →</div>
          </Link>

          <Link
            href="/requests"
            className="p-5 rounded-xl bg-gray-900/60 border border-gray-800 hover:border-emerald-600/60 transition group flex flex-col justify-between"
          >
            <div>
              <div className="w-8 h-8 rounded-lg bg-emerald-900/50 flex items-center justify-center text-emerald-300 text-sm mb-3 font-mono font-bold">
                03
              </div>
              <div className="text-sm font-bold text-white group-hover:text-emerald-300 transition">
                Deal Requests &amp; Agreements
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Two-sided negotiation room to review, counter, or ratify commercial agreements before escrow.
              </div>
            </div>
            <div className="text-emerald-400 text-xs font-mono font-bold mt-4">View Requests →</div>
          </Link>

          <Link
            href="/transactions"
            className="p-5 rounded-xl bg-gray-900/60 border border-gray-800 hover:border-indigo-600/60 transition group flex flex-col justify-between"
          >
            <div>
              <div className="w-8 h-8 rounded-lg bg-indigo-900/50 flex items-center justify-center text-indigo-300 text-sm mb-3 font-mono font-bold">
                04
              </div>
              <div className="text-sm font-bold text-white group-hover:text-indigo-300 transition">
                Transaction Rooms
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Interactive rooms executing AI Preflight, attested evidence verification, and dual-track settlement.
              </div>
            </div>
            <div className="text-indigo-400 text-xs font-mono font-bold mt-4">Enter Rooms →</div>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-8 border-t border-gray-900 bg-[#06070a] text-center text-xs font-mono text-gray-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-300">VeriqoMesh Network</span>
            <span>•</span>
            <span>Trusted Commerce for Humans &amp; AI</span>
          </div>
          <div className="flex items-center gap-4 text-gray-400">
            <Link href="/demo-video" className="hover:text-purple-300 transition">Video Demo</Link>
            <Link href="/evidence" className="hover:text-purple-300 transition">Evidence Explorer</Link>
            <Link href="/trust" className="hover:text-purple-300 transition">Trust Receipts</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
