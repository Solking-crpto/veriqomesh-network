'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, ArrowLeft, KeyRound, Shield, CheckCircle2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';

export default function ReceiveLookupPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      setError('Please enter a valid invitation code.');
      return;
    }
    // Expected format: VM-XXXX-XXXX (or with -v2 suffix)
    if (!cleanCode.startsWith('VM-')) {
      setError('Invitation code must start with "VM-" (e.g. VM-A8B2-9C1D).');
      return;
    }
    setError(null);
    router.push(`/receive/${cleanCode}`);
  };

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <Badge variant="accent" className="mx-auto">
          COUNTERPARTY INVITATION PORTAL
        </Badge>
        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
          Receive &amp; Review Proposal
        </h1>
        <p className="text-xs sm:text-sm text-text-secondary max-w-md mx-auto">
          Enter your VeriqoMesh invitation code to review commercial terms, inspect evidence requirements, and sign bilateral agreements on Monad Testnet.
        </p>
      </div>

      {/* Lookup Card */}
      <Card variant="elevated" className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              label="Invitation Code"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setError(null);
              }}
              placeholder="e.g. VM-B7X9-K2M4"
              helperText="The initiator shared this 8-character alphanumeric code with you."
              error={error || undefined}
              leftIcon={<KeyRound className="w-4 h-4 text-text-tertiary" />}
              className="font-mono text-base tracking-wider uppercase"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Access Commercial Proposal
          </Button>
        </form>

        {/* Quick Info Box */}
        <div className="p-4 rounded-control bg-surface border border-border space-y-2 text-xs">
          <div className="text-text-primary font-medium text-[11px] flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-accent" />
            <span>How VeriqoMesh Counterparty Ratification Works</span>
          </div>
          <ul className="text-text-secondary text-[11px] space-y-1.5 list-disc list-inside">
            <li>
              <strong className="text-text-primary">Cross-device persistence:</strong> Invitations are stored offchain and resolved globally by code.
            </li>
            <li>
              <strong className="text-text-primary">Authoritative onchain escrow:</strong> Acceptance invokes <code className="font-mono text-accent">agreeTransaction()</code> on the Monad Testnet.
            </li>
            <li>
              <strong className="text-text-primary">Role isolation:</strong> Only the designated counterparty wallet address can sign the agreement.
            </li>
          </ul>
        </div>
      </Card>

      {/* Back Link */}
      <div className="text-center">
        <Link
          href="/requests"
          className="text-xs text-text-secondary hover:text-text-primary transition inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>View All Requests in Receiver Inbox</span>
        </Link>
      </div>
    </div>
  );
}
