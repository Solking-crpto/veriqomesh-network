// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./ITrustMeshTypes.sol";

/**
 * @title ITrustMeshEscrow
 * @notice Interface for TrustMesh protected escrow execution, state progression, and funds release.
 */
interface ITrustMeshEscrow is ITrustMeshTypes {
    event TransactionCreated(bytes32 indexed transactionId, address indexed buyer, address indexed seller, address verifier, uint256 amount);
    event TransactionAgreed(bytes32 indexed transactionId, address indexed seller);
    event TransactionFunded(bytes32 indexed transactionId, address indexed funder, uint256 amount);
    event TransactionStarted(bytes32 indexed transactionId, address indexed seller);
    event EvidenceAnchored(bytes32 indexed transactionId, bytes32 indexed contentHash, address indexed submitter);
    event VerificationStarted(bytes32 indexed transactionId, address indexed verifier);
    event VerificationSubmitted(bytes32 indexed transactionId, address indexed verifier, VerificationOutcome outcome, bytes32 reportHash);
    event TransactionSettled(bytes32 indexed transactionId, address indexed recipient, uint256 amount);
    event TransactionRefunded(bytes32 indexed transactionId, address indexed recipient, uint256 amount);
    event DisputeOpened(bytes32 indexed transactionId, address indexed initiator);
    event DisputeResolved(bytes32 indexed transactionId, address indexed resolver, uint16 buyerShareBps);
    event DisputeResolverUpdated(address indexed oldResolver, address indexed newResolver);
    event TrustReceiptIssued(bytes32 indexed transactionId, uint256 indexed receiptId);

    function createTransaction(
        bytes32 transactionId,
        address seller,
        address tokenAddress,
        uint256 amount,
        uint64 fulfillmentDeadline,
        bytes32 termsHash
    ) external payable;

    function createTransactionWithVerifier(
        bytes32 transactionId,
        address seller,
        address verifier,
        address tokenAddress,
        uint256 amount,
        uint64 fulfillmentDeadline,
        bytes32 termsHash
    ) external payable;

    function agreeTransaction(bytes32 transactionId) external;

    function fundEscrow(bytes32 transactionId) external payable;

    function startWork(bytes32 transactionId) external;

    function anchorEvidence(
        bytes32 transactionId,
        bytes32 contentHash,
        bytes32 storageUriHash,
        bool isEncrypted
    ) external;

    function anchorEvidence(
        bytes32 transactionId,
        bytes32 contentHash,
        bytes32 metadataHash,
        bytes32 storageUriHash,
        bool isEncrypted
    ) external;

    function requestVerification(bytes32 transactionId) external;

    function submitVerification(
        bytes32 transactionId,
        VerificationOutcome outcome,
        bytes32 reportHash
    ) external;

    function releaseEscrow(bytes32 transactionId) external;

    function refundTransaction(bytes32 transactionId) external;

    function openDispute(bytes32 transactionId) external payable;

    function resolveDispute(bytes32 transactionId, uint16 buyerShareBps) external;

    function setDisputeResolver(address newResolver) external;

    function getTransaction(bytes32 transactionId) external view returns (TransactionRecord memory);

    function getTransactionState(bytes32 transactionId) external view returns (TransactionState);
}
