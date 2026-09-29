# VeriqoMesh Network Dispute & Adjudication Model

**Protocol Version**: VeriqoMesh Network Stage 4  
**Target Contracts**: `contracts/src/TrustMeshEscrow.sol` (authoritative onchain settlement primitive)  
**Security Level**: High-Assurance Financial Custody with Multi-Human Adjudication Gate  

---

## 1. Overview & Guiding Principles

Disputes are an inevitable reality of commercial agreements. When automated verification fails or subjective deliverables are contested, VeriqoMesh Network provides an objective, transparent, and fair dispute adjudication mechanism.

The design is governed by two inviolable rules:
1. **Never allow an AI model to autonomously impose a disputed financial penalty** (Architecture Principle 6).
2. **AI may interpret, organize, summarize and flag evidence, but contested outcomes must use the defined human adjudication process** (Architecture Principle 7).

---

## 2. End-to-End Dispute Protocol Flow

```
[ Step 1: Dispute Trigger ]
  Either Buyer or Seller triggers openDispute() onchain -> Locks escrow into DISPUTED state

[ Step 2: Evidence Dossier Synthesis ]
  AI service structures neutral docket: chronological timeline, claim comparison, discrepancy flags
  Output is explicitly labeled: "AI_ANALYZED — HUMAN REVIEW REQUIRED" (strictly advisory; ZERO financial authority)

[ Step 3: 3-Judge Panel Selection & Strict Role Isolation ]
  Offchain registry assigns a 3-judge panel deterministically based on expertise domains
  Strict Role Isolation: Buyer, Seller, and Verifier can NEVER judge their own case

[ Step 4: Cryptographic Conflict Attestation ]
  Each assigned judge must sign an EIP-191 conflict declaration affirming no counterparty affiliation
  Ballot submission is strictly blocked until attestation is cryptographically verified

[ Step 5: Independent Ballot Submission ]
  Each judge independently submits a signed ballot with:
  - Buyer share in basis points (BPS in [0, 10000])
  - Mandatory written factual rationale
  - Cryptographic wallet signature

[ Step 6: 3-Judge Median Consensus & Polarization Guard ]
  When all 3 ballots are verified:
  - Median calculation: B_consensus = median(B1, B2, B3)
  - Polarization Guard: If spread = max(B) - min(B) > 4000 bps (40%), status = REQUIRES_SENIOR_REVIEW
    Automated settlement dispatch is strictly BLOCKED until appellate review

[ Step 7: Canonical Adjudication Record ]
  Canonical key-sorted JSON record is hashed (Keccak-256) and assigned a deterministic simulated IPFS-style CID

[ Step 8: Settlement Authorization Gate & Onchain Dispatch ]
  Authorization gate validates: 3/3 quorum, 3/3 conflict clearance, spread <= 4000 bps, exact BPS match
  Calldata generated for resolveDispute(transactionId, buyerShareBps)
  Executed onchain by the Temporary designated testnet dispute resolver
```

---

## 3. The Role of AI in Dispute Organization

AI models excel at distilling voluminous, contradictory, or complex documentation into actionable insights for human decision-makers. However, because LLMs are non-deterministic and susceptible to hallucination or prompt injection, their capability in VeriqoMesh disputes is strictly bounded:

### Permitted AI Responsibilities:
- **Timeline Extraction**: Parsing chat transcripts, git commits, and milestone events into a verified chronological event sequence.
- **Contractual Mapping**: Matching each disputed claim against the original structured transaction deliverables.
- **Contradiction Flagging**: Highlighting direct discrepancies between Party A's statements, Party B's statements, and onchain evidence anchors.
- **Neutral Formatting**: Assembling the standardized "Dispute Docket" document presented to human jurors.

### Strictly Prohibited AI Actions:
- Voting on the outcome.
- Determining or recommending a specific settlement percentage or buyer share basis points.
- Triggering contract withdrawals or penalty slashing.
- Overriding human juror decisions.
- Holding or controlling private keys or signing transactions.

All AI outputs carry the explicit classification:
`"AI_ANALYZED — HUMAN REVIEW REQUIRED"`.

---

## 4. Human Judge Network Architecture (Functional Local MVP Simulation)

> [!NOTE]
> **Stage 4 Status: Functional Local Simulation and Coordination Framework for a Human Judge Network MVP**.  
> The current Stage 4 implementation coordinates real cryptographic signatures, 3-judge median consensus mathematics, polarization detection, and settlement authorization gating using in-memory judge profiles. It is an offchain coordination engine and local simulation, NOT yet an open peer-to-peer network or permissionless onchain staking marketplace (which represent future roadmap phases).

### 4.1 Judge Registry & Accountability Profiles
Judges are registered with factual historical performance profiles:
- **Domain Specializations**: e.g., `GENERAL_COMMERCE`, `SOFTWARE_DELIVERY`, `HARDWARE_INSPECTION`, `FREIGHT_LOGISTICS`, `FINANCIAL_MODELS`.
- **Accountability Metrics**: Cases participated, cases completed, conflict attestations count, invalid ballot events, average response time, and written rationale presence rate (factual metrics only; no subjective alignment scoring).

