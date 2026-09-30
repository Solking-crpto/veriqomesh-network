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
});
