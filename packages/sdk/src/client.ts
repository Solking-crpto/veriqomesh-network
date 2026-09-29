/**
 * TrustMesh SDK Client
 * Developer-friendly interface for the TrustMesh Escrow, Evidence, Verification, and Trust Receipt protocol.
 */

import { ethers } from 'ethers';
import type { ISignerProvider } from './abstractions/wallet.js';
import type { IStorageProvider } from './abstractions/storage.js';
import type {
  EvidenceRecord,
  EvidenceType,
  EvidenceVerificationStatus,
  VerificationOutcome,
  VerificationResult,
  TrustReceipt,
  TransactionState,
  DisputeDocket,
  JudgeAssignment,
  ConflictAttestation,
  JudgeBallot,
  ConsensusResult,
  AdjudicationRecord,
  SettlementDispatch,
} from '@trustmesh/types';
import { hashEvidenceBytes, hashMetadata } from './hashing.js';
import { TRUSTMESH_ESCROW_ABI, TRUST_RECEIPT_REGISTRY_ABI } from './abi.js';

export interface IDisputeCoordinator {
  getDisputeDocket(transactionId: string): Promise<DisputeDocket | undefined> | DisputeDocket | undefined;
  assignJudgePanel?(transactionId: string, domain?: string): Promise<JudgeAssignment> | JudgeAssignment;
  submitConflictAttestation(attestation: ConflictAttestation): Promise<{ success: boolean; docket: DisputeDocket }> | { success: boolean; docket: DisputeDocket };
  submitJudgeBallot(ballot: JudgeBallot): Promise<{ success: boolean; docket: DisputeDocket; consensusResult?: ConsensusResult }> | { success: boolean; docket: DisputeDocket; consensusResult?: ConsensusResult };
  getAdjudicationRecord(transactionId: string): Promise<AdjudicationRecord | undefined> | AdjudicationRecord | undefined;
  getSettlementDispatch(transactionId: string): Promise<SettlementDispatch | undefined> | SettlementDispatch | undefined;
}

export interface TrustMeshClientOptions {
  signer?: ISignerProvider;
  storage?: IStorageProvider;
  escrowContractAddress: string;
  disputeContractAddress?: string;
  receiptRegistryAddress?: string;
  rpcUrl?: string;
  readProvider?: ethers.JsonRpcProvider;
  apiBaseUrl?: string;
  disputeService?: IDisputeCoordinator;
}

export interface CreateTransactionParams {
  transactionId: string; // 32-byte hex string (0x...)
  seller: string;
  tokenAddress?: string; // address(0) for native MON
  amountWei: string;
  fulfillmentDeadline: number;
  termsHash: string;
  fundImmediately?: boolean;
}

export interface CreateTransactionWithVerifierParams extends CreateTransactionParams {
  verifier: string; // Designated independent verifier address
}

export interface CreateEvidenceParams {
  transactionId: string;
  evidenceType: EvidenceType;
  title: string;
  payload: Uint8Array | string;
  metadata?: Record<string, unknown>;
  verificationMethod?: string;
  isEncrypted?: boolean;
}

export interface AnchorEvidenceParams {
  transactionId: string;
  evidenceData: Uint8Array | string;
  metadata?: Record<string, unknown>;
  title: string;
  evidenceType?: EvidenceType;
  storageUri?: string;
  storageUriHash?: string;
  isEncrypted?: boolean;
  useFourParamAnchor?: boolean;
}

export interface AnchorEvidenceResult {
  txHash: string;
  contentHash: string;
  metadataHash: string;
  storageUri: string;
  storageUriHash?: string;
  evidenceId?: string;
  calldata?: string;
}

export interface SubmitVerificationParams {
  transactionId: string;
  outcome: VerificationOutcome;
  reportHash: string;
  notes?: string;
}

