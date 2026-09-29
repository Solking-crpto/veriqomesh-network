# TrustMesh Evidence Model & Commitment Architecture

**Version**: 1.0 (Stage 3)  
**Status**: Executable Specification & Production Architecture  
**Target Contracts**: `contracts/src/TrustMeshEscrow.sol`, `contracts/src/interfaces/ITrustMeshTypes.sol`  
**SDK Package**: `packages/sdk/src/hashing.ts`  

---

## 1. Executive Summary

In TrustMesh, real-world agreements (such as the delivery of 100 commercial solar panels to a Dallas facility) require irrefutable, tamper-evident proof of fulfillment before escrowed capital is disbursed. However, storing raw documents, high-resolution cargo imagery, bills of lading, or inspection logs directly onchain is financially prohibitive and violates data privacy standards (such as GDPR).

The **TrustMesh Evidence Model** establishes a deterministic offchain-to-onchain cryptographic commitment framework. Evidence payload bytes and metadata are anchored to the blockchain exclusively as cryptographic digests (`bytes32`), while the underlying payloads remain securely distributed offchain.

```
+-----------------------------------------------------------------------------------+
|                               OFFCHAIN EVIDENCE LAYER                             |
|                                                                                   |
|  [Raw Document / Image Bytes]             [Canonical JSON Metadata]               |
|      (e.g., Dallas Cargo Photo)               { "deliveryLocation": "Dallas",     |
|                   |                             "panelCount": 100, ... }          |
|                   v                                       |                       |
|         keccak256(rawBytes)                               v                       |
|                   |                             keccak256(canonicalJson)          |
+-------------------|---------------------------------------|-----------------------+
                    |                                       |
                    +-------------------+   +---------------+
                                        |   |
                                        v   v
+-----------------------------------------------------------------------------------+
|                            ONCHAIN COMMITMENT ANCHOR                              |
|                                                                                   |
|   EvidenceAnchor {                                                                |
|       contentHash:      0xa1b2c3... (hash of raw evidence bytes)                  |
|       metadataHash:     0xd4e5f6... (hash of canonical metadata)                  |
|       storageReference: "ipfs://Qm..." or "ar://..." (retrieval pointer only)    |
|       submitter:        0xSeller / 0xBuyer / 0xVerifier                           |
|       timestamp:        1727092800                                                |
|       status:           ATTESTED / VERIFIED                                       |
|   }                                                                               |
+-----------------------------------------------------------------------------------+
```

---

## 2. Cryptographic Commitment Architecture

Every anchored evidence item contains three decoupled fields:

### 2.1 `contentHash` (`bytes32`)
- **Definition**: The exact cryptographic digest:
  $$\text{contentHash} = \text{keccak256}(\text{rawEvidenceBytes})$$
- **Guarantee**: Any byte-level alteration to the evidence file (e.g. modifying an invoice number, cropping an inspection photo, altering a serial number) changes the hash and invalidates the proof.
- **Reference Implementation**: `packages/sdk/src/hashing.ts` -> `hashEvidenceBytes(bytes)`.

### 2.2 `metadataHash` (`bytes32`)
- **Definition**: The cryptographic digest of the canonicalized, sorted JSON metadata:
  $$\text{metadataHash} = \text{keccak256}(\text{canonicalizeJson}(\text{metadata}))$$
- **Canonicalization Rules**:
  1. Object keys sorted lexicographically (recursive).
  2. Whitespace stripped (compact representation).
  3. No floating-point rounding ambiguities; numeric strings or fixed-precision integers.
  4. UTF-8 encoded before hashing.
- **Guarantee**: Prevents metadata manipulation while maintaining cross-platform parity between TypeScript SDK, Go/Python verification agents, and smart contracts.

### 2.3 `storageReference` (`string`)
- **Definition**: A content-addressed or decentralized pointer indicating where the offchain artifact is located (e.g., `ipfs://bafybeic...`, `ar://txId...`, or `https://storage.trustmesh.network/...`).
- **Strict Boundary**: The `storageReference` is strictly a retrieval locator. The smart contract **never** evaluates or parses the URL, nor does it rely on the locator for cryptographic integrity. If the offchain payload does not hash to `contentHash`, the payload is rejected by clients and verifiers.

---

## 3. Evidence Lifecycle & Status State Machine

