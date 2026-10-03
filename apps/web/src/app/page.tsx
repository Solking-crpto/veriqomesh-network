'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Shield,
  FileText,
  Inbox,
  Users,
  CheckCircle2,
  ExternalLink,
  Lock,
  Scale,
  Sparkles,
} from 'lucide-react';
import { useDemoNetwork } from '../context/DemoNetworkContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { StatusChip } from '../components/ui/StatusChip';

export default function LandingPage() {
  const router = useRouter();
  const { switchRole, wallet } = useDemoNetwork();

  const handleEnterInitiator = () => {
    switchRole('INITIATOR');
    router.push('/initiator/intent');
  };

  const handleEnterReceiver = () => {
    switchRole('RECEIVER');
    router.push('/requests');
  };

  return (
    <div className="flex flex-col">
      {/* Mobile-First Restrained Hero Section */}
      <section className="relative px-4 sm:px-6 lg:px-8 pt-6 pb-10 sm:pt-14 sm:pb-16 border-b border-border">
        <div className="max-w-3xl mx-auto text-center space-y-4 sm:space-y-6">
          {/* Network Status */}
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-elevated border border-border text-text-secondary text-[11px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-status-success shrink-0" />
              <span>Monad Testnet · 10143</span>
            </div>
          </div>

          {/* Headline & Subtitle */}
          <div className="space-y-2 sm:space-y-3">
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-text-primary leading-[1.15]">
              Trusted Commerce for Humans &amp; AI
            </h1>
            <p className="text-sm sm:text-base lg:text-lg text-text-secondary max-w-xl mx-auto leading-relaxed">
              Define the deal. Protect the transaction. Verify the outcome with cryptographic proof on Monad.
            </p>
          </div>

          {/* Primary & Secondary Actions */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-3 max-w-md mx-auto">
            <Button
              variant="primary"
              size="md"
              fullWidth
              className="whitespace-nowrap sm:w-auto px-6 py-2.5"
              onClick={handleEnterInitiator}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Create an agreement
            </Button>
            <Link href="/trust" className="w-full sm:w-auto">
              <Button
                variant="secondary"
                size="md"
                fullWidth
                className="whitespace-nowrap px-5 py-2.5"
                leftIcon={<Shield className="w-3.5 h-3.5 text-accent" />}
              >
                Explore Trust Layer
              </Button>
            </Link>
          </div>

          {/* 4-Step Trust Model */}
          <div className="pt-6 sm:pt-10">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 text-left">
              <div className="p-3 sm:p-4 rounded-card bg-surface border border-border space-y-1">
                <div className="flex items-center gap-1.5 text-accent font-semibold text-xs">
                  <span>01</span>
                  <span className="text-text-primary font-medium">AI assists</span>
                </div>
                <p className="text-[11px] sm:text-xs text-text-secondary leading-relaxed">
                  Translates natural commercial intent into structured canonical terms.
                </p>
              </div>

              <div className="p-3 sm:p-4 rounded-card bg-surface border border-border space-y-1">
                <div className="flex items-center gap-1.5 text-accent font-semibold text-xs">
                  <span>02</span>
                  <span className="text-text-primary font-medium">Humans authorize</span>
                </div>
                <p className="text-[11px] sm:text-xs text-text-secondary leading-relaxed">
                  Counterparties ratify immutable agreement terms with cryptographic signatures.
                </p>
              </div>

              <div className="p-3 sm:p-4 rounded-card bg-surface border border-border space-y-1">
                <div className="flex items-center gap-1.5 text-accent font-semibold text-xs">
                  <span>03</span>
                  <span className="text-text-primary font-medium">Verifiers verify</span>
                </div>
                <p className="text-[11px] sm:text-xs text-text-secondary leading-relaxed">
                  Independent auditors attest bills of lading, serials, and inspection proofs.
                </p>
              </div>

              <div className="p-3 sm:p-4 rounded-card bg-surface border border-border space-y-1">
                <div className="flex items-center gap-1.5 text-accent font-semibold text-xs">
                  <span>04</span>
                  <span className="text-text-primary font-medium">Blockchain enforces</span>
                </div>
                <p className="text-[11px] sm:text-xs text-text-secondary leading-relaxed">
                  Monad smart contracts hold deposits and execute settlement or 3-judge mediation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dual Workspaces Section */}
      <section className="px-4 sm:px-6 lg:px-8 py-10 sm:py-14 max-w-5xl mx-auto w-full space-y-6">
        <div className="space-y-1">
          <h2 className="text-lg sm:text-xl font-bold text-text-primary">
            Commerce Workspaces
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary">
            Select your role to initiate new procurement escrows or authorize agreements addressed to your wallet.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Buyer Workspace */}
          <Card
            variant="interactive"
            className="p-5 sm:p-6 space-y-4 flex flex-col justify-between"
            onClick={handleEnterInitiator}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant="accent">BUYER WORKSPACE</Badge>
                <span className="text-[11px] text-text-tertiary font-mono">
                  {wallet.isConnected && wallet.address
                    ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`
                    : 'Wallet not connected'}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-text-primary">
                Procure &amp; Fund Escrow
              </h3>
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                Describe commercial deliverables in natural language, configure independent verification gates, and deposit escrow on Monad.
              </p>
            </div>
            <div className="pt-2 flex items-center text-xs font-semibold text-accent gap-1 group-hover:underline">
              <span>Enter Buyer Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Card>

          {/* Seller Workspace */}
          <Card
            variant="interactive"
            className="p-5 sm:p-6 space-y-4 flex flex-col justify-between"
            onClick={handleEnterReceiver}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant="default">SELLER WORKSPACE</Badge>
                <span className="text-[11px] text-text-tertiary font-mono">
                  {wallet.isConnected && wallet.address
                    ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`
                    : 'Wallet not connected'}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-text-primary">
                Review &amp; Deliver Work
              </h3>
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                Inspect inbound proposals, sign bilateral agreements with EIP-191 signatures, upload proof of delivery, and receive payouts.
              </p>
            </div>
            <div className="pt-2 flex items-center text-xs font-semibold text-accent gap-1 group-hover:underline">
              <span>Enter Seller Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Card>
        </div>
      </section>

      {/* Verified Benchmarks Study */}
      <section className="px-4 sm:px-6 lg:px-8 py-10 sm:py-14 border-t border-border bg-surface/40">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <h2 className="text-lg sm:text-xl font-bold text-text-primary">
                Verified Testnet Benchmarks
              </h2>
              <p className="text-xs sm:text-sm text-text-secondary">
                Immutable testnet executions recorded on Monad Testnet and indexed by Envio.
              </p>
            </div>
            <Link href="/transactions?tab=demo" className="shrink-0">
              <Button variant="secondary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                Inspect Benchmark Directory
              </Button>
            </Link>
          </div>

          {/* Team benchmark notice banner */}
          <div className="rounded-lg border border-border/80 bg-surface-elevated/70 p-3.5 sm:p-4 text-xs text-text-secondary flex items-start gap-3">
            <Shield className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold text-text-primary block">Team Testnet Benchmark Notice</span>
              <p>
                These are testnet transactions executed by the VeriqoMesh team to demonstrate Flow A and Flow B. They are not your transactions.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Flow A Card */}
            <Card padding="md" className="space-y-3">
              <div className="flex items-center justify-between">
                <StatusChip status="success" label="Flow A: 100% Milestone Release" />
                <span className="font-mono text-xs text-text-tertiary">Receipt #3</span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-text-primary">
                Solar Procurement (Verified Delivery)
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Commercial solar panel supply. Seller anchored serial numbers and waybill; designated verifier attested PASS; escrow contract automatically released full payout.
              </p>
              <div className="text-[11px] text-text-tertiary flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded bg-surface border border-border text-[10px] font-medium text-text-tertiary uppercase">Team demo wallet</span>
                <span className="font-mono truncate">Buyer 0xa4bC...C50F · Seller 0x0e73...6Ee8</span>
              </div>
              <div className="pt-1 flex items-center justify-between text-xs border-t border-border/50">
                <span className="font-mono text-text-secondary">0.001 MON</span>
                <a
                  href="https://testnet.monadvision.com/tx/0x691f7a80d65fe1deece2f45e8b6600ee4b2b0ffc14f3fe733d995566e2d83b52"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline inline-flex items-center gap-1 font-mono text-[11px]"
                >
                  <span>Tx: 0x691f...83b52</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </Card>

            {/* Flow B Card */}
            <Card padding="md" className="space-y-3">
              <div className="flex items-center justify-between">
                <StatusChip status="warning" label="Flow B: 3-Judge Median Dispute" />
                <span className="font-mono text-xs text-text-tertiary">Receipt #2</span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-text-primary">
                Solar PV Modules (Disputed Delivery)
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Inconclusive depot inspection triggered human adjudication fallback. Three independent accredited judges cast cryptographic ballots; atomic median consensus enforced settlement.
              </p>
              <div className="text-[11px] text-text-tertiary flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded bg-surface border border-border text-[10px] font-medium text-text-tertiary uppercase">Team demo wallet</span>
                <span className="font-mono truncate">Buyer 0xa4bC...C50F · Seller 0x0e73...6Ee8</span>
              </div>
              <div className="pt-1 flex items-center justify-between text-xs border-t border-border/50">
                <span className="font-mono text-text-secondary">0.001 MON</span>
                <a
                  href="https://testnet.monadvision.com/tx/0x91ff62584f4386250ccb09f28808453bb373273d9fa5f56cf04378c2a78084ba"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline inline-flex items-center gap-1 font-mono text-[11px]"
                >
                  <span>Tx: 0x91ff...84ba</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Protocol Architecture Hub */}
      <section className="px-4 sm:px-6 lg:px-8 py-10 sm:py-14 max-w-5xl mx-auto w-full space-y-6">
        <div className="space-y-1">
          <h2 className="text-lg sm:text-xl font-bold text-text-primary">
            Architecture Modules
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary">
            Core components of the VeriqoMesh trust layer running on Monad Testnet.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          <Link href="/evidence" className="block">
            <Card variant="interactive" padding="sm" className="space-y-1.5 h-full">
              <div className="flex items-center gap-2 text-accent">
                <FileText className="w-4 h-4" />
                <span className="font-bold text-text-primary text-sm">Evidence Explorer</span>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                Cryptographic commitments anchoring 32-byte Keccak-256 deliverable hashes directly on Monad.
              </p>
            </Card>
          </Link>

          <Link href="/trust" className="block">
            <Card variant="interactive" padding="sm" className="space-y-1.5 h-full">
              <div className="flex items-center gap-2 text-accent">
                <Shield className="w-4 h-4" />
                <span className="font-bold text-text-primary text-sm">Trust Receipts Vault</span>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                Non-transferable ERC-5192 Soulbound receipts recording non-repudiable settlement proofs.
              </p>
            </Card>
          </Link>

          <Link href="/receivers" className="block">
            <Card variant="interactive" padding="sm" className="space-y-1.5 h-full">
              <div className="flex items-center gap-2 text-accent">
                <Users className="w-4 h-4" />
                <span className="font-bold text-text-primary text-sm">Counterparty Directory</span>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                Find accredited fulfillment suppliers, verifier nodes, and human adjudication judges.
              </p>
            </Card>
          </Link>
        </div>
      </section>
    </div>
  );
}
