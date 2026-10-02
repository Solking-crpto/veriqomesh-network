import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { ethers } from 'ethers';

describe('17. Verifier Manual Entry & Trust Provenance UI Invariants', () => {
  const buyerWallet = ethers.Wallet.createRandom().address;
  const sellerWallet = ethers.Wallet.createRandom().address;
  const verifierWallet = ethers.Wallet.createRandom().address;

  describe('Part A: Designated Verifier Input & Validation Rules', () => {
    function validateVerifierField(
      designatedVerifier: string,
      buyer: string,
      seller: string
    ): { isValid: boolean; errors: string[] } {
      const trimmed = (designatedVerifier || '').trim();
      const errors: string[] = [];

      const isVerifierValid = ethers.isAddress(trimmed) && trimmed !== ethers.ZeroAddress;
      const isBuyerVerifierConflict =
        ethers.isAddress(buyer) && isVerifierValid && buyer.toLowerCase() === trimmed.toLowerCase();
      const isSellerVerifierConflict =
        ethers.isAddress(seller) && isVerifierValid && seller.toLowerCase() === trimmed.toLowerCase();

      if (!trimmed) {
        errors.push('A designated verifier address is required.');
      } else if (!isVerifierValid) {
        errors.push('Verifier wallet must be a valid non-zero Ethereum address (0x...).');
      }

      if (isBuyerVerifierConflict) {
        errors.push('Participant conflict: Buyer cannot equal Verifier.');
      }
      if (isSellerVerifierConflict) {
        errors.push('Participant conflict: Seller cannot equal Verifier.');
      }

      return {
        isValid: errors.length === 0,
        errors,
      };
    }

    it('1. Fresh agreement state initializes verifier as empty string ("")', () => {
      const freshVerifierState = '';
      assert.equal(freshVerifierState, '');
      const validation = validateVerifierField(freshVerifierState, buyerWallet, sellerWallet);
      assert.equal(validation.isValid, false);
      assert.ok(validation.errors.includes('A designated verifier address is required.'));
    });

    it('2. Empty verifier fails validation and blocks agreement review', () => {
      const validation = validateVerifierField('   ', buyerWallet, sellerWallet);
      assert.equal(validation.isValid, false);
      assert.ok(validation.errors.includes('A designated verifier address is required.'));
    });

    it('3. Zero address (0x000...000) fails validation', () => {
      const validation = validateVerifierField(ethers.ZeroAddress, buyerWallet, sellerWallet);
      assert.equal(validation.isValid, false);
      assert.ok(validation.errors.includes('Verifier wallet must be a valid non-zero Ethereum address (0x...).'));
    });

    it('4. Malformed address fails validation', () => {
      const validation = validateVerifierField('0xNotAnAddress', buyerWallet, sellerWallet);
      assert.equal(validation.isValid, false);
      assert.ok(validation.errors.includes('Verifier wallet must be a valid non-zero Ethereum address (0x...).'));
    });

    it('5. Initiator and Verifier address collision is rejected', () => {
      const validation = validateVerifierField(buyerWallet, buyerWallet, sellerWallet);
      assert.equal(validation.isValid, false);
      assert.ok(validation.errors.includes('Participant conflict: Buyer cannot equal Verifier.'));
    });

    it('6. Seller and Verifier address collision is rejected', () => {
      const validation = validateVerifierField(sellerWallet, buyerWallet, sellerWallet);
      assert.equal(validation.isValid, false);
      assert.ok(validation.errors.includes('Participant conflict: Seller cannot equal Verifier.'));
    });

    it('7. Explicit valid verifier passes validation', () => {
      const validation = validateVerifierField(verifierWallet, buyerWallet, sellerWallet);
      assert.equal(validation.isValid, true);
      assert.equal(validation.errors.length, 0);
    });

    it('8. Explicitly entering approved operator verifier (0xb064...) passes validation', () => {
      const approvedOperator = '0xb064d69428B9838C2a3e408cF995ea8eb5182c48';
      const validation = validateVerifierField(approvedOperator, buyerWallet, sellerWallet);
      assert.equal(validation.isValid, true);
      assert.equal(validation.errors.length, 0);
    });
  });

  describe('Part B: /api/invitations Invariants', () => {
    function validateApiInvitationRequest(body: {
      initiatorWallet?: string;
      intendedReceiverWallet?: string;
      roles?: { verifier?: string };
    }): { status: number; error?: string } {
      if (!body.initiatorWallet || !ethers.isAddress(body.initiatorWallet)) {
        return { status: 400, error: 'Invalid or missing initiatorWallet address' };
      }
      if (!body.intendedReceiverWallet || !ethers.isAddress(body.intendedReceiverWallet)) {
        return { status: 400, error: 'Invalid or missing intendedReceiverWallet address' };
      }

      const verifierRaw = body.roles?.verifier;
      if (!verifierRaw || typeof verifierRaw !== 'string' || !verifierRaw.trim()) {
        return { status: 400, error: 'Verifier address is required' };
      }
      const verifierTrimmed = verifierRaw.trim();
      if (!ethers.isAddress(verifierTrimmed) || verifierTrimmed === ethers.ZeroAddress) {
        return { status: 400, error: 'Verifier must be a valid non-zero address' };
      }

      const initiator = body.initiatorWallet.toLowerCase();
      const receiver = body.intendedReceiverWallet.toLowerCase();
      const verifier = verifierTrimmed.toLowerCase();

      if (initiator === receiver) {
        return { status: 400, error: 'Initiator and receiver cannot be the same address' };
      }
      if (verifier === initiator || verifier === receiver) {
        return { status: 400, error: 'Verifier cannot be the same address as initiator or receiver' };
      }

      return { status: 200 };
    }

    it('1. Rejects missing roles.verifier with 400 "Verifier address is required"', () => {
      const res = validateApiInvitationRequest({
        initiatorWallet: buyerWallet,
        intendedReceiverWallet: sellerWallet,
      });
      assert.equal(res.status, 400);
      assert.equal(res.error, 'Verifier address is required');
    });

    it('2. Rejects empty string roles.verifier with 400 "Verifier address is required"', () => {
      const res = validateApiInvitationRequest({
        initiatorWallet: buyerWallet,
        intendedReceiverWallet: sellerWallet,
        roles: { verifier: '   ' },
      });
      assert.equal(res.status, 400);
      assert.equal(res.error, 'Verifier address is required');
    });

    it('3. Rejects zero address roles.verifier with 400 "Verifier must be a valid non-zero address"', () => {
      const res = validateApiInvitationRequest({
        initiatorWallet: buyerWallet,
        intendedReceiverWallet: sellerWallet,
        roles: { verifier: ethers.ZeroAddress },
      });
      assert.equal(res.status, 400);
      assert.equal(res.error, 'Verifier must be a valid non-zero address');
    });

    it('4. Rejects verifier matching initiator address with 400', () => {
      const res = validateApiInvitationRequest({
        initiatorWallet: buyerWallet,
        intendedReceiverWallet: sellerWallet,
        roles: { verifier: buyerWallet },
      });
      assert.equal(res.status, 400);
      assert.equal(res.error, 'Verifier cannot be the same address as initiator or receiver');
    });

    it('5. Rejects verifier matching receiver address with 400', () => {
      const res = validateApiInvitationRequest({
        initiatorWallet: buyerWallet,
        intendedReceiverWallet: sellerWallet,
        roles: { verifier: sellerWallet },
      });
      assert.equal(res.status, 400);
      assert.equal(res.error, 'Verifier cannot be the same address as initiator or receiver');
    });

    it('6. Accepts distinct valid verifier and returns 200', () => {
      const res = validateApiInvitationRequest({
        initiatorWallet: buyerWallet,
        intendedReceiverWallet: sellerWallet,
        roles: { verifier: verifierWallet },
      });
      assert.equal(res.status, 200);
    });
  });

  describe('Part C: Source Code & Terminology Verification', () => {
    const rootCandidate1 = resolve(process.cwd());
    const rootCandidate2 = resolve(process.cwd(), '..');
    const rootDir = existsSync(resolve(rootCandidate1, 'apps')) ? rootCandidate1 : rootCandidate2;

    it('1. apps/web/src/app/initiator/intent/page.tsx initializes verifierWallet as empty string', () => {
      const intentPath = resolve(rootDir, 'apps/web/src/app/initiator/intent/page.tsx');
      assert.ok(existsSync(intentPath), 'intent/page.tsx must exist');
      const content = readFileSync(intentPath, 'utf-8');

      // Assert state initialization
      assert.match(
        content,
        /const\s*\[verifierWallet,\s*setVerifierWallet\]\s*=\s*useState\(''\);/,
        'verifierWallet must initialize as empty string'
      );

      // Assert helper text
      assert.ok(
        content.includes('Independent verifier who attests PASS or INCONCLUSIVE before payout.'),
        'Must contain exact verifier helper text'
      );

      // Assert placeholder
      assert.ok(
        content.includes('placeholder="0x..."'),
        'Must contain 0x... placeholder'
      );
    });

    it('2. apps/web/src/components/PublicSafetyNotice.tsx has "Trust Receipts & Provenance"', () => {
      const noticePath = resolve(rootDir, 'apps/web/src/components/PublicSafetyNotice.tsx');
      assert.ok(existsSync(noticePath), 'PublicSafetyNotice.tsx must exist');
      const content = readFileSync(noticePath, 'utf-8');

      assert.ok(
        content.includes('Trust Receipts &amp; Provenance'),
        'Footer must link to Trust Receipts & Provenance'
      );
      assert.ok(
        !content.includes('Trust Receipts &amp; Scoring'),
        'Must not contain legacy "Trust Receipts & Scoring"'
      );
    });

    it('3. apps/web/src/app/trust/page.tsx has updated headings and empty state copy', () => {
      const trustPath = resolve(rootDir, 'apps/web/src/app/trust/page.tsx');
      assert.ok(existsSync(trustPath), 'trust/page.tsx must exist');
      const content = readFileSync(trustPath, 'utf-8');

      assert.ok(
        content.includes('Trust Receipts &amp; Provenance'),
        'Page heading must be Trust Receipts & Provenance'
      );
      assert.ok(
        content.includes('Trust receipts are minted automatically when a transaction reaches verified settlement or authorized dispute resolution.'),
        'Must contain updated empty state title'
      );
      assert.ok(
        content.includes('Complete an escrow agreement on Monad Testnet to generate an immutable soulbound trust attestation.'),
        'Must contain updated empty state description'
      );
      assert.ok(
        !content.includes('No Soulbound Receipts Minted in Current Session'),
        'Must not contain legacy empty state title'
      );
    });

    it('4. apps/web/src/components/TrustActivity.tsx separates State 11 SETTLED from Verification Outcome', () => {
      const activityPath = resolve(rootDir, 'apps/web/src/components/TrustActivity.tsx');
      assert.ok(existsSync(activityPath), 'TrustActivity.tsx must exist');
      const content = readFileSync(activityPath, 'utf-8');

      assert.ok(
        content.includes('PUBLIC ONCHAIN PROVENANCE'),
        'Must contain section header PUBLIC ONCHAIN PROVENANCE'
      );
      assert.ok(
        content.includes('Immutable Event Ledger'),
        'Must contain section title Immutable Event Ledger'
      );
      assert.ok(
        content.includes('State: SETTLED (11)'),
        'Must label State: SETTLED (11)'
      );
      assert.ok(
        !content.includes('State 11 Verified'),
        'Must not say "State 11 Verified"'
      );
      assert.ok(
        content.includes('Public Demo / Architectural Benchmark'),
        'Must include Public Demo / Architectural Benchmark badges'
      );
      assert.ok(
        content.includes('VALID (Outcome 1 / PASS)'),
        'Must separate verification outcome VALID from settlement state'
      );
      assert.ok(
        content.includes('RELEASED TO SELLER'),
        'Must state payout released to seller'
      );
    });

    it('5. Flow A settlement evidence remains exactly preserved', () => {
      const activityPath = resolve(rootDir, 'apps/web/src/components/TrustActivity.tsx');
      const content = readFileSync(activityPath, 'utf-8');

      // Flow A internal Tx ID
      assert.ok(
        content.includes('0x961c70865bf6097eb16d1b3a19d90f950b2cdd789eda5554c93baba1de0954e1'),
        'Must preserve Flow A internal transaction ID'
      );

      // Flow A settlement transaction hash
      assert.ok(
        content.includes('0x691f7a80d65fe1deece2f45e8b6600ee4b2b0ffc14f3fe733d995566e2d83b52'),
        'Must preserve Flow A settlement transaction hash'
      );

      // Flow A settlement block
      assert.ok(
        content.includes('66436615'),
        'Must preserve Flow A settlement block 66,436,615'
      );

      // Flow A verifier
      assert.ok(
        content.includes('0xb064d69428B9838C2a3e408cF995ea8eb5182c48'),
        'Must preserve verifier address'
      );

      // Flow A seller
      assert.ok(
        content.includes('0x0e73dBFf9047423b520FA9fc23a95645fC986Ee8'),
        'Must preserve seller address'
      );
    });
  });
});
