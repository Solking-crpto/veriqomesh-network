'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { FileCheck2, ArrowRight, Shield, ExternalLink, Plus, Copy, Lock } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { StatusChip } from '../../components/ui/StatusChip';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  VERIFIED_BENCHMARK_EVIDENCE,
  getExplorerTxUrl,
  getExplorerAddressUrl,
  getExplorerBlockUrl,
} from '../../lib/benchmark-data';

export default function EvidenceExplorerPage() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const records = VERIFIED_BENCHMARK_EVIDENCE;

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="accent">AUDIT TRAIL</Badge>
            <span className="text-xs text-text-tertiary">Keccak-256 Onchain Anchors</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
            Evidence Explorer
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Inspect immutable deliverable content hashes, anchoring transactions, and verifier audit trails on Monad Testnet.
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
          VeriqoMesh anchors commercial deliverables on Monad Testnet using immutable 32-byte Keccak-256 deliverable content hashes. Before escrow release or dispute resolution, designated verifiers audit the anchored evidence onchain.
        </p>
      </Card>

      {/* Benchmark Evidence Disclosure */}
      <div className="p-3.5 rounded-card bg-purple-950/20 border border-purple-800/40 text-xs font-sans text-text-secondary">
        <span className="font-semibold text-text-primary mr-1">Public Benchmark Anchors:</span>
        These deliverable records are confirmed on Monad Testnet for Flow A and Flow B. Onchain smart contracts store the 32-byte hash commitment; offchain payload files are only accepted if their Keccak-256 hash matches the anchored value.
      </div>

      {/* Evidence Records List */}
      {records.length === 0 ? (
        <EmptyState
          icon={<FileCheck2 className="w-6 h-6 text-accent" />}
          title="No Live Evidence Records Anchored Yet"
          description="Evidence records (deliverable documentation, inspection reports, and cryptographic manifests) are created when counterparties anchor deliverables for active escrow transactions on Monad."
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
      ) : (
        <div className="space-y-4">
          {records.map((rec, idx) => (
            <Card key={rec.transactionId} variant="default" className="space-y-4 p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <Badge variant="accent">
                    <FileCheck2 className="w-3 h-3 mr-1 inline" />
                    Anchored Deliverable
                  </Badge>
                  <span className="font-bold text-text-primary text-base">
                    {rec.flowName}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <StatusChip status="success" label="Anchored Onchain" />
                  <a
                    href={getExplorerBlockUrl(rec.blockNumber)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-mono text-text-tertiary hover:underline"
                  >
                    Block #{rec.blockNumber.toLocaleString()}
                  </a>
                </div>
              </div>

              {/* Hashes & Metadata */}
              <div className="space-y-2 font-mono text-xs">
                <div className="p-3 rounded bg-surface/60 border border-border/60 space-y-1">
                  <span className="text-[10px] text-text-tertiary uppercase block">
                    32-Byte Keccak-256 Deliverable Content Hash
                  </span>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-cyan-400 break-all text-xs font-semibold">
                      {rec.contentHash}
                    </span>
                    <button
                      onClick={() => copyToClipboard(rec.contentHash, `chash-${idx}`)}
                      className="p-1 text-text-tertiary hover:text-text-primary shrink-0"
                      title="Copy full content hash"
                    >
                      {copiedId === `chash-${idx}` ? '✓' : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-2.5 rounded bg-surface/40 border border-border/40 space-y-1">
                    <span className="text-[10px] text-text-tertiary uppercase block">Anchored By</span>
                    <div className="flex items-center justify-between">
                      <a
                        href={getExplorerAddressUrl(rec.submitter)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:underline text-[11px]"
                      >
                        {rec.submitter.slice(0, 8)}...{rec.submitter.slice(-6)}
                      </a>
                      <span className="text-[10px] text-text-tertiary">{rec.submitterLabel}</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded bg-surface/40 border border-border/40 space-y-1">
                    <span className="text-[10px] text-text-tertiary uppercase block">Anchoring Transaction</span>
                    <div className="flex items-center justify-between">
                      <a
                        href={getExplorerTxUrl(rec.txHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:underline text-[11px]"
                      >
                        {rec.txHash.slice(0, 10)}...{rec.txHash.slice(-6)} ↗
                      </a>
                      <button
                        onClick={() => copyToClipboard(rec.txHash, `tx-${idx}`)}
                        className="text-[10px] text-text-tertiary hover:text-text-primary"
                      >
                        {copiedId === `tx-${idx}` ? '✓' : 'copy'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40 text-[11px] font-mono text-text-tertiary">
                <span>Transaction ID: {rec.transactionId.slice(0, 10)}...{rec.transactionId.slice(-6)}</span>
                <span>{rec.timestamp}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Protocol Specs Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-border">
        <Card padding="sm" className="space-y-1.5">
          <span className="text-[11px] font-semibold text-text-tertiary uppercase">Cryptographic Hashes</span>
          <div className="text-sm font-bold text-text-primary">Deliverable Digests</div>
          <p className="text-xs text-text-secondary leading-relaxed">
            Cryptographic digests reference deliverable commitments recorded immutably onchain.
          </p>
        </Card>

        <Card padding="sm" className="space-y-1.5">
          <span className="text-[11px] font-semibold text-text-tertiary uppercase">Onchain Attestation</span>
          <div className="text-sm font-bold text-text-primary">Keccak256 Anchors</div>
          <p className="text-xs text-text-secondary leading-relaxed">
            Deliverable hashes are immutably anchored in TrustMeshEscrow prior to designated verifier inspection.
          </p>
        </Card>

        <Card padding="sm" className="space-y-1.5">
          <span className="text-[11px] font-semibold text-text-tertiary uppercase">Verifier Dispatch</span>
          <div className="text-sm font-bold text-status-success">PASS / INCONCLUSIVE</div>
          <p className="text-xs text-text-secondary leading-relaxed">
            Designated verifiers issue onchain verdicts that directly unlock settlement or dispute escalation.
          </p>
        </Card>
      </div>
    </div>
  );
}