### 4.2 Panel Selection & Role Isolation
For each dispute:
- A panel of **3 distinct qualified judges** is assigned from the active registry matching the case domain.
- **Strict Role Isolation Rule**: The Buyer, the Seller, and the designated Verifier of the transaction are strictly disqualified from serving as judges on that dispute docket.

---

## 5. Conflict Attestation & Independent Voting

### 5.1 Cryptographic Conflict Attestation
Before reviewing confidential dispute details or casting a ballot, each panel member must sign a formal attestation message:
$$\text{Message} = \text{"I, [JudgeAddress], declare under penalty of exclusion that I have no personal, financial, or organizational conflict of interest with Buyer [BuyerAddress] or Seller [SellerAddress] for Dispute [TxId] at [Timestamp]."}$$

Any ballot submitted without a prior valid signed attestation is automatically rejected. Each judge may submit at most one attestation per docket; duplicate submissions are strictly rejected.

### 5.2 Independent Ballot Submission & Signature Model
Each judge independently evaluates the evidence docket and submits:
- `buyerShareBps`: Buyer settlement share in basis points ($0 \le \text{BPS} \le 10000$).
- `rationale`: Comprehensive written justification explaining how evidence anchors and contract terms inform the split.
- `signature`: EIP-191 personal sign over canonical ballot tuple `(transactionId, judgeAddress, buyerShareBps, rationale, submittedAt)`.

> [!IMPORTANT]
> **Signature Model & EIP-191 MVP Limitation:**  
> Stage 4 currently uses **EIP-191 version 0x45 (`personal_sign`)**. The `transactionId`, `judgeAddress`, `buyerShareBps`, `rationale`, and `timestamp` fields are cryptographically bound to the signature. While this guarantees signer non-repudiation and prevents cross-transaction replay, **cross-application and cross-chain domain separation is not provided by the current signature format** (no `chainId` or `verifyingContract` is embedded in the message). Upgrading to EIP-712 typed structured data is a planned future hardening milestone; this is an accepted offchain coordination MVP limitation.

---

## 6. Consensus Engine & Polarization Guard

### 6.1 3-Judge Median Consensus
When all three ballots are received and verified ($B_1 \le B_2 \le B_3$):
$$B_{\text{consensus}} = B_2 = \text{median}(B_1, B_2, B_3)$$

The median formulation offers robust outlier resistance: a single rogue or extremist vote cannot skew the financial outcome away from the middle adjudicator.

### 6.2 Polarization Guard (Spread > 4000 BPS)
If the difference between the highest and lowest vote exceeds 40% ($\text{spread} = B_3 - B_1 > 4000\text{ bps}$):
- Consensus outcome is flagged as **`POLARIZED`**.
- Docket status transitions to **`REQUIRES_SENIOR_REVIEW`**.
- Automated settlement authorization is **STRICTLY BLOCKED**.
- The dispute must undergo senior appellate review before any onchain settlement transaction can be authorized.

---

## 7. Settlement Authorization Gate & Onchain Dispatch

The `SettlementAuthorizationGate` sits between offchain human consensus and onchain execution:

### Invariants Enforced Prior to Authorization:
1. **Quorum Invariant**: Exactly 3 valid human ballots must be present.
2. **Conflict Invariant**: Exactly 3 valid conflict-of-interest attestations must be cleared (duplicates rejected).
3. **Polarization Invariant**: Ballot spread must be $\le 4000\text{ bps}$ (`isPolarized == false`).
4. **Exact Ratio Match**: The dispatched basis points must identically match the 3-Judge Median Consensus ($B_{\text{dispatch}} == B_{\text{consensus}}$).
5. **Authorized Execution**: The dispatched transaction calldata calls `resolveDispute(transactionId, buyerShareBps)` on `TrustMeshEscrow.sol` via the **Temporary designated testnet dispute resolver** (`0x12f9e53c31F7629aCAE0BA70588794945EC6c35E`, rotated onchain from initial testnet account `0x90F79bf6EB2c4f870365E785982E1f101E93b906`).

### Mathematical Conservation Invariant:
$$\text{Buyer Payout} + \text{Seller Payout} \equiv \text{totalEscrowAmount}$$
$$\text{Vault Solvency}: \text{address(escrow).balance} \ge \text{totalEscrowLiabilities}$$

---

## 8. Adjudication Records vs. Onchain Trust Receipts

> [!NOTE]
> **Adjudication vs. Receipt Linkage Boundary:**
> - **Onchain Trust Receipt**: Issued by `TrustReceiptRegistry.sol` upon settlement. It records the onchain `evidenceRoot` (cryptographic hash of delivery evidence), the final financial payout amounts, and the terminal state (`SETTLED` or `REFUNDED`).
> - **Offchain Adjudication Record**: Generated by `AdjudicationRecordManager` upon consensus. It binds the 3 ballots, conflict attestations, AI dossier hash, and consensus outcome into a canonical Keccak-256 hash and a **simulated IPFS-style CID reference** (e.g. `ipfs://bafy-adjudication-...`) generated deterministically for the local MVP (no actual decentralized IPFS node upload occurs).
> - **Current Deployed Boundary**: The deployed Solidity `TrustReceiptRegistry.sol` does **not** store the Stage 4 offchain adjudication CID/hash onchain. Direct onchain receipt linkage would require a future smart contract change and redeployment, which is strictly prohibited for the current testnet deployment.


