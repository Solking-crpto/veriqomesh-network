import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Play, ExternalLink, ShieldCheck, Mail } from 'lucide-react';

export function PublicSafetyNotice() {
  return (
    <footer className="mt-16 sm:mt-24 border-t border-border bg-[#0B0D12] text-xs text-text-secondary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-8">
        {/* Top Grid: Brand, Links, Disclosures */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Column */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="relative w-7 h-7 rounded-control overflow-hidden flex items-center justify-center shrink-0 bg-surface border border-border">
                <Image
                  src="/brand/veriqomesh-mark.png"
                  alt="VeriqoMesh Network"
                  width={24}
                  height={24}
                  className="w-full h-full object-contain p-0.5"
                />
              </div>
              <span className="font-bold text-text-primary text-sm tracking-tight">
                VeriqoMesh Network
              </span>
            </div>
            <p className="text-xs text-text-tertiary leading-relaxed">
              Programmable trust layer and cryptographic escrow protocol for commerce between humans and AI agents.
            </p>
            <div className="pt-1">
              <Link
                href="/demo-video"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-control bg-accent/10 border border-accent/25 text-[#9D85FF] font-medium hover:bg-accent/20 transition text-xs"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Watch Product Walkthrough</span>
              </Link>
            </div>
          </div>

          {/* Protocol Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
              Protocol
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/initiator/intent" className="hover:text-text-primary transition">
                  Create Agreement
                </Link>
              </li>
              <li>
                <Link href="/requests" className="hover:text-text-primary transition">
                  Requests Inbox
                </Link>
              </li>
              <li>
                <Link href="/transactions" className="hover:text-text-primary transition">
                  Transactions Directory
                </Link>
              </li>
              <li>
                <Link href="/transactions?tab=demo" className="hover:text-text-primary transition">
                  Public Benchmark Flow A &amp; B
                </Link>
              </li>
              <li>
                <Link href="/trust" className="hover:text-text-primary transition">
                  Trust Receipts &amp; Provenance
                </Link>
              </li>
            </ul>
          </div>

          {/* Testnet Disclosures */}
          <div className="space-y-3 md:col-span-2">
            <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
              Testnet Disclosures &amp; Safety
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] leading-relaxed text-text-tertiary">
              <div className="p-3 rounded-card bg-surface/60 border border-border space-y-1">
                <span className="font-medium text-text-secondary block">
                  Testnet Assets Only
                </span>
                <p>
                  Operates on Monad Metropolis Testnet (Chain ID 10143). Tokens and deposits carry zero real-world financial value.
                </p>
              </div>
              <div className="p-3 rounded-card bg-surface/60 border border-border space-y-1">
                <span className="font-medium text-text-secondary block">
                  Immutable Commitments
                </span>
                <p>
                  Onchain commitments and evidence hashes are irreversible once verified and settled via smart contracts.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Smart Contracts Row */}
        <div className="pt-6 border-t border-border/60 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-4 text-text-tertiary font-mono text-[11px]">
            <span>Monad Metropolis Testnet (10143)</span>
            <span>•</span>
            <span>Escrow: <code className="text-text-secondary">0x925ea8...015A</code></span>
            <span>•</span>
            <span>Registry: <code className="text-text-secondary">0xE1994e...B819</code></span>
            <span>•</span>
            <span>Resolver: <code className="text-text-secondary">0x12f9e5...c35E</code></span>
          </div>

          {/* Official Contact & Socials */}
          <div className="flex items-center gap-4 text-xs font-medium">
            <a
              href="mailto:veriqomeshnetwork@gmail.com"
              className="text-text-secondary hover:text-text-primary transition inline-flex items-center gap-1.5"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>veriqomeshnetwork@gmail.com</span>
            </a>
            <span className="text-border">•</span>
            <a
              href="https://x.com/veriqomesh_ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-secondary hover:text-text-primary transition inline-flex items-center gap-1"
            >
              <span>@veriqomesh_ai</span>
              <ExternalLink className="w-3 h-3 text-text-tertiary" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
