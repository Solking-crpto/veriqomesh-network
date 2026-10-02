'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import {
  Plus,
  ArrowRight,
  Shield,
  FileText,
  AlertCircle,
  ExternalLink,
  Wallet,
  CheckCircle2,
  Users,
} from 'lucide-react';
import { useDemoNetwork } from '../../context/DemoNetworkContext';
import {
  isWalletCompatibleWithRole,
  TARGET_BUYER_ADDRESS,
  TARGET_SELLER_ADDRESS,
} from '../../lib/invitation-utils';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { StatusChip } from '../../components/ui/StatusChip';
import { EmptyState } from '../../components/ui/EmptyState';

export default function InitiatorDashboardPage() {
  const { role, switchRole, initiator, requests, wallet } = useDemoNetwork();

  // Role compatibility check for connected wallet vs designated initiator
  const initiatorCompatibility = useMemo(() => {
    return isWalletCompatibleWithRole({
      role: 'INITIATOR',
      connectedWallet: wallet.address,
      isConnected: wallet.isConnected,
      designatedInitiator: initiator.wallet || TARGET_BUYER_ADDRESS,
    });
  }, [wallet.address, wallet.isConnected, initiator.wallet]);

  return (
    <div className="py-6 sm:py-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-6">
      {/* Header & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
            Create an agreement
          </h1>
          <p className="text-sm text-text-secondary">
            Describe what you need and define the commercial terms.
          </p>
        </div>

        <Link href="/initiator/intent" className="shrink-0">
          <Button
            variant="primary"
            size="md"
            fullWidth
            leftIcon={<Plus className="w-4 h-4" />}
            className="sm:w-auto"
          >
            Create agreement
          </Button>
        </Link>
      </div>

      {/* Disconnected State: Compact Alert */}
      {!wallet.isConnected ? (
        <Card className="p-4 sm:p-5 bg-surface border-border space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-control bg-accent/10 border border-accent/20 text-accent shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
            <div className="space-y-1 flex-1">
              <h2 className="text-sm font-semibold text-text-primary">
                Wallet required
              </h2>
              <p className="text-xs text-text-secondary leading-relaxed">
                Connect your wallet to create an agreement and deposit escrow on Monad.
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            size="md"
            fullWidth
            onClick={() => wallet.connect()}
            isLoading={wallet.isConnecting}
            className="sm:w-auto"
          >
            Connect wallet
          </Button>
        </Card>
      ) : !initiatorCompatibility.isCompatible ? (
        /* Connected but role mismatched */
        <Card className="p-4 sm:p-5 bg-status-warning/10 border border-status-warning/30 space-y-3 text-xs">
          <div className="flex items-center gap-2 text-status-warning font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Buyer wallet required</span>
          </div>
          <p className="text-text-secondary leading-relaxed">
            Your connected account (<code className="font-mono text-text-primary">{wallet.address?.slice(0, 8)}...{wallet.address?.slice(-6)}</code>) is not registered as the designated buyer ({initiator.name || 'Buyer'}). Initiating commercial escrows requires authorization from the designated account.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <Button variant="secondary" size="sm" onClick={() => wallet.connect()}>
              Switch account
            </Button>
            <Button variant="ghost" size="sm" onClick={() => wallet.disconnect()}>
              Disconnect
            </Button>
          </div>
        </Card>
      ) : null}

      {/* Workflow Stepper: 5 Clean Stages */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          Agreement workflow
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 sm:gap-2.5">
          {[
            { step: '01', title: 'What do you need?', desc: 'Describe commercial need in plain text.' },
            { step: '02', title: 'Agreement terms', desc: 'Scope, deposit amount, and deadline.' },
            { step: '03', title: 'Who receives it?', desc: 'Designate counterparty seller address.' },
            { step: '04', title: 'Evidence', desc: 'Define checklist for independent review.' },
            { step: '05', title: 'Review & create', desc: 'Commit terms onchain and share code.' },
          ].map((item) => (
            <div
              key={item.step}
              className="p-3 rounded-control bg-surface border border-border flex sm:flex-col items-start gap-2.5 sm:gap-1 text-left"
            >
              <span className="text-[11px] font-bold text-accent shrink-0">{item.step}</span>
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-text-primary">{item.title}</div>
                <p className="text-[11px] text-text-secondary leading-normal">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Active Buyer Requests List */}
      <section className="space-y-3 pt-4 border-t border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-text-primary">
            Your active proposals ({requests.length})
          </h2>
          <Link href="/initiator/intent">
            <Button variant="secondary" size="sm" rightIcon={<Plus className="w-3.5 h-3.5" />}>
              New proposal
            </Button>
          </Link>
        </div>

        {requests.length === 0 ? (
          <EmptyState
            icon={<FileText className="w-5 h-5 text-text-tertiary" />}
            title="No active agreements created yet"
            description="Start by describing what deliverable you need and generating a canonical proposal code."
            action={
              <Link href="/initiator/intent">
                <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  Create first agreement
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <Card key={req.id} variant="default" className="p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-accent uppercase tracking-wider">
                    {req.isOnchain ? 'Monad Escrow' : 'Draft Proposal'}
                  </span>
                  <StatusChip
                    status={req.status === 'AGREEMENT_ACTIVE' ? 'success' : 'neutral'}
                    size="sm"
                    label={req.status.replace(/_/g, ' ')}
                  />
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-bold text-text-primary">
                    {req.title || req.deliverable}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary">
                    <span>
                      Escrow: <strong className="font-mono text-status-success">{req.escrowAmountMon} MON</strong>
                    </span>
                    <span>•</span>
                    <span>Receiver: <code className="font-mono text-text-tertiary">{req.receiverWallet ? `${req.receiverWallet.slice(0, 6)}...${req.receiverWallet.slice(-4)}` : 'Unassigned'}</code></span>
                    <span>•</span>
                    <span>Window: {req.deadlineDays} days</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-border gap-3">
                  <span className="text-[11px] text-text-tertiary font-mono">
                    ID: {req.id.slice(0, 12)}...
                  </span>
                  {req.transactionId && (
                    <Link href={`/transactions/${req.transactionId}`}>
                      <Button variant="secondary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                        View transaction
                      </Button>
                    </Link>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
