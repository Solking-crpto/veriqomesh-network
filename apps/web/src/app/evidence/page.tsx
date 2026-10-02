'use client';

import React from 'react';
import Link from 'next/link';
import { FileCheck2, ArrowRight, Shield, ExternalLink, Plus } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';

export default function EvidenceExplorerPage() {
  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="accent">AUDIT TRAIL</Badge>
            <span className="text-xs text-text-tertiary">IPFS &amp; Keccak256</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
            Evidence Explorer
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Inspect content-addressed IPFS records, keccak256 hashes, and independent verifier attestations.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link href="/initiator/intent">
            <Button variant="primary" size="md" leftIcon={<Plus className="w-4 h-4" />}>
              Create Agreement
            </Button>
          </Link>
          <Link href="/transactions">
            <Button variant="secondary" size="md">
              Transaction Rooms
            </Button>
          </Link>
        </div>
      </div>

      {/* Technical Notice */}
      <Card className="space-y-2 bg-surface border-border">
        <div className="flex items-center gap-2 text-accent font-semibold text-xs">
          <Shield className="w-4 h-4" />
          <span>Onchain Evidence Commitment Standard</span>
        </div>
        <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
          VeriqoMesh anchors commercial deliverables on Monad Metropolis Testnet via dual cryptographic commitments: an immutable IPFS content URI (<code className="font-mono text-text-primary">ipfs://...</code>) and a 32-byte Keccak-256 deliverable content hash. Before funds release, designated verifiers must attest compliance directly onchain.
        </p>
      </Card>

      {/* Empty State */}
      <EmptyState
        icon={<FileCheck2 className="w-6 h-6 text-accent" />}
        title="No Live Evidence Records Anchored Yet"
        description="Evidence records (carrier Bills of Lading, depot inspection photos, and serial manifests) are created when counterparties anchor deliverables for active escrow transactions on Monad."
        action={
          <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
            <Link href="/initiator/intent">
              <Button variant="primary" size="md" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Create Commercial Intent
              </Button>
            </Link>
            <Link href="/transactions">
              <Button variant="secondary" size="md">
                Explore Transactions Directory
              </Button>
            </Link>
          </div>
        }
      />

      {/* Protocol Specs Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-border">
        <Card padding="sm" className="space-y-1.5">
          <span className="text-[11px] font-semibold text-text-tertiary uppercase">Content Addressing</span>
          <div className="text-sm font-bold text-text-primary">IPFS CIDs</div>
          <p className="text-xs text-text-secondary leading-relaxed">
            Storage pointers reference content-hash commitments immutable across carrier and depot handoffs.
          </p>
        </Card>

        <Card padding="sm" className="space-y-1.5">
          <span className="text-[11px] font-semibold text-text-tertiary uppercase">Onchain Attestation</span>
          <div className="text-sm font-bold text-text-primary">Keccak256 Anchors</div>
          <p className="text-xs text-text-secondary leading-relaxed">
            Deliverable hashes are immutably anchored in TrustMeshEscrow prior to independent inspection.
          </p>
        </Card>

        <Card padding="sm" className="space-y-1.5">
          <span className="text-[11px] font-semibold text-text-tertiary uppercase">Verifier Dispatch</span>
          <div className="text-sm font-bold text-status-success">PASS / INCONCLUSIVE</div>
          <p className="text-xs text-text-secondary leading-relaxed">
            Independent auditor nodes issue signed verdicts that directly unlock settlement or human mediation.
          </p>
        </Card>
      </div>
    </div>
  );
}
