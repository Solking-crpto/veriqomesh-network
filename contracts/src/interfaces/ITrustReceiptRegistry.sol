// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./ITrustMeshTypes.sol";

/**
 * @title ITrustReceiptRegistry
 * @notice Interface for issuing portable, verifiable Soulbound Trust Receipts.
 */
interface ITrustReceiptRegistry is ITrustMeshTypes {
    event TrustReceiptIssued(
        uint256 indexed receiptId,
        bytes32 indexed transactionId,
        address indexed partyA,
        address partyB,
        TransactionState outcome
    );

    struct TrustReceiptData {
        bytes32 transactionId;
        address partyA;
        address partyB;
        uint256 settledAmount;
        address tokenAddress;
        TransactionState outcome;
        bytes32 termsSummaryHash;
        bytes32 evidenceRoot;
        uint64 issuedAt;
    }

    function issueReceipt(
        bytes32 transactionId,
        address partyA,
        address partyB,
        uint256 settledAmount,
        address tokenAddress,
        TransactionState outcome,
        bytes32 termsSummaryHash,
        bytes32 evidenceRoot
    ) external returns (uint256 receiptId);

    function getReceipt(uint256 receiptId) external view returns (TrustReceiptData memory);
    function getReceiptByTransaction(bytes32 transactionId) external view returns (TrustReceiptData memory);
    function receiptExists(bytes32 transactionId) external view returns (bool);
}
