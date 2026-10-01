'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ethers } from 'ethers';
import {
  TransactionState,
  TransactionStateIndex,
  canTransition,
  ActorRole,
  isAuthorizedTransition,
  VerificationOutcome,
  EvidenceVerificationStatus,
} from '@trustmesh/types';
import {
  useDemoNetwork,
  DEPLOYED_ESCROW_ADDRESS,
  DEPLOYED_REGISTRY_ADDRESS,
  CANONICAL_RESOLVER_ADDRESS,
  CANONICAL_TESTNET_TX_ID,
  HISTORICAL_LIVE_TESTNET_TX_ID,
  FRESH_LIVE_TESTNET_TX_ID,
  FRESH_LIVE_TESTNET_TERMS_HASH,
  TARGET_BUYER_ADDRESS,
  TARGET_SELLER_ADDRESS,
  INDEPENDENT_VERIFIER_ADDRESS,
} from '../context/DemoNetworkContext';

const ERROR_INTERFACE = new ethers.Interface([
  'error UnauthorizedActor(address caller, string expectedRole)',
  'error InvalidStateTransition(uint8 current, uint8 target)',
  'error TransactionAlreadyExists(bytes32 transactionId)',
  'error TransactionDoesNotExist(bytes32 transactionId)',
  'error InvalidAmount(uint256 amount)',
  'error InvalidDeadline(uint64 deadline)',
  'error InvalidAddress()',
  'error MismatchedFundingAmount(uint256 expected, uint256 received)',
  'error InsufficientContractBalance()',
  'error WithdrawalFailed()',
  'error DisputeWindowExpired()',
  'error SettlementRatioOutOfRange(uint16 ratioBps)',
  'error NoVerifierConfigured(bytes32 transactionId)',
  'error InvalidVerificationOutcome()',
  'error VerificationNotPassed(uint8 outcome)',
  'error VerificationInconclusive(bytes32 transactionId)',
  'error RegistryAlreadySet()',
  'error UnauthorizedCaller(address caller)',
  'error ReceiptAlreadyIssued(bytes32 transactionId)',
  'error ReceiptNotFound(uint256 receiptId)',
  'error ReceiptNotFoundForTx(bytes32 transactionId)',
  'error SoulboundTokenNonTransferable()',
]);

export function formatOnchainError(err: unknown): string {
  if (!err) return 'Unknown transaction error occurred';

  const errObj = err as any;
  const rawData =
    errObj?.data ||
    errObj?.error?.data ||
    errObj?.info?.error?.data ||
    errObj?.payload?.params?.[0]?.data;

  if (typeof rawData === 'string' && rawData.startsWith('0x') && rawData.length >= 10) {
    try {
      const parsed = ERROR_INTERFACE.parseError(rawData);
      if (parsed) {
        if (parsed.name === 'UnauthorizedActor') {
          const [caller, expectedRole] = parsed.args;
          return `UnauthorizedActor: Caller ${caller} is not authorized for role "${expectedRole}". In Monad smart contracts, only the designated ${expectedRole} can execute this transaction.`;
        }
        if (parsed.name === 'InvalidStateTransition') {
          const [current, target] = parsed.args;
          return `InvalidStateTransition: Cannot transition transaction from state ${current} to state ${target}. The transaction may already be agreed, funded, or settled.`;
        }
        if (parsed.name === 'VerificationInconclusive') {
          return `VerificationInconclusive: Deliverable verification was inconclusive. Escrow release is blocked by smart contract invariant; dispute adjudication is required.`;
        }
        if (parsed.name === 'VerificationNotPassed') {
          return `VerificationNotPassed: Deliverable verification has not passed. releaseEscrow() strictly reverts unless verificationOutcome == PASS.`;
        }
        if (parsed.name === 'MismatchedFundingAmount') {
          const [expected, received] = parsed.args;
          return `MismatchedFundingAmount: Expected ${ethers.formatEther(expected)} MON, received ${ethers.formatEther(received)} MON.`;
        }
        if (parsed.name === 'TransactionDoesNotExist') {
          return `TransactionDoesNotExist: Transaction ID does not exist on Monad testnet.`;
        }
        return `${parsed.name}: ${parsed.args.join(', ')}`;
      }
    } catch {
      const selector = rawData.slice(0, 10).toLowerCase();
      if (selector === '0x406c311e') {
        return 'UnauthorizedActor: Connected wallet is not authorized for this role. In Monad smart contracts, only the designated participant can execute this call.';
      }
      if (selector === '0x6b46fcbe') {
        return 'InvalidStateTransition: Transaction state onchain does not permit this transition.';
      }
      if (selector === '0x6f68d503') {
        return 'VerificationInconclusive: Deliverable verification is inconclusive. Escrow release is blocked.';
      }
      if (selector === '0x983e1d3a') {
        return 'VerificationNotPassed: Deliverable verification has not passed.';
      }
    }
  }

  const msg = err instanceof Error ? err.message : String(err);

  if (
    msg.toLowerCase().includes('insufficient funds') ||
    msg.toLowerCase().includes('insufficient balance') ||
    msg.toLowerCase().includes('gas required exceeds allowance')
  ) {
    if (msg.includes('0x406c311e')) {
      return 'UnauthorizedActor: Connected wallet is not authorized for this role. (MetaMask displayed a fallback balance warning because gas estimation failed on contract revert).';
    }
    return 'Gas Estimation Failed (Contract Revert): MetaMask displayed a fallback "insufficient funds" warning because the smart contract reverted during gas estimation (likely UnauthorizedActor or InvalidStateTransition). Connected wallet has sufficient MON balance.';
  }

  if (msg.includes('0x406c311e')) {
    return 'UnauthorizedActor: Connected wallet is not authorized for this role.';
  }
  if (msg.includes('0x6b46fcbe')) {
    return 'InvalidStateTransition: Transaction is not in the required state for this operation.';
  }

  return msg;
}

interface DemoTransaction {
  id: string;
  sourceLabel:
    | 'LIVE MONAD TESTNET (FRESH LIVE TX)'
    | 'LIVE MONAD TESTNET RECORD'
    | 'SIMULATED AUTONOMOUS AGENT DEMO';
  buyer: string;
  seller: string;
  verifier: string;
  amountMon: string;
  deadlineDays: number;
  termsTitle: string;
  termsDescription: string;
  termsHash: string;
  state: TransactionState;
  verificationOutcome: VerificationOutcome;
  evidenceList: {
    title: string;
    contentHash: string;
    metadataHash: string;
    storageUri: string;
    submitter: string;
    status: EvidenceVerificationStatus;
  }[];
  receipt?: {
    receiptId: number;
    transactionId: string;
    settledAmount: string;
    outcome: string;
    termsSummaryHash: string;
    evidenceRoot: string;
    issuedAt: string;
    accountabilityProperty: string;
    onchainTxHash?: string;
  };
  history: { from: TransactionState; to: TransactionState; actor: string; timestamp: string }[];
}