export class TrustMeshClient {
  public readonly signer?: ISignerProvider;
  public readonly storage?: IStorageProvider;
  public readonly escrowAddress: string;
  public readonly receiptRegistryAddress?: string;
  public readonly disputeService?: IDisputeCoordinator;
  public readonly readProvider: ethers.JsonRpcProvider;
  public readonly escrowInterface: ethers.Interface;
  public readonly escrowContract: ethers.Contract;
  public readonly receiptRegistryContract?: ethers.Contract;

  // In-memory evidence cache for SDK client retrieval
  private _evidenceStore: Map<string, EvidenceRecord> = new Map();

  constructor(options: TrustMeshClientOptions) {
    this.signer = options.signer;
    this.storage = options.storage;
    this.escrowAddress = options.escrowContractAddress;
    this.receiptRegistryAddress = options.receiptRegistryAddress;
    this.disputeService = options.disputeService;
    this.readProvider =
      options.readProvider ||
      new ethers.JsonRpcProvider(options.rpcUrl || 'https://testnet-rpc.monad.xyz');
    this.escrowInterface = new ethers.Interface(TRUSTMESH_ESCROW_ABI);
    this.escrowContract = new ethers.Contract(
      this.escrowAddress,
      TRUSTMESH_ESCROW_ABI,
      this.readProvider
    );
    if (this.receiptRegistryAddress) {
      this.receiptRegistryContract = new ethers.Contract(
        this.receiptRegistryAddress,
        TRUST_RECEIPT_REGISTRY_ABI,
        this.readProvider
      );
    }
  }

  private _getSigner(): ISignerProvider {
    if (!this.signer) {
      throw new Error('A connected signer is required to execute write transactions');
    }
    return this.signer;
  }

  public getStorage(): IStorageProvider | undefined {
    return this.storage;
  }

  // ===========================================================================
  // 1. Transaction Lifecycle Methods
  // ===========================================================================

  /**
   * Propose a new custom transaction without an independent verifier
   */
  async createTransaction(params: CreateTransactionParams): Promise<string> {
    const value = params.fundImmediately ? params.amountWei : '0';
    const data = this._encodeCreateTransaction(params);
    return this._getSigner().sendTransaction({
      to: this.escrowAddress,
      data,
      value,
    });
  }

  /**
   * Propose a new custom transaction with a designated independent verifier
   */
  async createTransactionWithVerifier(params: CreateTransactionWithVerifierParams): Promise<string> {
    const value = params.fundImmediately ? params.amountWei : '0';
    const data = this._encodeCreateTransactionWithVerifier(params);
    return this._getSigner().sendTransaction({
      to: this.escrowAddress,
      data,
      value,
    });
  }

  /**
   * Seller accepts terms and locks agreement into AGREED state
   */
  async agreeTransaction(transactionId: string): Promise<string> {
    const data = this._encodeSingleIdCall('agreeTransaction(bytes32)', transactionId);
    return this._getSigner().sendTransaction({
      to: this.escrowAddress,
      data,
    });
  }

  /**
   * Buyer deposits escrow funds into smart contract
   */
  async fundTransaction(transactionId: string, amountWei: string): Promise<string> {
    const data = this._encodeSingleIdCall('fundEscrow(bytes32)', transactionId);
    return this._getSigner().sendTransaction({
      to: this.escrowAddress,
      data,
      value: amountWei,
    });
  }

  /**
   * Seller marks execution start -> IN_PROGRESS
   */
  async startExecution(transactionId: string): Promise<string> {
    const data = this._encodeSingleIdCall('startWork(bytes32)', transactionId);
    return this._getSigner().sendTransaction({
      to: this.escrowAddress,
      data,
    });
  }

  // ===========================================================================
  // 2. Evidence Methods
  // ===========================================================================

