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
  Lock,
  Scale,
  Users,
} from 'lucide-react';
import { useDemoNetwork } from '../../context/DemoNetworkContext';
import {
  isWalletCompatibleWithRole,
  TARGET_BUYER_ADDRESS,
  TARGET_SELLER_ADDRESS,
} from '../../lib/invitation-utils';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { StatusChip } from '../../components/ui/StatusChip';
import { EmptyState } from '../../components/ui/EmptyState';

export default function InitiatorDashboardPage() {
  const { role, switchRole, initiator, requests, wallet } = useDemoNetwork();

  const isRoleActive = role === 'INITIATOR';

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
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-8">
      {/* Role Mismatch Notice */}
      {!isRoleActive && (
        <div className="p-4 rounded-card bg-surface-elevated border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-text-secondary">
            <span className="w-2 h-2 rounded-full bg-status-warning shrink-0" />
            <span>
              You are currently viewing as <strong>Seller</strong>. Switch perspective to view as <strong>Buyer</strong>.
            </span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => switchRole('INITIATOR')}
          >
            Switch to Buyer View
          </Button>
        </div>
      )}

      {/* Wallet Incompatibility Warning */}
      {wallet.isConnected && !initiatorCompatibility.isCompatible && (
        <div className="p-4 rounded-card bg-status-warning/10 border border-status-warning/30 space-y-3 text-xs">
          <div className="flex items-center gap-2 text-status-warning font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Buyer Wallet Required</span>
          </div>
          <p className="text-text-secondary leading-relaxed">
            Your connected account (<code className="font-mono text-text-primary">{wallet.address?.slice(0, 8)}...{wallet.address?.slice(-6)}</code>) is not registered as the designated buyer ({initiator.name || 'Buyer Principal'}). Initiating commercial escrows requires authorization from the designated account.
          </p>
          <div className="flex items-center gap-3 pt-1">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => wallet.connect()}
            >
              Switch Account
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => wallet.disconnect()}
            >
              Disconnect
            </Button>
          </div>
        </div>
      )}

      {/* Header & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="accent">BUYER WORKSPACE</Badge>
            <span className="text-xs text-text-tertiary">Initiator Node</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
            Buyer Workspace
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Commission commercial agreements, deposit funds in Monad escrow, and oversee milestone delivery.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link href="/initiator/intent">
            <Button
              variant="primary"
              size="md"
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Create Agreement
            </Button>
          </Link>
          <Link href="/receivers">
            <Button variant="secondary" size="md">
              Find Sellers
            </Button>
          </Link>
        </div>
      </div>

      {/* 4-Stat Metric Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding="sm" className="space-y-1">
          <span className="text-xs text-text-tertiary block">Active Requests</span>
          <div className="text-2xl font-bold text-text-primary font-mono">{requests.length}</div>
          <span className="text-[11px] text-text-secondary block">Registered commercial deals</span>
        </Card>

        <Card padding="sm" className="space-y-1">
          <span className="text-xs text-text-tertiary block">Active Escrows</span>
          <div className="text-2xl font-bold text-status-success font-mono">
            {requests.filter((r) => r.status === 'AGREEMENT_ACTIVE' && r.isOnchain).length}
          </div>
          <span className="text-[11px] text-text-secondary block">Funded on Monad testnet</span>
        </Card>

        <Card padding="sm" className="space-y-1">
          <span className="text-xs text-text-tertiary block">Spending Policy</span>
          <div className="text-lg font-bold text-text-primary">Not Configured</div>
          <span className="text-[11px] text-text-secondary block">Manual wallet authorization</span>
        </Card>

        <Card padding="sm" className="space-y-1">
          <span className="text-xs text-text-tertiary block">Trust Receipts</span>
          <div className="text-2xl font-bold text-accent font-mono">0</div>
          <span className="text-[11px] text-text-secondary block">Settled milestone receipts</span>
        </Card>
      </div>

      {/* Policy Card */}
      <Card className="space-y-4">
        <CardHeader
          title="Policy &amp; Verification Rules"
          subtitle="Architectural bounds governing your autonomous agents and smart contracts"
          action={
            <Link href="/account">
              <Button variant="ghost" size="sm">
                Account Settings →
              </Button>
            </Link>
          }
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-control bg-surface-elevated/60 border border-border space-y-1.5">
            <span className="text-text-primary font-semibold block">Pre-Authorized Verification</span>
            <p className="text-text-secondary leading-relaxed">
              When accredited verification attests PASS, policy rules qualify the transaction for settlement. State changes remain subject to cryptographic authorization.
            </p>
          </div>
          <div className="p-3.5 rounded-control bg-surface-elevated/60 border border-border space-y-1.5">
            <span className="text-text-primary font-semibold block">Deterministic 3-Judge Median</span>
            <p className="text-text-secondary leading-relaxed">
              If physical delivery is disputed, escrow locks onchain and 3 independent judges vote on refund basis points.
            </p>
          </div>
          <div className="p-3.5 rounded-control bg-surface-elevated/60 border border-border space-y-1.5">
            <span className="text-text-primary font-semibold block">Configured Verifier</span>
            <p className="text-text-secondary leading-relaxed">
              Operator-Controlled Verifier (<code className="font-mono text-text-primary">0xb064...2c48</code>) mandated to review deliverables before payout.
            </p>
          </div>
        </div>
      </Card>

      {/* Active Deal Requests Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-text-primary">
            Active Requests ({requests.length})
          </h2>
          <Link href="/requests" className="text-xs font-medium text-accent hover:underline">
            Manage all requests →
          </Link>
        </div>

        {requests.length === 0 ? (
          <EmptyState
            icon={<FileText className="w-6 h-6 text-text-tertiary" />}
            title="No active requests"
            description="Create a commercial proposal to define deliverables, set verification rules, and establish an escrow agreement on Monad."
            action={
              <Link href="/initiator/intent">
                <Button variant="primary" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />}>
                  Create Commercial Intent
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <Card key={req.id} variant="default" className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-text-tertiary">{req.id}</span>
                      <span className="text-border">•</span>
                      <span className="font-medium text-text-primary text-sm">{req.deliverable}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-text-secondary">
                      <span>Counterparty: <strong className="text-text-primary">{req.receiver}</strong></span>
                      <span>•</span>
                      <span>Amount: <strong className="font-mono text-status-success">{req.escrowAmountMon} MON</strong></span>
                      <span>•</span>
                      <span>Deadline: {req.deadlineDays} days</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <StatusChip
                      status={
                        req.status === 'AGREEMENT_ACTIVE'
                          ? 'success'
                          : req.status === 'COUNTERED'
                          ? 'warning'
                          : 'accent'
                      }
                      size="sm"
                      label={req.status.replace(/_/g, ' ')}
                    />
                    <Link href="/requests">
                      <Button variant="secondary" size="sm">
                        View Terms
                      </Button>
                    </Link>
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
