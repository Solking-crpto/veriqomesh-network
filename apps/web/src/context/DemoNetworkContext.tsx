'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useMonadWallet, MonadWalletState, MONAD_RPC_URL } from '../hooks/useMonadWallet';
import { TrustMeshClient } from '@trustmesh/sdk';
import { TransactionState, VerificationOutcome, PersistentInvitation } from '@trustmesh/types';
import { calculateActionableRequestsCount, isBenchmarkRequest } from '../lib/invitation-utils';

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
    customVerifier?: string
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
  persistentInvitations: PersistentInvitation[];
  refreshPersistentInvitations: () => Promise<void>;
}


const DemoNetworkContext = createContext<DemoNetworkContextType | undefined>(undefined);

const SESSION_STORAGE_KEY = 'veriqomesh:session:v3';

const DEFAULT_INITIATOR: InitiatorProfile = {
  name: 'Solar Procurement Ltd.',
  type: 'Business',
  wallet: TARGET_BUYER_ADDRESS,
  agentName: 'SolarProcure Agent',
  spendingLimitMon: '5.0',
  autoExecution: true,
  humanFallback: true,
  policyStatus: 'POLICY CONFIGURED',
  status: 'INITIATOR ACCOUNT ACTIVE',
};

const DEFAULT_RECEIVER: ReceiverProfile = {
  name: 'Dallas Solar Supply',
  type: 'Business',
  provides: 'Commercial solar equipment, freight logistics, physical depot inspection',
  location: 'Dallas, Texas',
  capabilities: ['Delivery', 'Inspection', 'Freight', 'Installation'],
  wallet: TARGET_SELLER_ADDRESS,
  status: 'LIVE VERIFIED NODE',
  stats: {
    activeAgreements: 1,
    completed: 24,
    disputed: 2,
    trustReceipts: 22,
  },
};

const DEFAULT_INTENT: CommercialIntent = {
  id: 'VM-REQ-0004',
  need: 'Supply and deliver 2 solar panels to the buyer. Seller provides product serial numbers, delivery evidence and installation/site evidence.',
  deadlineDays: 14,
  evidenceRequirements: [
    'Carrier Bill of Lading (BOL signed)',
    'Geotagged Depot Delivery Photo',
    '2 Serial Number Module Manifest',
    `Independent Verifier Attestation (${APPROVED_OPERATOR_VERIFIER_ADDRESS.slice(0, 6)}...${APPROVED_OPERATOR_VERIFIER_ADDRESS.slice(-4)})`,
  ],
  escrowAmountMon: '0.001',
  maxTransactionValueMon: '0.001',
  autoExecuteNormalPass: true,
  humanEscalationOnContest: true,
  created: true,
};

