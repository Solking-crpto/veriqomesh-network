# Veriqo Verification Layer & Verifier Boundary

**Version**: 1.0 (Stage 3)  
**Status**: Executable Specification & Production Architecture  
**Protocol**: VeriqoMesh Network  
**Target Contracts**: `contracts/src/TrustMeshEscrow.sol`, `contracts/src/interfaces/ITrustMeshTypes.sol`  
**Services Package**: `services/verification/src/index.ts`  

---

## 1. Core Principle: Verification vs. Adjudication

A critical design flaw in legacy Web3 escrow systems is conflating *fact-checking* with *dispute resolution*. Within the **Veriqo Verification Layer** of the VeriqoMesh Network, a strict boundary is enforced between two independent protocol roles:

```
+-----------------------------------------------------------------------------------------+
|                                    PROTOCOL BOUNDARY                                    |
|                                                                                         |
|       ROLE: DESIGNATED VERIFIER                      ROLE: DISPUTE RESOLVER             |
|       (Factual & Technical Inspector)                (Judicial Adjudicator)             |
|                                                                                         |
|   • Mandate: Evaluate objective truth                • Mandate: Apportion contested     |
|     against transaction criteria.                      financial allocation.            |
|   • Outputs: PASS, FAIL, INCONCLUSIVE                • Outputs: Basis points split      |
|   • Financial Authority: ZERO. Cannot                  (buyerShareBps: 0 - 10,000)      |
|     move, seize, refund, or allocate funds.          • Financial Authority: Terminal    |
|                                                        settlement release.              |
+-----------------------------------------------------------------------------------------+
```

1. **The Verifier** does not have financial authority. They cannot disburse funds to the seller, nor can they refund funds to the buyer. Their sole output is an onchain factual attestation (`VerificationOutcome`).
2. **The Dispute Resolver** does not conduct routine physical field inspections. They are invoked only when a transaction is frozen in `DISPUTED` state, deciding monetary distribution based on documented evidence.

---

## 2. Three-Valued Verification Logic

In the physical world, binary truth (`true`/`false`) is inadequate. An inspector may arrive at a port to find a shipping container sealed by customs, or serial numbers obscured by grime, or warehouse gates locked during a power outage.

TrustMesh implements explicit **Three-Valued Logic** (`VerificationOutcome`):

| Outcome | Numerical Value | Smart Contract Impact | Operational Rationale |
| :--- | :---: | :--- | :--- |
| `NONE` | 0 | Default initial state. Release blocked if verifier configured. | Awaiting inspection. |
| `PASS` | 1 | Unlocks buyer's ability to call `releaseEscrow()`. | All contractual verification criteria satisfied. |
| `FAIL` | 2 | Blocks `releaseEscrow()`. **Funds remain locked in escrow.** | Physical criteria failed. Does **not** auto-refund, allowing seller remediation or dispute. |
| `INCONCLUSIVE` | 3 | Blocks `releaseEscrow()`. Emits `VerificationInconclusive`. **Funds remain locked.** | Inspector cannot verify due to ambiguous or obstructed physical conditions. |

### Why `FAIL` Does NOT Auto-Refund
Automatic refund on `FAIL` introduces an extortion vector: a compromised or biased inspector could instantly strip a seller of compensation even after goods were delivered. Instead, `FAIL` stops escrow disbursement and leaves the capital safely locked in the contract vault. The parties can either:
- Agree to a mutual refund (`seller` calls `refundTransaction()`),
- Rectify delivery and re-request verification, or
- Escalate to the Dispute Resolver (`openDispute()`).

### Why `INCONCLUSIVE` Preserves Funds & Blocks Release
When an inspection report yields `INCONCLUSIVE` (e.g., cargo container damaged in transit, preventing safe internal count):
- The contract **strictly reverts** any `releaseEscrow()` attempt with `VerificationInconclusive(transactionId)`.
- Escrow liabilities and vaults remain 100% solvent.
- Neither buyer nor seller can unilaterally seize the funds.
- Either party can invoke `openDispute()` to initiate evidence-based adjudication.

---

## 3. Concrete Demonstration Fixture: 100 Commercial Solar Panels in Dallas