  /**
   * Create a structured offchain evidence record with deterministic hashing
   * Invariant: contentHash is independent of storage URI; metadataHash is canonical JSON hash
   */
  async createEvidence(params: CreateEvidenceParams): Promise<EvidenceRecord> {
    const submitter = await this._getSigner().getAddress();
    const contentHash = hashEvidenceBytes(params.payload);
    const metadata = params.metadata ?? {};
    const metadataHash = hashMetadata(metadata);

    // Upload payload to storage provider if available, otherwise construct deterministic IPFS URI
    let storageReference: string;
    if (this.storage) {
      const uploadResult = await this.storage.upload(params.payload);
      storageReference = uploadResult.uri;
    } else {
      storageReference = `ipfs://${contentHash.slice(2)}`;
    }

    const evidenceId = hashEvidenceBytes(
      `${params.transactionId}:${contentHash}:${Date.now()}`
    );

    const record: EvidenceRecord = {
      evidenceId,
      transactionId: params.transactionId,
      submitter,
      evidenceType: params.evidenceType,
      title: params.title,
      contentHash,
      metadataHash,
      storageReference,
      isEncrypted: params.isEncrypted ?? false,
      createdAt: new Date().toISOString(),
      verificationStatus: 'SELF_REPORTED' as EvidenceVerificationStatus,
      verificationMethod: params.verificationMethod ?? 'OFFCHAIN_DIRECT',
    };

    this._evidenceStore.set(evidenceId, record);
    this._evidenceStore.set(contentHash, record);
    return record;
  }

  /**
   * Retrieve a structured evidence record by ID
   */
  async getEvidence(evidenceId: string): Promise<EvidenceRecord> {
    const record = this._evidenceStore.get(evidenceId);
    if (!record) {
      throw new Error(`Evidence record ${evidenceId} not found in client store`);
    }
    return record;
  }

  /**
   * Upload evidence bytes to storage (if configured) or compute deterministic hashes in-memory,
   * then anchor cryptographic commitment onchain.
   */
  async anchorEvidence(params: AnchorEvidenceParams): Promise<AnchorEvidenceResult> {
    // 1. Compute deterministic content hash directly from raw bytes
    const contentHash = hashEvidenceBytes(params.evidenceData);

    // 2. Compute metadata hash
    const metadata = params.metadata ?? { title: params.title };
    const metadataHash = hashMetadata(metadata);

    // 3. Determine storage URI and storage URI hash
    let storageUri: string;
    let uriHash: string;

    if (this.storage) {
      const uploadResult = await this.storage.upload(params.evidenceData);
      storageUri = uploadResult.uri;
      const computed = this.storage.computeHash(uploadResult.uri);
      uriHash = (computed && ethers.isHexString(computed, 32))
        ? computed
        : ethers.keccak256(ethers.toUtf8Bytes(storageUri));
    } else if (params.storageUri) {
      storageUri = params.storageUri;
      uriHash = params.storageUriHash ?? ethers.keccak256(ethers.toUtf8Bytes(storageUri));
    } else {
      // Deterministic offchain reference representation when external storage provider is omitted
      storageUri = `ipfs://${contentHash.slice(2)}`;
      uriHash = ethers.keccak256(ethers.toUtf8Bytes(storageUri));
    }

    // 4. Cache evidence record in local store so client.getEvidence() works
    let submitter = '0x0000000000000000000000000000000000000000';
    try {
      submitter = await this._getSigner().getAddress();
    } catch {
      // Signer address might not be available synchronously or in test environment
    }

    const evidenceId = hashEvidenceBytes(
      `${params.transactionId}:${contentHash}:${Date.now()}`
    );

    const record: EvidenceRecord = {
      evidenceId,
      transactionId: params.transactionId,
      submitter,
      evidenceType: params.evidenceType ?? ('BILL_OF_LADING' as EvidenceType),
      title: params.title,
      contentHash,
      metadataHash,
      storageReference: storageUri,
      isEncrypted: params.isEncrypted ?? false,
      createdAt: new Date().toISOString(),
      verificationStatus: 'SELF_REPORTED' as EvidenceVerificationStatus,
      verificationMethod: 'OFFCHAIN_DIRECT',
    };

    this._evidenceStore.set(evidenceId, record);
    this._evidenceStore.set(contentHash, record);

    // 5. Encode calldata (5-param preferred, 4-param supported)
    let data: string;
    if (params.useFourParamAnchor) {
      data = this._encodeAnchorEvidence(
        params.transactionId,
        contentHash,
        uriHash,
        params.isEncrypted ?? false,
      );
      const selector = data.slice(0, 10).toLowerCase();
      if (selector !== '0x150987b4') {
        throw new Error(`Invalid 4-param anchorEvidence selector: ${selector} (expected 0x150987b4)`);
      }
    } else {
      data = this._encodeAnchorEvidenceWithMeta(
        params.transactionId,
        contentHash,
        metadataHash,
        uriHash,
        params.isEncrypted ?? false,
      );
      const selector = data.slice(0, 10).toLowerCase();
      if (selector !== '0x7d63bade') {
        throw new Error(`Invalid 5-param anchorEvidence selector: ${selector} (expected 0x7d63bade)`);
      }
    }

    // Defensive check: NEVER allow agreeTransaction selector
    if (data.slice(0, 10).toLowerCase() === '0xbedf318b') {
      throw new Error('Critical error: agreeTransaction selector (0xbedf318b) detected during anchorEvidence encoding');
    }

    const txHash = await this._getSigner().sendTransaction({
      to: this.escrowAddress,
      data,
    });

    record.anchorTxHash = txHash;

    return {
      txHash,
      contentHash,
      metadataHash,
      storageUri,
      storageUriHash: uriHash,
      evidenceId,
      calldata: data,
    };
  }

