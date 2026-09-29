# VeriqoMesh Network — Envio HyperIndex Indexer

This directory contains the read-only onchain provenance and event indexing configuration for **VeriqoMesh Network** on **Monad Metropolis Testnet** (Chain ID: `10143`), powered by [Envio HyperIndex](https://envio.dev).

---

## 1. Overview

The VeriqoMesh Envio indexer ingests, indexes, and serves all critical lifecycle and provenance events emitted by the authoritative VeriqoMesh smart contracts on Monad Metropolis Testnet:

* **TrustMeshEscrow**: `0x925ea880cA53DE0352b84B24d0C0dee5B258015A`
* **TrustReceiptRegistry**: `0xE1994e0dF7CD5A836be4b02AE2164A542418B819`
* **Dispute Resolver**: `0x12f9e53c31F7629aCAE0BA70588794945EC6c35E`
* **Monad Chain ID**: `10143`
* **RPC Endpoint**: `https://testnet-rpc.monad.xyz`
* **Indexing Start Block**: `65000000`

---

## 2. Indexed Lifecycle Events

The indexer captures 12 discrete onchain lifecycle transitions:

1. `TransactionCreated`: Initial deposit and parameters registered in escrow.
2. `TransactionAgreed`: Counterparty onchain agreement to commercial terms.
3. `TransactionFunded`: Buyer funding escrow liabilities.
4. `TransactionStarted`: Work commencement declaration by seller.
5. `EvidenceAnchored`: Immutable SHA-256 deliverable content hashes anchored onchain.
6. `VerificationStarted`: Independent verification audit triggered.
7. `VerificationSubmitted`: Attestation logged (`PASS`, `FAIL`, or `INCONCLUSIVE`).
8. `DisputeOpened`: Escalation to multi-judge dispute review when outcome is contested.
9. `DisputeResolved`: Quorum consensus median execution dispatched by resolver.
10. `TransactionSettled`: Authorized terminal payout disbursed to seller.
11. `TransactionRefunded`: Authorized buyer restitution.
12. `TrustReceiptIssued`: Non-transferable Soulbound receipt minted in registry.

---

## 3. GraphQL Schema Entities

* **`Transaction`**: Full lifecycle record with status, timestamps, evidence counters, and receipts.
* **`EvidenceAnchor`**: Cryptographic evidence content hashes and submitter metadata.
* **`VerificationAttestation`**: Verifier audit records with outcome classifications.
* **`DisputeRecord`**: Quorum consensus parameters, resolver actions, and basis point distributions.
* **`TrustReceipt`**: Soulbound verification and settlement proofs.
* **`LifecycleEvent`**: Unified chronological audit timeline across all transactions.

---

## 4. Running the Indexer

### Prerequisites
* Node.js >= 20.0.0
* Docker (for local database & Hasura GraphQL engine)
* Linux, macOS, or Windows via WSL2

### Local Execution
```bash
cd indexer

# Install dependencies
npm install

# Generate Envio types from ABIs and schema
npm run codegen

# Start local indexer and GraphQL engine
npm run dev
```

The GraphQL endpoint will be available at:
`http://localhost:8080/v1/graphql`

### Production / Envio Cloud Deployment
1. Log in to the [Envio Hosted Service](https://envio.dev).
2. Connect the GitHub repository `https://github.com/Solking-crpto/veriqomesh-network`.
3. Set root directory to `indexer`.
4. Deploy the indexer.
5. Provide the resulting production GraphQL URL in Next.js as `NEXT_PUBLIC_ENVIO_GRAPHQL_URL`.

---

## 5. Frontend Graceful Fallback Architecture

The VeriqoMesh frontend (`apps/web`) seamlessly reads from:
1. **Envio HyperIndex GraphQL Endpoint** (`NEXT_PUBLIC_ENVIO_GRAPHQL_URL`) when available.
2. **Direct Monad Metropolis RPC / Onchain Audit Trail** automatically when the GraphQL endpoint is offline or unset.

This guarantees zero UI disruption, zero downtime, and authoritative data integrity across all environments.
