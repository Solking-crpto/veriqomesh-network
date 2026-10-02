'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  Plus,
  Trash2,
  Shield,
  Sparkles,
  AlertCircle,
  FileText,
  Lock,
} from 'lucide-react';
import {
  useDemoNetwork,
  TARGET_BUYER_ADDRESS,
  TARGET_SELLER_ADDRESS,
  INDEPENDENT_VERIFIER_ADDRESS,
  APPROVED_OPERATOR_VERIFIER_ADDRESS,
} from '../../../context/DemoNetworkContext';
import {
  generateFreshTransactionId,
  computeCanonicalAgreementHash,
  serializeCanonicalAgreement,
  isWalletCompatibleWithRole,
  type CanonicalAgreementTerms,
} from '../../../lib/invitation-utils';
import { Button } from '../../../components/ui/Button';
import { Card, CardHeader } from '../../../components/ui/Card';
import { Input, Textarea } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { StatusChip } from '../../../components/ui/StatusChip';

export default function CreateIntentPage() {
  const router = useRouter();
  const { initiator, createDealRequest, wallet, client } = useDemoNetwork();

  // Natural Language Commercial Need — Empty by default for real user
  const [promptText, setPromptText] = useState('');

  // Structured Agreement Parameters — Genuinely editable, empty by default
  const [agreementTitle, setAgreementTitle] = useState('');
  const [deliverable, setDeliverable] = useState('');
  const [location, setLocation] = useState('');
  const [escrowAmount, setEscrowAmount] = useState('');
  const [deadlineDays, setDeadlineDays] = useState<number>(14);

  // Counterparty (Receiver) — Empty by default
  const [receiverWallet, setReceiverWallet] = useState('');
  const [receiverName, setReceiverName] = useState('');

  // Designated Independent Verifier
  const [verifierWallet, setVerifierWallet] = useState(
    INDEPENDENT_VERIFIER_ADDRESS || APPROVED_OPERATOR_VERIFIER_ADDRESS
  );

  // Evidence Requirements Checklist
  const [evidenceRequirements, setEvidenceRequirements] = useState<string[]>([
    'Signed Delivery Waybill / Acceptance Proof',
    'Geotagged Photo / Asset Verification',
    'Independent Inspection Attestation',
  ]);
  const [newRequirementInput, setNewRequirementInput] = useState('');

  // Additional Commercial Conditions
  const [additionalConditions, setAdditionalConditions] = useState('');

  // UI Flow State: false = Edit form, true = Explicit Review Screen
  const [isReviewing, setIsReviewing] = useState(false);

  // Creation outcome state
  const [createdRequestId, setCreatedRequestId] = useState<string | null>(null);
  const [createdTxId, setCreatedTxId] = useState<string | null>(null);
  const [createdInvitationCode, setCreatedInvitationCode] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Monad Testnet Broadcast State
  const [broadcastOnchain, setBroadcastOnchain] = useState(true);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastError, setBroadcastError] = useState<string | null>(null);
  const [broadcastTxHash, setBroadcastTxHash] = useState<string | null>(null);
  const [persistenceWarning, setPersistenceWarning] = useState<string | null>(null);

  // Dynamic participant binding & invariant validation
  const buyerAddress = wallet.address || initiator.wallet || TARGET_BUYER_ADDRESS;
  const sellerAddress = receiverWallet.trim();
  const designatedVerifier = verifierWallet.trim();

  const isBuyerValid = ethers.isAddress(buyerAddress);
  const isSellerValid = ethers.isAddress(sellerAddress);
  const isVerifierValid = ethers.isAddress(designatedVerifier) && designatedVerifier !== ethers.ZeroAddress;

  const isBuyerSellerConflict =
    isBuyerValid && isSellerValid && buyerAddress.toLowerCase() === sellerAddress.toLowerCase();
  const isBuyerVerifierConflict =
    isBuyerValid && isVerifierValid && buyerAddress.toLowerCase() === designatedVerifier.toLowerCase();
  const isSellerVerifierConflict =
    isSellerValid && isVerifierValid && sellerAddress.toLowerCase() === designatedVerifier.toLowerCase();

  const hasParticipantConflict =
    isBuyerSellerConflict || isBuyerVerifierConflict || isSellerVerifierConflict;

  // Single Source of Truth: Canonical Agreement Schema
  const canonicalAgreement: CanonicalAgreementTerms = useMemo(() => {
    return {
      version: '1.0',
      naturalLanguageNeed: promptText.trim(),
      structuredParameters: {
        title: agreementTitle.trim() || 'Commercial Agreement',
        deliverable: deliverable.trim() || promptText.trim(),
        amountMon: escrowAmount.trim() || '0',
        asset: 'MON',
        deadlineDays: Number(deadlineDays) || 14,
        receiverWallet: sellerAddress,
        verifierAddress: designatedVerifier,
        evidenceRequirements: evidenceRequirements.filter((r) => r.trim().length > 0),
        location: location.trim() || undefined,
        additionalConditions: additionalConditions.trim() || undefined,
      },
    };
  }, [
    promptText,
    agreementTitle,
    deliverable,
    escrowAmount,
    deadlineDays,
    sellerAddress,
    designatedVerifier,
    evidenceRequirements,
    location,
    additionalConditions,
  ]);

  // Deterministic Terms Hash committed onchain
  const currentTermsHash = useMemo(() => {
    return computeCanonicalAgreementHash(canonicalAgreement);
  }, [canonicalAgreement]);

  // Field-level validations
  const validationErrors = useMemo(() => {
    const errs: string[] = [];
    if (!promptText.trim()) {
      errs.push('Commercial need is required.');
    } else if (promptText.trim().length < 10) {
      errs.push('Commercial need must be at least 10 characters.');
    }
    if (!agreementTitle.trim()) {
      errs.push('Agreement title is required.');
    }
    if (!deliverable.trim()) {
      errs.push('Deliverable scope is required.');
    }
    if (!sellerAddress) {
      errs.push('Receiver wallet address is required.');
    } else if (!isSellerValid) {
      errs.push('Receiver wallet must be a valid Ethereum address (0x...).');
    }
    if (!designatedVerifier) {
      errs.push('Verifier wallet address is required.');
    } else if (!isVerifierValid) {
      errs.push('Verifier wallet must be a valid non-zero Ethereum address (0x...).');
    }
    const numAmount = parseFloat(escrowAmount);
    if (!escrowAmount.trim() || isNaN(numAmount) || numAmount <= 0) {
      errs.push('Escrow amount must be greater than zero.');
    }
    if (!deadlineDays || deadlineDays < 1) {
      errs.push('Delivery / inspection window must be at least 1 day.');
    }
    if (evidenceRequirements.filter((r) => r.trim().length > 0).length === 0) {
      errs.push('At least one evidence requirement is required.');
    }
    return errs;
  }, [
    promptText,
    agreementTitle,
    deliverable,
    sellerAddress,
    isSellerValid,
    designatedVerifier,
    isVerifierValid,
    escrowAmount,
    deadlineDays,
    evidenceRequirements,
  ]);

  const isValidForReview = validationErrors.length === 0 && !hasParticipantConflict;

  const initiatorCompatibility = useMemo(() => {
    return isWalletCompatibleWithRole({
      role: 'INITIATOR',
      connectedWallet: wallet.address,
      isConnected: wallet.isConnected,
      designatedInitiator: buyerAddress,
    });
  }, [wallet.address, wallet.isConnected, buyerAddress]);

  // Evidence Checklist Helpers
  const handleAddRequirement = () => {
    const trimmed = newRequirementInput.trim();
    if (trimmed && !evidenceRequirements.includes(trimmed)) {
      setEvidenceRequirements([...evidenceRequirements, trimmed]);
      setNewRequirementInput('');
    }
  };

  const handleRemoveRequirement = (idx: number) => {
    setEvidenceRequirements(evidenceRequirements.filter((_, i) => i !== idx));
  };

  // Submission handler
  const handleAuthorizeTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setBroadcastError(null);
    setPersistenceWarning(null);

    if (validationErrors.length > 0) {
      setBroadcastError(`Validation Error: ${validationErrors[0]}`);
      return;
    }

    if (hasParticipantConflict) {
      if (isBuyerSellerConflict) {
        setBroadcastError('Participant conflict: Connected wallet (Buyer) cannot equal Seller.');
      } else if (isBuyerVerifierConflict) {
        setBroadcastError('Participant conflict: Buyer cannot equal Verifier.');
      } else if (isSellerVerifierConflict) {
        setBroadcastError('Participant conflict: Seller cannot equal Verifier.');
      }
      return;
    }

    if (broadcastOnchain) {
      if (!wallet.isConnected) {
        setBroadcastError('Please connect your browser wallet (MetaMask) to broadcast to Monad Testnet.');
        return;
      }
      if (!wallet.isMonadTestnet) {
        setBroadcastError('Please switch your wallet network to Monad Metropolis Testnet (Chain ID 10143).');
        return;
      }
      if (!initiatorCompatibility.isCompatible) {
        setBroadcastError(initiatorCompatibility.message);
        return;
      }

      setIsBroadcasting(true);
      let newTxId = '';
      let txHash = '';

      try {
        newTxId = generateFreshTransactionId(buyerAddress, 'DEAL_' + Date.now());
        const termsHash = currentTermsHash;
        const amountWei = ethers.parseEther(escrowAmount.trim()).toString();
        const deadlineEpoch = Math.floor(Date.now() / 1000) + deadlineDays * 86400;

        txHash = await client.createTransactionWithVerifier({
          transactionId: newTxId,
          seller: sellerAddress,
          verifier: designatedVerifier,
          amountWei,
          fulfillmentDeadline: deadlineEpoch,
          termsHash,
          fundImmediately: false,
        });

        const receipt = await client.waitForConfirmation(txHash);
        if (!receipt || receipt.status !== 1) {
          throw new Error(`Transaction reverted on Monad Testnet (hash: ${txHash}). Execution failed in block ${receipt?.blockNumber ?? 'unknown'}.`);
        }

        const onTx = await client.getOnchainTransaction(newTxId);
        if (!onTx || onTx.buyer === ethers.ZeroAddress) {
          throw new Error('State verification failed: onchain transaction was not initialized.');
        }

        setCreatedTxId(newTxId);
        setBroadcastTxHash(txHash);

        // Persist invitation to server-side Upstash Redis store
        try {
          const invRes = await fetch('/api/invitations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              initiatorWallet: buyerAddress,
              intendedReceiverWallet: sellerAddress,
              proposal: {
                title: agreementTitle.trim(),
                description: promptText.trim(),
                amount: escrowAmount.trim(),
                asset: 'MON',
                deadlineDays: Number(deadlineDays),
                termsText: serializeCanonicalAgreement(canonicalAgreement),
                termsHash,
                evidenceRequirements: canonicalAgreement.structuredParameters.evidenceRequirements,
                canonicalAgreement,
                location: location.trim() || undefined,
                additionalConditions: additionalConditions.trim() || undefined,
              },
              roles: {
                buyer: buyerAddress,
                seller: sellerAddress,
                verifier: designatedVerifier,
              },
              transactionId: newTxId,
              onchainTxHash: txHash,
            }),
          });
          const invData = await invRes.json();
          if (invData.success && invData.invitationCode) {
            setCreatedInvitationCode(invData.invitationCode);
          } else {
            setPersistenceWarning(
              `Notice: Monad onchain transaction succeeded (${txHash.slice(0, 10)}...), but offchain invitation persistence failed: ${invData.error || 'Server error'}. The deal is active onchain.`
            );
          }
        } catch (invErr) {
          console.error('Failed to persist invitation to Redis:', invErr);
          setPersistenceWarning(
            `Notice: Monad onchain transaction succeeded (${txHash.slice(0, 10)}...), but offchain invitation could not be reached. The deal is active onchain.`
          );
        }

        const newId = createDealRequest(
          receiverName || 'Custom Counterparty',
          sellerAddress,
          true,
          newTxId,
          txHash,
          designatedVerifier,
          {
            title: agreementTitle.trim(),
            deliverable: deliverable.trim(),
            location: location.trim(),
            escrowAmountMon: escrowAmount.trim(),
            deadlineDays: Number(deadlineDays),
            evidenceRequirements: canonicalAgreement.structuredParameters.evidenceRequirements,
            canonicalAgreement,
            naturalLanguageNeed: promptText.trim(),
          }
        );
        setCreatedRequestId(newId);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Transaction was rejected or failed on Monad';
        setBroadcastError(msg);
      } finally {
        setIsBroadcasting(false);
      }
    } else {
      // Sandbox Demo Mode
      const freshTxId = generateFreshTransactionId(buyerAddress, 'SANDBOX_' + Date.now());
      const newId = createDealRequest(
        receiverName || 'Custom Counterparty',
        sellerAddress || TARGET_SELLER_ADDRESS,
        false,
        freshTxId,
        undefined,
        designatedVerifier,
        {
          title: agreementTitle.trim() || 'Commercial Proposal (Sandbox)',
          deliverable: deliverable.trim() || promptText.trim(),
          location: location.trim(),
          escrowAmountMon: escrowAmount.trim() || '0.001',
          deadlineDays: Number(deadlineDays),
          evidenceRequirements: canonicalAgreement.structuredParameters.evidenceRequirements,
          canonicalAgreement,
          naturalLanguageNeed: promptText.trim(),
        }
      );
      setCreatedRequestId(newId);
      setCreatedTxId(freshTxId);

      // Persist sandbox proposal to Redis
      try {
        const invRes = await fetch('/api/invitations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            initiatorWallet: buyerAddress,
            intendedReceiverWallet: sellerAddress || TARGET_SELLER_ADDRESS,
            proposal: {
              title: agreementTitle.trim() || 'Commercial Proposal (Sandbox)',
              description: promptText.trim(),
              amount: escrowAmount.trim() || '0.001',
              asset: 'MON',
              deadlineDays: Number(deadlineDays),
              termsText: serializeCanonicalAgreement(canonicalAgreement),
              termsHash: currentTermsHash,
              evidenceRequirements: canonicalAgreement.structuredParameters.evidenceRequirements,
              canonicalAgreement,
              location: location.trim() || undefined,
              additionalConditions: additionalConditions.trim() || undefined,
            },
            roles: {
              buyer: buyerAddress,
              seller: sellerAddress || TARGET_SELLER_ADDRESS,
              verifier: designatedVerifier,
            },
            transactionId: freshTxId,
          }),
        });
        const invData = await invRes.json();
        if (invData.success && invData.invitationCode) {
          setCreatedInvitationCode(invData.invitationCode);
        }
      } catch (invErr) {
        console.error('Failed to persist sandbox invitation to Redis:', invErr);
      }
    }
  };

  const shareUrl =
    typeof window !== 'undefined' && createdInvitationCode
      ? `${window.location.origin}/receive/${createdInvitationCode}`
      : createdInvitationCode
      ? `/receive/${createdInvitationCode}`
      : '';

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b border-border pb-6">
        <div className="flex items-center gap-2 mb-1.5">
          <Badge variant="accent">BUYER WORKSPACE</Badge>
          <span className="text-xs text-text-tertiary">Step 1 of 2</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
          Create Commercial Agreement
        </h1>
        <p className="text-xs sm:text-sm text-text-secondary mt-1">
          Define commercial deliverables in plain language; VeriqoMesh structures verifiable parameters into a deterministic canonical agreement on Monad.
        </p>
      </div>

      {/* Success Notification Banner */}
      {createdRequestId && (
        <Card variant="elevated" className="space-y-5 border-status-success/30 bg-surface">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-status-success/20 text-status-success flex items-center justify-center shrink-0">
              <Check className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-bold text-text-primary">
                {createdTxId && broadcastTxHash
                  ? 'Agreement Initialized on Monad Testnet'
                  : 'Proposal Created Successfully'}
              </h3>
              <p className="text-xs sm:text-sm text-text-secondary">
                {createdTxId && broadcastTxHash
                  ? `Onchain transaction confirmed on Monad Metropolis Testnet (Chain ID 10143) with escrow commitment of ${escrowAmount} MON.`
                  : 'Proposal persisted to database. Share the invitation code with your counterparty to proceed.'}
              </p>
            </div>
          </div>

          {persistenceWarning && (
            <div className="p-3 rounded-control bg-status-warning/10 border border-status-warning/30 text-status-warning text-xs">
              {persistenceWarning}
            </div>
          )}

          {/* Invitation Code Display */}
          {createdInvitationCode && (
            <div className="p-4 rounded-control bg-surface-elevated border border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Counterparty Invitation Code
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(createdInvitationCode);
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 2000);
                  }}
                  leftIcon={copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                >
                  {copiedCode ? 'Copied' : 'Copy code'}
                </Button>
              </div>

              <div className="font-mono text-2xl sm:text-3xl font-black text-text-primary tracking-widest py-1">
                {createdInvitationCode}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border text-xs">
                <span className="text-text-tertiary">Shareable URL:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-text-secondary truncate max-w-xs">{shareUrl}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (shareUrl) {
                        navigator.clipboard.writeText(shareUrl);
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2000);
                      }
                    }}
                  >
                    {copiedLink ? 'Copied' : 'Copy URL'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Action Links */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {createdInvitationCode && (
              <Link href={`/receive/${createdInvitationCode}`}>
                <Button variant="primary" size="md" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Open Receiver View
                </Button>
              </Link>
            )}
            {createdTxId && (
              <Link href={`/transactions/${createdTxId}`}>
                <Button variant="secondary" size="md">
                  Enter Transaction Room
                </Button>
              </Link>
            )}
            <Link href="/requests">
              <Button variant="ghost" size="md">
                View Requests Inbox
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Main Form Body */}
      <form onSubmit={handleAuthorizeTransaction} className="space-y-8">
        {!isReviewing ? (
          /* STEP 1: FORM INPUTS */
          <div className="space-y-6">
            {/* Commercial Need */}
            <Card className="space-y-4">
              <CardHeader
                title="1. Commercial Need"
                subtitle="Describe what you are purchasing, procuring, or agreeing to in plain language"
              />
              <Textarea
                id="commercial-need"
                rows={4}
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder="e.g. Supply and delivery of 100 Tier-1 bifacial solar PV modules (550W) to Dallas freight warehouse, with verified bill of lading and independent inspection attestation..."
                helperText="Minimum 10 characters. VeriqoMesh will bind this intent into the deterministic canonical agreement."
              />
            </Card>

            {/* Structured Parameters */}
            <Card className="space-y-5">
              <CardHeader
                title="2. Agreement Parameters"
                subtitle="Specify verifiable terms, delivery window, and escrow deposit"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Agreement Title"
                  value={agreementTitle}
                  onChange={(e) => setAgreementTitle(e.target.value)}
                  placeholder="e.g. Commercial Solar Procurement"
                  helperText="Human-readable title for the transaction"
                />

                <Input
                  label="Deliverable Scope"
                  value={deliverable}
                  onChange={(e) => setDeliverable(e.target.value)}
                  placeholder="e.g. 100 Solar Panels (550W)"
                  helperText="Brief summary of required goods or services"
                />

                <Input
                  label="Escrow Amount"
                  type="text"
                  value={escrowAmount}
                  onChange={(e) => setEscrowAmount(e.target.value)}
                  placeholder="0.001"
                  rightElement="MON"
                  helperText="Capital locked in Monad smart contract"
                />

                <Input
                  label="Delivery Window (Days)"
                  type="number"
                  min={1}
                  value={deadlineDays}
                  onChange={(e) => setDeadlineDays(parseInt(e.target.value) || 14)}
                  rightElement="days"
                  helperText="Days allowed before fulfillment expires"
                />
              </div>

              <Input
                label="Delivery Location / Destination"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Dallas Regional Logistics Hub, Bay 4"
                helperText="Physical or digital destination"
              />
            </Card>

            {/* Counterparty & Verifier */}
            <Card className="space-y-5">
              <CardHeader
                title="3. Participants &amp; Verification"
                subtitle="Designate the counterparty seller and the independent verification auditor"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Seller Wallet Address"
                  value={receiverWallet}
                  onChange={(e) => setReceiverWallet(e.target.value)}
                  placeholder="0x..."
                  error={
                    sellerAddress && !isSellerValid
                      ? 'Must be a valid Ethereum address'
                      : isBuyerSellerConflict
                      ? 'Buyer cannot equal Seller'
                      : undefined
                  }
                  helperText="Designated address authorized to sign this deal"
                />

                <Input
                  label="Seller Organization / Name"
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  placeholder="e.g. Dallas Solar Supply Co."
                  helperText="Display name for receipt records"
                />
              </div>

              <Input
                label="Designated Verifier Wallet Address"
                value={verifierWallet}
                onChange={(e) => setVerifierWallet(e.target.value)}
                placeholder="0x..."
                error={
                  designatedVerifier && !isVerifierValid
                    ? 'Must be a valid non-zero address'
                    : isBuyerVerifierConflict
                    ? 'Buyer cannot equal Verifier'
                    : isSellerVerifierConflict
                    ? 'Seller cannot equal Verifier'
                    : undefined
                }
                helperText="Independent inspector who attests PASS or INCONCLUSIVE before payout"
              />

              {/* Evidence Checklist */}
              <div className="space-y-3 pt-2 border-t border-border">
                <label className="block text-xs sm:text-sm font-medium text-text-primary">
                  Required Evidence Milestones
                </label>
                <div className="space-y-2">
                  {evidenceRequirements.map((req, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-control bg-surface-elevated border border-border text-xs"
                    >
                      <div className="flex items-center gap-2 text-text-primary">
                        <Check className="w-3.5 h-3.5 text-status-success shrink-0" />
                        <span>{req}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveRequirement(idx)}
                        className="text-text-tertiary hover:text-status-error p-1 transition"
                        title="Remove requirement"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={newRequirementInput}
                    onChange={(e) => setNewRequirementInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddRequirement();
                      }
                    }}
                    placeholder="Add custom evidence requirement..."
                    className="flex-1 bg-surface border border-border rounded-control text-xs px-3 py-2 text-text-primary focus:border-accent focus:outline-none"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleAddRequirement}
                  >
                    Add
                  </Button>
                </div>
              </div>
            </Card>

            {/* Additional Conditions */}
            <Card className="space-y-4">
              <CardHeader
                title="4. Additional Conditions (Optional)"
                subtitle="Governing terms, inspection criteria, or special provisions"
              />
              <Textarea
                rows={3}
                value={additionalConditions}
                onChange={(e) => setAdditionalConditions(e.target.value)}
                placeholder="e.g. Any damage over 5% requires immediate 3-judge mediation on Monad Metropolis..."
              />
            </Card>

            {/* Validation Errors Notice */}
            {validationErrors.length > 0 && (
              <div className="p-4 rounded-card bg-status-warning/10 border border-status-warning/30 text-xs text-status-warning space-y-1">
                <span className="font-semibold block">Please complete all required fields:</span>
                <ul className="list-disc list-inside space-y-0.5 text-text-secondary">
                  {validationErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Continue to Review Action */}
            <div className="flex justify-end pt-2">
              <Button
                type="button"
                variant="primary"
                size="lg"
                disabled={!isValidForReview}
                onClick={() => setIsReviewing(true)}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Review Agreement Terms
              </Button>
            </div>
          </div>
        ) : (
          /* STEP 2: REVIEW & COMMIT SCREEN */
          <div className="space-y-6">
            <Card className="space-y-6">
              <CardHeader
                title="Review Canonical Agreement"
                subtitle="Verify all parameters before signing and broadcasting to Monad Testnet"
                action={
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsReviewing(false)}
                    leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
                  >
                    Edit Form
                  </Button>
                }
              />

              {/* Natural Language Summary */}
              <div className="p-4 rounded-control bg-surface-elevated/60 border border-border space-y-1.5">
                <span className="text-xs font-semibold text-text-tertiary uppercase">Commercial Intent</span>
                <p className="text-sm text-text-primary leading-relaxed">{promptText}</p>
              </div>

              {/* Key Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-control bg-surface-elevated/40 border border-border space-y-1">
                  <span className="text-text-tertiary block">Title &amp; Deliverable</span>
                  <div className="font-semibold text-text-primary text-sm">{agreementTitle}</div>
                  <div className="text-text-secondary">{deliverable}</div>
                </div>

                <div className="p-3.5 rounded-control bg-surface-elevated/40 border border-border space-y-1">
                  <span className="text-text-tertiary block">Escrow Commitment</span>
                  <div className="font-bold text-status-success text-base">{escrowAmount} MON</div>
                  <div className="text-text-secondary">Window: {deadlineDays} days</div>
                </div>

                <div className="p-3.5 rounded-control bg-surface-elevated/40 border border-border space-y-1">
                  <span className="text-text-tertiary block">Buyer (Initiator)</span>
                  <div className="font-mono text-text-primary truncate">{buyerAddress}</div>
                </div>

                <div className="p-3.5 rounded-control bg-surface-elevated/40 border border-border space-y-1">
                  <span className="text-text-tertiary block">Seller (Counterparty)</span>
                  <div className="font-mono text-text-primary truncate">{sellerAddress}</div>
                  {receiverName && <div className="text-text-secondary">{receiverName}</div>}
                </div>
              </div>

              {/* Canonical Terms Hash */}
              <div className="p-4 rounded-control bg-surface-elevated border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-accent flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Canonical Agreement Hash</span>
                  </span>
                  <Badge variant="accent">keccak256</Badge>
                </div>
                <div className="font-mono text-xs text-text-primary break-all bg-surface p-2.5 rounded-control border border-border select-all">
                  {currentTermsHash}
                </div>
                <p className="text-[11px] text-text-tertiary">
                  Deterministic hash computed from serialized canonical terms. Both counterparties ratify this hash onchain.
                </p>
              </div>

              {/* Broadcast Options */}
              <div className="p-4 rounded-control bg-surface-elevated/50 border border-border flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-text-primary">
                    Broadcast to Monad Testnet
                  </div>
                  <div className="text-xs text-text-secondary">
                    Initializes an authoritative smart contract transaction on Chain ID 10143
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={broadcastOnchain}
                  onChange={(e) => setBroadcastOnchain(e.target.checked)}
                  className="w-4 h-4 accent-accent rounded cursor-pointer"
                />
              </div>

              {/* Broadcast Error */}
              {broadcastError && (
                <div className="p-4 rounded-card bg-status-error/10 border border-status-error/30 text-xs text-status-error flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{broadcastError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  onClick={() => setIsReviewing(false)}
                  leftIcon={<ArrowLeft className="w-4 h-4" />}
                >
                  Back to Edit
                </Button>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={isBroadcasting}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  {broadcastOnchain ? 'Sign & Commit to Monad' : 'Create Sandbox Proposal'}
                </Button>
              </div>
            </Card>
          </div>
        )}
      </form>
    </div>
  );
}