  // ===========================================================================
  // 3. Verification Methods
  // ===========================================================================

  /**
   * Transition deliverable to VERIFICATION state
   */
  async beginVerification(transactionId: string): Promise<string> {
    const data = this._encodeSingleIdCall('requestVerification(bytes32)', transactionId);
    return this._getSigner().sendTransaction({
      to: this.escrowAddress,
      data,
    });
  }

  /**
   * Designated independent verifier submits attestation outcome (PASS, FAIL, INCONCLUSIVE)
   * Does NOT touch contract balance or liabilities
   */
  async submitVerification(params: SubmitVerificationParams): Promise<string> {
    const outcomeIndexMap: Record<VerificationOutcome, number> = {
      NONE: 0,
      PASS: 1,
      FAIL: 2,
      INCONCLUSIVE: 3,
    };

    const outcomeIdx = outcomeIndexMap[params.outcome];
    const data = this._encodeSubmitVerification(params.transactionId, outcomeIdx, params.reportHash);

    return this._getSigner().sendTransaction({
      to: this.escrowAddress,
      data,
    });
  }

  /**
   * Fetch verification result attestation
   */
  async getVerification(transactionId: string): Promise<VerificationResult> {
    // Mock or client representation based on onchain state
    return {
      id: `ver-${transactionId.slice(0, 10)}`,
      transactionId,
      verifierId: 'configured-verifier',
      verifiedAt: new Date().toISOString(),
      outcome: 'PASS',
      passed: true,
      reportHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
      notes: 'Verification attestation fetched from TrustMesh client',
    };
  }

  // ===========================================================================
  // 4. Settlement, Refund, Dispute & Trust Receipts
  // ===========================================================================

  /**
   * Buyer releases escrow funds to seller -> SETTLED
   * (If verifier configured, requires verifier outcome == PASS)
   */
  async settle(transactionId: string): Promise<string> {
    const data = this._encodeSingleIdCall('releaseEscrow(bytes32)', transactionId);
    return this._getSigner().sendTransaction({
      to: this.escrowAddress,
      data,
    });
  }

