// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../src/interfaces/ITrustMeshTypes.sol";

/**
 * @notice Sanity test validating that the 14 deterministic transaction states match expected enum indices
 */
contract TrustMeshTypesTest is ITrustMeshTypes {
    function testStateEnumIndices() public pure {
        require(uint256(TransactionState.DRAFT) == 0, "DRAFT != 0");
        require(uint256(TransactionState.PROPOSED) == 1, "PROPOSED != 1");
        require(uint256(TransactionState.NEGOTIATING) == 2, "NEGOTIATING != 2");
        require(uint256(TransactionState.AGREED) == 3, "AGREED != 3");
        require(uint256(TransactionState.FUNDED) == 4, "FUNDED != 4");
        require(uint256(TransactionState.IN_PROGRESS) == 5, "IN_PROGRESS != 5");
        require(uint256(TransactionState.EVIDENCE_SUBMITTED) == 6, "EVIDENCE_SUBMITTED != 6");
        require(uint256(TransactionState.VERIFICATION) == 7, "VERIFICATION != 7");
        require(uint256(TransactionState.DISPUTED) == 8, "DISPUTED != 8");
        require(uint256(TransactionState.JUDGING) == 9, "JUDGING != 9");
        require(uint256(TransactionState.RESOLVED) == 10, "RESOLVED != 10");
        require(uint256(TransactionState.SETTLED) == 11, "SETTLED != 11");
        require(uint256(TransactionState.REFUNDED) == 12, "REFUNDED != 12");
        require(uint256(TransactionState.CANCELLED) == 13, "CANCELLED != 13");
    }
}
