'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useMonadWallet, MonadWalletState, MONAD_RPC_URL } from '../hooks/useMonadWallet';
import { TrustMeshClient } from '@trustmesh/sdk';
import { TransactionState, VerificationOutcome, PersistentInvitation, CanonicalAgreementTerms } from '@trustmesh/types';
import { calculateActionableRequestsCount, isBenchmarkRequest, isWalletCompatibleWithRole, type RoleCompatibility } from '../lib/invitation-utils';

export type DemoRole = 'INITIATOR' | 'RECEIVER';


export const DEPLOYED_ESCROW_ADDRESS = '0x925ea880cA53DE0352b84B24d0C0dee5B258015A';
export const DEPLOYED_REGISTRY_ADDRESS = '0xE1994e0dF7CD5A836be4b02AE2164A542418B819';
export const CANONICAL_RESOLVER_ADDRESS = '0x12f9e53c31F7629aCAE0BA70588794945EC6c35E';
export const CANONICAL_TESTNET_TX_ID = '0x2b57d6b0ef1ba16a60c4f801d90d27d23e598fd6b1381e0175077201dc6afcc4';
export const HISTORICAL_RUN1_LIVE_TX_ID = '0x0bb2eaa948a832b6ef45773bf29b81febf1b8342e7479ba518c7d495905b250a';
export const HISTORICAL_RUN1_LIVE_TX_HASH = '0xe87b628e60038c1e190652d619220b85481fca2cdfbd7717b2e4ea353dec9cd8';
export const HISTORICAL_LIVE_TESTNET_TX_ID = HISTORICAL_RUN1_LIVE_TX_ID;
export const HISTORICAL_LIVE_TESTNET_TX_HASH = HISTORICAL_RUN1_LIVE_TX_HASH;

// Historical Parked Monad Metropolis Testnet Transaction (Unrecoverable Verifier: 0x16D7...4EA)
export const HISTORICAL_PARKED_TESTNET_TX_ID = '0xbbd0176291d62b32c3e096d0314c0fab6bcfa9131c1b26a825b3ce994e645f5e';
export const HISTORICAL_PARKED_TESTNET_TX_HASH = '0xe15f3dcfd500afe658b1703e36bb4d3de58305343f25997b4b59694d3366b39c';

// Fresh Live Monad Metropolis Testnet Transaction (Approved Operator Verifier: 0xb064...2c48)
export const APPROVED_OPERATOR_VERIFIER_TX_ID = '0x961c70865bf6097eb16d1b3a19d90f950b2cdd789eda5554c93baba1de0954e1';
export const APPROVED_OPERATOR_VERIFIER_TX_HASH = '0xeddd26b03699fa0dd8aabd5a8ff260abca029ece60c13dae916fe4060f33e2cd';
export const FRESH_LIVE_TESTNET_TX_ID = APPROVED_OPERATOR_VERIFIER_TX_ID;
export const FRESH_LIVE_TESTNET_TX_HASH = APPROVED_OPERATOR_VERIFIER_TX_HASH;
export const FRESH_LIVE_TESTNET_TERMS_HASH = '0xebb931936199ae988129d1eed8501a6ad3311035f0d72dd0e52e0c92454a125f';

export const TARGET_BUYER_ADDRESS = '0xa4bCC57d40311D715ECe34940191820d4a81C50F';
export const TARGET_SELLER_ADDRESS = '0x0e73dBFf9047423b520FA9fc23a95645fC986Ee8';
export const APPROVED_OPERATOR_VERIFIER_ADDRESS = '0xb064d69428B9838C2a3e408cF995ea8eb5182c48';
export const INDEPENDENT_VERIFIER_ADDRESS =
  process.env.NEXT_PUBLIC_DEFAULT_VERIFIER_ADDRESS || APPROVED_OPERATOR_VERIFIER_ADDRESS;

export interface InitiatorProfile {
  name: string;
  type: 'Human' | 'Business' | 'AI Agent';
  wallet: string;
  agentName: string;
  spendingLimitMon: string;
  autoExecution: boolean;
  humanFallback: boolean;
  policyStatus: string;
  status: string;
}

export interface ReceiverProfile {
  name: string;
  type: 'Human' | 'Business';
  provides: string;
  location: string;
  capabilities: string[];
  wallet: string;
  status: string;
  stats: {
    activeAgreements: number;
    completed: number;
    disputed: number;
    trustReceipts: number;
  };
}

