'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import {
  Inbox,
  ArrowRight,
  Shield,
  FileCheck2,
  AlertCircle,
  ExternalLink,
  Check,
  User,
} from 'lucide-react';
import { useDemoNetwork } from '../../context/DemoNetworkContext';
import {
  isBenchmarkRequest,
  isAwaitingReceiverAction,
  isWalletCompatibleWithRole,
  TARGET_BUYER_ADDRESS,
  TARGET_SELLER_ADDRESS,
} from '../../lib/invitation-utils';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { StatusChip } from '../../components/ui/StatusChip';
import { EmptyState } from '../../components/ui/EmptyState';

export default function ReceiverDashboardPage() {
  const {
    role,
    switchRole,
    receiver,
    allRequests,
    actionableRequestsCount,
    wallet,
  } = useDemoNetwork();

  const isRoleActive = role === 'RECEIVER';

  // Role compatibility check for connected wallet vs designated receiver
  const receiverCompatibility = useMemo(() => {
    return isWalletCompatibleWithRole({
      role: 'RECEIVER',
      connectedWallet: wallet.address,
      isConnected: wallet.isConnected,
      designatedReceiver: receiver.wallet || TARGET_SELLER_ADDRESS,
    });
  }, [wallet.address, wallet.isConnected, receiver.wallet]);

  // Only genuine actionable requests addressed to this connected wallet
  const actionableRequests = useMemo(() => {
    if (!wallet.isConnected || !wallet.address) return [];
    return allRequests.filter(
      (r) =>
        !isBenchmarkRequest(r) &&
        isAwaitingReceiverAction(r) &&
        r.receiverWallet?.toLowerCase() === wallet.address?.toLowerCase()
    );
  }, [allRequests, wallet.isConnected, wallet.address]);

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-8">
      {/* Role Mismatch Notice */}
      {!isRoleActive && (
        <div className="p-4 rounded-card bg-surface-elevated border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-text-secondary">
            <span className="w-2 h-2 rounded-full bg-status-warning shrink-0" />
            <span>
              You are currently viewing as <strong>Buyer</strong>. Switch perspective to view as <strong>Seller</strong>.
            </span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => switchRole('RECEIVER')}
          >
            Switch to Seller View
          </Button>
        </div>
      )}

      {/* Wallet Incompatibility Warning */}
      {wallet.isConnected && !receiverCompatibility.isCompatible && (
        <div className="p-4 rounded-card bg-status-warning/10 border border-status-warning/30 space-y-3 text-xs">
          <div className="flex items-center gap-2 text-status-warning font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Seller Wallet Required</span>
          </div>
          <p className="text-text-secondary leading-relaxed">
            Your connected account (<code className="font-mono text-text-primary">{wallet.address?.slice(0, 8)}...{wallet.address?.slice(-6)}</code>) is not registered as the designated seller ({receiver.name || 'Fulfillment Node'}). Only the authorized seller account can sign and accept deal agreements onchain.
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
            <Badge variant="default">SELLER WORKSPACE</Badge>
            <span className="text-xs text-text-tertiary">Receiver Node</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
            Seller Workspace
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Review inbound commercial proposals, sign agreements on Monad, and submit fulfillment evidence.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link href="/requests">
            <Button
              variant="primary"
              size="md"
              leftIcon={<Inbox className="w-4 h-4" />}
            >
              <span>Incoming Requests</span>
              {actionableRequestsCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-white text-accent text-xs font-bold">
                  {actionableRequestsCount}
                </span>
              )}
            </Button>
          </Link>
          <Link href="/account">
            <Button variant="secondary" size="md">
              Node Profile
            </Button>
          </Link>
        </div>
      </div>

      {/* 4-Stat Metric Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding="sm" className="space-y-1">
          <span className="text-xs text-text-tertiary block">Incoming Requests</span>
          <div className="text-2xl font-bold text-status-warning font-mono">
            {actionableRequestsCount} New
          </div>
          <span className="text-[11px] text-text-secondary block">
            {actionableRequestsCount > 0 ? 'Awaiting your onchain signature' : 'No action needed'}
          </span>
        </Card>

        <Card padding="sm" className="space-y-1">
          <span className="text-xs text-text-tertiary block">Active Agreements</span>
          <div className="text-2xl font-bold text-text-primary font-mono">
            {wallet.isConnected && wallet.address
              ? allRequests.filter(
                  (r) =>
                    r.status === 'AGREEMENT_ACTIVE' &&
                    r.receiverWallet?.toLowerCase() === wallet.address?.toLowerCase()
                ).length
              : 0}
          </div>
          <span className="text-[11px] text-text-secondary block">Active escrow commitments</span>
        </Card>

        <Card padding="sm" className="space-y-1">
          <span className="text-xs text-text-tertiary block">Completed Deals</span>
          <div className="text-2xl font-bold text-status-success font-mono">0</div>
          <span className="text-[11px] text-text-secondary block">Fully settled transactions</span>
        </Card>

        <Card padding="sm" className="space-y-1">
          <span className="text-xs text-text-tertiary block">Trust Score</span>
          <div className="text-2xl font-bold text-accent font-mono">100%</div>
          <span className="text-[11px] text-text-secondary block">Accredited supplier rating</span>
        </Card>
      </div>

      {/* Inbound Requests List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-text-primary">
            Actionable Inbound Requests ({actionableRequests.length})
          </h2>
          <Link href="/requests" className="text-xs font-medium text-accent hover:underline">
            View full inbox →
          </Link>
        </div>

        {actionableRequests.length === 0 ? (
          <EmptyState
            icon={<Inbox className="w-6 h-6 text-text-tertiary" />}
            title="No pending requests awaiting your action"
            description="When buyers initiate commercial agreements designated for your wallet, they will appear here with an onchain signing prompt."
            action={
              <Link href="/requests">
                <Button variant="secondary" size="sm">
                  Go to Requests Inbox
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {actionableRequests.map((req) => (
              <Card key={req.id} variant="default" className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-text-tertiary">{req.id}</span>
                      <span className="text-border">•</span>
                      <span className="font-medium text-text-primary text-sm">{req.deliverable}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-text-secondary">
                      <span>Buyer: <strong className="text-text-primary">{req.initiator}</strong></span>
                      <span>•</span>
                      <span>Escrow: <strong className="font-mono text-status-success">{req.escrowAmountMon} MON</strong></span>
                      <span>•</span>
                      <span>Timeline: {req.deadlineDays} days</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <StatusChip status="warning" size="sm" label="Action Required" />
                    <Link href={`/requests?invitation=${req.invitationCode || req.id}`}>
                      <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                        Review &amp; Sign
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Fulfillment Escrows Cards */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-text-primary">
          Fulfillment &amp; Evidence Workflows
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="text-xs font-semibold text-accent uppercase tracking-wider block">
                Evidence Anchoring
              </span>
              <h3 className="text-base font-bold text-text-primary">
                Physical Deliverable Verification
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                When goods are shipped or services completed, upload bill of lading carrier manifests, delivery photos, and serial numbers to IPFS.
              </p>
            </div>
            <Link href="/evidence">
              <Button variant="secondary" size="sm" fullWidth rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                Explore Evidence Registry
              </Button>
            </Link>
          </Card>

          <Card className="space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="text-xs font-semibold text-status-success uppercase tracking-wider block">
                Escrow Settlement
              </span>
              <h3 className="text-base font-bold text-text-primary">
                Onchain Capital Settlement
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Once designated inspector nodes attest PASS, escrowed MON funds release to your seller address on Monad Metropolis Testnet.
              </p>
            </div>
            <Link href="/transactions">
              <Button variant="secondary" size="sm" fullWidth rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                View Settled Transactions
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
