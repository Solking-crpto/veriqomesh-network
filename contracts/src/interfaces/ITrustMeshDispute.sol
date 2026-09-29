// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./ITrustMeshTypes.sol";

/**
 * @title ITrustMeshDispute
 * @notice Interface for human judge network adjudication, juror staking, and binding resolution.
 *
 * ARCHITECTURAL RULE: Contested financial outcomes must be resolved via human judge voting,
 * never by autonomous AI models.
 */
interface ITrustMeshDispute is ITrustMeshTypes {
    event DisputeOpened(bytes32 indexed disputeId, bytes32 indexed transactionId, address indexed initiator);
    event JudgeAssigned(bytes32 indexed disputeId, address indexed judge);
    event JudgeVoteCast(bytes32 indexed disputeId, address indexed judge, uint16 buyerShareBps);
    event DisputeResolved(bytes32 indexed disputeId, uint16 finalBuyerShareBps);

    function openDispute(bytes32 transactionId) external payable returns (bytes32 disputeId);

    function castJudgeVote(bytes32 disputeId, uint16 buyerShareBps, bytes32 rationaleHash) external;

    function finalizeVerdict(bytes32 disputeId) external;

    function getDispute(bytes32 disputeId) external view returns (DisputeRecord memory);
}
