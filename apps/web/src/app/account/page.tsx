'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useDemoNetwork, INDEPENDENT_VERIFIER_ADDRESS } from '../../context/DemoNetworkContext';

export default function AccountPage() {
  const {
    role,
    switchRole,
    initiator,
    updateInitiator,
    receiver,
    updateReceiver,
    wallet,
    bindConnectedWalletToRole,
    resetToGuidedDefaults,
  } = useDemoNetwork();
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Initiator local edit state
  const [initiatorName, setInitiatorName] = useState(initiator.name);
  const [agentName, setAgentName] = useState(initiator.agentName);
  const [spendingLimit, setSpendingLimit] = useState(initiator.spendingLimitMon);
  const [autoExec, setAutoExec] = useState(initiator.autoExecution);
  const [humanFallback, setHumanFallback] = useState(initiator.humanFallback);

  // Receiver local edit state
  const [receiverName, setReceiverName] = useState(receiver.name);
  const [location, setLocation] = useState(receiver.location);
  const [provides, setProvides] = useState(receiver.provides);

  const handleSaveInitiator = (e: React.FormEvent) => {
    e.preventDefault();
    updateInitiator({
      name: initiatorName,
      agentName,
      spendingLimitMon: spendingLimit,
      autoExecution: autoExec,
      humanFallback,
    });
    setSaveMessage('Initiator policy parameters saved to local demo session.');
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const handleSaveReceiver = (e: React.FormEvent) => {
    e.preventDefault();
    updateReceiver({
      name: receiverName,
      location,
      provides,
    });
    setSaveMessage('Receiver profile saved to local demo session.');
    setTimeout(() => setSaveMessage(null), 3000);
  };

  return (
    <div className="min-h-screen bg-[#07080d] text-gray-100 py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-6">
          <div>
            <div className="text-xs font-mono text-purple-400 font-bold uppercase tracking-wider mb-1">
              NETWORK IDENTITY &amp; POLICY CONTROLS
            </div>
            <h1 className="text-3xl font-extrabold text-white">Participant Profile &amp; Role Switcher</h1>
            <p className="text-sm text-gray-400 mt-1 font-mono">
              VeriqoMesh supports dual-sided commerce between Initiators (Buyers/Agents) and Receivers (Sellers/Nodes).
            </p>
          </div>

          {/* Quick Role Switcher Pill */}
          <div className="flex items-center gap-2 bg-gray-900/90 p-1.5 rounded-xl border border-gray-700 font-mono text-xs">
            <span className="text-gray-400 text-[11px] px-2">Active View:</span>
            <button
              onClick={() => switchRole('INITIATOR')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                role === 'INITIATOR'
                  ? 'bg-purple-700 text-white shadow-md shadow-purple-950 border border-purple-500'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${role === 'INITIATOR' ? 'bg-emerald-300' : 'bg-gray-600'}`} />
              <span>INITIATOR</span>
            </button>
            <button
              onClick={() => switchRole('RECEIVER')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                role === 'RECEIVER'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-950 border border-blue-400'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${role === 'RECEIVER' ? 'bg-emerald-300' : 'bg-gray-600'}`} />
              <span>RECEIVER</span>
            </button>
          </div>
        </div>

        {saveMessage && (
          <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-600/60 text-emerald-200 text-xs font-mono flex items-center gap-2">
            <span className="text-emerald-400 font-bold">✓</span>
            <span>{saveMessage}</span>
          </div>
        )}

        {/* Live Browser Wallet Integration Card */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-950/30 via-gray-900 to-indigo-950/30 border border-purple-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono text-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${wallet.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
              <span className="font-bold text-white uppercase">
                {wallet.isConnected ? 'Browser Wallet Connected' : 'Guided Demo Sandbox Mode'}
              </span>
              {wallet.isConnected && (
                <span className="px-2 py-0.2 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700">
                  {wallet.isMonadTestnet ? 'Monad Testnet (10143)' : 'Wrong Network'}
                </span>
              )}
            </div>
            {wallet.isConnected ? (
              <div className="text-gray-300 text-[11px] flex flex-wrap items-center gap-2">
                <span>Address: <code className="text-purple-300">{wallet.address}</code></span>
                <span>•</span>
                <span>Balance: <strong className="text-emerald-400">{wallet.balanceMon ? `${wallet.balanceMon} MON` : '0.0 MON'}</strong></span>
              </div>
            ) : (
              <p className="text-gray-400 text-[11px] font-sans">
                Operating with verified demo participant profiles. Connect your MetaMask wallet to execute real transactions on Monad Testnet.
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!wallet.isConnected ? (
              <button
                onClick={() => wallet.connect()}
                disabled={wallet.isConnecting}
                className="py-2 px-4 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-bold transition shadow-md shadow-purple-950 flex items-center gap-1.5"
              >
                <span>Connect MetaMask</span>
                <span>→</span>
              </button>
            ) : (
              <>
                <button
                  onClick={() => bindConnectedWalletToRole()}
                  className="py-2 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold transition shadow-md text-[11px]"
                  title="Assign connected wallet address to the active role profile"
                >
                  Use Connected Wallet as {role === 'INITIATOR' ? 'Initiator' : 'Receiver'}
                </button>
                <button
                  onClick={() => wallet.disconnect()}
                  className="py-2 px-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 transition text-[11px]"
                >
                  Disconnect
                </button>
              </>
            )}
            <button
              onClick={() => resetToGuidedDefaults()}
              className="py-2 px-3 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-400 hover:text-white transition text-[11px]"
              title="Reset all customized session fields back to canonical demo state"
            >
              Reset to Guided Defaults
            </button>
          </div>
        </div>

        {/* Role Comparison Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Initiator Summary Box */}
          <div
            className={`p-6 rounded-2xl border transition-all ${
              role === 'INITIATOR'
                ? 'bg-[#141226] border-purple-600 shadow-xl shadow-purple-950/30'
                : 'bg-gray-900/40 border-gray-800 opacity-75'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="px-2.5 py-1 rounded bg-purple-900/70 text-purple-300 font-mono text-xs font-bold border border-purple-700">
                ROLE: TRANSACTION INITIATOR
              </span>
              {role === 'INITIATOR' && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-900 text-emerald-300 text-[10px] font-mono font-bold">
                  CURRENT ACTIVE
                </span>
              )}
            </div>

            <h3 className="text-xl font-bold text-white mb-1">{initiator.name}</h3>
            <p className="text-xs text-gray-400 mb-4 font-mono">Principal / Buyer Node • Autonomous AI Agent Delegation</p>

            <div className="space-y-2 text-xs font-mono bg-gray-950/60 p-3.5 rounded-xl border border-gray-800 mb-4">
              <div className="flex justify-between">
                <span className="text-gray-400">Connected Wallet:</span>
                <span className="text-gray-200 font-semibold">{initiator.wallet.slice(0, 8)}...{initiator.wallet.slice(-6)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Authorized Agent:</span>
                <span className="text-purple-300 font-semibold">{initiator.agentName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Spending Cap:</span>
                <span className="text-emerald-300 font-semibold">{initiator.spendingLimitMon} MON / transaction</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Authorized Settlement:</span>
                <span className="text-emerald-400">{initiator.autoExecution ? 'Enabled (Verification PASS)' : 'Disabled'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Contest Safeguard:</span>
                <span className="text-amber-400">{initiator.humanFallback ? '3-Judge Deterministic Median' : 'Manual'}</span>
              </div>
            </div>

            {role !== 'INITIATOR' ? (
              <button
                onClick={() => switchRole('INITIATOR')}
                className="w-full py-2 px-3 rounded-lg bg-purple-900 hover:bg-purple-800 text-purple-200 text-xs font-mono font-bold transition"
              >
                Switch to Initiator Perspective
              </button>
            ) : (
              <Link
                href="/initiator"
                className="block text-center w-full py-2 px-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-mono font-bold transition"
              >
                Open Initiator Dashboard →
              </Link>
            )}
          </div>

          {/* Receiver Summary Box */}
          <div
            className={`p-6 rounded-2xl border transition-all ${
              role === 'RECEIVER'
                ? 'bg-[#0d162a] border-blue-600 shadow-xl shadow-blue-950/30'
                : 'bg-gray-900/40 border-gray-800 opacity-75'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="px-2.5 py-1 rounded bg-blue-900/70 text-blue-300 font-mono text-xs font-bold border border-blue-700">
                ROLE: TRANSACTION RECEIVER
              </span>
              {role === 'RECEIVER' && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-900 text-emerald-300 text-[10px] font-mono font-bold">
                  CURRENT ACTIVE
                </span>
              )}
            </div>

            <h3 className="text-xl font-bold text-white mb-1">{receiver.name}</h3>
            <p className="text-xs text-gray-400 mb-4 font-mono">Fulfillment Node / Seller • Verified Tier-1 Supplier</p>

            <div className="space-y-2 text-xs font-mono bg-gray-950/60 p-3.5 rounded-xl border border-gray-800 mb-4">
              <div className="flex justify-between">
                <span className="text-gray-400">Connected Wallet:</span>
                <span className="text-gray-200 font-semibold">{receiver.wallet.slice(0, 8)}...{receiver.wallet.slice(-6)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Depot Location:</span>
                <span className="text-blue-300 font-semibold">{receiver.location}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Historical Agreements:</span>
                <span className="text-emerald-300 font-semibold">{receiver.stats.completed} Completed (98% Attestation)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Trust Receipts:</span>
                <span className="text-indigo-300 font-semibold">{receiver.stats.trustReceipts} Onchain Receipts</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Adjudication History:</span>
                <span className="text-amber-300 font-semibold">2 Resolved (1 Canonical Live Record)</span>
              </div>
            </div>

            {role !== 'RECEIVER' ? (
              <button
                onClick={() => switchRole('RECEIVER')}
                className="w-full py-2 px-3 rounded-lg bg-blue-900 hover:bg-blue-800 text-blue-200 text-xs font-mono font-bold transition"
              >
                Switch to Receiver Perspective
              </button>
            ) : (
              <Link
                href="/receiver"
                className="block text-center w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-bold transition"
              >
                Open Receiver Dashboard →
              </Link>
            )}
          </div>
        </div>

        {/* Detailed Configuration Panel for Active Role */}
        <div className="p-6 rounded-2xl bg-gray-900/60 border border-gray-800 shadow-md">
          <div className="flex items-center justify-between border-b border-gray-800 pb-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-white">
                {role === 'INITIATOR' ? 'Initiator Policy & Delegation Parameters' : 'Receiver Profile & Fulfillment Settings'}
              </h2>
              <p className="text-xs text-gray-400 font-mono mt-1">
                {role === 'INITIATOR'
                  ? 'Define the programmatic spending boundaries and settlement rules for your AI agents.'
                  : 'Configure node capabilities, operational depot location, and attestation readiness.'}
              </p>
            </div>
            <span className="text-xs font-mono px-2.5 py-1 rounded bg-gray-800 text-gray-300">
              Session Memory Active
            </span>
          </div>

          {role === 'INITIATOR' ? (
            <form onSubmit={handleSaveInitiator} className="space-y-5 text-sm font-mono">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Organization / Entity Name</label>
                  <input
                    type="text"
                    value={initiatorName}
                    onChange={(e) => setInitiatorName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-gray-950 border border-gray-700 text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Authorized AI Agent Label</label>
                  <input
                    type="text"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-gray-950 border border-gray-700 text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Max Spending Cap Per Transaction (MON)</label>
                  <input
                    type="text"
                    value={spendingLimit}
                    onChange={(e) => setSpendingLimit(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-gray-950 border border-gray-700 text-white focus:border-purple-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-gray-500 mt-1 block">
                    Transactions above this limit require direct human co-signature.
                  </span>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Required Verification Node</label>
                  <input
                    type="text"
                    disabled
                    value={INDEPENDENT_VERIFIER_ADDRESS ? `${INDEPENDENT_VERIFIER_ADDRESS} (Default Verifier Node)` : 'Operator-Designated Independent Verifier Node'}
                    className="w-full px-3 py-2 rounded-lg bg-gray-950 border border-gray-800 text-gray-400 cursor-not-allowed"
                  />
                  <span className="text-[10px] text-gray-500 mt-1 block">
                    Mandatory accredited physical inspection prior to release authorization.
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-900/60 space-y-3">
                <div className="text-xs text-purple-300 font-bold">Policy Safeguards &amp; Autonomous Delegations</div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoExec}
                    onChange={(e) => setAutoExec(e.target.checked)}
                    className="rounded bg-gray-950 border-gray-700 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-xs text-gray-300 font-sans">
                    <strong>Autonomous Agent Execution:</strong> Authorize AI Agent to autonomously invoke settlement when verification outcome is attested <code className="text-emerald-400">PASS</code>.
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={humanFallback}
                    onChange={(e) => setHumanFallback(e.target.checked)}
                    className="rounded bg-gray-950 border-gray-700 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-xs text-gray-300 font-sans">
                    <strong>Human Adjudication Fallback:</strong> Automatically lock escrow and route to 3-judge human panel if verification is <code className="text-amber-400">INCONCLUSIVE</code> or contested.
                  </span>
                </label>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="py-2.5 px-6 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-bold transition text-xs font-mono shadow-md shadow-purple-950"
                >
                  Save Policy Configuration
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSaveReceiver} className="space-y-5 text-sm font-mono">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Organization / Supplier Name</label>
                  <input
                    type="text"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-gray-950 border border-gray-700 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Depot / Fulfillment Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-gray-950 border border-gray-700 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Commercial Capabilities &amp; Deliverables</label>
                <textarea
                  rows={3}
                  value={provides}
                  onChange={(e) => setProvides(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-gray-950 border border-gray-700 text-white focus:border-blue-500 focus:outline-none text-xs font-mono"
                />
              </div>

              <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-900/60 space-y-2 text-xs font-mono">
                <div className="text-blue-300 font-bold">Node Trust Verification</div>
                <div className="text-gray-300 font-sans">
                  Dallas Solar Supply Co. holds an onchain Tier-1 reputation badge with 28 completed commercial escrow agreements and verified Monad testnet dispute resolution history.
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="py-2.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition text-xs font-mono shadow-md shadow-blue-950"
                >
                  Save Receiver Profile
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
