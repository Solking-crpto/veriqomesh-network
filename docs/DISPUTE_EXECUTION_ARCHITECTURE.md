# Dispute Execution Architecture

**Protocol Version**: VeriqoMesh Network Stage 4  
**Target Contracts**: `contracts/src/TrustMeshEscrow.sol` (unchanged deployed contracts)  
**Security Level**: High-Assurance Financial Custody with Multi-Human Adjudication Gate  

---

## 1. Executive Summary & Primitive Separation

In VeriqoMesh Network, there is a fundamental architectural distinction between:

1. **The Low-Level Settlement Primitive (`resolveDispute`)**: An isolated onchain execution function in `TrustMeshEscrow.sol` callable exclusively by the authorized dispute resolver address (`0x12f9e53c31F7629aCAE0BA70588794945EC6c35E`, labeled `"Temporary designated testnet dispute resolver"`, rotated from historical initial test account `0x90F79bf6EB2c4f870365E785982E1f101E93b906`). It enforces terminal settlement according to an exact basis-point ratio (`buyerShareBps`).
2. **The Human Judge Network Orchestration Layer**: The offchain consensus framework (implemented in Stage 4 as a *Functional Local Simulation and Coordination Framework for a Human Judge Network MVP*) where qualified human adjudicators review structured AI evidence dossiers, cryptographically attest to absence of conflict of interest, submit independent signed ballots with written rationales, and achieve 3-Judge Median Consensus protected by a Polarization Guard.
3. **The Settlement Authorization Gate**: The strict validation layer that mathematically and cryptographically verifies human consensus before generating authorized calldata for onchain execution.

> [!IMPORTANT]
> The basis-points resolver `resolveDispute()` is **NOT** the decentralized Human Judge Network itself; it is the cryptographic and financial boundary that executes binding verdicts rendered by authorized resolvers.

---

## 2. Complete Dispute Orchestration Lifecycle

```
[DISPUTE OPENED] ──────────────── Unilateral trigger by Buyer or Seller (openDispute)
       │
       ▼
[CASE FROZEN] ─────────────────── Escrow locked onchain; releases & refunds blocked
       │
       ▼
[AI EVIDENCE DOSSIER] ────────── AI compiles neutral chronology & flags discrepancies
       │                         (Labeled "AI_ANALYZED — HUMAN REVIEW REQUIRED"; ZERO voting power)
       │
       ▼
[3-JUDGE PANEL ASSIGNMENT] ────── Deterministically assigned with Strict Role Isolation
       │                         (Buyer, Seller, Verifier CANNOT judge case)
       │
       ▼
[CONFLICT ATTESTATION] ────────── Judges sign EIP-191 declarations; blocked if unverified (duplicates rejected)
       │
       ▼
[INDEPENDENT BALLOTS] ─────────── 3 judges submit signed BPS [0, 10000] with mandatory rationale
       │
       ▼
[3-JUDGE MEDIAN CONSENSUS] ────── Consensus BPS = median(B1, B2, B3)
       │
       ├─ If spread > 4000 bps ─► [POLARIZED / REQUIRES_SENIOR_REVIEW] (Dispatch BLOCKED)
       │
       ▼ (If spread <= 4000 bps)
[CANONICAL ADJUDICATION RECORD] ─ Key-sorted JSON hashed (Keccak-256) & assigned deterministic simulated IPFS CID
       │
       ▼
[SETTLEMENT AUTHORIZATION GATE] ─ Enforces 3/3 quorum, 3/3 attestations, spread <= 4000, exact BPS
       │
       ▼
[AUTHORIZED ONCHAIN DISPATCH] ─── Encodes resolveDispute(transactionId, buyerShareBps)
                                  Executed onchain by Temporary designated testnet dispute resolver
```

---

## 3. Dispute Ratio Semantics (`buyerShareBps`)

Dispute outcomes are parameterized as basis points ($1 \text{ bps} = 0.01\%$) awarded to the Buyer, with the exact remainder mathematically conserved and disbursed to the Seller:

$$\text{Buyer Payout} = \frac{\text{totalAmount} \times \text{buyerShareBps}}{10000}$$
$$\text{Seller Payout} = \text{totalAmount} - \text{Buyer Payout}$$

