'use client';

import React from 'react';
import Link from 'next/link';
import { Play, ArrowRight, Shield, ExternalLink, CheckCircle2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

export default function DemoVideoPage() {
  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="accent">HACKATHON WALKTHROUGH</Badge>
            <span className="text-xs text-text-tertiary">02:55 · 1080p HD</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
            Product Walkthrough &amp; Submission Video
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Complete end-to-end commercial workflow demonstration on Monad Testnet (Chain ID 10143).
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link href="/initiator/intent">
            <Button variant="primary" size="md" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Create Agreement
            </Button>
          </Link>
          <Link href="/transactions">
            <Button variant="secondary" size="md">
              Transactions
            </Button>
          </Link>
        </div>
      </div>

      {/* Video Container Card */}
      <div className="relative w-full aspect-video bg-black rounded-card border border-border overflow-hidden shadow-elevated">
        <video
          controls
          preload="metadata"
          className="w-full h-full object-contain"
          poster="/brand/veriqomesh-og.png"
        >
          <source src="/video/veriqomesh-hackathon-submission.mp4" type="video/mp4" />
          <source src="/veriqomesh-hackathon-submission.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>

      {/* Video Narrative Steps & Telemetry */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Core Narrative */}
        <Card className="space-y-4">
          <CardHeader
            title="Demonstrated Product Architecture"
            subtitle="The 11-step commercial lifecycle showcased in this walkthrough"
          />
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2 p-2.5 rounded-control bg-surface-elevated border border-border">
              <span className="text-accent font-semibold">01</span>
              <span className="text-text-primary">Connect Wallet &amp; Authenticate</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-control bg-surface-elevated border border-border">
              <span className="text-accent font-semibold">02</span>
              <span className="text-text-primary">Initiator Creates Deal Proposal</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-control bg-surface-elevated border border-border">
              <span className="text-accent font-semibold">03</span>
              <span className="text-text-primary">Receiver Reviews &amp; Ratifies Agreement</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-control bg-surface-elevated border border-border">
              <span className="text-accent font-semibold">04</span>
              <span className="text-text-primary">Monad Escrow Deposit &amp; Execution</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-control bg-surface-elevated border border-border">
              <span className="text-accent font-semibold">05</span>
              <span className="text-text-primary">Evidence Anchoring &amp; Verifier Attestation</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-control bg-surface-elevated border border-border">
              <span className="text-accent font-semibold">06</span>
              <span className="text-text-primary">Onchain Settlement &amp; Soulbound Trust Receipt</span>
            </div>
          </div>
        </Card>

        {/* Verifiable Onchain Artifacts */}
        <Card className="space-y-4">
          <CardHeader
            title="Verifiable Testnet Evidence"
            subtitle="Cryptographic facts executed during the benchmark run"
          />
          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-control bg-surface-elevated border border-border space-y-1">
              <span className="text-text-tertiary block text-[11px]">Settlement Tx Hash</span>
              <a
                href="https://testnet.monadvision.com/tx/0x691f7a80d65fe1deece2f45e8b6600ee4b2b0ffc14f3fe733d995566e2d83b52"
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-accent hover:underline flex items-center justify-between"
              >
                <span>0x691f7a80...83b52</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <span className="text-[11px] text-text-tertiary">Confirmed in block 66436615</span>
            </div>

            <div className="p-3 rounded-control bg-surface-elevated border border-border space-y-1">
              <span className="text-text-tertiary block text-[11px]">Escrow Vault Contract</span>
              <code className="font-mono text-text-primary block break-all">
                0x925ea880cA53DE0352b84B24d0C0dee5B258015A
              </code>
            </div>

            <div className="p-3 rounded-control bg-surface-elevated border border-border space-y-1">
              <span className="text-text-tertiary block text-[11px]">Trust Receipt Registry</span>
              <code className="font-mono text-text-primary block break-all">
                0xE1994e0dF7CD5A836be4b02AE2164A542418B819
              </code>
              <span className="text-[11px] text-text-tertiary">ERC-5192 Token #3 Minted</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
