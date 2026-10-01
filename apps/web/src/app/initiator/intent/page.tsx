'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
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

export default function CreateIntentPage() {
  const router = useRouter();
  const { initiator, createDealRequest, switchRole, wallet, client } = useDemoNetwork();

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
  const isVerifierZero = designatedVerifier === ethers.ZeroAddress;

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

  const canBroadcast =
    !broadcastOnchain ||
    (wallet.isConnected &&
      wallet.isMonadTestnet &&
      initiatorCompatibility.isCompatible &&
      isValidForReview &&
      !isBroadcasting);

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

  // Helper to load canonical benchmark demo scenario
  const handleLoadDemoBenchmark = () => {
    setPromptText(
      'Supply and deliver 2 solar panels to the buyer. Seller provides product serial numbers, delivery evidence and installation/site evidence.'
    );
    setAgreementTitle('Tier-1 Commercial Solar Panel Procurement (100x 550W)');
    setDeliverable('100x Tier-1 Monocrystalline Solar Panels (550W Bifacial)');
    setLocation('Dallas Distribution Depot, Dallas, Texas');
    setEscrowAmount('0.001');
    setDeadlineDays(14);
    setReceiverWallet(TARGET_SELLER_ADDRESS);
    setReceiverName('Dallas Solar Supply Co.');
    setVerifierWallet(APPROVED_OPERATOR_VERIFIER_ADDRESS);
    setEvidenceRequirements([
      'Carrier Waybill (Signed delivery proof)',
      'Geotagged Delivery Photo & Unboxing',
      'Serial Number Manifest (2 Solar Panel PV Serials)',
      'Installation / Site Placement Verification',
    ]);
    setAdditionalConditions('Inspection within 14 days before release of funds.');
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
    <div className="min-h-screen bg-[#07080d] text-gray-100 py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between text-xs font-mono text-gray-400">
          <div className="flex items-center gap-2">
            <Link href="/initiator" className="hover:text-purple-300">Initiator Dashboard</Link>
            <span>/</span>
            <span className="text-purple-400 font-bold">Create Commercial Deal</span>
          </div>
          {/* Benchmark Demo Preset Shortcut */}
          <button
            type="button"
            onClick={handleLoadDemoBenchmark}
            className="text-[11px] text-gray-400 hover:text-purple-300 underline font-mono flex items-center gap-1"
          >
            <span>⚡ Load Benchmark Demo Preset</span>
          </button>
        </div>

        {/* Header */}
        <div className="border-b border-gray-800 pb-5">
          <div className="text-xs font-mono text-purple-400 font-bold uppercase tracking-wider mb-1">
            STEP 1 • SPECIFY COMMERCIAL NEED &amp; PARAMETERIZE TERMS
          </div>
          <h1 className="text-3xl font-extrabold text-white">Create Commercial Deal</h1>
          <p className="text-xs sm:text-sm text-gray-400 font-mono mt-1">
            Describe what you need in natural language; VeriqoMesh structures verifiable parameters into a deterministic canonical agreement committed onchain.
          </p>
        </div>

        {/* Success Modal / Shareable Invitation Banner */}
        {createdRequestId && (
          <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/90 to-purple-950/80 border border-emerald-500 shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-emerald-500 text-black flex items-center justify-center font-bold text-lg">
                ✓
              </span>
              <div>
                <h3 className="text-lg font-bold text-white font-mono">
                  {createdTxId && broadcastTxHash
                    ? 'Live Monad Testnet Transaction Initialized!'
                    : 'Deal Invitation Created Successfully!'}
                </h3>
                <p className="text-xs text-gray-300 font-mono">
                  {createdTxId && broadcastTxHash
                    ? `Authoritative onchain record broadcast to Monad Metropolis Testnet (Chain ID 10143). Escrow deposit required: ${escrowAmount} MON.`
                    : 'Proposal stored in persistent database. Share the invitation code with your counterparty.'}
                </p>
              </div>
            </div>

            {/* Persistence Warning if offchain Redis failed */}
            {persistenceWarning && (
              <div className="p-3 bg-amber-950/70 border border-amber-600 rounded-lg text-amber-200 text-xs font-mono">
                {persistenceWarning}
              </div>
            )}

            {/* THREE-TIER IDENTIFIER SEPARATION CARD */}
            <div className="p-4 bg-black/70 rounded-xl border border-emerald-600/70 font-mono text-xs space-y-3">
              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider border-b border-gray-800 pb-1">
                Transaction Identification &amp; Counterparty Sharing
              </div>

              {/* 1. Human Invitation Code */}
              {createdInvitationCode && (
                <div className="p-3 rounded-lg bg-purple-950/60 border border-purple-600/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-purple-300 font-bold text-[11px]">
                      1. HUMAN INVITATION CODE (SHARE WITH COUNTERPARTY):
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(createdInvitationCode);
                        setCopiedCode(true);
                        setTimeout(() => setCopiedCode(false), 2000);
                      }}
                      className="px-2.5 py-0.5 rounded bg-purple-700 hover:bg-purple-600 text-white font-bold text-[10px] transition"
                    >
                      {copiedCode ? 'COPIED ✓' : 'COPY CODE'}
                    </button>
                  </div>
                  <div className="text-2xl font-black text-white tracking-widest">
                    {createdInvitationCode}
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-purple-900/60 text-[11px]">
                    <span className="text-gray-400">Shareable Link:</span>
                    <div className="flex items-center gap-2">
                      <code className="text-purple-200">{shareUrl}</code>
                      <button
                        onClick={() => {
                          if (shareUrl) {
                            navigator.clipboard.writeText(shareUrl);
                            setCopiedLink(true);
                            setTimeout(() => setCopiedLink(false), 2000);
                          }
                        }}
                        className="text-emerald-400 hover:text-emerald-300 font-bold"
                      >
                        {copiedLink ? '✓ Copied' : 'Copy URL'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Escrow Smart Contract bytes32 Transaction ID */}
              {createdTxId && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-1 border-t border-gray-800 text-[11px]">
                  <span className="text-gray-400 font-bold">2. ESCROW BYTES32 ID (SMART CONTRACT):</span>
                  <code className="text-emerald-300 font-bold break-all">{createdTxId}</code>
                </div>
              )}

              {/* 3. EVM Blockchain Transaction Hash */}
              {broadcastTxHash && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-1 border-t border-gray-800 text-[11px]">
                  <span className="text-gray-400 font-bold">3. EVM TRANSACTION HASH:</span>
                  <a
                    href={`https://testnet.monadvision.com/tx/${broadcastTxHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 underline font-bold break-all"
                  >
                    {broadcastTxHash} ↗
                  </a>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-gray-800 text-[11px]">
                <div>
                  <span className="text-gray-400">Buyer (Initiator): </span>
                  <code className="text-gray-200">{buyerAddress}</code>
                </div>
                <div>
                  <span className="text-gray-400">Seller (Counterparty): </span>
                  <code className="text-gray-200">{sellerAddress}</code>
                </div>
              </div>
            </div>

            <div className="p-3 bg-black/40 rounded-xl border border-emerald-600/40 text-xs font-mono space-y-1">
              <div className="text-emerald-300 font-semibold">
                Counterparty Interaction Flow:
              </div>
              <p className="text-gray-300">
                Send the invitation link or code to the counterparty. When they open <code className="text-purple-300">/receive/{createdInvitationCode || 'CODE'}</code>, they can review the terms, connect their designated wallet, and sign the agreement onchain via <code className="text-emerald-300">agreeTransaction()</code>.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              {createdInvitationCode && (
                <Link
                  href={`/receive/${createdInvitationCode}`}
                  className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-600 hover:to-indigo-500 text-white font-mono text-xs font-bold transition shadow-lg flex items-center gap-2"
                >
                  <span>OPEN /RECEIVE/{createdInvitationCode}</span>
                  <span>→</span>
                </Link>
              )}
              {createdTxId && (
                <Link
                  href={`/transactions/${createdTxId}`}
                  className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-black font-mono text-xs font-bold transition shadow-lg flex items-center gap-2"
                >
                  <span>ENTER TRANSACTION ROOM</span>
                  <span>→</span>
                </Link>
              )}
              <Link
                href="/requests"
                className="py-2.5 px-4 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-200 font-mono text-xs font-bold transition"
              >
                Go to Requests Inbox
              </Link>
            </div>
          </div>
        )}

        {/* Institutional Principle Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-gray-900 border border-purple-800/40 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-widest text-purple-300 font-bold">
              Core Architecture Principle
            </span>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/70 border border-emerald-800 px-2 py-0.5 rounded">
              Zero Autonomous Financial Authority
            </span>
          </div>
          <div className="text-sm font-semibold text-white font-sans">
            &ldquo;AI assists. Humans authorize. Verifiers verify. Blockchain enforces.&rdquo;
          </div>
          <p className="text-[11px] text-gray-400 font-mono leading-relaxed">
            AI structures commercial parameters and policies. Only the authorized human wallet can sign transactions and allocate financial escrow capital on Monad Metropolis.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleAuthorizeTransaction} className="space-y-6">
          {!isReviewing ? (
            /* STAGE 1: EDIT FORM */
            <div className="space-y-6">
              {/* 1. Natural Language Commercial Need */}
              <div className="p-5 rounded-2xl bg-gray-900/60 border border-gray-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label htmlFor="commercial-need" className="text-xs font-mono font-bold text-purple-300 uppercase tracking-wide flex items-center gap-2">
                    <span>Natural Language Commercial Need</span>
                    <span className="text-[10px] text-purple-400 font-normal">(Initiator Input)</span>
                  </label>
                  <span className="text-[10px] font-mono text-purple-400 bg-purple-950 px-2 py-0.5 rounded border border-purple-800">
                    Editable Field
                  </span>
                </div>
                <textarea
                  id="commercial-need"
                  rows={4}
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  className="w-full p-3.5 rounded-xl bg-gray-950 border border-gray-700 text-white font-mono text-xs focus:border-purple-500 focus:outline-none leading-relaxed placeholder-gray-600"
                  placeholder="Describe what you are purchasing, selling, hiring, delivering, or otherwise agreeing to..."
                />
                <div className="text-[11px] text-gray-400 font-mono flex items-center justify-between">
                  <span>Describe the commercial outcome you want the counterparty to agree to. Be specific about the deliverable, expectations, and relevant constraints.</span>
                  <span className={`text-[10px] ${promptText.trim().length >= 10 ? 'text-emerald-400' : 'text-gray-500'}`}>
                    {promptText.trim().length} chars
                  </span>
                </div>
              </div>

              {/* 2. Structured Agreement Parameters */}
              <div className="p-5 rounded-2xl bg-gray-900/60 border border-gray-800 space-y-5 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                  <span className="font-bold text-white uppercase tracking-wide">
                    Structured Agreement Parameters
                  </span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                    Fully User-Editable
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="deal-title" className="block text-gray-400 mb-1 text-[11px] font-bold">
                      Agreement / Transaction Title *
                    </label>
                    <input
                      id="deal-title"
                      type="text"
                      value={agreementTitle}
                      onChange={(e) => setAgreementTitle(e.target.value)}
                      placeholder="e.g. Enterprise Security Audit Report"
                      className="w-full px-3 py-2 rounded-lg bg-gray-950 border border-gray-700 text-white text-xs focus:border-purple-500 focus:outline-none placeholder-gray-600"
                    />
                  </div>

                  <div>
                    <label htmlFor="deal-deliverable" className="block text-gray-400 mb-1 text-[11px] font-bold">
                      Deliverable Scope / Item Description *
                    </label>
                    <input
                      id="deal-deliverable"
                      type="text"
                      value={deliverable}
                      onChange={(e) => setDeliverable(e.target.value)}
                      placeholder="e.g. Full smart contract audit report with formal verification"
                      className="w-full px-3 py-2 rounded-lg bg-gray-950 border border-gray-700 text-white text-xs focus:border-purple-500 focus:outline-none placeholder-gray-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="deal-amount" className="block text-gray-400 mb-1 text-[11px] font-bold">
                      Escrow Deposit Amount (MON) *
                    </label>
                    <input
                      id="deal-amount"
                      type="text"
                      value={escrowAmount}
                      onChange={(e) => setEscrowAmount(e.target.value)}
                      placeholder="e.g. 0.05"
                      className="w-full px-3 py-2 rounded-lg bg-gray-950 border border-gray-700 text-white text-xs focus:border-purple-500 focus:outline-none placeholder-gray-600"
                    />
                  </div>

                  <div>
                    <label htmlFor="deal-deadline" className="block text-gray-400 mb-1 text-[11px] font-bold">
                      Inspection / Fulfillment Window (Days) *
                    </label>
                    <input
                      id="deal-deadline"
                      type="number"
                      min={1}
                      value={deadlineDays}
                      onChange={(e) => setDeadlineDays(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg bg-gray-950 border border-gray-700 text-white text-xs focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="deal-location" className="block text-gray-400 mb-1 text-[11px]">
                      Location / Execution Venue
                    </label>
                    <input
                      id="deal-location"
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. Remote / GitHub Repo or Site Address"
                      className="w-full px-3 py-2 rounded-lg bg-gray-950 border border-gray-700 text-white text-xs focus:border-purple-500 focus:outline-none placeholder-gray-600"
                    />
                  </div>
                </div>

                {/* Counterparty Receiver Address */}
                <div className="pt-2 border-t border-gray-800">
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="counterparty-wallet" className="text-gray-400 text-[11px] font-bold uppercase tracking-wide">
                      Target Counterparty Receiver (Seller) *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setReceiverWallet(TARGET_SELLER_ADDRESS);
                        setReceiverName('Dallas Solar Supply Co.');
                      }}
                      className="text-[10px] text-purple-400 hover:text-purple-300 underline"
                    >
                      Fill Demo Seller (0x0e73...6Ee8)
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <input
                        id="counterparty-wallet"
                        type="text"
                        value={receiverWallet}
                        onChange={(e) => setReceiverWallet(e.target.value)}
                        placeholder="0x... (Enter receiver's Ethereum address)"
                        className={`w-full px-3 py-2 rounded-lg bg-gray-950 border text-white text-xs focus:outline-none placeholder-gray-600 ${
                          !receiverWallet
                            ? 'border-gray-700'
                            : isSellerValid
                            ? 'border-emerald-600/70 focus:border-emerald-400'
                            : 'border-red-600/70 focus:border-red-400'
                        }`}
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={receiverName}
                        onChange={(e) => setReceiverName(e.target.value)}
                        placeholder="Optional counterparty name or label"
                        className="w-full px-3 py-2 rounded-lg bg-gray-950 border border-gray-700 text-white text-xs focus:border-purple-500 focus:outline-none placeholder-gray-600"
                      />
                    </div>
                  </div>
                  {isBuyerSellerConflict && (
                    <span className="text-[10px] text-red-400 font-bold block mt-1">
                      ⚠️ Conflict: Receiver wallet cannot equal Buyer wallet ({buyerAddress}).
                    </span>
                  )}
                </div>

                {/* Designated Independent Verifier */}
                <div className="pt-2 border-t border-gray-800">
                  <label htmlFor="verifier-wallet" className="block text-gray-400 mb-1 text-[11px] font-bold uppercase tracking-wide">
                    Designated Independent Verifier (Operator-Controlled Wallet) *
                  </label>
                  <input
                    id="verifier-wallet"
                    type="text"
                    value={verifierWallet}
                    onChange={(e) => setVerifierWallet(e.target.value)}
                    placeholder="0x... (Enter operator-controlled MetaMask verifier address)"
                    className={`w-full px-3 py-2 rounded-lg bg-gray-950 border text-white text-xs focus:outline-none placeholder-gray-600 ${
                      !verifierWallet.trim()
                        ? 'border-amber-600/70 focus:border-amber-400'
                        : isVerifierValid
                        ? 'border-emerald-600/70 focus:border-emerald-400'
                        : 'border-red-600/70 focus:border-red-400'
                    }`}
                  />
                  <span className="text-[10px] text-gray-400 mt-1 block">
                    Default independent verifier: <code className="text-purple-300">{APPROVED_OPERATOR_VERIFIER_ADDRESS}</code>. Must be distinct from Buyer and Seller.
                  </span>
                  {isBuyerVerifierConflict && (
                    <span className="text-[10px] text-red-400 font-bold block mt-1">
                      ⚠️ Conflict: Verifier address cannot equal Buyer wallet ({buyerAddress}).
                    </span>
                  )}
                  {isSellerVerifierConflict && (
                    <span className="text-[10px] text-red-400 font-bold block mt-1">
                      ⚠️ Conflict: Verifier address cannot equal Seller wallet ({sellerAddress}).
                    </span>
                  )}
                  {isVerifierZero && (
                    <span className="text-[10px] text-red-400 font-bold block mt-1">
                      ⚠️ Conflict: Verifier address cannot be the zero address.
                    </span>
                  )}
                </div>

                {/* Dynamic Evidence Requirements Checklist */}
                <div className="pt-2 border-t border-gray-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-gray-400 text-[11px] font-bold uppercase tracking-wide">
                      Mandatory Evidence Requirements Checklist *
                    </label>
                    <span className="text-[10px] text-gray-500">
                      {evidenceRequirements.length} criteria defined
                    </span>
                  </div>

                  <div className="space-y-2">
                    {evidenceRequirements.map((reqItem, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-2 p-2 rounded-lg bg-gray-950 border border-gray-800 text-gray-200 text-[11px]"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-purple-400 font-bold">{idx + 1}.</span>
                          <span>{reqItem}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveRequirement(idx)}
                          className="text-gray-500 hover:text-red-400 text-xs px-2 py-0.5 rounded"
                          title="Remove requirement"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
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
                      placeholder="Add custom evidence requirement (e.g. Testnet transaction receipt, audit hash)..."
                      className="flex-1 px-3 py-1.5 rounded-lg bg-gray-950 border border-gray-800 text-white text-xs focus:border-purple-500 focus:outline-none placeholder-gray-600"
                    />
                    <button
                      type="button"
                      onClick={handleAddRequirement}
                      className="px-3 py-1.5 rounded-lg bg-purple-800 hover:bg-purple-700 text-white font-bold text-xs"
                    >
                      + Add
                    </button>
                  </div>
                </div>

                {/* Additional Commercial Conditions */}
                <div className="pt-2 border-t border-gray-800">
                  <label htmlFor="additional-conditions" className="block text-gray-400 mb-1 text-[11px]">
                    Additional Commercial Conditions / Milestones (Optional)
                  </label>
                  <textarea
                    id="additional-conditions"
                    rows={2}
                    value={additionalConditions}
                    onChange={(e) => setAdditionalConditions(e.target.value)}
                    placeholder="e.g. Work must commence within 48 hours of escrow funding. Partial delivery not accepted."
                    className="w-full p-2.5 rounded-lg bg-gray-950 border border-gray-800 text-white text-xs focus:border-purple-500 focus:outline-none placeholder-gray-600"
                  />
                </div>
              </div>

              {/* Validation Summary if any error */}
              {validationErrors.length > 0 && (
                <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-600/50 space-y-1 text-xs font-mono">
                  <div className="text-amber-300 font-bold flex items-center gap-2">
                    <span>⚠️</span>
                    <span>Required Fields Incomplete:</span>
                  </div>
                  <ul className="list-disc list-inside text-amber-200/80 text-[11px] space-y-0.5">
                    {validationErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Proceed to Review Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  disabled={!isValidForReview}
                  onClick={() => setIsReviewing(true)}
                  className={`py-3 px-8 rounded-xl font-mono text-xs font-bold transition shadow-lg flex items-center gap-2 ${
                    !isValidForReview
                      ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                      : 'bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-600 hover:to-indigo-500 text-white shadow-purple-950'
                  }`}
                >
                  <span>Review Agreement Terms</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          ) : (
            /* STAGE 2: EXPLICIT REVIEW & AUTHORIZE SCREEN (Requirement 5) */
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-950/40 to-gray-900 border border-purple-600/80 space-y-4 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-purple-900/60 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse" />
                    <span className="font-bold text-white uppercase text-sm">
                      EXPLICIT AGREEMENT REVIEW BEFORE ONCHAIN CREATION
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsReviewing(false)}
                    className="text-purple-300 hover:text-purple-200 text-xs font-bold underline"
                  >
                    ← Edit Terms
                  </button>
                </div>

                {/* 1. Commercial Need */}
                <div className="p-3 bg-black/60 rounded-xl border border-gray-800 space-y-1">
                  <span className="text-gray-400 text-[10px] uppercase font-bold block">
                    COMMERCIAL NEED (NATURAL LANGUAGE)
                  </span>
                  <div className="text-white text-xs leading-relaxed whitespace-pre-wrap">
                    {promptText}
                  </div>
                </div>

                {/* 2. Structured Agreement */}
                <div className="p-3 bg-black/60 rounded-xl border border-gray-800 space-y-3">
                  <span className="text-gray-400 text-[10px] uppercase font-bold block">
                    STRUCTURED AGREEMENT PARAMETERS
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                    <div>
                      <span className="text-gray-400 block text-[10px]">AGREEMENT TITLE:</span>
                      <span className="text-white font-bold">{agreementTitle}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">DELIVERABLE SCOPE:</span>
                      <span className="text-white">{deliverable}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">EXECUTION / DELIVERY LOCATION:</span>
                      <span className="text-gray-300">{location || 'Not specified'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">INSPECTION WINDOW:</span>
                      <span className="text-white font-bold">{deadlineDays} Days</span>
                    </div>
                  </div>

                  {additionalConditions && (
                    <div className="pt-2 border-t border-gray-800">
                      <span className="text-gray-400 block text-[10px]">ADDITIONAL CONDITIONS:</span>
                      <span className="text-gray-300">{additionalConditions}</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-gray-800 space-y-1">
                    <span className="text-gray-400 block text-[10px]">MANDATORY EVIDENCE CHECKLIST ({evidenceRequirements.length}):</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {evidenceRequirements.map((req, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-gray-300 text-[11px]">
                          <span className="text-emerald-400">✓</span>
                          <span>{req}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 3. Counterparty, Verifier & Escrow Amount */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-black/60 rounded-xl border border-gray-800">
                    <span className="text-gray-400 text-[10px] block uppercase">COUNTERPARTY (SELLER):</span>
                    <span className="text-white font-bold block truncate">{receiverName || 'Counterparty'}</span>
                    <code className="text-purple-300 text-[10px] break-all block">{sellerAddress}</code>
                  </div>
                  <div className="p-3 bg-black/60 rounded-xl border border-gray-800">
                    <span className="text-gray-400 text-[10px] block uppercase">DESIGNATED VERIFIER:</span>
                    <span className="text-white font-bold block">Accredited Inspection</span>
                    <code className="text-emerald-300 text-[10px] break-all block">{designatedVerifier}</code>
                  </div>
                  <div className="p-3 bg-black/60 rounded-xl border border-gray-800">
                    <span className="text-gray-400 text-[10px] block uppercase">ESCROW AMOUNT:</span>
                    <span className="text-emerald-400 font-extrabold text-base block">{escrowAmount} MON</span>
                    <span className="text-[10px] text-gray-400">Locked upon mutual agreement</span>
                  </div>
                </div>

                {/* 4. Committed Terms Hash */}
                <div className="p-3 bg-black/60 rounded-xl border border-cyan-800/60 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-cyan-300 text-[10px] uppercase font-bold">
                      CANONICAL TERMS HASH (keccak256):
                    </span>
                    <span className="text-[10px] text-gray-500">Committed Onchain</span>
                  </div>
                  <code className="text-cyan-300 font-mono text-[11px] break-all block select-all">
                    {currentTermsHash}
                  </code>
                  <div className="text-[10px] text-gray-400">
                    Deterministic hash over complete canonical terms (need + all structured parameters). Any change alters this hash.
                  </div>
                </div>
              </div>

              {/* Execution Mode Selector */}
              <div className="p-5 rounded-2xl bg-gray-900/80 border border-gray-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wide">
                      Execution Mode
                    </h4>
                    <p className="text-[11px] text-gray-400 font-mono">
                      Broadcast to Monad Metropolis Testnet (live smart contract) or run in simulated sandbox mode.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setBroadcastOnchain(false)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition ${
                        !broadcastOnchain
                          ? 'bg-purple-950 text-purple-300 border border-purple-600'
                          : 'bg-gray-950 text-gray-400 border border-gray-800 hover:text-white'
                      }`}
                    >
                      SIMULATED SANDBOX
                    </button>
                    <button
                      type="button"
                      onClick={() => setBroadcastOnchain(true)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition ${
                        broadcastOnchain
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-500 shadow-md'
                          : 'bg-gray-950 text-gray-400 border border-gray-800 hover:text-white'
                      }`}
                    >
                      LIVE MONAD TESTNET
                    </button>
                  </div>
                </div>

                {broadcastOnchain && (
                  <div className="p-4 rounded-xl bg-gray-950/80 border border-emerald-500/40 space-y-3 font-mono text-xs">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        LIVE ONCHAIN CONTRACT EXECUTION (Chain ID: 10143)
                      </span>
                      <span className="text-gray-400">
                        Escrow: <code className="text-purple-300">0x925ea8...015A</code>
                      </span>
                    </div>

                    {!wallet.isConnected ? (
                      <div className="flex items-center justify-between p-3 bg-amber-950/40 border border-amber-600/50 rounded-lg">
                        <span className="text-amber-300 text-[11px]">
                          Connect your browser wallet (MetaMask) to authorize and sign this transaction on Monad.
                        </span>
                        <button
                          type="button"
                          onClick={() => wallet.connect()}
                          className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded transition"
                        >
                          Connect Wallet
                        </button>
                      </div>
                    ) : !wallet.isMonadTestnet ? (
                      <div className="flex items-center justify-between p-3 bg-red-950/40 border border-red-600/50 rounded-lg">
                        <span className="text-red-300 text-[11px]">
                          Your wallet is on Chain {wallet.chainId || 'unknown'}. Switch to Monad Testnet (10143).
                        </span>
                        <button
                          type="button"
                          onClick={() => wallet.switchNetwork()}
                          className="px-3 py-1 bg-red-500 hover:bg-red-400 text-black font-bold text-xs rounded transition"
                        >
                          Switch Network
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-gray-900 rounded-lg border border-gray-800 text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">Connected Wallet (msg.sender):</span>
                          <code className="text-emerald-400 font-bold">{wallet.address}</code>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">Live Balance:</span>
                          <span className="text-emerald-400 font-bold">{wallet.balanceMon || '0.0000'} MON</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {broadcastError && (
                  <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/60 text-xs font-mono text-red-200">
                    <span className="font-bold text-red-400">Execution Error: </span>
                    {broadcastError}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setIsReviewing(false)}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-300 font-mono text-xs font-bold transition"
                >
                  ← Edit Terms
                </button>

                <button
                  type="submit"
                  disabled={!canBroadcast}
                  className={`w-full sm:w-auto py-3.5 px-8 rounded-xl font-mono text-xs font-bold transition shadow-lg flex items-center justify-center gap-2 ${
                    isBroadcasting
                      ? 'bg-purple-900 text-purple-300 cursor-wait'
                      : !canBroadcast
                      ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                      : broadcastOnchain
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950'
                      : 'bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-600 hover:to-indigo-500 text-white shadow-purple-950'
                  }`}
                >
                  {isBroadcasting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-purple-300 border-t-transparent rounded-full animate-spin" />
                      <span>AUTHORIZING IN BROWSER WALLET...</span>
                    </>
                  ) : hasParticipantConflict ? (
                    <span>AUTHORIZATION BLOCKED (PARTICIPANT CONFLICT)</span>
                  ) : !wallet.isConnected ? (
                    <span>CONNECT BUYER WALLET TO AUTHORIZE</span>
                  ) : !wallet.isMonadTestnet ? (
                    <span>SWITCH TO MONAD TESTNET (10143)</span>
                  ) : broadcastOnchain ? (
                    <>
                      <span>CREATE &amp; AUTHORIZE TRANSACTION</span>
                      <span>→</span>
                    </>
                  ) : (
                    <>
                      <span>CREATE SANDBOX PROPOSAL</span>
                      <span>→</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