export interface CommercialIntent {
  id: string;
  need: string;
  deadlineDays: number;
  evidenceRequirements: string[];
  escrowAmountMon: string;
  maxTransactionValueMon: string;
  autoExecuteNormalPass: boolean;
  humanEscalationOnContest: boolean;
  created: boolean;
}

export type RequestStatus = 'AWAITING_RECEIVER_ACCEPTANCE' | 'AGREEMENT_ACTIVE' | 'COUNTERED' | 'DECLINED';

export interface DealRequest {
  id: string;
  title: string;
  initiator: string;
  initiatorWallet: string;
  receiver: string;
  receiverWallet: string;
  deliverable: string;
  location: string;
  deadlineDays: number;
  escrowAmountMon: string;
  evidenceRequirements: string[];
  verifierAddress: string;
  aiPolicy: {
    maxSpend: string;
    autoExecute: boolean;
    humanEscalation: boolean;
  };
  status: RequestStatus;
  counterProposal?: {
    note: string;
    proposedDeadlineDays: number;
    proposedAmountMon: string;
  };
  transactionId: string;
  createdAt: string;
  isOnchain?: boolean;
  onchainTxHash?: string;
  invitationCode?: string;
  version?: number;
  parentInvitationCode?: string;
  canonicalAgreement?: CanonicalAgreementTerms;
  naturalLanguageNeed?: string;
}


interface DemoNetworkContextType {
  role: DemoRole;
  switchRole: (role: DemoRole) => void;
  initiator: InitiatorProfile;
  updateInitiator: (data: Partial<InitiatorProfile>) => void;
  receiver: ReceiverProfile;
  updateReceiver: (data: Partial<ReceiverProfile>) => void;
  intent: CommercialIntent;
  updateIntent: (data: Partial<CommercialIntent>) => void;
  requests: DealRequest[];
  allRequests: DealRequest[];
  createDealRequest: (
    receiverName?: string,
    receiverWallet?: string,
    isOnchain?: boolean,
    txId?: string,
    broadcastHash?: string,
    customVerifier?: string,
    customParams?: {
      title?: string;
      deliverable?: string;
      location?: string;
      escrowAmountMon?: string;
      deadlineDays?: number;
      evidenceRequirements?: string[];
      invitationCode?: string;
      canonicalAgreement?: CanonicalAgreementTerms;
      naturalLanguageNeed?: string;
    }
  ) => string;
  acceptDealRequest: (requestId: string) => void;
  counterDealRequest: (requestId: string, note: string, deadline: number, amount: string) => void;
  declineDealRequest: (requestId: string) => void;
  wallet: MonadWalletState;
  bindConnectedWalletToRole: (targetRole?: DemoRole) => void;
  client: TrustMeshClient;
  loadOnchainTransaction: (transactionId: string) => Promise<{
    stateName: TransactionState;
    totalAmountWei: bigint;
    totalAmountMon: string;
    buyer: string;
    seller: string;
    verifier: string;
    verificationOutcomeName: VerificationOutcome;
    settledAt: bigint;
  } | null>;
  resetToGuidedDefaults: () => void;
  freshLiveTxId: string;
  actionableRequestsCount: number;
  roleCompatibility: RoleCompatibility;
  persistentInvitations: PersistentInvitation[];
  refreshPersistentInvitations: () => Promise<void>;
}


const DemoNetworkContext = createContext<DemoNetworkContextType | undefined>(undefined);

const SESSION_STORAGE_KEY = 'veriqomesh:session:v3';

const DEFAULT_INITIATOR: InitiatorProfile = {
  name: '',
  type: 'Business',
  wallet: '',
  agentName: '',
  spendingLimitMon: '',
  autoExecution: false,
  humanFallback: true,
  policyStatus: 'SPENDING POLICY: NOT CONFIGURED',
  status: 'WALLET REQUIRED',
};

const DEFAULT_RECEIVER: ReceiverProfile = {
  name: '',
  type: 'Business',
  provides: '',
  location: '',
  capabilities: [],
  wallet: '',
  status: 'WALLET REQUIRED',
  stats: {
    activeAgreements: 0,
    completed: 0,
    disputed: 0,
    trustReceipts: 0,
  },
};

