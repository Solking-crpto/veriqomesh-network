'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Play,
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
  const { switchRole } = useDemoNetwork();

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
      {/* Hero Section */}
      <section className="relative px-4 sm:px-6 lg:px-8 pt-12 pb-16 sm:pt-20 sm:pb-24 border-b border-border">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          {/* Brand Mark & Tag */}
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-surface border border-border flex items-center justify-center p-2 shadow-card">
              <Image
                src="/brand/veriqomesh-mark.png"
                alt="VeriqoMesh Network"
                width={64}
                height={64}
                className="w-full h-full object-contain"
                priority
              />
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-elevated border border-border text-text-secondary text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-status-success" />
              <span>Live on Monad Metropolis Testnet · Chain ID 10143</span>
            </div>
          </div>

          {/* Headline */}
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-text-primary leading-[1.1]">
              Programmable Trust &amp; Escrow for Human and AI Commerce
            </h1>
            <p className="text-base sm:text-xl text-text-secondary max-w-2xl mx-auto leading-relaxed">
              Define the agreement. Protect the transaction. Verify the outcome with cryptographic proof on Monad.
            </p>
          </div>

          {/* Primary & Secondary Actions */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-lg mx-auto">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              className="whitespace-nowrap"
              onClick={handleEnterInitiator}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Create Agreement
            </Button>
            <Link href="/demo-video" className="w-full sm:w-auto">
              <Button
                variant="secondary"
                size="lg"
                fullWidth
                className="whitespace-nowrap"
                leftIcon={<Play className="w-4 h-4 fill-current" />}
              >
                Watch Walkthrough (02:55)
              </Button>
            </Link>
          </div>

          {/* 4-Step Architecture Strip */}
          <div className="pt-8 sm:pt-12">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-left">
              <div className="p-4 rounded-card bg-surface border border-border space-y-1.5">
                <div className="flex items-center gap-2 text-accent font-semibold text-xs">
                  <span>01</span>
                  <span className="text-text-primary">AI Assists</span>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Translates natural language intent into structured parameters and canonical terms.
                </p>
              </div>

              <div className="p-4 rounded-card bg-surface border border-border space-y-1.5">
                <div className="flex items-center gap-2 text-accent font-semibold text-xs">
                  <span>02</span>
                  <span className="text-text-primary">Humans Authorize</span>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Both counterparties review and ratify immutable terms with cryptographic wallet signatures.
                </p>
              </div>

              <div className="p-4 rounded-card bg-surface border border-border space-y-1.5">
                <div className="flex items-center gap-2 text-accent font-semibold text-xs">
                  <span>03</span>
                  <span className="text-text-primary">Verifiers Attest</span>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Physical bills of lading, serial numbers, and inspection proofs committed to IPFS.
                </p>
              </div>

              <div className="p-4 rounded-card bg-surface border border-border space-y-1.5">
                <div className="flex items-center gap-2 text-accent font-semibold text-xs">
                  <span>04</span>
                  <span className="text-text-primary">Monad Enforces</span>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  State machine contract locks deposits and executes settlement or 3-judge mediation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Two-Sided Entry Cards */}
      <section className="px-4 sm:px-6 lg:px-8 py-16 max-w-6xl mx-auto w-full">
        <div className="text-center max-w-xl mx-auto mb-10 space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-text-primary">
            Choose Your Role
          </h2>
          <p className="text-sm text-text-secondary">
            Participate as a commissioning buyer or a fulfilling supplier with cryptographic guarantees.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Buyer / Initiator Card */}
          <Card className="flex flex-col justify-between p-6 sm:p-8 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="accent">BUYER WORKSPACE</Badge>
                <span className="text-xs text-text-tertiary">Initiator Node</span>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl sm:text-2xl font-bold text-text-primary">
                  Transaction Initiator
                </h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  Commission commercial procurement, lock escrow capital safely in Monad contracts, define deliverable specifications, and mandate independent verification.
                </p>
              </div>
              <div className="p-3 rounded-control bg-surface-elevated border border-border text-xs space-y-1.5 text-text-secondary">
                <div className="flex items-center justify-between">
                  <span>Role:</span>
                  <span className="text-text-primary font-medium">Buyer / Principal Node</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Governance:</span>
                  <span className="text-text-primary font-medium">Policy-Bounded Intent &amp; Signature</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Network:</span>
                  <span className="text-status-success font-medium">Monad Metropolis (10143)</span>
                </div>
              </div>
            </div>
            <Button
              variant="primary"
              size="md"
              fullWidth
              onClick={handleEnterInitiator}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Enter as Buyer
            </Button>
          </Card>

          {/* Seller / Receiver Card */}
          <Card className="flex flex-col justify-between p-6 sm:p-8 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="default">SELLER WORKSPACE</Badge>
                <span className="text-xs text-text-tertiary">Receiver Node</span>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl sm:text-2xl font-bold text-text-primary">
                  Transaction Receiver
                </h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  Receive inbound commercial deal requests, review proposed agreement terms, counter or ratify, submit fulfillment evidence, and claim verified escrow releases.
                </p>
              </div>
              <div className="p-3 rounded-control bg-surface-elevated border border-border text-xs space-y-1.5 text-text-secondary">
                <div className="flex items-center justify-between">
                  <span>Role:</span>
                  <span className="text-text-primary font-medium">Fulfillment Supplier Node</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Capabilities:</span>
                  <span className="text-text-primary font-medium">Delivery, Evidence &amp; Settlement</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Network:</span>
                  <span className="text-status-success font-medium">Monad Metropolis (10143)</span>
                </div>
              </div>
            </div>
            <Button
              variant="secondary"
              size="md"
              fullWidth
              onClick={handleEnterReceiver}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Enter as Seller
            </Button>
          </Card>
        </div>
      </section>

      {/* Live Benchmark Case Study */}
      <section className="px-4 sm:px-6 lg:px-8 py-12 bg-surface/40 border-y border-border">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-status-success" />
              <span className="text-xs font-semibold text-text-primary uppercase tracking-wide">
                Verifiable Testnet Evidence
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-text-primary">
              Monad Testnet 3-Judge Dispute Resolution
            </h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              Transaction <code className="font-mono text-text-primary">0x2b57d6b0...afcc4</code> was contested due to physical solar module damage. Three independent human judges submitted signed ballots; the protocol computed a deterministic median consensus of 1,500 bps (15% refund, 85% release) executed by resolver <code className="font-mono text-text-primary">0x12f9...c35E</code>.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link href="/transactions/0x2b57d6b0ef1ba16a60c4f801d90d27d23e598fd6b1381e0175077201dc6afcc4">
              <Button variant="primary" size="md">
                Inspect Record
              </Button>
            </Link>
            <Link href="/trust">
              <Button variant="secondary" size="md">
                View Trust Receipt
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Protocol Navigation Hub */}
      <section className="px-4 sm:px-6 lg:px-8 py-16 max-w-6xl mx-auto w-full space-y-6">
        <div>
          <h3 className="text-lg font-bold text-text-primary">
            Explore Protocol Modules
          </h3>
          <p className="text-xs sm:text-sm text-text-secondary">
            Access core services and directories across the network.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/initiator/intent">
            <Card variant="interactive" className="h-full flex flex-col justify-between p-5 space-y-4">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-control bg-accent/10 border border-accent/25 flex items-center justify-center text-accent">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h4 className="text-base font-semibold text-text-primary">
                  Create Intent
                </h4>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Parse natural language procurement instructions into onchain terms with AI policy bounds.
                </p>
              </div>
              <div className="text-xs font-medium text-accent flex items-center gap-1">
                <span>Start intent</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Card>
          </Link>

          <Link href="/requests">
            <Card variant="interactive" className="h-full flex flex-col justify-between p-5 space-y-4">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-control bg-surface-elevated border border-border flex items-center justify-center text-text-secondary">
                  <Inbox className="w-5 h-5" />
                </div>
                <h4 className="text-base font-semibold text-text-primary">
                  Requests Inbox
                </h4>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Two-sided workspace to review, counter, or ratify commercial proposals before funding.
                </p>
              </div>
              <div className="text-xs font-medium text-text-secondary flex items-center gap-1">
                <span>View inbox</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Card>
          </Link>

          <Link href="/transactions">
            <Card variant="interactive" className="h-full flex flex-col justify-between p-5 space-y-4">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-control bg-surface-elevated border border-border flex items-center justify-center text-text-secondary">
                  <FileText className="w-5 h-5" />
                </div>
                <h4 className="text-base font-semibold text-text-primary">
                  Transactions
                </h4>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Personal workspace and historical public benchmarks with real-time settlement telemetry.
                </p>
              </div>
              <div className="text-xs font-medium text-text-secondary flex items-center gap-1">
                <span>Browse activity</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Card>
          </Link>

          <Link href="/trust">
            <Card variant="interactive" className="h-full flex flex-col justify-between p-5 space-y-4">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-control bg-surface-elevated border border-border flex items-center justify-center text-text-secondary">
                  <Shield className="w-5 h-5" />
                </div>
                <h4 className="text-base font-semibold text-text-primary">
                  Trust Layer
                </h4>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Tamper-evident Trust Receipts, participant reputation scores, and verification evidence.
                </p>
              </div>
              <div className="text-xs font-medium text-text-secondary flex items-center gap-1">
                <span>Inspect trust</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Card>
          </Link>
        </div>
      </section>
    </div>
  );
}
