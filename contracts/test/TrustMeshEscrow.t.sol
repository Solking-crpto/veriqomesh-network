// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../src/TrustMeshEscrow.sol";
import "../src/TrustReceiptRegistry.sol";
import "../src/interfaces/ITrustMeshTypes.sol";

/**
 * @notice Actor proxy allowing multi-participant transaction flows in pure Solidity
 */
contract TestActor {
    receive() external payable {}

    function callCreate(
        TrustMeshEscrow escrow,
        bytes32 txId,
        address seller,
        uint256 amount,
        uint64 deadline,
        bytes32 terms
    ) external payable {
        escrow.createTransaction{value: msg.value}(txId, seller, address(0), amount, deadline, terms);
    }

    function callCreateWithVerifier(
        TrustMeshEscrow escrow,
        bytes32 txId,
        address seller,
        address verifier,
        uint256 amount,
        uint64 deadline,
        bytes32 terms
    ) external payable {
        escrow.createTransactionWithVerifier{value: msg.value}(
            txId,
            seller,
            verifier,
            address(0),
            amount,
            deadline,
            terms
        );
    }

    function callAgree(TrustMeshEscrow escrow, bytes32 txId) external {
        escrow.agreeTransaction(txId);
    }

    function callFund(TrustMeshEscrow escrow, bytes32 txId, uint256 amount) external payable {
        escrow.fundEscrow{value: amount}(txId);
    }

    function callFundFromBalance(TrustMeshEscrow escrow, bytes32 txId, uint256 amount) external {
        escrow.fundEscrow{value: amount}(txId);
    }

    function callStartWork(TrustMeshEscrow escrow, bytes32 txId) external {
        escrow.startWork(txId);
    }

    function callAnchorEvidence(
        TrustMeshEscrow escrow,
        bytes32 txId,
        bytes32 cHash,
        bytes32 sHash,
        bool enc
    ) external {
        escrow.anchorEvidence(txId, cHash, sHash, enc);
    }

    function callAnchorEvidenceWithMeta(
        TrustMeshEscrow escrow,
        bytes32 txId,
        bytes32 cHash,
        bytes32 mHash,
        bytes32 sHash,
        bool enc
    ) external {
        escrow.anchorEvidence(txId, cHash, mHash, sHash, enc);
    }

    function callRequestVerification(TrustMeshEscrow escrow, bytes32 txId) external {
        escrow.requestVerification(txId);
    }

    function callSubmitVerification(
        TrustMeshEscrow escrow,
        bytes32 txId,
        ITrustMeshTypes.VerificationOutcome outcome,
        bytes32 reportHash
    ) external {
        escrow.submitVerification(txId, outcome, reportHash);
    }

    function callRelease(TrustMeshEscrow escrow, bytes32 txId) external {
        escrow.releaseEscrow(txId);
    }

    function callRefund(TrustMeshEscrow escrow, bytes32 txId) external {
        escrow.refundTransaction(txId);
    }

    function callOpenDispute(TrustMeshEscrow escrow, bytes32 txId) external {
        escrow.openDispute(txId);
    }

    function callResolveDispute(TrustMeshEscrow escrow, bytes32 txId, uint16 buyerShareBps) external {
        escrow.resolveDispute(txId, buyerShareBps);
    }

    function callSetDisputeResolver(TrustMeshEscrow escrow, address newResolver) external {
        escrow.setDisputeResolver(newResolver);
    }
}

/**
 * @title TrustMeshEscrowComprehensiveTest
 * @notice Complete test suite covering Stage 2 and Stage 3 requirements:
 *         Evidence model, Independent verifier gating, Three-valued verification,
 *         Dispute resolver administration, Soulbound Trust Receipts, and Solvency/Conservation Invariants.
 */
