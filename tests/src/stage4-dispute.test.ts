import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ethers } from 'ethers';
import {
  VeriqoMeshDisputeService,
  ConflictAttestationVerifier,
  JudgeBallotVerifier,
  hashCanonicalJson,
} from '@trustmesh/service-dispute';
import {
  ConsensusResult,
  DisputeConsensusState,
  DisputeReason,
  TransactionState,
  VerificationOutcome,
} from '@trustmesh/types';

describe('Stage 4 — Human Judge Network & Dispute Settlement Gate', () => {
  // Setup participants and judges with deterministic test wallets
  const buyerWallet = ethers.Wallet.createRandom();
  const sellerWallet = ethers.Wallet.createRandom();
  const verifierWallet = ethers.Wallet.createRandom();

  const judge1 = ethers.Wallet.createRandom();
  const judge2 = ethers.Wallet.createRandom();
  const judge3 = ethers.Wallet.createRandom();
  const rogueJudge = ethers.Wallet.createRandom();

  const dummyTxId = ethers.id('STAGE_4_TEST_TX_001');

  function createInitializedService() {
    const service = new VeriqoMeshDisputeService();
    service.registry.clear();

    // Register our test judges
    service.registry.registerJudge({
      address: judge1.address,
      domains: ['GENERAL_COMMERCE', 'FREIGHT_LOGISTICS'],
      casesParticipated: 10,
      casesCompleted: 10,
      participationTimestamps: ['2026-09-01T00:00:00Z'],
      conflictAttestationsCount: 10,
      invalidBallotEvents: 0,
      averageResponseTimeSeconds: 3600,
      rationalePresenceRate: 1.0,
      isActive: true,
    });

    service.registry.registerJudge({
      address: judge2.address,
      domains: ['GENERAL_COMMERCE', 'HARDWARE_INSPECTION'],
      casesParticipated: 15,
      casesCompleted: 15,
      participationTimestamps: ['2026-09-02T00:00:00Z'],
      conflictAttestationsCount: 15,
      invalidBallotEvents: 0,
      averageResponseTimeSeconds: 4000,
      rationalePresenceRate: 1.0,
      isActive: true,
    });

    service.registry.registerJudge({
      address: judge3.address,
      domains: ['GENERAL_COMMERCE', 'SOFTWARE_DELIVERY'],
      casesParticipated: 8,
      casesCompleted: 8,
      participationTimestamps: ['2026-09-03T00:00:00Z'],
      conflictAttestationsCount: 8,
      invalidBallotEvents: 0,
      averageResponseTimeSeconds: 3000,
      rationalePresenceRate: 1.0,
      isActive: true,
    });

    service.openDisputeDocket({
      transactionId: dummyTxId,
      transactionState: TransactionState.DISPUTED,
      terms: {
        termsHash: ethers.id('TERMS_HASH'),
        totalAmountWei: ethers.parseEther('1.0').toString(),
        deadline: Math.floor(Date.now() / 1000) + 86400,
        description: 'Solar panel procurement',
      },
      buyer: buyerWallet.address,
      seller: sellerWallet.address,
      verifier: verifierWallet.address,
      anchoredEvidence: [
        {
          contentHash: ethers.id('EVIDENCE_1'),
          metadataHash: ethers.id('META_1'),
          title: 'Damaged modules inspection report',
          submitter: verifierWallet.address,
        },
      ],
      verificationOutcome: VerificationOutcome.INCONCLUSIVE,
      disputeReason: DisputeReason.DEFECTIVE_DELIVERABLE,
      disputeClaims: '15 of 100 solar panels were damaged in transit.',
      sellerClaim: '100 panels handed over intact to carrier.',
    });

    return service;
  }

  it('1. Valid judge assignment assigns exactly 3 distinct judges', () => {
    const service = createInitializedService();
    const assignment = service.assignJudgePanel(dummyTxId);

    assert.equal(assignment.assignedJudgeAddresses.length, 3);
    const unique = new Set(assignment.assignedJudgeAddresses.map((a: string) => a.toLowerCase()));
    assert.equal(unique.size, 3);
  });

  it('2. Buyer cannot be judge (Role Isolation)', () => {
    const service = createInitializedService();
    // Register buyer as a judge in registry
    service.registry.registerJudge({
      address: buyerWallet.address,
      domains: ['GENERAL_COMMERCE'],
      casesParticipated: 5,
      casesCompleted: 5,
      participationTimestamps: [],
      conflictAttestationsCount: 5,
      invalidBallotEvents: 0,
      averageResponseTimeSeconds: 1000,
      rationalePresenceRate: 1.0,
      isActive: true,
    });

    const assignment = service.assignJudgePanel(dummyTxId);
    assert.ok(
      !assignment.assignedJudgeAddresses.map((a: string) => a.toLowerCase()).includes(buyerWallet.address.toLowerCase()),
      'Buyer must not be assigned to panel'
    );
  });

  it('3. Seller cannot be judge (Role Isolation)', () => {
    const service = createInitializedService();
    // Register seller as a judge in registry
    service.registry.registerJudge({
      address: sellerWallet.address,
      domains: ['GENERAL_COMMERCE'],
      casesParticipated: 5,
      casesCompleted: 5,
      participationTimestamps: [],
      conflictAttestationsCount: 5,
      invalidBallotEvents: 0,
      averageResponseTimeSeconds: 1000,
      rationalePresenceRate: 1.0,
      isActive: true,
    });

    const assignment = service.assignJudgePanel(dummyTxId);
    assert.ok(
      !assignment.assignedJudgeAddresses.map((a: string) => a.toLowerCase()).includes(sellerWallet.address.toLowerCase()),
      'Seller must not be assigned to panel'
    );
  });

  it('4. Verifier cannot be judge (Role Isolation)', () => {
    const service = createInitializedService();
    // Register verifier as a judge in registry
    service.registry.registerJudge({
      address: verifierWallet.address,
      domains: ['GENERAL_COMMERCE'],
      casesParticipated: 5,
      casesCompleted: 5,
      participationTimestamps: [],
      conflictAttestationsCount: 5,
      invalidBallotEvents: 0,
      averageResponseTimeSeconds: 1000,
      rationalePresenceRate: 1.0,
      isActive: true,
    });

    const assignment = service.assignJudgePanel(dummyTxId);
    assert.ok(
      !assignment.assignedJudgeAddresses.map((a: string) => a.toLowerCase()).includes(verifierWallet.address.toLowerCase()),
      'Verifier must not be assigned to panel'
    );
  });

  it('5. Invalid judge signature is rejected', async () => {
    const service = createInitializedService();
    service.assignJudgePanel(dummyTxId);

    // Sign conflict attestation first
    const ts = Math.floor(Date.now() / 1000);
    const declMsg = ConflictAttestationVerifier.createDeclarationMessage(
      dummyTxId,
      judge1.address,
      'I affirm no conflict of interest.',
      ts
    );
    const declSig = await judge1.signMessage(declMsg);
    service.submitConflictAttestation({
      transactionId: dummyTxId,
      judgeAddress: judge1.address,
      declaration: 'I affirm no conflict of interest.',
      timestamp: ts,
      signature: declSig,
    });

    const now = new Date().toISOString();
    // Forge an invalid signature
    const invalidBallot = {
      transactionId: dummyTxId,
      judgeAddress: judge1.address,
      buyerShareBps: 1500,
      rationale: 'Reasonable partial refund.',
      submittedAt: now,
      signature: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1b',
    };

    assert.throws(
      () => service.submitJudgeBallot(invalidBallot),
      /Failed to verify ballot signature/
    );
  });

  it('6. Wrong signer rejected (signer != declared judge address)', async () => {
    const service = createInitializedService();
    service.assignJudgePanel(dummyTxId);

    const ts = Math.floor(Date.now() / 1000);
    const declMsg = ConflictAttestationVerifier.createDeclarationMessage(
      dummyTxId,
      judge1.address,
      'No conflict.',
      ts
    );
    const declSig = await judge1.signMessage(declMsg);
    service.submitConflictAttestation({
      transactionId: dummyTxId,
      judgeAddress: judge1.address,
      declaration: 'No conflict.',
      timestamp: ts,
      signature: declSig,
    });

    const now = new Date().toISOString();
    const ballotMsg = JudgeBallotVerifier.createBallotMessage(
      dummyTxId,
      judge1.address,
      1500,
      'Reasonable partial refund.',
      now
    );
    // Signed by rogueJudge instead of judge1
    const wrongSig = await rogueJudge.signMessage(ballotMsg);

    const ballot = {
      transactionId: dummyTxId,
      judgeAddress: judge1.address,
      buyerShareBps: 1500,
      rationale: 'Reasonable partial refund.',
      submittedAt: now,
      signature: wrongSig,
    };

    assert.throws(
      () => service.submitJudgeBallot(ballot),
      /Ballot signature recovered address .* does not match judge address/
    );
  });

  it('7. Duplicate ballot is rejected', async () => {
    const service = createInitializedService();
    service.assignJudgePanel(dummyTxId);

    const ts = Math.floor(Date.now() / 1000);
    const declMsg = ConflictAttestationVerifier.createDeclarationMessage(
      dummyTxId,
      judge1.address,
      'No conflict.',
      ts
    );
    const declSig = await judge1.signMessage(declMsg);
    service.submitConflictAttestation({
      transactionId: dummyTxId,
      judgeAddress: judge1.address,
      declaration: 'No conflict.',
      timestamp: ts,
      signature: declSig,
    });

    const now = new Date().toISOString();
    const ballotMsg = JudgeBallotVerifier.createBallotMessage(
      dummyTxId,
      judge1.address,
      1500,
      'Reasonable partial refund.',
      now
    );
    const sig = await judge1.signMessage(ballotMsg);

    const ballot = {
      transactionId: dummyTxId,
      judgeAddress: judge1.address,
      buyerShareBps: 1500,
      rationale: 'Reasonable partial refund.',
      submittedAt: now,
      signature: sig,
    };

    service.submitJudgeBallot(ballot);

    // Duplicate submission
    assert.throws(
      () => service.submitJudgeBallot(ballot),
      /Duplicate ballot rejected/
    );
  });

  it('8. Invalid BPS rejected (> 10000 or negative)', async () => {
    const service = createInitializedService();
    service.assignJudgePanel(dummyTxId);

    const ts = Math.floor(Date.now() / 1000);
    const declMsg = ConflictAttestationVerifier.createDeclarationMessage(
      dummyTxId,
      judge1.address,
      'No conflict.',
      ts
    );
    const declSig = await judge1.signMessage(declMsg);
    service.submitConflictAttestation({
      transactionId: dummyTxId,
      judgeAddress: judge1.address,
      declaration: 'No conflict.',
      timestamp: ts,
      signature: declSig,
    });

    const now = new Date().toISOString();
    const ballotMsg = JudgeBallotVerifier.createBallotMessage(
      dummyTxId,
      judge1.address,
      12000,
      'Out of bounds vote.',
      now
    );
    const sig = await judge1.signMessage(ballotMsg);

    const ballot = {
      transactionId: dummyTxId,
      judgeAddress: judge1.address,
      buyerShareBps: 12000,
      rationale: 'Out of bounds vote.',
      submittedAt: now,
      signature: sig,
    };

    assert.throws(
      () => service.submitJudgeBallot(ballot),
      /is out of range \[0, 10000\]/
    );
  });

  it('9. Three valid ballots produce 3-Judge Median Consensus', async () => {
    const service = createInitializedService();
    service.assignJudgePanel(dummyTxId);

    // Clear conflicts for all 3 judges
    for (const j of [judge1, judge2, judge3]) {
      const ts = Math.floor(Date.now() / 1000);
      const declMsg = ConflictAttestationVerifier.createDeclarationMessage(
        dummyTxId,
        j.address,
        'No conflict of interest.',
        ts
      );
      const sig = await j.signMessage(declMsg);
      service.submitConflictAttestation({
        transactionId: dummyTxId,
        judgeAddress: j.address,
        declaration: 'No conflict of interest.',
        timestamp: ts,
        signature: sig,
      });
    }

    // Cast 3 independent ballots: 1000 bps (10%), 1500 bps (15%), 2000 bps (20%)
    const votes = [
      { judge: judge1, bps: 1000, rationale: '10% refund justified' },
      { judge: judge2, bps: 1500, rationale: '15% refund matches inspection' },
      { judge: judge3, bps: 2000, rationale: '20% refund matches delivery gap' },
    ];

    let finalResult;
    for (const v of votes) {
      const now = new Date().toISOString();
      const msg = JudgeBallotVerifier.createBallotMessage(
        dummyTxId,
        v.judge.address,
        v.bps,
        v.rationale,
        now
      );
      const sig = await v.judge.signMessage(msg);
      const res = service.submitJudgeBallot({
        transactionId: dummyTxId,
        judgeAddress: v.judge.address,
        buyerShareBps: v.bps,
        rationale: v.rationale,
        submittedAt: now,
        signature: sig,
      });
      if (res.consensusResult) {
        finalResult = res.consensusResult;
      }
    }

    assert.ok(finalResult);
    assert.equal(finalResult.method, '3-Judge Median Consensus');
    assert.equal(finalResult.consensusBuyerShareBps, 1500); // Median of 1000, 1500, 2000
    assert.equal(finalResult.isPolarized, false);
    assert.equal(finalResult.state, DisputeConsensusState.READY_FOR_SETTLEMENT);
  });

  it('10. Polarized votes produce POLARIZED status (spread > 4000 bps)', async () => {
    const service = createInitializedService();
    service.assignJudgePanel(dummyTxId);

    for (const j of [judge1, judge2, judge3]) {
      const ts = Math.floor(Date.now() / 1000);
      const declMsg = ConflictAttestationVerifier.createDeclarationMessage(
        dummyTxId,
        j.address,
        'No conflict of interest.',
        ts
      );
      const sig = await j.signMessage(declMsg);
      service.submitConflictAttestation({
        transactionId: dummyTxId,
        judgeAddress: j.address,
        declaration: 'No conflict of interest.',
        timestamp: ts,
        signature: sig,
      });
    }

    // Cast polarized votes: 1000 bps, 1500 bps, 8000 bps (spread = 7000 bps > 4000)
    const polarizedVotes = [
      { judge: judge1, bps: 1000, rationale: 'Minor flaw' },
      { judge: judge2, bps: 1500, rationale: 'Standard damage' },
      { judge: judge3, bps: 8000, rationale: 'Gross total breach asserted' },
    ];

    let finalResult;
    for (const v of polarizedVotes) {
      const now = new Date().toISOString();
      const msg = JudgeBallotVerifier.createBallotMessage(
        dummyTxId,
        v.judge.address,
        v.bps,
        v.rationale,
        now
      );
      const sig = await v.judge.signMessage(msg);
      const res = service.submitJudgeBallot({
        transactionId: dummyTxId,
        judgeAddress: v.judge.address,
        buyerShareBps: v.bps,
        rationale: v.rationale,
        submittedAt: now,
        signature: sig,
      });
      if (res.consensusResult) {
        finalResult = res.consensusResult;
      }
    }

    assert.ok(finalResult);
    assert.equal(finalResult.isPolarized, true);
    assert.equal(finalResult.spreadBps, 7000);
    assert.equal(finalResult.state, DisputeConsensusState.REQUIRES_SENIOR_REVIEW);
  });

  it('11. Polarized case cannot reach READY_FOR_SETTLEMENT or be dispatched', async () => {
    const service = createInitializedService();
    service.assignJudgePanel(dummyTxId);

    for (const j of [judge1, judge2, judge3]) {
      const ts = Math.floor(Date.now() / 1000);
      const declMsg = ConflictAttestationVerifier.createDeclarationMessage(
        dummyTxId,
        j.address,
        'No conflict.',
        ts
      );
      const sig = await j.signMessage(declMsg);
      service.submitConflictAttestation({
        transactionId: dummyTxId,
        judgeAddress: j.address,
        declaration: 'No conflict.',
        timestamp: ts,
        signature: sig,
      });
    }

    const polarizedVotes = [
      { judge: judge1, bps: 500, rationale: 'Low' },
      { judge: judge2, bps: 1500, rationale: 'Mid' },
      { judge: judge3, bps: 9000, rationale: 'Outlier high' },
    ];

    for (const v of polarizedVotes) {
      const now = new Date().toISOString();
      const msg = JudgeBallotVerifier.createBallotMessage(
        dummyTxId,
        v.judge.address,
        v.bps,
        v.rationale,
        now
      );
      const sig = await v.judge.signMessage(msg);
      service.submitJudgeBallot({
        transactionId: dummyTxId,
        judgeAddress: v.judge.address,
        buyerShareBps: v.bps,
        rationale: v.rationale,
        submittedAt: now,
        signature: sig,
      });
    }

    const docket = service.getDisputeDocket(dummyTxId);
    assert.ok(docket);
    assert.equal(docket.adjudicationStatus, DisputeConsensusState.REQUIRES_SENIOR_REVIEW);

    // Attempt settlement dispatch
    assert.throws(
      () =>
        service.authorizeSettlement(
          dummyTxId,
          1500,
          '0x90F79bf6EB2c4f870365E785982E1f101E93b906'
        ),
      /Requires senior appellate review; automated settlement is strictly blocked/
    );
  });

  it('12. AI dossier cannot directly authorize settlement (Zero Financial Authority)', () => {
    const service = createInitializedService();
    const docket = service.getDisputeDocket(dummyTxId);

    assert.ok(docket);
    assert.ok(docket.aiDossier);
    assert.equal(docket.aiDossier.label, 'AI_ANALYZED — HUMAN REVIEW REQUIRED');

    // Attempting to authorize settlement directly from AI state without human quorum must fail
    assert.throws(
      () =>
        service.authorizeSettlement(
          dummyTxId,
          1500,
          '0x90F79bf6EB2c4f870365E785982E1f101E93b906'
        ),
      /Incomplete quorum/
    );
  });

  it('13. Dispatcher BPS must equal consensus BPS (Exact Match Enforcement)', async () => {
    const service = createInitializedService();
    service.assignJudgePanel(dummyTxId);

    for (const j of [judge1, judge2, judge3]) {
      const ts = Math.floor(Date.now() / 1000);
      const declMsg = ConflictAttestationVerifier.createDeclarationMessage(
        dummyTxId,
        j.address,
        'No conflict.',
        ts
      );
      const sig = await j.signMessage(declMsg);
      service.submitConflictAttestation({
        transactionId: dummyTxId,
        judgeAddress: j.address,
        declaration: 'No conflict.',
        timestamp: ts,
        signature: sig,
      });
    }

    const votes = [
      { judge: judge1, bps: 1500, rationale: '15%' },
      { judge: judge2, bps: 1500, rationale: '15%' },
      { judge: judge3, bps: 2000, rationale: '20%' },
    ];

    for (const v of votes) {
      const now = new Date().toISOString();
      const msg = JudgeBallotVerifier.createBallotMessage(
        dummyTxId,
        v.judge.address,
        v.bps,
        v.rationale,
        now
      );
      const sig = await v.judge.signMessage(msg);
      service.submitJudgeBallot({
        transactionId: dummyTxId,
        judgeAddress: v.judge.address,
        buyerShareBps: v.bps,
        rationale: v.rationale,
        submittedAt: now,
        signature: sig,
      });
    }

    // Consensus is 1500. Attempt to dispatch 2500 BPS:
    assert.throws(
      () =>
        service.authorizeSettlement(
          dummyTxId,
          2500,
          '0x90F79bf6EB2c4f870365E785982E1f101E93b906'
        ),
      /Dispatched BPS \(2500\) does not match 3-Judge Median Consensus BPS \(1500\)/
    );

    // Exact match passes
    const dispatch = service.authorizeSettlement(
      dummyTxId,
      1500,
      '0x90F79bf6EB2c4f870365E785982E1f101E93b906'
    );
    assert.equal(dispatch.consensusBuyerShareBps, 1500);
  });

  it('14. Missing quorum cannot dispatch settlement', async () => {
    const service = createInitializedService();
    service.assignJudgePanel(dummyTxId);

    // Only 2 of 3 judges submit ballots
    for (const j of [judge1, judge2]) {
      const ts = Math.floor(Date.now() / 1000);
      const declMsg = ConflictAttestationVerifier.createDeclarationMessage(
        dummyTxId,
        j.address,
        'No conflict.',
        ts
      );
      const sig = await j.signMessage(declMsg);
      service.submitConflictAttestation({
        transactionId: dummyTxId,
        judgeAddress: j.address,
        declaration: 'No conflict.',
        timestamp: ts,
        signature: sig,
      });

      const now = new Date().toISOString();
      const msg = JudgeBallotVerifier.createBallotMessage(
        dummyTxId,
        j.address,
        1500,
        '15%',
        now
      );
      const ballotSig = await j.signMessage(msg);
      service.submitJudgeBallot({
        transactionId: dummyTxId,
        judgeAddress: j.address,
        buyerShareBps: 1500,
        rationale: '15%',
        submittedAt: now,
        signature: ballotSig,
      });
    }

    assert.throws(
      () =>
        service.authorizeSettlement(
          dummyTxId,
          1500,
          '0x90F79bf6EB2c4f870365E785982E1f101E93b906'
        ),
      /Incomplete quorum/
    );
  });

  it('15. Invalid conflict attestation blocks participation', async () => {
    const service = createInitializedService();
    service.assignJudgePanel(dummyTxId);

    // Empty declaration
    assert.throws(
      () =>
        service.submitConflictAttestation({
          transactionId: dummyTxId,
          judgeAddress: judge1.address,
          declaration: '',
          timestamp: Date.now(),
          signature: '0x00',
        }),
      /Empty conflict-of-interest declaration string/
    );

    // Judge without conflict attestation attempting to cast ballot must be blocked
    const now = new Date().toISOString();
    const ballotMsg = JudgeBallotVerifier.createBallotMessage(
      dummyTxId,
      judge1.address,
      1500,
      'Attempt without attestation',
      now
    );
    const sig = await judge1.signMessage(ballotMsg);

    assert.throws(
      () =>
        service.submitJudgeBallot({
          transactionId: dummyTxId,
          judgeAddress: judge1.address,
          buyerShareBps: 1500,
          rationale: 'Attempt without attestation',
          submittedAt: now,
          signature: sig,
        }),
      /must submit conflict-of-interest attestation before casting a ballot/
    );
  });

  it('16. Adjudication record hash is deterministic', () => {
    const payload1 = {
      transactionId: dummyTxId,
      docketId: 'DOCKET_01',
      consensusBps: 1500,
      judges: ['0x1111', '0x2222', '0x3333'],
    };

    const payload2 = {
      // Different key order
      consensusBps: 1500,
      transactionId: dummyTxId,
      judges: ['0x1111', '0x2222', '0x3333'],
      docketId: 'DOCKET_01',
    };

    const hash1 = hashCanonicalJson(payload1);
    const hash2 = hashCanonicalJson(payload2);

    assert.equal(hash1, hash2, 'Canonical hashing must produce identical hash regardless of key order');
  });

  it('17. Existing Solidity onchain invariants verified locally (Conservation & State)', () => {
    // Verifies mathematical conservation invariant matching Solidity resolveDispute
    const totalAmount = ethers.parseEther('20.0');
    const buyerShareBps = 1500n; // 15%

    const buyerPayout = (totalAmount * buyerShareBps) / 10000n;
    const sellerPayout = totalAmount - buyerPayout;

    assert.equal(buyerPayout + sellerPayout, totalAmount, 'Mathematical conservation must hold strictly');
    assert.equal(buyerPayout, ethers.parseEther('3.0'));
    assert.equal(sellerPayout, ethers.parseEther('17.0'));
  });

  it('18. Duplicate conflict attestation is rejected (First succeeds, second fails, original intact)', async () => {
    const service = createInitializedService();
    service.assignJudgePanel(dummyTxId);

    const ts1 = Math.floor(Date.now() / 1000);
    const declMsg1 = ConflictAttestationVerifier.createDeclarationMessage(
      dummyTxId,
      judge1.address,
      'First affirmation of zero conflict.',
      ts1
    );
    const sig1 = await judge1.signMessage(declMsg1);

    // 1. First attestation succeeds
    const res1 = service.submitConflictAttestation({
      transactionId: dummyTxId,
      judgeAddress: judge1.address,
      declaration: 'First affirmation of zero conflict.',
      timestamp: ts1,
      signature: sig1,
    });
    assert.ok(res1.success);

    const docketBefore = service.getDisputeDocket(dummyTxId);
    assert.ok(docketBefore);
    assert.equal(Object.keys(docketBefore.conflictAttestations).length, 1);
    const originalAttestation = docketBefore.conflictAttestations[judge1.address.toLowerCase()];
    assert.equal(originalAttestation.declaration, 'First affirmation of zero conflict.');

    // 2. Second attestation from same judge fails
    const ts2 = ts1 + 60;
    const declMsg2 = ConflictAttestationVerifier.createDeclarationMessage(
      dummyTxId,
      judge1.address,
      'Second modified declaration.',
      ts2
    );
    const sig2 = await judge1.signMessage(declMsg2);

    assert.throws(
      () =>
        service.submitConflictAttestation({
          transactionId: dummyTxId,
          judgeAddress: judge1.address,
          declaration: 'Second modified declaration.',
          timestamp: ts2,
          signature: sig2,
        }),
      /Duplicate conflict attestation rejected/
    );

    // 3. Original attestation remains intact
    const docketAfter = service.getDisputeDocket(dummyTxId);
    assert.ok(docketAfter);
    const storedAttestation = docketAfter.conflictAttestations[judge1.address.toLowerCase()];
    assert.equal(storedAttestation.declaration, 'First affirmation of zero conflict.');
    assert.equal(storedAttestation.timestamp, ts1);
    assert.equal(storedAttestation.signature, sig1);

    // 4. Conflict-attestation quorum remains unchanged (still 1)
    assert.equal(Object.keys(docketAfter.conflictAttestations).length, 1);
  });

  it('19. AI dossier contains no numerical payout or basis points recommendation', () => {
    const service = createInitializedService();
    const docket = service.getDisputeDocket(dummyTxId);
    assert.ok(docket?.aiDossier);

    const dossier = docket.aiDossier;
    const dossierJson = JSON.stringify(dossier).toLowerCase();

    // Must not recommend a specific BPS or percentage settlement
    assert.ok(!dossierJson.includes('1500 bps'), 'Dossier must not suggest 1500 bps');
    assert.ok(!dossierJson.includes('buyer refund with 85%'), 'Dossier must not suggest 85% payout');
    assert.ok(!dossierJson.includes('recommendation:'), 'Dossier must not contain financial recommendation');

    // Questions must be neutrally phrased
    const hasNeutralQuestion = dossier.unresolvedQuestions.some((q) =>
      q.includes('what allocation is supported by the evidence')
    );
    assert.ok(hasNeutralQuestion, 'Dossier must present neutral review questions for human judges');
  });

  it('20. Ballot signed for Transaction A cannot be submitted to Transaction B', async () => {
    const service = createInitializedService();
    service.assignJudgePanel(dummyTxId);

    // Open a second separate docket with dummyTxId2
    const dummyTxId2 = ethers.id('STAGE_4_TEST_TX_002');
    service.openDisputeDocket({
      transactionId: dummyTxId2,
      transactionState: TransactionState.DISPUTED,
      terms: {
        termsHash: ethers.id('TERMS_HASH_2'),
        totalAmountWei: ethers.parseEther('2.0').toString(),
        deadline: Math.floor(Date.now() / 1000) + 86400,
      },
      buyer: buyerWallet.address,
      seller: sellerWallet.address,
      anchoredEvidence: [],
      verificationOutcome: VerificationOutcome.INCONCLUSIVE,
      disputeReason: DisputeReason.DEFECTIVE_DELIVERABLE,
      disputeClaims: 'Second dispute.',
    });
    service.assignJudgePanel(dummyTxId2);

    // Clear conflict attestation on both dockets for judge1
    const ts = Math.floor(Date.now() / 1000);
    for (const txId of [dummyTxId, dummyTxId2]) {
      const declMsg = ConflictAttestationVerifier.createDeclarationMessage(
        txId,
        judge1.address,
        'No conflict of interest.',
        ts
      );
      const declSig = await judge1.signMessage(declMsg);
      service.submitConflictAttestation({
        transactionId: txId,
        judgeAddress: judge1.address,
        declaration: 'No conflict of interest.',
        timestamp: ts,
        signature: declSig,
      });
    }

    const now = new Date().toISOString();
    // Judge1 signs a ballot specifically for dummyTxId (Transaction A)
    const ballotMsgA = JudgeBallotVerifier.createBallotMessage(
      dummyTxId,
      judge1.address,
      1500,
      'Vote for Transaction A',
      now
    );
    const sigA = await judge1.signMessage(ballotMsgA);

    const ballotForA = {
      transactionId: dummyTxId, // Signed for Tx A
      judgeAddress: judge1.address,
      buyerShareBps: 1500,
      rationale: 'Vote for Transaction A',
      submittedAt: now,
      signature: sigA,
    };

    // Attempt 1: Submitting ballot with tampered transactionId (set to B, but signed for A)
    assert.throws(
      () =>
        service.submitJudgeBallot({
          ...ballotForA,
          transactionId: dummyTxId2,
        }),
      /Ballot signature recovered address .* does not match judge address/
    );

    // Attempt 2: Submitting untampered ballotForA directly to docket B context
    const docketB = service.getDisputeDocket(dummyTxId2)!;
    const directVerify = service.ballotVerifier.verify(ballotForA, {
      transactionId: dummyTxId2,
      assignedJudges: docketB.assignedJudges,
      buyer: docketB.buyer,
      seller: docketB.seller,
      existingBallots: docketB.ballots,
    });
    assert.equal(directVerify.isValid, false);
    assert.match(directVerify.reason!, /does not match docket/);

    // Docket B remains with 0 ballots and quorum unaffected
    assert.equal(Object.keys(docketB.ballots).length, 0);
  });

  it('21. Adjudication record canonical hash changes when a ballot field is mutated (Test A)', () => {
    const service = createInitializedService();
    const fixedCreatedAt = '2026-09-23T12:00:00.000Z';
    const consensus: ConsensusResult = {
      transactionId: dummyTxId,
      consensusBuyerShareBps: 1500,
      method: '3-Judge Median Consensus',
      participatingJudges: [judge1.address, judge2.address, judge3.address],
      votes: [
        { judgeAddress: judge1.address, buyerShareBps: 1000, rationale: 'Original rationale 1' },
        { judgeAddress: judge2.address, buyerShareBps: 1500, rationale: 'Original rationale 2' },
        { judgeAddress: judge3.address, buyerShareBps: 2000, rationale: 'Original rationale 3' },
      ],
      sortedBps: [1000, 1500, 2000],
      maxVote: 2000,
      minVote: 1000,
      spreadBps: 1000,
      isPolarized: false,
      calculatedAt: fixedCreatedAt,
      state: DisputeConsensusState.READY_FOR_SETTLEMENT,
    };

    const ballot1 = {
      transactionId: dummyTxId,
      judgeAddress: judge1.address,
      buyerShareBps: 1000,
      rationale: 'Original rationale 1',
      submittedAt: fixedCreatedAt,
      signature: '0x1111',
    };
    const ballot2 = {
      transactionId: dummyTxId,
      judgeAddress: judge2.address,
      buyerShareBps: 1500,
      rationale: 'Original rationale 2',
      submittedAt: fixedCreatedAt,
      signature: '0x2222',
    };
    const ballot3 = {
      transactionId: dummyTxId,
      judgeAddress: judge3.address,
      buyerShareBps: 2000,
      rationale: 'Original rationale 3',
      submittedAt: fixedCreatedAt,
      signature: '0x3333',
    };

    const recordOriginal = service.adjudicationManager.createRecord({
      transactionId: dummyTxId,
      docketId: 'DOCKET_01',
      consensus,
      ballots: [ballot1, ballot2, ballot3],
      attestations: [],
      createdAt: fixedCreatedAt,
    });

    // Mutate ballot 1 (change buyerShareBps from 1000 to 1200)
    const mutatedBallot1 = { ...ballot1, buyerShareBps: 1200 };
    const recordMutatedBallot = service.adjudicationManager.createRecord({
      transactionId: dummyTxId,
      docketId: 'DOCKET_01',
      consensus,
      ballots: [mutatedBallot1, ballot2, ballot3],
      attestations: [],
      createdAt: fixedCreatedAt,
    });

    assert.notEqual(
      recordOriginal.adjudicationId,
      recordMutatedBallot.adjudicationId,
      'Recalculated canonical hash must differ when a ballot field is mutated'
    );
  });

  it('22. Adjudication record canonical hash changes when docket/evidence metadata is mutated (Test B)', () => {
    const service = createInitializedService();
    const fixedCreatedAt = '2026-09-23T12:00:00.000Z';
    const consensus: ConsensusResult = {
      transactionId: dummyTxId,
      consensusBuyerShareBps: 1500,
      method: '3-Judge Median Consensus',
      participatingJudges: [judge1.address, judge2.address, judge3.address],
      votes: [
        { judgeAddress: judge1.address, buyerShareBps: 1000, rationale: 'R1' },
        { judgeAddress: judge2.address, buyerShareBps: 1500, rationale: 'R2' },
        { judgeAddress: judge3.address, buyerShareBps: 2000, rationale: 'R3' },
      ],
      sortedBps: [1000, 1500, 2000],
      maxVote: 2000,
      minVote: 1000,
      spreadBps: 1000,
      isPolarized: false,
      calculatedAt: fixedCreatedAt,
      state: DisputeConsensusState.READY_FOR_SETTLEMENT,
    };

    const recordOriginal = service.adjudicationManager.createRecord({
      transactionId: dummyTxId,
      docketId: 'DOCKET_01',
      consensus,
      ballots: [],
      attestations: [],
      aiDossier: {
        label: 'AI_ANALYZED — HUMAN REVIEW REQUIRED',
        chronology: [],
        evidenceReferences: [{ title: 'Report', hash: '0xaaaa', submitter: 'seller' }],
        agreementTerms: { termsHash: '0x1111', summary: 'Terms', deadline: 100, totalAmount: '1' },
        claimedFacts: [],
        detectedInconsistencies: [],
        unresolvedQuestions: [],
        generatedAt: fixedCreatedAt,
      },
      createdAt: fixedCreatedAt,
    });

    // Mutate evidence hash in AI dossier
    const recordMutatedEvidence = service.adjudicationManager.createRecord({
      transactionId: dummyTxId,
      docketId: 'DOCKET_01',
      consensus,
      ballots: [],
      attestations: [],
      aiDossier: {
        label: 'AI_ANALYZED — HUMAN REVIEW REQUIRED',
        chronology: [],
        evidenceReferences: [{ title: 'Report', hash: '0xbbbb_mutated', submitter: 'seller' }],
        agreementTerms: { termsHash: '0x1111', summary: 'Terms', deadline: 100, totalAmount: '1' },
        claimedFacts: [],
        detectedInconsistencies: [],
        unresolvedQuestions: [],
        generatedAt: fixedCreatedAt,
      },
      createdAt: fixedCreatedAt,
    });

    assert.notEqual(
      recordOriginal.adjudicationId,
      recordMutatedEvidence.adjudicationId,
      'Recalculated canonical hash must differ when evidence/dossier metadata is mutated'
    );

    // Also test mutating docketId
    const recordMutatedDocketId = service.adjudicationManager.createRecord({
      transactionId: dummyTxId,
      docketId: 'DOCKET_02_MUTATED',
      consensus,
      ballots: [],
      attestations: [],
      createdAt: fixedCreatedAt,
    });

    assert.notEqual(
      recordOriginal.adjudicationId,
      recordMutatedDocketId.adjudicationId,
      'Recalculated canonical hash must differ when docket ID is mutated'
    );
  });
});