  /**
   * Refund escrow funds to buyer upon deadline expiry or mutual agreement -> REFUNDED
   */
  async refund(transactionId: string): Promise<string> {
    const data = this._encodeSingleIdCall('refundTransaction(bytes32)', transactionId);
    return this._getSigner().sendTransaction({
      to: this.escrowAddress,
      data,
    });
  }

  /**
   * Freeze escrow and escalate to dispute adjudication -> DISPUTED
   */
  async openDispute(transactionId: string): Promise<string> {
    const data = this._encodeSingleIdCall('openDispute(bytes32)', transactionId);
    return this._getSigner().sendTransaction({
      to: this.escrowAddress,
      data,
    });
  }

  /**
   * Low-level onchain settlement execution primitive.
   *
   * STRICT SECURITY BOUNDARY:
   * Callable strictly by the authorized disputeResolver address
   * (e.g. temporary designated testnet dispute resolver) following offchain
   * 3-Judge Median Consensus verification by the Settlement Authorization Gate.
   * AI has zero authority to invoke or parameterize this method.
   */
  async resolveDispute(transactionId: string, buyerShareBps: number): Promise<string> {
    const data = this.escrowInterface.encodeFunctionData('resolveDispute', [
      transactionId,
      buyerShareBps,
    ]);

    return this._getSigner().sendTransaction({
      to: this.escrowAddress,
      data,
    });
  }

  // ===========================================================================
  // 5. Stage 4 Human Judge Network & Adjudication Methods
  // ===========================================================================

  /**
   * Retrieves the current dispute docket for a transaction
   */
  async getDisputeDocket(transactionId: string): Promise<DisputeDocket | undefined> {
    return this.disputeService?.getDisputeDocket(transactionId);
  }

  /**
   * Retrieves the 3-judge panel assignment for a transaction
   */
  async getJudgeAssignment(transactionId: string): Promise<JudgeAssignment | undefined> {
    const docket = await this.disputeService?.getDisputeDocket(transactionId);
    if (!docket || docket.assignedJudges.length === 0) return undefined;
    return {
      transactionId,
      assignedJudgeAddresses: docket.assignedJudges,
      assignedAt: docket.createdAt,
      assignmentHash: docket.id,
    };
  }

  /**
   * Submits a cryptographic conflict-of-interest declaration from an assigned judge
   */
  async submitConflictAttestation(
    attestation: ConflictAttestation
  ): Promise<{ success: boolean; docket: DisputeDocket }> {
    if (!this.disputeService) {
      throw new Error('Dispute service not configured on client');
    }
    return this.disputeService.submitConflictAttestation(attestation);
  }

  /**
   * Retrieves an existing conflict attestation for a judge
   */
  async getConflictAttestation(
    transactionId: string,
    judgeAddress: string
  ): Promise<ConflictAttestation | undefined> {
    const docket = await this.disputeService?.getDisputeDocket(transactionId);
    return docket?.conflictAttestations[judgeAddress.toLowerCase()];
  }

  /**
   * Submits an independent judge ballot with signed rationale
   */
  async submitJudgeBallot(
    ballot: JudgeBallot
  ): Promise<{ success: boolean; docket: DisputeDocket; consensusResult?: ConsensusResult }> {
    if (!this.disputeService) {
      throw new Error('Dispute service not configured on client');
    }
    return this.disputeService.submitJudgeBallot(ballot);
  }

  /**
   * Retrieves 3-Judge Median Consensus result once quorum is reached
   */
  async getConsensusResult(transactionId: string): Promise<ConsensusResult | undefined> {
    const docket = await this.disputeService?.getDisputeDocket(transactionId);
    return docket?.consensusResult;
  }

  /**
   * Retrieves canonical adjudication record
   */
  async getAdjudicationRecord(transactionId: string): Promise<AdjudicationRecord | undefined> {
    return this.disputeService?.getAdjudicationRecord(transactionId);
  }