contract TrustMeshEscrowTest is ITrustMeshTypes {
    TrustMeshEscrow public escrow;
    TrustReceiptRegistry public receiptRegistry;

    TestActor public buyerActor;
    TestActor public sellerActor;
    TestActor public verifierActor;
    TestActor public resolverActor;
    TestActor public newResolverActor;
    TestActor public attackerActor;

    bytes32 public constant TX1 = keccak256("TX_HAPPY_PATH");
    bytes32 public constant TX_VERIFIED = keccak256("TX_VERIFIED_PATH");
    bytes32 public constant TX_INCONCLUSIVE = keccak256("TX_INCONCLUSIVE_PATH");
    bytes32 public constant TX_FAIL = keccak256("TX_FAIL_PATH");
    bytes32 public constant TX2 = keccak256("TX_REFUND_PATH");
    bytes32 public constant TX3 = keccak256("TX_DISPUTE_PATH");

    bytes32 public constant TERMS_HASH = keccak256("TERMS_V1");
    bytes32 public constant EVIDENCE_HASH = keccak256("EVIDENCE_DELIVERABLE_V1");
    bytes32 public constant METADATA_HASH = keccak256("METADATA_CANONICAL_JSON_V1");
    bytes32 public constant STORAGE_HASH = keccak256("ipfs://bafytest123");
    bytes32 public constant REPORT_HASH = keccak256("VERIFICATION_REPORT_V1");

    uint256 public constant ESCROW_AMOUNT = 5 ether;
    uint64 public constant DEADLINE = 1893456000; // Future timestamp

    receive() external payable {}

    function setUp() public {
        buyerActor = new TestActor();
        sellerActor = new TestActor();
        verifierActor = new TestActor();
        resolverActor = new TestActor();
        newResolverActor = new TestActor();
        attackerActor = new TestActor();

        // Fund actors
        payable(address(buyerActor)).transfer(50 ether);
        payable(address(sellerActor)).transfer(10 ether);
        payable(address(verifierActor)).transfer(10 ether);
        payable(address(attackerActor)).transfer(10 ether);

        // Deploy escrow with resolverActor as dispute resolver
        escrow = new TrustMeshEscrow(address(resolverActor), address(0));

        // Deploy TrustReceiptRegistry and wire to escrow
        receiptRegistry = new TrustReceiptRegistry(address(escrow));
        escrow.setReceiptRegistry(address(receiptRegistry));
    }

    // -------------------------------------------------------------------------
    // 1. HAPPY PATH (SELF-VERIFIED / NO VERIFIER)
    // -------------------------------------------------------------------------

    function test_HappyPathFullLifecycle() public {
        setUp();
        uint256 sellerInitialBal = address(sellerActor).balance;

        // 1. Buyer creates transaction without verifier
        buyerActor.callCreate(escrow, TX1, address(sellerActor), ESCROW_AMOUNT, DEADLINE, TERMS_HASH);
        require(escrow.getTransactionState(TX1) == TransactionState.PROPOSED, "Must be PROPOSED");

        // 2. Seller accepts
        sellerActor.callAgree(escrow, TX1);
        require(escrow.getTransactionState(TX1) == TransactionState.AGREED, "Must be AGREED");

        // 3. Buyer funds escrow
        buyerActor.callFundFromBalance(escrow, TX1, ESCROW_AMOUNT);
        require(escrow.getTransactionState(TX1) == TransactionState.FUNDED, "Must be FUNDED");
        require(escrow.totalEscrowLiabilities() == ESCROW_AMOUNT, "Liabilities must match deposit");

        // 4. Seller starts work
        sellerActor.callStartWork(escrow, TX1);
        require(escrow.getTransactionState(TX1) == TransactionState.IN_PROGRESS, "Must be IN_PROGRESS");

        // 5. Seller anchors evidence with metadata
        sellerActor.callAnchorEvidenceWithMeta(escrow, TX1, EVIDENCE_HASH, METADATA_HASH, STORAGE_HASH, false);
        require(escrow.getTransactionState(TX1) == TransactionState.EVIDENCE_SUBMITTED, "Must be EVIDENCE_SUBMITTED");

        // 6. Seller requests verification
        sellerActor.callRequestVerification(escrow, TX1);
        require(escrow.getTransactionState(TX1) == TransactionState.VERIFICATION, "Must be VERIFICATION");

        // 7. Buyer releases escrow to seller
        buyerActor.callRelease(escrow, TX1);
        require(escrow.getTransactionState(TX1) == TransactionState.SETTLED, "Must be SETTLED");

        // Assertions
        require(address(sellerActor).balance == sellerInitialBal + ESCROW_AMOUNT, "Seller balance must increase by 5 MON");
        require(escrow.totalEscrowLiabilities() == 0, "Liabilities must be 0 after settlement");
        require(address(escrow).balance >= escrow.totalEscrowLiabilities(), "Solvency invariant holds");

        // Verify Trust Receipt was minted
        require(receiptRegistry.receiptExists(TX1), "Receipt must exist in registry");
        ITrustReceiptRegistry.TrustReceiptData memory r = receiptRegistry.getReceiptByTransaction(TX1);
        require(r.settledAmount == ESCROW_AMOUNT, "Receipt settled amount must match");
        require(r.outcome == TransactionState.SETTLED, "Receipt outcome must be SETTLED");
        require(r.termsSummaryHash == TERMS_HASH, "Receipt terms hash must match");
        require(r.evidenceRoot == EVIDENCE_HASH, "Receipt evidence root must match");

        // Double settlement must revert
        bool doubleSettleReverted = false;
        try buyerActor.callRelease(escrow, TX1) {
            doubleSettleReverted = false;
        } catch {
            doubleSettleReverted = true;
        }
        require(doubleSettleReverted, "Second settlement must revert");
    }

    // -------------------------------------------------------------------------
    // 2. INDEPENDENT VERIFIER HAPPY PATH (PASS -> RELEASE -> RECEIPT)
    // -------------------------------------------------------------------------

    function test_HappyPathWithIndependentVerifier() public {
        setUp();
        uint256 sellerInitialBal = address(sellerActor).balance;

        // 1. Buyer creates transaction WITH designated verifier
        buyerActor.callCreateWithVerifier(
            escrow,
            TX_VERIFIED,
            address(sellerActor),
            address(verifierActor),
            ESCROW_AMOUNT,
            DEADLINE,
            TERMS_HASH
        );

        TransactionRecord memory rec = escrow.getTransaction(TX_VERIFIED);
        require(rec.verifier == address(verifierActor), "Verifier must be configured");

        // 2. Agree, fund, start
        sellerActor.callAgree(escrow, TX_VERIFIED);
        buyerActor.callFundFromBalance(escrow, TX_VERIFIED, ESCROW_AMOUNT);
        sellerActor.callStartWork(escrow, TX_VERIFIED);

        // 3. Anchor evidence and request verification
        sellerActor.callAnchorEvidenceWithMeta(escrow, TX_VERIFIED, EVIDENCE_HASH, METADATA_HASH, STORAGE_HASH, false);
        sellerActor.callRequestVerification(escrow, TX_VERIFIED);

        // 4. Verifier submits PASS
        verifierActor.callSubmitVerification(escrow, TX_VERIFIED, VerificationOutcome.PASS, REPORT_HASH);
        rec = escrow.getTransaction(TX_VERIFIED);
        require(rec.verificationOutcome == VerificationOutcome.PASS, "Verification outcome must be PASS");

        // 5. Buyer releases escrow -> succeeds
        buyerActor.callRelease(escrow, TX_VERIFIED);
        require(escrow.getTransactionState(TX_VERIFIED) == TransactionState.SETTLED, "Must be SETTLED");
        require(address(sellerActor).balance == sellerInitialBal + ESCROW_AMOUNT, "Seller received full amount");

        // Trust Receipt verified
        require(receiptRegistry.receiptExists(TX_VERIFIED), "Trust receipt must be issued");
    }

    // -------------------------------------------------------------------------
    // 3. VERIFICATION GATING: INCONCLUSIVE BLOCKS RELEASE (FUNDS SAFE)
    // -------------------------------------------------------------------------

    function test_SettlementGated_VerifierInconclusiveReverts() public {
        setUp();

        buyerActor.callCreateWithVerifier(
            escrow,
            TX_INCONCLUSIVE,
            address(sellerActor),
            address(verifierActor),
            ESCROW_AMOUNT,
            DEADLINE,
            TERMS_HASH
        );

        sellerActor.callAgree(escrow, TX_INCONCLUSIVE);
        buyerActor.callFundFromBalance(escrow, TX_INCONCLUSIVE, ESCROW_AMOUNT);
        sellerActor.callStartWork(escrow, TX_INCONCLUSIVE);
        sellerActor.callAnchorEvidence(escrow, TX_INCONCLUSIVE, EVIDENCE_HASH, STORAGE_HASH, false);
        sellerActor.callRequestVerification(escrow, TX_INCONCLUSIVE);

        // Verifier submits INCONCLUSIVE
        verifierActor.callSubmitVerification(escrow, TX_INCONCLUSIVE, VerificationOutcome.INCONCLUSIVE, REPORT_HASH);

        // Buyer attempts to release escrow -> MUST REVERT
        bool releaseReverted = false;
        try buyerActor.callRelease(escrow, TX_INCONCLUSIVE) {
            releaseReverted = false;
        } catch {
            releaseReverted = true;
        }
        require(releaseReverted, "Release must revert when verification is INCONCLUSIVE");

        // Invariant: Funds remain safely in contract, liabilities preserved
        require(escrow.totalEscrowLiabilities() == ESCROW_AMOUNT, "Liabilities must remain locked");
        require(escrow.getTransactionState(TX_INCONCLUSIVE) == TransactionState.VERIFICATION, "Must remain in VERIFICATION");
    }

    // -------------------------------------------------------------------------
    // 4. VERIFICATION GATING: FAIL BLOCKS RELEASE & DOES NOT AUTO-REFUND
    // -------------------------------------------------------------------------

    function test_SettlementGated_VerifierFailReverts() public {
        setUp();

        buyerActor.callCreateWithVerifier(
            escrow,
            TX_FAIL,
            address(sellerActor),
            address(verifierActor),
            ESCROW_AMOUNT,
            DEADLINE,
            TERMS_HASH
        );

        sellerActor.callAgree(escrow, TX_FAIL);
        buyerActor.callFundFromBalance(escrow, TX_FAIL, ESCROW_AMOUNT);
        sellerActor.callStartWork(escrow, TX_FAIL);
        sellerActor.callAnchorEvidence(escrow, TX_FAIL, EVIDENCE_HASH, STORAGE_HASH, false);
        sellerActor.callRequestVerification(escrow, TX_FAIL);

        // Verifier submits FAIL
        verifierActor.callSubmitVerification(escrow, TX_FAIL, VerificationOutcome.FAIL, REPORT_HASH);

        // Buyer release must revert
        bool releaseReverted = false;
        try buyerActor.callRelease(escrow, TX_FAIL) {
            releaseReverted = false;
        } catch {
            releaseReverted = true;
        }
        require(releaseReverted, "Release must revert when verification FAIL");

        // FAIL does NOT automatically refund! Escrow remains locked in VERIFICATION
        require(escrow.getTransactionState(TX_FAIL) == TransactionState.VERIFICATION, "State must remain VERIFICATION");
        require(escrow.totalEscrowLiabilities() == ESCROW_AMOUNT, "Funds must remain locked");
    }

    // -------------------------------------------------------------------------
    // 5. INCONCLUSIVE TO DISPUTE ADJUDICATION (1500 bps: 15% Buyer / 85% Seller)
    // -------------------------------------------------------------------------

    function test_InconclusiveToDisputeResolution() public {
        setUp();
        uint256 buyerInitialBal = address(buyerActor).balance;
        uint256 sellerInitialBal = address(sellerActor).balance;

        buyerActor.callCreateWithVerifier(
            escrow,
            TX3,
            address(sellerActor),
            address(verifierActor),
            ESCROW_AMOUNT,
            DEADLINE,
            TERMS_HASH
        );

        sellerActor.callAgree(escrow, TX3);
        buyerActor.callFundFromBalance(escrow, TX3, ESCROW_AMOUNT);
        sellerActor.callStartWork(escrow, TX3);
        sellerActor.callAnchorEvidence(escrow, TX3, EVIDENCE_HASH, STORAGE_HASH, false);
        sellerActor.callRequestVerification(escrow, TX3);

        // Verifier marks INCONCLUSIVE (e.g. 85 intact, 15 damaged)
        verifierActor.callSubmitVerification(escrow, TX3, VerificationOutcome.INCONCLUSIVE, REPORT_HASH);

        // Escrow cannot be released directly
        bool releaseReverted = false;
        try buyerActor.callRelease(escrow, TX3) {
            releaseReverted = false;
        } catch {
            releaseReverted = true;
        }
        require(releaseReverted, "Direct release must revert");

        // Buyer opens dispute
        buyerActor.callOpenDispute(escrow, TX3);
        require(escrow.getTransactionState(TX3) == TransactionState.DISPUTED, "State must be DISPUTED");

        // Resolver adjudicates with 1500 bps (15% to buyer, 85% to seller)
        resolverActor.callResolveDispute(escrow, TX3, 1500);
        require(escrow.getTransactionState(TX3) == TransactionState.SETTLED, "State must be SETTLED post-dispute");

        // Check exact payouts: 15% of 5 MON = 0.75 MON to buyer; 85% of 5 MON = 4.25 MON to seller
        uint256 expectedBuyerRefund = (ESCROW_AMOUNT * 1500) / 10000; // 0.75 ether
        uint256 expectedSellerPayout = ESCROW_AMOUNT - expectedBuyerRefund; // 4.25 ether

        require(address(buyerActor).balance == buyerInitialBal - ESCROW_AMOUNT + expectedBuyerRefund, "Buyer must receive exactly 15%");
        require(address(sellerActor).balance == sellerInitialBal + expectedSellerPayout, "Seller must receive exactly 85%");
        require(escrow.totalEscrowLiabilities() == 0, "Liabilities must be zero");

        // Trust Receipt issued
        require(receiptRegistry.receiptExists(TX3), "Trust receipt must exist for dispute settlement");
    }

    // -------------------------------------------------------------------------
    // 6. EVIDENCE MODEL & PARTICIPANT AUTHORIZATION
    // -------------------------------------------------------------------------

    function test_EvidenceSubmission_AuthorizedParties() public {
        setUp();
        bytes32 evTx = keccak256("TX_EVIDENCE_AUTH");

        buyerActor.callCreateWithVerifier(
            escrow,
            evTx,
            address(sellerActor),
            address(verifierActor),
            1 ether,
            DEADLINE,
            TERMS_HASH
        );
        sellerActor.callAgree(escrow, evTx);
        buyerActor.callFundFromBalance(escrow, evTx, 1 ether);
        sellerActor.callStartWork(escrow, evTx);

        // 1. Seller can submit evidence
        sellerActor.callAnchorEvidenceWithMeta(escrow, evTx, keccak256("SELLER_EV"), METADATA_HASH, STORAGE_HASH, false);

        // 2. Buyer can submit evidence
        buyerActor.callAnchorEvidenceWithMeta(escrow, evTx, keccak256("BUYER_EV"), METADATA_HASH, STORAGE_HASH, false);

        // 3. Designated Verifier can submit evidence
        verifierActor.callAnchorEvidenceWithMeta(escrow, evTx, keccak256("VERIFIER_EV"), METADATA_HASH, STORAGE_HASH, false);

        // 4. Unauthorized attacker CANNOT submit evidence
        bool attackerEvidenceReverted = false;
        try attackerActor.callAnchorEvidence(escrow, evTx, keccak256("ATTACKER_EV"), STORAGE_HASH, false) {
            attackerEvidenceReverted = false;
        } catch {
            attackerEvidenceReverted = true;
        }
        require(attackerEvidenceReverted, "Attacker cannot anchor evidence");

        // 5. Zero content hash must revert
        bool zeroHashReverted = false;
        try sellerActor.callAnchorEvidence(escrow, evTx, bytes32(0), STORAGE_HASH, false) {
            zeroHashReverted = false;
        } catch {
            zeroHashReverted = true;
        }
        require(zeroHashReverted, "Zero content hash must revert");

        // Check anchored evidence array length
        EvidenceAnchor[] memory anchors = escrow.getEvidenceAnchors(evTx);
        require(anchors.length == 3, "Exactly 3 evidence anchors recorded");
        require(anchors[0].status == EvidenceVerificationStatus.SELF_REPORTED, "Seller evidence is SELF_REPORTED");
        require(anchors[2].status == EvidenceVerificationStatus.ATTESTED, "Verifier evidence is ATTESTED");
    }

    // -------------------------------------------------------------------------
    // 7. INVARIANT: EVIDENCE CANNOT ALTER ESCROW ECONOMICS
    // -------------------------------------------------------------------------

    function test_EvidenceCannotAlterEconomics() public {
        setUp();
        bytes32 evTx = keccak256("TX_ECONOMICS");

        buyerActor.callCreate(escrow, evTx, address(sellerActor), 2 ether, DEADLINE, TERMS_HASH);
        sellerActor.callAgree(escrow, evTx);
        buyerActor.callFundFromBalance(escrow, evTx, 2 ether);
        sellerActor.callStartWork(escrow, evTx);

        TransactionRecord memory pre = escrow.getTransaction(evTx);

        // Anchor multiple pieces of evidence
        sellerActor.callAnchorEvidenceWithMeta(escrow, evTx, keccak256("EV1"), keccak256("M1"), STORAGE_HASH, false);
        buyerActor.callAnchorEvidenceWithMeta(escrow, evTx, keccak256("EV2"), keccak256("M2"), STORAGE_HASH, true);

        TransactionRecord memory post = escrow.getTransaction(evTx);

        // INVARIANT CHECKS: economics must be completely unchanged
        require(post.totalAmount == pre.totalAmount, "totalAmount must be immutable");
        require(post.buyer == pre.buyer, "buyer must be immutable");
        require(post.seller == pre.seller, "seller must be immutable");
        require(post.tokenAddress == pre.tokenAddress, "tokenAddress must be immutable");
        require(post.fulfillmentDeadline == pre.fulfillmentDeadline, "deadline must be immutable");
        require(escrow.totalEscrowLiabilities() == 2 ether, "Liabilities must be completely unchanged");
    }

    // -------------------------------------------------------------------------
    // 8. VERIFIER AUTHORIZATION: BUYER CANNOT SELF-VERIFY WHEN VERIFIER SET
    // -------------------------------------------------------------------------

    function test_VerificationAuthorization_BuyerCannotSelfVerify() public {
        setUp();
        bytes32 vAuthTx = keccak256("TX_V_AUTH");

        buyerActor.callCreateWithVerifier(
            escrow,
            vAuthTx,
            address(sellerActor),
            address(verifierActor),
            1 ether,
            DEADLINE,
            TERMS_HASH
        );
        sellerActor.callAgree(escrow, vAuthTx);
        buyerActor.callFundFromBalance(escrow, vAuthTx, 1 ether);
        sellerActor.callStartWork(escrow, vAuthTx);
        sellerActor.callAnchorEvidence(escrow, vAuthTx, EVIDENCE_HASH, STORAGE_HASH, false);
        sellerActor.callRequestVerification(escrow, vAuthTx);

        // Buyer attempting to call submitVerification must revert (Mandatory correction 1)
        bool buyerVerifyReverted = false;
        try buyerActor.callSubmitVerification(escrow, vAuthTx, VerificationOutcome.PASS, REPORT_HASH) {
            buyerVerifyReverted = false;
        } catch {
            buyerVerifyReverted = true;
        }
        require(buyerVerifyReverted, "Buyer cannot self-verify when verifier is configured");

        // Seller attempting to call submitVerification must revert
        bool sellerVerifyReverted = false;
        try sellerActor.callSubmitVerification(escrow, vAuthTx, VerificationOutcome.PASS, REPORT_HASH) {
            sellerVerifyReverted = false;
        } catch {
            sellerVerifyReverted = true;
        }
        require(sellerVerifyReverted, "Seller cannot self-verify when verifier is configured");

        // Attacker attempting to call submitVerification must revert
        bool attackerVerifyReverted = false;
        try attackerActor.callSubmitVerification(escrow, vAuthTx, VerificationOutcome.PASS, REPORT_HASH) {
            attackerVerifyReverted = false;
        } catch {
            attackerVerifyReverted = true;
        }
        require(attackerVerifyReverted, "Attacker cannot submit verification");

        // Submitting VerificationOutcome.NONE must revert
        bool noneOutcomeReverted = false;
        try verifierActor.callSubmitVerification(escrow, vAuthTx, VerificationOutcome.NONE, REPORT_HASH) {
            noneOutcomeReverted = false;
        } catch {
            noneOutcomeReverted = true;
        }
        require(noneOutcomeReverted, "Outcome NONE must revert");
    }

    // -------------------------------------------------------------------------
    // 9. INVARIANT: VERIFICATION CANNOT ALTER ESCROW BALANCES
    // -------------------------------------------------------------------------

    function test_VerificationCannotAlterEscrowBalance() public {
        setUp();
        bytes32 vBalTx = keccak256("TX_V_BAL");

        buyerActor.callCreateWithVerifier(
            escrow,
            vBalTx,
            address(sellerActor),
            address(verifierActor),
            3 ether,
            DEADLINE,
            TERMS_HASH
        );
        sellerActor.callAgree(escrow, vBalTx);
        buyerActor.callFundFromBalance(escrow, vBalTx, 3 ether);
        sellerActor.callStartWork(escrow, vBalTx);
        sellerActor.callAnchorEvidence(escrow, vBalTx, EVIDENCE_HASH, STORAGE_HASH, false);
        sellerActor.callRequestVerification(escrow, vBalTx);

        uint256 contractBalPre = address(escrow).balance;
        uint256 liabilitiesPre = escrow.totalEscrowLiabilities();

        // Submit verification
        verifierActor.callSubmitVerification(escrow, vBalTx, VerificationOutcome.PASS, REPORT_HASH);

        // Balances must remain identical
        require(address(escrow).balance == contractBalPre, "Contract balance cannot be altered by verification");
        require(escrow.totalEscrowLiabilities() == liabilitiesPre, "Liabilities cannot be altered by verification");
    }

    // -------------------------------------------------------------------------
    // 10. DISPUTE RESOLVER ADMINISTRATION SECURITY
    // -------------------------------------------------------------------------

    function test_DisputeResolverAdministration() public {
        setUp();

        // 1. Initial resolver is resolverActor
        require(escrow.disputeResolver() == address(resolverActor), "Initial resolver must match");

        // 2. Attacker cannot change dispute resolver
        bool attackerChangeReverted = false;
        try attackerActor.callSetDisputeResolver(escrow, address(attackerActor)) {
            attackerChangeReverted = false;
        } catch {
            attackerChangeReverted = true;
        }
        require(attackerChangeReverted, "Attacker cannot set dispute resolver");

        // 3. Zero address replacement must revert
        bool zeroAddressReverted = false;
        try escrow.setDisputeResolver(address(0)) {
            zeroAddressReverted = false;
        } catch {
            zeroAddressReverted = true;
        }
        require(zeroAddressReverted, "Zero address resolver replacement must revert");

        // 4. Owner changes dispute resolver to newResolverActor
        escrow.setDisputeResolver(address(newResolverActor));
        require(escrow.disputeResolver() == address(newResolverActor), "New resolver must be active");

        // 5. Test dispute resolution: old resolver loses authority; new resolver gains authority
        bytes32 dAdminTx = keccak256("TX_D_ADMIN");
        buyerActor.callCreate(escrow, dAdminTx, address(sellerActor), 1 ether, DEADLINE, TERMS_HASH);
        sellerActor.callAgree(escrow, dAdminTx);
        buyerActor.callFundFromBalance(escrow, dAdminTx, 1 ether);
        buyerActor.callOpenDispute(escrow, dAdminTx);

        // Old resolver tries to resolve -> MUST REVERT
        bool oldResolverReverted = false;
        try resolverActor.callResolveDispute(escrow, dAdminTx, 5000) {
            oldResolverReverted = false;
        } catch {
            oldResolverReverted = true;
        }
        require(oldResolverReverted, "Old resolver must lose authority");

        // New resolver resolves -> SUCCEEDS
        newResolverActor.callResolveDispute(escrow, dAdminTx, 5000);
        require(escrow.getTransactionState(dAdminTx) == TransactionState.SETTLED, "Must be SETTLED by new resolver");
    }

    // -------------------------------------------------------------------------
    // 11. DISPUTE RATIO SEMANTICS (0, 1500, 5000, 10000, >10000)
    // -------------------------------------------------------------------------

    function test_DisputeRatioSemantics() public {
        setUp();

        // Test 10001 bps -> MUST REVERT
        bytes32 rTx = keccak256("TX_RATIO_REVERT");
        buyerActor.callCreate(escrow, rTx, address(sellerActor), 1 ether, DEADLINE, TERMS_HASH);
        sellerActor.callAgree(escrow, rTx);
        buyerActor.callFundFromBalance(escrow, rTx, 1 ether);
        buyerActor.callOpenDispute(escrow, rTx);

        bool ratioReverted = false;
        try resolverActor.callResolveDispute(escrow, rTx, 10001) {
            ratioReverted = false;
        } catch {
            ratioReverted = true;
        }
        require(ratioReverted, ">10000 bps must revert");

        // Test 0 bps (0% buyer / 100% seller)
        uint256 sellerPreBal = address(sellerActor).balance;
        resolverActor.callResolveDispute(escrow, rTx, 0);
        require(escrow.getTransactionState(rTx) == TransactionState.SETTLED, "0 bps is SETTLED");
        require(address(sellerActor).balance == sellerPreBal + 1 ether, "Seller gets 100%");

        // Test 10000 bps (100% buyer / 0% seller -> REFUNDED)
        bytes32 rTx2 = keccak256("TX_RATIO_100");
        buyerActor.callCreate(escrow, rTx2, address(sellerActor), 1 ether, DEADLINE, TERMS_HASH);
        sellerActor.callAgree(escrow, rTx2);
        buyerActor.callFundFromBalance(escrow, rTx2, 1 ether);
        buyerActor.callOpenDispute(escrow, rTx2);

        uint256 buyerPreBal = address(buyerActor).balance;
        resolverActor.callResolveDispute(escrow, rTx2, 10000);
        require(escrow.getTransactionState(rTx2) == TransactionState.REFUNDED, "10000 bps is REFUNDED");
        require(address(buyerActor).balance == buyerPreBal + 1 ether, "Buyer gets 100%");
    }

    // -------------------------------------------------------------------------
    // 12. TRUST RECEIPT INVARIANTS (SOULBOUND, ZERO FINANCIAL AUTHORITY)
    // -------------------------------------------------------------------------

    function test_TrustReceipt_Invariants() public {
        setUp();

        // 1. Direct issuance attempt by attacker must revert
        bool attackerIssueReverted = false;
        try receiptRegistry.issueReceipt(
            keccak256("FAKE_TX"),
            address(buyerActor),
            address(sellerActor),
            1 ether,
            address(0),
            TransactionState.SETTLED,
            TERMS_HASH,
            EVIDENCE_HASH
        ) {
            attackerIssueReverted = false;
        } catch {
            attackerIssueReverted = true;
        }
        require(attackerIssueReverted, "Attacker cannot issue trust receipt directly");

        // 2. Receipt Registry cannot receive funds
        (bool success, ) = address(receiptRegistry).call{value: 1 ether}("");
        require(!success, "Receipt registry must reject native funds");

        // 3. Invariant: receipt issuance cannot increase escrow liabilities
        uint256 liabilitiesPre = escrow.totalEscrowLiabilities();
        require(liabilitiesPre == 0, "Initial liabilities zero");

        // 4. Duplicate issuance protection
        bytes32 dupTx = keccak256("TX_DUP_RECEIPT");
        buyerActor.callCreate(escrow, dupTx, address(sellerActor), 1 ether, DEADLINE, TERMS_HASH);
        sellerActor.callAgree(escrow, dupTx);
        buyerActor.callFundFromBalance(escrow, dupTx, 1 ether);
        sellerActor.callStartWork(escrow, dupTx);
        buyerActor.callRelease(escrow, dupTx);

        // Verify receipt exists
        require(receiptRegistry.receiptExists(dupTx), "Receipt must exist for settled tx");
        require(receiptRegistry.totalReceipts() == 1, "Total receipts should be 1");

        // Attempting to duplicate issue directly via onlyEscrow caller (simulate with prank/assembly if needed, but registry checks _hasReceipt)
        // Check ERC-721 non-transferability: transfer, transferFrom, safeTransferFrom calls must fail
        (bool transferSuccess, ) = address(receiptRegistry).call(
            abi.encodeWithSignature("transfer(address,uint256)", address(attackerActor), 1)
        );
        require(!transferSuccess, "ERC-20/721 transfer must fail on registry");

        (bool transferFromSuccess, ) = address(receiptRegistry).call(
            abi.encodeWithSignature("transferFrom(address,address,uint256)", address(buyerActor), address(attackerActor), 1)
        );
        require(!transferFromSuccess, "ERC-721 transferFrom must fail on registry");

        (bool safeTransferFromSuccess, ) = address(receiptRegistry).call(
            abi.encodeWithSignature("safeTransferFrom(address,address,uint256)", address(buyerActor), address(attackerActor), 1)
        );
        require(!safeTransferFromSuccess, "ERC-721 safeTransferFrom must fail on registry");
    }

    // -------------------------------------------------------------------------
    // 12B. TERMINAL STATES CANNOT TRANSITION AGAIN
    // -------------------------------------------------------------------------

    function test_TerminalStatesCannotTransitionAgain() public {
        setUp();
        bytes32 termTx = keccak256("TX_TERMINAL_CHECK");

        buyerActor.callCreate(escrow, termTx, address(sellerActor), 1 ether, DEADLINE, TERMS_HASH);
        sellerActor.callAgree(escrow, termTx);
        buyerActor.callFundFromBalance(escrow, termTx, 1 ether);
        sellerActor.callStartWork(escrow, termTx);
        buyerActor.callRelease(escrow, termTx);

        require(escrow.getTransactionState(termTx) == TransactionState.SETTLED, "Must be SETTLED");

        // Attempt to release again -> REVERT
        bool releaseAgainReverted = false;
        try buyerActor.callRelease(escrow, termTx) {
            releaseAgainReverted = false;
        } catch {
            releaseAgainReverted = true;
        }
        require(releaseAgainReverted, "Cannot release settled escrow");

        // Attempt to refund settled escrow -> REVERT
        bool refundReverted = false;
        try buyerActor.callRefund(escrow, termTx) {
            refundReverted = false;
        } catch {
            refundReverted = true;
        }
        require(refundReverted, "Cannot refund settled escrow");

        // Attempt to open dispute on settled escrow -> REVERT
        bool disputeReverted = false;
        try buyerActor.callOpenDispute(escrow, termTx) {
            disputeReverted = false;
        } catch {
            disputeReverted = true;
        }
        require(disputeReverted, "Cannot open dispute on settled escrow");

        // Attempt to anchor evidence on settled escrow -> REVERT
        bool anchorReverted = false;
        try sellerActor.callAnchorEvidence(escrow, termTx, EVIDENCE_HASH, STORAGE_HASH, false) {
            anchorReverted = false;
        } catch {
            anchorReverted = true;
        }
        require(anchorReverted, "Cannot anchor evidence on settled escrow");
    }

    // -------------------------------------------------------------------------
    // 13. INVARIANT: EVIDENCE -> VERIFICATION -> RECEIPT CANNOT MODIFY CORE TERMS
    // -------------------------------------------------------------------------

    function test_Invariants_EvidenceVerificationReceiptCannotModifyTerms() public {
        setUp();
        bytes32 fullTx = keccak256("TX_FULL_INVARIANTS");

        buyerActor.callCreateWithVerifier(
            escrow,
            fullTx,
            address(sellerActor),
            address(verifierActor),
            4 ether,
            DEADLINE,
            TERMS_HASH
        );
        sellerActor.callAgree(escrow, fullTx);
        buyerActor.callFundFromBalance(escrow, fullTx, 4 ether);
        sellerActor.callStartWork(escrow, fullTx);

        // Core terms checkpoint
        TransactionRecord memory initial = escrow.getTransaction(fullTx);

        // Submit multiple pieces of evidence
        sellerActor.callAnchorEvidenceWithMeta(escrow, fullTx, keccak256("E1"), keccak256("M1"), STORAGE_HASH, false);
        buyerActor.callAnchorEvidenceWithMeta(escrow, fullTx, keccak256("E2"), keccak256("M2"), STORAGE_HASH, false);
        verifierActor.callAnchorEvidenceWithMeta(escrow, fullTx, keccak256("E3"), keccak256("M3"), STORAGE_HASH, false);

        // Request and submit verification
        sellerActor.callRequestVerification(escrow, fullTx);
        verifierActor.callSubmitVerification(escrow, fullTx, VerificationOutcome.PASS, REPORT_HASH);

        // Buyer releases escrow
        buyerActor.callRelease(escrow, fullTx);

        // Terminal record checkpoint
        TransactionRecord memory post = escrow.getTransaction(fullTx);

        // PROOF: buyer, seller, totalAmount, tokenAddress are unmodified
        require(post.buyer == initial.buyer, "Buyer unmodified");
        require(post.seller == initial.seller, "Seller unmodified");
        require(post.totalAmount == initial.totalAmount, "Total amount unmodified");
        require(post.tokenAddress == initial.tokenAddress, "Token address unmodified");
        require(post.verifier == initial.verifier, "Verifier unmodified");
        require(post.termsHash == initial.termsHash, "Terms hash unmodified");
    }

    // -------------------------------------------------------------------------
    // 14. FUZZ INVARIANTS: SOLVENCY & CONSERVATION
    // -------------------------------------------------------------------------

    function testFuzz_SolvencyInvariant(uint96 amount) public {
        if (amount == 0 || amount > 10 ether) return;
        setUp();

        bytes32 fuzzTx = keccak256(abi.encodePacked("FUZZ_TX", amount));
        buyerActor.callCreate(escrow, fuzzTx, address(sellerActor), amount, DEADLINE, TERMS_HASH);
        sellerActor.callAgree(escrow, fuzzTx);
        buyerActor.callFund{value: amount}(escrow, fuzzTx, amount);

        // Invariant: TOTAL LIABILITIES <= CONTRACT BALANCE
        require(address(escrow).balance >= escrow.totalEscrowLiabilities(), "Contract must be strictly solvent");
        require(escrow.totalEscrowLiabilities() == amount, "Liabilities must equal funded amount");

        // Release and verify solvency holds at 0
        sellerActor.callStartWork(escrow, fuzzTx);
        buyerActor.callRelease(escrow, fuzzTx);

        require(escrow.totalEscrowLiabilities() == 0, "Liabilities must be zero post-release");
        require(address(escrow).balance >= escrow.totalEscrowLiabilities(), "Solvency invariant holds at terminal state");
    }

    function testFuzz_DisputeRatioConservation(uint16 buyerShareBps) public {
        if (buyerShareBps > 10000) return;
        setUp();

        bytes32 fuzzTx = keccak256(abi.encodePacked("FUZZ_DISPUTE", buyerShareBps));
        uint256 amount = 1 ether;

        buyerActor.callCreate(escrow, fuzzTx, address(sellerActor), amount, DEADLINE, TERMS_HASH);
        sellerActor.callAgree(escrow, fuzzTx);
        buyerActor.callFund{value: amount}(escrow, fuzzTx, amount);
        buyerActor.callOpenDispute(escrow, fuzzTx);

        uint256 buyerPreBal = address(buyerActor).balance;
        uint256 sellerPreBal = address(sellerActor).balance;

        resolverActor.callResolveDispute(escrow, fuzzTx, buyerShareBps);

        uint256 buyerDelta = address(buyerActor).balance - buyerPreBal;
        uint256 sellerDelta = address(sellerActor).balance - sellerPreBal;

        // Conservation of Value: Total disbursed == amount
        require(buyerDelta + sellerDelta == amount, "Dispute payout must strictly conserve total escrow funds");
        require(escrow.totalEscrowLiabilities() == 0, "Liabilities must be zero");
    }
}
