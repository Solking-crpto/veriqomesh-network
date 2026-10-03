'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Users, Shield } from 'lucide-react';
import {
  useDemoNetwork,
  DEPLOYED_REGISTRY_ADDRESS,
} from '../../context/DemoNetworkContext';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';

export default function ReceiversDirectoryPage() {
  const router = useRouter();
  const { switchRole } = useDemoNetwork();
  const [customAddress, setCustomAddress] = useState('');

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

      {/* Demo Directory Notice */}
      <div className="p-3.5 rounded-control bg-surface border border-border text-xs text-text-secondary">
        Demo directory: sample counterparties for the testnet benchmark.
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
          Public counterparty directory
        </h2>

        <div className="p-6 rounded-control border border-dashed border-border bg-surface text-center space-y-3">
          <div className="w-10 h-10 mx-auto rounded-full bg-surface-elevated border border-border flex items-center justify-center text-text-tertiary">
            <Users className="w-5 h-5" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <p className="text-sm font-semibold text-text-primary">
              No registered public counterparties
            </p>
            <p className="text-xs text-text-secondary">
              Enter any valid Monad address in the direct field above to initiate an agreement, escrow deposit, and settlement.
            </p>
          </div>
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