const DEFAULT_INTENT: CommercialIntent = {
  id: '',
  need: '',
  deadlineDays: 14,
  evidenceRequirements: [
    'Signed Carrier Bill of Lading (BOL)',
    'Geotagged Depot Delivery Proof Photo',
    'Item Serial Number Verification Manifest',
    `Independent Verifier Attestation (${APPROVED_OPERATOR_VERIFIER_ADDRESS.slice(0, 6)}...${APPROVED_OPERATOR_VERIFIER_ADDRESS.slice(-4)})`,
  ],
  escrowAmountMon: '',
  maxTransactionValueMon: '',
  autoExecuteNormalPass: false,
  humanEscalationOnContest: true,
  created: false,
};

const DEFAULT_REQUESTS: DealRequest[] = [];

export function DemoNetworkProvider({ children }: { children: React.ReactNode }) {
  const wallet = useMonadWallet();

  const [role, setRole] = useState<DemoRole>('INITIATOR');
  const [initiator, setInitiator] = useState<InitiatorProfile>(DEFAULT_INITIATOR);
  const [receiver, setReceiver] = useState<ReceiverProfile>(DEFAULT_RECEIVER);
  const [intent, setIntent] = useState<CommercialIntent>(DEFAULT_INTENT);
  const [requests, setRequests] = useState<DealRequest[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Initialize TrustMeshClient with read provider and signer
  const client = useMemo(() => {
    return new TrustMeshClient({
      signer: wallet.signerProvider || undefined,
      escrowContractAddress: DEPLOYED_ESCROW_ADDRESS,
      receiptRegistryAddress: DEPLOYED_REGISTRY_ADDRESS,
      rpcUrl: MONAD_RPC_URL,
    });
  }, [wallet.signerProvider]);

  // Load persisted session on initial mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(SESSION_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.role) setRole(parsed.role);
        if (parsed.initiator) {
          const storedBuyer = parsed.initiator.wallet;
          const safeBuyer =
            storedBuyer && storedBuyer.toLowerCase() !== TARGET_SELLER_ADDRESS.toLowerCase()
              ? storedBuyer
              : '';
          setInitiator((prev) => ({ ...prev, ...parsed.initiator, wallet: safeBuyer }));
        }
        if (parsed.receiver) {
          const storedSeller = parsed.receiver.wallet;
          const safeSeller =
            storedSeller && storedSeller.toLowerCase() !== TARGET_BUYER_ADDRESS.toLowerCase()
              ? storedSeller
              : '';
          setReceiver((prev) => ({ ...prev, ...parsed.receiver, wallet: safeSeller }));
        }
        if (parsed.intent) setIntent((prev) => ({ ...prev, ...parsed.intent }));
        if (Array.isArray(parsed.requests) && parsed.requests.length > 0) {
          // Filter out any historical benchmark records to ensure public interface shows only real user requests
          const realUserRequests = parsed.requests.filter((r: DealRequest) => !isBenchmarkRequest(r));
          setRequests(realUserRequests);
        }
      }
    } catch {
      // Ignore parse failure; default to empty requests
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Save session when relevant state changes
  useEffect(() => {
    if (!isHydrated || typeof window === 'undefined') return;
    try {
      const payload = {
        role,
        initiator,
        receiver,
        intent,
        requests,
      };
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // localStorage quota or access denied
    }
  }, [isHydrated, role, initiator, receiver, intent, requests]);

  const switchRole = useCallback((newRole: DemoRole) => {
    setRole(newRole);
  }, []);

  const updateInitiator = useCallback((data: Partial<InitiatorProfile>) => {
    setInitiator((prev) => ({ ...prev, ...data }));
  }, []);

  const updateReceiver = useCallback((data: Partial<ReceiverProfile>) => {
    setReceiver((prev) => ({ ...prev, ...data }));
  }, []);

  const updateIntent = useCallback((data: Partial<CommercialIntent>) => {
    setIntent((prev) => ({ ...prev, ...data }));
  }, []);

  // Binds the active connected wallet address to the specified role
  const bindConnectedWalletToRole = useCallback(
    (targetRole?: DemoRole) => {
      if (!wallet.address) return;
      const effectiveRole = targetRole || role;
      if (effectiveRole === 'INITIATOR') {
        // Enforce role isolation: initiator cannot be bound to the seller address
        if (wallet.address.toLowerCase() !== TARGET_SELLER_ADDRESS.toLowerCase()) {
          setInitiator((prev) => ({
            ...prev,
            wallet: wallet.address!,
            status: 'CONNECTED METAMASK WALLET',
          }));
        }
      } else {
        // Enforce role isolation: receiver cannot be bound to the buyer address
        if (wallet.address.toLowerCase() !== TARGET_BUYER_ADDRESS.toLowerCase()) {
          setReceiver((prev) => ({
            ...prev,
            wallet: wallet.address!,
            status: 'CONNECTED METAMASK WALLET',
          }));
        }
      }
    },
    [wallet.address, role]
  );

  // Note: Automatic wallet-to-persona sync has been removed to preserve strict cryptographic identity isolation (Stage 4.1).
  // Connecting a wallet or switching roles does NOT silently reassign the designated participant profile address.
  // Wallet identity remains objective and provider-derived, verified via isWalletCompatibleWithRole().


  // Reset wallet bindings to truthful empty state when disconnected
  useEffect(() => {
    if (!wallet.isConnected || !wallet.address) {
      if (initiator.wallet !== '' || initiator.status !== 'WALLET REQUIRED') {
        setInitiator((prev) => ({
          ...prev,
          wallet: '',
          status: 'WALLET REQUIRED',
        }));
      }
      if (receiver.wallet !== '' || receiver.status !== 'WALLET REQUIRED') {
        setReceiver((prev) => ({
          ...prev,
          wallet: '',
          status: 'WALLET REQUIRED',
        }));
      }
    }
  }, [wallet.isConnected, wallet.address, initiator.wallet, initiator.status, receiver.wallet, receiver.status]);

  const createDealRequest = useCallback(
    (
      receiverName = 'Fulfillment Node',
      receiverWallet = '',
      isOnchain = false,
      txId?: string,
      broadcastHash?: string,
      customVerifier?: string,
      customParams?: {
        title?: string;
        deliverable?: string;
        location?: string;
        escrowAmountMon?: string;
        deadlineDays?: number;
        evidenceRequirements?: string[];
        invitationCode?: string;
        canonicalAgreement?: CanonicalAgreementTerms;
        naturalLanguageNeed?: string;
      }
    ) => {
      const newId = `VM-REQ-${String(requests.length + 1).padStart(4, '0')}`;
      const effectiveTxId = txId || CANONICAL_TESTNET_TX_ID;

      const effectiveInitiatorWallet =
        wallet.address && wallet.address.toLowerCase() !== receiverWallet.toLowerCase()
          ? wallet.address
          : initiator.wallet || TARGET_BUYER_ADDRESS;

      const effectiveVerifier =
        customVerifier !== undefined
          ? customVerifier
          : (INDEPENDENT_VERIFIER_ADDRESS || APPROVED_OPERATOR_VERIFIER_ADDRESS);
      const verifierShort =
        effectiveVerifier && effectiveVerifier.length >= 10
          ? `${effectiveVerifier.slice(0, 6)}...${effectiveVerifier.slice(-4)}`
          : effectiveVerifier || 'verifier';
      const dynamicEvidenceRequirements = customParams?.evidenceRequirements || intent.evidenceRequirements.map((item) =>
        item.includes('Independent Verifier Attestation')
          ? `Independent Verifier Attestation (${verifierShort})`
          : item
      );

      const newReq: DealRequest = {
        id: newId,
        title: customParams?.title || 'Commercial Agreement',
        initiator: initiator.name,
        initiatorWallet: effectiveInitiatorWallet,
        receiver: receiverName,
        receiverWallet: receiverWallet,
        deliverable: customParams?.deliverable || customParams?.naturalLanguageNeed || intent.need,
        location: customParams?.location || 'Designated Delivery Depot',
        deadlineDays: customParams?.deadlineDays ?? intent.deadlineDays,
        escrowAmountMon: customParams?.escrowAmountMon || intent.escrowAmountMon,
        evidenceRequirements: dynamicEvidenceRequirements,
        verifierAddress: effectiveVerifier,
        aiPolicy: {
          maxSpend: `${customParams?.escrowAmountMon || intent.maxTransactionValueMon || '0'} MON`,
          autoExecute: intent.autoExecuteNormalPass,
          humanEscalation: intent.humanEscalationOnContest,
        },
        status: 'AWAITING_RECEIVER_ACCEPTANCE',
        transactionId: effectiveTxId,
        createdAt: 'Just now',
        isOnchain,
        onchainTxHash: broadcastHash,
        invitationCode: customParams?.invitationCode,
        canonicalAgreement: customParams?.canonicalAgreement,
        naturalLanguageNeed: customParams?.naturalLanguageNeed,
      };

      setRequests((prev) => [newReq, ...prev]);
      return newId;
    },
    [requests.length, initiator.name, initiator.wallet, wallet.address, intent]
  );

  const acceptDealRequest = useCallback((requestId: string) => {
    const target = requests.find((r) => r.id === requestId || r.transactionId === requestId);
    if ((target && isBenchmarkRequest(target)) || isBenchmarkRequest({ id: requestId })) {
      console.warn(`[DemoNetworkContext] Mutation rejected: ${requestId} is an immutable historical benchmark`);
      return;
    }
    setRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status: 'AGREEMENT_ACTIVE' } : r))
    );
  }, [requests]);

  const counterDealRequest = useCallback(
    (requestId: string, note: string, deadline: number, amount: string) => {
      const target = requests.find((r) => r.id === requestId || r.transactionId === requestId);
      if ((target && isBenchmarkRequest(target)) || isBenchmarkRequest({ id: requestId })) {
        console.warn(`[DemoNetworkContext] Mutation rejected: ${requestId} is an immutable historical benchmark`);
        return;
      }
      setRequests((prev) =>
        prev.map((r) =>
          r.id === requestId
            ? {
                ...r,
                status: 'COUNTERED',
                counterProposal: {
                  note,
                  proposedDeadlineDays: deadline,
                  proposedAmountMon: amount,
                },
              }
            : r
        )
      );
    },
    [requests]
  );

  const declineDealRequest = useCallback((requestId: string) => {
    const target = requests.find((r) => r.id === requestId || r.transactionId === requestId);
    if ((target && isBenchmarkRequest(target)) || isBenchmarkRequest({ id: requestId })) {
      console.warn(`[DemoNetworkContext] Mutation rejected: ${requestId} is an immutable historical benchmark`);
      return;
    }
    setRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status: 'DECLINED' } : r))
    );
  }, [requests]);

  // Queries live onchain state from Monad testnet
  const loadOnchainTransaction = useCallback(
    async (transactionId: string) => {
      try {
        const raw = await client.getOnchainTransaction(transactionId);
        return {
          stateName: raw.stateName,
          totalAmountWei: raw.totalAmount,
          totalAmountMon: (Number(raw.totalAmount) / 1e18).toString(),
          buyer: raw.buyer,
          seller: raw.seller,
          verifier: raw.verifier,
          verificationOutcomeName: raw.verificationOutcomeName,
          settledAt: raw.settledAt,
        };
      } catch {
        return null;
      }
    },
    [client]
  );

  const resetToGuidedDefaults = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
    setRole('INITIATOR');
    setInitiator(DEFAULT_INITIATOR);
    setReceiver(DEFAULT_RECEIVER);
    setIntent(DEFAULT_INTENT);
    setRequests([]);
  }, []);

  // Load persistent invitations for connected wallet from Upstash Redis
  const [persistentInvitations, setPersistentInvitations] = useState<PersistentInvitation[]>([]);

  const refreshPersistentInvitations = useCallback(async () => {
    if (!wallet.isConnected || !wallet.address) {
      setPersistentInvitations([]);
      return;
    }
    try {
      const res = await fetch(`/api/invitations?receiver=${wallet.address}`);
      const data = await res.json();
      if (data && data.success && Array.isArray(data.invitations)) {
        setPersistentInvitations(data.invitations);
      }
    } catch {
      // Non-blocking background fetch
    }
  }, [wallet.isConnected, wallet.address]);

  useEffect(() => {
    refreshPersistentInvitations();
  }, [refreshPersistentInvitations]);

  // Combined requests + persistentInvitations
  const allRequests = useMemo(() => {
    const combined: DealRequest[] = [...requests.filter((r) => !isBenchmarkRequest(r))];

    for (const inv of persistentInvitations) {
      if (
        isBenchmarkRequest({
          transactionId: inv.transactionId,
          invitationCode: inv.invitationCode,
          title: inv.proposal.title,
          deliverable: inv.proposal.description,
          initiator: inv.initiatorWallet,
          receiver: inv.intendedReceiverWallet,
        })
      ) {
        continue;
      }
      const exists = combined.some(
        (r) =>
          (r.transactionId && inv.transactionId && r.transactionId.toLowerCase() === inv.transactionId.toLowerCase()) ||
          r.id === inv.invitationCode
      );

      if (!exists) {
        const canonical = inv.proposal.canonicalAgreement;
        combined.unshift({
          id: inv.invitationCode,
          title: canonical?.structuredParameters?.title || inv.proposal.title,
          initiator: `${inv.initiatorWallet.slice(0, 6)}...${inv.initiatorWallet.slice(-4)}`,
          initiatorWallet: inv.initiatorWallet,
          receiver: `${inv.intendedReceiverWallet.slice(0, 6)}...${inv.intendedReceiverWallet.slice(-4)}`,
          receiverWallet: inv.intendedReceiverWallet,
          deliverable: canonical?.structuredParameters?.deliverable || inv.proposal.description || inv.proposal.title,
          location: canonical?.structuredParameters?.location || inv.proposal.location || 'Designated Delivery Depot',
          deadlineDays: canonical?.structuredParameters?.deadlineDays ?? inv.proposal.deadlineDays,
          escrowAmountMon: canonical?.structuredParameters?.amountMon || inv.proposal.amount,
          evidenceRequirements: canonical?.structuredParameters?.evidenceRequirements || inv.proposal.evidenceRequirements || [],
          verifierAddress: canonical?.structuredParameters?.verifierAddress || inv.roles.verifier,
          canonicalAgreement: canonical,
          naturalLanguageNeed: canonical?.naturalLanguageNeed || inv.proposal.description,
          aiPolicy: {
            maxSpend: canonical?.structuredParameters?.amountMon || inv.proposal.amount,
            autoExecute: false,
            humanEscalation: true,
          },
          status:
            inv.status === 'AGREED'
              ? 'AGREEMENT_ACTIVE'
              : inv.status === 'COUNTERED'
              ? 'COUNTERED'
              : inv.status === 'DECLINED'
              ? 'DECLINED'
              : 'AWAITING_RECEIVER_ACCEPTANCE',
          isOnchain: Boolean(inv.transactionId && inv.transactionId.startsWith('0x')),
          transactionId: inv.transactionId,
          onchainTxHash: inv.onchainTxHash,
          invitationCode: inv.invitationCode,
          version: inv.version,
          parentInvitationCode: inv.parentInvitationCode,
          createdAt: new Date(inv.createdAt).toISOString().split('T')[0],
        });
      } else {
        const existingIdx = combined.findIndex(
          (r) =>
            r.transactionId &&
            inv.transactionId &&
            r.transactionId.toLowerCase() === inv.transactionId.toLowerCase()
        );
        if (existingIdx !== -1) {
          combined[existingIdx].invitationCode = inv.invitationCode;
        }
      }
    }
    return combined;
  }, [requests, persistentInvitations]);

  const actionableRequestsCount = useMemo(() => {
    return calculateActionableRequestsCount({
      requests: allRequests,
      connectedWallet: wallet.address,
      isConnected: wallet.isConnected,
    });
  }, [allRequests, wallet.address, wallet.isConnected]);

  const roleCompatibility = useMemo(() => {
    return isWalletCompatibleWithRole({
      role,
      connectedWallet: wallet.address,
      isConnected: wallet.isConnected,
      designatedInitiator: initiator.wallet || TARGET_BUYER_ADDRESS,
      designatedReceiver: receiver.wallet || TARGET_SELLER_ADDRESS,
    });
  }, [role, wallet.address, wallet.isConnected, initiator.wallet, receiver.wallet]);

  return (
    <DemoNetworkContext.Provider
      value={{
        role,
        switchRole,
        initiator,
        updateInitiator,
        receiver,
        updateReceiver,
        intent,
        updateIntent,
        requests,
        allRequests,
        createDealRequest,
        acceptDealRequest,
        counterDealRequest,
        declineDealRequest,
        wallet,
        bindConnectedWalletToRole,
        client,
        loadOnchainTransaction,
        resetToGuidedDefaults,
        freshLiveTxId: FRESH_LIVE_TESTNET_TX_ID,
        actionableRequestsCount,
        roleCompatibility,
        persistentInvitations,
        refreshPersistentInvitations,
      }}
    >
      {children}
    </DemoNetworkContext.Provider>
  );

}

export function useDemoNetwork() {
  const context = useContext(DemoNetworkContext);
  if (!context) {
    throw new Error('useDemoNetwork must be used within a DemoNetworkProvider');
  }
  return context;
}
