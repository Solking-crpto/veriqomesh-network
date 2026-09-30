'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ReceiveLookupPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      setError('Please enter a valid invitation code.');
      return;
    }
    // Expected format: VM-XXXX-XXXX (or with -v2 suffix)
    if (!cleanCode.startsWith('VM-')) {
      setError('Invitation code must start with "VM-" (e.g. VM-A8B2-9C1D).');
      return;
    }
    setError(null);
    router.push(`/receive/${cleanCode}`);
  };

  return (
    <div className="min-h-screen bg-[#07080d] text-gray-100 py-16 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="text-xs font-mono text-purple-400 font-bold uppercase tracking-wider">
            COUNTERPARTY INVITATION PORTAL
          </div>
          <h1 className="text-3xl font-extrabold text-white">Receive &amp; Ratify Proposal</h1>
          <p className="text-xs sm:text-sm text-gray-400 font-mono">
            Enter your VeriqoMesh invitation code to review commercial terms, inspect evidence requirements, and sign bilateral agreements on Monad Metropolis Testnet.
          </p>
        </div>

        {/* Lookup Card */}
        <div className="p-6 rounded-2xl bg-gray-900/70 border border-gray-800 shadow-2xl space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-gray-300 font-bold uppercase tracking-wide mb-2">
                Invitation Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase());
                    setError(null);
                  }}
                  placeholder="e.g. VM-B7X9-K2M4"
                  className="w-full px-4 py-3 rounded-xl bg-gray-950 border border-gray-700 text-white font-mono text-base tracking-wider focus:border-purple-500 focus:outline-none uppercase placeholder:normal-case placeholder:text-gray-600"
                />
              </div>
              <span className="text-[11px] font-mono text-gray-500 mt-1.5 block">
                The initiator shared this 8-character human-readable alphanumeric code with you.
              </span>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-950/60 border border-red-500/60 text-xs font-mono text-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-600 hover:to-indigo-500 text-white font-mono text-xs font-bold transition shadow-lg shadow-purple-950/50 flex items-center justify-center gap-2"
            >
              <span>ACCESS COMMERCIAL PROPOSAL</span>
              <span>→</span>
            </button>
          </form>

          {/* Quick Info Box */}
          <div className="p-4 rounded-xl bg-black/40 border border-gray-800/80 space-y-2 text-xs font-mono">
            <div className="text-gray-300 font-bold uppercase text-[10px] tracking-wider text-purple-300">
              How VeriqoMesh Counterparty Ratification Works
            </div>
            <ul className="text-gray-400 text-[11px] space-y-1.5 list-disc list-inside">
              <li>
                <strong>Cross-device persistence:</strong> Invitations are stored offchain in Upstash Redis and resolved globally by invitation code.
              </li>
              <li>
                <strong>Authoritative Onchain Escrow:</strong> Acceptance invokes <code className="text-emerald-300">agreeTransaction()</code> on the Monad Metropolis Testnet contract.
              </li>
              <li>
                <strong>Role Isolation:</strong> Only the designated counterparty wallet address can sign the agreement onchain.
              </li>
            </ul>
          </div>
        </div>

        {/* Back Link */}
        <div className="text-center">
          <Link
            href="/requests"
            className="text-xs font-mono text-gray-400 hover:text-gray-200 transition underline underline-offset-4"
          >
            ← View All Requests in Receiver Inbox
          </Link>
        </div>
      </div>
    </div>
  );
}