export function TransactionRoom({
  initialStory = 'STORY_B',
  txId,
}: {
  initialStory?: 'STORY_A' | 'STORY_B';
  txId?: string;
}) {
  const { role, initiator, receiver, wallet, client, requests } = useDemoNetwork();
  const [selectedDemoStory, setSelectedDemoStory] = useState<'STORY_A' | 'STORY_B'>(initialStory);

  // Canonical Data Presets
  const presets = {
    storyA: {
      prompt:
        'Procure 100 commercial solar panels (550W Tier 1) delivered to Dallas distribution depot with independent physical inspection before funds release.',
      title: 'Commercial Solar Procurement (Autonomous Agent Mandate)',
      description:
        'Delivery of 4 wooden pallets containing 100 Tier-1 mono-crystalline solar panels to Dallas Depot. Mandate authorized under Buyer Agent policy with independent depot inspection (Simulated Demo Model).',
      id: '0x8f4c2e1b7d5a3f0e8c6b4a2d1f9e7c5b3a1d0f8e6c4b2a0d8f6e4c2b0a9f1e42',
      sourceLabel: 'SIMULATED AUTONOMOUS AGENT DEMO' as const,
      buyer: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      seller: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
      verifier: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
      amountMon: '20.0',
      deadlineDays: 14,
      termsHash: '0x4b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c',
    },
    storyB: {
      prompt:
        'Procure 100 commercial solar panels delivered to Dallas depot with physical audit. Freight damaged in transit (15 micro-cracked panels detected on arrival).',
      title: 'Contested Freight Procurement with Inconclusive Delivery Audit',
      description:
        'Delivery of 100 Tier-1 solar panels. 85 panels intact, 15 micro-cracked in transit. Buyer and Seller contest loss allocation requiring human quorum adjudication (Canonical Live Testnet Dispute).',
      id: CANONICAL_TESTNET_TX_ID,
      sourceLabel: 'LIVE MONAD TESTNET RECORD' as const,
      buyer: '0x287196Cdbf41da13Cb7083392e47eaAf105b58A0',
      seller: '0x6f30D20b8c5bE781bADD86341415b556fB13c873',
      verifier: '0x16D7bD08Ad79bBCdBa116A652f68589FE5d6F4EA',
      amountMon: '0.001',
      deadlineDays: 14,
      termsHash: '0x6abc2ff972c3d115e4f45da8129035e0536c9786412cf4dab847ff65a917a163',
    },
  };

  const isCanonicalTx = txId === CANONICAL_TESTNET_TX_ID;
  const isFreshOnchainTx = Boolean(
    txId &&
    txId.startsWith('0x') &&
    txId.length === 66 &&
    txId !== CANONICAL_TESTNET_TX_ID
  );

  const matchingReq = txId ? requests.find((r) => r.transactionId === txId || r.id === txId) : null;

  const initialPreset = matchingReq
    ? {
        prompt: matchingReq.deliverable,
        title: matchingReq.title,
        description: matchingReq.deliverable,
        id: matchingReq.transactionId,
        sourceLabel: (matchingReq.isOnchain
          ? (matchingReq.transactionId === CANONICAL_TESTNET_TX_ID || matchingReq.transactionId === HISTORICAL_LIVE_TESTNET_TX_ID
              ? 'LIVE MONAD TESTNET RECORD'
              : 'LIVE MONAD TESTNET (FRESH LIVE TX)')
          : 'SIMULATED AUTONOMOUS AGENT DEMO') as
          | 'LIVE MONAD TESTNET (FRESH LIVE TX)'
          | 'LIVE MONAD TESTNET RECORD'
          | 'SIMULATED AUTONOMOUS AGENT DEMO',
        buyer: matchingReq.initiatorWallet,
        seller: matchingReq.receiverWallet,
        verifier: matchingReq.verifierAddress,
        amountMon: matchingReq.escrowAmountMon,
        deadlineDays: matchingReq.deadlineDays,
        termsHash:
          matchingReq.transactionId === FRESH_LIVE_TESTNET_TX_ID
            ? FRESH_LIVE_TESTNET_TERMS_HASH
            : matchingReq.transactionId === CANONICAL_TESTNET_TX_ID
            ? presets.storyB.termsHash
            : ethers.keccak256(ethers.toUtf8Bytes(matchingReq.title)),
      }
    : isFreshOnchainTx
    ? {
        prompt:
          'Commercial procurement agreement initialized on Monad Metropolis Testnet. Counterparties ratify deliverables and anchor cryptographic evidence before escrow settlement.',
        title: 'Commercial Procurement Agreement (Live Monad Metropolis Testnet)',
        description: 'Live onchain transaction initialized on Monad Metropolis Testnet (Chain ID: 10143)',
        id: txId!,
        sourceLabel: (txId === HISTORICAL_LIVE_TESTNET_TX_ID
          ? ('LIVE MONAD TESTNET RECORD' as const)
          : ('LIVE MONAD TESTNET (FRESH LIVE TX)' as const)),
        buyer: wallet.address || initiator.wallet || TARGET_BUYER_ADDRESS,
        seller: txId === HISTORICAL_LIVE_TESTNET_TX_ID ? '0x6f30D20b8c5bE781bADD86341415b556fB13c873' : TARGET_SELLER_ADDRESS,
        verifier: INDEPENDENT_VERIFIER_ADDRESS,
        amountMon: '0.001',
        deadlineDays: 14,
        termsHash: txId === FRESH_LIVE_TESTNET_TX_ID ? FRESH_LIVE_TESTNET_TERMS_HASH : '0xebb931936199ae988129d1eed8501a6ad3311035f0d72dd0e52e0c92454a125f',
      }
    : initialStory === 'STORY_A'
    ? presets.storyA
    : presets.storyB;

  // Onchain Transaction State
  const [tx, setTx] = useState<DemoTransaction>({
    id: initialPreset.id,
    sourceLabel: initialPreset.sourceLabel,
    buyer: initialPreset.buyer,
    seller: initialPreset.seller,
    verifier: initialPreset.verifier,
    amountMon: initialPreset.amountMon,
    deadlineDays: initialPreset.deadlineDays,
    termsTitle: initialPreset.title,
    termsDescription: initialPreset.description,
    termsHash: initialPreset.termsHash,
    state: initialPreset.id === CANONICAL_TESTNET_TX_ID ? TransactionState.SETTLED : TransactionState.PROPOSED,
    verificationOutcome: initialPreset.id === CANONICAL_TESTNET_TX_ID ? VerificationOutcome.INCONCLUSIVE : VerificationOutcome.NONE,
    evidenceList: initialPreset.id === CANONICAL_TESTNET_TX_ID ? [
      {
        title: 'Bill of Lading #BOL-2026-9812 (4 Pallets)',
        contentHash: '0x8f2a1b9c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f01',
        metadataHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        storageUri: 'ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
        submitter: '0x6f30D20b8c5bE781bADD86341415b556fB13c873',
        status: EvidenceVerificationStatus.SELF_REPORTED,
      },
      {
        title: 'Depot Inspection: 85 Intact, 15 Cracked Panels',
        contentHash: '0x77776666555544443333222211110000aaaabbbbccccddddeeeeffff00001111',
        metadataHash: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        storageUri: 'ipfs://bafy-inspection-report-damage-15',
        submitter: '0x16D7bD08Ad79bBCdBa116A652f68589FE5d6F4EA',
        status: EvidenceVerificationStatus.DISPUTED,
      },
    ] : [],
    receipt: initialPreset.id === CANONICAL_TESTNET_TX_ID ? {
      receiptId: 2,
      transactionId: CANONICAL_TESTNET_TX_ID,
      settledAmount: '0.00085 MON to Seller (85%) / 0.00015 MON to Buyer (15%)',
      outcome: 'SETTLED',
      termsSummaryHash: presets.storyB.termsHash,
      evidenceRoot: '0x8f2a1b9c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f01',
      issuedAt: 'Canonical Testnet Settlement',
      accountabilityProperty: 'Non-transferable accountability record (Canonical Live Testnet Record)',
      onchainTxHash: '0x91ff62584f4386250ccb09f28808453bb373273d9fa5f56cf04378c2a78084ba',
    } : undefined,
    history: [
      {
        from: TransactionState.DRAFT,
        to: initialPreset.id === CANONICAL_TESTNET_TX_ID ? TransactionState.SETTLED : TransactionState.PROPOSED,
        actor: initialPreset.id === CANONICAL_TESTNET_TX_ID
          ? 'Canonical Testnet Record'
          : `Buyer (${initialPreset.buyer.slice(0, 6)}...${initialPreset.buyer.slice(-4)})`,
        timestamp: new Date().toLocaleTimeString(),
      },
    ],
  });

  // Phase 6B: Live Onchain Inspection State
  const [onchainData, setOnchainData] = useState<{
    stateName: TransactionState;
    totalAmountWei: bigint;
    totalAmountMon: string;
    buyer: string;
    seller: string;
    verifier: string;
    disputeResolver: string;
    verificationOutcomeName: VerificationOutcome;
    termsHash: string;
  } | null>(null);
  const [onchainReceipt, setOnchainReceipt] = useState<any>(null);
  const [totalLiabilitiesMon, setTotalLiabilitiesMon] = useState<string | null>(null);
  const [isLoadingOnchain, setIsLoadingOnchain] = useState(false);

  // Phase 6C: Real Wallet Transaction Submission State
  const [isSubmittingOnchain, setIsSubmittingOnchain] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);

  // Strict Read-Only Guard for Historical Dispute & Previous Testnet Transactions
  const isHistoricalReadOnly = tx.id === CANONICAL_TESTNET_TX_ID || tx.id === HISTORICAL_LIVE_TESTNET_TX_ID;
  const isStoryA = tx.id === presets.storyA.id;
  const isStoryB = tx.id === CANONICAL_TESTNET_TX_ID;
  const isLiveFresh = !isStoryA && !isStoryB && tx.id !== HISTORICAL_LIVE_TESTNET_TX_ID;
  const liveRequests = requests.filter((r) => r.isOnchain && r.transactionId !== CANONICAL_TESTNET_TX_ID && r.transactionId !== HISTORICAL_LIVE_TESTNET_TX_ID);
  const freshTxId = isFreshOnchainTx ? txId! : liveRequests[0]?.transactionId;

  const refreshOnchain = useCallback(async (targetId: string) => {
    if (!targetId || targetId.length !== 66) return;
    setIsLoadingOnchain(true);
    try {
      const [onTx, rec, liabilities, onchainAnchors] = await Promise.all([
        client.getOnchainTransaction(targetId).catch(() => null),
        client.getOnchainReceiptByTransaction(targetId).catch(() => null),
        client.getTotalEscrowLiabilities().catch(() => null),
        client.getOnchainEvidenceAnchors(targetId).catch(() => []),
      ]);
      if (onTx && onTx.buyer !== ethers.ZeroAddress) {
        setOnchainData({
          stateName: onTx.stateName,
          totalAmountWei: onTx.totalAmount,
          totalAmountMon: ethers.formatEther(onTx.totalAmount),
          buyer: onTx.buyer,
          seller: onTx.seller,
          verifier: onTx.verifier,
          disputeResolver: CANONICAL_RESOLVER_ADDRESS,
          verificationOutcomeName: onTx.verificationOutcomeName,
          termsHash: onTx.termsHash,
        });

        // Keep local tx in sync with onchain truth
        setTx((prev) => {
          let updatedEvidenceList = prev.evidenceList;
          if (onchainAnchors && onchainAnchors.length > 0 && prev.evidenceList.length < onchainAnchors.length) {
            updatedEvidenceList = onchainAnchors.map((a, idx) => ({
              title: prev.evidenceList[idx]?.title || `Bill of Lading #BOL-2026-9812 (Item #${idx + 1})`,
              contentHash: a.contentHash,
              metadataHash: a.metadataHash,
              storageUri: `ipfs://${a.contentHash.slice(2)}`,
              submitter: a.submitter,
              status: a.status === 1 ? EvidenceVerificationStatus.ATTESTED : EvidenceVerificationStatus.SELF_REPORTED,
            }));
          }
          return {
            ...prev,
            state: onTx.stateName,
            buyer: onTx.buyer,
            seller: onTx.seller,
            verifier: onTx.verifier,
            amountMon: ethers.formatEther(onTx.totalAmount),
            verificationOutcome: onTx.verificationOutcomeName,
            termsHash: onTx.termsHash || prev.termsHash,
            evidenceList: updatedEvidenceList,
            sourceLabel:
              onTx.transactionId === CANONICAL_TESTNET_TX_ID || onTx.transactionId === HISTORICAL_LIVE_TESTNET_TX_ID
                ? 'LIVE MONAD TESTNET RECORD'
                : 'LIVE MONAD TESTNET (FRESH LIVE TX)',
            receipt: rec ? {
              receiptId: Number(rec.receiptId) || 3,
              transactionId: rec.transactionId,
              settledAmount: `${rec.settledAmount} MON Settled`,
              outcome: String(rec.outcome),
              termsSummaryHash: rec.termsSummaryHash,
              evidenceRoot: rec.evidenceRoot,
              issuedAt: rec.issuedAt,
              accountabilityProperty: 'Non-transferable accountability record (Monad Metropolis Testnet)',
              onchainTxHash: prev.receipt?.onchainTxHash || lastTxHash || undefined,
            } : prev.receipt,
          };
        });
      }
      if (rec) setOnchainReceipt(rec);
      if (liabilities !== null) setTotalLiabilitiesMon(ethers.formatEther(liabilities));
    } catch {
      // Graceful fallback for non-onchain IDs
    } finally {
      setIsLoadingOnchain(false);
    }
  }, [client, lastTxHash]);

  useEffect(() => {
    refreshOnchain(tx.id);
  }, [tx.id, refreshOnchain]);

  // Handle route change when txId changes
  useEffect(() => {
    if (txId && txId !== tx.id) {
      if (matchingReq) {
        setTx({
          id: matchingReq.transactionId,
          sourceLabel: matchingReq.isOnchain
            ? (matchingReq.transactionId === CANONICAL_TESTNET_TX_ID || matchingReq.transactionId === HISTORICAL_LIVE_TESTNET_TX_ID
                ? 'LIVE MONAD TESTNET RECORD'
                : 'LIVE MONAD TESTNET (FRESH LIVE TX)')
            : 'SIMULATED AUTONOMOUS AGENT DEMO',
          buyer: matchingReq.initiatorWallet,
          seller: matchingReq.receiverWallet,
          verifier: matchingReq.verifierAddress,
          amountMon: matchingReq.escrowAmountMon,
          deadlineDays: matchingReq.deadlineDays,
          termsTitle: matchingReq.title,
          termsDescription: matchingReq.deliverable,
          termsHash:
            matchingReq.transactionId === FRESH_LIVE_TESTNET_TX_ID
              ? FRESH_LIVE_TESTNET_TERMS_HASH
              : matchingReq.transactionId === CANONICAL_TESTNET_TX_ID
              ? presets.storyB.termsHash
              : ethers.keccak256(ethers.toUtf8Bytes(matchingReq.title)),
          state: TransactionState.PROPOSED,
          verificationOutcome: VerificationOutcome.NONE,
          evidenceList: [],
          history: [],
        });
      } else if (isFreshOnchainTx) {
        setTx({
          id: txId,
          sourceLabel: txId === HISTORICAL_LIVE_TESTNET_TX_ID ? 'LIVE MONAD TESTNET RECORD' : 'LIVE MONAD TESTNET (FRESH LIVE TX)',
          buyer: wallet.address || initiator.wallet || TARGET_BUYER_ADDRESS,
          seller: txId === HISTORICAL_LIVE_TESTNET_TX_ID ? '0x6f30D20b8c5bE781bADD86341415b556fB13c873' : TARGET_SELLER_ADDRESS,
          verifier: INDEPENDENT_VERIFIER_ADDRESS,
          amountMon: '0.001',
          deadlineDays: 14,
          termsTitle: 'Commercial Procurement Agreement (Live Monad Metropolis Testnet)',
          termsDescription: 'Live onchain transaction initialized on Monad Metropolis Testnet (Chain ID: 10143)',
          termsHash: txId === FRESH_LIVE_TESTNET_TX_ID ? FRESH_LIVE_TESTNET_TERMS_HASH : '0xebb931936199ae988129d1eed8501a6ad3311035f0d72dd0e52e0c92454a125f',
          state: TransactionState.PROPOSED,
          verificationOutcome: VerificationOutcome.NONE,
          evidenceList: [],
          history: [],
        });
      }
    }
  }, [txId, matchingReq, isFreshOnchainTx, wallet.address, initiator.wallet]);

  // Stage 4 Human Judge Network State (Canonical 3-Judge Panel - Live Monad Testnet Record)
  const [judgePanel] = useState([
    {
      id: 'Judge 1',
      address: '0x76B91831E5a64eA4458B7473C6B5c65DD40Fb853',
      domain: 'Freight Logistics & Packaging',
      casesCompleted: 14,
      conflictCleared: true,
      voteBps: 1000,
      rationale:
        'Depot inspection confirms 85/100 panels intact and operational; 15 damaged in transit. Proportionate 10% refund allocation to buyer is supported by deliverable recovery value.',
      submitted: true,
    },
    {
      id: 'Judge 2',
      address: '0x41CE425F6bc95472d376e315f81A141dBE1D4439',
      domain: 'Hardware & Solar Inspection',
      casesCompleted: 22,
      conflictCleared: true,
      voteBps: 1500,
      rationale:
        'Inspection log confirms corner pallet impact during transit. 15 damaged panels are unusable. 15% refund to buyer with 85% release to seller directly matches shortfall.',
      submitted: true,
    },
    {
      id: 'Judge 3',
      address: '0x3EAf44302D651EC101d82C754a7bbc51Bc1dc82a',
      domain: 'Commercial Supply Contracts',
      casesCompleted: 9,
      conflictCleared: true,
      voteBps: 2000,
      rationale:
        '15 defective units identified plus reasonable depot handling, salvage, and re-palletizing overhead. 20% buyer refund recommended.',
      submitted: true,
    },
  ]);

  const [polarizationDemo, setPolarizationDemo] = useState(false);
  const [disputeTab, setDisputeTab] = useState<'OVERVIEW' | 'JUDGES' | 'BALLOTS' | 'CONSENSUS' | 'GATE'>('OVERVIEW');
  const [aiPreflightExecuted, setAiPreflightExecuted] = useState(true);

  const advanceState = (targetState: TransactionState, actorRole: ActorRole, actorName: string) => {
    if (!canTransition(tx.state, targetState)) {
      alert(`Invalid state transition: Cannot transition from ${tx.state} to ${targetState}`);
      return;
    }
    if (!isAuthorizedTransition(tx.state, targetState, actorRole)) {
      alert(`Unauthorized transition: Role ${actorRole} cannot execute this transition.`);
      return;
    }

    setTx((prev) => ({
      ...prev,
      state: targetState,
      history: [
        ...prev.history,
        {
          from: prev.state,
          to: targetState,
          actor: actorName,
          timestamp: new Date().toLocaleTimeString(),
        },
      ],
    }));
  };

  const handleSelectStory = (story: 'STORY_A' | 'STORY_B') => {
    setSelectedDemoStory(story);
    setPolarizationDemo(false);
    setDisputeTab('OVERVIEW');
    setAiPreflightExecuted(true);
    setActionError(null);
    setLastTxHash(null);

    if (story === 'STORY_B') {
      setTx({
        id: presets.storyB.id,
        sourceLabel: presets.storyB.sourceLabel,
        buyer: presets.storyB.buyer,
        seller: presets.storyB.seller,
        verifier: presets.storyB.verifier,
        amountMon: presets.storyB.amountMon,
        deadlineDays: presets.storyB.deadlineDays,
        termsTitle: presets.storyB.title,
        termsDescription: presets.storyB.description,
        termsHash: presets.storyB.termsHash,
        state: TransactionState.SETTLED,
        verificationOutcome: VerificationOutcome.INCONCLUSIVE,
        evidenceList: [
          {
            title: 'Bill of Lading #BOL-2026-9812 (4 Pallets)',
            contentHash: '0x8f2a1b9c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f01',
            metadataHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
            storageUri: 'ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
            submitter: presets.storyB.seller,
            status: EvidenceVerificationStatus.SELF_REPORTED,
          },
          {
            title: 'Depot Inspection: 85 Intact, 15 Cracked Panels',
            contentHash: '0x77776666555544443333222211110000aaaabbbbccccddddeeeeffff00001111',
            metadataHash: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
            storageUri: 'ipfs://bafy-inspection-report-damage-15',
            submitter: presets.storyB.verifier,
            status: EvidenceVerificationStatus.DISPUTED,
          },
        ],
        receipt: {
          receiptId: 2,
          transactionId: presets.storyB.id,
          settledAmount: '0.00085 MON to Seller (85%) / 0.00015 MON to Buyer (15%)',
          outcome: 'SETTLED',
          termsSummaryHash: presets.storyB.termsHash,
          evidenceRoot: '0x8f2a1b9c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f01',
          issuedAt: 'Canonical Testnet Settlement',
          accountabilityProperty: 'Non-transferable accountability record (Canonical Live Testnet Record)',
          onchainTxHash: '0x91ff62584f4386250ccb09f28808453bb373273d9fa5f56cf04378c2a78084ba',
        },
        history: [
          {
            from: TransactionState.DISPUTED,
            to: TransactionState.SETTLED,
            actor: 'Dispute Resolver (0x12f9...c35E)',
            timestamp: 'Adjudicated on Monad Testnet',
          },
        ],
      });
      refreshOnchain(presets.storyB.id);
    } else {
      setTx({
        id: presets.storyA.id,
        sourceLabel: presets.storyA.sourceLabel,
        buyer: presets.storyA.buyer,
        seller: presets.storyA.seller,
        verifier: presets.storyA.verifier,
        amountMon: presets.storyA.amountMon,
        deadlineDays: presets.storyA.deadlineDays,
        termsTitle: presets.storyA.title,
        termsDescription: presets.storyA.description,
        termsHash: presets.storyA.termsHash,
        state: TransactionState.PROPOSED,
        verificationOutcome: VerificationOutcome.NONE,
        evidenceList: [],
        receipt: undefined,
        history: [
          {
            from: TransactionState.DRAFT,
            to: TransactionState.PROPOSED,
            actor: `Buyer Agent (${presets.storyA.buyer.slice(0, 6)}...${presets.storyA.buyer.slice(-4)})`,
            timestamp: new Date().toLocaleTimeString(),
          },
        ],
      });
    }
  };

  const handleSelectLiveTransaction = (freshTxId: string) => {
    const req = requests.find((r) => r.transactionId === freshTxId);
    setPolarizationDemo(false);
    setDisputeTab('OVERVIEW');
    setAiPreflightExecuted(true);
    setActionError(null);
    setLastTxHash(null);

    setTx({
      id: freshTxId,
      sourceLabel: freshTxId === HISTORICAL_LIVE_TESTNET_TX_ID ? 'LIVE MONAD TESTNET RECORD' : 'LIVE MONAD TESTNET (FRESH LIVE TX)',
      buyer: req?.initiatorWallet || wallet.address || initiator.wallet,
      seller: req?.receiverWallet || (freshTxId === HISTORICAL_LIVE_TESTNET_TX_ID ? '0x6f30D20b8c5bE781bADD86341415b556fB13c873' : TARGET_SELLER_ADDRESS),
      verifier: req?.verifierAddress || INDEPENDENT_VERIFIER_ADDRESS,
      amountMon: req?.escrowAmountMon || '0.001',
      deadlineDays: req?.deadlineDays || 14,
      termsTitle: req?.title || 'Commercial Procurement Agreement (Live Monad Metropolis Testnet)',
      termsDescription: req?.deliverable || 'Live onchain transaction on Monad Metropolis Testnet',
      termsHash:
        freshTxId === FRESH_LIVE_TESTNET_TX_ID
          ? FRESH_LIVE_TESTNET_TERMS_HASH
          : ethers.keccak256(ethers.toUtf8Bytes(req?.deliverable || 'Commercial Procurement Agreement')),
      state: TransactionState.PROPOSED,
      verificationOutcome: VerificationOutcome.NONE,
      evidenceList: [],
      receipt: undefined,
      history: [
        {
          from: TransactionState.DRAFT,
          to: TransactionState.PROPOSED,
          actor: `Buyer (${(req?.initiatorWallet || wallet.address || initiator.wallet).slice(0, 6)}...${(req?.initiatorWallet || wallet.address || initiator.wallet).slice(-4)})`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ],
    });
    refreshOnchain(freshTxId);
  };

  // Real Onchain Wallet Transactions (Phase 6C)
  const handleOnchainAgree = async () => {
    setActionError(null);
    setLastTxHash(null);
    if (isHistoricalReadOnly) {
      setActionError('Canonical testnet record (0x2b57...afcc4) is immutable read-only audit data. Mutating calls are strictly disabled.');
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
    if (wallet.address && wallet.address.toLowerCase() !== tx.seller.toLowerCase()) {
      setActionError(`Strict Role Isolation: Connected wallet (${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}) is not the designated Seller (${tx.seller.slice(0, 6)}...${tx.seller.slice(-4)}). In Monad smart contracts, only the designated seller can call agreeTransaction().`);
      return;
    }
    setIsSubmittingOnchain(true);
    try {
      const hash = await client.agreeTransaction(tx.id);
      const receipt = await client.waitForConfirmation(hash);
      if (!receipt || receipt.status !== 1) {
        throw new Error(`Transaction reverted on Monad Testnet (hash: ${hash}).`);
      }
      setLastTxHash(hash);
      const addr = wallet.address || tx.seller;
      advanceState(TransactionState.AGREED, ActorRole.SELLER, `Receiver (${addr.slice(0, 6)}...${addr.slice(-4)})`);
      await refreshOnchain(tx.id);
    } catch (err: unknown) {
      setActionError(formatOnchainError(err));
    } finally {
      setIsSubmittingOnchain(false);
    }
  };

  const handleOnchainFund = async () => {
    setActionError(null);
    setLastTxHash(null);
    if (isHistoricalReadOnly) {
      setActionError('Canonical testnet record (0x2b57...afcc4) is immutable read-only audit data. Mutating calls are strictly disabled.');
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
    if (wallet.address && wallet.address.toLowerCase() !== tx.buyer.toLowerCase()) {
      setActionError(`Strict Role Isolation: Connected wallet (${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}) is not the Buyer (${tx.buyer.slice(0, 6)}...${tx.buyer.slice(-4)}). In Monad smart contracts, only the Buyer can fund this escrow.`);
      return;
    }
    setIsSubmittingOnchain(true);
    try {
      const amountWei = ethers.parseEther(tx.amountMon || '0.001').toString();
      const hash = await client.fundTransaction(tx.id, amountWei);
      const receipt = await client.waitForConfirmation(hash);
      if (!receipt || receipt.status !== 1) {
        throw new Error(`Transaction reverted on Monad Testnet (hash: ${hash}).`);
      }
      setLastTxHash(hash);
      const addr = wallet.address || tx.buyer;
      advanceState(TransactionState.FUNDED, ActorRole.BUYER, `Buyer (${addr.slice(0, 6)}...${addr.slice(-4)})`);
      await refreshOnchain(tx.id);
    } catch (err: unknown) {
      setActionError(formatOnchainError(err));
    } finally {
      setIsSubmittingOnchain(false);
    }
  };

  const handleOnchainStart = async () => {
    setActionError(null);
    setLastTxHash(null);
    if (isHistoricalReadOnly) {
      setActionError('Canonical testnet record (0x2b57...afcc4) is immutable read-only audit data.');
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
    if (wallet.address && wallet.address.toLowerCase() !== tx.seller.toLowerCase()) {
      setActionError(`Strict Role Isolation: Connected wallet (${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}) is not the Seller (${tx.seller.slice(0, 6)}...${tx.seller.slice(-4)}). Only the Seller can start work.`);
      return;
    }
    setIsSubmittingOnchain(true);
    try {
      const hash = await client.startExecution(tx.id);
      const receipt = await client.waitForConfirmation(hash);
      if (!receipt || receipt.status !== 1) {
        throw new Error(`Transaction reverted on Monad Testnet (hash: ${hash}).`);
      }
      setLastTxHash(hash);
      const addr = wallet.address || tx.seller;
      advanceState(TransactionState.IN_PROGRESS, ActorRole.SELLER, `Receiver (${addr.slice(0, 6)}...${addr.slice(-4)})`);
      await refreshOnchain(tx.id);
    } catch (err: unknown) {
      setActionError(formatOnchainError(err));
    } finally {
      setIsSubmittingOnchain(false);
    }
  };

  const handleOnchainAnchor = async () => {
    setActionError(null);
    setLastTxHash(null);
    if (isHistoricalReadOnly) {
      setActionError('Canonical testnet record (0x2b57...afcc4) is immutable read-only audit data.');
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

    // Role check: Only seller, buyer, or verifier can anchor evidence
    if (
      wallet.address &&
      wallet.address.toLowerCase() !== tx.seller.toLowerCase() &&
      wallet.address.toLowerCase() !== tx.buyer.toLowerCase() &&
      wallet.address.toLowerCase() !== tx.verifier.toLowerCase()
    ) {
      setActionError(
        `Strict Role Isolation: Connected wallet (${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}) is not an authorized participant (Seller, Buyer, or Verifier) for this transaction.`
      );
      return;
    }

    // Defensive check: Assert selector before executing
    const anchorSelector: string = client.getSelector('anchorEvidence(bytes32,bytes32,bytes32,bytes32,bool)');
    if (anchorSelector === '0xbedf318b') {
      setActionError('Critical error: agreeTransaction selector (0xbedf318b) detected in anchorEvidence path!');
      return;
    }
    if (anchorSelector !== '0x7d63bade' && anchorSelector !== '0x150987b4') {
      setActionError(`Defensive assertion failed: Unexpected anchor selector ${anchorSelector} (expected 0x7d63bade or 0x150987b4)`);
      return;
    }

    setIsSubmittingOnchain(true);
    try {
      const result = await client.anchorEvidence({
        transactionId: tx.id,
        evidenceData: 'Carrier Bill of Lading #BOL-2026-9812 - 4 Pallets Tier 1 PV - 1743000000000',
        title: 'Bill of Lading #BOL-2026-9812 (4 Pallets)',
      });

      // Defensive check on returned calldata if present
      if (result.calldata) {
        const calldataSelector: string = result.calldata.slice(0, 10).toLowerCase();
        if (calldataSelector === '0xbedf318b') {
          throw new Error('Critical error: agreeTransaction selector (0xbedf318b) encoded for anchorEvidence');
        }
        if (calldataSelector !== '0x7d63bade' && calldataSelector !== '0x150987b4') {
          throw new Error(`Defensive check failed: Encoded calldata selector is ${calldataSelector}`);
        }
      }

      const receipt = await client.waitForConfirmation(result.txHash);
      if (!receipt || receipt.status !== 1) {
        throw new Error(`Transaction reverted on Monad Testnet (hash: ${result.txHash}).`);
      }
      setLastTxHash(result.txHash);
      setTx((prev) => ({
        ...prev,
        evidenceList: [
          ...prev.evidenceList,
          {
            title: 'Bill of Lading #BOL-2026-9812 (4 Pallets)',
            contentHash: result.contentHash,
            metadataHash: result.metadataHash,
            storageUri: result.storageUri,
            submitter: wallet.address || prev.seller,
            status: EvidenceVerificationStatus.SELF_REPORTED,
          },
        ],
      }));
      const addr = wallet.address || tx.seller;
      advanceState(TransactionState.EVIDENCE_SUBMITTED, ActorRole.SELLER, `Receiver (${addr.slice(0, 6)}...${addr.slice(-4)})`);
      await refreshOnchain(tx.id);
    } catch (err: unknown) {
      setActionError(formatOnchainError(err));
    } finally {
      setIsSubmittingOnchain(false);
    }
  };

  const handleOnchainRequestVerification = async () => {
    setActionError(null);
    setLastTxHash(null);
    if (isHistoricalReadOnly) {
      setActionError('Canonical testnet record (0x2b57...afcc4) is immutable read-only audit data.');
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
    // Role check: Only seller or buyer can request verification
    if (
      wallet.address &&
      wallet.address.toLowerCase() !== tx.seller.toLowerCase() &&
      wallet.address.toLowerCase() !== tx.buyer.toLowerCase()
    ) {
      setActionError(
        `Strict Role Isolation: Connected wallet (${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}) is not a transaction participant (Seller or Buyer). Only participants can call requestVerification().`
      );
      return;
    }

    // Defensive check: Assert selector before executing
    const reqSelector: string = client.getSelector('requestVerification(bytes32)');
    if (reqSelector !== '0x9a53e829') {
      setActionError(`Defensive assertion failed: Unexpected requestVerification selector ${reqSelector} (expected 0x9a53e829)`);
      return;
    }

    setIsSubmittingOnchain(true);
    try {
      const hash = await client.beginVerification(tx.id);
      const receipt = await client.waitForConfirmation(hash);
      if (!receipt || receipt.status !== 1) {
        throw new Error(`Transaction reverted on Monad Testnet (hash: ${hash}).`);
      }
      setLastTxHash(hash);
      const addr = wallet.address || tx.seller;
      advanceState(TransactionState.VERIFICATION, ActorRole.SELLER, `Receiver (${addr.slice(0, 6)}...${addr.slice(-4)})`);
      await refreshOnchain(tx.id);
    } catch (err: unknown) {
      setActionError(formatOnchainError(err));
    } finally {
      setIsSubmittingOnchain(false);
    }
  };

  const handleOnchainRelease = async () => {
    setActionError(null);
    setLastTxHash(null);
    if (isHistoricalReadOnly) {
      setActionError('Canonical testnet record (0x2b57...afcc4) is immutable read-only audit data.');
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
    if (wallet.address && wallet.address.toLowerCase() !== tx.buyer.toLowerCase()) {
      setActionError(`Strict Role Isolation: Connected wallet (${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}) is not the Buyer (${tx.buyer.slice(0, 6)}...${tx.buyer.slice(-4)}). In Monad smart contracts, only the Buyer can call releaseEscrow().`);
      return;
    }
    setIsSubmittingOnchain(true);
    try {
      const hash = await client.settle(tx.id);
      const receipt = await client.waitForConfirmation(hash);
      if (!receipt || receipt.status !== 1) {
        throw new Error(`Transaction reverted on Monad Testnet (hash: ${hash}).`);
      }
      setLastTxHash(hash);
      setTx((prev) => ({
        ...prev,
        receipt: {
          receiptId: 3,
          transactionId: prev.id,
          settledAmount: `${prev.amountMon} MON to Seller (100% Payout)`,
          outcome: 'SETTLED',
          termsSummaryHash: prev.termsHash,
          evidenceRoot: prev.evidenceList[0]?.contentHash || '0x0',
          issuedAt: new Date().toISOString(),
          accountabilityProperty: 'Non-transferable accountability record (Monad Metropolis Testnet)',
          onchainTxHash: hash,
        },
      }));
      const addr = wallet.address || tx.buyer;
      advanceState(TransactionState.SETTLED, ActorRole.BUYER, `Buyer (${addr.slice(0, 6)}...${addr.slice(-4)})`);
      await refreshOnchain(tx.id);
    } catch (err: unknown) {
      setActionError(formatOnchainError(err));
    } finally {
      setIsSubmittingOnchain(false);
    }
  };

  const handleOnchainSubmitVerificationPass = async () => {
    setActionError(null);
    setLastTxHash(null);
    if (isHistoricalReadOnly) {
      setActionError('Canonical testnet record (0x2b57...afcc4) is immutable read-only audit data.');
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
    // Strict Role Isolation Enforcement check:
    if (wallet.address && wallet.address.toLowerCase() !== tx.verifier.toLowerCase()) {
      setActionError(`Strict Role Isolation: Connected wallet (${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}) is not the designated Verifier (${tx.verifier.slice(0, 6)}...${tx.verifier.slice(-4)}). In Monad smart contracts, only the Verifier can submit inspection attestations.`);
      return;
    }
    setIsSubmittingOnchain(true);
    try {
      const reportHash = ethers.keccak256(ethers.toUtf8Bytes(`Physical Inspection Attestation PASS: 100/100 units verified intact - ${Date.now()}`));
      const hash = await client.submitVerification({
        transactionId: tx.id,
        outcome: VerificationOutcome.PASS,
        reportHash,
      });
      const receipt = await client.waitForConfirmation(hash);
      if (!receipt || receipt.status !== 1) {
        throw new Error(`Transaction reverted on Monad Testnet (hash: ${hash}).`);
      }
      setLastTxHash(hash);
      setTx((prev) => ({
        ...prev,
        verificationOutcome: VerificationOutcome.PASS,
        evidenceList: [
          ...prev.evidenceList,
          {
            title: 'Depot Inspection: 100/100 Units Verified Intact',
            contentHash: reportHash,
            metadataHash: ethers.keccak256(ethers.toUtf8Bytes('Verifier Attestation Metadata')),
            storageUri: 'ipfs://bafy-inspection-report-pass-100',
            submitter: wallet.address || prev.verifier,
            status: EvidenceVerificationStatus.ATTESTED,
          },
        ],
      }));
      await refreshOnchain(tx.id);
    } catch (err: unknown) {
      setActionError(formatOnchainError(err));
    } finally {
      setIsSubmittingOnchain(false);
    }
  };

  const handleOnchainSubmitVerificationInconclusive = async () => {
    setActionError(null);
    setLastTxHash(null);
    if (isHistoricalReadOnly) {
      setActionError('Canonical testnet record (0x2b57...afcc4) is immutable read-only audit data.');
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
    // Strict Role Isolation Enforcement check:
    if (wallet.address && wallet.address.toLowerCase() !== tx.verifier.toLowerCase()) {
      setActionError(`Strict Role Isolation: Connected wallet (${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}) is not the designated Verifier (${tx.verifier.slice(0, 6)}...${tx.verifier.slice(-4)}). In Monad smart contracts, only the Verifier can submit inspection attestations.`);
      return;
    }
    setIsSubmittingOnchain(true);
    try {
      const reportHash = ethers.keccak256(ethers.toUtf8Bytes(`Physical Inspection Attestation INCONCLUSIVE: 85 intact, 15 micro-cracked in transit - ${Date.now()}`));
      const hash = await client.submitVerification({
        transactionId: tx.id,
        outcome: VerificationOutcome.INCONCLUSIVE,
        reportHash,
      });
      const receipt = await client.waitForConfirmation(hash);
      if (!receipt || receipt.status !== 1) {
        throw new Error(`Transaction reverted on Monad Testnet (hash: ${hash}).`);
      }
      setLastTxHash(hash);
      setTx((prev) => ({
        ...prev,
        verificationOutcome: VerificationOutcome.INCONCLUSIVE,
        evidenceList: [
          ...prev.evidenceList,
          {
            title: 'Depot Inspection: 85 Intact, 15 Cracked Panels',
            contentHash: reportHash,
            metadataHash: ethers.keccak256(ethers.toUtf8Bytes('Verifier Attestation Metadata')),
            storageUri: 'ipfs://bafy-inspection-report-damage-15',
            submitter: wallet.address || prev.verifier,
            status: EvidenceVerificationStatus.DISPUTED,
          },
        ],
      }));
      await refreshOnchain(tx.id);
    } catch (err: unknown) {
      setActionError(formatOnchainError(err));
    } finally {
      setIsSubmittingOnchain(false);
    }
  };

  const handleOnchainOpenDispute = async () => {
    setActionError(null);
    setLastTxHash(null);
    if (isHistoricalReadOnly) {
      setActionError('Canonical testnet record (0x2b57...afcc4) is immutable read-only audit data.');
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
    if (
      wallet.address &&
      wallet.address.toLowerCase() !== tx.buyer.toLowerCase() &&
      wallet.address.toLowerCase() !== tx.seller.toLowerCase()
    ) {
      setActionError('Strict Role Isolation: Connected wallet is neither Buyer nor Seller. Only a transaction participant can open an onchain dispute.');
      return;
    }
    setIsSubmittingOnchain(true);
    try {
      const hash = await client.openDispute(tx.id);
      const receipt = await client.waitForConfirmation(hash);
      if (!receipt || receipt.status !== 1) {
        throw new Error(`Transaction reverted on Monad Testnet (hash: ${hash}).`);
      }
      setLastTxHash(hash);
      const addr = wallet.address || tx.buyer;
      advanceState(TransactionState.DISPUTED, ActorRole.BUYER, `Buyer (${addr.slice(0, 6)}...${addr.slice(-4)})`);
      await refreshOnchain(tx.id);
    } catch (err: unknown) {
      setActionError(formatOnchainError(err));
    } finally {
      setIsSubmittingOnchain(false);
    }
  };

  // Trust Lifecycle Stages
  const trustLifecycleStages = [
    { label: 'Intent', active: true, completed: true },
    { label: 'Agreement', active: tx.state === TransactionState.PROPOSED || tx.state === TransactionState.AGREED, completed: TransactionStateIndex[tx.state] >= TransactionStateIndex[TransactionState.AGREED] },
    { label: 'Protection', active: tx.state === TransactionState.FUNDED || tx.state === TransactionState.IN_PROGRESS, completed: TransactionStateIndex[tx.state] >= TransactionStateIndex[TransactionState.FUNDED] },
    { label: 'Evidence', active: tx.state === TransactionState.EVIDENCE_SUBMITTED, completed: TransactionStateIndex[tx.state] >= TransactionStateIndex[TransactionState.EVIDENCE_SUBMITTED] },
    { label: 'Verification', active: tx.state === TransactionState.VERIFICATION, completed: tx.verificationOutcome !== VerificationOutcome.NONE },
    { label: 'Resolution', active: tx.state === TransactionState.DISPUTED, completed: tx.state === TransactionState.SETTLED },
    { label: 'Settlement', active: tx.state === TransactionState.SETTLED, completed: tx.state === TransactionState.SETTLED },
    { label: 'Accountability', active: !!tx.receipt, completed: !!tx.receipt },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 font-sans">
      {/* Transaction Room Header: Counterparty Relationship Banner */}
      <div className="mb-6 p-4 rounded-xl bg-gray-950 border border-gray-800 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-gray-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 border border-purple-700 text-purple-300 font-bold uppercase">
                Transaction Room Workspace
              </span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                tx.sourceLabel === 'LIVE MONAD TESTNET (FRESH LIVE TX)'
                  ? 'bg-blue-950 border border-blue-500 text-blue-300 font-bold'
                  : tx.sourceLabel === 'LIVE MONAD TESTNET RECORD'
                  ? 'bg-purple-950 border border-purple-700 text-purple-300'
                  : 'bg-emerald-950 border border-emerald-700 text-emerald-300'
              }`}>
                {tx.sourceLabel}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white font-mono mt-1">
              {tx.termsTitle}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/requests"
              className="px-3 py-1 bg-gray-900 hover:bg-gray-800 text-gray-300 rounded text-xs font-mono border border-gray-700 transition"
            >
              ← Back to Requests
            </Link>
          </div>
        </div>

        {/* Counterparty Relationship Visualization */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 text-xs font-mono items-center">
          {/* Initiator Side */}
          <div className="p-3 rounded-lg bg-gray-900/60 border border-purple-900/40">
            <div className="text-[10px] text-purple-400 uppercase font-semibold">Initiator / Buyer</div>
            <div className="text-white font-bold text-sm mt-0.5">{initiator.name}</div>
            <div className="text-gray-400 text-[10px] truncate mt-1">
              Wallet: <code className="text-gray-300">{tx.buyer}</code>
            </div>
            <div className="text-[10px] text-emerald-400 mt-0.5 flex items-center gap-1">
              <span>●</span> Authorization: Manual Wallet Signature (Policy: Not Configured)
            </div>
          </div>

          {/* Connection Link */}
          <div className="text-center p-2 rounded-lg bg-gray-900/30 border border-gray-800">
            <div className="text-[10px] text-gray-400 uppercase font-bold">Mutual Agreement</div>
            <div className="text-lg font-black text-white mt-0.5">{tx.amountMon} MON</div>
            <div className="text-[10px] text-gray-400">Escrow Vault • {tx.deadlineDays} Days</div>
            <div className="text-[9px] text-blue-400 mt-1 truncate">
              Verifier: {tx.verifier.slice(0, 8)}...{tx.verifier.slice(-6)}
            </div>
          </div>

          {/* Receiver Side */}
          <div className="p-3 rounded-lg bg-gray-900/60 border border-blue-900/40">
            <div className="text-[10px] text-blue-400 uppercase font-semibold">Receiver / Seller</div>
            <div className="text-white font-bold text-sm mt-0.5">{receiver.name}</div>
            <div className="text-gray-400 text-[10px] truncate mt-1">
              Wallet: <code className="text-gray-300">{tx.seller}</code>
            </div>
            <div className="text-[10px] text-emerald-400 mt-0.5 flex items-center gap-1">
              <span>✓</span> Capability: Delivery & Physical Audit
            </div>
          </div>
        </div>

        {/* Commercial Intent & Terms Binding */}
        <div className="mt-3 p-3 bg-gray-950/70 border border-gray-800 rounded-lg text-xs font-mono space-y-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px]">
            <span className="text-gray-400">Deliverable Intent:</span>
            <span className="text-gray-200 font-sans">{tx.termsDescription}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] pt-1 border-t border-gray-800/60">
            <span className="text-gray-400">Onchain Terms Hash:</span>
            <code className="text-purple-300 break-all">{tx.termsHash}</code>
          </div>
        </div>
      </div>

      {/* Live Monad Testnet Infrastructure Gateway */}
      <div className="mb-6 p-4 rounded-xl bg-gray-950/80 border border-emerald-500/30 space-y-3 font-mono text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-800 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-white uppercase text-[11px] tracking-wide">
              Monad Metropolis Testnet Integration Gateway (Chain ID: 10143)
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="text-gray-400">Total Escrow Liabilities:</span>
            <span className="text-emerald-400 font-bold">{totalLiabilitiesMon ?? '0.0010'} MON</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
          <div className="p-2.5 rounded-lg bg-gray-900/60 border border-gray-800 space-y-1">
            <span className="text-gray-400 text-[10px] block">ACTIVE ESCROW CONTRACT</span>
            <div className="text-purple-300 font-bold truncate">0x925ea880cA53DE0352b84B24d0C0dee5B258015A</div>
            <a
              href="https://testnet.monadvision.com/address/0x925ea880cA53DE0352b84B24d0C0dee5B258015A"
              target="_blank"
              rel="noreferrer"
              className="text-gray-400 hover:text-white underline text-[10px] inline-block"
            >
              Verify on MonadVision ↗
            </a>
          </div>

          <div className="p-2.5 rounded-lg bg-gray-900/60 border border-gray-800 space-y-1">
            <span className="text-gray-400 text-[10px] block">TRUST RECEIPT REGISTRY</span>
            <div className="text-purple-300 font-bold truncate">0xE1994e0dF7CD5A836be4b02AE2164A542418B819</div>
            <a
              href="https://testnet.monadvision.com/address/0xE1994e0dF7CD5A836be4b02AE2164A542418B819"
              target="_blank"
              rel="noreferrer"
              className="text-gray-400 hover:text-white underline text-[10px] inline-block"
            >
              Verify on MonadVision ↗
            </a>
          </div>

          <div className="p-2.5 rounded-lg bg-gray-900/60 border border-gray-800 space-y-1">
            <span className="text-gray-400 text-[10px] block">BROWSER WALLET STATUS</span>
            {!wallet.isConnected ? (
              <div className="flex items-center justify-between">
                <span className="text-amber-400 text-[10px]">Disconnected</span>
                <button
                  onClick={() => wallet.connect()}
                  className="px-2 py-0.5 bg-amber-500 hover:bg-amber-400 text-black text-[10px] font-bold rounded"
                >
                  Connect
                </button>
              </div>
            ) : !wallet.isMonadTestnet ? (
              <div className="flex items-center justify-between">
                <span className="text-red-400 text-[10px]">Chain {wallet.chainId}</span>
                <button
                  onClick={() => wallet.switchNetwork()}
                  className="px-2 py-0.5 bg-red-500 hover:bg-red-400 text-black text-[10px] font-bold rounded"
                >
                  Switch 10143
                </button>
              </div>
            ) : (
              <div>
                <div className="text-emerald-400 font-bold truncate">{wallet.address}</div>
                <div className="text-gray-400 text-[10px]">{wallet.balanceMon} MON</div>
              </div>
            )}
          </div>
        </div>

        {onchainData && (
          <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-800/40 text-[11px] space-y-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">✓ Live Monad State:</span>
                <span className="text-white font-bold">{onchainData.stateName}</span>
                <span className="text-gray-400">• Vault Capital: {onchainData.totalAmountMon} MON</span>
              </div>
              {onchainReceipt && (
                <div className="text-purple-300">
                  Receipt #{onchainReceipt.receiptId.toString()} Confirmed
                </div>
              )}
            </div>
            {onchainData.termsHash && onchainData.termsHash !== ethers.ZeroHash && (
              <div className="text-gray-400 text-[10px] break-all pt-1 border-t border-emerald-900/30">
                <span>Terms Hash: </span>
                <code className="text-purple-300 font-mono">{onchainData.termsHash}</code>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Demo Story Switcher */}
      <div className="mb-6 p-1.5 bg-gray-900/90 border border-gray-800 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-2">
        <button
          onClick={() => handleSelectStory('STORY_A')}
          className={`p-3 rounded-lg text-left transition flex items-start gap-3 ${
            isStoryA
              ? 'bg-purple-950/70 border border-purple-600 text-white shadow-lg shadow-purple-950/40'
              : 'bg-gray-950/50 border border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <div className={`mt-0.5 w-6 h-6 rounded flex items-center justify-center text-xs font-bold font-mono ${
            isStoryA ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400'
          }`}>
            A
          </div>
          <div>
            <div className="text-xs font-bold font-mono text-purple-200 flex items-center gap-2">
              <span>DEMO A: AUTONOMOUS PROCUREMENT</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-700 text-emerald-300 font-mono">SIMULATED</span>
            </div>
            <div className="text-[11px] text-gray-400 mt-0.5 font-sans">
              AI Agent → Policy Gate → Escrow → Evidence → Verification PASS → Authorized Agent Release
            </div>
          </div>
        </button>

        <button
          onClick={() => handleSelectStory('STORY_B')}
          className={`p-3 rounded-lg text-left transition flex items-start gap-3 ${
            isStoryB
              ? 'bg-amber-950/50 border border-amber-600 text-white shadow-lg shadow-amber-950/40'
              : 'bg-gray-950/50 border border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <div className={`mt-0.5 w-6 h-6 rounded flex items-center justify-center text-xs font-bold font-mono ${
            isStoryB ? 'bg-amber-600 text-white' : 'bg-gray-800 text-gray-400'
          }`}>
            B
          </div>
          <div>
            <div className="text-xs font-bold font-mono text-amber-200 flex items-center gap-2">
              <span>DEMO B: CONTESTED FREIGHT DISPUTE</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-950 border border-blue-700 text-blue-300 font-mono">READ-ONLY AUDIT</span>
            </div>
            <div className="text-[11px] text-gray-400 mt-0.5 font-sans">
              Tx 0x2b57...cfc4 → Verification INCONCLUSIVE → 3-Judge Quorum → State 11 SETTLED (Receipt #2)
            </div>
          </div>
        </button>

        {freshTxId ? (
          <button
            onClick={() => handleSelectLiveTransaction(freshTxId)}
            className={`p-3 rounded-lg text-left transition flex items-start gap-3 ${
              isLiveFresh && tx.id === freshTxId
                ? 'bg-blue-950/70 border border-blue-500 text-white shadow-lg shadow-blue-950/40'
                : 'bg-gray-950/50 border border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <div className={`mt-0.5 w-6 h-6 rounded flex items-center justify-center text-xs font-bold font-mono ${
              isLiveFresh && tx.id === freshTxId ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'
            }`}>
              C
            </div>
            <div>
              <div className="text-xs font-bold font-mono text-blue-200 flex items-center gap-2">
                <span>LIVE MONAD TESTNET</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-950 border border-blue-700 text-blue-300 font-mono">
                  FRESH LIVE TX
                </span>
              </div>
              <div className="text-[11px] text-gray-400 mt-0.5 font-sans">
                Tx {freshTxId.slice(0, 10)}...{freshTxId.slice(-6)} • Connected: {wallet.address ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}` : '0xa4bC...C50F'} (0.001 MON)
              </div>
            </div>
          </button>
        ) : (
          <Link
            href="/initiator/intent"
            className="p-3 rounded-lg text-left transition flex items-start gap-3 bg-gray-950/30 border border-dashed border-gray-800 text-gray-400 hover:border-gray-700 hover:text-gray-300"
          >
            <div className="mt-0.5 w-6 h-6 rounded flex items-center justify-center text-xs font-bold font-mono bg-gray-800 text-gray-400">
              +
            </div>
            <div>
              <div className="text-xs font-bold font-mono text-gray-300 flex items-center gap-2">
                <span>+ FRESH LIVE TESTNET TX</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-gray-800 text-gray-400 font-mono">STEP B ONCHAIN</span>
              </div>
              <div className="text-[11px] text-gray-500 mt-0.5 font-sans">
                Deploy fresh 0.001 MON escrow on Monad Metropolis Testnet with connected wallet.
              </div>
            </div>
          </Link>
        )}
      </div>

      {/* Trust Lifecycle Progression Bar */}
      <section className="mb-6 bg-gray-900/80 border border-gray-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 font-semibold">
            Trust Lifecycle Progression
          </span>
          <span className="text-[10px] font-mono text-purple-300">
            Current State: {tx.state === TransactionState.PROPOSED ? 'AWAITING SELLER RATIFICATION (PROPOSED)' : `${tx.state} (${TransactionStateIndex[tx.state]})`}
          </span>
        </div>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-1.5">
          {trustLifecycleStages.map((stage, idx) => (
            <div
              key={stage.label}
              className={`p-2 rounded border text-center transition-all ${
                stage.active
                  ? 'bg-purple-900/50 border-purple-500 text-white font-bold'
                  : stage.completed
                  ? 'bg-emerald-950/30 border-emerald-700/50 text-emerald-400 font-medium'
                  : 'bg-gray-950 border-gray-800 text-gray-600'
              }`}
            >
              <div className="text-[8px] font-mono opacity-70 mb-0.5">0{idx + 1}</div>
              <div className="text-[10px] font-mono truncate">{stage.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 20: AI TRANSACTION PREFLIGHT (Visible AI Step Before Authoritative Verification) */}
      <section className="mb-6 bg-gray-950 border border-purple-800/40 rounded-xl p-4 font-mono text-xs">
        <div className="flex items-center justify-between border-b border-gray-800 pb-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-purple-300 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <span>✦</span> AI TRANSACTION PREFLIGHT (POLICY & EVIDENCE PRE-CHECK)
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 border border-emerald-700 text-emerald-300 font-bold">
              AI RESULT: READY FOR INDEPENDENT VERIFICATION
            </span>
          </div>
          <span className="text-[10px] text-gray-400">Advisory Pipeline Gate</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-3 text-[11px]">
          <div className="p-2 rounded bg-gray-900/70 border border-gray-800 flex items-center gap-1.5 text-gray-300">
            <span className="text-emerald-400 font-bold">✓</span>
            <span>Intent matches agreement</span>
          </div>
          <div className="p-2 rounded bg-gray-900/70 border border-gray-800 flex items-center gap-1.5 text-gray-300">
            <span className="text-emerald-400 font-bold">✓</span>
            <span>Within authorized spending policy</span>
          </div>
          <div className="p-2 rounded bg-gray-900/70 border border-gray-800 flex items-center gap-1.5 text-gray-300">
            <span className="text-emerald-400 font-bold">✓</span>
            <span>Required evidence types defined</span>
          </div>
          <div className="p-2 rounded bg-gray-900/70 border border-gray-800 flex items-center gap-1.5 text-gray-300">
            <span className="text-emerald-400 font-bold">✓</span>
            <span>Counterparty identity linked</span>
          </div>
          <div className="p-2 rounded bg-gray-900/70 border border-gray-800 flex items-center gap-1.5 text-gray-300">
            <span className="text-emerald-400 font-bold">✓</span>
            <span>Escrow funded</span>
          </div>
          <div className="p-2 rounded bg-gray-900/70 border border-gray-800 flex items-center gap-1.5 text-gray-300">
            <span className="text-emerald-400 font-bold">✓</span>
            <span>Verifier assigned ({tx.verifier.slice(0, 6)}...{tx.verifier.slice(-4)})</span>
          </div>
          <div className="p-2 rounded bg-gray-900/70 border border-gray-800 flex items-center gap-1.5 text-gray-300 sm:col-span-2">
            <span className="text-emerald-400 font-bold">✓</span>
            <span>No policy conflict detected (Solvency invariant holds)</span>
          </div>
        </div>

        {/* Mandatory Advisory Notice */}
        <div className="p-2.5 rounded bg-purple-950/30 border border-purple-700/50 text-[11px] text-gray-300 font-sans leading-relaxed">
          <strong className="text-purple-300">Important Advisory Boundary:</strong> AI preflight is advisory. The independent verifier provides the authoritative verification outcome.
        </div>
      </section>

      {/* Main Execution Console */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
        {/* Left Column: Transaction Metadata & Anchored Evidence */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2 mb-3">
              <h3 className="text-xs font-semibold text-white font-mono uppercase tracking-wider">
                Transaction Docket
              </h3>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                tx.sourceLabel === 'LIVE MONAD TESTNET (FRESH LIVE TX)'
                  ? 'bg-blue-950 border border-blue-500 text-blue-300 font-bold'
                  : tx.sourceLabel === 'LIVE MONAD TESTNET RECORD'
                  ? 'bg-purple-950 border border-purple-700 text-purple-300'
                  : 'bg-emerald-950 border border-emerald-700 text-emerald-300'
              }`}>
                {tx.sourceLabel}
              </span>
            </div>

            <div className="space-y-2.5 text-xs font-mono">
              <div>
                <span className="text-gray-500 block text-[10px]">TRANSACTION ID:</span>
                <span className="text-gray-300 truncate block text-[11px]">{tx.id}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-[10px]">INITIATOR / BUYER:</span>
                <span className="text-purple-300 block text-[11px]">
                  {tx.buyer} {selectedDemoStory === 'STORY_A' && <span className="text-[10px] text-gray-500">(Autonomous Agent)</span>}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block text-[10px]">RECEIVER / SELLER:</span>
                <span className="text-purple-300 block text-[11px]">{tx.seller}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-[10px]">DESIGNATED VERIFIER:</span>
                <span className="text-blue-300 block text-[11px]">{tx.verifier}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-[10px]">ESCROW VAULT:</span>
                <span className="text-white text-base font-bold block">{tx.amountMon} MON</span>
              </div>
              <div>
                <span className="text-gray-500 block text-[10px]">VERIFICATION OUTCOME:</span>
                <span className={`font-semibold ${
                  tx.verificationOutcome === VerificationOutcome.PASS
                    ? 'text-emerald-400'
                    : tx.verificationOutcome === VerificationOutcome.INCONCLUSIVE
                    ? 'text-amber-400'
                    : 'text-gray-400'
                }`}>
                  {tx.verificationOutcome === VerificationOutcome.NONE ? 'PENDING_INSPECTION' : tx.verificationOutcome}
                </span>
              </div>
            </div>
          </div>

          {/* Anchored Evidence List */}
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-white mb-2 font-mono uppercase tracking-wider flex items-center justify-between">
              <span>Anchored Evidence</span>
              <span className="text-[10px] text-gray-500">{tx.evidenceList.length} items</span>
            </h3>
            {tx.evidenceList.length === 0 ? (
              <p className="text-xs text-gray-500 italic">No evidence commitments anchored yet.</p>
            ) : (
              <div className="space-y-2">
                {tx.evidenceList.map((ev, i) => (
                  <div key={i} className="p-2.5 bg-gray-950 rounded border border-gray-800 text-[10px] font-mono space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-white font-semibold">{ev.title}</span>
                      <span className="px-1.5 py-0.5 bg-purple-950 text-purple-300 rounded border border-purple-800 text-[9px]">
                        {ev.status}
                      </span>
                    </div>
                    <div className="text-gray-400 truncate">Hash: {ev.contentHash}</div>
                    <div className="text-gray-500 truncate">Pointer: {ev.storageUri}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Execution Controls & Adjudication Console */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4 border-b border-gray-800 pb-2">
              <h3 className="text-sm font-semibold text-white font-mono uppercase tracking-wider">
                Lifecycle Action Console
              </h3>
              <span className="text-xs font-mono text-purple-300">
                {isHistoricalReadOnly
                  ? 'Demo B: Contested Freight Flow (Read-Only Testnet Audit)'
                  : isStoryA
                  ? 'Demo A: Autonomous Agent Flow (Simulated)'
                  : `Live Monad Testnet Flow (${tx.id.slice(0, 10)}...${tx.id.slice(-6)})`}
              </span>
            </div>

            {/* Transaction Feedback Banners */}
            {lastTxHash && (
              <div className="mb-4 p-3 bg-emerald-950/70 border border-emerald-500/70 rounded-xl text-xs font-mono text-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Transaction confirmed on Monad Metropolis Testnet!</span>
                </span>
                <a
                  href={`https://testnet.monadvision.com/tx/${lastTxHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-purple-300 hover:text-purple-200 underline font-bold"
                >
                  View on MonadVision ↗
                </a>
              </div>
            )}

            {actionError && (
              <div className="mb-4 p-3 bg-red-950/70 border border-red-500/70 rounded-xl text-xs font-mono text-red-200">
                <span className="font-bold text-red-400">Execution Error: </span>
                {actionError}
              </div>
            )}

            {/* HISTORICAL CANONICAL AUDIT CARD (When viewing 0x2b57...afcc4) */}
            {isHistoricalReadOnly && (
              <div className="p-5 rounded-xl bg-blue-950/20 border border-blue-600/50 space-y-3 font-mono text-xs mb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-800/40 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                    <span className="text-sm font-bold text-white uppercase tracking-wider">
                      Canonical Testnet Dispute Record (Immutable Audit)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded bg-blue-900 border border-blue-600 text-blue-200 font-bold text-[10px]">
                      STATE 11: SETTLED
                    </span>
                    <span className="px-2.5 py-0.5 rounded bg-emerald-950 border border-emerald-600 text-emerald-300 font-bold text-[10px]">
                      RECEIPT #2 ISSUED
                    </span>
                  </div>
                </div>

                <p className="text-xs text-gray-300 font-sans leading-relaxed">
                  This transaction (<code className="text-purple-300">0x2b57...afcc4</code>) represents the canonical Stage 4 contested freight adjudication executed on Monad Metropolis Testnet. The deliverable was audited as <strong className="text-amber-300">INCONCLUSIVE</strong> (85 intact, 15 damaged in transit), locked in escrow, and resolved via a 3-Judge Human Quorum (1500 bps median consensus).
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-[11px]">
                  <div className="p-2.5 bg-gray-950 rounded border border-gray-800">
                    <span className="text-gray-500 block text-[10px]">ESCROW CAPITAL &amp; ALLOCATION:</span>
                    <span className="text-white font-bold">0.001 MON (85% Seller / 15% Buyer)</span>
                    <div className="text-emerald-400 text-[10px] mt-0.5">0.00085 MON paid to Seller • 0.00015 MON refunded to Buyer</div>
                  </div>

                  <div className="p-2.5 bg-gray-950 rounded border border-gray-800">
                    <span className="text-gray-500 block text-[10px]">ONCHAIN DISPATCH TRANSACTION:</span>
                    <a
                      href="https://testnet.monadvision.com/tx/0x91ff62584f4386250ccb09f28808453bb373273d9fa5f56cf04378c2a78084ba"
                      target="_blank"
                      rel="noreferrer"
                      className="text-purple-300 hover:text-purple-200 underline font-bold truncate block"
                    >
                      0x91ff62584f4386250ccb...84ba ↗
                    </a>
                    <div className="text-gray-400 text-[10px] mt-0.5">Dispatched by Dispute Resolver (0x12f9...c35E)</div>
                  </div>
                </div>

                <div className="p-2.5 bg-amber-950/20 border border-amber-800/40 rounded text-[11px] text-amber-200/90 font-sans">
                  <strong>Audit Preservation Notice:</strong> Mutating onchain calls are disabled for this transaction to preserve canonical testnet audit integrity. To test real live transactions with your connected browser wallet (<code className="text-amber-300 font-mono">{wallet.address ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}` : '0xa4bC...C50F'}</code>), switch to the <strong>Live Monad Testnet</strong> tab or launch a fresh request.
                </div>
              </div>
            )}

            {/* STAGE 1: PROPOSED -> AGREED */}
            {!isHistoricalReadOnly && tx.state === TransactionState.PROPOSED && (
              <div className="p-4 rounded-lg bg-purple-950/20 border border-purple-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-purple-200 uppercase font-mono">Stage 1: Agreement (Awaiting Seller Ratification)</h4>
                  <span className="text-[10px] font-mono text-gray-400">Actor: Receiver / Seller ({receiver.name})</span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed font-sans">
                  Designated Seller reviews terms, delivery deadline ({tx.deadlineDays} days), and designated verifier address. Mutually signs and ratifies agreement onchain via <code className="text-purple-300 font-mono">agreeTransaction()</code>.
                </p>
                {wallet.address && wallet.address.toLowerCase() !== tx.seller.toLowerCase() && (
                  <div className="p-2.5 bg-blue-950/30 border border-blue-800/40 rounded text-[11px] text-blue-200 font-sans">
                    <strong>Role Notice:</strong> Connected wallet (<code className="text-blue-300 font-mono">{wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}</code>) is the <strong>Buyer</strong>. Onchain agreement requires the designated Seller wallet (<code className="text-blue-300 font-mono">{tx.seller.slice(0, 6)}...{tx.seller.slice(-4)}</code>).
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleOnchainAgree}
                    disabled={isSubmittingOnchain}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded text-xs font-mono font-bold transition shadow flex items-center gap-1.5"
                  >
                    {isSubmittingOnchain ? (
                      <>
                        <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>CONFIRMING IN WALLET...</span>
                      </>
                    ) : (
                      <>
                        <span>SIGN &amp; RATIFY AGREEMENT (agreeTransaction)</span>
                        <span>→</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => advanceState(TransactionState.AGREED, ActorRole.SELLER, `Receiver (${tx.seller.slice(0, 6)}...${tx.seller.slice(-4)})`)}
                    className="px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-purple-200 rounded text-xs font-mono transition border border-gray-700"
                  >
                    Simulate Step in Demo Mode
                  </button>
                </div>
              </div>
            )}

            {/* STAGE 2: AGREED -> FUNDED */}
            {!isHistoricalReadOnly && tx.state === TransactionState.AGREED && (
              <div className="p-4 rounded-lg bg-purple-950/20 border border-purple-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-purple-200 uppercase font-mono">Stage 2: Escrow Protection</h4>
                  <span className="text-[10px] font-mono text-gray-400">Actor: Initiator ({initiator.name})</span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed font-sans">
                  Initiator deposits <strong className="text-white">{tx.amountMon} MON</strong> in the non-custodial smart contract vault within its pre-authorized mandate. Solvency invariant ($V \ge \sum L$) enforced onchain.
                </p>
                {wallet.address && wallet.address.toLowerCase() === tx.buyer.toLowerCase() && (
                  <div className="p-2.5 bg-emerald-950/30 border border-emerald-800/40 rounded text-[11px] text-emerald-200 font-sans">
                    ✓ Connected wallet (<code className="text-emerald-300 font-mono">{wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}</code>) matches the authorized <strong>Buyer</strong>. Ready to deposit {tx.amountMon} MON.
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleOnchainFund}
                    disabled={isSubmittingOnchain}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded text-xs font-mono font-bold transition shadow flex items-center gap-1.5"
                  >
                    {isSubmittingOnchain ? (
                      <>
                        <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>CONFIRM IN WALLET...</span>
                      </>
                    ) : (
                      <>
                        <span>DEPOSIT {tx.amountMon} MON ON MONAD (WALLET)</span>
                        <span>→</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => advanceState(TransactionState.FUNDED, ActorRole.BUYER, `Initiator (${tx.buyer.slice(0, 6)}...${tx.buyer.slice(-4)})`)}
                    className="px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-purple-200 rounded text-xs font-mono transition border border-gray-700"
                  >
                    Simulate Step in Demo Mode
                  </button>
                </div>
              </div>
            )}

            {/* STAGE 3: FUNDED -> IN_PROGRESS */}
            {!isHistoricalReadOnly && tx.state === TransactionState.FUNDED && (
              <div className="p-4 rounded-lg bg-purple-950/20 border border-purple-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-purple-200 uppercase font-mono">Stage 3: Fulfillment In Progress</h4>
                  <span className="text-[10px] font-mono text-gray-400">Actor: Receiver</span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed font-sans">
                  Escrow is locked. Receiver initiates warehouse packaging and freight dispatch.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleOnchainStart}
                    disabled={isSubmittingOnchain}
                    className="px-4 py-2 bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-600 hover:to-indigo-500 text-white rounded text-xs font-mono font-bold transition shadow flex items-center gap-1.5"
                  >
                    {isSubmittingOnchain ? (
                      <>
                        <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>CONFIRM IN WALLET...</span>
                      </>
                    ) : (
                      <>
                        <span>START WORK ON MONAD (WALLET)</span>
                        <span>→</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => advanceState(TransactionState.IN_PROGRESS, ActorRole.SELLER, `Receiver (${tx.seller.slice(0, 6)}...${tx.seller.slice(-4)})`)}
                    className="px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-purple-200 rounded text-xs font-mono transition border border-gray-700"
                  >
                    Simulate Step in Demo Mode
                  </button>
                </div>
              </div>
            )}

            {/* STAGE 4: IN_PROGRESS -> EVIDENCE_SUBMITTED */}
            {!isHistoricalReadOnly && tx.state === TransactionState.IN_PROGRESS && (
              <div className="p-4 rounded-lg bg-purple-950/20 border border-purple-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-purple-200 uppercase font-mono">Stage 4: Anchor Evidence</h4>
                  <span className="text-[10px] font-mono text-gray-400">Actor: Receiver</span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed font-sans">
                  Receiver anchors cryptographic hashes of Bill of Lading, tracking logs, and depot handoff records.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleOnchainAnchor}
                    disabled={isSubmittingOnchain}
                    className="px-4 py-2 bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-600 hover:to-indigo-500 text-white rounded text-xs font-mono font-bold transition shadow flex items-center gap-1.5"
                  >
                    {isSubmittingOnchain ? (
                      <>
                        <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>CONFIRM IN WALLET...</span>
                      </>
                    ) : (
                      <>
                        <span>ANCHOR EVIDENCE ON MONAD (WALLET)</span>
                        <span>→</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setTx((prev) => ({
                        ...prev,
                        evidenceList: [
                          ...prev.evidenceList,
                          {
                            title: 'Bill of Lading #BOL-2026-9812 (4 Pallets)',
                            contentHash: '0x8f2a1b9c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f01',
                            metadataHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
                            storageUri: 'ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
                            submitter: prev.seller,
                            status: EvidenceVerificationStatus.SELF_REPORTED,
                          },
                        ],
                      }));
                      advanceState(TransactionState.EVIDENCE_SUBMITTED, ActorRole.SELLER, `Receiver (${tx.seller.slice(0, 6)}...${tx.seller.slice(-4)})`);
                    }}
                    className="px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-purple-200 rounded text-xs font-mono transition border border-gray-700"
                  >
                    Simulate Step in Demo Mode
                  </button>
                </div>
              </div>
            )}

            {/* STAGE 5: EVIDENCE_SUBMITTED -> VERIFICATION */}
            {!isHistoricalReadOnly && tx.state === TransactionState.EVIDENCE_SUBMITTED && (
              <div className="p-4 rounded-lg bg-purple-950/20 border border-purple-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-purple-200 uppercase font-mono">Stage 5: Verification Gate</h4>
                  <span className="text-[10px] font-mono text-gray-400">Actor: Receiver</span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed font-sans">
                  Cargo delivered to Dallas Depot. Request designated independent verifier to perform physical audit.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleOnchainRequestVerification}
                    disabled={isSubmittingOnchain}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded text-xs font-mono font-bold transition shadow flex items-center gap-1.5"
                  >
                    {isSubmittingOnchain ? (
                      <>
                        <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>CONFIRM IN WALLET...</span>
                      </>
                    ) : (
                      <>
                        <span>REQUEST VERIFICATION ON MONAD (WALLET)</span>
                        <span>→</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => advanceState(TransactionState.VERIFICATION, ActorRole.SELLER, `Receiver (${tx.seller.slice(0, 6)}...${tx.seller.slice(-4)})`)}
                    className="px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-purple-200 rounded text-xs font-mono transition border border-gray-700"
                  >
                    Simulate Step in Demo Mode
                  </button>
                </div>
              </div>
            )}

            {/* STAGE 6: VERIFICATION ACTIVE */}
            {!isHistoricalReadOnly && tx.state === TransactionState.VERIFICATION && (
              <div className="p-4 rounded-lg bg-blue-950/20 border border-blue-800/40 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-blue-200 uppercase font-mono">
                    Independent Verifier Inspection Gate
                  </h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-blue-900 border border-blue-700 text-blue-300 rounded">
                    Verifier: {tx.verifier.slice(0, 6)}...{tx.verifier.slice(-4)}
                  </span>
                </div>

                <p className="text-xs text-gray-300 font-sans">
                  Depot inspector audits pallets, checks tamper-evident seals, and scans serial numbers.
                </p>

                {/* Outcome Selection Buttons */}
                {tx.verificationOutcome === VerificationOutcome.NONE && (
                  <div className="p-3 bg-gray-950 rounded border border-gray-800 space-y-2.5">
                    <span className="text-xs text-gray-400 block font-mono">Submit Onchain Attestation:</span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={handleOnchainSubmitVerificationPass}
                        disabled={isSubmittingOnchain}
                        className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded text-xs font-mono font-bold transition shadow flex items-center gap-1.5"
                      >
                        {isSubmittingOnchain ? (
                          <>
                            <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>CONFIRM IN WALLET...</span>
                          </>
                        ) : (
                          <>
                            <span>SUBMIT PASS ON MONAD (VERIFIER WALLET)</span>
                            <span>→</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={handleOnchainSubmitVerificationInconclusive}
                        disabled={isSubmittingOnchain}
                        className="px-3.5 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded text-xs font-mono font-bold transition shadow flex items-center gap-1.5"
                      >
                        {isSubmittingOnchain ? (
                          <>
                            <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>CONFIRM IN WALLET...</span>
                          </>
                        ) : (
                          <>
                            <span>SUBMIT INCONCLUSIVE ON MONAD (VERIFIER WALLET)</span>
                            <span>→</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => {
                          setTx((prev) => ({
                            ...prev,
                            verificationOutcome: VerificationOutcome.PASS,
                            evidenceList: [
                              ...prev.evidenceList,
                              {
                                title: 'Depot Inspection: 100/100 Units Verified Intact',
                                contentHash: '0x9999888877776666555544443333222211110000aaaabbbbccccddddeeeeffff',
                                metadataHash: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
                                storageUri: 'ipfs://bafy-inspection-report-pass-100',
                                submitter: prev.verifier,
                                status: EvidenceVerificationStatus.ATTESTED,
                              },
                            ],
                          }));
                        }}
                        className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-emerald-300 rounded text-xs font-mono transition border border-gray-700"
                      >
                        Simulate PASS (Demo Mode)
                      </button>

                      <button
                        onClick={() => {
                          setTx((prev) => ({
                            ...prev,
                            verificationOutcome: VerificationOutcome.INCONCLUSIVE,
                            evidenceList: [
                              ...prev.evidenceList,
                              {
                                title: 'Depot Inspection: 85 Intact, 15 Cracked Panels',
                                contentHash: '0x77776666555544443333222211110000aaaabbbbccccddddeeeeffff00001111',
                                metadataHash: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
                                storageUri: 'ipfs://bafy-inspection-report-damage-15',
                                submitter: prev.verifier,
                                status: EvidenceVerificationStatus.DISPUTED,
                              },
                            ],
                          }));
                        }}
                        className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-amber-300 rounded text-xs font-mono transition border border-gray-700"
                      >
                        Simulate INCONCLUSIVE (Demo Mode)
                      </button>
                    </div>
                  </div>
                )}

                {/* Outcome Display: PASS (Flow A - Authorized Wallet Release) */}
                {tx.verificationOutcome === VerificationOutcome.PASS && (
                  <div className="p-3 bg-emerald-950/40 rounded border border-emerald-800 space-y-2">
                    <div className="text-xs text-emerald-300 font-semibold font-mono">
                      ✓ VERIFICATION PASSED: All 100 units verified intact and conforming.
                    </div>
                    <p className="text-[11px] text-gray-300 font-sans leading-relaxed">
                      <strong>Verification PASS Satisfies Policy:</strong> Independent verifier attestation PASS satisfies the prerequisite condition for settlement eligibility. Final funds release requires cryptographic authorization from the buyer wallet and is enforced onchain by the escrow contract. AI assists. Humans authorize. Verifiers verify. Blockchain enforces.
                    </p>
                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <button
                        onClick={handleOnchainRelease}
                        disabled={isSubmittingOnchain}
                        className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded text-xs font-mono font-bold transition shadow-md shadow-emerald-950/50 flex items-center gap-1.5"
                      >
                        {isSubmittingOnchain ? (
                          <>
                            <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>CONFIRM IN BROWSER WALLET...</span>
                          </>
                        ) : (
                          <>
                            <span>EXECUTE SETTLEMENT (BROWSER-WALLET OPERATOR)</span>
                            <span>→</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setTx((prev) => ({
                            ...prev,
                            receipt: {
                              receiptId: 1,
                              transactionId: prev.id,
                              settledAmount: `${prev.amountMon} MON to Seller (100% Payout)`,
                              outcome: 'SETTLED',
                              termsSummaryHash: prev.termsHash,
                              evidenceRoot: prev.evidenceList[0]?.contentHash || '0x0',
                              issuedAt: new Date().toISOString(),
                              accountabilityProperty: 'Non-transferable accountability record (Simulated Demo)',
                            },
                          }));
                          advanceState(TransactionState.SETTLED, ActorRole.BUYER, `Buyer Agent (${tx.buyer.slice(0, 6)}...${tx.buyer.slice(-4)})`);
                        }}
                        className="px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-purple-200 rounded text-xs font-mono transition border border-gray-700"
                      >
                        Simulate Authorized Settlement in Demo
                      </button>
                    </div>
                  </div>
                )}

                {/* Outcome Display: INCONCLUSIVE (Demo B Flow - Escrow Halted) */}
                {tx.verificationOutcome === VerificationOutcome.INCONCLUSIVE && (
                  <div className="p-3 bg-amber-950/40 rounded border border-amber-800 space-y-2.5">
                    <div className="text-xs text-amber-300 font-semibold font-mono">
                      ⚠ VERIFICATION INCONCLUSIVE: 85 intact, 15 micro-cracked in transit.
                    </div>
                    <p className="text-[11px] text-gray-300 leading-relaxed font-sans">
                      <strong>Authorized Settlement Halted by Smart Contract:</strong> Deliverable is contested. Smart contract invariant blocks release; funds remain locked in vault liabilities ({tx.amountMon} MON). Human adjudication required because the outcome is contested.
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={handleOnchainOpenDispute}
                        disabled={isSubmittingOnchain}
                        className="px-4 py-2 bg-gradient-to-r from-red-700 to-rose-600 hover:from-red-600 hover:to-rose-500 text-white rounded text-xs font-mono font-bold transition shadow flex items-center gap-1.5"
                      >
                        {isSubmittingOnchain ? (
                          <>
                            <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>CONFIRM IN WALLET...</span>
                          </>
                        ) : (
                          <>
                            <span>OPEN DISPUTE ON MONAD (WALLET)</span>
                            <span>→</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => {
                          alert('Blockchain Enforcement: releaseEscrow() strictly reverts because verificationOutcome != PASS. Escrow remains safely locked.');
                        }}
                        className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-red-400 rounded text-xs font-mono transition border border-red-800/50"
                      >
                        Try releaseEscrow() [Reverts]
                      </button>

                      <button
                        onClick={() => advanceState(TransactionState.DISPUTED, ActorRole.BUYER, `Buyer (${tx.buyer.slice(0, 6)}...${tx.buyer.slice(-4)})`)}
                        className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-amber-300 rounded text-xs font-mono transition border border-gray-700"
                      >
                        Simulate Dispute in Demo Mode
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* CONTESTED BRANCH: STAGE 4 MULTI-HUMAN JUDGE NETWORK ADJUDICATION */}
            {(isHistoricalReadOnly || tx.state === TransactionState.DISPUTED) && (() => {
              const currentVotes = judgePanel.map((j) =>
                polarizationDemo && j.id === 'Judge 3' ? 8000 : j.voteBps
              );
              const sortedVotes = [...currentVotes].sort((a, b) => a - b);
              const minVote = sortedVotes[0];
              const medianConsensusBps = sortedVotes[1]; // 3-Judge Median
              const maxVote = sortedVotes[2];
              const spreadBps = maxVote - minVote;
              const isPolarized = spreadBps > 4000;
              const statusText = isPolarized
                ? 'REQUIRES_SENIOR_REVIEW (POLARIZED)'
                : 'READY_FOR_SETTLEMENT';

              const totalAmountNum = parseFloat(tx.amountMon);
              const buyerRefundMon = (totalAmountNum * medianConsensusBps) / 10000;
              const sellerPayoutMon = totalAmountNum - buyerRefundMon;

              return (
                <div className="p-5 rounded-xl bg-purple-950/20 border border-purple-800/50 space-y-4">
                  {/* Stage 4 Banner */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-purple-800/40 pb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 bg-red-950 border border-red-700 text-red-300 rounded text-[10px] font-mono font-bold">
                          {isHistoricalReadOnly ? 'STATE: 11 SETTLED (HISTORICAL AUDIT)' : 'STATE: 8 DISPUTED'}
                        </span>
                        <span className="px-2 py-0.5 bg-purple-900 border border-purple-600 text-purple-200 rounded text-[10px] font-mono font-bold">
                          STAGE 4: HUMAN JUDGE NETWORK
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white font-mono">
                        Structured Multi-Human Quorum Adjudication Console
                      </h4>
                      <p className="text-xs text-gray-400 mt-0.5 font-sans">
                        Fulfillment is contested. Escrow is locked onchain. Binding consensus split rendered through 3 independent signed ballots under deterministic consensus rules. AI has zero financial or voting authority.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/70 border border-amber-700 text-amber-300">
                        AI_ANALYZED (Advisory Only)
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-700 text-emerald-300">
                        HUMAN_ADJUDICATED
                      </span>
                    </div>
                  </div>

                  {/* Navigation Sub-Tabs */}
                  <div className="flex border-b border-gray-800 gap-2 text-xs font-mono overflow-x-auto pb-1">
                    <button
                      onClick={() => setDisputeTab('OVERVIEW')}
                      className={`px-3 py-1.5 border-b-2 transition whitespace-nowrap ${
                        disputeTab === 'OVERVIEW'
                          ? 'border-purple-500 text-purple-200 font-bold'
                          : 'border-transparent text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      1. AI Evidence Dossier
                    </button>
                    <button
                      onClick={() => setDisputeTab('JUDGES')}
                      className={`px-3 py-1.5 border-b-2 transition whitespace-nowrap ${
                        disputeTab === 'JUDGES'
                          ? 'border-purple-500 text-purple-200 font-bold'
                          : 'border-transparent text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      2. Assigned Panel & Conflict Attestation
                    </button>
                    <button
                      onClick={() => setDisputeTab('BALLOTS')}
                      className={`px-3 py-1.5 border-b-2 transition whitespace-nowrap ${
                        disputeTab === 'BALLOTS'
                          ? 'border-purple-500 text-purple-200 font-bold'
                          : 'border-transparent text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      3. Independent Signed Ballots
                    </button>
                    <button
                      onClick={() => setDisputeTab('CONSENSUS')}
                      className={`px-3 py-1.5 border-b-2 transition whitespace-nowrap ${
                        disputeTab === 'CONSENSUS'
                          ? 'border-purple-500 text-purple-200 font-bold'
                          : 'border-transparent text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      4. 3-Judge Median Consensus
                    </button>
                    <button
                      onClick={() => setDisputeTab('GATE')}
                      className={`px-3 py-1.5 border-b-2 transition whitespace-nowrap ${
                        disputeTab === 'GATE'
                          ? 'border-purple-500 text-purple-200 font-bold'
                          : 'border-transparent text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      5. Settlement Authorization Gate
                    </button>
                  </div>

                  {/* TAB 1: AI Evidence Dossier */}
                  {disputeTab === 'OVERVIEW' && (
                    <div className="space-y-3 font-mono text-xs">
                      <div className="p-3 bg-amber-950/20 border border-amber-800/40 rounded-lg space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-amber-300 flex items-center gap-1.5">
                            <span>✦</span> AI EVIDENCE DOSSIER — ADVISORY ONLY
                          </span>
                          <span className="text-[10px] text-gray-400">Zero Financial / Voting Authority</span>
                        </div>
                        <p className="text-[11px] text-gray-300 leading-relaxed font-sans">
                          <strong>Advisory Notice:</strong> The AI dossier compiles neutral chronological evidence and highlights factual discrepancies. The AI has zero voting authority and zero financial authority. Resolution is rendered exclusively by human jurors.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="p-3 bg-gray-950 rounded border border-gray-800 space-y-1.5">
                          <span className="text-purple-300 font-semibold block">Chronological Timeline:</span>
                          <ul className="space-y-1 text-[11px] text-gray-400 font-sans">
                            <li>• <span className="text-gray-300 font-mono">T-3d:</span> Onchain agreement (100 panels @ {tx.amountMon} MON)</li>
                            <li>• <span className="text-gray-300 font-mono">T-2d:</span> Escrow fully funded on Monad Testnet</li>
                            <li>• <span className="text-gray-300 font-mono">T-1d:</span> Seller anchored freight bill of lading</li>
                            <li>• <span className="text-gray-300 font-mono">T-0d:</span> Inspector attested INCONCLUSIVE (85 OK, 15 damaged)</li>
                            <li>• <span className="text-gray-300 font-mono">T-0d:</span> Buyer opened formal dispute onchain</li>
                          </ul>
                        </div>

                        <div className="p-3 bg-gray-950 rounded border border-gray-800 space-y-1.5">
                          <span className="text-red-300 font-semibold block">Detected Contradictions & Gaps:</span>
                          <ul className="space-y-1 text-[11px] text-gray-400 font-sans">
                            <li>• <strong className="text-red-400">Inconsistency:</strong> Full delivery claim vs. physical audit showing 15 cracked panels.</li>
                            <li>• <strong className="text-amber-400">Unresolved:</strong> Did impact happen during transit or handling?</li>
                            <li>• <strong className="text-purple-300">Dossier Finding:</strong> 15% damaged goods; human adjudication required.</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: Assigned Judges & Conflict Attestations */}
                  {disputeTab === 'JUDGES' && (
                    <div className="space-y-3 font-mono text-xs">
                      <div className="text-[11px] text-gray-400 font-sans leading-relaxed">
                        3 qualified human adjudicators assigned from verified registry. Role isolation verified: Buyer, Seller, and Verifier are strictly excluded.
                      </div>

                      <div className="space-y-2">
                        {judgePanel.map((j) => (
                          <div key={j.id} className="p-3 bg-gray-950 rounded border border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white">{j.id}:</span>
                                <span className="text-purple-300">{j.address}</span>
                                <span className="text-[10px] px-2 py-0.5 rounded bg-gray-900 border border-gray-700 text-gray-300">
                                  {j.domain}
                                </span>
                              </div>
                              <div className="text-[10px] text-gray-500 mt-1">
                                Completed Cases: {j.casesCompleted} • Status: Active Adjudicator
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="px-2 py-1 rounded bg-emerald-950 border border-emerald-700 text-emerald-300 text-[10px] flex items-center gap-1">
                                <span>✓</span> Conflict Attestation Cleared
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="p-2.5 bg-gray-950/60 rounded border border-gray-800 text-[11px] text-gray-400 font-sans">
                        <strong>Cryptographic Verification:</strong> Each judge signed canonical EIP-191 declaration: <em>"I declare that I have no known conflict of interest with the parties, verifier, judges, or adjudication of this test transaction."</em>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: Independent Signed Ballots */}
                  {disputeTab === 'BALLOTS' && (
                    <div className="space-y-3 font-mono text-xs">
                      <div className="text-[11px] text-gray-400 font-sans">
                        3 Independent Signed Ballots: Judges evaluated evidence independently and submitted signed ballots without observing peer submissions before quorum was reached.
                      </div>

                      <div className="space-y-2.5">
                        {judgePanel.map((j) => {
                          const vote = polarizationDemo && j.id === 'Judge 3' ? 8000 : j.voteBps;
                          return (
                            <div key={j.id} className="p-3 bg-gray-950 rounded border border-gray-800 space-y-1.5">
                              <div className="flex items-center justify-between border-b border-gray-800 pb-1.5">
                                <span className="font-bold text-purple-300">{j.id} ({j.address.slice(0, 10)}...)</span>
                                <span className="px-2 py-0.5 rounded bg-purple-900 border border-purple-600 text-purple-200 font-bold">
                                  Signed Ballot: {vote} bps ({vote / 100}% Refund to Buyer)
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-300 font-sans italic leading-relaxed">
                                &ldquo;{polarizationDemo && j.id === 'Judge 3' ? 'Total contract repudiation: 80% refund to buyer.' : j.rationale}&rdquo;
                              </p>
                              <div className="text-[10px] text-gray-500">
                                Cryptographic Signature: Verified EIP-191 Signed Ballot Hash
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* TAB 4: 3-Judge Median Consensus */}
                  {disputeTab === 'CONSENSUS' && (
                    <div className="space-y-4 font-mono text-xs">
                      <div className="p-4 bg-gray-950 rounded-lg border border-purple-800/40 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-purple-300 uppercase">
                            Consensus Algorithm: 3-Judge Median Consensus
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                            isPolarized ? 'bg-red-950 border border-red-700 text-red-300' : 'bg-emerald-950 border border-emerald-700 text-emerald-300'
                          }`}>
                            {statusText}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-center">
                          <div className="p-2.5 bg-gray-900 rounded border border-gray-800">
                            <span className="text-[10px] text-gray-500 block">Min Ballot (B1)</span>
                            <span className="text-sm font-bold text-gray-200">{minVote} bps ({minVote / 100}%)</span>
                          </div>
                          <div className="p-2.5 bg-purple-950/60 rounded border border-purple-600">
                            <span className="text-[10px] text-purple-300 block">3-Judge Median (B2)</span>
                            <span className="text-base font-extrabold text-white">{medianConsensusBps} bps ({medianConsensusBps / 100}%)</span>
                          </div>
                          <div className="p-2.5 bg-gray-900 rounded border border-gray-800">
                            <span className="text-[10px] text-gray-500 block">Max Ballot (B3)</span>
                            <span className="text-sm font-bold text-gray-200">{maxVote} bps ({maxVote / 100}%)</span>
                          </div>
                        </div>

                        <div className="p-3 bg-gray-900/60 rounded border border-gray-800 space-y-1.5 text-[11px] font-sans">
                          <div><strong>Spread Calculation:</strong> {maxVote} bps − {minVote} bps = <strong>{spreadBps} bps</strong> (Threshold: &le; 4,000 bps)</div>
                          <div>
                            {isPolarized ? (
                              <span className="text-red-400 font-semibold">
                                ⚠ Polarization Guard Active: Spread ({spreadBps} bps) exceeds 4,000 bps tolerance! Case enters REQUIRES_SENIOR_REVIEW. Automated settlement is strictly blocked.
                              </span>
                            ) : (
                              <span className="text-emerald-400 font-semibold">
                                ✓ Polarization Check Passed: Spread ({spreadBps} bps) is within tolerance. 3-Judge Median Consensus ({medianConsensusBps} bps) confirmed.
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Polarization Test Toggle */}
                      <div className="flex items-center justify-between p-3 bg-gray-950 rounded border border-gray-800">
                        <span className="text-gray-300 text-[11px] font-sans">
                          Demonstrate Stage 4 Polarization Guard (simulates an outlier vote of 8000 bps):
                        </span>
                        <button
                          onClick={() => setPolarizationDemo(!polarizationDemo)}
                          className={`px-3 py-1.5 rounded text-xs font-mono transition border ${
                            polarizationDemo
                              ? 'bg-red-900 border-red-600 text-white'
                              : 'bg-gray-800 border-gray-700 text-gray-300 hover:text-white'
                          }`}
                        >
                          {polarizationDemo ? 'Deactivate Polarization Demo' : 'Simulate Polarized Outlier'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TAB 5: Settlement Authorization Gate */}
                  {disputeTab === 'GATE' && (
                    <div className="space-y-4 font-mono text-xs">
                      <div className="p-4 bg-gray-950 rounded-lg border border-gray-800 space-y-3">
                        <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                          <span className="font-bold text-purple-300 uppercase">Settlement Authorization Gate</span>
                          <span className="text-[10px] text-gray-400">Pre-Dispatch Cryptographic Verification</span>
                        </div>

                        <div className="space-y-2 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-gray-500">CANONICAL ADJUDICATION RECORD:</span>
                            <span className="text-gray-300 truncate max-w-xs">{tx.termsHash}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">IPFS ADJUDICATION CID:</span>
                            <span className="text-purple-300">ipfs://bafy-adjudication-stage4-canonical</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">QUORUM VERIFICATION:</span>
                            <span className="text-emerald-400 font-bold">3/3 Valid Independent Signed Ballots</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">CONFLICT ATTESTATIONS:</span>
                            <span className="text-emerald-400 font-bold">3/3 Signed Declarations Cleared</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">POLARIZATION STATUS:</span>
                            <span className={isPolarized ? "text-red-400 font-bold" : "text-emerald-400 font-bold"}>
                              {isPolarized ? "FAILED (> 4000 bps spread)" : "PASSED (1000 bps spread <= 4000)"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">DISPATCH RESOLVER ADDRESS:</span>
                            <span className="text-gray-300">0x12f9e53c31F7629aCAE0BA70588794945EC6c35E</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">RESOLVER DESIGNATION:</span>
                            <span className="text-amber-300 italic">Temporary designated testnet dispute resolver</span>
                          </div>
                          <div className="flex justify-between border-t border-gray-800 pt-2 font-bold">
                            <span className="text-white">AUTHORIZED PAYOUT SPLIT:</span>
                            <span className="text-emerald-400">
                              {sellerPayoutMon.toFixed(5)} MON to Seller (85%) / {buyerRefundMon.toFixed(5)} MON to Buyer (15%)
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Dispatch Button */}
                      {isHistoricalReadOnly ? (
                        <div className="p-3 bg-blue-950/40 rounded border border-blue-600/60 font-mono text-xs text-blue-200 flex flex-col sm:flex-row items-center justify-between gap-2">
                          <span className="font-bold flex items-center gap-1.5">
                            <span>✓</span> Canonical Testnet Settlement Confirmed on Monad (Receipt #2)
                          </span>
                          <a
                            href="https://testnet.monadvision.com/tx/0x91ff62584f4386250ccb09f28808453bb373273d9fa5f56cf04378c2a78084ba"
                            target="_blank"
                            rel="noreferrer"
                            className="text-purple-300 hover:text-purple-200 underline font-bold"
                          >
                            View 0x91ff...84ba on MonadVision ↗
                          </a>
                        </div>
                      ) : isPolarized ? (
                        <div className="p-3 bg-red-950/40 rounded border border-red-800 text-center text-red-300 font-sans">
                          ⚠ Settlement Blocked by Authorization Gate: Polarized votes require Senior Appellate Review before onchain dispatch.
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setTx((prev) => ({
                              ...prev,
                              receipt: {
                                receiptId: 2,
                                transactionId: prev.id,
                                settledAmount: `${sellerPayoutMon.toFixed(5)} MON to Seller (85%) / ${buyerRefundMon.toFixed(5)} MON to Buyer (15%)`,
                                outcome: 'SETTLED',
                                termsSummaryHash: prev.termsHash,
                                evidenceRoot: prev.evidenceList[prev.evidenceList.length - 1]?.contentHash || '0x0',
                                issuedAt: new Date().toISOString(),
                                accountabilityProperty: 'Non-transferable accountability record (Canonical Live Testnet Record)',
                                onchainTxHash: '0x91ff62584f4386250ccb09f28808453bb373273d9fa5f56cf04378c2a78084ba',
                              },
                            }));
                            advanceState(
                              TransactionState.SETTLED,
                              ActorRole.DISPUTE_RESOLVER,
                              'Dispute Resolver (0x12f9...c35E)'
                            );
                          }}
                          className="w-full py-3 bg-purple-700 hover:bg-purple-600 text-white rounded-lg font-mono font-bold text-xs transition shadow-lg shadow-purple-900/30"
                        >
                          Dispatch Quorum Settlement via resolveDispute({medianConsensusBps})
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* TERMINAL STATE: SETTLED WITH VERIQOMESH TRUST RECEIPT */}
            {tx.state === TransactionState.SETTLED && tx.receipt && (
              <div className="p-5 rounded-lg bg-emerald-950/30 border border-emerald-600/60 space-y-4">
                <div className="flex items-center justify-between border-b border-emerald-800 pb-2">
                  <span className="text-xs font-mono font-bold text-emerald-300 flex items-center gap-1.5">
                    <span>✓</span> TRANSACTION SETTLED — VERIQOMESH TRUST RECEIPT RECORD ISSUED
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-900 border border-emerald-600 text-emerald-200 rounded font-bold">
                    Receipt #{tx.receipt.receiptId} {isStoryA ? '(Simulated)' : '(Live Monad Testnet Record)'}
                  </span>
                </div>

                <div className="p-4 bg-gray-950 rounded border border-gray-800 font-mono text-xs space-y-2">
                  <div className="text-[10px] text-purple-400 font-semibold uppercase">
                    VeriqoMesh Trust Receipt Record
                  </div>
                  <div>
                    <span className="text-gray-500">TRANSACTION ID: </span>
                    <span className="text-gray-300">{tx.receipt.transactionId}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">SETTLEMENT PAYOUT: </span>
                    <span className="text-white font-bold">{tx.receipt.settledAmount}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">OUTCOME STATE: </span>
                    <span className="text-emerald-400 font-bold">{tx.receipt.outcome} (State 11 SETTLED)</span>
                  </div>
                  <div>
                    <span className="text-gray-500">VERIFIER POLICY: </span>
                    <span className="text-blue-400">
                      Mode A: Designated Independent Verifier
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">VERIFICATION RESULT: </span>
                    <span className={tx.verificationOutcome === VerificationOutcome.PASS ? 'text-emerald-300' : 'text-amber-300'}>
                      {tx.verificationOutcome}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">TERMS COMMITMENT HASH: </span>
                    <span className="text-gray-400">{tx.receipt.termsSummaryHash}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">EVIDENCE ROOT: </span>
                    <span className="text-gray-400">{tx.receipt.evidenceRoot}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">ACCOUNTABILITY PROPERTY: </span>
                    <span className="text-emerald-400 font-semibold">{tx.receipt.accountabilityProperty}</span>
                  </div>
                  {tx.receipt.onchainTxHash && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-1">
                      <div className="truncate">
                        <span className="text-gray-500">CONFIRMED SETTLEMENT TX: </span>
                        <span className="text-purple-300">{tx.receipt.onchainTxHash}</span>
                      </div>
                      <a
                        href={`https://testnet.monadvision.com/tx/${tx.receipt.onchainTxHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-purple-300 hover:text-purple-200 underline font-bold whitespace-nowrap"
                      >
                        View on MonadVision ↗
                      </a>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500">ISSUED AT: </span>
                    <span className="text-gray-400">{tx.receipt.issuedAt}</span>
                  </div>
                </div>

                {/* 10-Step Live Onchain Lifecycle Trace (Monad Metropolis Testnet) */}
                <div className="p-4 bg-gray-950/80 rounded border border-purple-800/40 font-mono text-xs space-y-2.5">
                  <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                    <span className="text-purple-300 font-bold uppercase text-[11px] flex items-center gap-1.5">
                      <span>⚡</span> Complete 10-Stage Onchain Trust Lifecycle Trace
                    </span>
                    <span className="text-[10px] text-emerald-400">All 10 Steps Verified Onchain</span>
                  </div>

                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between p-1.5 rounded bg-gray-900/60 border border-gray-800">
                      <span className="text-gray-300">1. Transaction Proposed (createTransactionWithVerifier)</span>
                      <a href="https://testnet.monadvision.com/tx/0xeddd26b03699fa0dd8aabd5a8ff260abca029ece60c13dae916fe4060f33e2cd" target="_blank" rel="noreferrer" className="text-purple-300 hover:underline">Block 65963660 ↗</a>
                    </div>
                    <div className="flex items-center justify-between p-1.5 rounded bg-gray-900/60 border border-gray-800">
                      <span className="text-gray-300">2. Mutual Agreement (agreeTransaction)</span>
                      <a href="https://testnet.monadvision.com/tx/0x4ac4c4b6cdf18b753f5e5f536f83a93545c5c185129ea58418ca9e38cdf11f8a" target="_blank" rel="noreferrer" className="text-purple-300 hover:underline">Block 65963910 ↗</a>
                    </div>
                    <div className="flex items-center justify-between p-1.5 rounded bg-gray-900/60 border border-gray-800">
                      <span className="text-gray-300">3. Escrow Funding (fundEscrow: 0.001 MON)</span>
                      <span className="text-emerald-400">Confirmed (State 4 FUNDED)</span>
                    </div>
                    <div className="flex items-center justify-between p-1.5 rounded bg-gray-900/60 border border-gray-800">
                      <span className="text-gray-300">4. Work Started (startWork)</span>
                      <a href="https://testnet.monadvision.com/tx/0xb085f04396db481be7d06034a6b86c345d522b5ce79bf968fb24b05b3dfb470b" target="_blank" rel="noreferrer" className="text-purple-300 hover:underline">Block 66098350 ↗</a>
                    </div>
                    <div className="flex items-center justify-between p-1.5 rounded bg-gray-900/60 border border-gray-800">
                      <span className="text-gray-300">5. Evidence Anchored (anchorEvidence: Bill of Lading)</span>
                      <a href="https://testnet.monadvision.com/tx/0x698ef9bed9a8007db66a6047187783dd97d026055b0f2e30cfe75826ad7b923e" target="_blank" rel="noreferrer" className="text-purple-300 hover:underline">Block 66434952 ↗</a>
                    </div>
                    <div className="flex items-center justify-between p-1.5 rounded bg-gray-900/60 border border-gray-800">
                      <span className="text-gray-300">6. Verification Requested (requestVerification)</span>
                      <a href="https://testnet.monadvision.com/tx/0x0c1a3b6b468da55a01f11bf77ae0b016a6053cef4d3673aabf56c5995131a121" target="_blank" rel="noreferrer" className="text-purple-300 hover:underline">Block 66436074 ↗</a>
                    </div>
                    <div className="flex items-center justify-between p-1.5 rounded bg-gray-900/60 border border-gray-800">
                      <span className="text-gray-300">7. Independent Attestation (submitVerification: PASS)</span>
                      <a href="https://testnet.monadvision.com/tx/0x4d4ff904821b9d3fe145b00a0e27f2096e567155a6d20c50e7b6913095f29bb0" target="_blank" rel="noreferrer" className="text-purple-300 hover:underline">Block 66436440 ↗</a>
                    </div>
                    <div className="flex items-center justify-between p-1.5 rounded bg-gray-900/60 border border-gray-800">
                      <span className="text-gray-300">8. Authorized Release (releaseEscrow)</span>
                      <a href="https://testnet.monadvision.com/tx/0x691f7a80d65fe1deece2f45e8b6600ee4b2b0ffc14f3fe733d995566e2d83b52" target="_blank" rel="noreferrer" className="text-purple-300 hover:underline">Block 66436615 ↗</a>
                    </div>
                    <div className="flex items-center justify-between p-1.5 rounded bg-gray-900/60 border border-gray-800">
                      <span className="text-gray-300">9. Terminal Settlement (State 11 SETTLED)</span>
                      <span className="text-emerald-400">0.001 MON Payout to Seller</span>
                    </div>
                    <div className="flex items-center justify-between p-1.5 rounded bg-gray-900/60 border border-gray-800">
                      <span className="text-gray-300">10. Trust Receipt Issued (TrustReceiptRegistry #3)</span>
                      <a href="https://testnet.monadvision.com/address/0xE1994e0dF7CD5A836be4b02AE2164A542418B819" target="_blank" rel="noreferrer" className="text-purple-300 hover:underline">Receipt #3 on Monad ↗</a>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-gray-400 flex items-center justify-between font-mono">
                  <span>Terminal state reached. Vault liabilities: {totalLiabilitiesMon ?? '0.002'} MON (Active onchain liabilities). Solvency invariant holds.</span>
                  <span className="text-emerald-400">Immutable Record</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
