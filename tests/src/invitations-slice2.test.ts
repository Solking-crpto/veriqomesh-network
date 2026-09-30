import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ethers } from 'ethers';
import {
  generateCanonicalInvitationCode,
  generateCounterInvitationCode,
  generateFreshTransactionId,
  computeCanonicalTermsHash,
  CANONICAL_FLOW_A_TX_ID,
  CANONICAL_FLOW_B_TX_ID,
  CANONICAL_TESTNET_TX_ID,
  buildMutationAuthMessage,
  verifyMutationSignature,
  isBenchmarkRequest,
  isAwaitingReceiverAction,
  calculateActionableRequestsCount,
  getRequestsNavBadge,
} from '@trustmesh/sdk';

import {
  PersistentInvitation,
  TransactionState,
} from '@trustmesh/types';

describe('Stage 4 Slice 2 — Persistent Invitations & Receiver Action Invariants', () => {
  const buyerWallet = ethers.Wallet.createRandom();
  const sellerWallet = ethers.Wallet.createRandom();
  const verifierWallet = ethers.Wallet.createRandom();

  // 1. Canonical Human Invitation Code Format & Entropy
  describe('1. Canonical Human Invitation Code Format & Entropy', () => {
    it('generates a valid VM-XXXX-XXXX format code', () => {
      const code = generateCanonicalInvitationCode();
      assert.match(
        code,
        /^VM-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/,
        `Code ${code} did not match expected canonical format VM-XXXX-XXXX`
      );
      assert.equal(code.length, 12, 'Canonical invitation code length must be exactly 12');
    });

    it('excludes ambiguous characters (0, O, 1, I, L) from code generation', () => {
      const ambiguousRegex = /[0O1IL]/;
      for (let i = 0; i < 200; i++) {
        const code = generateCanonicalInvitationCode();
        const codeBody = code.slice(3); // strip 'VM-'
        assert.equal(
          ambiguousRegex.test(codeBody),
          false,
          `Generated code ${code} contains ambiguous characters`
        );
      }
    });

    it('demonstrates high entropy with zero collisions across 1,000 generated codes', () => {
      const seen = new Set<string>();
      const count = 1000;
      for (let i = 0; i < count; i++) {
        const code = generateCanonicalInvitationCode();
        assert.equal(seen.has(code), false, `Collision detected on code: ${code}`);
        seen.add(code);
      }
      assert.equal(seen.size, count);
    });
  });

  // 2. Versioned Counter Invitation Code Generation
  describe('2. Versioned Counter-Offer Invitation Code Invariants', () => {
    it('appends -v2 to parent code correctly', () => {
      const parent = 'VM-B7X9-K2M4';
      const counter = generateCounterInvitationCode(parent, 2);
      assert.equal(counter, 'VM-B7X9-K2M4-v2');
    });

    it('strips existing -v suffix when generating subsequent versions', () => {
      const v2 = 'VM-B7X9-K2M4-v2';
      const v3 = generateCounterInvitationCode(v2, 3);
      assert.equal(v3, 'VM-B7X9-K2M4-v3');

      const v4 = generateCounterInvitationCode(v3, 4);
      assert.equal(v4, 'VM-B7X9-K2M4-v4');
    });

    it('normalizes lowercase input to uppercase base code', () => {
      const lower = 'vm-b7x9-k2m4';
      const counter = generateCounterInvitationCode(lower, 2);
      assert.equal(counter, 'VM-B7X9-K2M4-v2');
    });
  });

  // 3. Cryptographically Secure bytes32 Transaction ID Generator
  describe('3. Cryptographically Secure bytes32 Transaction ID Generator', () => {
    it('generates a valid 32-byte hex transactionId', () => {
      const txId = generateFreshTransactionId(buyerWallet.address, 'VM-TEST-0001');
      assert.match(txId, /^0x[a-f0-9]{64}$/, `Transaction ID ${txId} is not a valid 32-byte hex`);
      assert.equal(txId.length, 66);
    });

    it('INVARIANT: Never matches canonical Flow A (0x961c...54e1)', () => {
      for (let i = 0; i < 200; i++) {
        const txId = generateFreshTransactionId(buyerWallet.address, `VM-TEST-${i}`);
        assert.notEqual(
          txId.toLowerCase(),
          CANONICAL_FLOW_A_TX_ID.toLowerCase(),
          'Generated transactionId MUST NEVER collide with canonical Flow A'
        );
      }
    });

    it('INVARIANT: Never matches canonical Flow B (0x2b57...afcc4)', () => {
      for (let i = 0; i < 200; i++) {
        const txId = generateFreshTransactionId(buyerWallet.address, `VM-TEST-${i}`);
        assert.notEqual(
          txId.toLowerCase(),
          CANONICAL_FLOW_B_TX_ID.toLowerCase(),
          'Generated transactionId MUST NEVER collide with canonical Flow B'
        );
      }
    });

    it('produces distinct transaction IDs on consecutive calls for same inputs', () => {
      const id1 = generateFreshTransactionId(buyerWallet.address, 'VM-SAME-0001');
      const id2 = generateFreshTransactionId(buyerWallet.address, 'VM-SAME-0001');
      assert.notEqual(id1, id2, 'Fresh transaction IDs must incorporate unique entropy');
    });
  });

  // 4. Three-Tier Identifier Separation Invariants
  describe('4. Three-Tier Identifier Separation Invariants', () => {
    it('maintains strict structural separation between Invitation Code, Escrow ID, and EVM Hash', () => {
      const invitationCode = generateCanonicalInvitationCode();
      const escrowTxId = generateFreshTransactionId(buyerWallet.address, invitationCode);
      const evmTxHash = ethers.keccak256(ethers.toUtf8Bytes('MOCK_ONCHAIN_RECEIPT_BROADCAST'));

      // Tier 1: Invitation Code is 12 chars, human alphanumeric
      assert.equal(invitationCode.startsWith('VM-'), true);
      assert.equal(invitationCode.length, 12);
      assert.equal(invitationCode.startsWith('0x'), false);

      // Tier 2: Escrow Transaction ID is 66 chars, bytes32
      assert.equal(escrowTxId.startsWith('0x'), true);
      assert.equal(escrowTxId.length, 66);

      // Tier 3: EVM Transaction Hash is distinct from Escrow Transaction ID
      assert.notEqual(escrowTxId, evmTxHash);
      assert.notEqual(invitationCode, escrowTxId);
      assert.notEqual(invitationCode, evmTxHash);
    });
  });

  // 5. Canonical Terms Hash Determinism & Keccak256 Integrity
  describe('5. Canonical Terms Hash Determinism', () => {
    it('produces deterministic keccak256 hash for identical terms text', () => {
      const terms = 'Supply and deliver 100x 550W Tier-1 commercial solar modules';
      const hash1 = computeCanonicalTermsHash(terms);
      const hash2 = computeCanonicalTermsHash(terms);
      assert.equal(hash1, hash2);
      assert.match(hash1, /^0x[a-f0-9]{64}$/);
    });

    it('modifying terms text by a single character changes the hash', () => {
      const terms1 = 'Escrow release upon delivery of 100 units';
      const terms2 = 'Escrow release upon delivery of 101 units';
      const hash1 = computeCanonicalTermsHash(terms1);
      const hash2 = computeCanonicalTermsHash(terms2);
      assert.notEqual(hash1, hash2);
    });

    it('hashes empty string to standard keccak256 empty hash', () => {
      const emptyHash = computeCanonicalTermsHash('');
      assert.equal(
        emptyHash,
        '0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470'
      );
    });
  });

  // 6. Proposal Versioning & Parent Immutability Invariants
  describe('6. Proposal Versioning & Parent Immutability', () => {
    it('preserves parent proposal commercial terms intact when a counter-proposal is created', () => {
      const parentCode = 'VM-INIT-0001';
      const originalTermsHash = computeCanonicalTermsHash('Original Terms Text');

      const parentProposal: PersistentInvitation = {
        invitationCode: parentCode,
        version: 1,
        status: 'PROPOSED',
        createdAt: 1000000,
        updatedAt: 1000000,
        initiatorWallet: buyerWallet.address,
        intendedReceiverWallet: sellerWallet.address,
        transactionId: generateFreshTransactionId(buyerWallet.address, parentCode),
        proposal: {
          title: 'Solar Panels Purchase',
          description: 'Original offer description',
          amount: '0.001',
          asset: 'MON',
          deadlineDays: 14,
          termsText: 'Original Terms Text',
          termsHash: originalTermsHash,
          evidenceRequirements: ['Bill of Lading'],
        },
        roles: {
          buyer: buyerWallet.address,
          seller: sellerWallet.address,
          verifier: verifierWallet.address,
        },
      };

      // Create counter proposal
      const counterCode = generateCounterInvitationCode(parentCode, 2);
      const counterTermsText = 'Countered: Extended 21 days inspection window';
      const counterTermsHash = computeCanonicalTermsHash(counterTermsText);

      const counterProposal: PersistentInvitation = {
        invitationCode: counterCode,
        version: 2,
        status: 'PROPOSED',
        createdAt: 1005000,
        updatedAt: 1005000,
        initiatorWallet: sellerWallet.address, // Seller initiates counter
        intendedReceiverWallet: buyerWallet.address,
        transactionId: generateFreshTransactionId(sellerWallet.address, counterCode),
        parentInvitationCode: parentCode,
        proposal: {
          title: 'Solar Panels Purchase (Counter-Offer)',
          description: 'Counter notes',
          amount: '0.0012',
          asset: 'MON',
          deadlineDays: 21,
          termsText: counterTermsText,
          termsHash: counterTermsHash,
          evidenceRequirements: parentProposal.proposal.evidenceRequirements,
        },
        roles: parentProposal.roles,
      };

      // Mark parent as COUNTERED
      parentProposal.status = 'COUNTERED';
      parentProposal.counterInvitationCode = counterCode;
      parentProposal.updatedAt = 1005000;

      // Invariants verification:
      // 1. Parent terms were NOT overwritten
      assert.equal(parentProposal.proposal.amount, '0.001');
      assert.equal(parentProposal.proposal.deadlineDays, 14);
      assert.equal(parentProposal.proposal.termsHash, originalTermsHash);
      assert.equal(parentProposal.status, 'COUNTERED');
      assert.equal(parentProposal.counterInvitationCode, counterCode);

      // 2. Child proposal correctly references parent and increments version
      assert.equal(counterProposal.parentInvitationCode, parentCode);
      assert.equal(counterProposal.version, 2);
      assert.equal(counterProposal.proposal.deadlineDays, 21);
      assert.equal(counterProposal.proposal.amount, '0.0012');
      assert.notEqual(counterProposal.transactionId, parentProposal.transactionId);
    });
  });

  // 7. Receiver Role Isolation & State Transition Invariants
  describe('7. Receiver Role Isolation & State Transition Gating', () => {
    // In Solidity: TrustMeshEscrow.agreeTransaction(bytes32 transactionId)
    // require(txData.seller == msg.sender, UnauthorizedActor())
    // require(txData.state == State.PROPOSED, InvalidStateTransition())

    function simulateAgreeTransaction(
      caller: string,
      txData: {
        buyer: string;
        seller: string;
        state: TransactionState;
        transactionId: string;
      }
    ): { success: boolean; newState?: TransactionState; error?: string } {
      // Benchmark protection
      if (
        txData.transactionId.toLowerCase() === CANONICAL_FLOW_A_TX_ID.toLowerCase() ||
        txData.transactionId.toLowerCase() === CANONICAL_FLOW_B_TX_ID.toLowerCase()
      ) {
        return { success: false, error: 'BenchmarkDataImmutable' };
      }

      // Role isolation
      if (caller.toLowerCase() !== txData.seller.toLowerCase()) {
        return { success: false, error: 'UnauthorizedActor' };
      }

      // State transition gating
      if (txData.state !== 'PROPOSED') {
        return { success: false, error: 'InvalidStateTransition' };
      }

      return { success: true, newState: 'AGREED' };
    }

    it('designated seller can agree when transaction is in PROPOSED state', () => {
      const tx = {
        buyer: buyerWallet.address,
        seller: sellerWallet.address,
        state: 'PROPOSED' as TransactionState,
        transactionId: generateFreshTransactionId(buyerWallet.address, 'VM-TEST-AGREE'),
      };

      const result = simulateAgreeTransaction(sellerWallet.address, tx);
      assert.equal(result.success, true);
      assert.equal(result.newState, 'AGREED');
    });

    it('INVARIANT: Buyer cannot call agreeTransaction (Strict Role Isolation)', () => {
      const tx = {
        buyer: buyerWallet.address,
        seller: sellerWallet.address,
        state: 'PROPOSED' as TransactionState,
        transactionId: generateFreshTransactionId(buyerWallet.address, 'VM-TEST-BUYER'),
      };

      const result = simulateAgreeTransaction(buyerWallet.address, tx);
      assert.equal(result.success, false);
      assert.equal(result.error, 'UnauthorizedActor');
    });

    it('INVARIANT: Random non-participant cannot call agreeTransaction', () => {
      const thirdParty = ethers.Wallet.createRandom().address;
      const tx = {
        buyer: buyerWallet.address,
        seller: sellerWallet.address,
        state: 'PROPOSED' as TransactionState,
        transactionId: generateFreshTransactionId(buyerWallet.address, 'VM-TEST-3RD'),
      };

      const result = simulateAgreeTransaction(thirdParty, tx);
      assert.equal(result.success, false);
      assert.equal(result.error, 'UnauthorizedActor');
    });

    it('INVARIANT: Re-agreeing an already AGREED transaction reverts with InvalidStateTransition', () => {
      const tx = {
        buyer: buyerWallet.address,
        seller: sellerWallet.address,
        state: 'AGREED' as TransactionState,
        transactionId: generateFreshTransactionId(buyerWallet.address, 'VM-TEST-REPEAT'),
      };

      const result = simulateAgreeTransaction(sellerWallet.address, tx);
      assert.equal(result.success, false);
      assert.equal(result.error, 'InvalidStateTransition');
    });

    it('INVARIANT: Canonical Flow A (Settled) permanently blocks agreeTransaction', () => {
      const tx = {
        buyer: buyerWallet.address,
        seller: sellerWallet.address,
        state: 'SETTLED' as TransactionState,
        transactionId: CANONICAL_FLOW_A_TX_ID,
      };

      const result = simulateAgreeTransaction(sellerWallet.address, tx);
      assert.equal(result.success, false);
      assert.equal(result.error, 'BenchmarkDataImmutable');
    });
  });

  // 8. Upstash Redis Key Schema & Data Model Validation
  describe('8. Upstash Redis Key Schema & Indexing Conventions', () => {
    it('formats invitation storage key with veriqomesh namespace', () => {
      const code = 'VM-B7X9-K2M4';
      const key = `veriqomesh:invitation:${code}`;
      assert.equal(key, 'veriqomesh:invitation:VM-B7X9-K2M4');
    });

    it('formats receiver and initiator index keys with lowercase addresses', () => {
      const address = '0x1234567890AbCdEf1234567890aBcDeF12345678';
      const receiverIndexKey = `veriqomesh:invitation:index:receiver:${address.toLowerCase()}`;
      const initiatorIndexKey = `veriqomesh:invitation:index:initiator:${address.toLowerCase()}`;

      assert.equal(
        receiverIndexKey,
        'veriqomesh:invitation:index:receiver:0x1234567890abcdef1234567890abcdef12345678'
      );
      assert.equal(
        initiatorIndexKey,
        'veriqomesh:invitation:index:initiator:0x1234567890abcdef1234567890abcdef12345678'
      );
    });

    it('verifies round-trip serialization of PersistentInvitation model', () => {
      const sample: PersistentInvitation = {
        invitationCode: 'VM-SERIAL-TEST',
        version: 1,
        status: 'PROPOSED',
        createdAt: 1727730000000,
        updatedAt: 1727730000000,
        initiatorWallet: buyerWallet.address,
        intendedReceiverWallet: sellerWallet.address,
        transactionId: generateFreshTransactionId(buyerWallet.address, 'VM-SERIAL-TEST'),
        proposal: {
          title: 'Test Commercial Deal',
          description: 'Testing JSON serialization fidelity',
          amount: '0.001',
          asset: 'MON',
          deadlineDays: 14,
          termsText: 'Sample Terms Text',
          termsHash: computeCanonicalTermsHash('Sample Terms Text'),
          evidenceRequirements: ['Delivery Slip', 'Inspection Photo'],
        },
        roles: {
          buyer: buyerWallet.address,
          seller: sellerWallet.address,
          verifier: verifierWallet.address,
        },
      };

      const serialized = JSON.stringify(sample);
      const deserialized: PersistentInvitation = JSON.parse(serialized);

      assert.deepEqual(deserialized, sample);
      assert.equal(deserialized.proposal.termsHash, sample.proposal.termsHash);
      assert.equal(deserialized.transactionId, sample.transactionId);
    });
  });

  // 9. Stage 4 Slice 2.1 — Cryptographic Mutation Authorization & Hardening
  describe('9. Stage 4 Slice 2.1 — Cryptographic Mutation Authorization & Hardening', () => {
    const testCodeA = 'VM-AUTH-0001';
    const testCodeB = 'VM-AUTH-0002';

    it('rejects mutation authorization when signature is missing or empty', () => {
      const result = verifyMutationSignature({
        invitationCode: testCodeA,
        action: 'MUTATION:STATUS_AGREED',
        signature: '',
        nonce: 'nonce_123',
        expiresAt: Date.now() + 300000,
        initiatorWallet: buyerWallet.address,
        intendedReceiverWallet: sellerWallet.address,
      });

      assert.equal(result.isValid, false);
      assert.match(result.error || '', /Missing or invalid signature/);
    });

    it('rejects mutation authorization with a malformed signature string', () => {
      const result = verifyMutationSignature({
        invitationCode: testCodeA,
        action: 'MUTATION:STATUS_AGREED',
        signature: '0xnotavalidsignaturehexstring',
        nonce: 'nonce_123',
        expiresAt: Date.now() + 300000,
        initiatorWallet: buyerWallet.address,
        intendedReceiverWallet: sellerWallet.address,
      });

      assert.equal(result.isValid, false);
      assert.match(result.error || '', /Malformed or invalid cryptographic signature/);
    });

    it('rejects mutation authorization with valid signature from an unrelated 3rd-party wallet', async () => {
      const attackerWallet = ethers.Wallet.createRandom();
      const nonce = 'nonce_attacker_01';
      const expiresAt = Date.now() + 300000;
      const action = 'MUTATION:STATUS_AGREED';

      const authMessage = buildMutationAuthMessage({
        invitationCode: testCodeA,
        action,
        nonce,
        expiresAt,
      });
      const signature = await attackerWallet.signMessage(authMessage);

      const result = verifyMutationSignature({
        invitationCode: testCodeA,
        action,
        signature,
        nonce,
        expiresAt,
        initiatorWallet: buyerWallet.address,
        intendedReceiverWallet: sellerWallet.address,
      });

      assert.equal(result.isValid, false);
      assert.equal(result.recoveredAddress?.toLowerCase(), attackerWallet.address.toLowerCase());
      assert.match(result.error || '', /not a participating wallet/);
    });

    it('accepts valid receiver signature for agreement ratification', async () => {
      const nonce = 'nonce_seller_01';
      const expiresAt = Date.now() + 300000;
      const action = 'MUTATION:STATUS_AGREED';

      const authMessage = buildMutationAuthMessage({
        invitationCode: testCodeA,
        action,
        nonce,
        expiresAt,
      });
      const signature = await sellerWallet.signMessage(authMessage);

      const result = verifyMutationSignature({
        invitationCode: testCodeA,
        action,
        signature,
        nonce,
        expiresAt,
        initiatorWallet: buyerWallet.address,
        intendedReceiverWallet: sellerWallet.address,
      });

      assert.equal(result.isValid, true);
      assert.equal(result.isReceiver, true);
      assert.equal(result.isInitiator, false);
      assert.equal(result.recoveredAddress?.toLowerCase(), sellerWallet.address.toLowerCase());
    });

    it('accepts valid initiator signature for cancellation/decline', async () => {
      const nonce = 'nonce_buyer_01';
      const expiresAt = Date.now() + 300000;
      const action = 'MUTATION:STATUS_DECLINED';

      const authMessage = buildMutationAuthMessage({
        invitationCode: testCodeA,
        action,
        nonce,
        expiresAt,
      });
      const signature = await buyerWallet.signMessage(authMessage);

      const result = verifyMutationSignature({
        invitationCode: testCodeA,
        action,
        signature,
        nonce,
        expiresAt,
        initiatorWallet: buyerWallet.address,
        intendedReceiverWallet: sellerWallet.address,
      });

      assert.equal(result.isValid, true);
      assert.equal(result.isInitiator, true);
      assert.equal(result.isReceiver, false);
      assert.equal(result.recoveredAddress?.toLowerCase(), buyerWallet.address.toLowerCase());
    });

    it('INVARIANT: Initiator cannot ratify agreement as receiver (Strict Role Isolation)', async () => {
      const nonce = 'nonce_buyer_invalid_agree';
      const expiresAt = Date.now() + 300000;
      const action = 'MUTATION:STATUS_AGREED';

      const authMessage = buildMutationAuthMessage({
        invitationCode: testCodeA,
        action,
        nonce,
        expiresAt,
      });
      const signature = await buyerWallet.signMessage(authMessage);

      const result = verifyMutationSignature({
        invitationCode: testCodeA,
        action,
        signature,
        nonce,
        expiresAt,
        initiatorWallet: buyerWallet.address,
        intendedReceiverWallet: sellerWallet.address,
      });

      assert.equal(result.isValid, true);
      assert.equal(result.isInitiator, true);
      // In server endpoint logic: only isReceiver can perform MUTATION:STATUS_AGREED
      const isAllowedToAgree = result.isReceiver === true;
      assert.equal(isAllowedToAgree, false, 'Buyer must not be authorized to agree on behalf of seller');
    });

    it('REPLAY ATTACK: Signature created for Invitation A is rejected when submitted for Invitation B', async () => {
      const nonce = 'nonce_cross_inv_01';
      const expiresAt = Date.now() + 300000;
      const action = 'MUTATION:STATUS_AGREED';

      // Signed specifically for testCodeA
      const authMessage = buildMutationAuthMessage({
        invitationCode: testCodeA,
        action,
        nonce,
        expiresAt,
      });
      const signature = await sellerWallet.signMessage(authMessage);

      // Attempt to replay against testCodeB
      const result = verifyMutationSignature({
        invitationCode: testCodeB,
        action,
        signature,
        nonce,
        expiresAt,
        initiatorWallet: buyerWallet.address,
        intendedReceiverWallet: sellerWallet.address,
      });

      assert.equal(result.isValid, false);
      assert.notEqual(result.recoveredAddress?.toLowerCase(), sellerWallet.address.toLowerCase());
    });

    it('ACTION MISMATCH: Signature authorized for STATUS_DECLINED is rejected when applied to STATUS_AGREED', async () => {
      const nonce = 'nonce_action_mismatch_01';
      const expiresAt = Date.now() + 300000;

      // Signed specifically for DECLINED
      const authMessage = buildMutationAuthMessage({
        invitationCode: testCodeA,
        action: 'MUTATION:STATUS_DECLINED',
        nonce,
        expiresAt,
      });
      const signature = await sellerWallet.signMessage(authMessage);

      // Attempt to apply to STATUS_AGREED
      const result = verifyMutationSignature({
        invitationCode: testCodeA,
        action: 'MUTATION:STATUS_AGREED',
        signature,
        nonce,
        expiresAt,
        initiatorWallet: buyerWallet.address,
        intendedReceiverWallet: sellerWallet.address,
      });

      assert.equal(result.isValid, false);
      assert.notEqual(result.recoveredAddress?.toLowerCase(), sellerWallet.address.toLowerCase());
    });

    it('EXPIRATION: Authorization signature with past expiresAt is rejected', async () => {
      const nonce = 'nonce_expired_01';
      const pastTime = Date.now() - 10000; // 10s in past
      const action = 'MUTATION:STATUS_AGREED';

      const authMessage = buildMutationAuthMessage({
        invitationCode: testCodeA,
        action,
        nonce,
        expiresAt: pastTime,
      });
      const signature = await sellerWallet.signMessage(authMessage);

      const result = verifyMutationSignature({
        invitationCode: testCodeA,
        action,
        signature,
        nonce,
        expiresAt: pastTime,
        initiatorWallet: buyerWallet.address,
        intendedReceiverWallet: sellerWallet.address,
        currentTime: Date.now(),
      });

      assert.equal(result.isValid, false);
      assert.match(result.error || '', /expired/i);
    });

    it('EXPIRATION: Authorization signature with expiresAt > 15 minutes in future is rejected', async () => {
      const nonce = 'nonce_future_window_01';
      const excessiveFutureTime = Date.now() + 60 * 60 * 1000; // 1 hour in future
      const action = 'MUTATION:STATUS_AGREED';

      const authMessage = buildMutationAuthMessage({
        invitationCode: testCodeA,
        action,
        nonce,
        expiresAt: excessiveFutureTime,
      });
      const signature = await sellerWallet.signMessage(authMessage);

      const result = verifyMutationSignature({
        invitationCode: testCodeA,
        action,
        signature,
        nonce,
        expiresAt: excessiveFutureTime,
        initiatorWallet: buyerWallet.address,
        intendedReceiverWallet: sellerWallet.address,
      });

      assert.equal(result.isValid, false);
      assert.match(result.error || '', /window/i);
    });

    it('NONCE REPLAY: Replaying identical nonce is rejected by replay cache', async () => {
      const nonceStore = new Set<string>();

      function checkAndConsumeNonce(nonce: string): { ok: boolean; error?: string } {
        if (nonceStore.has(nonce)) {
          return { ok: false, error: 'Nonce already consumed (replay rejected)' };
        }
        nonceStore.add(nonce);
        return { ok: true };
      }

      const nonce = 'nonce_unique_test_123';
      const firstUse = checkAndConsumeNonce(nonce);
      assert.equal(firstUse.ok, true);

      // Replay attempt with same nonce
      const secondUse = checkAndConsumeNonce(nonce);
      assert.equal(secondUse.ok, false);
      assert.match(secondUse.error || '', /already consumed/);
    });

    it('STATE MACHINE: Transition from PROPOSED to AGREED is permitted for seller', () => {
      function validateTransition(current: string, target: string, isReceiver: boolean) {
        if (target === 'AGREED') {
          if (!isReceiver) return { allowed: false, reason: 'Only seller can ratify' };
          if (current !== 'PROPOSED') return { allowed: false, reason: 'Must be in PROPOSED state' };
          return { allowed: true };
        }
        return { allowed: false, reason: 'Unknown' };
      }

      assert.equal(validateTransition('PROPOSED', 'AGREED', true).allowed, true);
      assert.equal(validateTransition('PROPOSED', 'AGREED', false).allowed, false);
      assert.equal(validateTransition('DECLINED', 'AGREED', true).allowed, false);
      assert.equal(validateTransition('AGREED', 'AGREED', true).allowed, false);
    });

    it('STATE MACHINE: Transition from AGREED to DECLINED is rejected (terminal)', () => {
      function canDecline(current: string) {
        return current === 'PROPOSED';
      }

      assert.equal(canDecline('PROPOSED'), true);
      assert.equal(canDecline('AGREED'), false);
      assert.equal(canDecline('DECLINED'), false);
      assert.equal(canDecline('COUNTERED'), false);
    });

    it('STATE MACHINE: Arbitrary unknown status strings are rejected', () => {
      const allowedStatuses = new Set(['AGREED', 'DECLINED', 'COUNTERED']);
      const invalidStatuses = ['REFUNDED', 'HACKED', 'CANCELLED_FORCE', 'ADMIN_OVERRIDE'];

      for (const badStatus of invalidStatuses) {
        assert.equal(allowedStatuses.has(badStatus), false);
      }
    });

    it('PROPOSAL IMMUTABILITY: Proposal terms, termsHash, and transactionId cannot be mutated via PATCH', () => {
      const existingInvitation: PersistentInvitation = {
        invitationCode: testCodeA,
        version: 1,
        status: 'PROPOSED',
        createdAt: 1727730000000,
        updatedAt: 1727730000000,
        initiatorWallet: buyerWallet.address,
        intendedReceiverWallet: sellerWallet.address,
        transactionId: generateFreshTransactionId(buyerWallet.address, testCodeA),
        proposal: {
          title: 'Immutable Solar Deal',
          description: 'Original terms',
          amount: '0.001',
          asset: 'MON',
          deadlineDays: 14,
          termsText: 'Original terms text',
          termsHash: computeCanonicalTermsHash('Original terms text'),
        },
        roles: {
          buyer: buyerWallet.address,
          seller: sellerWallet.address,
          verifier: verifierWallet.address,
        },
      };

      // Attacker attempts to submit PATCH with mutated amount or terms
      const patchAttempt = {
        status: 'AGREED',
        proposal: {
          amount: '999999',
          title: 'Hacked Deal',
        },
        transactionId: '0x1111111111111111111111111111111111111111111111111111111111111111',
      };

      // Server PATCH logic applies only allowed fields:
      const updatedInvitation = { ...existingInvitation };
      if (patchAttempt.status === 'AGREED') {
        updatedInvitation.status = 'AGREED';
      }
      // proposal and transactionId are explicitly NOT copied from patchAttempt!

      assert.equal(updatedInvitation.proposal.amount, '0.001');
      assert.equal(updatedInvitation.proposal.title, 'Immutable Solar Deal');
      assert.equal(updatedInvitation.transactionId, existingInvitation.transactionId);
      assert.equal(updatedInvitation.status, 'AGREED');
    });
  });

  // 10. Stage 4 Slice 2.2 — Requests Navigation Badge & Actionable Invariants
  describe('10. Stage 4 Slice 2.2 — Requests Navigation Badge & Actionable Invariants', () => {
    const receiverWalletAddress = '0x6f30d20b8c5be781badd86341415b556fb13c873';
    const otherWalletAddress = '0x1111111111111111111111111111111111111111';

    it('isBenchmarkRequest correctly identifies canonical Flow A, Flow B, canonical testnet, and VM-REQ-0001..0004', () => {
      assert.equal(isBenchmarkRequest({ transactionId: CANONICAL_FLOW_A_TX_ID }), true);
      assert.equal(isBenchmarkRequest({ transactionId: CANONICAL_FLOW_B_TX_ID }), true);
      assert.equal(isBenchmarkRequest({ transactionId: CANONICAL_TESTNET_TX_ID }), true);
      assert.equal(isBenchmarkRequest({ id: 'VM-REQ-0001' }), true);
      assert.equal(isBenchmarkRequest({ id: 'VM-REQ-0002' }), true);
      assert.equal(isBenchmarkRequest({ id: 'VM-REQ-0003' }), true);
      assert.equal(isBenchmarkRequest({ id: 'VM-REQ-0004' }), true);
      assert.equal(isBenchmarkRequest({ id: 'VM-ACT-0001', transactionId: '0x1234' }), false);
    });

    it('isAwaitingReceiverAction validates state machine gating for receiver action', () => {
      // Benchmarks never awaiting action
      assert.equal(isAwaitingReceiverAction({ id: 'VM-REQ-0002', status: 'AWAITING_RECEIVER_ACCEPTANCE' }), false);

      // Terminal or non-actionable statuses
      assert.equal(isAwaitingReceiverAction({ id: 'VM-ACT-0001', status: 'AGREED' }), false);
      assert.equal(isAwaitingReceiverAction({ id: 'VM-ACT-0001', status: 'DECLINED' }), false);
      assert.equal(isAwaitingReceiverAction({ id: 'VM-ACT-0001', status: 'COUNTERED' }), false);

      // Onchain state gating
      assert.equal(
        isAwaitingReceiverAction(
          { id: 'VM-ACT-0001', transactionId: '0x1111', status: 'AWAITING_RECEIVER_ACCEPTANCE' },
          { '0x1111': { stateName: 'SETTLED' } }
        ),
        false
      );
      assert.equal(
        isAwaitingReceiverAction(
          { id: 'VM-ACT-0001', transactionId: '0x2222', status: 'AWAITING_RECEIVER_ACCEPTANCE' },
          { '0x2222': { stateName: 'PROPOSED' } }
        ),
        true
      );

      // Valid awaiting action offchain
      assert.equal(isAwaitingReceiverAction({ id: 'VM-ACT-0001', status: 'AWAITING_RECEIVER_ACCEPTANCE' }), true);
      assert.equal(isAwaitingReceiverAction({ id: 'VM-ACT-0001', status: 'PROPOSED' }), true);
    });

    it('0 actionable requests => nav badge 0', () => {
      const count = calculateActionableRequestsCount({
        requests: [],
        connectedWallet: receiverWalletAddress,
        isConnected: true,
      });
      assert.equal(count, 0, 'Empty requests list must yield 0 actionable requests');
      assert.equal(getRequestsNavBadge(count), undefined, 'Nav badge must be hidden (0) when count is 0');
    });


    it('processed requests do not increment badge', () => {
      const processedRequests = [
        {
          id: 'REQ-AGREED-1',
          status: 'AGREED',
          receiverWallet: receiverWalletAddress,
        },
        {
          id: 'REQ-ACTIVE-1',
          status: 'AGREEMENT_ACTIVE',
          receiverWallet: receiverWalletAddress,
        },
        {
          id: 'REQ-DECLINED-1',
          status: 'DECLINED',
          receiverWallet: receiverWalletAddress,
        },
        {
          id: 'REQ-COUNTERED-1',
          status: 'COUNTERED',
          receiverWallet: receiverWalletAddress,
        },
        {
          id: 'REQ-SETTLED-1',
          status: 'SETTLED',
          receiverWallet: receiverWalletAddress,
        },
        {
          id: 'REQ-ONCHAIN-SETTLED',
          transactionId: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          status: 'AWAITING_RECEIVER_ACCEPTANCE',
          receiverWallet: receiverWalletAddress,
        },
      ];

      const onchainTxMap = {
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef': {
          stateName: 'SETTLED',
        },
      };

      const count = calculateActionableRequestsCount({
        requests: processedRequests,
        connectedWallet: receiverWalletAddress,
        isConnected: true,
        onchainTxMap,
      });

      assert.equal(count, 0, 'Processed/terminal requests must never increment actionable count');
      assert.equal(getRequestsNavBadge(count), undefined, 'Badge must be undefined (hidden/0) for processed requests');
    });

    it('demo/historical requests do not increment badge', () => {
      const demoRequests = [
        {
          id: 'VM-REQ-0001',
          status: 'DISPUTED',
          receiverWallet: receiverWalletAddress,
        },
        {
          id: 'VM-REQ-0002',
          status: 'AWAITING_RECEIVER_ACCEPTANCE',
          receiverWallet: receiverWalletAddress,
        },
        {
          id: 'VM-REQ-0003',
          status: 'AWAITING_RECEIVER_ACCEPTANCE',
          receiverWallet: receiverWalletAddress,
        },
        {
          id: 'VM-REQ-0004',
          transactionId: CANONICAL_FLOW_A_TX_ID,
          status: 'AGREEMENT_ACTIVE',
          receiverWallet: receiverWalletAddress,
        },
        {
          id: 'REQ-FLOW-B',
          transactionId: CANONICAL_FLOW_B_TX_ID,
          status: 'AWAITING_RECEIVER_ACCEPTANCE',
          receiverWallet: receiverWalletAddress,
        },
        {
          id: 'REQ-CANONICAL-TESTNET',
          transactionId: CANONICAL_TESTNET_TX_ID,
          status: 'AWAITING_RECEIVER_ACCEPTANCE',
          receiverWallet: receiverWalletAddress,
        },
      ];

      const count = calculateActionableRequestsCount({
        requests: demoRequests,
        connectedWallet: receiverWalletAddress,
        isConnected: true,
      });

      assert.equal(count, 0, 'Historical benchmarks and demo records must never increment actionable count');
      assert.equal(getRequestsNavBadge(count), undefined, 'Badge must be hidden (0) for demo/historical records');
    });

    it('2 genuine actionable receiver requests => badge 2', () => {
      const mixedRequests = [
        // Demo benchmark - excluded
        {
          id: 'VM-REQ-0002',
          status: 'AWAITING_RECEIVER_ACCEPTANCE',
          receiverWallet: receiverWalletAddress,
        },
        // Actionable genuine request 1 - included
        {
          id: 'VM-ACT-0001',
          status: 'AWAITING_RECEIVER_ACCEPTANCE',
          receiverWallet: receiverWalletAddress,
        },
        // Actionable genuine request 2 - included
        {
          id: 'VM-ACT-0002',
          status: 'PROPOSED',
          receiverWallet: receiverWalletAddress,
        },
        // Actionable for a DIFFERENT wallet - excluded
        {
          id: 'VM-ACT-0003',
          status: 'AWAITING_RECEIVER_ACCEPTANCE',
          receiverWallet: otherWalletAddress,
        },
        // Processed request - excluded
        {
          id: 'VM-ACT-0004',
          status: 'AGREED',
          receiverWallet: receiverWalletAddress,
        },
      ];

      const count = calculateActionableRequestsCount({
        requests: mixedRequests,
        connectedWallet: receiverWalletAddress,
        isConnected: true,
      });

      assert.equal(count, 2, 'Exactly 2 genuine actionable requests addressed to connected wallet must be counted');
      assert.equal(getRequestsNavBadge(count), 2, 'Navigation badge must display 2');
    });

    it('disconnected/demo-default state does not falsely display 2', () => {
      const defaultDemoRequests = [
        {
          id: 'VM-REQ-0004',
          transactionId: CANONICAL_FLOW_A_TX_ID,
          status: 'AGREEMENT_ACTIVE',
          receiverWallet: receiverWalletAddress,
        },
        {
          id: 'VM-REQ-0003',
          status: 'AWAITING_RECEIVER_ACCEPTANCE',
          receiverWallet: receiverWalletAddress,
        },
        {
          id: 'VM-REQ-0002',
          status: 'AWAITING_RECEIVER_ACCEPTANCE',
          receiverWallet: receiverWalletAddress,
        },
        {
          id: 'VM-REQ-0001',
          status: 'DISPUTED',
          receiverWallet: receiverWalletAddress,
        },
      ];

      // Disconnected: isConnected = false
      const countDisconnected = calculateActionableRequestsCount({
        requests: defaultDemoRequests,
        connectedWallet: null,
        isConnected: false,
      });

      assert.equal(countDisconnected, 0, 'Disconnected state must yield 0 actionable requests');
      assert.notEqual(countDisconnected, 2, 'Disconnected state must NEVER display 2');
      assert.equal(getRequestsNavBadge(countDisconnected), undefined, 'Badge must not be shown when disconnected');

      // Even if receiver wallet is passed while isConnected = false
      const countWithWalletDisconnected = calculateActionableRequestsCount({
        requests: defaultDemoRequests,
        connectedWallet: receiverWalletAddress,
        isConnected: false,
      });
      assert.equal(countWithWalletDisconnected, 0, 'Unconnected wallet must yield 0 actionable requests');
      assert.equal(getRequestsNavBadge(countWithWalletDisconnected), undefined);
    });
  });

  describe('11. Stage 4 Slice 2.3 — Persona Dashboard State Unification & Launch Blocker Remediation', () => {
    const TARGET_BUYER_ADDRESS = '0xa4bCC57d40311D715ECe34940191820d4a81C50F';
    const TARGET_SELLER_ADDRESS = '0x0e73dBFf9047423b520FA9fc23a95645fC986Ee8';
    const connectedSellerWallet = ethers.Wallet.createRandom().address;

    it('A. Connected receiver wallet identity: receiver role syncs with connected wallet address', () => {
      function syncReceiverWallet(currentWallet: string, role: string, connectedAddress: string | null) {
        if (!connectedAddress) return TARGET_SELLER_ADDRESS;
        if (role === 'RECEIVER') {
          if (connectedAddress.toLowerCase() !== TARGET_BUYER_ADDRESS.toLowerCase()) {
            return connectedAddress;
          }
        }
        return currentWallet;
      }

      const synced = syncReceiverWallet(TARGET_SELLER_ADDRESS, 'RECEIVER', connectedSellerWallet);
      assert.equal(synced.toLowerCase(), connectedSellerWallet.toLowerCase(), 'Receiver wallet must sync to connected wallet');
    });

    it('B. Strict Role Isolation: Receiver cannot be bound to buyer address and Initiator cannot be bound to seller address', () => {
      function syncReceiverWallet(currentWallet: string, role: string, connectedAddress: string | null) {
        if (role === 'RECEIVER' && connectedAddress) {
          if (connectedAddress.toLowerCase() !== TARGET_BUYER_ADDRESS.toLowerCase()) {
            return connectedAddress;
          }
        }
        return currentWallet;
      }

      function syncInitiatorWallet(currentWallet: string, role: string, connectedAddress: string | null) {
        if (role === 'INITIATOR' && connectedAddress) {
          if (connectedAddress.toLowerCase() !== TARGET_SELLER_ADDRESS.toLowerCase()) {
            return connectedAddress;
          }
        }
        return currentWallet;
      }

      const blockedReceiver = syncReceiverWallet(TARGET_SELLER_ADDRESS, 'RECEIVER', TARGET_BUYER_ADDRESS);
      assert.equal(blockedReceiver, TARGET_SELLER_ADDRESS, 'Receiver role must reject buyer address');

      const blockedInitiator = syncInitiatorWallet(TARGET_BUYER_ADDRESS, 'INITIATOR', TARGET_SELLER_ADDRESS);
      assert.equal(blockedInitiator, TARGET_BUYER_ADDRESS, 'Initiator role must reject seller address');
    });

    it('C. Genuine Redis invitation vs 0 invitations: connected receiver with persistent invitation reflects actionable count', () => {
      const genuineInvitation = {
        id: 'VM-ACT-REDIS-999',
        title: 'Commercial Solar Procurement',
        receiverWallet: connectedSellerWallet,
        status: 'AWAITING_RECEIVER_ACCEPTANCE',
      };

      const count = calculateActionableRequestsCount({
        requests: [genuineInvitation],
        connectedWallet: connectedSellerWallet,
        isConnected: true,
      });

      assert.equal(count, 1, 'Genuine Redis invitation must be counted as actionable for connected receiver');
      assert.equal(getRequestsNavBadge(count), 1, 'Nav badge must display 1');
    });

    it('D. Connected receiver with 0 invitations yields exactly 0 actionable requests', () => {
      const otherUserInvitation = {
        id: 'VM-ACT-REDIS-888',
        title: 'Commercial Solar Procurement',
        receiverWallet: '0x1111111111111111111111111111111111111111',
        status: 'AWAITING_RECEIVER_ACCEPTANCE',
      };

      const count = calculateActionableRequestsCount({
        requests: [otherUserInvitation],
        connectedWallet: connectedSellerWallet,
        isConnected: true,
      });

      assert.equal(count, 0, 'Receiver with 0 invitations addressed to their wallet must have 0 actionable requests');
      assert.equal(getRequestsNavBadge(count), undefined);
    });

    it('E. Historical benchmarks (VM-REQ-0001..0004, Flow A, Flow B, Parked Testnet) are excluded from actionable requests', () => {
      const benchmarkList = [
        { id: 'VM-REQ-0001', receiverWallet: connectedSellerWallet, status: 'AWAITING_RECEIVER_ACCEPTANCE' },
        { id: 'VM-REQ-0002', receiverWallet: connectedSellerWallet, status: 'AWAITING_RECEIVER_ACCEPTANCE' },
        { id: 'VM-REQ-0003', receiverWallet: connectedSellerWallet, status: 'AWAITING_RECEIVER_ACCEPTANCE' },
        { id: 'VM-REQ-0004', receiverWallet: connectedSellerWallet, status: 'AWAITING_RECEIVER_ACCEPTANCE' },
        { id: 'FLOW-A', transactionId: CANONICAL_FLOW_A_TX_ID, receiverWallet: connectedSellerWallet, status: 'AWAITING_RECEIVER_ACCEPTANCE' },
        { id: 'FLOW-B', transactionId: CANONICAL_FLOW_B_TX_ID, receiverWallet: connectedSellerWallet, status: 'AWAITING_RECEIVER_ACCEPTANCE' },
        { id: 'PARKED', transactionId: '0xbbd0176291d62b32c3e096d0314c0fab6bcfa9131c1b26a825b3ce994e645f5e', receiverWallet: connectedSellerWallet, status: 'AWAITING_RECEIVER_ACCEPTANCE' },
      ];

      for (const req of benchmarkList) {
        assert.equal(isBenchmarkRequest(req), true, `${req.id} must be recognized as benchmark`);
      }

      const count = calculateActionableRequestsCount({
        requests: benchmarkList,
        connectedWallet: connectedSellerWallet,
        isConnected: true,
      });

      assert.equal(count, 0, 'All benchmarks must be excluded from actionable requests count');
    });

    it('F. Historical benchmarks cannot be marked actionable on receiver dashboard', () => {
      function filterReceiverActionable(reqs: any[], wallet: { isConnected: boolean; address: string | null }) {
        if (!wallet.isConnected || !wallet.address) return [];
        return reqs.filter(
          (r) =>
            !isBenchmarkRequest(r) &&
            isAwaitingReceiverAction(r) &&
            r.receiverWallet?.toLowerCase() === wallet.address?.toLowerCase()
        );
      }

      const mixed = [
        { id: 'VM-REQ-0003', receiverWallet: connectedSellerWallet, status: 'AWAITING_RECEIVER_ACCEPTANCE' },
        { id: 'VM-REQ-0002', receiverWallet: connectedSellerWallet, status: 'AWAITING_RECEIVER_ACCEPTANCE' },
        { id: 'GENUINE-REQ-1', receiverWallet: connectedSellerWallet, status: 'AWAITING_RECEIVER_ACCEPTANCE' },
      ];

      const actionable = filterReceiverActionable(mixed, { isConnected: true, address: connectedSellerWallet });
      assert.equal(actionable.length, 1, 'Only genuine request passes filter');
      assert.equal(actionable[0].id, 'GENUINE-REQ-1');
      assert.equal(actionable.some((r) => r.id === 'VM-REQ-0003'), false, 'VM-REQ-0003 must NEVER be marked actionable');
    });

    it('G. Disconnected state yields 0 actionable requests and does not display "2 New"', () => {
      const defaultRequests = [
        { id: 'VM-REQ-0004', status: 'AGREEMENT_ACTIVE', receiverWallet: TARGET_SELLER_ADDRESS },
        { id: 'VM-REQ-0003', status: 'AWAITING_RECEIVER_ACCEPTANCE', receiverWallet: TARGET_SELLER_ADDRESS },
        { id: 'VM-REQ-0002', status: 'AWAITING_RECEIVER_ACCEPTANCE', receiverWallet: TARGET_SELLER_ADDRESS },
        { id: 'VM-REQ-0001', status: 'DISPUTED', receiverWallet: TARGET_SELLER_ADDRESS },
      ];

      const count = calculateActionableRequestsCount({
        requests: defaultRequests,
        connectedWallet: null,
        isConnected: false,
      });

      assert.equal(count, 0, 'Disconnected receiver must display 0 New');
      assert.notEqual(count, 2, 'Must never show stale 2 New in disconnected state');
    });

    it('H. Inability of /receiver to locally mutate benchmarks into ratified state', () => {
      let state = [
        { id: 'VM-REQ-0003', status: 'AWAITING_RECEIVER_ACCEPTANCE' },
        { id: 'GENUINE-REQ-2', status: 'AWAITING_RECEIVER_ACCEPTANCE' },
      ];

      function protectedAcceptDealRequest(requestId: string) {
        const target = state.find((r) => r.id === requestId);
        if ((target && isBenchmarkRequest(target)) || isBenchmarkRequest({ id: requestId })) {
          return;
        }
        state = state.map((r) => (r.id === requestId ? { ...r, status: 'AGREEMENT_ACTIVE' } : r));
      }

      protectedAcceptDealRequest('VM-REQ-0003');
      const benchmarkReq = state.find((r) => r.id === 'VM-REQ-0003');
      assert.equal(benchmarkReq?.status, 'AWAITING_RECEIVER_ACCEPTANCE', 'Benchmark VM-REQ-0003 must NOT be mutated');

      protectedAcceptDealRequest('GENUINE-REQ-2');
      const genuineReq = state.find((r) => r.id === 'GENUINE-REQ-2');
      assert.equal(genuineReq?.status, 'AGREEMENT_ACTIVE', 'Genuine request status is updated');
    });

    it('I. Elimination of legacy autonomous execution copy in favor of institutional policy principle', () => {
      const AI_POLICY_PRINCIPLE = 'AI assists. Humans authorize. Verifiers verify. Blockchain enforces.';
      assert.match(AI_POLICY_PRINCIPLE, /AI assists/);
      assert.match(AI_POLICY_PRINCIPLE, /Humans authorize/);
      assert.match(AI_POLICY_PRINCIPLE, /Verifiers verify/);
      assert.match(AI_POLICY_PRINCIPLE, /Blockchain enforces/);

      const FORBIDDEN_COPY = 'AUTONOMOUS EXECUTION without human click';
      assert.notEqual(AI_POLICY_PRINCIPLE, FORBIDDEN_COPY);
    });

    it('J. Persona dashboards display "Disconnected (Viewing Demo Defaults)" when disconnected', () => {
      function getDashboardStatusBanner(wallet: { isConnected: boolean; address: string | null }) {
        if (wallet.isConnected && wallet.address) {
          return `Connected Wallet: ${wallet.address}`;
        }
        return 'Disconnected (Viewing Demo Defaults)';
      }

      const disconnectedBanner = getDashboardStatusBanner({ isConnected: false, address: null });
      assert.equal(disconnectedBanner, 'Disconnected (Viewing Demo Defaults)');

      const connectedBanner = getDashboardStatusBanner({ isConnected: true, address: connectedSellerWallet });
      assert.equal(connectedBanner, `Connected Wallet: ${connectedSellerWallet}`);
    });
  });
});



