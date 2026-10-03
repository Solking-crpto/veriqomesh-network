'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Copy, ExternalLink } from 'lucide-react';
import {
  useDemoNetwork,
  DEPLOYED_REGISTRY_ADDRESS,
} from '../../context/DemoNetworkContext';
import {
  BENCHMARK_PARTICIPANTS,
  getExplorerAddressUrl,
} from '../../lib/benchmark-data';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';

export default function ReceiversDirectoryPage() {
  const router = useRouter();
  const { switchRole } = useDemoNetwork();
  const [customAddress, setCustomAddress] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleStartDealWithAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customAddress.trim()) return;
    switchRole('INITIATOR');
    router.push(`/initiator/intent?receiver=${customAddress.trim()}`);
  };

  return (
    <div className="py-6 sm:py-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="space-y-1 border-b border-border pb-5">
        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
          Find a receiver
        </h1>
        <p className="text-sm text-text-secondary">
          Choose a counterparty for your agreement.
        </p>
      </div>

      {/* Benchmark Banner */}
      <div className="p-3.5 rounded-control bg-surface border border-border text-xs text-text-secondary">
        Team-controlled testnet wallets used in the benchmark flows.
      </div>

      {/* Direct Engagement Input */}
      <Card className="p-4 sm:p-5 space-y-3">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-text-primary">
            Direct counterparty address
          </h2>
          <p className="text-xs text-text-secondary">
            Enter any Monad EVM address to initiate a commercial intent and deposit escrow.
          </p>
        </div>

        <form onSubmit={handleStartDealWithAddress} className="flex flex-col sm:flex-row gap-2.5">
          <Input
            value={customAddress}
            onChange={(e) => setCustomAddress(e.target.value)}
            placeholder="0x..."
            className="flex-1 font-mono text-xs sm:text-sm"
          />
          <Button
            type="submit"
            variant="primary"
            size="md"
            rightIcon={<ArrowRight className="w-4 h-4" />}
            className="shrink-0"
          >
            Create agreement
          </Button>
        </form>
      </Card>

      {/* Directory Section */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
          Team-controlled testnet wallets used in the benchmark flows.
        </h2>

        <div className="space-y-2">
          {BENCHMARK_PARTICIPANTS.map((participant, idx) => (
            <Card
              key={`${participant.role}-${participant.address}`}
              padding="sm"
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-text-primary">
                    {participant.role}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-elevated border border-border text-text-tertiary">
                    {participant.flow}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={getExplorerAddressUrl(participant.address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-accent hover:underline inline-flex items-center gap-1"
                    title={`View ${participant.address} on MonadVision`}
                  >
                    <span>{`${participant.address.slice(0, 6)}...${participant.address.slice(-4)}`}</span>
                    <ExternalLink className="w-3 h-3 text-text-tertiary" />
                  </a>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(participant.address, `part-${idx}`)}
                    className="p-1 text-text-tertiary hover:text-text-primary rounded transition inline-flex items-center gap-1 text-[11px]"
                    title="Copy full address"
                  >
                    {copiedId === `part-${idx}` ? (
                      <span className="text-emerald-400 font-mono text-[11px] font-medium">Copied</span>
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setCustomAddress(participant.address);
                    switchRole('INITIATOR');
                    router.push(`/initiator/intent?receiver=${participant.address}`);
                  }}
                  className="text-xs"
                >
                  Select as receiver
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Secondary: Network Details */}
      <section className="space-y-2 pt-6 border-t border-border">
        <h2 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">
          Network details
        </h2>
        <div className="p-3.5 rounded-control bg-surface border border-border text-xs text-text-secondary space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <span className="text-text-primary font-medium">Registry Contract</span>
            <code className="font-mono text-text-tertiary text-[11px] break-all sm:break-normal">
              {DEPLOYED_REGISTRY_ADDRESS.slice(0, 10)}...{DEPLOYED_REGISTRY_ADDRESS.slice(-8)}
            </code>
          </div>
          <p className="text-[11px] text-text-tertiary">
            The TrustReceiptRegistry records soulbound trust receipts on Monad.
          </p>
        </div>
      </section>
    </div>
  );
}
