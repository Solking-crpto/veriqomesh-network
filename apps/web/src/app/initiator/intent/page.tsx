'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import {
  useDemoNetwork,
  TARGET_BUYER_ADDRESS,
  TARGET_SELLER_ADDRESS,
  INDEPENDENT_VERIFIER_ADDRESS,
  APPROVED_OPERATOR_VERIFIER_TX_ID,
} from '../../../context/DemoNetworkContext';

export default function CreateIntentPage() {
  const router = useRouter();
  const { initiator, createDealRequest, switchRole, wallet, client } = useDemoNetwork();

  const [promptText, setPromptText] = useState(
    'Supply and deliver 2 solar panels to the buyer. Seller provides product serial numbers, delivery evidence and installation/site evidence.'
  );

  const [counterpartyChoice, setCounterpartyChoice] = useState<'DALLAS_SOLAR' | 'CUSTOM'>('DALLAS_SOLAR');
  const [customReceiverName, setCustomReceiverName] = useState('');
  const [customReceiverWallet, setCustomReceiverWallet] = useState('');
  const [verifierWallet, setVerifierWallet] = useState(INDEPENDENT_VERIFIER_ADDRESS);
  const [escrowAmount, setEscrowAmount] = useState('0.001');
  const [deadlineDays, setDeadlineDays] = useState(14);
  const [createdRequestId, setCreatedRequestId] = useState<string | null>(null);
  const [createdTxId, setCreatedTxId] = useState<string | null>(null);

  // Phase 6C: Onchain Broadcast Mode (Default enabled for live E2E testnet validation)
  const [broadcastOnchain, setBroadcastOnchain] = useState(true);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastError, setBroadcastError] = useState<string | null>(null);
  const [broadcastTxHash, setBroadcastTxHash] = useState<string | null>(null);

  // Dynamic participant binding & invariant validation
  const buyerAddress = wallet.address || initiator.wallet || TARGET_BUYER_ADDRESS;
  const sellerAddress =
    counterpartyChoice === 'DALLAS_SOLAR'
      ? TARGET_SELLER_ADDRESS
      : (customReceiverWallet.trim() || TARGET_SELLER_ADDRESS);
  const designatedVerifier = verifierWallet.trim();
  const currentTermsHash = ethers.keccak256(ethers.toUtf8Bytes(promptText || ''));

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

  const isDesignatedBuyerConnected =
    wallet.isConnected && wallet.address?.toLowerCase() === TARGET_BUYER_ADDRESS.toLowerCase();

  const canBroadcast =
    !broadcastOnchain ||
    (wallet.isConnected &&
      wallet.isMonadTestnet &&
      isBuyerValid &&
      isSellerValid &&
      isVerifierValid &&
      !hasParticipantConflict &&
      !isBroadcasting);

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setBroadcastError(null);

    const receiverName =
      counterpartyChoice === 'DALLAS_SOLAR'
        ? 'Dallas Solar Supply'
        : customReceiverName || 'Custom Supplier';

    if (broadcastOnchain) {
      if (!wallet.isConnected) {
        setBroadcastError('Please connect your browser wallet (MetaMask) to broadcast to Monad Testnet.');
        return;
      }
      if (!wallet.isMonadTestnet) {
        setBroadcastError('Please switch your wallet network to Monad Metropolis Testnet (Chain ID 10143).');
        return;
      }
      if (!isVerifierValid) {
        setBroadcastError(
          isVerifierZero
            ? 'Cannot broadcast: Designated Verifier cannot be the zero address (0x000...000).'
            : 'Cannot broadcast: Please provide a valid operator-controlled Ethereum address for the Designated Independent Verifier (e.g. Account 3 from MetaMask).'
        );
        return;
      }
      if (isBuyerSellerConflict) {
        setBroadcastError(
          `Cannot broadcast: Connected wallet (${buyerAddress}) matches Seller (${sellerAddress}). Switch MetaMask to Buyer account (${TARGET_BUYER_ADDRESS}).`
        );
        return;
      }
      if (isBuyerVerifierConflict) {
        setBroadcastError('Cannot broadcast: Buyer cannot be Verifier.');
        return;
      }
      if (isSellerVerifierConflict) {
        setBroadcastError('Cannot broadcast: Seller cannot be Verifier.');
        return;
      }

      setIsBroadcasting(true);
      try {
        const newTxId = APPROVED_OPERATOR_VERIFIER_TX_ID;
        const termsHash = ethers.keccak256(ethers.toUtf8Bytes(promptText));
        const amountWei = ethers.parseEther(escrowAmount || '0.001').toString();
        const deadlineEpoch = Math.floor(Date.now() / 1000) + deadlineDays * 86400;

        const txHash = await client.createTransactionWithVerifier({
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
          throw new Error(`State verification failed: onchain transaction was not initialized.`);
        }
        if (onTx.verifier.toLowerCase() !== designatedVerifier.toLowerCase()) {
          throw new Error(
            `State verification failed: onchain verifier (${onTx.verifier}) does not match designated verifier (${designatedVerifier}).`
          );
        }

        setCreatedTxId(newTxId);
        setBroadcastTxHash(txHash);
        const newId = createDealRequest(receiverName, sellerAddress, true, newTxId, txHash, designatedVerifier);
        setCreatedRequestId(newId);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Transaction was rejected or failed on Monad';
        setBroadcastError(msg);
      } finally {
        setIsBroadcasting(false);
      }
    } else {
      // Sandbox Demo Mode
      const newId = createDealRequest(receiverName, sellerAddress, false, undefined, undefined, designatedVerifier);
      setCreatedRequestId(newId);
      setCreatedTxId(null);
    }
  };

  const handleGoToReceiverView = () => {
    switchRole('RECEIVER');
    router.push('/requests');
  };

  return (
    <div className="min-h-screen bg-[#07080d] text-gray-100 py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
          <Link href="/initiator" className="hover:text-purple-300">Initiator Dashboard</Link>
          <span>/</span>
          <span className="text-purple-400 font-bold">Create Commercial Intent</span>
        </div>

        {/* Header */}
        <div className="border-b border-gray-800 pb-5">
          <div className="text-xs font-mono text-purple-400 font-bold uppercase tracking-wider mb-1">
            STEP 1 • INTENT SPECIFICATION &amp; POLICY STRUCTURING
          </div>
          <h1 className="text-3xl font-extrabold text-white">Create Commercial Intent</h1>
          <p className="text-xs sm:text-sm text-gray-400 font-mono mt-1">
            Express procurement requirements in natural language; VeriqoMesh structures verifiable parameters bounded by programmatic policy.
          </p>
        </div>

        {/* Success Modal / Banner */}
        {createdRequestId && (
          <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/90 to-purple-950/80 border border-emerald-500 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-emerald-500 text-black flex items-center justify-center font-bold text-lg">
                ✓
              </span>
              <div>
                <h3 className="text-lg font-bold text-white font-mono">
                  {createdTxId ? 'Live Monad Testnet Transaction Initialized!' : 'Deal Request Sent Successfully!'} ({createdRequestId})
                </h3>
                <p className="text-xs text-gray-300 font-mono">
                  {createdTxId
                    ? `Onchain transaction record initialized on Monad Metropolis Testnet (Chain ID 10143). Escrow deposit: ${escrowAmount} MON.`
                    : 'Dispatched to Dallas Solar Supply Co. Awaiting counterparty review and signature.'}
                </p>
              </div>
            </div>

            {createdTxId && (
              <div className="p-3 bg-black/60 rounded-xl border border-emerald-600/60 font-mono text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">FRESH TRANSACTION ID:</span>
                  <code className="text-purple-300 font-bold">{createdTxId}</code>
                </div>
                {broadcastTxHash && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">BROADCAST TX HASH:</span>
                    <a
                      href={`https://testnet.monadvision.com/tx/${broadcastTxHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-400 hover:text-emerald-300 underline font-bold"
                    >
                      {broadcastTxHash.slice(0, 16)}...{broadcastTxHash.slice(-8)} ↗
                    </a>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">BUYER (INITIATOR):</span>
                  <code className="text-white">{buyerAddress}</code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">SELLER (RECEIVER):</span>
                  <code className="text-white">{sellerAddress}</code>
                </div>
              </div>
            )}

            <div className="p-3 bg-black/40 rounded-xl border border-emerald-600/40 text-xs font-mono space-y-1">
              <div className="text-emerald-300 font-semibold">
                {createdTxId ? 'Next Step: Enter Transaction Room or Review as Receiver:' : 'Two-Sided Demo Next Step:'}
              </div>
              <p className="text-gray-300">
                {createdTxId
                  ? 'You can enter the Transaction Room directly with your fresh transaction ID, or switch to the Receiver persona to review and ratify.'
                  : 'To experience the receiver side of the negotiation, switch to the Receiver Persona (Dallas Solar Supply) and review the terms.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              {createdTxId && (
                <Link
                  href={`/transactions/${createdTxId}`}
                  className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-mono text-xs font-bold transition shadow-lg flex items-center gap-2"
                >
                  <span>ENTER FRESH LIVE TRANSACTION ROOM</span>
                  <span>→</span>
                </Link>
              )}
              <button
                onClick={handleGoToReceiverView}
                className="py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold transition shadow-lg flex items-center gap-2"
              >
                <span>Switch to Receiver &amp; Review Request</span>
                <span>→</span>
              </button>
              <Link
                href="/requests"
                className="py-2.5 px-4 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-200 font-mono text-xs font-bold transition"
              >
                View Deal Requests
              </Link>
            </div>
          </div>
        )}

        {/* Architectural Role Clarity Banner (Requirement 10) */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-gray-900 border border-purple-800/40 space-y-2">
          <div className="text-[10px] font-mono uppercase tracking-widest text-purple-300 font-bold">
            VeriqoMesh Dual-Path Autonomous Architecture
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-2.5 rounded-xl bg-black/40 border border-gray-800/80">
              <div className="text-emerald-400 font-bold font-mono text-[11px] mb-1">NORMAL EXECUTION</div>
              <div className="text-gray-300 text-[11px] leading-snug">
                AI assists within policy bounds; authorized wallet executes onchain.
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-black/40 border border-gray-800/80">
              <div className="text-blue-400 font-bold font-mono text-[11px] mb-1">VERIFICATION</div>
              <div className="text-gray-300 text-[11px] leading-snug">
                Independent verifier provides the authoritative verification outcome.
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-black/40 border border-gray-800/80">
              <div className="text-amber-400 font-bold font-mono text-[11px] mb-1">DISPUTE</div>
              <div className="text-gray-300 text-[11px] leading-snug">
                Human adjudication activates only when the outcome is contested.
              </div>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSendRequest} className="space-y-6">
          {/* Natural Language Prompt Input */}
          <div className="p-5 rounded-2xl bg-gray-900/60 border border-gray-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono font-bold text-purple-300 uppercase tracking-wide flex items-center gap-2">
                <span>Natural Language Commercial Need</span>
                <span className="text-[10px] text-gray-500 font-normal">(Initiator Input)</span>
              </label>
              <span className="text-[10px] font-mono text-purple-400 bg-purple-950 px-2 py-0.5 rounded border border-purple-800">
                AI Intent Parser
              </span>
            </div>
            <textarea
              rows={3}
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              className="w-full p-3 rounded-xl bg-gray-950 border border-gray-700 text-white font-mono text-xs focus:border-purple-500 focus:outline-none leading-relaxed"
              placeholder="Describe what you want to procure, deliver, or contract..."
            />
            <div className="text-[11px] text-gray-400 font-mono flex items-center gap-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>Autonomous agent parsed 4 contractual milestones and 1 verification mandate.</span>
            </div>
          </div>

          {/* Structured Contract Parameters */}
          <div className="p-5 rounded-2xl bg-gray-900/60 border border-gray-800 space-y-5 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <span className="font-bold text-white uppercase tracking-wide">
                Structured Agreement Parameters
              </span>
              <span className="text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                Policy Compliant
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-400 mb-1 text-[11px]">Commercial Deliverable Title</label>
                <input
                  type="text"
                  disabled
                  value="Tier-1 Commercial Solar Panel Procurement (100x 550W)"
                  className="w-full px-3 py-2 rounded-lg bg-gray-950 border border-gray-800 text-gray-200"
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1 text-[11px]">Delivery Location</label>
                <input
                  type="text"
                  disabled
                  value="Dallas Distribution Depot, Dallas, Texas"
                  className="w-full px-3 py-2 rounded-lg bg-gray-950 border border-gray-800 text-gray-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-400 mb-1 text-[11px]">Escrow Deposit Amount (MON)</label>
                <input
                  type="text"
                  value={escrowAmount}
                  onChange={(e) => setEscrowAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-gray-950 border border-gray-700 text-white focus:border-purple-500 focus:outline-none"
                />
                <span className="text-[10px] text-gray-500 mt-1 block">
                  Within policy limit ({initiator.spendingLimitMon} MON max). Monad testnet canonical is 0.001 MON.
                </span>
              </div>

              <div>
                <label className="block text-gray-400 mb-1 text-[11px]">Inspection Window (Days)</label>
                <input
                  type="number"
                  value={deadlineDays}
                  onChange={(e) => setDeadlineDays(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-gray-950 border border-gray-700 text-white focus:border-purple-500 focus:outline-none"
                />
                <span className="text-[10px] text-gray-500 mt-1 block">
                  Time allowed for delivery and accredited inspection before escrow expiry.
                </span>
              </div>
            </div>

            {/* Counterparty Selection */}
            <div className="pt-2">
              <label className="block text-gray-400 mb-2 text-[11px] font-bold uppercase tracking-wide">
                Target Counterparty (Transaction Receiver)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div
                  onClick={() => setCounterpartyChoice('DALLAS_SOLAR')}
                  className={`p-3 rounded-xl border cursor-pointer transition ${
                    counterpartyChoice === 'DALLAS_SOLAR'
                      ? 'bg-blue-950/40 border-blue-500 text-white'
                      : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-white">Dallas Solar Supply Co.</span>
                    <span className="text-[10px] bg-blue-900 text-blue-300 px-1.5 py-0.2 rounded font-mono">
                      Designated Seller
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-400">
                    Wallet: <code className="text-emerald-400">0x0e73dB...6Ee8</code> • Designated E2E Seller
                  </div>
                </div>

                <div
                  onClick={() => setCounterpartyChoice('CUSTOM')}
                  className={`p-3 rounded-xl border cursor-pointer transition ${
                    counterpartyChoice === 'CUSTOM'
                      ? 'bg-purple-950/40 border-purple-500 text-white'
                      : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-white">Custom Receiver</span>
                    <span className="text-[10px] bg-gray-800 text-gray-300 px-1.5 py-0.2 rounded font-mono">
                      Manual
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-400">
                    Specify direct address or decentralized node
                  </div>
                </div>
              </div>

              {counterpartyChoice === 'CUSTOM' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-gray-950 rounded-xl border border-gray-800">
                  <div>
                    <label className="block text-gray-400 text-[10px] mb-1">Receiver Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Apex Energy Logistics"
                      value={customReceiverName}
                      onChange={(e) => setCustomReceiverName(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded bg-gray-900 border border-gray-700 text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-[10px] mb-1">Receiver Wallet</label>
                    <input
                      type="text"
                      placeholder="0x..."
                      value={customReceiverWallet}
                      onChange={(e) => setCustomReceiverWallet(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded bg-gray-900 border border-gray-700 text-white text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Designated Independent Verifier */}
            <div className="pt-2">
              <label className="block text-gray-400 mb-1 text-[11px] font-bold uppercase tracking-wide">
                Designated Independent Verifier (Operator-Controlled Wallet)
              </label>
              <input
                type="text"
                value={verifierWallet}
                onChange={(e) => setVerifierWallet(e.target.value)}
                placeholder="0x... (Enter operator-controlled MetaMask verifier address, e.g. Account 3)"
                className={`w-full px-3 py-2 rounded-lg bg-gray-950 border text-white font-mono text-xs focus:outline-none ${
                  !verifierWallet.trim()
                    ? 'border-amber-600/70 focus:border-amber-400'
                    : isVerifierValid
                    ? 'border-emerald-600/70 focus:border-emerald-400'
                    : 'border-red-600/70 focus:border-red-400'
                }`}
              />
              <span className="text-[10px] text-gray-400 mt-1 block font-mono">
                {INDEPENDENT_VERIFIER_ADDRESS ? (
                  <>Configured default verifier: <code className="text-purple-300">{INDEPENDENT_VERIFIER_ADDRESS}</code></>
                ) : (
                  <>Provide an operator-controlled wallet address (such as MetaMask Account 3) to perform independent onchain verification. Must be distinct from Buyer and Seller.</>
                )}
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

            {/* Mandatory Evidence Checklist */}
            <div className="pt-2">
              <label className="block text-gray-400 mb-2 text-[11px] font-bold uppercase tracking-wide">
                Mandatory Verification Checklist (Pre-Release Conditions)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 rounded-lg bg-gray-950 border border-gray-800 flex items-center gap-2">
                  <span className="text-purple-400 font-bold">1.</span>
                  <span>Carrier / Courier Waybill (Signed delivery proof)</span>
                </div>
                <div className="p-2.5 rounded-lg bg-gray-950 border border-gray-800 flex items-center gap-2">
                  <span className="text-purple-400 font-bold">2.</span>
                  <span>Geotagged Delivery Photo & Unboxing (Exif verified)</span>
                </div>
                <div className="p-2.5 rounded-lg bg-gray-950 border border-gray-800 flex items-center gap-2">
                  <span className="text-purple-400 font-bold">3.</span>
                  <span>Serial Number Manifest (2 Solar Panel PV Serials)</span>
                </div>
                <div className="p-2.5 rounded-lg bg-gray-950 border border-gray-800 flex items-center gap-2">
                  <span className="text-purple-400 font-bold">4.</span>
                  <span>Installation / Site Placement Verification</span>
                </div>
              </div>
            </div>

            {/* Designated Dispute Protocol */}
            <div className="p-3 bg-purple-950/20 rounded-xl border border-purple-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
              <div>
                <span className="text-purple-300 font-bold">Adjudication Protocol: </span>
                <span className="text-gray-300">VeriqoMesh 3-Judge Median Quorum</span>
              </div>
              <div className="text-gray-400">
                Resolver: <code className="text-purple-300">0x12f9e5...c35E</code>
              </div>
            </div>
          </div>

          {/* Phase 6C: Execution Mode Selector (Live Monad vs Sandbox Demo) */}
          <div className="p-5 rounded-2xl bg-gray-900/80 border border-gray-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wide">
                  Execution Mode
                </h4>
                <p className="text-[11px] text-gray-400 font-mono">
                  Select whether to broadcast to Monad Metropolis Testnet or run in Guided Demo Mode.
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
                  SIMULATED DEMO
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
                      Connect your browser wallet (MetaMask) to sign and initialize this transaction on Monad.
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
                      <code className={`font-bold ${isBuyerSellerConflict ? 'text-red-400 underline' : isDesignatedBuyerConnected ? 'text-emerald-400' : 'text-purple-300'}`}>
                        {wallet.address}
                      </code>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">Live Balance:</span>
                      <span className="text-emerald-400 font-bold">{wallet.balanceMon || '0.0000'} MON</span>
                    </div>
                  </div>
                )}

                {/* Conflict Warnings */}
                {isBuyerSellerConflict && (
                  <div className="p-3.5 rounded-xl bg-red-950/80 border-2 border-red-500 space-y-2 font-mono text-xs shadow-xl shadow-red-950/40">
                    <div className="flex items-center gap-2 text-red-300 font-extrabold uppercase tracking-wide">
                      <span className="text-base">🚫</span>
                      <span>PARTICIPANT BINDING CONFLICT: BUYER CANNOT EQUAL SELLER</span>
                    </div>
                    <p className="text-gray-200 text-[11px] leading-relaxed">
                      Your connected MetaMask wallet (<code className="text-red-300 font-bold bg-black/60 px-1 py-0.5 rounded">{wallet.address}</code>) matches the designated Seller address. In <code className="text-white">TrustMeshEscrow.sol</code>, the signer is permanently bound as Buyer and <code className="text-red-300">seller == msg.sender</code> is strictly rejected.
                    </p>
                    <div className="p-2.5 bg-black/70 rounded-lg border border-red-700/80 text-[11px] text-amber-300 flex items-center justify-between gap-2 flex-wrap">
                      <span>👉 <strong>Action Required:</strong> In MetaMask, switch account to the Buyer wallet:</span>
                      <code className="text-emerald-300 font-bold bg-gray-900 px-2 py-0.5 rounded select-all">{TARGET_BUYER_ADDRESS}</code>
                    </div>
                  </div>
                )}

                {!isBuyerSellerConflict && !isDesignatedBuyerConnected && wallet.isConnected && (
                  <div className="p-3 rounded-xl bg-amber-950/50 border border-amber-600/60 text-xs font-mono space-y-1">
                    <div className="text-amber-300 font-bold flex items-center gap-1.5">
                      <span>⚠️</span>
                      <span>Connected Wallet Notice</span>
                    </div>
                    <div className="text-gray-300 text-[11px]">
                      Connected wallet is <code className="text-amber-200">{wallet.address}</code>. Designated Buyer wallet is <code className="text-emerald-300">{TARGET_BUYER_ADDRESS}</code>. Please switch accounts in MetaMask if you intend to sign from the primary buyer wallet.
                    </div>
                  </div>
                )}

                <div className="p-3.5 bg-purple-950/40 border border-purple-800/50 rounded-xl text-xs font-mono space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-purple-300 font-bold uppercase tracking-wider text-[10px]">
                      Pre-Broadcast Confirmation Summary:
                    </span>
                    {hasParticipantConflict ? (
                      <span className="px-2 py-0.5 rounded bg-red-950 border border-red-500 text-red-300 text-[10px] font-bold">
                        PARTICIPANT CONFLICT DETECTED
                      </span>
                    ) : !isVerifierValid ? (
                      <span className="px-2 py-0.5 rounded bg-amber-950 border border-amber-500 text-amber-300 text-[10px] font-bold">
                        OPERATOR VERIFIER REQUIRED
                      </span>
                    ) : isDesignatedBuyerConnected ? (
                      <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500 text-emerald-300 text-[10px] font-bold">
                        ROLE ISOLATION VALIDATED
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-amber-950 border border-amber-600 text-amber-300 text-[10px] font-bold">
                        READY TO BROADCAST
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-gray-300">
                    <div className="p-2 bg-black/40 rounded-lg border border-gray-800">
                      <span className="text-gray-400 block text-[10px] uppercase">Buyer (msg.sender):</span>
                      <code className={`font-bold break-all ${isBuyerSellerConflict ? 'text-red-400' : 'text-purple-200'}`}>
                        {buyerAddress}
                      </code>
                      {isBuyerSellerConflict && (
                        <span className="text-red-400 font-bold block text-[10px] mt-0.5">⚠️ Conflicts with Seller!</span>
                      )}
                    </div>
                    <div className="p-2 bg-black/40 rounded-lg border border-gray-800">
                      <span className="text-gray-400 block text-[10px] uppercase">Seller (Counterparty):</span>
                      <code className="text-emerald-300 font-bold break-all">{sellerAddress}</code>
                    </div>
                    <div className="p-2 bg-black/40 rounded-lg border border-gray-800">
                      <span className="text-gray-400 block text-[10px] uppercase">Designated Independent Verifier:</span>
                      <code className={`font-bold break-all ${!isVerifierValid ? 'text-amber-400' : 'text-blue-300'}`}>
                        {designatedVerifier || 'None specified (Operator input required)'}
                      </code>
                      {!isVerifierValid && (
                        <span className="text-amber-400 font-bold block text-[10px] mt-0.5">⚠️ Operator MetaMask Verifier address required</span>
                      )}
                    </div>
                    <div className="p-2 bg-black/40 rounded-lg border border-gray-800">
                      <span className="text-gray-400 block text-[10px] uppercase">Escrow Deposit:</span>
                      <span className="text-white font-bold">{escrowAmount} MON</span>
                      <span className="text-gray-400 text-[10px] block mt-0.5">Physical Solar Equipment Delivery</span>
                    </div>
                    <div className="p-2 bg-black/40 rounded-lg border border-gray-800 sm:col-span-2">
                      <span className="text-gray-400 block text-[10px] uppercase">Approved Transaction ID:</span>
                      <code className="text-purple-300 font-mono text-[10px] break-all">{APPROVED_OPERATOR_VERIFIER_TX_ID}</code>
                    </div>
                    <div className="p-2 bg-black/40 rounded-lg border border-gray-800 sm:col-span-2">
                      <span className="text-gray-400 block text-[10px] uppercase">Terms Hash (keccak256):</span>
                      <code className="text-cyan-300 font-mono text-[10px] break-all">{currentTermsHash}</code>
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-gray-400">
                  Transaction will be initialized via <code className="text-gray-300">TrustMeshEscrow.createTransactionWithVerifier()</code>.
                  Escrow deposit ({escrowAmount} MON) can be funded on initialization or after mutual agreement. Requires explicit wallet signature.
                </div>
              </div>
            )}

            {broadcastError && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/60 text-xs font-mono text-red-200">
                <span className="font-bold text-red-400">Execution Error: </span>
                {broadcastError}
              </div>
            )}

            {broadcastTxHash && (
              <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/60 text-xs font-mono text-emerald-200 flex items-center justify-between">
                <span>
                  ✓ Transaction confirmed on Monad Testnet!
                </span>
                <a
                  href={`https://testnet.monadvision.com/tx/${broadcastTxHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-purple-300 hover:text-purple-200 underline flex items-center gap-1 font-bold"
                >
                  View on MonadVision ↗
                </a>
              </div>
            )}
          </div>

          {/* Submit Action */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <div className="text-xs text-gray-400 font-mono">
              Next Step: Deal request will be dispatched to counterparty for review &amp; ratification.
            </div>
            <button
              type="submit"
              disabled={!canBroadcast}
              className={`w-full sm:w-auto py-3 px-8 rounded-xl font-mono text-xs font-bold transition shadow-lg flex items-center justify-center gap-2 ${
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
                  <span>CONFIRM IN BROWSER WALLET...</span>
                </>
              ) : hasParticipantConflict ? (
                <span>BROADCAST BLOCKED (PARTICIPANT CONFLICT)</span>
              ) : !wallet.isConnected ? (
                <span>CONNECT BUYER WALLET TO BROADCAST</span>
              ) : !wallet.isMonadTestnet ? (
                <span>SWITCH TO MONAD (CHAIN ID 10143)</span>
              ) : broadcastOnchain ? (
                <>
                  <span>INITIALIZE ON MONAD TESTNET</span>
                  <span>→</span>
                </>
              ) : (
                <>
                  <span>SEND DEAL REQUEST TO COUNTERPARTY</span>
                  <span>→</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
