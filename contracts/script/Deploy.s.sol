// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../src/TrustMeshEscrow.sol";
import "../src/TrustReceiptRegistry.sol";

/**
 * @title DeployScript
 * @notice Deployment script for TrustMesh protocol on Monad Metropolis / local EVM
 */
contract DeployScript {
    function run(address disputeResolver) external returns (address escrowAddr, address registryAddr) {
        // Deploy Escrow first with address(0) for receipt registry
        TrustMeshEscrow escrow = new TrustMeshEscrow(disputeResolver, address(0));
        escrowAddr = address(escrow);

        // Deploy Soulbound TrustReceiptRegistry linked to escrow
        TrustReceiptRegistry registry = new TrustReceiptRegistry(escrowAddr);
        registryAddr = address(registry);

        // Wire registry into escrow
        escrow.setReceiptRegistry(registryAddr);
    }
}