const DEFAULT_REQUESTS: DealRequest[] = [
  {
    id: 'VM-REQ-0004',
    title: 'Commercial Solar Procurement (Live Monad Metropolis Testnet)',
    initiator: 'Solar Procurement Ltd.',
    initiatorWallet: TARGET_BUYER_ADDRESS,
    receiver: 'Dallas Solar Supply Co.',
    receiverWallet: TARGET_SELLER_ADDRESS,
    deliverable: 'Supply and deliver 2 solar panels to the buyer. Seller provides product serial numbers, delivery evidence and installation/site evidence.',
    location: 'Dallas, Texas',
    deadlineDays: 14,
    escrowAmountMon: '0.001',
    evidenceRequirements: [
      'Carrier Bill of Lading (BOL signed)',
      'Geotagged Depot Delivery Photo',
      '2 Serial Number Module Manifest',
      `Independent Verifier Attestation (${APPROVED_OPERATOR_VERIFIER_ADDRESS.slice(0, 6)}...${APPROVED_OPERATOR_VERIFIER_ADDRESS.slice(-4)})`,
    ],
    verifierAddress: APPROVED_OPERATOR_VERIFIER_ADDRESS,
    aiPolicy: {
      maxSpend: '0.001 MON',
      autoExecute: true,
      humanEscalation: true,
    },
    status: 'AGREEMENT_ACTIVE',
    transactionId: APPROVED_OPERATOR_VERIFIER_TX_ID,
    createdAt: 'Live Metropolis Testnet (Block 65963660)',
    isOnchain: true,
    onchainTxHash: APPROVED_OPERATOR_VERIFIER_TX_HASH,
  },
  {
    id: 'VM-REQ-0003',
    title: 'Commercial Solar Procurement (Historical Testnet Run - Parked at Verification)',
    initiator: 'Solar Procurement Ltd.',
    initiatorWallet: TARGET_BUYER_ADDRESS,
    receiver: 'Dallas Solar Supply Co.',
    receiverWallet: TARGET_SELLER_ADDRESS,
    deliverable: 'Supply and deliver 2 solar panels to the buyer. Seller provides product serial numbers, delivery evidence and installation/site evidence.',
    location: 'Dallas, Texas',
    deadlineDays: 14,
    escrowAmountMon: '0.001',
    evidenceRequirements: [
      'Carrier Bill of Lading (BOL signed)',
      'Geotagged Depot Delivery Photo',
      '2 Serial Number Module Manifest',
      'Independent Verifier Attestation (Historical: 0x16D7...4EA)',
    ],
    verifierAddress: '0x16D7bD08Ad79bBCdBa116A652f68589FE5d6F4EA',
    aiPolicy: {
      maxSpend: '0.001 MON',
      autoExecute: true,
      humanEscalation: true,
    },
    status: 'AWAITING_RECEIVER_ACCEPTANCE',
    transactionId: HISTORICAL_PARKED_TESTNET_TX_ID,
    createdAt: 'Historical Testnet Record (Block 65524140 - Read-Only)',
    isOnchain: true,
    onchainTxHash: HISTORICAL_PARKED_TESTNET_TX_HASH,
  },
  {
    id: 'VM-REQ-0002',
    title: 'Commercial Solar Procurement (Previous Live Run - Read-Only)',
    initiator: 'Solar Procurement Ltd.',
    initiatorWallet: '0xa4bCC57d40311D715ECe34940191820d4a81C50F',
    receiver: 'Dallas Solar Supply Co.',
    receiverWallet: '0x6f30D20b8c5bE781bADD86341415b556fB13c873',
    deliverable: 'Supply and deliver 2 solar panels to the buyer. Seller provides product serial numbers, delivery evidence and installation/site evidence.',
    location: 'Dallas, Texas',
    deadlineDays: 14,
    escrowAmountMon: '0.001',
    evidenceRequirements: ['Delivery evidence', 'Physical inspection', 'Independent verification', 'Serial number manifest'],
    verifierAddress: '0x16D7bD08Ad79bBCdBa116A652f68589FE5d6F4EA',
    aiPolicy: {
      maxSpend: '0.001 MON',
      autoExecute: true,
      humanEscalation: true,
    },
    status: 'AWAITING_RECEIVER_ACCEPTANCE',
    transactionId: HISTORICAL_RUN1_LIVE_TX_ID,
    createdAt: 'Previous Run',
    isOnchain: true,
    onchainTxHash: HISTORICAL_RUN1_LIVE_TX_HASH,
  },
  {
    id: 'VM-REQ-0001',
    title: '100 Commercial Solar Panels (Canonical Dispute Audit)',
    initiator: 'Solar Procurement Ltd.',
    initiatorWallet: '0x287196Cdbf41da13Cb7083392e47eaAf105b58A0',
    receiver: 'Dallas Solar Supply Co.',
    receiverWallet: '0x6f30D20b8c5bE781bADD86341415b556fB13c873',
    deliverable: '100 commercial solar panels (550W Tier 1) delivered to Dallas depot',
    location: 'Dallas, Texas',
    deadlineDays: 14,
    escrowAmountMon: '0.001',
    evidenceRequirements: [
      'Carrier Bill of Lading (BOL signed)',
      'Geotagged Depot Delivery Photo',
      '100 Serial Number Module Manifest',
      'Independent Verifier Attestation (0x16D7...4EA)',
    ],
    verifierAddress: '0x16D7bD08Ad79bBCdBa116A652f68589FE5d6F4EA',
    aiPolicy: {
      maxSpend: '0.001 MON',
      autoExecute: true,
      humanEscalation: true,
    },
    status: 'AGREEMENT_ACTIVE',
    transactionId: CANONICAL_TESTNET_TX_ID,
    createdAt: 'Canonical Testnet Dispute',
    isOnchain: true,
  },
];