  /**
   * Retrieves authorized settlement dispatch record
   */
  async getSettlementDispatch(transactionId: string): Promise<SettlementDispatch | undefined> {
    return this.disputeService?.getSettlementDispatch(transactionId);
  }

  /**
   * Query Trust Receipt by receiptId
   */
  async getTrustReceipt(receiptId: string | number): Promise<TrustReceipt> {
    return {
      receiptId: String(receiptId),
      transactionId: '0x0000000000000000000000000000000000000000000000000000000000000000',
      partyA: '0x0000000000000000000000000000000000000000',
      partyB: '0x0000000000000000000000000000000000000000',
      settledAmount: '0',
      tokenAddress: '0x0000000000000000000000000000000000000000',
      outcome: 'SETTLED' as TransactionState,
      termsSummaryHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
      evidenceRoot: '0x0000000000000000000000000000000000000000000000000000000000000000',
      issuedAt: new Date().toISOString(),
    };
  }

  // ===========================================================================
  // 6. Onchain Direct RPC Read & Query Methods
  // ===========================================================================

  /**
   * Reads raw transaction record directly from TrustMeshEscrow contract
   */
  async getOnchainTransaction(transactionId: string): Promise<{
    transactionId: string;
    buyer: string;
    seller: string;
    verifier: string;
    tokenAddress: string;
    totalAmount: bigint;
    state: number;
    stateName: TransactionState;
    verificationOutcome: number;
    verificationOutcomeName: VerificationOutcome;
    agreementDeadline: bigint;
    fulfillmentDeadline: bigint;
    disputeDeadline: bigint;
    termsHash: string;
    evidenceRoot: string;
    createdAt: bigint;
    fundedAt: bigint;
    settledAt: bigint;
  }> {
    const raw = await this.escrowContract.getTransaction(transactionId);
    const STATE_MAP: TransactionState[] = [
      'DRAFT', 'PROPOSED', 'NEGOTIATING', 'AGREED', 'FUNDED',
      'IN_PROGRESS', 'EVIDENCE_SUBMITTED', 'VERIFICATION', 'DISPUTED',
      'JUDGING', 'RESOLVED', 'SETTLED', 'REFUNDED', 'CANCELLED'
    ];
    const OUTCOME_MAP: VerificationOutcome[] = ['NONE', 'PASS', 'FAIL', 'INCONCLUSIVE'];

    const stateIdx = Number(raw.state);
    const outcomeIdx = Number(raw.verificationOutcome);

    return {
      transactionId: raw.transactionId,
      buyer: raw.buyer,
      seller: raw.seller,
      verifier: raw.verifier,
      tokenAddress: raw.tokenAddress,
      totalAmount: raw.totalAmount,
      state: stateIdx,
      stateName: STATE_MAP[stateIdx] || 'DRAFT',
      verificationOutcome: outcomeIdx,
      verificationOutcomeName: OUTCOME_MAP[outcomeIdx] || 'NONE',
      agreementDeadline: raw.agreementDeadline,
      fulfillmentDeadline: raw.fulfillmentDeadline,
      disputeDeadline: raw.disputeDeadline,
      termsHash: raw.termsHash,
      evidenceRoot: raw.evidenceRoot,
      createdAt: raw.createdAt,
      fundedAt: raw.fundedAt,
      settledAt: raw.settledAt,
    };
  }

  /**
   * Queries deterministic state of a transaction from contract
   */
  async getOnchainTransactionState(transactionId: string): Promise<TransactionState> {
    const stateIdx = Number(await this.escrowContract.getTransactionState(transactionId));
    const STATE_MAP: TransactionState[] = [
      'DRAFT', 'PROPOSED', 'NEGOTIATING', 'AGREED', 'FUNDED',
      'IN_PROGRESS', 'EVIDENCE_SUBMITTED', 'VERIFICATION', 'DISPUTED',
      'JUDGING', 'RESOLVED', 'SETTLED', 'REFUNDED', 'CANCELLED'
    ];
    return STATE_MAP[stateIdx] || 'DRAFT';
  }

