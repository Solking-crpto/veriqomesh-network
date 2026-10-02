'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  User,
  Shield,
  Wallet,
  Check,
  RotateCcw,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { useDemoNetwork, INDEPENDENT_VERIFIER_ADDRESS } from '../../context/DemoNetworkContext';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { StatusChip } from '../../components/ui/StatusChip';

export default function AccountPage() {
  const {
    role,
    switchRole,
    initiator,
    updateInitiator,
    receiver,
    updateReceiver,
    wallet,
    bindConnectedWalletToRole,
    resetToGuidedDefaults,
  } = useDemoNetwork();
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Initiator local edit state
  const [initiatorName, setInitiatorName] = useState(initiator.name);
  const [agentName, setAgentName] = useState(initiator.agentName);
  const [spendingLimit, setSpendingLimit] = useState(initiator.spendingLimitMon);
  const [autoExec, setAutoExec] = useState(initiator.autoExecution);
  const [humanFallback, setHumanFallback] = useState(initiator.humanFallback);

  // Receiver local edit state
  const [receiverName, setReceiverName] = useState(receiver.name);
  const [location, setLocation] = useState(receiver.location);
  const [provides, setProvides] = useState(receiver.provides);

  const handleSaveInitiator = (e: React.FormEvent) => {
    e.preventDefault();
    updateInitiator({
      name: initiatorName,
      agentName,
      spendingLimitMon: spendingLimit,
      autoExecution: autoExec,
      humanFallback,
    });
    setSaveMessage('Initiator policy parameters saved.');
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const handleSaveReceiver = (e: React.FormEvent) => {
    e.preventDefault();
    updateReceiver({
      name: receiverName,
      location,
      provides,
    });
    setSaveMessage('Receiver profile saved.');
    setTimeout(() => setSaveMessage(null), 3000);
  };

  return (
    <div className="py-6 sm:py-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
            Account
          </h1>
          <p className="text-sm text-text-secondary">
            Wallet, network, and profile settings.
          </p>
        </div>

        {/* Perspective Toggle */}
        <div className="flex items-center p-1 rounded-control bg-surface-elevated border border-border text-xs shrink-0">
          <span className="px-2 text-text-tertiary font-medium">Perspective:</span>
          <button
            onClick={() => switchRole('INITIATOR')}
            className={`px-3 py-1.5 rounded-[6px] font-medium transition ${
              role === 'INITIATOR'
                ? 'bg-accent text-white shadow-subtle'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Buyer
          </button>
          <button
            onClick={() => switchRole('RECEIVER')}
            className={`px-3 py-1.5 rounded-[6px] font-medium transition ${
              role === 'RECEIVER'
                ? 'bg-accent text-white shadow-subtle'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Seller
          </button>
        </div>
      </div>

      {saveMessage && (
        <div className="p-3 rounded-control bg-status-success/10 border border-status-success/30 text-status-success text-xs flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* Disconnected State */}
      {!wallet.isConnected ? (
        <Card className="p-5 bg-surface border-border space-y-3">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-text-primary">
              Wallet not connected
            </h2>
            <p className="text-xs text-text-secondary leading-relaxed">
              Connect your Monad wallet to view account balance, network credentials, and role policies.
            </p>
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
      ) : (
        /* Connected Account Card */
        <Card className="p-5 space-y-4">
          <CardHeader
            title="Active Session"
            subtitle="Monad Metropolis Testnet (Chain ID 10143)"
            action={
              <StatusChip
                status={wallet.isMonadTestnet ? 'success' : 'warning'}
                size="sm"
                label={wallet.isMonadTestnet ? 'Monad Testnet' : 'Wrong Chain'}
              />
            }
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-control bg-surface-elevated/60 border border-border space-y-1">
              <span className="text-text-tertiary block text-[11px]">Wallet Address</span>
              <div className="font-mono text-text-primary text-xs break-all">
                {wallet.address}
              </div>
            </div>

            <div className="p-3 rounded-control bg-surface-elevated/60 border border-border space-y-1">
              <span className="text-text-tertiary block text-[11px]">Balance</span>
              <div className="font-mono font-bold text-text-primary text-sm">
                {wallet.balanceMon ? `${wallet.balanceMon} MON` : '0.0000 MON'}
              </div>
            </div>

            <div className="p-3 rounded-control bg-surface-elevated/60 border border-border space-y-1">
              <span className="text-text-tertiary block text-[11px]">Active Role</span>
              <div className="font-semibold text-text-primary text-sm">
                {role === 'INITIATOR' ? 'Buyer (Initiator)' : 'Seller (Receiver)'}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => bindConnectedWalletToRole()}
            >
              Bind account to {role === 'INITIATOR' ? 'Buyer' : 'Seller'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => resetToGuidedDefaults()}
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              Reset defaults
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => wallet.disconnect()}
              className="text-status-error hover:text-status-error"
            >
              Disconnect
            </Button>
          </div>
        </Card>
      )}

      {/* Role Profile & Settings Form */}
      <Card className="p-5 space-y-5">
        <CardHeader
          title={role === 'INITIATOR' ? 'Buyer Policy Configuration' : 'Seller Fulfillment Profile'}
          subtitle={
            role === 'INITIATOR'
              ? 'Configure commercial purchasing parameters and spending caps'
              : 'Configure supplier identity and fulfillment depot location'
          }
        />

        {role === 'INITIATOR' ? (
          <form onSubmit={handleSaveInitiator} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Entity / Organization Name"
                value={initiatorName}
                onChange={(e) => setInitiatorName(e.target.value)}
              />
              <Input
                label="Authorized AI Agent Name"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Max Spending Cap Per Transaction (MON)"
                value={spendingLimit}
                onChange={(e) => setSpendingLimit(e.target.value)}
              />
              <div className="p-3.5 rounded-control bg-surface-elevated/40 border border-border space-y-1">
                <span className="text-[11px] text-text-tertiary block">Designated Verifier</span>
                <div className="font-mono text-xs text-text-secondary truncate">
                  {INDEPENDENT_VERIFIER_ADDRESS}
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button type="submit" variant="primary" size="md">
                Save policy parameters
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSaveReceiver} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Supplier Organization Name"
                value={receiverName}
                onChange={(e) => setReceiverName(e.target.value)}
              />
              <Input
                label="Fulfillment Depot / Hub Location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            <Input
              label="Accredited Capabilities &amp; Services"
              value={provides}
              onChange={(e) => setProvides(e.target.value)}
            />

            <div className="pt-2 flex justify-end">
              <Button type="submit" variant="primary" size="md">
                Save seller profile
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
