'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useDemoNetwork } from '../../context/DemoNetworkContext';
import { isWalletCompatibleWithRole, TARGET_BUYER_ADDRESS, TARGET_SELLER_ADDRESS } from '../../lib/invitation-utils';

export default function InitiatorDashboardPage() {
  const { role, switchRole, initiator, requests, wallet } = useDemoNetwork();

  const isRoleActive = role === 'INITIATOR';

  // Role compatibility check for connected wallet vs designated initiator
  const initiatorCompatibility = useMemo(() => {
    return isWalletCompatibleWithRole({
      role: 'INITIATOR',
      connectedWallet: wallet.address,
      isConnected: wallet.isConnected,
      designatedInitiator: initiator.wallet || TARGET_BUYER_ADDRESS,
    });
  }, [wallet.address, wallet.isConnected, initiator.wallet]);

  return (
    <div className="min-h-screen bg-[#07080d] text-gray-100 py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Role Mismatch Notice */}
        {!isRoleActive && (
          <div className="p-4 rounded-xl bg-purple-950/60 border border-purple-600/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>You are currently viewing the network as <strong>RECEIVER</strong>. Switch to <strong>INITIATOR</strong> to act as Solar Procurement Ltd.</span>
            </div>
            <button
              onClick={() => switchRole('INITIATOR')}
              className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold transition whitespace-nowrap"
            >
              Switch to Initiator View
            </button>
          </div>
        )}

        {/* Wrong Wallet Connected Warning */}
        {wallet.isConnected && !initiatorCompatibility.isCompatible && (
          <div className="p-5 rounded-2xl bg-amber-950/40 border border-amber-600/70 space-y-3 font-mono text-xs">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              <span>Initiator Wallet Required — Connected Wallet Is Not the Designated Buyer</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-950/70 p-3.5 rounded-xl border border-gray-800 text-[11px]">
              <div>
                <span className="text-gray-400 block text-[10px]">CURRENT CONNECTED WALLET:</span>
                <code className="text-amber-300 font-bold">{wallet.address}</code>
                <span className="block text-gray-500 text-[10px] mt-0.5">
                  {wallet.address?.toLowerCase() === TARGET_SELLER_ADDRESS.toLowerCase()
                    ? 'Authorized as Receiver/Seller persona'
                    : 'External unauthenticated account'}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px]">DESIGNATED INITIATOR PROFILE:</span>
                <code className="text-purple-300 font-bold">{initiator.wallet}</code>
                <span className="block text-gray-500 text-[10px] mt-0.5">{initiator.name} (Buyer Principal)</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <p className="text-gray-400 text-[11px]">
                Creating commercial intents and depositing escrow capital requires the authorized buyer identity. Switch accounts or disconnect to continue.
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => wallet.disconnect()}
                  className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold text-xs transition border border-gray-700"
                >
                  Disconnect Wallet
                </button>
                <button
                  onClick={() => wallet.connect()}
                  className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition"
                >
                  Switch Account
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Institutional Connection Status Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-gray-900/60 border border-gray-800 text-xs font-mono">
          <div className="flex items-center gap-2.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                !wallet.isConnected
                  ? 'bg-amber-400'
                  : initiatorCompatibility.isCompatible
                  ? 'bg-purple-400 animate-pulse'
                  : 'bg-amber-500 animate-pulse'
              }`}
            />
            <span className="text-gray-300">
              {wallet.isConnected ? (
                <>
                  Connected Wallet: <code className="text-white font-bold">{wallet.address}</code>
                  {!initiatorCompatibility.isCompatible && (
                    <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700 text-[10px] font-bold">
                      NOT DESIGNATED INITIATOR
                    </span>
                  )}
                </>
              ) : (
                <span className="text-amber-300 font-semibold">Disconnected (Viewing Demo Defaults)</span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-3 text-gray-400 text-[11px]">
            <span>Persona: <strong className="text-purple-300">{initiator.name}</strong></span>
            <span>•</span>
            <span>
              Node Role:{' '}
              <strong
                className={
                  !wallet.isConnected
                    ? 'text-gray-400'
                    : initiatorCompatibility.isCompatible
                    ? 'text-purple-300'
                    : 'text-amber-400'
                }
              >
                {!wallet.isConnected
                  ? 'INITIATOR (DISCONNECTED)'
                  : initiatorCompatibility.isCompatible
                  ? 'INITIATOR (AUTHENTICATED)'
                  : 'UNMATCHED (INITIATOR REQUIRED)'}
              </strong>
            </span>
            <span>•</span>
            <span>Network: <span className="text-purple-300">Monad Metropolis Testnet (10143)</span></span>
          </div>
        </div>

        {/* Header & Identity */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-800 pb-6">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="px-2.5 py-0.5 rounded bg-purple-900/80 text-purple-300 font-mono text-xs font-bold border border-purple-700">
                INITIATOR DASHBOARD
              </span>
              <span className="text-gray-500 font-mono text-xs">Buyer / Principal Console</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white flex flex-wrap items-center gap-3">
              <span>{initiator.name}</span>
              {!wallet.isConnected && (
                <span className="px-2.5 py-1 rounded-full bg-amber-950/80 border border-amber-500/80 text-amber-300 font-mono text-xs font-bold uppercase tracking-wider">
                  PUBLIC TESTNET • Connect Wallet to Initiate Commercial Agreements
                </span>
              )}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-gray-400 mt-2">
              <span>Designated Principal: <code className="text-gray-300">{initiator.wallet}</code></span>
              <span>•</span>
              <span>Agent: <strong className="text-purple-300">{initiator.agentName}</strong></span>
              <span>•</span>
              <span className="text-emerald-400">Policy: {initiator.policyStatus}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/initiator/intent"
              className="px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-mono text-xs font-bold transition shadow-lg shadow-purple-950 flex items-center gap-2"
            >
              <span className="text-base">+</span>
              <span>New Commercial Intent</span>
            </Link>
            <Link
              href="/receivers"
              className="px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-200 font-mono text-xs font-bold transition"
            >
              Find Receivers
            </Link>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-gray-900/70 border border-gray-800 font-mono">
            <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Active Deal Requests</div>
            <div className="text-2xl font-bold text-white">{requests.length}</div>
            <div className="text-[11px] text-purple-400 mt-1">
              {wallet.isConnected ? 'Registered commercial intents' : 'Connect wallet to view'}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-gray-900/70 border border-gray-800 font-mono">
            <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Active Escrows</div>
            <div className="text-2xl font-bold text-emerald-400">
              {requests.filter((r) => r.status === 'AGREEMENT_ACTIVE' && r.isOnchain).length}
            </div>
            <div className="text-[11px] text-gray-400 mt-1">
              {wallet.isConnected ? 'Active onchain escrows' : '0 onchain escrows'}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-gray-900/70 border border-gray-800 font-mono">
            <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Agent Spending Limit</div>
            <div className="text-2xl font-bold text-white">{initiator.spendingLimitMon} MON</div>
            <div className="text-[11px] text-gray-400 mt-1">Per transaction policy cap</div>
          </div>

          <div className="p-4 rounded-xl bg-gray-900/70 border border-gray-800 font-mono">
            <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Trust Receipts Held</div>
            <div className="text-2xl font-bold text-indigo-400">0</div>
            <div className="text-[11px] text-indigo-300 mt-1">
              {wallet.isConnected ? 'Verified settlement receipts' : '0 receipts held'}
            </div>
          </div>
        </div>

        {/* Agent Policy Card */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-950/30 via-gray-900/60 to-purple-950/20 border border-purple-800/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wide">
                Programmatic Policy &amp; Autonomy Rules
              </h3>
            </div>
            <Link
              href="/account"
              className="text-xs font-mono text-purple-400 hover:text-purple-300 transition"
            >
              Configure Policy Settings →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
            <div className="p-3 rounded-lg bg-gray-950/60 border border-gray-800">
              <span className="text-gray-400 block text-[10px]">POLICY-ASSISTED VERIFICATION:</span>
              <span className="text-emerald-400 font-semibold">Pre-Authorized Verification Rule</span>
              <p className="text-gray-400 text-[10px] font-sans mt-1">
                When accredited verification attests PASS, policy rules determine the eligible settlement path. Final financial state changes remain subject to cryptographic authorization and onchain contract enforcement.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-gray-950/60 border border-gray-800">
              <span className="text-gray-400 block text-[10px]">CONTESTED ESCALATION:</span>
              <span className="text-amber-400 font-semibold">Deterministic 3-Judge Median</span>
              <p className="text-gray-400 text-[10px] font-sans mt-1">
                If evidence is INCONCLUSIVE or disputed, funds lock onchain and human judges compute refund basis points.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-gray-950/60 border border-gray-800">
              <span className="text-gray-400 block text-[10px]">ACCREDITED VERIFIER:</span>
              <span className="text-purple-300 font-semibold">Bureau Veritas Node</span>
              <p className="text-gray-400 text-[10px] font-sans mt-1">
                Independent physical depot inspection mandated before escrow release authorization.
              </p>
            </div>
          </div>
        </div>

        {/* Active Deal Requests Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
              <span>Active Commercial Requests</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-900/60 text-purple-300 border border-purple-800">
                {requests.length}
              </span>
            </h2>
            <Link
              href="/requests"
              className="text-xs font-mono text-purple-400 hover:text-purple-300 transition"
            >
              Manage All Requests →
            </Link>
          </div>

          {requests.length === 0 ? (
            <div className="p-8 rounded-2xl bg-gray-900/40 border border-gray-800 text-center font-mono space-y-3">
              <div className="text-gray-300 font-semibold text-sm">
                {wallet.isConnected
                  ? 'No active commercial requests initiated yet.'
                  : 'Wallet Disconnected — Connect wallet to view your initiated requests.'}
              </div>
              <p className="text-gray-500 text-xs max-w-md mx-auto">
                Create a new commercial intent to define deliverables, set verification requirements, and establish an escrow agreement on Monad Metropolis Testnet.
              </p>
              <div className="pt-2">
                <Link
                  href="/initiator/intent"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold transition shadow-md"
                >
                  <span>+ Create Commercial Intent</span>
                  <span>→</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="p-4 rounded-xl bg-gray-900/70 border border-gray-800 hover:border-gray-700 transition flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{req.id}</span>
                      <span className="text-gray-400">•</span>
                      <span className="text-purple-300 font-semibold">{req.deliverable}</span>
                    </div>
                    <div className="text-gray-400 text-[11px] flex flex-wrap items-center gap-3">
                      <span>Counterparty: <strong className="text-gray-200">{req.receiver}</strong></span>
                      <span>•</span>
                      <span>Escrow: <strong className="text-emerald-400">{req.escrowAmountMon} MON</strong></span>
                      <span>•</span>
                      <span>Deadline: {req.deadlineDays} days</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        req.status === 'AGREEMENT_ACTIVE'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                          : req.status === 'COUNTERED'
                          ? 'bg-amber-950 text-amber-300 border border-amber-600'
                          : 'bg-purple-950 text-purple-300 border border-purple-600'
                      }`}
                    >
                      {req.status.replace(/_/g, ' ')}
                    </span>
                    <Link
                      href="/requests"
                      className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold transition"
                    >
                      View Terms
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Transactions & Escrows Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white font-mono">
              Live &amp; Verified Escrow Transactions
            </h2>
            <Link
              href="/transactions"
              className="text-xs font-mono text-purple-400 hover:text-purple-300 transition"
            >
              View Transaction Directory →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
            {/* Canonical Testnet Dispute */}
            <div className="p-5 rounded-xl bg-gradient-to-b from-[#141026] to-[#0c0d16] border border-purple-800/60 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 text-[10px] font-bold">
                    CANONICAL MONAD TESTNET
                  </span>
                  <span className="text-gray-400 text-[10px]">Contested Dispute</span>
                </div>
                <h3 className="text-sm font-bold text-white mb-1">
                  100 Commercial Solar Panels (Disputed Delivery)
                </h3>
                <p className="text-[11px] text-gray-300 font-sans mb-3">
                  Independent inspection flagged 15% cracked photovoltaic modules. 3-judge panel submitted signed ballots; median consensus resolved 1,500 bps refund to buyer on Monad.
                </p>
                <div className="bg-gray-950 p-2.5 rounded-lg border border-gray-800 space-y-1 text-[11px] mb-4">
                  <div className="text-gray-400">Tx ID: <code className="text-purple-300">0x2b57d6b0...afcc4</code></div>
                  <div className="text-gray-400">Escrow: <span className="text-emerald-400 font-bold">0.001 MON</span></div>
                  <div className="text-gray-400">Outcome: <span className="text-indigo-300 font-bold">SETTLED VIA MEDIAN QUORUM</span></div>
                </div>
              </div>
              <Link
                href="/transactions/0x2b57d6b0ef1ba16a60c4f801d90d27d23e598fd6b1381e0175077201dc6afcc4"
                className="w-full text-center py-2 px-3 rounded-lg bg-purple-700 hover:bg-purple-600 text-white font-bold transition text-xs shadow-md"
              >
                Inspect Live Testnet Room →
              </Link>
            </div>

            {/* Commercial Agreement Workspace */}
            <div className="p-5 rounded-xl bg-gradient-to-b from-[#0e1726] to-[#0a0d16] border border-blue-800/60 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-700 text-[10px] font-bold">
                    COMMERCIAL AGREEMENT WORKSPACE
                  </span>
                  <span className="text-gray-400 text-[10px]">Onchain Escrow</span>
                </div>
                <h3 className="text-sm font-bold text-white mb-1">
                  Create User-Defined Commercial Mandate
                </h3>
                <p className="text-[11px] text-gray-300 font-sans mb-3">
                  Structure your commercial procurement in natural language. Define deliverables, attach verification requirements, and invite counterparties to ratify on Monad Metropolis Testnet.
                </p>
                <div className="bg-gray-950 p-2.5 rounded-lg border border-gray-800 space-y-1 text-[11px] mb-4">
                  <div className="text-gray-400">Escrow Contract: <code className="text-purple-300">0x925ea8...015A</code></div>
                  <div className="text-gray-400">Registry Contract: <code className="text-blue-300">0xE1994e...B819</code></div>
                  <div className="text-gray-400">Default Verifier: <code className="text-emerald-300">0xb064...2c48</code></div>
                </div>
              </div>
              <Link
                href="/initiator/intent"
                className="w-full text-center py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition text-xs shadow-md"
              >
                Launch Intent Creator →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
