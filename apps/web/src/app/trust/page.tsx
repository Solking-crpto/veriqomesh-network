'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, ArrowRight, ExternalLink, Play, Lock, CheckCircle2 } from 'lucide-react';
import TrustActivity from '@/components/TrustActivity';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { StatusChip } from '../../components/ui/StatusChip';

export default function TrustReceiptsPage() {
  const receipts: any[] = [];

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="accent">PROVENANCE LAYER</Badge>
            <span className="text-xs text-text-tertiary">ERC-5192 Soulbound</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
            Trust Receipts &amp; Provenance Vault
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Cryptographic receipts binding commercial intent, attested evidence roots, and immutable onchain settlement.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link href="/demo-video">
            <Button variant="secondary" size="md" leftIcon={<Play className="w-4 h-4 fill-current" />}>
              Walkthrough Video
            </Button>
          </Link>
          <Link href="/transactions">
            <Button variant="primary" size="md" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Transactions
            </Button>
          </Link>
        </div>
      </div>

      {/* Concept Card */}
      <Card className="space-y-2 bg-surface border-border">
        <div className="flex items-center gap-2 text-accent font-semibold text-xs">
          <Shield className="w-4 h-4" />
          <span>What is a VeriqoMesh Trust Receipt?</span>
        </div>
        <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
          A Trust Receipt is generated automatically upon final onchain settlement. It establishes non-repudiable auditability for both verified deliveries and human dispute adjudication without exposing confidential commercial terms or sensitive data.
        </p>
      </Card>

      {/* Onchain Provenance & Trust Activity */}
      <TrustActivity />

      {/* Soulbound Receipts Section */}
      <div className="space-y-4 pt-4 border-t border-border">
        <div>
          <h2 className="text-xl font-bold text-text-primary">
            Soulbound Trust Receipts
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Non-transferable ERC-5192 Soulbound receipts issued by <code className="font-mono text-text-primary">0xE1994e...B819</code> on Monad Metropolis Testnet.
          </p>
        </div>

        {receipts.length === 0 ? (
          <EmptyState
            icon={<Shield className="w-6 h-6 text-accent" />}
            title="No Soulbound Receipts Minted in Current Session"
            description="Trust receipts are non-transferable ERC-5192 tokens issued automatically upon verified escrow settlement or dispute resolution on Monad Metropolis Testnet."
            action={
              <Link href="/initiator/intent">
                <Button variant="primary" size="md" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Create Agreement to Earn Trust Receipts
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="space-y-4">
            {receipts.map((rcpt) => (
              <Card key={rcpt.id} variant="default" className="space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="accent">{rcpt.tag}</Badge>
                    <span className="font-bold text-text-primary">Receipt #{rcpt.id}</span>
                  </div>
                  <StatusChip status="success" label="Settled Onchain" />
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-text-tertiary block">Settled Amount</span>
                    <span className="font-bold text-text-primary">{rcpt.settledAmount}</span>
                  </div>
                  <div>
                    <span className="text-text-tertiary block">Buyer Refund</span>
                    <span className="font-bold text-status-warning">{rcpt.buyerRefundAmount}</span>
                  </div>
                  <div>
                    <span className="text-text-tertiary block">Seller Release</span>
                    <span className="font-bold text-status-success">{rcpt.sellerReleaseAmount}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