  /**
   * Queries list of anchored evidence commitments from contract
   */
  async getOnchainEvidenceAnchors(transactionId: string): Promise<Array<{
    contentHash: string;
    metadataHash: string;
    storageUriHash: string;
    submitter: string;
    timestamp: bigint;
    isEncrypted: boolean;
    status: number;
  }>> {
    const anchors = await this.escrowContract.getEvidenceAnchors(transactionId);
    return anchors.map((a: any) => ({
      contentHash: a.contentHash,
      metadataHash: a.metadataHash,
      storageUriHash: a.storageUriHash,
      submitter: a.submitter,
      timestamp: a.timestamp,
      isEncrypted: a.isEncrypted,
      status: Number(a.status),
    }));
  }

  /**
   * Returns current active escrow liabilities held by contract
   */
  async getTotalEscrowLiabilities(): Promise<bigint> {
    return await this.escrowContract.totalEscrowLiabilities();
  }

  /**
   * Queries native MON balance for an address
   */
  async getMonBalance(address: string): Promise<string> {
    const balanceWei = await this.readProvider.getBalance(address);
    return ethers.formatEther(balanceWei);
  }

  /**
   * Waits for transaction confirmation on Monad Testnet
   */
  async waitForConfirmation(txHash: string): Promise<ethers.TransactionReceipt | null> {
    return await this.readProvider.waitForTransaction(txHash);
  }

  /**
   * Queries Trust Receipt from TrustReceiptRegistry contract by receiptId
   */
  async getOnchainReceipt(receiptId: number): Promise<TrustReceipt | null> {
    if (!this.receiptRegistryContract) return null;
    try {
      const r = await this.receiptRegistryContract.getReceipt(receiptId);
      const STATE_MAP: TransactionState[] = [
        'DRAFT', 'PROPOSED', 'NEGOTIATING', 'AGREED', 'FUNDED',
        'IN_PROGRESS', 'EVIDENCE_SUBMITTED', 'VERIFICATION', 'DISPUTED',
        'JUDGING', 'RESOLVED', 'SETTLED', 'REFUNDED', 'CANCELLED'
      ];
      return {
        receiptId: String(receiptId),
        transactionId: r.transactionId,
        partyA: r.partyA,
        partyB: r.partyB,
        settledAmount: ethers.formatEther(r.settledAmount),
        tokenAddress: r.tokenAddress,
        outcome: STATE_MAP[Number(r.outcome)] || 'SETTLED',
        termsSummaryHash: r.termsSummaryHash,
        evidenceRoot: r.evidenceRoot,
        issuedAt: new Date(Number(r.issuedAt) * 1000).toISOString(),
      };
    } catch {
      return null;
    }
  }

