# TrustMesh Escrow Authorization Matrix

**Audit Date**: September 23, 2026  
**Target Contract**: `contracts/src/TrustMeshEscrow.sol`  
**Purpose**: Rigorous method-by-method verification of caller privileges, required state preconditions, financial effects, deterministic state transitions, and Trust Receipt issuance.

---

## 1. Master Authorization Matrix

| Method | Buyer | Seller | Designated Verifier | Dispute Resolver | Contract Owner | Arbitrary Caller | Required Pre-State | Financial Effect | Resulting State |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- | :--- | :--- |
| `createTransaction` | **✓** (Initiates) | ✗ | ✗ | ✗ | ✗ | **✓** (Becomes Buyer) | Non-existent (`buyer == 0x0`) | None (or locks `msg.value` if pre-funded) | `PROPOSED` (or `FUNDED`) |
| `createTransactionWithVerifier` | **✓** (Initiates) | ✗ | ✗ | ✗ | ✗ | **✓** (Becomes Buyer) | Non-existent (`buyer == 0x0`) | None (or locks `msg.value` if pre-funded) | `PROPOSED` (or `FUNDED`) |
| `agreeTransaction` | ✗ | **✓** | ✗ | ✗ | ✗ | ✗ | `PROPOSED` or `NEGOTIATING` | None | `AGREED` |
| `fundEscrow` | **✓** | ✗ | ✗ | ✗ | ✗ | ✗ | `AGREED` | Locks `msg.value == totalAmount` in vault | `FUNDED` |
| `startWork` | ✗ | **✓** | ✗ | ✗ | ✗ | ✗ | `FUNDED` | None | `IN_PROGRESS` |
| `anchorEvidence` | **✓** | **✓** | **✓** (Designated) | ✗ | ✗ | ✗ | `IN_PROGRESS`, `EVIDENCE_SUBMITTED`, `VERIFICATION` | None | `EVIDENCE_SUBMITTED` |
| `requestVerification` | **✓** | **✓** | ✗ | ✗ | ✗ | ✗ | `EVIDENCE_SUBMITTED` | None | `VERIFICATION` |
| `submitVerification` | ✗ | ✗ | **✓** (Strictly Designated) | ✗ | ✗ | ✗ | `VERIFICATION` | None (Attestation recorded) | `VERIFICATION` (Outcome: PASS/FAIL/INCONCLUSIVE) |
| `releaseEscrow` | **✓** | ✗ | ✗ | ✗ | ✗ | ✗ | `VERIFICATION` (if verifier set, requires PASS) | Transfers `totalAmount` to `seller`; mints Soulbound Trust Receipt | `SETTLED` *(Terminal)* |
| `refundTransaction` | **✓** (Post-deadline) | **✓** (Consent) | ✗ | ✗ | ✗ | ✗ | `FUNDED`, `IN_PROGRESS`, `EVIDENCE_SUBMITTED`, `VERIFICATION` | Transfers `totalAmount` to `buyer` | `REFUNDED` *(Terminal)* |
| `openDispute` | **✓** | **✓** | ✗ | ✗ | ✗ | ✗ | `FUNDED`, `IN_PROGRESS`, `EVIDENCE_SUBMITTED`, `VERIFICATION` | Freezes escrow | `DISPUTED` |
| `resolveDispute` | ✗ | ✗ | ✗ | **✓** | ✗ | ✗ | `DISPUTED` | Splits escrow between `buyer` & `seller`; mints Soulbound Trust Receipt | `SETTLED` / `REFUNDED` *(Terminal)* |
| `withdrawPendingFunds` | **✓** | **✓** | ✗ | ✗ | ✗ | **✓** (Anyone with balance) | Any | Withdraws `pendingWithdrawals[caller]` | No state change |
| `setDisputeResolver` | ✗ | ✗ | ✗ | ✗ | **✓** | ✗ | Any | None | Updates resolver address |

---

## 2. Detailed Method Analysis & Invariant Rules

### 2.1 `createTransaction` & `createTransactionWithVerifier`
- **Authorized Callers**: Any account can initiate a transaction as `buyer`.
- **Preconditions**:
  - `transactionId != bytes32(0)`
  - `txRecord.buyer == address(0)` (cannot overwrite existing transaction)
  - `seller != msg.sender` (self-trading prohibited)
  - `amount > 0`
  - `fulfillmentDeadline > block.timestamp`
- **Financial Effect**: If `msg.value > 0`, requires `msg.value == amount`, sets state directly to `FUNDED`, and increments `totalEscrowLiabilities`. Otherwise `msg.value` must be 0.
- **State Transition**: `UNREGISTERED` → `PROPOSED` (or `FUNDED`).

### 2.2 `agreeTransaction`
- **Authorized Callers**: Strictly `txRecord.seller`.
- **Preconditions**: State must be `PROPOSED` or `NEGOTIATING`.
- **Financial Effect**: None.
- **State Transition**: → `AGREED`.

### 2.3 `fundEscrow`
- **Authorized Callers**: Strictly `txRecord.buyer`.
- **Preconditions**: State must be `AGREED`. `msg.value` must exactly equal `txRecord.totalAmount`.
- **Financial Effect**: Vault balance increases by `msg.value`; `totalEscrowLiabilities` increases by `msg.value`.
- **State Transition**: `AGREED` → `FUNDED`.

### 2.4 `startWork`
- **Authorized Callers**: Strictly `txRecord.seller`.
- **Preconditions**: State must be `FUNDED`.
- **Financial Effect**: None.
- **State Transition**: `FUNDED` → `IN_PROGRESS`.

