// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./interfaces/ITrustReceiptRegistry.sol";

/**
 * @title TrustReceiptRegistry
 * @author TrustMesh Core Architecture Team
 * @notice Verifiable, non-transferable (Soulbound) registry for Trust Receipts.
 *         Issued exclusively upon terminal transaction settlement or dispute resolution.
 *
 * CRITICAL INVARIANTS:
 * 1. Zero Financial Authority: Registry holds no funds and can never receive, hold, or disburse tokens.
 * 2. Immutable Payees & Amounts: Receipt records historic settlement facts; it cannot create or alter settlements.
 * 3. Exactly-One Per Transaction: Exactly one receipt corresponds to a terminal settlement.
 * 4. Strictly Gated Issuance: Callable strictly by the authorized TrustMeshEscrow contract.
 * 5. Non-Transferable: Cannot be transferred, sold, or reassigned between addresses.
 */
contract TrustReceiptRegistry is ITrustReceiptRegistry {
    // -------------------------------------------------------------------------
    // Storage
    // -------------------------------------------------------------------------

    /// @notice Authorized escrow contract permitted to issue receipts
    address public immutable escrowContract;

    /// @notice Contract deployer reference
    address public immutable owner;

    /// @notice Monotonically incrementing receipt ID counter (starts at 1)
    uint256 public nextReceiptId = 1;

    /// @notice Mapping from receiptId to TrustReceiptData
    mapping(uint256 => TrustReceiptData) private _receipts;

    /// @notice Mapping from transactionId to receiptId
    mapping(bytes32 => uint256) private _transactionToReceiptId;

    /// @notice Flag tracking whether a receipt has been minted for a transactionId
    mapping(bytes32 => bool) private _hasReceipt;

    // -------------------------------------------------------------------------
    // Custom Errors
    // -------------------------------------------------------------------------

    error UnauthorizedCaller(address caller);
    error ReceiptAlreadyIssued(bytes32 transactionId);
    error ReceiptNotFound(uint256 receiptId);
    error ReceiptNotFoundForTx(bytes32 transactionId);
    error InvalidAddress();
    error CannotReceiveFunds();
    error SoulboundTokenNonTransferable();

    // -------------------------------------------------------------------------
    // Modifiers
    // -------------------------------------------------------------------------

    modifier onlyEscrow() {
        if (msg.sender != escrowContract) {
            revert UnauthorizedCaller(msg.sender);
        }
        _;
    }

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(address _escrowContract) {
        if (_escrowContract == address(0)) revert InvalidAddress();
        escrowContract = _escrowContract;
        owner = msg.sender;
    }

    // -------------------------------------------------------------------------
    // External Functions: Issuance
    // -------------------------------------------------------------------------

    /**
     * @notice Issue a verifiable Soulbound Trust Receipt upon terminal settlement
     * @dev Strictly callable by the authorized escrow contract
     */
    function issueReceipt(
        bytes32 transactionId,
        address partyA,
        address partyB,
        uint256 settledAmount,
        address tokenAddress,
        TransactionState outcome,
        bytes32 termsSummaryHash,
        bytes32 evidenceRoot
    ) external override onlyEscrow returns (uint256 receiptId) {
        if (transactionId == bytes32(0)) revert InvalidAddress();
        if (_hasReceipt[transactionId]) revert ReceiptAlreadyIssued(transactionId);

        receiptId = nextReceiptId++;
        _hasReceipt[transactionId] = true;
        _transactionToReceiptId[transactionId] = receiptId;

        _receipts[receiptId] = TrustReceiptData({
            transactionId: transactionId,
            partyA: partyA,
            partyB: partyB,
            settledAmount: settledAmount,
            tokenAddress: tokenAddress,
            outcome: outcome,
            termsSummaryHash: termsSummaryHash,
            evidenceRoot: evidenceRoot,
            issuedAt: uint64(block.timestamp)
        });

        emit TrustReceiptIssued(receiptId, transactionId, partyA, partyB, outcome);
    }

    // -------------------------------------------------------------------------
    // External Functions: Queries
    // -------------------------------------------------------------------------

    function getReceipt(uint256 receiptId) external view override returns (TrustReceiptData memory) {
        if (receiptId == 0 || receiptId >= nextReceiptId) {
            revert ReceiptNotFound(receiptId);
        }
        return _receipts[receiptId];
    }

    function getReceiptByTransaction(bytes32 transactionId) external view override returns (TrustReceiptData memory) {
        uint256 receiptId = _transactionToReceiptId[transactionId];
        if (receiptId == 0) {
            revert ReceiptNotFoundForTx(transactionId);
        }
        return _receipts[receiptId];
    }

    function receiptExists(bytes32 transactionId) external view override returns (bool) {
        return _hasReceipt[transactionId];
    }

    function totalReceipts() external view returns (uint256) {
        return nextReceiptId - 1;
    }

    // -------------------------------------------------------------------------
    // Security: Reject Native Funds
    // -------------------------------------------------------------------------

    receive() external payable {
        revert CannotReceiveFunds();
    }

    fallback() external payable {
        revert CannotReceiveFunds();
    }
}