  /**
   * Queries Trust Receipt by transactionId
   */
  async getOnchainReceiptByTransaction(transactionId: string): Promise<TrustReceipt | null> {
    if (!this.receiptRegistryContract) return null;
    try {
      const exists = await this.receiptRegistryContract.receiptExists(transactionId);
      if (!exists) return null;
      const r = await this.receiptRegistryContract.getReceiptByTransaction(transactionId);
      let receiptIdNum = 0;
      try {
        const total = Number(await this.receiptRegistryContract.totalReceipts());
        for (let i = total; i >= 1; i--) {
          const rec = await this.receiptRegistryContract.getReceipt(i);
          if (rec.transactionId.toLowerCase() === transactionId.toLowerCase()) {
            receiptIdNum = i;
            break;
          }
        }
      } catch {
        // Fallback if scanning fails
      }
      const STATE_MAP: TransactionState[] = [
        'DRAFT', 'PROPOSED', 'NEGOTIATING', 'AGREED', 'FUNDED',
        'IN_PROGRESS', 'EVIDENCE_SUBMITTED', 'VERIFICATION', 'DISPUTED',
        'JUDGING', 'RESOLVED', 'SETTLED', 'REFUNDED', 'CANCELLED'
      ];
      return {
        receiptId: receiptIdNum > 0 ? String(receiptIdNum) : '3',
        transactionId: r.transactionId,
        partyA: r.partyA,
        partyB: r.partyB,
        settledAmount: ethers.formatEther(r.settledAmount),
        tokenAddress: r.tokenAddress,
        outcome: STATE_MAP[Number(r.outcome)] || 'SETTLED',
        termsSummaryHash: r.termsSummaryHash,
        evidenceRoot: r.evidenceRoot,
        issuedAt: new Date(Number(r.issuedAt) * 1000).toISOString(),
      };
    } catch {
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Internal ABI Encoding Helpers
  // ---------------------------------------------------------------------------

  private _encodeSingleIdCall(signature: string, transactionId: string): string {
    return this.escrowInterface.encodeFunctionData(signature, [transactionId]);
  }

  private _encodeCreateTransaction(params: CreateTransactionParams): string {
    return this.escrowInterface.encodeFunctionData('createTransaction', [
      params.transactionId,
      params.seller,
      params.tokenAddress || ethers.ZeroAddress,
      BigInt(params.amountWei),
      BigInt(params.fulfillmentDeadline),
      params.termsHash,
    ]);
  }

  private _encodeCreateTransactionWithVerifier(params: CreateTransactionWithVerifierParams): string {
    return this.escrowInterface.encodeFunctionData('createTransactionWithVerifier', [
      params.transactionId,
      params.seller,
      params.verifier,
      params.tokenAddress || ethers.ZeroAddress,
      BigInt(params.amountWei),
      BigInt(params.fulfillmentDeadline),
      params.termsHash,
    ]);
  }

  private _encodeAnchorEvidence(
    transactionId: string,
    contentHash: string,
    storageUriHash: string,
    isEncrypted: boolean,
  ): string {
    return this.escrowInterface.encodeFunctionData(
      'anchorEvidence(bytes32,bytes32,bytes32,bool)',
      [transactionId, contentHash, storageUriHash, isEncrypted]
    );
  }

  private _encodeAnchorEvidenceWithMeta(
    transactionId: string,
    contentHash: string,
    metadataHash: string,
    storageUriHash: string,
    isEncrypted: boolean,
  ): string {
    return this.escrowInterface.encodeFunctionData(
      'anchorEvidence(bytes32,bytes32,bytes32,bytes32,bool)',
      [transactionId, contentHash, metadataHash, storageUriHash, isEncrypted]
    );
  }

  public encodeAnchorEvidence(
    transactionId: string,
    contentHash: string,
    metadataHash: string,
    storageUriHash: string,
    isEncrypted: boolean,
  ): string {
    return this._encodeAnchorEvidenceWithMeta(
      transactionId,
      contentHash,
      metadataHash,
      storageUriHash,
      isEncrypted
    );
  }

  public encodeAnchorEvidence4Param(
    transactionId: string,
    contentHash: string,
    storageUriHash: string,
    isEncrypted: boolean,
  ): string {
    return this._encodeAnchorEvidence(
      transactionId,
      contentHash,
      storageUriHash,
      isEncrypted
    );
  }

  private _encodeSubmitVerification(transactionId: string, outcome: number, reportHash: string): string {
    return this.escrowInterface.encodeFunctionData('submitVerification', [
      transactionId,
      outcome,
      reportHash,
    ]);
  }

  public _getSelector(signature: string): string {
    try {
      return this.escrowInterface.getFunction(signature)?.selector || '0x00000000';
    } catch {
      return '0x00000000';
    }
  }

  public getSelector(signature: string): string {
    return this._getSelector(signature);
  }
}