The onchain status of an evidence item transitions through an explicit state machine defined in `ITrustMeshTypes.sol`:

```
                       +-------------------+
                       |   SELF_REPORTED   | (Submitted by Seller / Buyer)
                       +---------+---------+
                                 |
        +------------------------+------------------------+
        |                                                 |
        v                                                 v
+-------------------+                             +-------------------+
|    AI_ANALYZED    | (Parsed & summarized        |     ATTESTED      | (Witnessed by 3rd
|   (NON-AUTHORITY) |  by AI worker pipeline)     |                   |  party agent)
+--------+----------+                             +---------+---------+
         |                                                  |
         +------------------------+-------------------------+
                                  |
                                  v
                        +-------------------+
                        |     VERIFIED      | (Affirmed by Designated Independent Verifier)
                        +---------+---------+
                                  |
                   +--------------+--------------+
                   |                             |
                   v                             v
         +-------------------+         +-------------------+
         |     DISPUTED      |         |      REVOKED      | (Evidence proven
         | (Contested during |         |                   |  tampered/fraudulent)
         |  Dispute Phase)   |         +-------------------+
         +-------------------+
```

### State Definitions:
1. `SELF_REPORTED`: Unilateral claim submitted by a transacting party (e.g., seller uploading bill of lading).
2. `ATTESTED`: Corroborated or signed by an external logistics provider or API.
3. `AI_ANALYZED`: Processed by AI structuring agents (OCR, serial number extraction). **Note**: AI analysis changes formatting or adds annotations, but **cannot** verify truth.
4. `VERIFIED`: Confirmed by the cryptographically designated `verifier` address configured in the transaction escrow contract.
5. `DISPUTED`: Subject to active challenge during an escrow dispute proceeding.
6. `REVOKED`: Proven invalid or fraudulent by the dispute resolution outcome.

---

## 4. The Cardinal Firewall Rule: $\text{AI\_ANALYZED} \neq \text{VERIFIED}$

> [!CRITICAL]
> **Strict Agent Boundary**: An AI agent, model, or OCR pipeline **CANNOT** set the evidence status to `VERIFIED` or authorize financial disbursements.
> 
> - AI models are probabilistic and hallucination-prone.
> - An adversarial party can generate synthetic photos or forged bills of lading that fool computer vision models.
> - Therefore, `AI_ANALYZED` is strictly an offchain organizational status. Onchain `VERIFIED` status requires a transaction signed by the private key of the authorized physical-world or independent verifier (`txRecord.verifier`).

---

## 5. Non-Interference With Escrow Liabilities

1. **Zero Financial Mutation**:
   Calling `anchorEvidence()` mutates only the transaction's evidence mapping and increments `evidenceCount`. It **never** alters:
   - `txRecord.totalAmount`
   - `txRecord.tokenAddress`
   - `txRecord.buyer` or `txRecord.seller`
   - `totalEscrowLiabilities`
   - Contract native or ERC-20 token balances

2. **Replay & Collision Protection**:
   - Each evidence anchor is indexed by `(transactionId, evidenceIndex)`.
   - Anchoring is restricted to parties with an active stake in the agreement: `txRecord.buyer`, `txRecord.seller`, and designated `txRecord.verifier`.
   - Anchoring is restricted to active execution states: `IN_PROGRESS`, `EVIDENCE_SUBMITTED`, and `VERIFICATION`. Once a contract is `DISPUTED`, `SETTLED`, or `REFUNDED`, no further evidence can be injected directly into the escrow.

---

## 6. Implementation Reference

### Solidity Data Structure (`ITrustMeshTypes.sol`)
```solidity
struct EvidenceAnchor {
    bytes32 contentHash;
    bytes32 metadataHash;
    string storageReference;
    address submitter;
    uint64 timestamp;
    EvidenceVerificationStatus status;
}
```

### TypeScript Anchor Construction (`packages/sdk/src/client.ts`)
```typescript
const evidence = client.createEvidence({
  rawContent: inspectionReportBuffer,
  metadata: {
    inspector: "Dallas Cargo Verifiers LLC",
    cargoType: "Commercial Solar Panels (100 units)",
    location: "Warehouse 4, Dallas, TX",
    inspectionDate: "2026-09-23"
  },
  storageReference: "ipfs://bafybeic7solarinspectionreport"
});

await client.anchorEvidence(transactionId, evidence);
```
