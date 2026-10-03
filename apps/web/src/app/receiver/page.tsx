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
  Wallet,
  CheckCircle2,
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
import { Card } from '../../components/ui/Card';
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
    <div className="py-6 sm:py-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="space-y-1 border-b border-border pb-5">
        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
          Review agreements
        </h1>
        <p className="text-sm text-text-secondary">
          You have been asked to review an agreement.
        </p>
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
                Connect your Monad wallet to see agreements sent to this address.
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
      ) : !receiverCompatibility.isCompatible ? (
        /* Connected but role mismatched */
        <Card className="p-4 sm:p-5 bg-status-warning/10 border border-status-warning/30 space-y-3 text-xs">
          <div className="flex items-center gap-2 text-status-warning font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Seller wallet required</span>
          </div>
          <p className="text-text-secondary leading-relaxed">
            Your connected account (<code className="font-mono text-text-primary">{wallet.address?.slice(0, 8)}...{wallet.address?.slice(-6)}</code>) is not registered as the designated seller ({receiver.name || 'Seller'}). Only the authorized seller account can sign agreements onchain.
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

      {/* Main Section: Requests for you */}
      <section className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-text-primary">
            Requests for you
          </h2>
          <span className="text-xs text-text-tertiary">
            {actionableRequests.length} awaiting your action
          </span>
        </div>

        {actionableRequests.length === 0 ? (
          <EmptyState
            icon={<Inbox className="w-5 h-5 text-text-tertiary" />}
            title="0 awaiting your action"
            description="When buyers initiate commercial agreements designated for your wallet, they will appear here with an authorization action."
            action={
              <Link href="/requests">
                <Button variant="secondary" size="sm">
                  View full inbox
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {actionableRequests.map((req) => (
              <Card key={req.id} variant="default" className="p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-accent uppercase tracking-wider">
                    New agreement
                  </span>
                  <StatusChip status="warning" size="sm" label="Awaiting your authorization" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-bold text-text-primary">
                    {req.title || req.deliverable}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary">
                    <span className="font-mono font-semibold text-status-success">
                      {req.escrowAmountMon} MON
                    </span>
                    <span>•</span>
                    <span>
                      Receiver: <code className="font-mono text-text-tertiary">{req.receiverWallet ? `${req.receiverWallet.slice(0, 6)}...${req.receiverWallet.slice(-4)}` : '0x...'}</code>
                    </span>
                    <span>•</span>
                    <span>Deadline: {req.deadlineDays} days</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-border gap-3">
                  <span className="text-[11px] text-text-tertiary font-mono">
                    ID: {req.id.slice(0, 12)}...
                  </span>
                  <Link href={`/requests?invitation=${req.invitationCode || req.id}`}>
                    <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                      Review agreement
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Fulfillment & Evidence Workflows (Secondary) */}
      <section className="space-y-3 pt-6 border-t border-border">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
          Fulfillment workflows
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Card padding="sm" className="space-y-2">
            <div className="flex items-center gap-2 text-text-primary text-xs font-semibold">
              <FileCheck2 className="w-4 h-4 text-accent" />
              <span>Evidence Anchoring</span>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              Anchor bills of lading, delivery proofs, and serial numbers as cryptographic deliverable hashes on Monad.
            </p>
            <div className="pt-1">
              <Link href="/evidence" className="text-xs text-accent hover:underline inline-flex items-center gap-1 font-medium">
                <span>Open evidence explorer</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </Card>

          <Card padding="sm" className="space-y-2">
            <div className="flex items-center gap-2 text-text-primary text-xs font-semibold">
              <Shield className="w-4 h-4 text-status-success" />
              <span>Onchain Settlement</span>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              Funds release to your wallet once designated inspectors attest compliance on Monad Testnet.
            </p>
            <div className="pt-1">
              <Link href="/transactions" className="text-xs text-accent hover:underline inline-flex items-center gap-1 font-medium">
                <span>View transactions</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
