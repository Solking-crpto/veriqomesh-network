// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title ITrustMeshTypes
 * @notice Central data types and deterministic state machine enums for the TrustMesh Protocol.
 */
interface ITrustMeshTypes {
    /**
     * @notice Deterministic 14-state machine lifecycle
     */
    enum TransactionState {
        DRAFT,
        PROPOSED,
        NEGOTIATING,
        AGREED,
        FUNDED,
        IN_PROGRESS,
        EVIDENCE_SUBMITTED,
        VERIFICATION,
        DISPUTED,
        JUDGING,
        RESOLVED,
        SETTLED,
        REFUNDED,
        CANCELLED
    }

    /**
     * @notice Outcome of independent verification attestation
     */
    enum VerificationOutcome {
        NONE,
        PASS,
        FAIL,
        INCONCLUSIVE
    }

    /**
     * @notice Verification status taxonomy for offchain evidence
     * INVARIANT: AI_ANALYZED != VERIFIED
     */
    enum EvidenceVerificationStatus {
        SELF_REPORTED,
        ATTESTED,
        AI_ANALYZED,
        VERIFIED,
        DISPUTED,
        REVOKED
    }

    /**
     * @notice Role of participants in a TrustMesh agreement
     */
    enum ParticipantRole {
        BUYER,
        SELLER,
        VERIFIER,
        JUDGE,
        AUDITOR
    }

    /**
     * @notice Anchored offchain evidence commitment
     * INVARIANT: contentHash is the identity of the evidence bytes, independent of storageUri
     */
    struct EvidenceAnchor {
        bytes32 contentHash;      // Cryptographic hash (sha256/keccak256) of raw evidence bytes
        bytes32 metadataHash;     // Cryptographic hash of canonicalized metadata
        bytes32 storageUriHash;   // Hash of storage URI pointer (retrieval location only)
        address submitter;        // Party submitting the evidence (buyer, seller, or verifier)
        uint64 timestamp;         // Submission block timestamp
        bool isEncrypted;         // Flag indicating whether payload requires private decryption key
        EvidenceVerificationStatus status; // Attestation status of this evidence
    }

    /**
     * @notice Core onchain record of a custom transaction
     */
    struct TransactionRecord {
        bytes32 transactionId;      // Unique transaction identifier
        address buyer;              // Creator / Buyer / Service Requester
        address seller;             // Counterparty / Provider
        address verifier;           // Designated independent verifier (optional, address(0) if none)
        address tokenAddress;       // Escrow token (address(0) for native MON)
        uint256 totalAmount;        // Total escrow amount locked in wei
        TransactionState state;     // Current deterministic state
        VerificationOutcome verificationOutcome; // Outcome submitted by designated verifier
        uint64 agreementDeadline;   // Epoch timestamp deadline for agreement
        uint64 fulfillmentDeadline; // Epoch timestamp deadline for work completion
        uint64 disputeDeadline;     // Epoch timestamp deadline for raising a dispute
        bytes32 termsHash;          // Hash of negotiated offchain terms
        bytes32 evidenceRoot;       // Latest anchored evidence content hash
        uint64 createdAt;           // Creation timestamp
        uint64 fundedAt;            // Escrow funding timestamp
        uint64 settledAt;           // Settlement or refund timestamp
    }

    /**
     * @notice Onchain record of an adjudicated dispute
     */
    struct DisputeRecord {
        bytes32 disputeId;
        bytes32 transactionId;
        address initiator;
        address respondent;
        uint256 disputeBond;        // Bond deposited to prevent frivolous disputes
        uint64 adjudicationDeadline;
        uint8 judgeQuorum;          // Minimum required human judge votes
        bool isResolved;
        uint16 settlementRatioBps;  // Basis points (0-10000) awarded to buyer
    }
}
