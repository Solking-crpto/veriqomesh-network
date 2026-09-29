// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./interfaces/ITrustMeshEscrow.sol";
import "./interfaces/ITrustReceiptRegistry.sol";

/**
 * @title TrustMeshEscrow
 * @author TrustMesh Core Architecture Team
 * @notice Production-grade non-custodial transaction escrow enforcing a deterministic
 *         14-state machine, native MON payment protection, cryptographic evidence anchoring,
 *         independent verification gating, and Soulbound Trust Receipt issuance.
 *
 * PROTOCOL INVARIANTS:
 * 1. Financial Solvency: address(this).balance >= totalEscrowLiabilities
 * 2. Immutable Payees: Disbursements strictly pay txRecord.seller and txRecord.buyer.
 * 3. Terminal Finality: Transactions in SETTLED, REFUNDED, or CANCELLED can never transition again.
 * 4. Zero Autonomous AI Authority: Contested payouts require explicit human dispute resolver authorization.
 * 5. Verifier Gating: If an independent verifier is configured, releaseEscrow strictly requires VerificationOutcome.PASS.
 * 6. Non-Automated Dispute Payouts: VerificationOutcome.FAIL or INCONCLUSIVE never triggers automated refunds;
 *    funds remain preserved in contract custody for dispute or mutual resolution.
 * 7. Receipt Safety: Receipt issuance cannot alter escrow liabilities, balances, or settlement allocations.
 */