### Standard Semantics & Invariants
- `0`: 0% to Buyer / 100% to Seller. Resulting state: `SETTLED`.
- `1500`: **15% to Buyer / 85% to Seller**. Partial delivery/damage compromise. Resulting state: `SETTLED`.
- `5000`: 50% to Buyer / 50% to Seller. Equal split. Resulting state: `SETTLED`.
- `10000`: 100% to Buyer / 0% to Seller. Total non-delivery or fraud. Resulting state: `REFUNDED`.
- `> 10000`: **Strictly Reverted** with `SettlementRatioOutOfRange(buyerShareBps)`.

**Mathematical Conservation Invariant:**
$$\text{Buyer Payout} + \text{Seller Payout} \equiv \text{totalAmount}$$
$$\Delta \text{totalEscrowLiabilities} = -\text{totalAmount}$$
$$\text{address(escrow).balance} \ge \text{totalEscrowLiabilities} \quad \forall \text{ operations}$$

---

## 4. Strict AI Firewall & Authority Boundaries

AI models provide indexing and administrative support for human jurors but are completely isolated from financial authority:

### Permitted AI Functions
- Synthesize disorganized chat logs, delivery receipts, and inspection reports into a neutral chronological timeline.
- Extract concrete claims made by the initiator and compare against counterparty submissions.
- Highlight technical contradictions (e.g. tracking number marked delivered after dispute opened).
- Prepare standardized docket dossiers for human juror review labeled `'AI_ANALYZED — HUMAN REVIEW REQUIRED'`.

### Absolute Negative Boundaries (What AI Can NEVER Do)
- **Zero Financial Authority**: AI services have no Ethereum private keys and cannot sign or broadcast transactions.
- **Zero Juror Voting**: AI cannot cast votes or represent a juror seat.
- **No Direct Fund Release**: AI cannot invoke `releaseEscrow()`, `refundTransaction()`, or `resolveDispute()`.
- **No Settlement Recommendations**: AI cannot suggest a specific basis-point allocation or recommend a payout ratio.
- **No Penalties**: AI cannot penalize parties or alter agreed escrow terms.

---

## 5. Resolver Administration & Security Boundary

The dispute resolver address in `TrustMeshEscrow.sol` is part of the financial security perimeter:

1. **Active Configuration**: Configured on Monad Metropolis Testnet to `0x12f9e53c31F7629aCAE0BA70588794945EC6c35E`, labeled:
   `"Temporary designated testnet dispute resolver"`.
2. **Historical Initial Configuration**: Deployed originally with `0x90F79bf6EB2c4f870365E785982E1f101E93b906`, subsequently rotated onchain via `setDisputeResolver()` in transaction `0x28df4640e7e77b1599096e540cf04ae25e4e1a5bb57ab00c20f2088564499c70` (block 65116905).
3. **Authorized Replacement**: Updatable exclusively by contract `owner` via `setDisputeResolver(address newResolver)`.
4. **Zero Address Protection**: Reverts if `newResolver == address(0)`.
5. **Immediate Authority Cutoff**: Once replaced, the old resolver loses all execution authority immediately. Any subsequent calls by the old resolver revert with `UnauthorizedActor`.
6. **Event Emission**: Emits `DisputeResolverUpdated(oldResolver, newResolver)` to alert monitoring infrastructure.

---

## 6. Signature Model & EIP-191 Limitation

Stage 4 currently implements **EIP-191 version 0x45 (`personal_sign`)**:
- Fields signed: `transactionId`, `judgeAddress`, `buyerShareBps`, `rationale`, and `timestamp`.
- Guarantees: Non-repudiation of judge identity, integrity of vote payload, and transaction-level replay prevention.
- **Limitation**: Cross-application and cross-chain domain separation is **NOT** provided by EIP-191 plain strings (no `chainId` or `verifyingContract` is embedded). Migrating to EIP-712 is a future protocol hardening option; this limitation is accepted for the current offchain coordination MVP.

---

## 7. Trust Receipt Linkage & Storage Architecture

1. **Onchain Trust Receipt**: Issued by `TrustReceiptRegistry.sol` upon settlement. Records the onchain `evidenceRoot` (delivery evidence hash) and settlement amounts.
2. **Offchain Adjudication Record**: Stored in the dispute service and assigned a **simulated IPFS-style CID reference** generated deterministically for the local MVP (`ipfs://bafy-adjudication-...`). No actual decentralized IPFS node upload occurs.
3. **Current Deployed Boundary**: The deployed Solidity `TrustReceiptRegistry.sol` does **not** store the Stage 4 adjudication hash/CID onchain. Direct onchain linkage would require a future smart contract change and redeployment.