While the TrustMesh protocol is completely generic across services, software, and physical commodities, Stage 3 includes a validated physical-world demonstration fixture.

### 3.1 Transaction Specification
- **Buyer**: Texas Clean Energy Fund (`0xBuyer...`)
- **Seller**: Helios Solar Manufacturing (`0xSeller...`)
- **Designated Verifier**: Dallas Cargo Inspection Bureau (`0xVerifier...`)
- **Escrow Capital**: 20.0 Native MON
- **Subject**: 100 Grade-A Commercial Monocrystalline Solar Panels delivered to Warehouse 4, Dallas, TX.

### 3.2 Verification Criteria Evaluated Offchain (`services/verification`)
```typescript
interface PhysicalInspectionPayload {
  deliveryLocation: string;        // Expected: "Warehouse 4, Dallas, TX"
  expectedItemCount: number;       // Expected: 100
  deliveredItemCount: number;      // Inspected count
  serialNumbers: string[];         // Verified serials
  sealIntact: boolean;             // Tamper seal verification
  physicalDamageReported: boolean; // Structural inspection
  billOfLadingHash: string;        // Shipping carrier manifest digest
}
```

### 3.3 Flow A Walkthrough: Clean Delivery (`PASS`)
1. Seller Helios Solar ships 100 panels to Dallas Warehouse 4.
2. Carrier provides Bill of Lading (`bafybeib...`).
3. Designated Verifier conducts physical inspection:
   - Location matches: `"Warehouse 4, Dallas, TX"`
   - Delivered count: `100` / `100`
   - Seal: `Intact (true)`
   - Damage: `None (false)`
4. Verifier submits onchain attestation:
   ```solidity
   escrow.submitVerification(txId, VerificationOutcome.PASS, inspectionEvidenceHash);
   ```
5. Contract transitions `verificationOutcome` to `PASS`.
6. Buyer calls `releaseEscrow(txId)`.
7. Escrow disburses 20.0 MON to Seller.
8. Non-transferable Trust Receipt is minted to the registry.

### 3.4 Flow B Walkthrough: Contested Delivery (`INCONCLUSIVE` → Dispute)
1. Cargo arrives in Dallas with broken security seal and crushed packaging.
2. Verifier inspects: only 85 panels present, 15 unaccounted for; seal broken.
3. Verifier submits onchain attestation:
   ```solidity
   escrow.submitVerification(txId, VerificationOutcome.INCONCLUSIVE, inspectionEvidenceHash);
   ```
4. Buyer attempts to call `releaseEscrow(txId)`:
   - **Onchain Revert**: `VerificationInconclusive(txId)`. Funds cannot be released.
5. Buyer calls `openDispute(txId)`.
6. Escrow state transitions to `DISPUTED`.
7. Dispute Resolver reviews inspection logs and carrier liability:
   - Allocates 15% refund to Buyer (15 missing panels = 3.0 MON)
   - Allocates 85% release to Seller (85 accepted panels = 17.0 MON)
   - Resolves with `buyerShareBps = 1500`.
8. Contract disburses 3.0 MON to Buyer, 17.0 MON to Seller.
9. Dispute Trust Receipt is permanently recorded in registry.

---

## 4. Policy When No Verifier Is Configured

TrustMesh transactions support an explicit policy for zero-verifier transactions (`txRecord.verifier == address(0)`):
- If `txRecord.verifier == address(0)`, verification is explicitly defined as **optional / buyer self-attested**.
- Buyer retains direct authority to release escrow upon their own satisfaction.
- The protocol **never** synthesizes a fake verifier address or marks the transaction as "independently verified".
- The resulting Trust Receipt accurately records `verificationOutcome = NONE`, preserving verifiable accountability.

---

## 5. Security Invariants

1. **Caller Authentication**: Only `txRecord.verifier` can invoke `submitVerification()`. Unauthorized addresses revert with `NotDesignatedVerifier()`.
2. **State Gate**: `submitVerification()` can only be invoked when `txRecord.state == TransactionState.VERIFICATION`.
3. **Immutability of Economics**: `submitVerification()` can never alter `totalAmount`, `buyer`, `seller`, `tokenAddress`, or escrow liabilities.
