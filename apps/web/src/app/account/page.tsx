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
import { Input, Textarea } from '../../components/ui/Input';
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
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="accent">GOVERNANCE &amp; PROFILE</Badge>
            <span className="text-xs text-text-tertiary">Monad Testnet</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
            Account &amp; Policy Controls
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Configure participant profiles, spending bounds, and autonomous agent delegation settings.
          </p>
        </div>

        {/* Perspective Toggle */}
        <div className="flex items-center p-1 rounded-control bg-surface-elevated border border-border text-xs">
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

      {/* Connected Wallet Account Card */}
      <Card className="space-y-4">
        <CardHeader
          title="Connected Account &amp; Environment"
          subtitle="Monad Metropolis Testnet (Chain ID 10143)"
          action={
            <StatusChip
              status={wallet.isConnected && wallet.isMonadTestnet ? 'success' : 'neutral'}
              label={wallet.isConnected ? (wallet.isMonadTestnet ? 'Monad Active' : 'Wrong Chain') : 'Disconnected'}
            />
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-control bg-surface-elevated/60 border border-border space-y-1">
            <span className="text-text-tertiary block">Account Address</span>
            <div className="font-mono text-text-primary text-xs break-all">
              {wallet.isConnected ? wallet.address : 'Wallet not connected'}
            </div>
          </div>

          <div className="p-3.5 rounded-control bg-surface-elevated/60 border border-border space-y-1">
            <span className="text-text-tertiary block">Account Balance</span>
            <div className="font-mono font-bold text-text-primary text-sm">
              {wallet.isConnected ? (wallet.balanceMon ? `${wallet.balanceMon} MON` : '0.0 MON') : '—'}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          {!wallet.isConnected ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => wallet.connect()}
              isLoading={wallet.isConnecting}
              leftIcon={<Wallet className="w-3.5 h-3.5" />}
            >
              Connect Wallet
            </Button>
          ) : (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => bindConnectedWalletToRole()}
              >
                Bind to Active Role ({role === 'INITIATOR' ? 'Buyer' : 'Seller'})
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => wallet.disconnect()}
              >
                Disconnect
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => resetToGuidedDefaults()}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Reset to Defaults
          </Button>
        </div>
      </Card>

      {/* Role Profile & Settings */}
      <Card className="space-y-6">
        <CardHeader
          title={role === 'INITIATOR' ? 'Buyer Policy Configuration' : 'Seller Fulfillment Profile'}
          subtitle={
            role === 'INITIATOR'
              ? 'Define programmatic spending boundaries and settlement rules for transactions'
              : 'Configure fulfillment supplier details, depot location, and service specifications'
          }
        />

        {role === 'INITIATOR' ? (
          <form onSubmit={handleSaveInitiator} className="space-y-5">
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
                label="Max Spending Cap Per Transaction"
                value={spendingLimit}
                onChange={(e) => setSpendingLimit(e.target.value)}
                rightElement="MON"
                helperText="Transactions above this threshold require human co-signature"
              />
              <Input
                label="Required Verification Node"
                disabled
                value={INDEPENDENT_VERIFIER_ADDRESS || 'Operator-Designated Independent Verifier'}
                helperText="Accredited physical inspection node"
              />
            </div>

            <div className="p-4 rounded-control bg-surface-elevated/40 border border-border space-y-3">
              <span className="text-xs font-semibold text-text-primary block">
                Policy Safeguards
              </span>

              <label className="flex items-start gap-3 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={autoExec}
                  onChange={(e) => setAutoExec(e.target.checked)}
                  className="w-4 h-4 rounded accent-accent mt-0.5"
                />
                <span className="text-text-secondary leading-relaxed">
                  <strong className="text-text-primary">Policy-Assisted Verification:</strong> Mark settlement eligible when verification outcome is attested <code className="text-status-success font-mono">PASS</code>. Onchain release of funds remains subject to cryptographic wallet authorization.
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={humanFallback}
                  onChange={(e) => setHumanFallback(e.target.checked)}
                  className="w-4 h-4 rounded accent-accent mt-0.5"
                />
                <span className="text-text-secondary leading-relaxed">
                  <strong className="text-text-primary">Human Adjudication Fallback:</strong> Automatically lock escrow and route to 3-judge human panel if verification outcome is <code className="text-status-warning font-mono">INCONCLUSIVE</code> or contested.
                </span>
              </label>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" variant="primary" size="md">
                Save Policy Configuration
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSaveReceiver} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Supplier / Organization Name"
                value={receiverName}
                onChange={(e) => setReceiverName(e.target.value)}
              />
              <Input
                label="Depot / Fulfillment Location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            <Textarea
              label="Commercial Capabilities &amp; Deliverables"
              rows={3}
              value={provides}
              onChange={(e) => setProvides(e.target.value)}
              helperText="Summary of goods, services, or technical capabilities offered"
            />

            <div className="flex justify-end pt-2">
              <Button type="submit" variant="primary" size="md">
                Save Seller Profile
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
