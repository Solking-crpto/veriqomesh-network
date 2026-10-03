'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Shield, ArrowRight, ExternalLink, Lock, CheckCircle2, Copy } from 'lucide-react';
import TrustActivity from '@/components/TrustActivity';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { StatusChip } from '../../components/ui/StatusChip';
import {
  VERIFIED_BENCHMARK_RECEIPTS,
  getExplorerTxUrl,
  getExplorerAddressUrl,
  getExplorerBlockUrl,
  getExplorerSearchUrl,
  DEPLOYED_REGISTRY_ADDRESS,
} from '@/lib/benchmark-data';

export default function TrustReceiptsPage() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

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
            Trust Receipts &amp; Provenance
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Cryptographic receipts binding commercial intent, attested evidence roots, and immutable onchain settlement.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link href="/initiator/intent">
            <Button variant="secondary" size="md">
              Create Agreement
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
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-xl font-bold text-text-primary">
                Soulbound Trust Receipts
              </h2>
              <p className="text-xs text-text-secondary mt-0.5">
                Non-transferable ERC-5192 Soulbound receipts issued by{' '}
                <a
                  href={getExplorerAddressUrl(DEPLOYED_REGISTRY_ADDRESS)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-text-primary underline hover:text-accent"
                  title={DEPLOYED_REGISTRY_ADDRESS}
                >
                  0xE1994e...B819 ↗
                </a>
                <button
                  onClick={() => copyToClipboard(DEPLOYED_REGISTRY_ADDRESS, 'registry-vault')}
                  className="inline-flex ml-1.5 text-text-tertiary hover:text-text-primary"
                  title="Copy registry address"
                >
                  {copiedId === 'registry-vault' ? '✓' : <Copy className="w-3 h-3 inline" />}
                </button>{' '}
                on Monad Testnet.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-surface border border-border text-text-secondary">
              Total Minted: 3 Tokens
            </span>
          </div>
        </div>

        {/* Public Benchmark Receipts Disclosure */}
        <div className="p-3.5 rounded-card bg-purple-950/20 border border-purple-800/40 text-xs font-sans text-text-secondary space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-text-primary">
            <span>Public Benchmark Receipts</span>
          </div>
          <p>
            Trust receipts are minted automatically when a transaction reaches verified settlement or authorized dispute resolution.
          </p>
          <p>
            Complete an escrow agreement on Monad Testnet to generate an immutable soulbound trust attestation.
          </p>
        </div>

        <div className="space-y-4">
          {VERIFIED_BENCHMARK_RECEIPTS.map((rcpt) => (
            <Card key={rcpt.receiptId} variant="default" className="space-y-4 p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <Badge variant="accent">
                    <Lock className="w-3 h-3 mr-1 inline" />
                    ERC-5192 Locked
                  </Badge>
                  <span className="font-bold text-text-primary text-base">
                    Receipt #{rcpt.receiptId}
                  </span>
                  <span className="text-xs text-text-tertiary">
                    • {rcpt.flowName}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <StatusChip status="success" label="Settled Onchain" />
                  <span className="text-[11px] font-mono text-text-tertiary">
                    Block #{rcpt.issuedBlock.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="space-y-1">
                  <span className="text-text-tertiary block">Settled Amount &amp; Vault</span>
                  <span className="font-bold text-text-primary block">{rcpt.settledAmount}</span>
                  <span className="text-[11px] text-text-tertiary">Token: Native MON</span>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <span className="text-text-tertiary block">Verification &amp; Settlement Outcome</span>
                  <span className="font-medium text-text-primary block">{rcpt.outcomeText}</span>
                  <span className="text-[11px] text-status-success font-mono">State: SETTLED ({rcpt.outcomeCode})</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-border/60 text-xs font-mono">
                <div className="flex items-center justify-between p-2 rounded bg-surface/50 border border-border/40">
                  <span className="text-text-tertiary text-[11px]">Party A (Buyer):</span>
                  <div className="flex items-center gap-1.5">
                    <a
                      href={getExplorerAddressUrl(rcpt.partyA)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:underline text-[11px]"
                    >
                      {rcpt.partyA.slice(0, 6)}...{rcpt.partyA.slice(-4)}
                    </a>
                    <button
                      onClick={() => copyToClipboard(rcpt.partyA, `partyA-${rcpt.receiptId}`)}
                      className="text-text-tertiary hover:text-text-primary"
                    >
                      {copiedId === `partyA-${rcpt.receiptId}` ? '✓' : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2 rounded bg-surface/50 border border-border/40">
                  <span className="text-text-tertiary text-[11px]">Party B (Seller):</span>
                  <div className="flex items-center gap-1.5">
                    <a
                      href={getExplorerAddressUrl(rcpt.partyB)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:underline text-[11px]"
                    >
                      {rcpt.partyB.slice(0, 6)}...{rcpt.partyB.slice(-4)}
                    </a>
                    <button
                      onClick={() => copyToClipboard(rcpt.partyB, `partyB-${rcpt.receiptId}`)}
                      className="text-text-tertiary hover:text-text-primary"
                    >
                      {copiedId === `partyB-${rcpt.receiptId}` ? '✓' : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs">
                <div className="flex items-center gap-2 text-text-tertiary font-mono text-[11px]">
                  <span>
                    TxId:{' '}
                    <a
                      href={getExplorerSearchUrl(rcpt.transactionId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-text-secondary hover:text-accent underline"
                      title={rcpt.transactionId}
                    >
                      {rcpt.transactionId.slice(0, 10)}...{rcpt.transactionId.slice(-6)} ↗
                    </a>
                  </span>
                  <button
                    onClick={() => copyToClipboard(rcpt.transactionId, `txid-${rcpt.receiptId}`)}
                    className="hover:text-text-primary"
                    title="Copy full transaction ID"
                  >
                    {copiedId === `txid-${rcpt.receiptId}` ? '✓' : <Copy className="w-3 h-3" />}
                  </button>
                </div>

                <a
                  href={getExplorerTxUrl(rcpt.txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline inline-flex items-center gap-1 font-mono text-[11px]"
                >
                  <span>Mint Tx: {rcpt.txHash.slice(0, 8)}... ↗</span>
                </a>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
