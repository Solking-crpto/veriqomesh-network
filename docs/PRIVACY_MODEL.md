# VeriqoMesh Network Privacy Model & Selective Disclosure

## 1. Architectural Philosophy: Accountable Privacy

> **Architecture Principle 9**: *"Privacy must not mean absence of accountability."*

In public blockchain networks, financial transactions and contract parameters are completely transparent by default. However, real-world commercial relationships (B2B procurement, private freelance contracts, proprietary AI datasets) require strict confidentiality. Conversely, total anonymity often invites fraud, rug-pulls, and zero accountability.

TrustMesh balances these conflicting demands through **Selective Disclosure & Cryptographic Commitments**:
- Onchain data is restricted to state transitions, token values, and cryptographic commitments.
- Sensitive terms, deliverables, and personal identifying information remain offchain and encrypted.
- If a dispute arises, encrypted evidence can be selectively revealed to assigned human jurors through cryptographic key shares without publishing it to the public ledger.

---

## 2. Privacy Levels

TrustMesh supports 4 configurable privacy tiers:

| Privacy Level | Onchain Footprint | Deliverable Visibility | Dispute Access |
| :--- | :--- | :--- | :--- |
| **`PUBLIC`** | Full terms hash, open metadata pointer | Publicly readable on IPFS | Any network participant can review |
| **`PSEUDONYMOUS`** | Public EVM addresses, hashed terms | Restricted to counterparty | Assigned juror quorum only |
| **`SELECTIVE_DISCLOSURE`**| Zero-knowledge credential commitments | Encrypted with counterparty public key | Decryption key shared with assigned jurors upon dispute |
| **`CONFIDENTIAL_OFFCHAIN`**| Minimal state anchor & escrow balance | Encrypted end-to-end offchain vault | Only designated auditor / appellate judges can inspect |

---

## 3. Cryptographic Storage & Encryption Flow

To satisfy **Architecture Principle 4** (*"Never put large documents, images or videos directly onchain"*), all files and messages undergo offchain client-side encryption before reaching storage providers:

```
[ Sensitive Evidence / Deliverables ]
                 |
                 v
   [ Client-Side AES-256-GCM Encryption ]
     - Generates Ephemeral Key (K_e)
     - Encrypts payload with K_e -> Ciphertext
     - Computes SHA-256(Ciphertext) -> ContentHash
                 |
                 +---------------------------------------------+
                 |                                             |
                 v                                             v
[ Offchain Storage Provider ]               [ Monad Blockchain ]
  - Uploads Ciphertext to IPFS / S3           - Anchors ContentHash onchain
  - Returns Storage URI (ipfs://...)          - Binds ContentHash to TransactionId
```

---

## 4. Selective Disclosure & Dispute Key Unmasking

When counterparties agree to a private transaction, how is evidence inspected if a dispute occurs?

1. **Bilateral Key Encapsulation (ECIES)**:
   - When submitting evidence, the submitter encrypts the ephemeral symmetric key $K_e$ with the counterparty's public key: $C_{buyer} = \text{Encrypt}(PK_{buyer}, K_e)$.
   - Both parties can decrypt the deliverable during normal operation.

2. **Conditional Key Escrow for Dispute Adjudication**:
   - The protocol utilizes a threshold encryption scheme or secure key exchange when a dispute transitions to `JUDGING`.
   - The disputing party releases an encrypted version of $K_e$ targeted to the public keys of the randomly selected juror quorum:
     $$C_{judge\_i} = \text{Encrypt}(PK_{judge\_i}, K_e)$$
   - Only the assigned jurors can decrypt and inspect the evidence docket.
   - The general public and unassigned network participants see only the onchain `ContentHash`.

---

## 5. Zero-Knowledge Credential Verification

Participants can prove satisfaction of contractual prerequisites (e.g. proof of accredited investor status, proof of valid business registration, or minimum reputation score) without leaking raw personal identity:
- **Verifiable Credential (VC)** issued by an approved issuer.
- **ZK-SNARK Proof**: The user proves onchain that their credential is valid and satisfies the transaction's `IdentityRequirement` without disclosing the underlying legal name, passport number, or tax ID.
- If a participant defaults or acts fraudulently, their portable Trust Receipt and onchain address are penalized, protecting privacy while preserving strict economic accountability.
