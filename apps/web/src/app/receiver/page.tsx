'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useDemoNetwork } from '../../context/DemoNetworkContext';
import { isBenchmarkRequest, isAwaitingReceiverAction } from '../../lib/invitation-utils';

export default function ReceiverDashboardPage() {
  const {
    role,
    switchRole,
    receiver,
    allRequests,
    actionableRequestsCount,
    wallet,
  } = useDemoNetwork();

  const isRoleActive = role === 'RECEIVER';

  // Only genuine actionable requests addressed to this connected wallet
  const actionableRequests = useMemo(() => {
    if (!wallet.isConnected || !wallet.address) return [];
    return allRequests.filter(
      (r) =>
        !isBenchmarkRequest(r) &&
        isAwaitingReceiverAction(r) &&
        r.receiverWallet?.toLowerCase() === wallet.address?.toLowerCase()
    );
  }, [allRequests, wallet.isConnected, wallet.address]);

  // Historical benchmark records for reference and audit
  const historicalRecords = useMemo(() => {
    return allRequests.filter((r) => isBenchmarkRequest(r));
  }, [allRequests]);

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

        {/* Institutional Connection Status Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-gray-900/60 border border-gray-800 text-xs font-mono">
          <div className="flex items-center gap-2.5">
            <span className={`w-2.5 h-2.5 rounded-full ${wallet.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="text-gray-300">
              {wallet.isConnected ? (
                <>
                  Connected Wallet: <code className="text-white font-bold">{wallet.address}</code>
                </>
              ) : (
                <span className="text-amber-300 font-semibold">Disconnected (Viewing Demo Defaults)</span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-3 text-gray-400 text-[11px]">
            <span>Actionable Inbound: <strong className={actionableRequestsCount > 0 ? "text-amber-400 font-bold" : "text-gray-300"}>{actionableRequestsCount}</strong></span>
            <span>•</span>
            <span>Node Role: <strong className="text-blue-300">RECEIVER</strong></span>
            <span>•</span>
            <span>Network: <span className="text-purple-300">Monad Metropolis Testnet (10143)</span></span>
          </div>
        </div>

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
              {actionableRequestsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-black text-[10px] font-black">
                  {actionableRequestsCount}
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
            <div className="text-2xl font-bold text-amber-400">{actionableRequestsCount} New</div>
            <div className="text-[11px] text-gray-400 mt-1">
              {actionableRequestsCount > 0 ? 'Awaiting your onchain response' : 'No action required'}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-gray-900/70 border border-gray-800 font-mono">
            <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Active Agreements</div>
            <div className="text-2xl font-bold text-white">{receiver.stats.activeAgreements}</div>
            <div className="text-[11px] text-blue-400 mt-1">
              {wallet.isConnected ? 'In fulfillment & inspection' : 'Demo benchmark defaults'}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-gray-900/70 border border-gray-800 font-mono">
            <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Completed Deals</div>
            <div className="text-2xl font-bold text-emerald-400">{receiver.stats.completed}</div>
            <div className="text-[11px] text-emerald-400/80 mt-1">
              {wallet.isConnected ? '98% Attestation Pass Rate' : 'Demo benchmark defaults'}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-gray-900/70 border border-gray-800 font-mono">
            <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Onchain Trust Receipts</div>
            <div className="text-2xl font-bold text-indigo-400">{receiver.stats.trustReceipts}</div>
            <div className="text-[11px] text-indigo-300 mt-1">
              {wallet.isConnected ? 'Cryptographic proof' : 'Demo benchmark defaults'}
            </div>
          </div>
        </div>

        {/* Incoming Commercial Requests Widget */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
              <span>Inbound Commercial Requests</span>
              {actionableRequestsCount > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-900/60 text-amber-300 border border-amber-700 animate-pulse">
                  {actionableRequestsCount} Action Required
                </span>
              )}
            </h2>
            <Link
              href="/requests"
              className="text-xs font-mono text-blue-400 hover:text-blue-300 transition"
            >
              All Requests Inbox →
            </Link>
          </div>

          {actionableRequests.length > 0 ? (
            <div className="space-y-3">
              {actionableRequests.map((req) => (
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
                      <span className="text-purple-300 font-mono text-[10px]">
                        {req.verifierAddress ? `${req.verifierAddress.slice(0, 6)}...${req.verifierAddress.slice(-4)}` : 'Designated Verifier'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-gray-800/80">
                    <span className="text-[11px] text-gray-400">
                      Authoritative ratification requires onchain agreement and EIP-191 cryptographic mutation.
                    </span>
                    <div className="flex items-center gap-2">
                      <Link
                        href={req.invitationCode ? `/requests?invitation=${req.invitationCode}` : '/requests'}
                        className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs transition shadow-md flex items-center gap-1.5"
                      >
                        <span>Review &amp; Ratify Onchain</span>
                        <span>→</span>
                      </Link>
                      <Link
                        href="/requests"
                        className="py-2 px-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold transition"
                      >
                        Full Terms
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 rounded-xl bg-gray-900/40 border border-gray-800 text-center font-mono text-xs text-gray-400 space-y-2">
              <div className="text-gray-300 font-semibold">
                {wallet.isConnected
                  ? 'No pending inbound requests awaiting your signature.'
                  : 'Disconnected — Viewing Demo Defaults. Connect your wallet to receive live commercial invitations.'}
              </div>
              <p className="text-gray-500 text-[11px] max-w-lg mx-auto">
                All verified commercial requests require onchain escrow ratification in the /requests inbox.
              </p>
            </div>
          )}

          {/* Historical Benchmark Records for Audit */}
          {historicalRecords.length > 0 && (
            <div className="mt-4 space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs font-mono text-gray-500 px-1">
                <span>Historical Testnet Benchmarks ({historicalRecords.length} records)</span>
                <span className="text-[10px] text-gray-600">Immutable Audit Only</span>
              </div>
              <div className="space-y-2">
                {historicalRecords.slice(0, 2).map((req) => (
                  <div
                    key={req.id}
                    className="p-3.5 rounded-xl bg-gray-950/60 border border-gray-800 font-mono text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-gray-400"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-300">{req.id}</span>
                        <span className="text-gray-600">•</span>
                        <span className="text-gray-300">{req.deliverable}</span>
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5">
                        Escrow: {req.escrowAmountMon} MON • {req.createdAt || 'Benchmark Record'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-gray-900 text-gray-400 border border-gray-700 text-[10px] font-bold">
                        HISTORICAL BENCHMARK (READ-ONLY)
                      </span>
                      <Link
                        href={req.transactionId ? `/transactions/${req.transactionId}` : '/requests'}
                        className="py-1 px-2.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs transition"
                      >
                        Audit →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
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
                  Delivered to Dallas depot with 100% verified serial manifest. Bureau Veritas attested PASS. AI agent verified attestation policy; 100% escrow capital released and enforced onchain. AI assists. Humans authorize. Verifiers verify. Blockchain enforces.
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
                Inspect Settlement Room →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
