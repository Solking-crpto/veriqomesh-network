# TrustMesh Trust Receipt Privacy & Selective Disclosure

**Version**: 1.0 (Stage 3)  
**Status**: Executable Specification & Production Architecture  
**Target Contracts**: `contracts/src/TrustReceiptRegistry.sol`  
**SDK Package**: `packages/sdk/src/hashing.ts`  

---

## 1. Zero-PII Onchain Guarantee

Commercial transactions frequently involve confidential, competitive, or personally identifiable information (PII), such as:
- Corporate legal entities, registration numbers, and tax identifiers
- Physical shipping addresses and warehouse bay numbers
- Unit prices, wholesale discounts, and proprietary bill-of-materials
- Individual truck driver names, phone numbers, and vehicle license plates
- High-resolution photographs of proprietary industrial hardware

**TrustMesh guarantees that ZERO PII is ever written to the Monad blockchain or any public ledger.**

### What Is Stored Onchain vs. Offchain

| Data Field | Storage Location | Privacy Protection |
| :--- | :--- | :--- |
| **Buyer Address** | Onchain (`address`) | Pseudonymous cryptographic public key |
| **Seller Address** | Onchain (`address`) | Pseudonymous cryptographic public key |
| **Settlement Timestamp** | Onchain (`uint64`) | Public block time |
| **Final Settlement Amount** | Onchain (`uint256`) | Public settlement value (Native MON or Token) |
| **Terminal Outcome** | Onchain (`enum`) | Public status (`SETTLED` / `REFUNDED`) |
| **Verification Outcome** | Onchain (`enum`) | Public technical status (`PASS`, `FAIL`, `INCONCLUSIVE`) |
| **Evidence Digests** | Onchain (`bytes32`) | One-way cryptographic hashes (`contentHash`, `metadataHash`) |
| **Summary Digest** | Onchain (`bytes32`) | One-way cryptographic hash of canonical transaction summary |
| **Physical Address / Facility** | **Offchain Only** | Retained exclusively by Buyer, Seller & Verifier |
| **Inspection Photographs** | **Offchain Only** | Content-addressed offchain storage |
| **Carrier Bill of Lading** | **Offchain Only** | Encrypted or restricted offchain storage |
| **Hardware Serial Numbers** | **Offchain Only** | Hashed in metadata; raw lists held privately |

---

## 2. Selective Disclosure Architecture

Selective disclosure allows transacting parties to prove transaction fulfillment to external third parties (e.g., commercial banks, audit firms, insurance underwriters, or tax agencies) without revealing trade secrets to the general public.

```
+-----------------------------------------------------------------------------------+
|                        OFFCHAIN CANONICAL RECEIPT DOCUMENT                        |
|                                                                                   |
|   {                                                                               |
|       "transactionId": "0x4a9b...c1d2",                                           |
|       "buyerName": "Texas Clean Energy Fund LLC",                                 |
|       "sellerName": "Helios Solar Manufacturing Inc.",                            |
|       "deliveryAddress": "Warehouse 4, Dallas, TX 75201",                         |
|       "panelType": "Grade-A 400W Monocrystalline",                                |
|       "quantity": 100,                                                            |
|       "totalSettledMON": "20.0",                                                  |
|       "inspectionReportUri": "ipfs://bafybeic..."                                 |
|   }                                                                               |
+-----------------------------------|-----------------------------------------------+
                                    |
                           Canonicalize & Hash
                                    |
                                    v
                          0x7f8e...3a1b (Digest)
                                    |
                                    | Compare
                                    v
+-----------------------------------------------------------------------------------+
|                     ONCHAIN TRUST RECEIPT (PUBLIC BLOCKCHAIN)                     |
|                                                                                   |
|   TrustReceipt {                                                                  |
|       transactionId: 0x4a9b...c1d2                                                |
|       summaryHash:   0x7f8e...3a1b   <--- EXACT MATCH VERIFIED                    |
|       status:        SETTLED                                                      |
|   }                                                                               |
+-----------------------------------------------------------------------------------+
```

### Verification Flow for Auditors:
1. Party presents the offchain canonical JSON receipt to an auditor or lender.
2. The auditor runs `keccak256(canonicalizeJson(receiptPayload))` using the TrustMesh SDK.
3. The auditor queries the public onchain registry:
   ```typescript
   const receipt = await trustReceiptRegistry.getReceiptByTransaction(txId);
   const isValid = receipt.summaryHash === computedDigest;
   ```
4. If hashes match, the auditor has mathematical certainty that:
   - The transaction occurred exactly as described in the private document.
   - The specified payment was settled onchain.
   - The designated verifier confirmed the inspection outcome.
   - No data has been altered since settlement.

---

## 3. Regulatory & GDPR Compliance

1. **Right to Be Forgotten**:
   - Because all PII remains offchain, transacting parties can delete local copies of invoices, driver logs, and inspection imagery at the conclusion of statutory retention periods.
   - The remaining onchain `bytes32` hashes cannot be reverse-engineered into names, addresses, or private details.

2. **Tamper-Evident Non-Repudiation**:
   - Neither counterparty can fabricate an alternate version of the contract or receipt after the fact, as any alteration results in a hash mismatch against the immutable Monad record.

3. **Future Zero-Knowledge (ZK) Proof Roadmap**:
   - In Stage 4+, TrustMesh will introduce ZK-proof verification (Groth16/Plonk) enabling parties to prove statements (such as *"Delivery took place in Texas"* or *"Cargo passed inspection with 0 defects"*) directly onchain without revealing the facility location or verifier identity.