### 2.5 `anchorEvidence`
- **Authorized Callers**: `txRecord.seller`, `txRecord.buyer`, and designated `txRecord.verifier`.
- **Preconditions**:
  - State must be `IN_PROGRESS`, `EVIDENCE_SUBMITTED`, or `VERIFICATION`.
  - `contentHash != bytes32(0)`.
- **Financial Effect**: None. Escrow liabilities and balances are completely untouched.
- **State Transition**: → `EVIDENCE_SUBMITTED`.

### 2.6 `requestVerification`
- **Authorized Callers**: `txRecord.seller` or `txRecord.buyer`.
- **Preconditions**: State must be `EVIDENCE_SUBMITTED`.
- **Financial Effect**: None.
- **State Transition**: `EVIDENCE_SUBMITTED` → `VERIFICATION`.

### 2.7 `submitVerification`
- **Authorized Callers**: Strictly the designated `txRecord.verifier` (where `verifier != address(0)`).
- **Mandatory Boundary**: Neither buyer nor seller can call this method when an independent verifier is configured. (If no verifier is configured, `verifier == address(0)` and this method reverts with `NotDesignatedVerifier`).
- **Preconditions**: State must be `VERIFICATION`.
- **Financial Effect**: None. Verifier has zero fund movement capability.
- **State Transition**: Updates `verificationOutcome` (`PASS`, `FAIL`, or `INCONCLUSIVE`). State remains `VERIFICATION`.

### 2.8 `releaseEscrow`
- **Authorized Callers**: Strictly `txRecord.buyer`.
- **Preconditions**:
  - If `txRecord.verifier != address(0)`:
    - Must be in `VERIFICATION` state.
    - If `verificationOutcome == INCONCLUSIVE`, strictly reverts with `VerificationInconclusive(transactionId)`.
    - If `verificationOutcome != PASS`, strictly reverts with `VerificationNotPassed(transactionId)`.
  - If `txRecord.verifier == address(0)` (no independent verifier policy):
    - Must be in active pre-settlement state (`FUNDED`, `IN_PROGRESS`, `EVIDENCE_SUBMITTED`, `VERIFICATION`).
- **Financial Effect**: Disburses `txRecord.totalAmount` to `txRecord.seller`. Decreases `totalEscrowLiabilities`.
- **State Transition**: → `SETTLED` *(Terminal)*.
- **Trust Receipt Issuance**: Mints a non-transferable Soulbound Trust Receipt to `receiptRegistry` with status `ResolutionState.SETTLED`.

### 2.9 `refundTransaction`
- **Authorized Callers**:
  - `buyer`: Allowed if `block.timestamp >= txRecord.fulfillmentDeadline`.
  - `seller`: Allowed at any time prior to settlement (mutual consent to refund).
- **Preconditions**: State must be active pre-settlement state (`FUNDED`, `IN_PROGRESS`, `EVIDENCE_SUBMITTED`, `VERIFICATION`).
- **Financial Effect**: Disburses `txRecord.totalAmount` to `txRecord.buyer`. Decreases `totalEscrowLiabilities`.
- **State Transition**: → `REFUNDED` *(Terminal)*.

### 2.10 `openDispute`
- **Authorized Callers**: Strictly `txRecord.buyer` or `txRecord.seller`.
- **Preconditions**: State must be active pre-settlement state (`FUNDED`, `IN_PROGRESS`, `EVIDENCE_SUBMITTED`, `VERIFICATION`).
- **Financial Effect**: Freezes funds; locks out unilateral release or refund.
- **State Transition**: → `DISPUTED`.

### 2.11 `resolveDispute`
- **Authorized Callers**: Strictly `disputeResolver`.
- **Preconditions**: State must be `DISPUTED`. `buyerShareBps <= 10000`.
- **Financial Effect**:
  - Calculates `buyerPayout = (totalAmount * buyerShareBps) / 10000`.
  - Calculates `sellerPayout = totalAmount - buyerPayout`.
  - Disburses funds strictly to `txRecord.buyer` and `txRecord.seller`.
  - Zero loss of funds; decrements `totalEscrowLiabilities` by `totalAmount`.
- **State Transition**: → `SETTLED` (or `REFUNDED` if `buyerShareBps == 10000`). *(Terminal)*.
- **Trust Receipt Issuance**: Mints a non-transferable Soulbound Trust Receipt to `receiptRegistry`.

### 2.12 `withdrawPendingFunds`
- **Authorized Callers**: Any account with positive `pendingWithdrawals[caller]`.
- **Financial Effect**: Transfers accumulated pending balance via pull-payment pattern.

### 2.13 `setDisputeResolver`
- **Authorized Callers**: Strictly contract `owner()`.
- **Preconditions**: `newResolver != address(0)`.
- **Financial Effect**: None.
- **State Transition**: Updates `disputeResolver` and emits `DisputeResolverUpdated(oldResolver, newResolver)`.

---

## 3. Core Protocol Invariants

1. **Solvency Invariant**:
   $$\text{address(this).balance} \ge \text{totalEscrowLiabilities} + \sum \text{pendingWithdrawals}$$
   This property is verified mathematically and via Foundry invariant fuzz tests.

2. **Immutable Counterparty Invariant**:
   At no point during any state transition can `buyer` or `seller` addresses be reassigned, redirected, or overwritten. Payouts always go directly to the registered counterparties.

3. **Receipt Non-Interference Invariant**:
   `receiptRegistry.issueReceipt()` has zero access to escrow vaults and cannot modify accounting, balances, or state outcomes.
