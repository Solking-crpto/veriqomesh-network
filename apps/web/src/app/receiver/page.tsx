'use client';

import React from 'react';
import Link from 'next/link';
import { useDemoNetwork } from '../../context/DemoNetworkContext';

export default function ReceiverDashboardPage() {
  const { role, switchRole, receiver, requests, acceptDealRequest } = useDemoNetwork();

  const isRoleActive = role === 'RECEIVER';
  const pendingRequests = requests.filter((r) => r.status === 'AWAITING_RECEIVER_ACCEPTANCE');

  return (
    <div className="min-h-screen bg-[#07080d] text-gray-100 py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Role Mismatch Notice */}
        {!isRoleActive && (
          <div className="p-4 rounded-xl bg-blue-950/60 border border-blue-600/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>You are currently viewing the network as <strong>INITIATOR</strong>. Switch to <strong>RECEIVER</strong> to manage Dallas Solar Supply Co.</span>
            </div>
            <button
              onClick={() => switchRole('RECEIVER')}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition whitespace-nowrap"
            >
              Switch to Receiver View
            </button>
          </div>
        )}

        {/* Header & Identity */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-800 pb-6">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="px-2.5 py-0.5 rounded bg-blue-900/80 text-blue-300 font-mono text-xs font-bold border border-blue-700">
                RECEIVER CONSOLE
              </span>
              <span className="text-gray-500 font-mono text-xs">Fulfillment &amp; Supplier Node</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
              <span>{receiver.name}</span>
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-gray-400 mt-2">
              <span>Wallet: <code className="text-gray-300">{receiver.wallet}</code></span>
              <span>•</span>
              <span>Depot: <strong className="text-blue-300">{receiver.location}</strong></span>
              <span>•</span>
              <span className="text-emerald-400">Node Status: {receiver.status}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/requests"
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold transition shadow-lg shadow-blue-950 flex items-center gap-2 relative"
            >
              <span>Incoming Requests</span>
              {pendingRequests.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-black text-[10px] font-black">
                  {pendingRequests.length}
                </span>
              )}
            </Link>
            <Link
              href="/account"
              className="px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-200 font-mono text-xs font-bold transition"
            >
              Edit Node Profile
            </Link>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-gray-900/70 border border-gray-800 font-mono">
            <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Incoming Requests</div>
            <div className="text-2xl font-bold text-amber-400">{pendingRequests.length} New</div>
            <div className="text-[11px] text-gray-400 mt-1">Awaiting your response</div>
          </div>

          <div className="p-4 rounded-xl bg-gray-900/70 border border-gray-800 font-mono">
            <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Active Agreements</div>
            <div className="text-2xl font-bold text-white">{receiver.stats.activeAgreements}</div>
            <div className="text-[11px] text-blue-400 mt-1">In fulfillment &amp; inspection</div>
          </div>

          <div className="p-4 rounded-xl bg-gray-900/70 border border-gray-800 font-mono">
            <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Completed Deals</div>
            <div className="text-2xl font-bold text-emerald-400">{receiver.stats.completed}</div>
            <div className="text-[11px] text-emerald-400/80 mt-1">98% Attestation Pass Rate</div>
          </div>

          <div className="p-4 rounded-xl bg-gray-900/70 border border-gray-800 font-mono">
            <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Onchain Trust Receipts</div>
            <div className="text-2xl font-bold text-indigo-400">{receiver.stats.trustReceipts}</div>
            <div className="text-[11px] text-indigo-300 mt-1">Cryptographic proof</div>
          </div>
        </div>

        {/* Incoming Commercial Requests Widget */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
              <span>Inbound Commercial Requests</span>
              {pendingRequests.length > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-900/60 text-amber-300 border border-amber-700 animate-pulse">
                  {pendingRequests.length} Pending
                </span>
              )}
            </h2>
            <Link
              href="/requests"
              className="text-xs font-mono text-blue-400 hover:text-blue-300 transition"
            >
              All Requests →
            </Link>
          </div>

          {pendingRequests.length > 0 ? (
            <div className="space-y-3">
              {pendingRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-5 rounded-xl bg-gradient-to-r from-blue-950/40 via-gray-900 to-blue-950/20 border border-blue-600/60 font-mono text-xs space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-white text-sm">{req.id}</span>
                        <span className="text-gray-500">•</span>
                        <span className="text-blue-300 font-semibold">{req.deliverable}</span>
                      </div>
                      <div className="text-gray-400 text-[11px]">
                        From: <strong className="text-white">{req.initiator}</strong> ({req.initiatorWallet.slice(0, 10)}...)
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded bg-amber-950 text-amber-300 border border-amber-700 text-[10px] font-bold">
                        ACTION REQUIRED
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-gray-950/80 p-3 rounded-lg border border-gray-800 text-[11px]">
                    <div>
                      <span className="text-gray-400 block text-[10px]">DEPOSIT:</span>
                      <span className="text-emerald-400 font-bold">{req.escrowAmountMon} MON</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">TIMELINE:</span>
                      <span className="text-white">{req.deadlineDays} Days</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">VERIFIER:</span>
                      <span className="text-purple-300">Bureau Veritas Node</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-gray-800/80">
                    <span className="text-[11px] text-gray-400">
                      Sign to ratify mutual agreement and authorize onchain escrow deposit.
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => acceptDealRequest(req.id)}
                        className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs transition shadow-md"
                      >
                        Accept &amp; Ratify Agreement ✓
                      </button>
                      <Link
                        href="/requests"
                        className="py-2 px-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold transition"
                      >
                        Review Full Terms
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 rounded-xl bg-gray-900/40 border border-gray-800 text-center font-mono text-xs text-gray-400">
              No pending inbound requests. All requests are ratified or fulfilled.
            </div>
          )}
        </div>

        {/* Fulfillment Transactions Track */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white font-mono">
              Fulfillment Escrow Transactions
            </h2>
            <Link
              href="/transactions"
              className="text-xs font-mono text-blue-400 hover:text-blue-300 transition"
            >
              All Transactions →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
            {/* Live Testnet Dispute Resolution */}
            <div className="p-5 rounded-xl bg-gradient-to-b from-[#141026] to-[#0c0d16] border border-purple-800/60 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 text-[10px] font-bold">
                    CANONICAL MONAD RESOLUTION
                  </span>
                  <span className="text-gray-400 text-[10px]">Settled via Resolver</span>
                </div>
                <h3 className="text-sm font-bold text-white mb-1">
                  100 Solar Panels (Texas Depot Dispute)
                </h3>
                <p className="text-[11px] text-gray-300 font-sans mb-3">
                  15% micro-crack defects flagged during physical depot inspection. Deterministic 3-judge median allocated 85% release to Dallas Solar Supply and 15% refund to buyer on Monad.
                </p>
                <div className="bg-gray-950 p-2.5 rounded-lg border border-gray-800 space-y-1 text-[11px] mb-4">
                  <div className="text-gray-400">Buyer: <span className="text-gray-200">Solar Procurement Ltd.</span></div>
                  <div className="text-gray-400">Released to Seller: <span className="text-emerald-400 font-bold">8,500 bps (0.00085 MON)</span></div>
                  <div className="text-gray-400">Resolver: <code className="text-purple-300">0x12f9...c35E</code></div>
                </div>
              </div>
              <Link
                href="/transactions/0x2b57d6b0ef1ba16a60c4f801d90d27d23e598fd6b1381e0175077201dc6afcc4"
                className="w-full text-center py-2 px-3 rounded-lg bg-purple-700 hover:bg-purple-600 text-white font-bold transition text-xs shadow-md"
              >
                Inspect Settlement Dossier →
              </Link>
            </div>

            {/* Autonomous Delivery Flow */}
            <div className="p-5 rounded-xl bg-gradient-to-b from-[#0e1726] to-[#0a0d16] border border-blue-800/60 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-700 text-[10px] font-bold">
                    UNCONTESTED FULFILLMENT
                  </span>
                  <span className="text-gray-400 text-[10px]">PASS Settlement</span>
                </div>
                <h3 className="text-sm font-bold text-white mb-1">
                  Tier-1 Solar PV (Full Escrow Release)
                </h3>
                <p className="text-[11px] text-gray-300 font-sans mb-3">
                  Delivered to Dallas depot with 100% verified serial manifest. Bureau Veritas attested PASS. 100% escrow capital released autonomously by buyer agent.
                </p>
                <div className="bg-gray-950 p-2.5 rounded-lg border border-gray-800 space-y-1 text-[11px] mb-4">
                  <div className="text-gray-400">Escrow Capital: <span className="text-emerald-400 font-bold">12.5 MON</span></div>
                  <div className="text-gray-400">Verification: <span className="text-emerald-400 font-bold">PASS Attested</span></div>
                  <div className="text-gray-400">Status: <span className="text-emerald-300 font-bold">SETTLED (100% TO SELLER)</span></div>
                </div>
              </div>
              <Link
                href="/transactions/story-a"
                className="w-full text-center py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition text-xs shadow-md"
              >
                Inspect Autonomous Room →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