contract TrustMeshEscrow is ITrustMeshEscrow {
    // -------------------------------------------------------------------------
    // Storage
    // -------------------------------------------------------------------------

    /// @notice Address authorized to resolve disputed escrows (Human Judge Network / Adjudication Hub)
    address public disputeResolver;

    /// @notice Contract deployer / administrative reference
    address public immutable owner;

    /// @notice Soulbound Trust Receipt Registry contract reference
    ITrustReceiptRegistry public receiptRegistry;

    /// @notice Reentrancy guard status flag
    uint256 private _reentrancyStatus;
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    /// @notice Cumulative active native escrow liabilities currently locked
    uint256 public totalEscrowLiabilities;

    /// @notice Mapping of unique transactionId to onchain transaction record
    mapping(bytes32 => TransactionRecord) private _transactions;

    /// @notice Mapping of transactionId to array of anchored evidence commitments
    mapping(bytes32 => EvidenceAnchor[]) private _evidenceAnchors;

    /// @notice Pull-payment pattern balance for failed push transfers
    mapping(address => uint256) public pendingWithdrawals;

    // -------------------------------------------------------------------------
    // Custom Errors
    // -------------------------------------------------------------------------

    error ReentrancyGuardReentrantCall();
    error TransactionAlreadyExists(bytes32 transactionId);
    error TransactionDoesNotExist(bytes32 transactionId);
    error InvalidStateTransition(TransactionState current, TransactionState target);
    error UnauthorizedActor(address caller, string expectedRole);
    error InvalidAmount(uint256 amount);
    error InvalidDeadline(uint64 deadline);
    error InvalidAddress();
    error MismatchedFundingAmount(uint256 expected, uint256 received);
    error InsufficientContractBalance();
    error WithdrawalFailed();
    error DisputeWindowExpired();
    error SettlementRatioOutOfRange(uint16 ratioBps);
    error NoVerifierConfigured(bytes32 transactionId);
    error InvalidVerificationOutcome();
    error VerificationNotPassed(VerificationOutcome outcome);
    error VerificationInconclusive(bytes32 transactionId);
    error RegistryAlreadySet();

    // -------------------------------------------------------------------------
    // Modifiers
    // -------------------------------------------------------------------------

    modifier nonReentrant() {
        if (_reentrancyStatus == _ENTERED) revert ReentrancyGuardReentrantCall();
        _reentrancyStatus = _ENTERED;
        _;
        _reentrancyStatus = _NOT_ENTERED;
    }

    modifier txExists(bytes32 transactionId) {
        if (_transactions[transactionId].buyer == address(0)) {
            revert TransactionDoesNotExist(transactionId);
        }
        _;
    }

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(address _disputeResolver, address _receiptRegistry) {
        if (_disputeResolver == address(0)) revert InvalidAddress();
        disputeResolver = _disputeResolver;
        owner = msg.sender;
        _reentrancyStatus = _NOT_ENTERED;

        if (_receiptRegistry != address(0)) {
            receiptRegistry = ITrustReceiptRegistry(_receiptRegistry);
        }
    }

    // -------------------------------------------------------------------------
    // Administration: Dispute Resolver & Registry Setup
    // -------------------------------------------------------------------------

    /**
     * @notice Replace the authorized dispute resolver
     * @param newResolver Address of the new dispute resolver hub
     */
    function setDisputeResolver(address newResolver) external override {
        if (msg.sender != owner) revert UnauthorizedActor(msg.sender, "OWNER");
        if (newResolver == address(0)) revert InvalidAddress();

        address oldResolver = disputeResolver;
        disputeResolver = newResolver;

        emit DisputeResolverUpdated(oldResolver, newResolver);
    }

    /**
     * @notice Set or link the Soulbound Trust Receipt Registry (if not set at deployment)
     * @param _receiptRegistry Address of the TrustReceiptRegistry contract
     */
    function setReceiptRegistry(address _receiptRegistry) external {
        if (msg.sender != owner) revert UnauthorizedActor(msg.sender, "OWNER");
        if (_receiptRegistry == address(0)) revert InvalidAddress();
        if (address(receiptRegistry) != address(0)) revert RegistryAlreadySet();

        receiptRegistry = ITrustReceiptRegistry(_receiptRegistry);
    }

    // -------------------------------------------------------------------------
    // External Functions: Transaction Creation & Negotiation
    // -------------------------------------------------------------------------

    /**
     * @notice Create a transaction without an independent verifier (buyer self-attests on settlement)
     */
    function createTransaction(
        bytes32 transactionId,
        address seller,
        address tokenAddress,
        uint256 amount,
        uint64 fulfillmentDeadline,
        bytes32 termsHash
    ) external payable override nonReentrant {
        _createTransaction(transactionId, seller, address(0), tokenAddress, amount, fulfillmentDeadline, termsHash);
    }

    /**
     * @notice Create a transaction with a designated independent verifier
     */
    function createTransactionWithVerifier(
        bytes32 transactionId,
        address seller,
        address verifier,
        address tokenAddress,
        uint256 amount,
        uint64 fulfillmentDeadline,
        bytes32 termsHash
    ) external payable override nonReentrant {
        if (verifier == address(0)) revert InvalidAddress();
        _createTransaction(transactionId, seller, verifier, tokenAddress, amount, fulfillmentDeadline, termsHash);
    }

    function _createTransaction(
        bytes32 transactionId,
        address seller,
        address verifier,
        address tokenAddress,
        uint256 amount,
        uint64 fulfillmentDeadline,
        bytes32 termsHash
    ) internal {
        if (transactionId == bytes32(0)) revert InvalidAddress();
        if (seller == address(0) || seller == msg.sender) revert InvalidAddress();
        if (verifier != address(0) && (verifier == seller || verifier == msg.sender)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount(0);
        if (fulfillmentDeadline <= block.timestamp) revert InvalidDeadline(fulfillmentDeadline);
        if (_transactions[transactionId].buyer != address(0)) {
            revert TransactionAlreadyExists(transactionId);
        }

        TransactionRecord storage txRecord = _transactions[transactionId];
        txRecord.transactionId = transactionId;
        txRecord.buyer = msg.sender;
        txRecord.seller = seller;
        txRecord.verifier = verifier;
        txRecord.tokenAddress = tokenAddress; // address(0) for native MON
        txRecord.totalAmount = amount;
        txRecord.verificationOutcome = VerificationOutcome.NONE;
        txRecord.fulfillmentDeadline = fulfillmentDeadline;
        txRecord.agreementDeadline = uint64(block.timestamp + 7 days);
        txRecord.disputeDeadline = uint64(fulfillmentDeadline + 5 days);
        txRecord.termsHash = termsHash;
        txRecord.createdAt = uint64(block.timestamp);

        // State progression
        if (msg.value == amount) {
            txRecord.state = TransactionState.FUNDED;
            txRecord.fundedAt = uint64(block.timestamp);
            totalEscrowLiabilities += amount;
            emit TransactionCreated(transactionId, msg.sender, seller, verifier, amount);
            emit TransactionFunded(transactionId, msg.sender, amount);
        } else {
            if (msg.value != 0) revert MismatchedFundingAmount(amount, msg.value);
            txRecord.state = TransactionState.PROPOSED;
            emit TransactionCreated(transactionId, msg.sender, seller, verifier, amount);
        }
    }

    /**
     * @notice Counterparty accepts the proposal, locking terms into AGREED state
     */
    function agreeTransaction(bytes32 transactionId) external override txExists(transactionId) {
        TransactionRecord storage txRecord = _transactions[transactionId];
        if (msg.sender != txRecord.seller) revert UnauthorizedActor(msg.sender, "SELLER");

        if (txRecord.state != TransactionState.PROPOSED && txRecord.state != TransactionState.NEGOTIATING) {
            revert InvalidStateTransition(txRecord.state, TransactionState.AGREED);
        }

        txRecord.state = TransactionState.AGREED;
        emit TransactionAgreed(transactionId, msg.sender);
    }

    /**
     * @notice Buyer funds the agreed escrow with native MON
     */
    function fundEscrow(bytes32 transactionId) external payable override txExists(transactionId) nonReentrant {
        TransactionRecord storage txRecord = _transactions[transactionId];
        if (msg.sender != txRecord.buyer) revert UnauthorizedActor(msg.sender, "BUYER");

        if (txRecord.state != TransactionState.AGREED) {
            revert InvalidStateTransition(txRecord.state, TransactionState.FUNDED);
        }
        if (msg.value != txRecord.totalAmount) {
            revert MismatchedFundingAmount(txRecord.totalAmount, msg.value);
        }

        txRecord.state = TransactionState.FUNDED;
        txRecord.fundedAt = uint64(block.timestamp);
        totalEscrowLiabilities += msg.value;

        emit TransactionFunded(transactionId, msg.sender, msg.value);
    }

    // -------------------------------------------------------------------------
    // External Functions: Execution & Evidence Anchoring
    // -------------------------------------------------------------------------

    /**
     * @notice Seller marks that work has commenced
     */
    function startWork(bytes32 transactionId) external override txExists(transactionId) {
        TransactionRecord storage txRecord = _transactions[transactionId];
        if (msg.sender != txRecord.seller) revert UnauthorizedActor(msg.sender, "SELLER");

        if (txRecord.state != TransactionState.FUNDED) {
            revert InvalidStateTransition(txRecord.state, TransactionState.IN_PROGRESS);
        }

        txRecord.state = TransactionState.IN_PROGRESS;
        emit TransactionStarted(transactionId, msg.sender);
    }

    /**
     * @notice Overload for backward compatibility
     */
    function anchorEvidence(
        bytes32 transactionId,
        bytes32 contentHash,
        bytes32 storageUriHash,
        bool isEncrypted
    ) external override txExists(transactionId) {
        _anchorEvidence(transactionId, contentHash, bytes32(0), storageUriHash, isEncrypted);
    }

    /**
     * @notice Anchor cryptographic hash of offchain deliverable / evidence onchain
     * @dev Authorized callers: seller, buyer, or designated verifier.
     *      contentHash: exact hash of offchain evidence bytes (identity of evidence).
     *      metadataHash: exact hash of canonicalized metadata.
     *      storageUriHash: retrieval location pointer only.
     */
    function anchorEvidence(
        bytes32 transactionId,
        bytes32 contentHash,
        bytes32 metadataHash,
        bytes32 storageUriHash,
        bool isEncrypted
    ) external override txExists(transactionId) {
        _anchorEvidence(transactionId, contentHash, metadataHash, storageUriHash, isEncrypted);
    }

    function _anchorEvidence(
        bytes32 transactionId,
        bytes32 contentHash,
        bytes32 metadataHash,
        bytes32 storageUriHash,
        bool isEncrypted
    ) internal {
        TransactionRecord storage txRecord = _transactions[transactionId];
        if (msg.sender != txRecord.seller && msg.sender != txRecord.buyer && msg.sender != txRecord.verifier) {
            revert UnauthorizedActor(msg.sender, "PARTICIPANT_OR_VERIFIER");
        }
        if (contentHash == bytes32(0)) revert InvalidAddress();

        // Evidence can be anchored while IN_PROGRESS, EVIDENCE_SUBMITTED, or VERIFICATION
        if (
            txRecord.state != TransactionState.IN_PROGRESS &&
            txRecord.state != TransactionState.EVIDENCE_SUBMITTED &&
            txRecord.state != TransactionState.VERIFICATION
        ) {
            revert InvalidStateTransition(txRecord.state, TransactionState.EVIDENCE_SUBMITTED);
        }

        txRecord.evidenceRoot = contentHash;
        if (txRecord.state == TransactionState.IN_PROGRESS) {
            txRecord.state = TransactionState.EVIDENCE_SUBMITTED;
        }

        EvidenceVerificationStatus initialStatus = (msg.sender == txRecord.verifier)
            ? EvidenceVerificationStatus.ATTESTED
            : EvidenceVerificationStatus.SELF_REPORTED;

        _evidenceAnchors[transactionId].push(
            EvidenceAnchor({
                contentHash: contentHash,
                metadataHash: metadataHash,
                storageUriHash: storageUriHash,
                submitter: msg.sender,
                timestamp: uint64(block.timestamp),
                isEncrypted: isEncrypted,
                status: initialStatus
            })
        );

        emit EvidenceAnchored(transactionId, contentHash, msg.sender);
    }

    /**
     * @notice Transition deliverable to VERIFICATION state
     */
    function requestVerification(bytes32 transactionId) external override txExists(transactionId) {
        TransactionRecord storage txRecord = _transactions[transactionId];
        if (msg.sender != txRecord.seller && msg.sender != txRecord.buyer) {
            revert UnauthorizedActor(msg.sender, "PARTICIPANT");
        }

        if (txRecord.state != TransactionState.EVIDENCE_SUBMITTED) {
            revert InvalidStateTransition(txRecord.state, TransactionState.VERIFICATION);
        }

        txRecord.state = TransactionState.VERIFICATION;
        emit VerificationStarted(transactionId, txRecord.verifier != address(0) ? txRecord.verifier : msg.sender);
    }

    /**
     * @notice Designated independent verifier submits verification attestation
     * @dev Strictly callable by txRecord.verifier.
     *      Does NOT touch contract balances, liabilities, or trigger automated payouts.
     */
    function submitVerification(
        bytes32 transactionId,
        VerificationOutcome outcome,
        bytes32 reportHash
    ) external override txExists(transactionId) {
        TransactionRecord storage txRecord = _transactions[transactionId];

        if (txRecord.verifier == address(0)) {
            revert NoVerifierConfigured(transactionId);
        }
        if (msg.sender != txRecord.verifier) {
            revert UnauthorizedActor(msg.sender, "DESIGNATED_VERIFIER");
        }
        if (txRecord.state != TransactionState.VERIFICATION) {
            revert InvalidStateTransition(txRecord.state, TransactionState.VERIFICATION);
        }
        if (outcome == VerificationOutcome.NONE) {
            revert InvalidVerificationOutcome();
        }

        txRecord.verificationOutcome = outcome;

        emit VerificationSubmitted(transactionId, msg.sender, outcome, reportHash);
    }

    // -------------------------------------------------------------------------
    // External Functions: Settlement & Refund (Terminal States)
    // -------------------------------------------------------------------------

    /**
     * @notice Buyer releases escrow to seller upon successful verification
     * @dev If a verifier is configured, strictly requires verificationOutcome == VerificationOutcome.PASS.
     *      If outcome is INCONCLUSIVE, release is blocked; funds preserved for dispute.
     */
    function releaseEscrow(bytes32 transactionId) external override txExists(transactionId) nonReentrant {
        TransactionRecord storage txRecord = _transactions[transactionId];
        if (msg.sender != txRecord.buyer) revert UnauthorizedActor(msg.sender, "BUYER");

        if (txRecord.verifier != address(0)) {
            if (txRecord.state != TransactionState.VERIFICATION) {
                revert InvalidStateTransition(txRecord.state, TransactionState.SETTLED);
            }
            if (txRecord.verificationOutcome == VerificationOutcome.INCONCLUSIVE) {
                revert VerificationInconclusive(transactionId);
            }
            if (txRecord.verificationOutcome != VerificationOutcome.PASS) {
                revert VerificationNotPassed(txRecord.verificationOutcome);
            }
        } else {
            if (
                txRecord.state != TransactionState.VERIFICATION &&
                txRecord.state != TransactionState.EVIDENCE_SUBMITTED &&
                txRecord.state != TransactionState.IN_PROGRESS
            ) {
                revert InvalidStateTransition(txRecord.state, TransactionState.SETTLED);
            }
        }

        uint256 amountToSettle = txRecord.totalAmount;
        address sellerRecipient = txRecord.seller;

        // Effects
        txRecord.state = TransactionState.SETTLED;
        txRecord.settledAt = uint64(block.timestamp);
        totalEscrowLiabilities -= amountToSettle;

        emit TransactionSettled(transactionId, sellerRecipient, amountToSettle);

        // Interaction: Issue Soulbound Trust Receipt if registry configured
        _issueReceiptIfConfigured(
            transactionId,
            txRecord.buyer,
            sellerRecipient,
            amountToSettle,
            txRecord.tokenAddress,
            TransactionState.SETTLED,
            txRecord.termsHash,
            txRecord.evidenceRoot
        );

        // Interaction: Transfer native MON to seller
        _safeTransferNative(sellerRecipient, amountToSettle);
    }

    /**
     * @notice Refund escrow to buyer (e.g. deadline expired or mutual consent)
     * @dev Invariant: VerificationOutcome.FAIL does NOT automatically trigger a refund;
     *      refund requires fulfillment deadline expiry or seller consent.
     */
    function refundTransaction(bytes32 transactionId) external override txExists(transactionId) nonReentrant {
        TransactionRecord storage txRecord = _transactions[transactionId];
        
        bool isBuyer = msg.sender == txRecord.buyer;
        bool isSeller = msg.sender == txRecord.seller;
        if (!isBuyer && !isSeller) revert UnauthorizedActor(msg.sender, "PARTICIPANT");

        if (isBuyer && block.timestamp < txRecord.fulfillmentDeadline && msg.sender != txRecord.seller) {
            revert UnauthorizedActor(msg.sender, "DEADLINE_NOT_REACHED");
        }

        if (
            txRecord.state != TransactionState.FUNDED &&
            txRecord.state != TransactionState.IN_PROGRESS &&
            txRecord.state != TransactionState.EVIDENCE_SUBMITTED &&
            txRecord.state != TransactionState.VERIFICATION
        ) {
            revert InvalidStateTransition(txRecord.state, TransactionState.REFUNDED);
        }

        uint256 amountToRefund = txRecord.totalAmount;
        address buyerRecipient = txRecord.buyer;

        // Effects
        txRecord.state = TransactionState.REFUNDED;
        txRecord.settledAt = uint64(block.timestamp);
        totalEscrowLiabilities -= amountToRefund;

        emit TransactionRefunded(transactionId, buyerRecipient, amountToRefund);

        // Interaction: Issue Soulbound Trust Receipt if registry configured
        _issueReceiptIfConfigured(
            transactionId,
            buyerRecipient,
            txRecord.seller,
            amountToRefund,
            txRecord.tokenAddress,
            TransactionState.REFUNDED,
            txRecord.termsHash,
            txRecord.evidenceRoot
        );

        // Interaction: Transfer native MON to buyer
        _safeTransferNative(buyerRecipient, amountToRefund);
    }

    // -------------------------------------------------------------------------
    // External Functions: Dispute & Adjudication
    // -------------------------------------------------------------------------

    /**
     * @notice Freeze escrow into DISPUTED state when terms or deliverables are contested
     */
    function openDispute(bytes32 transactionId) external payable override txExists(transactionId) {
        TransactionRecord storage txRecord = _transactions[transactionId];
        if (msg.sender != txRecord.buyer && msg.sender != txRecord.seller) {
            revert UnauthorizedActor(msg.sender, "PARTICIPANT");
        }

        if (
            txRecord.state != TransactionState.FUNDED &&
            txRecord.state != TransactionState.IN_PROGRESS &&
            txRecord.state != TransactionState.EVIDENCE_SUBMITTED &&
            txRecord.state != TransactionState.VERIFICATION
        ) {
            revert InvalidStateTransition(txRecord.state, TransactionState.DISPUTED);
        }

        txRecord.state = TransactionState.DISPUTED;
        emit DisputeOpened(transactionId, msg.sender);
    }

    /**
     * @notice Enforce binding dispute verdict rendered by the authorized dispute resolver
     * @param transactionId Unique transaction identifier
     * @param buyerShareBps Basis points (0 to 10000) awarded to buyer; remainder to seller.
     *                      0 = 0% buyer / 100% seller
     *                      1500 = 15% buyer / 85% seller
     *                      5000 = 50% buyer / 50% seller
     *                      10000 = 100% buyer / 0% seller
     */
    function resolveDispute(
        bytes32 transactionId,
        uint16 buyerShareBps
    ) external override txExists(transactionId) nonReentrant {
        if (msg.sender != disputeResolver) revert UnauthorizedActor(msg.sender, "DISPUTE_RESOLVER");
        if (buyerShareBps > 10000) revert SettlementRatioOutOfRange(buyerShareBps);

        TransactionRecord storage txRecord = _transactions[transactionId];
        if (txRecord.state != TransactionState.DISPUTED) {
            revert InvalidStateTransition(txRecord.state, TransactionState.RESOLVED);
        }

        uint256 totalAmount = txRecord.totalAmount;
        uint256 buyerPayout = (totalAmount * buyerShareBps) / 10000;
        uint256 sellerPayout = totalAmount - buyerPayout;

        // Effects
        TransactionState finalOutcome = (buyerShareBps == 10000)
            ? TransactionState.REFUNDED
            : TransactionState.SETTLED;

        txRecord.state = finalOutcome;
        txRecord.settledAt = uint64(block.timestamp);
        totalEscrowLiabilities -= totalAmount;

        emit DisputeResolved(transactionId, msg.sender, buyerShareBps);

        // Interaction: Issue Soulbound Trust Receipt if registry configured
        _issueReceiptIfConfigured(
            transactionId,
            txRecord.buyer,
            txRecord.seller,
            totalAmount,
            txRecord.tokenAddress,
            finalOutcome,
            txRecord.termsHash,
            txRecord.evidenceRoot
        );

        // Interactions: Disburse payouts
        if (buyerPayout > 0) {
            _safeTransferNative(txRecord.buyer, buyerPayout);
        }
        if (sellerPayout > 0) {
            _safeTransferNative(txRecord.seller, sellerPayout);
        }
    }

    // -------------------------------------------------------------------------
    // View Functions
    // -------------------------------------------------------------------------

    function getTransaction(bytes32 transactionId) external view override returns (TransactionRecord memory) {
        return _transactions[transactionId];
    }

    function getTransactionState(bytes32 transactionId) external view override returns (TransactionState) {
        return _transactions[transactionId].state;
    }

    function getEvidenceAnchors(bytes32 transactionId) external view returns (EvidenceAnchor[] memory) {
        return _evidenceAnchors[transactionId];
    }

    // -------------------------------------------------------------------------
    // Internal & Helper Functions
    // -------------------------------------------------------------------------

    function _issueReceiptIfConfigured(
        bytes32 transactionId,
        address partyA,
        address partyB,
        uint256 settledAmount,
        address tokenAddress,
        TransactionState outcome,
        bytes32 termsSummaryHash,
        bytes32 evidenceRoot
    ) internal {
        if (address(receiptRegistry) != address(0)) {
            try receiptRegistry.issueReceipt(
                transactionId,
                partyA,
                partyB,
                settledAmount,
                tokenAddress,
                outcome,
                termsSummaryHash,
                evidenceRoot
            ) returns (uint256 receiptId) {
                emit TrustReceiptIssued(transactionId, receiptId);
            } catch {}
        }
    }

    /**
     * @dev Push transfer with pull-payment fallback to prevent DoS from reverting recipients
     */
    function _safeTransferNative(address recipient, uint256 amount) internal {
        (bool success, ) = recipient.call{value: amount}("");
        if (!success) {
            pendingWithdrawals[recipient] += amount;
        }
    }

    /**
     * @notice Pull payment method for recipients whose push transfer encountered a revert
     */
    function withdrawPendingFunds() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        if (amount == 0) revert InvalidAmount(0);

        pendingWithdrawals[msg.sender] = 0;
        (bool success, ) = msg.sender.call{value: amount}("");
        if (!success) revert WithdrawalFailed();
    }
}
