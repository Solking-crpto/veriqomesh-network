'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, ArrowRight, Plus, Shield, Users } from 'lucide-react';
import { useDemoNetwork, DEPLOYED_REGISTRY_ADDRESS } from '../../context/DemoNetworkContext';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';

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
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="accent">COUNTERPARTY REGISTRY</Badge>
            <span className="text-xs text-text-tertiary">Monad Testnet</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
            Discover Sellers &amp; Nodes
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Fulfillment suppliers, logistics providers, and independent verifiers on Monad Metropolis Testnet.
          </p>
        </div>

        <Link href="/initiator/intent">
          <Button variant="primary" size="md" leftIcon={<Plus className="w-4 h-4" />}>
            Create Direct Agreement
          </Button>
        </Link>
      </div>

      {/* Registry Status Notice */}
      <Card className="space-y-2 bg-surface border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-accent font-semibold text-xs">
            <Shield className="w-4 h-4" />
            <span>Monad Registry Contract Active</span>
          </div>
          <code className="font-mono text-xs text-text-tertiary">{DEPLOYED_REGISTRY_ADDRESS.slice(0, 10)}...{DEPLOYED_REGISTRY_ADDRESS.slice(-6)}</code>
        </div>
        <p className="text-xs text-text-secondary leading-relaxed">
          The TrustReceiptRegistry records participant capabilities, accredited verifier credentials, and soulbound trust receipts. You can initiate agreements directly with any counterparty address without requiring pre-registration.
        </p>
      </Card>

      {/* Direct Engagement Card */}
      <Card className="space-y-4">
        <CardHeader
          title="Direct Counterparty Engagement"
          subtitle="Enter any Monad Metropolis EVM address to initiate a commercial intent and deposit escrow"
        />

        <form onSubmit={handleStartDealWithAddress} className="flex flex-col sm:flex-row gap-3">
          <Input
            value={customAddress}
            onChange={(e) => setCustomAddress(e.target.value)}
            placeholder="Enter counterparty seller address (0x...)"
            className="flex-1"
          />
          <Button
            type="submit"
            variant="primary"
            size="md"
            rightIcon={<ArrowRight className="w-4 h-4" />}
            className="shrink-0"
          >
            Start Proposal
          </Button>
        </form>
      </Card>

      {/* Directory State */}
      <EmptyState
        icon={<Users className="w-6 h-6 text-text-tertiary" />}
        title="No Public Directory Listings Yet"
        description="Verified counterparties appear here as network participants register their capabilities on the TrustReceiptRegistry contract on Monad."
        action={
          <Link href="/initiator/intent">
            <Button variant="secondary" size="md">
              Create Direct Proposal
            </Button>
          </Link>
        }
      />
    </div>
  );
}
