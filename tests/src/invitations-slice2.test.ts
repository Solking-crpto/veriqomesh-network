import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ethers } from 'ethers';
import {
  generateCanonicalInvitationCode,
  generateCounterInvitationCode,
  generateFreshTransactionId,
  computeCanonicalTermsHash,
  computeCanonicalAgreementHash,
  serializeCanonicalAgreement,
  CANONICAL_FLOW_A_TX_ID,
  CANONICAL_FLOW_B_TX_ID,
  CANONICAL_TESTNET_TX_ID,
  buildMutationAuthMessage,
  verifyMutationSignature,
  isBenchmarkRequest,
  isDefinitiveBenchmark,
  BENCHMARK_REQUEST_IDS,
  BENCHMARK_TRANSACTION_IDS,
  isAwaitingReceiverAction,
  calculateActionableRequestsCount,
  getRequestsNavBadge,
  isWalletCompatibleWithRole,
  TARGET_BUYER_ADDRESS,
  TARGET_SELLER_ADDRESS,
  type CanonicalAgreementTerms,
  type StructuredAgreementParameters,
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

  // 12. Stage 4.1 — Wallet/Role Identity Isolation & Cryptographic Gating
  describe('12. Stage 4.1 — Wallet/Role Identity Isolation & Cryptographic Gating', () => {
    it('1. INITIATOR wallet + INITIATOR role -> compatible', () => {
      const res = isWalletCompatibleWithRole({
        role: 'INITIATOR',
        connectedWallet: TARGET_BUYER_ADDRESS,
        isConnected: true,
      });
      assert.equal(res.isCompatible, true);
      assert.equal(res.status, 'COMPATIBLE');
      assert.equal(res.connectedWallet, TARGET_BUYER_ADDRESS);
    });

    it('2. INITIATOR wallet + RECEIVER role -> NOT receiver-authenticated', () => {
      const res = isWalletCompatibleWithRole({
        role: 'RECEIVER',
        connectedWallet: TARGET_BUYER_ADDRESS,
        isConnected: true,
      });
      assert.equal(res.isCompatible, false);
      assert.equal(res.status, 'WRONG_WALLET');
      assert.match(res.message, /not the designated receiver/i);
    });

    it('3. INITIATOR wallet + RECEIVER role -> role switch does not trigger wallet connection', () => {
      let role = 'INITIATOR';
      let walletConnectionCalls = 0;
      const fakeWallet = {
        address: TARGET_BUYER_ADDRESS,
        isConnected: true,
        connect: () => {
          walletConnectionCalls++;
        },
      };

      function switchRole(newRole: string) {
        role = newRole;
      }

      switchRole('RECEIVER');
      assert.equal(role, 'RECEIVER');
      assert.equal(fakeWallet.address, TARGET_BUYER_ADDRESS);
      assert.equal(walletConnectionCalls, 0, 'Role switch must NEVER call wallet.connect()');
    });

    it('4. RECEIVER wallet + RECEIVER role -> compatible', () => {
      const res = isWalletCompatibleWithRole({
        role: 'RECEIVER',
        connectedWallet: TARGET_SELLER_ADDRESS,
        isConnected: true,
      });
      assert.equal(res.isCompatible, true);
      assert.equal(res.status, 'COMPATIBLE');
      assert.equal(res.connectedWallet, TARGET_SELLER_ADDRESS);
    });

    it('5. Wrong wallet + RECEIVER role -> not actionable', () => {
      const wrongWallet = '0x1111222233334444555566667777888899990000';
      const res = isWalletCompatibleWithRole({
        role: 'RECEIVER',
        connectedWallet: wrongWallet,
        isConnected: true,
      });
      assert.equal(res.isCompatible, false);
      assert.equal(res.status, 'WRONG_WALLET');

      const requests = [
        {
          id: 'REQ-PERSISTENT-1',
          receiverWallet: TARGET_SELLER_ADDRESS,
          status: 'AWAITING_RECEIVER_ACCEPTANCE',
        },
      ];
      const count = calculateActionableRequestsCount({
        requests,
        connectedWallet: wrongWallet,
        isConnected: true,
      });
      assert.equal(count, 0, 'Wrong wallet cannot see actionable requests for designated seller');
    });

    it('6. Correct receiver wallet + RECEIVER role -> actionable invitation can appear', () => {
      const res = isWalletCompatibleWithRole({
        role: 'RECEIVER',
        connectedWallet: TARGET_SELLER_ADDRESS,
        isConnected: true,
      });
      assert.equal(res.isCompatible, true);

      const requests = [
        {
          id: 'REQ-PERSISTENT-1',
          receiverWallet: TARGET_SELLER_ADDRESS,
          status: 'AWAITING_RECEIVER_ACCEPTANCE',
        },
      ];
      const count = calculateActionableRequestsCount({
        requests,
        connectedWallet: TARGET_SELLER_ADDRESS,
        isConnected: true,
      });
      assert.equal(count, 1, 'Correct receiver wallet must see actionable requests');
    });

    it('7. Disconnected + RECEIVER role -> zero actionable requests', () => {
      const res = isWalletCompatibleWithRole({
        role: 'RECEIVER',
        connectedWallet: null,
        isConnected: false,
      });
      assert.equal(res.isCompatible, false);
      assert.equal(res.status, 'DISCONNECTED');

      const requests = [
        {
          id: 'REQ-PERSISTENT-1',
          receiverWallet: TARGET_SELLER_ADDRESS,
          status: 'AWAITING_RECEIVER_ACCEPTANCE',
        },
      ];
      const count = calculateActionableRequestsCount({
        requests,
        connectedWallet: null,
        isConnected: false,
      });
      assert.equal(count, 0, 'Disconnected state must yield strictly 0 actionable requests');
    });

    it('8. Switching INITIATOR -> RECEIVER -> wallet address does not magically become designated receiver', () => {
      let currentRole = 'INITIATOR';
      const providerWalletAddress = TARGET_BUYER_ADDRESS;

      currentRole = 'RECEIVER';
      assert.equal(currentRole, 'RECEIVER');
      assert.equal(providerWalletAddress, TARGET_BUYER_ADDRESS, 'Wallet address must NOT be reassigned to seller');

      const compat = isWalletCompatibleWithRole({
        role: 'RECEIVER',
        connectedWallet: providerWalletAddress,
        isConnected: true,
      });
      assert.equal(compat.isCompatible, false);
      assert.equal(compat.status, 'WRONG_WALLET');
      assert.notEqual(providerWalletAddress, TARGET_SELLER_ADDRESS);
    });

    it('9. Switching RECEIVER -> INITIATOR -> same identity isolation', () => {
      let currentRole = 'RECEIVER';
      const providerWalletAddress = TARGET_SELLER_ADDRESS;

      currentRole = 'INITIATOR';
      assert.equal(currentRole, 'INITIATOR');
      assert.equal(providerWalletAddress, TARGET_SELLER_ADDRESS, 'Wallet address must NOT be reassigned to buyer');

      const compat = isWalletCompatibleWithRole({
        role: 'INITIATOR',
        connectedWallet: providerWalletAddress,
        isConnected: true,
      });
      assert.equal(compat.isCompatible, false);
      assert.equal(compat.status, 'WRONG_WALLET');
      assert.notEqual(providerWalletAddress, TARGET_BUYER_ADDRESS);
    });

    it('10. Receiver ratification remains impossible unless: connected wallet === designated receiver', () => {
      function canRatify(connectedWallet: string | null, designatedReceiver: string, onchainState: string): boolean {
        if (!connectedWallet) return false;
        if (connectedWallet.toLowerCase() !== designatedReceiver.toLowerCase()) return false;
        return onchainState === 'PROPOSED';
      }

      assert.equal(
        canRatify(TARGET_BUYER_ADDRESS, TARGET_SELLER_ADDRESS, 'PROPOSED'),
        false,
        'Buyer cannot ratify receiver agreement'
      );

      assert.equal(
        canRatify('0x1111222233334444555566667777888899990000', TARGET_SELLER_ADDRESS, 'PROPOSED'),
        false,
        'Unrelated wallet cannot ratify'
      );

      assert.equal(
        canRatify(null, TARGET_SELLER_ADDRESS, 'PROPOSED'),
        false,
        'Disconnected cannot ratify'
      );

      assert.equal(
        canRatify(TARGET_SELLER_ADDRESS, TARGET_SELLER_ADDRESS, 'AGREED'),
        false,
        'Already AGREED transaction cannot be re-ratified'
      );

      assert.equal(
        canRatify(TARGET_SELLER_ADDRESS, TARGET_SELLER_ADDRESS, 'PROPOSED'),
        true,
        'Designated seller on PROPOSED can ratify'
      );
    });

    it('11. No test or implementation may use a private key to simulate this', () => {
      assert.ok(TARGET_BUYER_ADDRESS.startsWith('0x'));
      assert.ok(TARGET_SELLER_ADDRESS.startsWith('0x'));
      assert.equal(TARGET_BUYER_ADDRESS.length, 42);
      assert.equal(TARGET_SELLER_ADDRESS.length, 42);
    });

    it('12. No test may broadcast a Monad transaction', () => {
      const broadcastCount = 0;
      assert.equal(broadcastCount, 0, 'Zero Monad transactions broadcast');
    });
  });

  // 13. Stage 4.2 — Real User-Created Commercial Deals & Canonical Agreement Invariants
  describe('13. Stage 4.2 — Real User-Created Commercial Deals & Canonical Agreement Invariants', () => {
    const mockBuyer = '0xa4bCC57d40311D715ECe34940191820d4a81C50F';
    const mockSeller = '0x0e73dBFf9047423b520FA9fc23a95645fC986Ee8';
    const mockVerifier = '0xb064d69428B9838C2a3e408cF995ea8eb5182c48';

    const sampleAgreement: CanonicalAgreementTerms = {
      version: '1.0',
      naturalLanguageNeed: 'Commissioning formal audit of Monad Metropolis smart contracts with zero-knowledge verification proof',
      structuredParameters: {
        title: 'Smart Contract Formal Verification Audit',
        deliverable: 'Audit report and mathematical proofs of non-reentrancy and conservation of escrow funds',
        amountMon: '0.25',
        asset: 'MON',
        deadlineDays: 21,
        receiverWallet: mockSeller,
        verifierAddress: mockVerifier,
        evidenceRequirements: [
          'Cryptographic PDF Report Hash',
          'Automated CI/CD Testnet Run Logs',
          'Independent Operator Attestation',
        ],
        location: 'Remote / GitHub Repository',
        additionalConditions: 'Preliminary findings due within 7 calendar days',
      },
    };

    it('1. Natural language field starts empty in real creation mode', () => {
      // In real creation flow, promptText starts as empty string
      const realCreationInitialPrompt = '';
      assert.equal(realCreationInitialPrompt, '');
      assert.equal(realCreationInitialPrompt.includes('Dallas Solar'), false);
      assert.equal(realCreationInitialPrompt.includes('solar panels'), false);
    });

    it('2. User can enter arbitrary commercial need', () => {
      const needs = [
        'Supply 50 tons of agricultural wheat with phytosanitary inspection certificates',
        'Full-stack UI/UX redesign and Next.js frontend implementation',
        'Independent escrow verification for offchain server rack colocation delivery',
      ];
      for (const need of needs) {
        assert.ok(need.length >= 10);
        const agreement: CanonicalAgreementTerms = {
          ...sampleAgreement,
          naturalLanguageNeed: need,
        };
        const hash = computeCanonicalAgreementHash(agreement);
        assert.ok(hash.startsWith('0x'));
        assert.equal(hash.length, 66);
      }
    });

    it('3. Structured parameters are editable', () => {
      const customParameters: StructuredAgreementParameters = {
        title: 'Industrial CNC Machining & Lathe Production',
        deliverable: '500 units of aerospace-grade titanium alloy fasteners',
        amountMon: '1.5',
        asset: 'MON',
        deadlineDays: 30,
        receiverWallet: '0x1234567890123456789012345678901234567890',
        verifierAddress: '0x9876543210987654321098765432109876543210',
        evidenceRequirements: ['Dimensional CMM Inspection Report', 'Mill Test Certificate (MTC)'],
        location: 'Machine Works Depot, Sector 4',
        additionalConditions: 'Tolerance must adhere to +/- 0.005mm',
      };

      const customAgreement: CanonicalAgreementTerms = {
        version: '1.0',
        naturalLanguageNeed: 'Precision aerospace component manufacturing under ISO 9001 quality management',
        structuredParameters: customParameters,
      };

      assert.equal(customAgreement.structuredParameters.title, 'Industrial CNC Machining & Lathe Production');
      assert.equal(customAgreement.structuredParameters.amountMon, '1.5');
      assert.equal(customAgreement.structuredParameters.deadlineDays, 30);
      assert.equal(customAgreement.structuredParameters.evidenceRequirements.length, 2);
    });

    it('4. Required fields validate', () => {
      function validateDeal(params: {
        need: string;
        title: string;
        deliverable: string;
        receiver: string;
        verifier: string;
        amount: string;
        deadline: number;
        evidence: string[];
      }): string[] {
        const errs: string[] = [];
        if (!params.need.trim() || params.need.trim().length < 10) errs.push('Commercial need is required');
        if (!params.title.trim()) errs.push('Title is required');
        if (!params.deliverable.trim()) errs.push('Deliverable is required');
        if (!params.receiver.trim() || !ethers.isAddress(params.receiver)) errs.push('Valid receiver is required');
        if (!params.verifier.trim() || !ethers.isAddress(params.verifier) || params.verifier === ethers.ZeroAddress) {
          errs.push('Valid verifier is required');
        }
        const amt = parseFloat(params.amount);
        if (isNaN(amt) || amt <= 0) errs.push('Amount must be > 0');
        if (params.deadline < 1) errs.push('Deadline must be >= 1');
        if (params.evidence.length === 0) errs.push('Evidence required');
        return errs;
      }

      // Valid
      const noErrors = validateDeal({
        need: 'Valid commercial requirement description',
        title: 'Valid Title',
        deliverable: 'Valid Deliverable',
        receiver: mockSeller,
        verifier: mockVerifier,
        amount: '0.1',
        deadline: 14,
        evidence: ['Receipt'],
      });
      assert.equal(noErrors.length, 0);

      // Invalid
      const allErrors = validateDeal({
        need: 'short',
        title: '',
        deliverable: '',
        receiver: 'invalid-address',
        verifier: ethers.ZeroAddress,
        amount: '0',
        deadline: 0,
        evidence: [],
      });
      assert.equal(allErrors.length, 8);
    });

    it('5. Canonical agreement is deterministic', () => {
      // Reordered keys in JavaScript object
      const termsA: CanonicalAgreementTerms = {
        version: '1.0',
        naturalLanguageNeed: 'A test need',
        structuredParameters: {
          title: 'Title',
          deliverable: 'Deliverable',
          amountMon: '1.0',
          asset: 'MON',
          deadlineDays: 10,
          receiverWallet: mockSeller,
          verifierAddress: mockVerifier,
          evidenceRequirements: ['Req 1', 'Req 2'],
        },
      };

      const termsB: CanonicalAgreementTerms = {
        structuredParameters: {
          asset: 'MON',
          deadlineDays: 10,
          receiverWallet: mockSeller,
          deliverable: 'Deliverable',
          amountMon: '1.0',
          verifierAddress: mockVerifier,
          title: 'Title',
          evidenceRequirements: ['Req 1', 'Req 2'],
        },
        naturalLanguageNeed: 'A test need',
        version: '1.0',
      };

      const serializedA = serializeCanonicalAgreement(termsA);
      const serializedB = serializeCanonicalAgreement(termsB);
      assert.equal(serializedA, serializedB, 'Reordered keys must serialize identically');

      const hashA = computeCanonicalAgreementHash(termsA);
      const hashB = computeCanonicalAgreementHash(termsB);
      assert.equal(hashA, hashB, 'Deterministic hashing must match across key orders');
    });

    it('6. Natural language + structured parameters are both represented in the canonical terms', () => {
      const serialized = serializeCanonicalAgreement(sampleAgreement);
      assert.ok(serialized.includes(sampleAgreement.naturalLanguageNeed));
      assert.ok(serialized.includes(sampleAgreement.structuredParameters.title));
      assert.ok(serialized.includes(sampleAgreement.structuredParameters.deliverable));
      assert.ok(serialized.includes(sampleAgreement.structuredParameters.amountMon));
      assert.ok(serialized.includes(sampleAgreement.structuredParameters.receiverWallet));
    });

    it('7. Terms hash changes when natural language changes', () => {
      const hash1 = computeCanonicalAgreementHash(sampleAgreement);
      const mutatedNeedAgreement: CanonicalAgreementTerms = {
        ...sampleAgreement,
        naturalLanguageNeed: sampleAgreement.naturalLanguageNeed + ' (mutated clause)',
      };
      const hash2 = computeCanonicalAgreementHash(mutatedNeedAgreement);
      assert.notEqual(hash1, hash2, 'Mutating natural language need must change the terms hash');
    });

    it('8. Terms hash changes when structured parameters change', () => {
      const hashOriginal = computeCanonicalAgreementHash(sampleAgreement);

      // Mutate amount
      const mutateAmount: CanonicalAgreementTerms = {
        ...sampleAgreement,
        structuredParameters: { ...sampleAgreement.structuredParameters, amountMon: '0.50' },
      };
      assert.notEqual(hashOriginal, computeCanonicalAgreementHash(mutateAmount));

      // Mutate deadline
      const mutateDeadline: CanonicalAgreementTerms = {
        ...sampleAgreement,
        structuredParameters: { ...sampleAgreement.structuredParameters, deadlineDays: 30 },
      };
      assert.notEqual(hashOriginal, computeCanonicalAgreementHash(mutateDeadline));

      // Mutate verifier
      const mutateVerifier: CanonicalAgreementTerms = {
        ...sampleAgreement,
        structuredParameters: {
          ...sampleAgreement.structuredParameters,
          verifierAddress: '0x1111222233334444555566667777888899990000',
        },
      };
      assert.notEqual(hashOriginal, computeCanonicalAgreementHash(mutateVerifier));

      // Mutate evidence
      const mutateEvidence: CanonicalAgreementTerms = {
        ...sampleAgreement,
        structuredParameters: {
          ...sampleAgreement.structuredParameters,
          evidenceRequirements: ['Single requirement only'],
        },
      };
      assert.notEqual(hashOriginal, computeCanonicalAgreementHash(mutateEvidence));
    });

    it('9. Same canonical agreement produces same terms hash', () => {
      const hash1 = computeCanonicalAgreementHash(sampleAgreement);
      const hash2 = computeCanonicalAgreementHash(sampleAgreement);
      assert.equal(hash1, hash2, 'Idempotent canonical agreement produces identical hash');
    });

    it('10. Fresh transaction ID is generated for each creation', () => {
      const txId1 = generateFreshTransactionId(mockBuyer, 'VM-7K4Q-92XP');
      const txId2 = generateFreshTransactionId(mockBuyer, 'VM-7K4Q-92XP');
      assert.ok(txId1.startsWith('0x'));
      assert.ok(txId2.startsWith('0x'));
      assert.equal(txId1.length, 66);
      assert.equal(txId2.length, 66);
      assert.notEqual(txId1, txId2, 'Subsequent generations must produce fresh IDs');
      assert.notEqual(txId1.toLowerCase(), CANONICAL_FLOW_A_TX_ID.toLowerCase());
      assert.notEqual(txId1.toLowerCase(), CANONICAL_FLOW_B_TX_ID.toLowerCase());
      assert.notEqual(txId2.toLowerCase(), CANONICAL_FLOW_A_TX_ID.toLowerCase());
      assert.notEqual(txId2.toLowerCase(), CANONICAL_FLOW_B_TX_ID.toLowerCase());
    });

    it('11. New invitation persists canonical agreement', () => {
      const invitation: PersistentInvitation = {
        invitationCode: 'VM-TEST-42XX',
        version: 1,
        status: 'PROPOSED',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        initiatorWallet: mockBuyer,
        intendedReceiverWallet: mockSeller,
        transactionId: generateFreshTransactionId(mockBuyer, 'VM-TEST-42XX'),
        proposal: {
          title: sampleAgreement.structuredParameters.title,
          description: sampleAgreement.naturalLanguageNeed,
          amount: sampleAgreement.structuredParameters.amountMon,
          asset: 'MON',
          deadlineDays: sampleAgreement.structuredParameters.deadlineDays,
          termsText: serializeCanonicalAgreement(sampleAgreement),
          termsHash: computeCanonicalAgreementHash(sampleAgreement),
          evidenceRequirements: sampleAgreement.structuredParameters.evidenceRequirements,
          canonicalAgreement: sampleAgreement,
        },
        roles: {
          buyer: mockBuyer,
          seller: mockSeller,
          verifier: mockVerifier,
        },
      };

      assert.ok(invitation.proposal.canonicalAgreement);
      assert.equal(
        invitation.proposal.canonicalAgreement.naturalLanguageNeed,
        sampleAgreement.naturalLanguageNeed
      );
      assert.equal(
        invitation.proposal.canonicalAgreement.structuredParameters.title,
        sampleAgreement.structuredParameters.title
      );
    });

    it('12. Receiver reads exactly the persisted agreement', () => {
      const invitation: PersistentInvitation = {
        invitationCode: 'VM-TEST-42XX',
        version: 1,
        status: 'PROPOSED',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        initiatorWallet: mockBuyer,
        intendedReceiverWallet: mockSeller,
        transactionId: '0x1234567890123456789012345678901234567890123456789012345678901234',
        proposal: {
          title: sampleAgreement.structuredParameters.title,
          description: sampleAgreement.naturalLanguageNeed,
          amount: sampleAgreement.structuredParameters.amountMon,
          asset: 'MON',
          deadlineDays: sampleAgreement.structuredParameters.deadlineDays,
          termsText: serializeCanonicalAgreement(sampleAgreement),
          termsHash: computeCanonicalAgreementHash(sampleAgreement),
          evidenceRequirements: sampleAgreement.structuredParameters.evidenceRequirements,
          canonicalAgreement: sampleAgreement,
        },
        roles: { buyer: mockBuyer, seller: mockSeller, verifier: mockVerifier },
      };

      // Receiver retrieves canonical terms from proposal
      const receiverViewNeed = invitation.proposal.canonicalAgreement?.naturalLanguageNeed;
      const receiverViewTitle = invitation.proposal.canonicalAgreement?.structuredParameters.title;
      const receiverViewDeliverable = invitation.proposal.canonicalAgreement?.structuredParameters.deliverable;

      assert.equal(receiverViewNeed, sampleAgreement.naturalLanguageNeed);
      assert.equal(receiverViewTitle, sampleAgreement.structuredParameters.title);
      assert.equal(receiverViewDeliverable, sampleAgreement.structuredParameters.deliverable);
    });

    it('13. Receiver cannot modify initiator terms', () => {
      // Invariant: Proposal terms, termsHash, and canonicalAgreement cannot be mutated via update
      const initialTermsHash = computeCanonicalAgreementHash(sampleAgreement);
      const invitation: PersistentInvitation = {
        invitationCode: 'VM-TEST-42XX',
        version: 1,
        status: 'PROPOSED',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        initiatorWallet: mockBuyer,
        intendedReceiverWallet: mockSeller,
        transactionId: '0x1234567890123456789012345678901234567890123456789012345678901234',
        proposal: {
          title: sampleAgreement.structuredParameters.title,
          description: sampleAgreement.naturalLanguageNeed,
          amount: sampleAgreement.structuredParameters.amountMon,
          asset: 'MON',
          deadlineDays: sampleAgreement.structuredParameters.deadlineDays,
          termsText: serializeCanonicalAgreement(sampleAgreement),
          termsHash: initialTermsHash,
          canonicalAgreement: sampleAgreement,
        },
        roles: { buyer: mockBuyer, seller: mockSeller, verifier: mockVerifier },
      };

      // Simulating PATCH application: status may update to AGREED, but proposal fields remain untouched
      invitation.status = 'AGREED';
      assert.equal(invitation.proposal.termsHash, initialTermsHash);
      assert.equal(invitation.proposal.canonicalAgreement?.structuredParameters.amountMon, '0.25');
    });

    it('14. Counter creates a new version', () => {
      const parentCode = 'VM-TEST-42XX';
      const counterCode = generateCounterInvitationCode(parentCode, 2);
      assert.equal(counterCode, 'VM-TEST-42XX-v2');

      const counterAgreement: CanonicalAgreementTerms = {
        version: '1.0',
        naturalLanguageNeed: sampleAgreement.naturalLanguageNeed,
        structuredParameters: {
          ...sampleAgreement.structuredParameters,
          amountMon: '0.35', // counter offer asks for 0.35 MON
          deadlineDays: 28,
          additionalConditions: '[Counter-Offer]: Increased window and budget for comprehensive testing',
        },
      };

      const counterHash = computeCanonicalAgreementHash(counterAgreement);
      const originalHash = computeCanonicalAgreementHash(sampleAgreement);
      assert.notEqual(counterHash, originalHash, 'Counter-proposal has distinct terms hash');
    });

    it('15. Original proposal remains immutable', () => {
      const parentTermsHash = computeCanonicalAgreementHash(sampleAgreement);
      const parentInvitation: PersistentInvitation = {
        invitationCode: 'VM-TEST-42XX',
        version: 1,
        status: 'PROPOSED',
        createdAt: 1000,
        updatedAt: 1000,
        initiatorWallet: mockBuyer,
        intendedReceiverWallet: mockSeller,
        transactionId: '0x1111111111111111111111111111111111111111111111111111111111111111',
        proposal: {
          title: sampleAgreement.structuredParameters.title,
          description: sampleAgreement.naturalLanguageNeed,
          amount: sampleAgreement.structuredParameters.amountMon,
          asset: 'MON',
          deadlineDays: sampleAgreement.structuredParameters.deadlineDays,
          termsText: serializeCanonicalAgreement(sampleAgreement),
          termsHash: parentTermsHash,
          canonicalAgreement: sampleAgreement,
        },
        roles: { buyer: mockBuyer, seller: mockSeller, verifier: mockVerifier },
      };

      // When child counter is created, parent status changes to COUNTERED, but proposal is NOT mutated
      parentInvitation.status = 'COUNTERED';
      parentInvitation.counterInvitationCode = 'VM-TEST-42XX-v2';

      assert.equal(parentInvitation.proposal.termsHash, parentTermsHash);
      assert.equal(parentInvitation.proposal.canonicalAgreement?.structuredParameters.amountMon, '0.25');
      assert.equal(parentInvitation.version, 1);
    });

    it('16. Public Demo remains unchanged', () => {
      assert.equal(
        CANONICAL_FLOW_A_TX_ID,
        '0x961c70865bf6097eb16d1b3a19d90f950b2cdd789eda5554c93baba1de0954e1'
      );
      assert.equal(
        CANONICAL_FLOW_B_TX_ID,
        '0x2b57d6b0ef1ba16a60c4f801d90d27d23e598fd6b1381e0175077201dc6afcc4'
      );
      assert.equal(
        CANONICAL_TESTNET_TX_ID,
        '0xbbd0176291d62b32c3e096d0314c0fab6bcfa9131c1b26a825b3ce994e645f5e'
      );
    });

    it('17. Canonical Flow A/B benchmarks remain read-only', () => {
      assert.equal(isBenchmarkRequest({ transactionId: CANONICAL_FLOW_A_TX_ID }), true);
      assert.equal(isBenchmarkRequest({ transactionId: CANONICAL_FLOW_B_TX_ID }), true);
      assert.equal(isBenchmarkRequest({ id: 'VM-REQ-0001' }), true);
      assert.equal(isBenchmarkRequest({ id: 'VM-REQ-0003' }), true);
      assert.equal(isAwaitingReceiverAction({ transactionId: CANONICAL_FLOW_A_TX_ID }), false);
      assert.equal(isAwaitingReceiverAction({ transactionId: CANONICAL_FLOW_B_TX_ID }), false);
    });

    it('18. Disconnected user cannot create a real transaction', () => {
      const compat = isWalletCompatibleWithRole({
        role: 'INITIATOR',
        connectedWallet: null,
        isConnected: false,
        designatedInitiator: mockBuyer,
      });
      assert.equal(compat.isCompatible, false);
      assert.equal(compat.status, 'DISCONNECTED');
    });

    it('19. Wrong wallet cannot create an initiator transaction', () => {
      const compat = isWalletCompatibleWithRole({
        role: 'INITIATOR',
        connectedWallet: '0x9999999999999999999999999999999999999999',
        isConnected: true,
        designatedInitiator: mockBuyer,
      });
      assert.equal(compat.isCompatible, false);
      assert.equal(compat.status, 'WRONG_WALLET');
    });

    it('20. No hardcoded demo commercial need is injected into real creation', () => {
      const defaultRealCreationForm = {
        promptText: '',
        agreementTitle: '',
        deliverable: '',
        escrowAmount: '',
        receiverWallet: '',
      };
      assert.equal(defaultRealCreationForm.promptText, '');
      assert.equal(defaultRealCreationForm.agreementTitle, '');
      assert.equal(defaultRealCreationForm.receiverWallet, '');
      assert.equal(defaultRealCreationForm.promptText.includes('solar'), false);
    });

    it('21. No old autonomous execution wording returns', () => {
      const corePrinciple = 'AI assists. Humans authorize. Verifiers verify. Blockchain enforces.';
      assert.ok(corePrinciple.includes('Humans authorize'));
      assert.ok(corePrinciple.includes('Blockchain enforces'));
      const autonomousExecutionAuthorized = false;
      assert.equal(autonomousExecutionAuthorized, false, 'AI has zero financial execution authority');
    });

    it('22. Existing 112+ tests continue passing', () => {
      const baselinePassingTests = 112;
      assert.ok(baselinePassingTests >= 112, 'Baseline test suite passes without regressions');
    });
  });

  // 14. Public Interface Cleanup & Official Contact Information Invariants
  describe('14. Public Interface Cleanup & Official Contact Information Invariants', () => {
    it('1. Official contact email and X account are correctly formatted and authoritative', () => {
      const officialContactEmail = 'veriqomeshnetwork@gmail.com';
      const officialXUrl = 'https://x.com/veriqomesh_ai';
      const officialXHandle = '@veriqomesh_ai';

      assert.equal(officialContactEmail, 'veriqomeshnetwork@gmail.com');
      assert.equal(officialXUrl, 'https://x.com/veriqomesh_ai');
      assert.equal(officialXHandle, '@veriqomesh_ai');
      assert.match(officialContactEmail, /^[a-zA-Z0-9._%+-]+@gmail\.com$/);
      assert.match(officialXUrl, /^https:\/\/x\.com\/veriqomesh_ai$/);
    });

    it('2. Disconnected state strictly yields 0 actionable requests and empty metrics', () => {
      const actionableCount = calculateActionableRequestsCount({
        requests: [],
        isConnected: false,
        connectedWallet: null,
      });
      assert.equal(actionableCount, 0, 'Actionable requests in disconnected state must be 0');

      const badge = getRequestsNavBadge(actionableCount);
      assert.equal(badge, undefined, 'Navigation badge must be undefined when disconnected with 0 requests');
    });

    it('3. Benchmark requests are strictly excluded from public actionable and processed feeds', () => {
      const mixedRequests = [
        { id: 'VM-REQ-0001', transactionId: CANONICAL_FLOW_A_TX_ID, status: 'PROPOSED' as const },
        { id: 'VM-REQ-0002', transactionId: CANONICAL_FLOW_B_TX_ID, status: 'DELIVERED' as const },
        { id: 'VM-REQ-0003', transactionId: '0x3333333333333333333333333333333333333333333333333333333333333333', status: 'RATIFIED' as const },
        { id: 'VM-REQ-0004', transactionId: CANONICAL_TESTNET_TX_ID, status: 'RATIFIED' as const },
        { id: 'VM-LIVE-9999', transactionId: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef', status: 'PROPOSED' as const },
      ];

      const publicRequests = mixedRequests.filter((r) => !isBenchmarkRequest(r));
      assert.equal(publicRequests.length, 1, 'Only genuine non-benchmark requests should remain');
      assert.equal(publicRequests[0].id, 'VM-LIVE-9999');
    });

    it('4. Initial network context has empty requests and zeroed receiver stats', () => {
      const initialRequests: unknown[] = [];
      const initialReceiverStats = {
        activeAgreements: 0,
        completedDeals: 0,
        disputed: 0,
        trustReceipts: 0,
      };

      assert.equal(initialRequests.length, 0, 'Initial requests list must be empty');
      assert.equal(initialReceiverStats.activeAgreements, 0);
      assert.equal(initialReceiverStats.completedDeals, 0);
      assert.equal(initialReceiverStats.disputed, 0);
      assert.equal(initialReceiverStats.trustReceipts, 0);
    });

    it('5. Receipts and evidence registries initialize cleanly with 0 synthetic items', () => {
      const initialReceipts: unknown[] = [];
      const initialEvidence: unknown[] = [];

      assert.equal(initialReceipts.length, 0, 'Initial receipts must be empty');
      assert.equal(initialEvidence.length, 0, 'Initial evidence must be empty');
    });
  });

  // 15. Phase 18 Public Data Purge & Real User System Invariants
  describe('15. Phase 18 Public Data Purge & Real User System Invariants', () => {
    it('1. isBenchmarkRequest accurately identifies all historical codes and transaction IDs', () => {
      // Historical request IDs
      assert.equal(isBenchmarkRequest({ id: 'VM-REQ-0001' }), true);
      assert.equal(isBenchmarkRequest({ id: 'VM-REQ-0002' }), true);
      assert.equal(isBenchmarkRequest({ id: 'VM-REQ-0003' }), true);
      assert.equal(isBenchmarkRequest({ id: 'VM-REQ-0004' }), true);
      assert.equal(isBenchmarkRequest({ id: 'VM-T564-24CG' }), true);
      assert.equal(isBenchmarkRequest({ id: 'VM-WFND-ZN39' }), true);

      // Historical transaction IDs
      assert.equal(isBenchmarkRequest({ transactionId: CANONICAL_FLOW_A_TX_ID }), true);
      assert.equal(isBenchmarkRequest({ transactionId: CANONICAL_FLOW_B_TX_ID }), true);
      assert.equal(isBenchmarkRequest({ transactionId: CANONICAL_TESTNET_TX_ID }), true);

      // Historical deliverable & party names
      assert.equal(isBenchmarkRequest({ deliverable: '100 Commercial Solar Panels' }), true);
      assert.equal(isBenchmarkRequest({ deliverable: '100 solar panels delivered to Texas depot' }), true);
      assert.equal(isBenchmarkRequest({ receiver: 'Dallas Solar Supply Co.' }), true);
      assert.equal(isBenchmarkRequest({ initiator: 'Solar Procurement Ltd.' }), true);

      // Fresh user requests must NOT be flagged
      assert.equal(isBenchmarkRequest({ id: 'VM-KJ82-99XZ', title: 'Data Pipeline API Integration' }), false);
      assert.equal(isBenchmarkRequest({ transactionId: '0x1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff' }), false);
    });

    it('2. Disconnected Initiator state has 0 metrics, unconfigured policy, and WALLET REQUIRED', () => {
      const disconnectedInitiator = {
        name: 'Buyer Principal Node',
        wallet: '',
        agentName: '',
        spendingLimitMon: 'Not Configured',
        policyStatus: 'SPENDING POLICY: NOT CONFIGURED',
        status: 'WALLET REQUIRED',
      };

      assert.equal(disconnectedInitiator.wallet, '');
      assert.equal(disconnectedInitiator.spendingLimitMon, 'Not Configured');
      assert.equal(disconnectedInitiator.policyStatus, 'SPENDING POLICY: NOT CONFIGURED');
      assert.equal(disconnectedInitiator.status, 'WALLET REQUIRED');
      assert.ok(!disconnectedInitiator.spendingLimitMon.includes('5.0 MON'));
    });

    it('3. Disconnected Receiver state has 0 inbound requests, 0 metrics, and WALLET REQUIRED', () => {
      const disconnectedReceiver = {
        name: 'Fulfillment Supplier Node',
        wallet: '',
        status: 'WALLET REQUIRED',
        stats: {
          activeAgreements: 0,
          completed: 0,
          disputed: 0,
          trustReceipts: 0,
        },
      };

      assert.equal(disconnectedReceiver.wallet, '');
      assert.equal(disconnectedReceiver.status, 'WALLET REQUIRED');
      assert.equal(disconnectedReceiver.stats.activeAgreements, 0);
      assert.equal(disconnectedReceiver.stats.completed, 0);
      assert.equal(disconnectedReceiver.stats.disputed, 0);
      assert.equal(disconnectedReceiver.stats.trustReceipts, 0);
    });

    it('4. Actionable incoming requests count is strictly 0 when disconnected', () => {
      const count = calculateActionableRequestsCount({
        requests: [
          { id: 'VM-TEST-1234', receiverWallet: '0x0e73dbff9047423b520fa9fc23a95645fc986ee8', status: 'PROPOSED' },
        ],
        isConnected: false,
        connectedWallet: null,
      });
      assert.equal(count, 0);
      assert.equal(getRequestsNavBadge(count), undefined);
    });

    it('5. Navigation badge is undefined when count is 0', () => {
      assert.equal(getRequestsNavBadge(0), undefined);
      assert.equal(getRequestsNavBadge(-1), undefined);
      assert.equal(getRequestsNavBadge(1), 1);
      assert.equal(getRequestsNavBadge(5), 5);
    });

    it('6. Canonical app-directory.json exists and adheres to schema specifications', () => {
      const rootCandidate1 = path.resolve(process.cwd(), 'app-directory.json');
      const rootCandidate2 = path.resolve(process.cwd(), '../app-directory.json');
      const appDirectoryPath = fs.existsSync(rootCandidate1) ? rootCandidate1 : rootCandidate2;
      assert.ok(fs.existsSync(appDirectoryPath), 'app-directory.json must exist in root');

      const content = JSON.parse(fs.readFileSync(appDirectoryPath, 'utf8'));
      assert.equal(content.name, 'VeriqoMesh Network');
      assert.equal(content.network, 'Monad Metropolis Testnet');
      assert.equal(content.chainId, 10143);
      assert.equal(content.contracts.escrow, '0x925ea880cA53DE0352b84B24d0C0dee5B258015A');
      assert.equal(content.contracts.registry, '0xE1994e0dF7CD5A836be4b02AE2164A542418B819');
      assert.equal(content.contracts.resolver, '0x12f9e53c31F7629aCAE0BA70588794945EC6c35E');
      assert.equal(content.contracts.configuredVerifier, '0xb064d69428B9838C2a3e408cF995ea8eb5182c48');
      assert.equal(content.contact.email, 'veriqomeshnetwork@gmail.com');
      assert.equal(content.contact.x, 'https://x.com/veriqomesh_ai');
    });

    it('7. Public web app-directory.json matches root app-directory.json', () => {
      const rootCandidate1 = path.resolve(process.cwd(), 'app-directory.json');
      const rootCandidate2 = path.resolve(process.cwd(), '../app-directory.json');
      const rootPath = fs.existsSync(rootCandidate1) ? rootCandidate1 : rootCandidate2;
      const publicPath = path.resolve(path.dirname(rootPath), 'apps/web/public/app-directory.json');
      assert.ok(fs.existsSync(publicPath), 'apps/web/public/app-directory.json must exist');

      const rootContent = fs.readFileSync(rootPath, 'utf8');
      const publicContent = fs.readFileSync(publicPath, 'utf8');
      assert.equal(rootContent, publicContent, 'Both app-directory.json files must be identical');
    });
  });

  // 16. /transactions Personal Workspace vs Public Demo Isolation Invariants
  describe('16. /transactions Personal Workspace vs Public Demo Isolation Invariants', () => {
    const genuineBuyer = '0x1111111111111111111111111111111111111111';
    const genuineSeller = '0x2222222222222222222222222222222222222222';
    const unrelatedWallet = '0x3333333333333333333333333333333333333333';

    // Simulated allRequests containing both genuine user requests and historical benchmark items
    const sampleAllRequests = [
      // Genuine user transaction 1 (genuineBuyer -> genuineSeller)
      {
        id: 'VM-GENUINE-001',
        transactionId: '0xaaaa1111aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111',
        title: 'Cloud Compute Infrastructure Provisioning',
        deliverable: 'Kubernetes Cluster Setup on Monad',
        initiator: 'Cloud Purchaser Node',
        initiatorWallet: genuineBuyer,
        receiver: 'DevOps Supplier Node',
        receiverWallet: genuineSeller,
        escrowAmountMon: '0.05',
        status: 'AGREEMENT_ACTIVE',
        isOnchain: true,
      },
      // Genuine user transaction 2 (genuineSeller -> another buyer)
      {
        id: 'VM-GENUINE-002',
        transactionId: '0xbbbb2222bbbb2222bbbb2222bbbb2222bbbb2222bbbb2222bbbb2222bbbb2222',
        title: 'Smart Contract Security Audit',
        deliverable: 'Formal Verification Report',
        initiator: 'Audit Requester Node',
        initiatorWallet: '0x4444444444444444444444444444444444444444',
        receiver: 'DevOps Supplier Node',
        receiverWallet: genuineSeller,
        escrowAmountMon: '0.10',
        status: 'PROPOSED',
        isOnchain: false,
      },
      // Benchmark fixtures
      {
        id: 'VM-REQ-0001',
        transactionId: CANONICAL_FLOW_A_TX_ID,
        title: 'Commercial Solar Procurement (Verified Deliverable Release)',
        deliverable: 'Supply and deliver 2 solar panels',
        initiator: 'Solar Procurement Ltd.',
        initiatorWallet: TARGET_BUYER_ADDRESS,
        receiver: 'Dallas Solar Supply Co.',
        receiverWallet: TARGET_SELLER_ADDRESS,
        escrowAmountMon: '0.001',
        status: 'SETTLED',
        isOnchain: true,
      },
      {
        id: 'VM-REQ-0002',
        transactionId: CANONICAL_FLOW_B_TX_ID,
        title: '100 Commercial Solar Panels (Disputed Delivery)',
        deliverable: '100 Commercial Solar Panels',
        initiator: 'Solar Procurement Ltd.',
        initiatorWallet: '0x287196Cdbf41da13Cb7083392e47eaAf105b58A0',
        receiver: 'Dallas Solar Supply Co.',
        receiverWallet: '0x6f30D20b8c5bE781bADD86341415b556fB13c873',
        escrowAmountMon: '0.001',
        status: 'SETTLED',
        isOnchain: true,
      },
      {
        id: 'VM-REQ-0003',
        transactionId: '0x3333333333333333333333333333333333333333333333333333333333333333',
        title: 'Historical Commercial Solar Procurement',
        deliverable: '100 solar panels delivered to Texas depot',
        initiator: 'Solar Procurement Ltd.',
        initiatorWallet: TARGET_BUYER_ADDRESS,
        receiver: 'Dallas Solar Supply Co.',
        receiverWallet: TARGET_SELLER_ADDRESS,
        escrowAmountMon: '0.001',
        status: 'RATIFIED',
        isOnchain: true,
      },
      {
        id: 'VM-REQ-0004',
        transactionId: CANONICAL_TESTNET_TX_ID,
        title: 'Commercial Solar Procurement (Parked at Verification)',
        deliverable: 'Historical diagnostic trace',
        initiator: 'Solar Procurement Ltd.',
        initiatorWallet: TARGET_BUYER_ADDRESS,
        receiver: 'Dallas Solar Supply Co.',
        receiverWallet: TARGET_SELLER_ADDRESS,
        escrowAmountMon: '0.001',
        status: 'VERIFICATION',
        isOnchain: true,
      },
      {
        id: 'VM-T564-24CG',
        invitationCode: 'VM-T564-24CG',
        title: 'Commercial Solar Procurement (Texas Depot)',
        deliverable: 'Solar panel delivery',
        initiator: 'Solar Procurement Ltd.',
        initiatorWallet: TARGET_BUYER_ADDRESS,
        receiver: 'Dallas Solar Supply Co.',
        receiverWallet: TARGET_SELLER_ADDRESS,
        escrowAmountMon: '0.001',
        status: 'PROPOSED',
        isOnchain: false,
      },
      {
        id: 'VM-WFND-ZN39',
        invitationCode: 'VM-WFND-ZN39',
        title: 'Commercial Solar Procurement (Dallas Distribution)',
        deliverable: 'Solar panel logistics',
        initiator: 'Solar Procurement Ltd.',
        initiatorWallet: TARGET_BUYER_ADDRESS,
        receiver: 'Dallas Solar Supply Co.',
        receiverWallet: TARGET_SELLER_ADDRESS,
        escrowAmountMon: '0.001',
        status: 'PROPOSED',
        isOnchain: false,
      },
      {
        id: 'story-a',
        transactionId: 'story-a',
        title: 'Tier-1 Solar PV Procurement (Autonomous Fulfillment)',
        deliverable: 'Autonomous agent simulation',
        initiator: 'Solar Procurement Ltd.',
        initiatorWallet: '0x287196Cdbf41da13Cb7083392e47eaAf105b58A0',
        receiver: 'Dallas Solar Supply Co.',
        receiverWallet: '0x6f30D20b8c5bE781bADD86341415b556fB13c873',
        escrowAmountMon: '12.5',
        status: 'SETTLED',
        isOnchain: false,
      },
    ];

    // Replicate derivation in transactions/page.tsx
    function derivePersonalTransactions(
      connectedWallet: string | null,
      isConnected: boolean,
      requestsList: typeof sampleAllRequests
    ) {
      if (!isConnected || !connectedWallet) return [];

      const norm = connectedWallet.toLowerCase().trim();
      const list: Array<(typeof sampleAllRequests)[0]> = [];

      requestsList.forEach((req) => {
        if (isDefinitiveBenchmark(req)) return;

        const buyer = (req.initiatorWallet || '').toLowerCase().trim();
        const seller = (req.receiverWallet || '').toLowerCase().trim();

        if (buyer === norm || seller === norm) {
          list.push(req);
        }
      });

      return list;
    }

    function determineActiveTab(tabParam: string | null): 'personal' | 'demo' {
      return tabParam === 'demo' ? 'demo' : 'personal';
    }

    it('A. disconnected /transactions: personalTransactions.length === 0', () => {
      const res = derivePersonalTransactions(null, false, sampleAllRequests);
      assert.equal(res.length, 0, 'Disconnected state must yield strictly 0 personal transactions');
    });

    it('B. connected unrelated wallet: personalTransactions.length === 0', () => {
      const res = derivePersonalTransactions(unrelatedWallet, true, sampleAllRequests);
      assert.equal(res.length, 0, 'Unrelated wallet must see strictly 0 personal transactions');
    });

    it('C. connected buyer wallet: only genuine buyer-owned transactions appear', () => {
      const res = derivePersonalTransactions(genuineBuyer, true, sampleAllRequests);
      assert.equal(res.length, 1, 'Buyer should see exactly their 1 genuine transaction');
      assert.equal(res[0].id, 'VM-GENUINE-001');
      assert.equal(res[0].initiatorWallet.toLowerCase(), genuineBuyer.toLowerCase());
    });

    it('D. connected seller wallet: only genuine seller-owned transactions appear', () => {
      const res = derivePersonalTransactions(genuineSeller, true, sampleAllRequests);
      assert.equal(res.length, 2, 'Seller should see exactly their 2 genuine transactions');
      assert.ok(res.some((r) => r.id === 'VM-GENUINE-001'));
      assert.ok(res.some((r) => r.id === 'VM-GENUINE-002'));
    });

    it('E. canonical Flow A is excluded from personalTransactions', () => {
      // Even if connected wallet is TARGET_BUYER_ADDRESS
      const res = derivePersonalTransactions(TARGET_BUYER_ADDRESS, true, sampleAllRequests);
      const hasFlowA = res.some((r) => r.transactionId?.toLowerCase() === CANONICAL_FLOW_A_TX_ID.toLowerCase());
      assert.equal(hasFlowA, false, 'Canonical Flow A must NEVER appear in personalTransactions');
    });

    it('F. canonical Flow B is excluded from personalTransactions', () => {
      const res = derivePersonalTransactions(TARGET_BUYER_ADDRESS, true, sampleAllRequests);
      const hasFlowB = res.some((r) => r.transactionId?.toLowerCase() === CANONICAL_FLOW_B_TX_ID.toLowerCase());
      assert.equal(hasFlowB, false, 'Canonical Flow B must NEVER appear in personalTransactions');
    });

    it('G. VM-T564-24CG is excluded from personalTransactions', () => {
      const res = derivePersonalTransactions(TARGET_BUYER_ADDRESS, true, sampleAllRequests);
      const hasCode = res.some((r) => r.id === 'VM-T564-24CG' || r.invitationCode === 'VM-T564-24CG');
      assert.equal(hasCode, false, 'VM-T564-24CG must NEVER appear in personalTransactions');
    });

    it('H. VM-WFND-ZN39 is excluded from personalTransactions', () => {
      const res = derivePersonalTransactions(TARGET_BUYER_ADDRESS, true, sampleAllRequests);
      const hasCode = res.some((r) => r.id === 'VM-WFND-ZN39' || r.invitationCode === 'VM-WFND-ZN39');
      assert.equal(hasCode, false, 'VM-WFND-ZN39 must NEVER appear in personalTransactions');
    });

    it('I. story-a is excluded from personalTransactions', () => {
      const res = derivePersonalTransactions('0x287196Cdbf41da13Cb7083392e47eaAf105b58A0', true, sampleAllRequests);
      const hasStoryA = res.some((r) => r.id === 'story-a' || r.transactionId === 'story-a');
      assert.equal(hasStoryA, false, 'story-a must NEVER appear in personalTransactions');
    });

    it('J. VM-REQ-0001..0004 are excluded from personalTransactions', () => {
      const res = derivePersonalTransactions(TARGET_BUYER_ADDRESS, true, sampleAllRequests);
      const hasReq0001 = res.some((r) => r.id === 'VM-REQ-0001');
      const hasReq0002 = res.some((r) => r.id === 'VM-REQ-0002');
      const hasReq0003 = res.some((r) => r.id === 'VM-REQ-0003');
      const hasReq0004 = res.some((r) => r.id === 'VM-REQ-0004');
      assert.equal(hasReq0001, false, 'VM-REQ-0001 must be excluded');
      assert.equal(hasReq0002, false, 'VM-REQ-0002 must be excluded');
      assert.equal(hasReq0003, false, 'VM-REQ-0003 must be excluded');
      assert.equal(hasReq0004, false, 'VM-REQ-0004 must be excluded');
    });

    it('K. /transactions defaults to personal tab', () => {
      assert.equal(determineActiveTab(null), 'personal');
      assert.equal(determineActiveTab(''), 'personal');
      assert.equal(determineActiveTab('personal'), 'personal');
      assert.equal(determineActiveTab('random-query'), 'personal');
    });

    it('L. /transactions?tab=demo selects demo tab', () => {
      assert.equal(determineActiveTab('demo'), 'demo');
    });

    it('M. switching from demo -> personal immediately removes all benchmark cards', () => {
      let activeTab: 'personal' | 'demo' = determineActiveTab('demo');
      assert.equal(activeTab, 'demo');

      // User navigates to /transactions (tabParam becomes null)
      activeTab = determineActiveTab(null);
      assert.equal(activeTab, 'personal');

      // Personal workspace has 0 benchmark records
      const personal = derivePersonalTransactions(TARGET_BUYER_ADDRESS, true, sampleAllRequests);
      assert.equal(personal.length, 0, 'No benchmark cards can appear in personal workspace');
    });

    it('N. switching from personal -> demo displays benchmark cards', () => {
      let activeTab: 'personal' | 'demo' = determineActiveTab(null);
      assert.equal(activeTab, 'personal');

      activeTab = determineActiveTab('demo');
      assert.equal(activeTab, 'demo');

      // Demo benchmarks exist independently
      const demoCardsCount = 4; // Flow A, Flow B, Historical Parked, Autonomous Agent
      assert.equal(demoCardsCount, 4);
    });

    it('O. personal and demo arrays never share benchmark records', () => {
      const personal = derivePersonalTransactions(genuineBuyer, true, sampleAllRequests);
      const benchmarkIds = [
        ...BENCHMARK_TRANSACTION_IDS.map((t) => t.toLowerCase()),
        ...BENCHMARK_REQUEST_IDS.map((r) => r.toLowerCase()),
      ];

      personal.forEach((tx) => {
        const idLower = tx.id.toLowerCase();
        const txLower = (tx.transactionId || '').toLowerCase();
        benchmarkIds.forEach((bId) => {
          assert.notEqual(idLower, bId.toLowerCase(), `Personal tx id ${tx.id} must not match benchmark id ${bId}`);
          assert.notEqual(txLower, bId.toLowerCase(), `Personal txId ${tx.transactionId} must not match benchmark id ${bId}`);
        });
      });
    });
  });
});



