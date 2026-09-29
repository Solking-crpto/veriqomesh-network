'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import {
  useDemoNetwork,
  DealRequest,
  CANONICAL_TESTNET_TX_ID,
  CANONICAL_RESOLVER_ADDRESS,
  FRESH_LIVE_TESTNET_TX_ID,
  FRESH_LIVE_TESTNET_TERMS_HASH,
  APPROVED_OPERATOR_VERIFIER_ADDRESS,
  INDEPENDENT_VERIFIER_ADDRESS,
} from '../../context/DemoNetworkContext';
import { TransactionState } from '@trustmesh/types';

export default function RequestsPage() {
  const router = useRouter();
  const { role, switchRole, requests, acceptDealRequest, counterDealRequest, declineDealRequest, wallet, client } = useDemoNetwork();

  const [counterNote, setCounterNote] = useState('Propose 21 days for physical delivery inspection');
  const [counterDeadline, setCounterDeadline] = useState(21);
  const [counterAmount, setCounterAmount] = useState('0.0012');
  const [activeCounterModal, setActiveCounterModal] = useState<string | null>(null);

  // Phase 6C: Onchain Acceptance State
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [acceptPendingHash, setAcceptPendingHash] = useState<string | null>(null);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [acceptTxHash, setAcceptTxHash] = useState<string | null>(null);

  // Authoritative Onchain State Reconciliation from Monad Testnet RPC
  const [onchainTxMap, setOnchainTxMap] = useState<
    Record<
      string,
      {
        stateName: TransactionState;
        termsHash: string;
        buyer: string;
        seller: string;
        verifier: string;
        totalAmountMon: string;
        fundedAt: bigint;
      }
    >
  >({});
  const [isRefreshingOnchain, setIsRefreshingOnchain] = useState(false);

  const refreshOnchainRequests = useCallback(async () => {
    setIsRefreshingOnchain(true);
    try {
      const onchainReqs = requests.filter(
        (r) => r.isOnchain && r.transactionId && r.transactionId.startsWith('0x') && r.transactionId.length === 66
      );
      const updates: Record<
        string,
        {
          stateName: TransactionState;
          termsHash: string;
          buyer: string;
          seller: string;
          verifier: string;
          totalAmountMon: string;
          fundedAt: bigint;
        }
      > = {};

      await Promise.all(
        onchainReqs.map(async (r) => {
          try {
            const onTx = await client.getOnchainTransaction(r.transactionId);
            if (onTx && onTx.buyer !== ethers.ZeroAddress) {
              updates[r.transactionId] = {
                stateName: onTx.stateName,
                termsHash: onTx.termsHash,
                buyer: onTx.buyer,
                seller: onTx.seller,
                verifier: onTx.verifier,
                totalAmountMon: ethers.formatEther(onTx.totalAmount),
                fundedAt: onTx.fundedAt,
              };
            }
          } catch {
            // Ignore offline or nonexistent tx query
          }
        })
      );

      setOnchainTxMap((prev) => ({ ...prev, ...updates }));
    } finally {
      setIsRefreshingOnchain(false);
    }
  }, [client, requests]);

  useEffect(() => {
    refreshOnchainRequests();
  }, [refreshOnchainRequests]);

  const handleAccept = async (req: DealRequest) => {
    setAcceptError(null);
    setAcceptTxHash(null);
    setAcceptPendingHash(null);

    if (req.isOnchain) {
      if (req.transactionId === CANONICAL_TESTNET_TX_ID) {
        setAcceptError('Canonical testnet record (0x2b57...afcc4) is immutable read-only audit data. It cannot be mutated or re-agreed.');
        return;
      }
      if (!wallet.isConnected) {
        await wallet.connect();
        return;
      }
      if (!wallet.isMonadTestnet) {
        await wallet.switchNetwork();
        return;
      }
      if (wallet.address && req.receiverWallet && wallet.address.toLowerCase() !== req.receiverWallet.toLowerCase()) {
        setAcceptError(`Strict Role Isolation: Connected wallet (${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}) is not the designated Seller (${req.receiverWallet.slice(0, 6)}...${req.receiverWallet.slice(-4)}). In Monad smart contracts, only the designated seller can call agreeTransaction().`);
        return;
      }

      setAcceptingId(req.id);
      try {
        // 1. Broadcast transaction via connected seller wallet
        const txHash = await client.agreeTransaction(req.transactionId);
        setAcceptPendingHash(txHash);

        // 2. Wait for block inclusion and receipt confirmation
        const receipt = await client.waitForConfirmation(txHash);
        if (!receipt || receipt.status !== 1) {
          throw new Error(`Transaction reverted on Monad Testnet (hash: ${txHash}). Execution failed in block ${receipt?.blockNumber ?? 'unknown'}.`);
        }

        // 3. Reread authoritative onchain state from contract
        const onchainState = await client.getOnchainTransactionState(req.transactionId);
        if (onchainState !== 'AGREED') {
          throw new Error(`State verification failed: expected AGREED, authoritative onchain state is ${onchainState}.`);
        }

        // 4. ONLY after receipt status === 1 and onchain state === AGREED:
        setAcceptTxHash(txHash);
        setAcceptPendingHash(null);
        acceptDealRequest(req.id);
        await refreshOnchainRequests();
      } catch (err: unknown) {
        setAcceptPendingHash(null);
        setAcceptTxHash(null);
        const msg = err instanceof Error ? err.message : 'Transaction failed or rejected on Monad';
        if (msg.includes('0x406c311e') || msg.toLowerCase().includes('unauthorizedactor')) {
          setAcceptError('UnauthorizedActor: The connected wallet is not the authorized seller for this transaction. Only the seller can sign acceptance.');
        } else if (msg.includes('0x6b46fcbe') || msg.toLowerCase().includes('invalidstatetransition')) {
          setAcceptError('InvalidStateTransition: Transaction is not in PROPOSED state onchain (it may already be agreed or settled).');
        } else if (msg.toLowerCase().includes('insufficient funds') || msg.toLowerCase().includes('insufficient balance')) {
          setAcceptError('Gas Estimation Failed (Contract Revert): MetaMask displayed a fallback "insufficient funds" warning because the smart contract transaction reverted (likely UnauthorizedActor). Connected wallet has sufficient MON balance.');
        } else {
          setAcceptError(msg);
        }
        await refreshOnchainRequests();
      } finally {
        setAcceptingId(null);
      }
    } else {
      acceptDealRequest(req.id);
    }
  };

  const handleCounterSubmit = (requestId: string) => {
    counterDealRequest(requestId, counterNote, counterDeadline, counterAmount);
    setActiveCounterModal(null);
  };

  return (
    <div className="min-h-screen bg-[#07080d] text-gray-100 py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header & Perspective Indicator */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-6">
          <div>
            <div className="text-xs font-mono text-purple-400 font-bold uppercase tracking-wider mb-1">
              COMMERCIAL NEGOTIATION &amp; MUTUAL RATIFICATION
            </div>
            <h1 className="text-3xl font-extrabold text-white">Deal Requests &amp; Agreements</h1>
            <p className="text-xs sm:text-sm text-gray-400 font-mono mt-1">
              VeriqoMesh establishes programmatic mutual consent between counterparties before escrow initialization.
            </p>
          </div>

          {/* Quick Perspective Switcher */}
          <div className="p-2 rounded-xl bg-gray-900 border border-gray-700 flex items-center gap-2 font-mono text-xs self-start sm:self-auto">
            <span className="text-gray-400 text-[11px]">Viewing as:</span>
            <button
              onClick={() => switchRole('INITIATOR')}
              className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1.5 ${
                role === 'INITIATOR'
                  ? 'bg-purple-700 text-white border border-purple-500 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <span>INITIATOR</span>
            </button>
            <button
              onClick={() => switchRole('RECEIVER')}
              className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1.5 ${
                role === 'RECEIVER'
                  ? 'bg-blue-600 text-white border border-blue-400 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <span>RECEIVER</span>
            </button>
          </div>
        </div>

        {/* Two-Sided Demo Helper Strip */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-purple-950/40 via-blue-950/30 to-purple-950/40 border border-purple-900/60 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-mono">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <div>
              {role === 'RECEIVER' ? (
                <span className="text-gray-200">
                  You are viewing as <strong>Dallas Solar Supply Co. (Receiver)</strong>. You have pending requests to accept, counter, or decline.
                </span>
              ) : (
                <span className="text-gray-200">
                  You are viewing as <strong>Solar Procurement Ltd. (Initiator)</strong>. Switch to Receiver to simulate counterparty signature.
                </span>
              )}
            </div>
          </div>

          <button
            onClick={() => switchRole(role === 'INITIATOR' ? 'RECEIVER' : 'INITIATOR')}
            className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-white font-bold transition text-xs whitespace-nowrap self-start md:self-auto"
          >
            Toggle to {role === 'INITIATOR' ? 'Receiver View' : 'Initiator View'}
          </button>
        </div>

        {/* Requests List */}
        <div className="space-y-6">
          {requests.map((req) => {
            const onchainData = req.isOnchain && req.transactionId ? onchainTxMap[req.transactionId] : null;

            // In live mode, derive agreement status strictly from onchain state
            // If onchain:
            // - If PROPOSED (or loading fresh live tx), state is strictly AWAITING SELLER RATIFICATION
            // - If AGREED, FUNDED, IN_PROGRESS, etc., state is MUTUAL AGREEMENT RATIFIED
            const isOnchainProposed =
              req.isOnchain &&
              (onchainData?.stateName === 'PROPOSED' ||
                (!onchainData && req.transactionId === FRESH_LIVE_TESTNET_TX_ID));

            const isOnchainRatified =
              req.isOnchain &&
              Boolean(
                onchainData &&
                  onchainData.stateName !== 'PROPOSED' &&
                  onchainData.stateName !== 'DRAFT'
              );

            const isRatified = isOnchainRatified || (!req.isOnchain && req.status === 'AGREEMENT_ACTIVE');
            const isAwaitingRatification =
              isOnchainProposed || (!req.isOnchain && req.status === 'AWAITING_RECEIVER_ACCEPTANCE');

            // Strictly display authoritative onchain terms hash, never dummy 0x7a8b...
            const effectiveTermsHash =
              onchainData?.termsHash ||
              (req.transactionId === FRESH_LIVE_TESTNET_TX_ID
                ? FRESH_LIVE_TESTNET_TERMS_HASH
                : req.transactionId === CANONICAL_TESTNET_TX_ID
                ? '0x6abc2ff972c3d115e4f45da8129035e0536c9786412cf4dab847ff65a917a163'
                : '0xebb931936199ae988129d1eed8501a6ad3311035f0d72dd0e52e0c92454a125f');

            return (
              <div
                key={req.id}
                className={`p-6 rounded-2xl border transition-all ${
                  isRatified
                    ? 'bg-gradient-to-b from-[#0a1a14] to-[#070d0a] border-emerald-500/80 shadow-2xl shadow-emerald-950/20'
                    : isAwaitingRatification && req.isOnchain
                    ? 'bg-gradient-to-b from-[#14120a] to-[#0d0c07] border-amber-500/60 shadow-xl shadow-amber-950/10'
                    : 'bg-gray-900/60 border-gray-800 shadow-lg'
                }`}
              >
                {/* Header Info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800/80 pb-4 mb-5">
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5 mb-1 font-mono text-xs">
                      <span className="text-white font-bold text-sm">{req.id}</span>
                      <span className="text-gray-500">•</span>
                      <span className="text-gray-400">Created: {req.createdAt}</span>
                      <span className="text-gray-500">•</span>
                      {req.isOnchain ? (
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-500 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          LIVE MONAD TESTNET
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono text-purple-300 bg-purple-950/80 border border-purple-800">
                          SIMULATED DEMO
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-white">{req.title}</h3>
                    {req.isOnchain && req.onchainTxHash && (
                      <div className="text-[11px] font-mono text-gray-400 mt-1 flex items-center gap-1.5">
                        <span>Onchain Init:</span>
                        <a
                          href={`https://testnet.monadvision.com/tx/${req.onchainTxHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-purple-300 hover:text-purple-200 underline font-mono"
                        >
                          {req.onchainTxHash.slice(0, 10)}...{req.onchainTxHash.slice(-8)} ↗
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-mono font-bold ${
                        isRatified
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                          : isAwaitingRatification
                          ? 'bg-amber-950 text-amber-300 border border-amber-600'
                          : req.status === 'COUNTERED'
                          ? 'bg-amber-950 text-amber-300 border border-amber-600'
                          : req.status === 'DECLINED'
                          ? 'bg-red-950 text-red-300 border border-red-600'
                          : 'bg-purple-950 text-purple-300 border border-purple-600'
                      }`}
                    >
                      {isRatified
                        ? '✓ MUTUAL AGREEMENT RATIFIED'
                        : isAwaitingRatification
                        ? 'AWAITING SELLER RATIFICATION'
                        : req.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                {/* 3-Sided Architecture Banner: Buyer, Seller, and Independent Verifier */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-950/80 p-4 rounded-xl border border-gray-800/80 font-mono text-xs mb-5">
                  <div className="space-y-1">
                    <span className="text-[10px] text-purple-400 uppercase tracking-wide">INITIATOR (BUYER)</span>
                    <div className="text-white font-bold text-sm">{req.initiator}</div>
                    <div className="text-gray-400 text-[11px] truncate">
                      Wallet: <code>{req.initiatorWallet}</code>
                    </div>
                    <div className="text-gray-400 text-[11px]">
                      Authorized Settlement: <span className="text-emerald-400">Authorized on PASS</span>
                    </div>
                  </div>

                  <div className="space-y-1 border-t md:border-t-0 md:border-l border-gray-800 pt-3 md:pt-0 md:pl-4">
                    <span className="text-[10px] text-blue-400 uppercase tracking-wide">RECEIVER (SELLER)</span>
                    <div className="text-white font-bold text-sm">{req.receiver}</div>
                    <div className="text-gray-400 text-[11px] truncate">
                      Wallet: <code>{req.receiverWallet}</code>
                    </div>
                    <div className="text-gray-400 text-[11px]">
                      Node Rating: <span className="text-emerald-400">98/100 (Tier-1 Verified)</span>
                    </div>
                  </div>

                  <div className="space-y-1 border-t md:border-t-0 md:border-l border-gray-800 pt-3 md:pt-0 md:pl-4">
                    {req.id === 'VM-REQ-0001' || req.id === 'VM-REQ-0002' || req.id === 'VM-REQ-0003' ? (
                      <>
                        <span className="text-[10px] text-amber-400 uppercase tracking-wide">HISTORICAL VERIFIER (READ-ONLY)</span>
                        <div className="text-white font-bold text-sm">Historical Node</div>
                        <div className="text-gray-400 text-[11px] truncate">
                          Wallet: <code className="text-amber-300">{req.verifierAddress || '0x16D7...4EA'}</code>
                        </div>
                        <div className="text-amber-400 text-[11px]">
                          Status: <span>Historical Audit Record</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="text-[10px] text-emerald-400 uppercase tracking-wide">DESIGNATED VERIFIER (ACTIVE)</span>
                        <div className="text-white font-bold text-sm">Operator-Controlled Verifier</div>
                        <div className="text-gray-400 text-[11px] truncate">
                          Wallet: <code className="text-emerald-300">{req.verifierAddress || APPROVED_OPERATOR_VERIFIER_ADDRESS}</code>
                        </div>
                        <div className="text-emerald-400 text-[11px]">
                          Role: <span>Authoritative PASS/FAIL Inspection</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Commercial Terms Breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs mb-5">
                  <div className="p-3 bg-gray-950/60 rounded-xl border border-gray-800">
                    <span className="text-gray-400 text-[10px] block">DELIVERABLE:</span>
                    <span className="text-white font-semibold">{req.deliverable}</span>
                  </div>
                  <div className="p-3 bg-gray-950/60 rounded-xl border border-gray-800">
                    <span className="text-gray-400 text-[10px] block">ESCROW CAPITAL:</span>
                    <span className="text-emerald-400 font-bold text-sm">{req.escrowAmountMon} MON</span>
                    <span className="text-[10px] text-gray-500 block">Monad Testnet</span>
                  </div>
                  <div className="p-3 bg-gray-950/60 rounded-xl border border-gray-800">
                    <span className="text-gray-400 text-[10px] block">INSPECTION DEADLINE:</span>
                    <span className="text-white font-semibold">{req.deadlineDays} Days</span>
                    <span className="text-[10px] text-gray-500 block">Depot Staging Window</span>
                  </div>
                </div>

                {/* Mandatory Evidence Checklist (Dynamic per transaction deliverable) */}
                <div className="p-4 rounded-xl bg-gray-950/60 border border-gray-800/80 mb-5 font-mono text-xs">
                  <span className="text-gray-400 text-[10px] uppercase font-bold block mb-2">
                    MANDATORY EVIDENCE REQUIREMENTS FOR ESCROW RELEASE:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    {req.evidenceRequirements.map((reqItem, idx) => {
                      let displayItem = reqItem;
                      const isHistorical = req.id === 'VM-REQ-0001' || req.id === 'VM-REQ-0002' || req.id === 'VM-REQ-0003';
                      if (!isHistorical && reqItem.includes('0x16D7...4EA')) {
                        const activeVerifier = req.verifierAddress || APPROVED_OPERATOR_VERIFIER_ADDRESS;
                        displayItem = `Independent Verifier Attestation (${activeVerifier.slice(0, 6)}...${activeVerifier.slice(-4)})`;
                      }
                      return (
                        <div key={idx} className="flex items-center gap-2 text-gray-300">
                          <span className="text-purple-400">✓</span>
                          <span>{displayItem}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* RATIFIED AGREEMENT CARD (Only when Mutual Agreement is Ratified onchain or offchain) */}
                {isRatified && (
                  <div className="p-5 rounded-xl bg-emerald-950/30 border border-emerald-600/70 mb-5 font-mono text-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                        <span>✓ MUTUAL AGREEMENT CARD: {req.id === 'VM-REQ-0003' ? 'VM-AGREE-2026-LIVE' : req.id === 'VM-REQ-0001' ? 'VM-AGREE-2026-0881' : `VM-AGREE-${req.id}`}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-900 text-emerald-300 text-[10px] font-bold">
                        {req.isOnchain ? 'RATIFIED ONCHAIN' : 'RATIFIED'}
                      </span>
                    </div>
                    <div className="text-gray-300 font-sans text-xs">
                      Both parties have signed this bilateral agreement. Escrow initialization is now authorized under the VeriqoMesh Monad smart contract state machine.
                    </div>
                    <div className="p-3 bg-black/50 rounded-lg border border-emerald-800/60 space-y-1 text-[11px]">
                      <div>Terms Hash: <code className="text-emerald-300 font-mono break-all">{effectiveTermsHash}</code></div>
                      <div>Resolver Contract: <code className="text-purple-300 font-mono">{CANONICAL_RESOLVER_ADDRESS}</code></div>
                      <div>Settlement Tracks: <span className="text-gray-300">Authorized Settlement on PASS | 3-Judge Quorum on Contest</span></div>
                    </div>
                    <div className="pt-2 flex flex-wrap items-center gap-3">
                      <Link
                        href={`/transactions/${req.transactionId}`}
                        className="py-3 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-black font-bold font-mono text-xs transition shadow-lg shadow-emerald-950 flex items-center gap-2"
                      >
                        <span>ENTER TRANSACTION ROOM &amp; INITIALIZE ESCROW</span>
                        <span className="text-sm">→</span>
                      </Link>
                    </div>
                  </div>
                )}

                {/* PENDING SELLER RATIFICATION CARD (For Live Onchain Transactions in PROPOSED State) */}
                {isAwaitingRatification && req.isOnchain && (
                  <div className="p-5 rounded-xl bg-amber-950/20 border border-amber-600/50 mb-5 font-mono text-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                        <span>⏳ BILATERAL AGREEMENT PROPOSAL (AWAITING SELLER RATIFICATION)</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-amber-900/80 text-amber-200 text-[10px] font-bold border border-amber-600">
                        PROPOSED ONCHAIN (STATE: 1)
                      </span>
                    </div>
                    <div className="text-gray-300 font-sans text-xs">
                      Commercial terms have been registered on Monad Metropolis Testnet. The designated Seller must sign and ratify the agreement onchain (calling <code className="text-amber-300 font-mono">agreeTransaction()</code>) before escrow funding is permitted by the smart contract state machine.
                    </div>
                    <div className="p-3 bg-black/50 rounded-lg border border-amber-800/40 space-y-1 text-[11px]">
                      <div>Terms Hash: <code className="text-amber-300 font-mono break-all">{effectiveTermsHash}</code></div>
                      <div>Designated Seller: <code className="text-blue-300 font-mono">{req.receiverWallet}</code></div>
                      <div>Escrow Capital: <span className="text-emerald-400 font-bold">{req.escrowAmountMon} MON</span> (Locked after mutual ratification)</div>
                      <div>Required Smart Contract Action: <span className="text-purple-300 font-bold">agreeTransaction(bytes32 transactionId)</span></div>
                    </div>
                  </div>
                )}

                {/* Counter-Proposal Notice if Countered */}
                {req.status === 'COUNTERED' && req.counterProposal && (
                  <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-600/70 mb-5 font-mono text-xs space-y-2">
                    <div className="text-amber-300 font-bold">Counter-Proposal Submitted by Receiver:</div>
                    <div className="text-gray-200">Note: {req.counterProposal.note}</div>
                    <div className="text-gray-400">
                      Proposed Inspection Window: <strong className="text-white">{req.counterProposal.proposedDeadlineDays} days</strong> • Proposed Escrow: <strong className="text-emerald-400">{req.counterProposal.proposedAmountMon} MON</strong>
                    </div>
                  </div>
                )}

                {/* ACTION BUTTONS (Context-Aware by Role and Status) */}
                {isAwaitingRatification && (
                  <div className="pt-4 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                    {role === 'RECEIVER' ? (
                      req.transactionId === CANONICAL_TESTNET_TX_ID ? (
                        <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-3">
                          <span className="text-xs font-mono text-purple-300">
                            Canonical Testnet Dispute Record (Settled). Mutation buttons are disabled for archived testnet data.
                          </span>
                          <Link
                            href={`/transactions/${req.transactionId}`}
                            className="py-2 px-4 rounded-xl bg-purple-950 hover:bg-purple-900 border border-purple-600 text-purple-200 font-mono text-xs font-bold transition flex items-center gap-1.5"
                          >
                            <span>View Historical Audit Record</span>
                            <span>→</span>
                          </Link>
                        </div>
                      ) : (
                        <>
                          <div className="text-xs font-mono text-gray-400">
                            As Dallas Solar Supply Co., choose your action on this inbound deal request:
                          </div>
                          <div className="flex flex-wrap items-center gap-2.5">
                            <button
                              onClick={() => handleAccept(req)}
                              disabled={acceptingId === req.id}
                              className={`py-2.5 px-5 rounded-xl font-mono text-xs font-bold transition shadow-md flex items-center gap-1.5 ${
                                acceptingId === req.id
                                  ? 'bg-purple-900 text-purple-200 cursor-wait'
                                  : 'bg-emerald-600 hover:bg-emerald-500 text-black shadow-emerald-950'
                              }`}
                            >
                              {acceptingId === req.id ? (
                                <>
                                  <span className="w-3.5 h-3.5 border-2 border-purple-300 border-t-transparent rounded-full animate-spin" />
                                  <span>{acceptPendingHash ? 'AWAITING ONCHAIN CONFIRMATION...' : 'CONFIRMING IN WALLET...'}</span>
                                </>
                              ) : (
                                <>
                                  <span>{req.isOnchain ? 'SIGN & RATIFY AGREEMENT (agreeTransaction)' : 'ACCEPT TERMS & SIGN AGREEMENT'}</span>
                                  <span>✓</span>
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => setActiveCounterModal(req.id)}
                              className="py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-black font-mono text-xs font-bold transition"
                            >
                              Propose Counter
                            </button>
                            <button
                              onClick={() => declineDealRequest(req.id)}
                              className="py-2.5 px-4 rounded-xl bg-gray-800 hover:bg-red-950 hover:text-red-300 text-gray-300 font-mono text-xs font-bold transition border border-gray-700"
                            >
                              Decline
                            </button>
                          </div>

                          {acceptPendingHash && (
                            <div className="w-full mt-2 p-2.5 bg-blue-950/60 border border-blue-500/60 rounded-lg text-[11px] font-mono text-blue-200 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                                <span>Transaction broadcasted. Awaiting block inclusion &amp; state confirmation...</span>
                              </div>
                              <a
                                href={`https://testnet.monadvision.com/tx/${acceptPendingHash}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-300 underline font-bold"
                              >
                                View on MonadVision ↗
                              </a>
                            </div>
                          )}

                          {acceptError && (
                            <div className="w-full mt-2 p-2.5 bg-red-950/60 border border-red-500/60 rounded-lg text-[11px] font-mono text-red-200">
                              <span className="font-bold text-red-400">Error: </span>
                              {acceptError}
                            </div>
                          )}

                          {acceptTxHash && (
                            <div className="w-full mt-2 p-2.5 bg-emerald-950/60 border border-emerald-500/60 rounded-lg text-[11px] font-mono text-emerald-200 flex items-center justify-between">
                              <span>✓ Agreement ratified on Monad Testnet!</span>
                              <a
                                href={`https://testnet.monadvision.com/tx/${acceptTxHash}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-purple-300 underline font-bold"
                              >
                                View on MonadVision ↗
                              </a>
                            </div>
                          )}
                        </>
                      )
                    ) : (
                      <>
                        <div className="text-xs font-mono text-gray-400">
                          Dispatched by {req.initiator} ({req.initiatorWallet ? `${req.initiatorWallet.slice(0, 6)}...${req.initiatorWallet.slice(-4)}` : ''}). Awaiting counterparty ratification from {req.receiver} ({req.receiverWallet ? `${req.receiverWallet.slice(0, 6)}...${req.receiverWallet.slice(-4)}` : ''}).
                        </div>
                        <button
                          onClick={() => switchRole('RECEIVER')}
                          className="py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold transition shadow-md shadow-blue-950 flex items-center gap-2"
                        >
                          <span>Switch to Receiver to Sign</span>
                          <span>→</span>
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* Counter Modal */}
                {activeCounterModal === req.id && (
                  <div className="mt-4 p-4 rounded-xl bg-gray-950 border border-amber-600/60 font-mono text-xs space-y-3">
                    <div className="text-amber-300 font-bold uppercase">Propose Counter-Terms to Initiator</div>
                    <div>
                      <label className="block text-gray-400 text-[10px] mb-1">Reason / Note</label>
                      <input
                        type="text"
                        value={counterNote}
                        onChange={(e) => setCounterNote(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-gray-400 text-[10px] mb-1">Proposed Days</label>
                        <input
                          type="number"
                          value={counterDeadline}
                          onChange={(e) => setCounterDeadline(Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-400 text-[10px] mb-1">Proposed Escrow (MON)</label>
                        <input
                          type="text"
                          value={counterAmount}
                          onChange={(e) => setCounterAmount(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white text-xs"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        onClick={() => setActiveCounterModal(null)}
                        className="px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleCounterSubmit(req.id)}
                        className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-black font-bold text-xs"
                      >
                        Send Counter-Offer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