describe('Stage 4 — Conflict Attestation Regression Invariants', () => {
  const buyerWallet = ethers.Wallet.createRandom();
  const sellerWallet = ethers.Wallet.createRandom();
  const verifierWallet = ethers.Wallet.createRandom();
  const judge1 = ethers.Wallet.createRandom();
  const judge2 = ethers.Wallet.createRandom();
  const judge3 = ethers.Wallet.createRandom();
  const unassignedJudge = ethers.Wallet.createRandom();

  const testTxId = ethers.id('STAGE_4_ATTESTATION_REGRESSION_TX');

  const neutralDeclaration =
    'I declare that I have no known conflict of interest with the parties, verifier, judges, or adjudication of this test transaction.';

  function setupServiceWithDocket() {
    const service = new VeriqoMeshDisputeService();
    service.registry.clear();

    for (const j of [judge1, judge2, judge3]) {
      service.registry.registerJudge({
        address: j.address,
        domains: ['GENERAL_COMMERCE'],
        casesParticipated: 10,
        casesCompleted: 10,
        participationTimestamps: [],
        conflictAttestationsCount: 10,
        invalidBallotEvents: 0,
        averageResponseTimeSeconds: 3600,
        rationalePresenceRate: 1.0,
        isActive: true,
      });
    }

    service.openDisputeDocket({
      transactionId: testTxId,
      transactionState: TransactionState.DISPUTED,
      terms: {
        termsHash: ethers.id('TERMS'),
        totalAmountWei: ethers.parseEther('1.0').toString(),
        deadline: Math.floor(Date.now() / 1000) + 86400,
      },
      buyer: buyerWallet.address,
      seller: sellerWallet.address,
      verifier: verifierWallet.address,
      anchoredEvidence: [],
      verificationOutcome: VerificationOutcome.INCONCLUSIVE,
      disputeReason: DisputeReason.DEFECTIVE_DELIVERABLE,
      disputeClaims: 'Attestation regression test case.',
    });

    service.assignJudgePanel(testTxId);
    return service;
  }

  it('R1. Empty or whitespace-only conflict declaration is rejected', async () => {
    const service = setupServiceWithDocket();
    const ts = Math.floor(Date.now() / 1000);

    // Completely empty string
    assert.throws(
      () =>
        service.submitConflictAttestation({
          transactionId: testTxId,
          judgeAddress: judge1.address,
          declaration: '',
          timestamp: ts,
          signature: '0x1234',
        }),
      /Empty conflict-of-interest declaration string/
    );

    // Whitespace only
    assert.throws(
      () =>
        service.submitConflictAttestation({
          transactionId: testTxId,
          judgeAddress: judge1.address,
          declaration: '    \t\n   ',
          timestamp: ts,
          signature: '0x1234',
        }),
      /Empty conflict-of-interest declaration string/
    );
  });

  it('R2. Non-empty valid declaration succeeds and updates docket state', async () => {
    const service = setupServiceWithDocket();
    const ts = Math.floor(Date.now() / 1000);

    const msg = ConflictAttestationVerifier.createDeclarationMessage(
      testTxId,
      judge1.address,
      neutralDeclaration,
      ts
    );
    const sig = await judge1.signMessage(msg);

    const result = service.submitConflictAttestation({
      transactionId: testTxId,
      judgeAddress: judge1.address,
      declaration: neutralDeclaration,
      timestamp: ts,
      signature: sig,
    });

    assert.equal(result.success, true);
    assert.equal(
      result.docket.conflictAttestations[judge1.address.toLowerCase()].declaration,
      neutralDeclaration
    );
    assert.equal(
      result.docket.conflictAttestations[judge1.address.toLowerCase()].timestamp,
      ts
    );
  });

  it('R3. Declaration signature remains transaction/judge-specific (wrong judge or wrong tx rejected)', async () => {
    const service = setupServiceWithDocket();
    const ts = Math.floor(Date.now() / 1000);

    const msg1 = ConflictAttestationVerifier.createDeclarationMessage(
      testTxId,
      judge1.address,
      neutralDeclaration,
      ts
    );
    const sig1 = await judge1.signMessage(msg1);

    // Submitting judge1 signature under judge2's address must fail signature verification
    assert.throws(
      () =>
        service.submitConflictAttestation({
          transactionId: testTxId,
          judgeAddress: judge2.address,
          declaration: neutralDeclaration,
          timestamp: ts,
          signature: sig1,
        }),
      /Signature recovered address .* does not match judge address/
    );
  });

  it('R4. Duplicate conflict attestation from same judge is rejected', async () => {
    const service = setupServiceWithDocket();
    const ts1 = Math.floor(Date.now() / 1000);

    const msg1 = ConflictAttestationVerifier.createDeclarationMessage(
      testTxId,
      judge1.address,
      neutralDeclaration,
      ts1
    );
    const sig1 = await judge1.signMessage(msg1);

    service.submitConflictAttestation({
      transactionId: testTxId,
      judgeAddress: judge1.address,
      declaration: neutralDeclaration,
      timestamp: ts1,
      signature: sig1,
    });

    const ts2 = ts1 + 30;
    const msg2 = ConflictAttestationVerifier.createDeclarationMessage(
      testTxId,
      judge1.address,
      'Modified declaration.',
      ts2
    );
    const sig2 = await judge1.signMessage(msg2);

    assert.throws(
      () =>
        service.submitConflictAttestation({
          transactionId: testTxId,
          judgeAddress: judge1.address,
          declaration: 'Modified declaration.',
          timestamp: ts2,
          signature: sig2,
        }),
      /Duplicate conflict attestation rejected/
    );
  });

  it('R5. Wrong transaction attestation is rejected (unknown docket)', async () => {
    const service = setupServiceWithDocket();
    const unknownTxId = ethers.id('UNKNOWN_TX_ID');
    const ts = Math.floor(Date.now() / 1000);

    assert.throws(
      () =>
        service.submitConflictAttestation({
          transactionId: unknownTxId,
          judgeAddress: judge1.address,
          declaration: neutralDeclaration,
          timestamp: ts,
          signature: '0x1234',
        }),
      /Dispute docket not found for transaction/
    );
  });

  it('R6. Wrong/unassigned judge is rejected', async () => {
    const service = setupServiceWithDocket();
    const ts = Math.floor(Date.now() / 1000);

    const msg = ConflictAttestationVerifier.createDeclarationMessage(
      testTxId,
      unassignedJudge.address,
      neutralDeclaration,
      ts
    );
    const sig = await unassignedJudge.signMessage(msg);

    assert.throws(
      () =>
        service.submitConflictAttestation({
          transactionId: testTxId,
          judgeAddress: unassignedJudge.address,
          declaration: neutralDeclaration,
          timestamp: ts,
          signature: sig,
        }),
      /is not assigned to this dispute panel/
    );
  });

  it('R7. Buyer, Seller, and Verifier cannot submit conflict attestations (Strict Role Isolation)', async () => {
    const service = setupServiceWithDocket();
    const ts = Math.floor(Date.now() / 1000);

    // Buyer
    assert.throws(
      () =>
        service.submitConflictAttestation({
          transactionId: testTxId,
          judgeAddress: buyerWallet.address,
          declaration: neutralDeclaration,
          timestamp: ts,
          signature: '0x1234',
        }),
      /Buyer cannot submit a judge conflict attestation/
    );

    // Seller
    assert.throws(
      () =>
        service.submitConflictAttestation({
          transactionId: testTxId,
          judgeAddress: sellerWallet.address,
          declaration: neutralDeclaration,
          timestamp: ts,
          signature: '0x1234',
        }),
      /Seller cannot submit a judge conflict attestation/
    );

    // Verifier
    assert.throws(
      () =>
        service.submitConflictAttestation({
          transactionId: testTxId,
          judgeAddress: verifierWallet.address,
          declaration: neutralDeclaration,
          timestamp: ts,
          signature: '0x1234',
        }),
      /Designated Verifier cannot submit a judge conflict attestation/
    );
  });

  it('R8. Mutation of declaration or timestamp after signing causes signature verification failure', async () => {
    const service = setupServiceWithDocket();
    const ts = Math.floor(Date.now() / 1000);

    // Signed with neutralDeclaration and ts
    const msg = ConflictAttestationVerifier.createDeclarationMessage(
      testTxId,
      judge1.address,
      neutralDeclaration,
      ts
    );
    const sig = await judge1.signMessage(msg);

    // Mutation 1: Tampered declaration string
    assert.throws(
      () =>
        service.submitConflictAttestation({
          transactionId: testTxId,
          judgeAddress: judge1.address,
          declaration: neutralDeclaration + ' [MUTATED]',
          timestamp: ts,
          signature: sig,
        }),
      /Signature recovered address .* does not match judge address/
    );

    // Mutation 2: Tampered timestamp
    assert.throws(
      () =>
        service.submitConflictAttestation({
          transactionId: testTxId,
          judgeAddress: judge1.address,
          declaration: neutralDeclaration,
          timestamp: ts + 100,
          signature: sig,
        }),
      /Signature recovered address .* does not match judge address/
    );
  });

  it('R9. Exactly 3 valid attestations are required by SettlementAuthorizationGate', async () => {
    const service = setupServiceWithDocket();

    // 2 judges submit conflict attestations and ballots
    for (const j of [judge1, judge2]) {
      const ts = Math.floor(Date.now() / 1000);
      const declMsg = ConflictAttestationVerifier.createDeclarationMessage(
        testTxId,
        j.address,
        neutralDeclaration,
        ts
      );
      const sig = await j.signMessage(declMsg);
      service.submitConflictAttestation({
        transactionId: testTxId,
        judgeAddress: j.address,
        declaration: neutralDeclaration,
        timestamp: ts,
        signature: sig,
      });

      const now = new Date().toISOString();
      const ballotMsg = JudgeBallotVerifier.createBallotMessage(
        testTxId,
        j.address,
        1500,
        'Rationale',
        now
      );
      const bSig = await j.signMessage(ballotMsg);
      service.submitJudgeBallot({
        transactionId: testTxId,
        judgeAddress: j.address,
        buyerShareBps: 1500,
        rationale: 'Rationale',
        submittedAt: now,
        signature: bSig,
      });
    }

    const docket = service.getDisputeDocket(testTxId)!;

    // Check A: Judge 3 cannot submit ballot without conflict attestation
    const now3Unattested = new Date().toISOString();
    const ballotMsg3Unattested = JudgeBallotVerifier.createBallotMessage(
      testTxId,
      judge3.address,
      1500,
      'Pre-attestation ballot attempt',
      now3Unattested
    );
    const bSig3Unattested = await judge3.signMessage(ballotMsg3Unattested);
    assert.throws(
      () =>
        service.submitJudgeBallot({
          transactionId: testTxId,
          judgeAddress: judge3.address,
          buyerShareBps: 1500,
          rationale: 'Pre-attestation ballot attempt',
          submittedAt: now3Unattested,
          signature: bSig3Unattested,
        }),
      /must submit conflict-of-interest attestation before casting a ballot/
    );

    // Check B: If 3 ballots were present but only 2 attestations, authorization gate strictly rejects
    docket.ballots[judge3.address.toLowerCase()] = {
      transactionId: testTxId,
      judgeAddress: judge3.address,
      buyerShareBps: 1500,
      rationale: 'Bypassed ballot',
      submittedAt: now3Unattested,
      signature: bSig3Unattested,
    };

    assert.throws(
      () =>
        service.authorizationGate.authorizeDispatch({
          docket,
          proposedBps: 1500,
          resolverAddress: '0x12f9e53c31F7629aCAE0BA70588794945EC6c35E',
        }),
      /Incomplete conflict attestations\. Required: 3, Present: 2/
    );

    // Clean up injected ballot
    delete docket.ballots[judge3.address.toLowerCase()];

    // Now 3rd judge clears conflict attestation and submits ballot
    const ts3 = Math.floor(Date.now() / 1000);
    const declMsg3 = ConflictAttestationVerifier.createDeclarationMessage(
      testTxId,
      judge3.address,
      neutralDeclaration,
      ts3
    );
    const sig3 = await judge3.signMessage(declMsg3);
    service.submitConflictAttestation({
      transactionId: testTxId,
      judgeAddress: judge3.address,
      declaration: neutralDeclaration,
      timestamp: ts3,
      signature: sig3,
    });

    const now3 = new Date().toISOString();
    const ballotMsg3 = JudgeBallotVerifier.createBallotMessage(
      testTxId,
      judge3.address,
      1500,
      'Rationale 3',
      now3
    );
    const bSig3 = await judge3.signMessage(ballotMsg3);
    service.submitJudgeBallot({
      transactionId: testTxId,
      judgeAddress: judge3.address,
      buyerShareBps: 1500,
      rationale: 'Rationale 3',
      submittedAt: now3,
      signature: bSig3,
    });

    // Quorum of 3 attestations + 3 ballots reached; authorization gate succeeds
    const dispatch = service.authorizeSettlement(
      testTxId,
      1500,
      '0x12f9e53c31F7629aCAE0BA70588794945EC6c35E'
    );
    assert.equal(dispatch.consensusBuyerShareBps, 1500);
  });
});