export function DemoNetworkProvider({ children }: { children: React.ReactNode }) {
  const wallet = useMonadWallet();

  const [role, setRole] = useState<DemoRole>('INITIATOR');
  const [initiator, setInitiator] = useState<InitiatorProfile>(DEFAULT_INITIATOR);
  const [receiver, setReceiver] = useState<ReceiverProfile>(DEFAULT_RECEIVER);
  const [intent, setIntent] = useState<CommercialIntent>(DEFAULT_INTENT);
  const [requests, setRequests] = useState<DealRequest[]>(DEFAULT_REQUESTS);
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
              : TARGET_BUYER_ADDRESS;
          setInitiator((prev) => ({ ...prev, ...parsed.initiator, wallet: safeBuyer }));
        }
        if (parsed.receiver) setReceiver((prev) => ({ ...prev, ...parsed.receiver, wallet: TARGET_SELLER_ADDRESS }));
        if (parsed.intent) setIntent((prev) => ({ ...prev, ...parsed.intent }));
        if (Array.isArray(parsed.requests) && parsed.requests.length > 0) {
          // Keep historical records accurately tagged and ensure new/current requests use approved verifier
          let updated = parsed.requests.map((r: DealRequest) => {
            if (
              r.transactionId === HISTORICAL_PARKED_TESTNET_TX_ID ||
              r.transactionId === '0xbbd0176291d62b32c3e096d0314c0fab6bcfa9131c1b26a825b3ce994e645f5e'
            ) {
              return {
                ...r,
                title: DEFAULT_REQUESTS[1].title,
                createdAt: DEFAULT_REQUESTS[1].createdAt,
                verifierAddress: '0x16D7bD08Ad79bBCdBa116A652f68589FE5d6F4EA',
                evidenceRequirements: DEFAULT_REQUESTS[1].evidenceRequirements,
              };
            }
            if (r.transactionId === APPROVED_OPERATOR_VERIFIER_TX_ID) {
              return {
                ...r,
                verifierAddress: APPROVED_OPERATOR_VERIFIER_ADDRESS,
                evidenceRequirements: r.evidenceRequirements.map((item) =>
                  item.includes('Independent Verifier Attestation')
                    ? `Independent Verifier Attestation (${APPROVED_OPERATOR_VERIFIER_ADDRESS.slice(0, 6)}...${APPROVED_OPERATOR_VERIFIER_ADDRESS.slice(-4)})`
                    : item
                ),
              };
            }
            return r;
          });

          // Ensure active fresh live transaction (0x961c...54e1) is always loaded at top
          if (!updated.some((r: DealRequest) => r.transactionId === APPROVED_OPERATOR_VERIFIER_TX_ID)) {
            updated = [DEFAULT_REQUESTS[0], ...updated];
          }

          setRequests(updated);
        }
      }
    } catch {
      // Ignore parse failure; default to presets
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

  // Automatically sync initiator wallet with connected wallet when on INITIATOR role
  useEffect(() => {
    if (wallet.address && role === 'INITIATOR') {
      // Enforce role isolation: never sync initiator wallet to the designated seller address
      if (wallet.address.toLowerCase() !== TARGET_SELLER_ADDRESS.toLowerCase()) {
        if (initiator.wallet !== wallet.address) {
          setInitiator((prev) => ({
            ...prev,
            wallet: wallet.address!,
            status: 'CONNECTED BROWSER WALLET',
          }));
        }
      }
    }
  }, [wallet.address, role, initiator.wallet]);

  // Automatically sync receiver wallet with connected wallet when on RECEIVER role
  useEffect(() => {
    if (wallet.address && role === 'RECEIVER') {
      // Enforce role isolation: receiver cannot be bound to the buyer address
      if (wallet.address.toLowerCase() !== TARGET_BUYER_ADDRESS.toLowerCase()) {
        if (receiver.wallet !== wallet.address) {
          setReceiver((prev) => ({
            ...prev,
            wallet: wallet.address!,
            status: 'CONNECTED BROWSER WALLET',
          }));
        }
      }
    }
  }, [wallet.address, role, receiver.wallet]);

  // Reset wallet bindings to demo defaults when disconnected
  useEffect(() => {
    if (!wallet.isConnected || !wallet.address) {
      if (initiator.wallet !== TARGET_BUYER_ADDRESS && initiator.status !== 'INITIATOR ACCOUNT ACTIVE') {
        setInitiator((prev) => ({
          ...prev,
          wallet: TARGET_BUYER_ADDRESS,
          status: 'INITIATOR ACCOUNT ACTIVE',
        }));
      }
      if (receiver.wallet !== TARGET_SELLER_ADDRESS && receiver.status !== 'LIVE VERIFIED NODE') {
        setReceiver((prev) => ({
          ...prev,
          wallet: TARGET_SELLER_ADDRESS,
          status: 'LIVE VERIFIED NODE',
        }));
      }
    }
  }, [wallet.isConnected, wallet.address, initiator.wallet, initiator.status, receiver.wallet, receiver.status]);

  const createDealRequest = useCallback(
    (
      receiverName = 'Dallas Solar Supply',
      receiverWallet = TARGET_SELLER_ADDRESS,
      isOnchain = false,
      txId?: string,
      broadcastHash?: string,
      customVerifier?: string
    ) => {
      const newId = `VM-REQ-${String(requests.length + 1).padStart(4, '0')}`;
      const effectiveTxId = txId || CANONICAL_TESTNET_TX_ID;

      const effectiveInitiatorWallet =
        wallet.address && wallet.address.toLowerCase() !== receiverWallet.toLowerCase()
          ? wallet.address
          : initiator.wallet || TARGET_BUYER_ADDRESS;

      const effectiveVerifier =
        customVerifier || INDEPENDENT_VERIFIER_ADDRESS || APPROVED_OPERATOR_VERIFIER_ADDRESS;
      const verifierShort = `${effectiveVerifier.slice(0, 6)}...${effectiveVerifier.slice(-4)}`;
      const dynamicEvidenceRequirements = intent.evidenceRequirements.map((item) =>
        item.includes('Independent Verifier Attestation')
          ? `Independent Verifier Attestation (${verifierShort})`
          : item
      );

      const newReq: DealRequest = {
        id: newId,
        title: 'Commercial Solar Procurement',
        initiator: initiator.name,
        initiatorWallet: effectiveInitiatorWallet,
        receiver: receiverName,
        receiverWallet: receiverWallet,
        deliverable: intent.need,
        location: 'Dallas, Texas',
        deadlineDays: intent.deadlineDays,
        escrowAmountMon: intent.escrowAmountMon,
        evidenceRequirements: dynamicEvidenceRequirements,
        verifierAddress: effectiveVerifier,
        aiPolicy: {
          maxSpend: `${intent.maxTransactionValueMon} MON`,
          autoExecute: intent.autoExecuteNormalPass,
          humanEscalation: intent.humanEscalationOnContest,
        },
        status: 'AWAITING_RECEIVER_ACCEPTANCE',
        transactionId: effectiveTxId,
        createdAt: 'Just now',
        isOnchain,
        onchainTxHash: broadcastHash,
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
    setRequests(DEFAULT_REQUESTS);
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
    const combined: DealRequest[] = [...requests];

    for (const inv of persistentInvitations) {
      const exists = combined.some(
        (r) =>
          (r.transactionId && inv.transactionId && r.transactionId.toLowerCase() === inv.transactionId.toLowerCase()) ||
          r.id === inv.invitationCode
      );

      if (!exists) {
        combined.unshift({
          id: inv.invitationCode,
          title: inv.proposal.title,
          initiator: `${inv.initiatorWallet.slice(0, 6)}...${inv.initiatorWallet.slice(-4)}`,
          initiatorWallet: inv.initiatorWallet,
          receiver: `${inv.intendedReceiverWallet.slice(0, 6)}...${inv.intendedReceiverWallet.slice(-4)}`,
          receiverWallet: inv.intendedReceiverWallet,
          deliverable: inv.proposal.title,
          location: 'Designated Delivery Depot',
          deadlineDays: inv.proposal.deadlineDays,
          escrowAmountMon: inv.proposal.amount,
          evidenceRequirements: inv.proposal.evidenceRequirements || [],
          verifierAddress: inv.roles.verifier,
          aiPolicy: {
            maxSpend: inv.proposal.amount,
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
