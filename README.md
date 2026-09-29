# VeriqoMesh Network

> **The programmable trust layer for human and AI commerce on Monad.**  
> *Define the deal. Protect the transaction. Verify the outcome.*

**Hackathon Track:** Trust, Identity & AI Infrastructure (Monad Metropolis Hackathon)

---

## 1. Executive Summary

**VeriqoMesh Network** connects humans, businesses, and AI agents through verifiable agreements, protected escrow execution, evidence-based independent verification, and accountable consensus-driven dispute resolution.

### The Problem
Modern distributed commerce and autonomous AI agent workflows separate what should be a unified lifecycle:
- Identity and mandates are fragmented;
- Payments are either uncollateralized or locked in opaque, custodial silos;
- Evidence is scattered across offchain chats, tracking portals, and spreadsheets;
- AI agents lack accountable financial firewalls—either risking autonomous unauthorized treasury loss or operating with zero economic enforceability;
- When outcomes are contested, dispute resolution is manual, subjective, or non-existent.

### The Solution: Programmable Trust Fabric
VeriqoMesh unifies these isolated layers into an end-to-end, non-custodial, programmable transaction lifecycle:
$$\text{Intent} \longrightarrow \text{Agreement} \longrightarrow \text{Protection} \longrightarrow \text{Execution} \longrightarrow \text{Evidence} \longrightarrow \text{Verification} \longrightarrow \text{Dispute (Contested Only)} \longrightarrow \text{Settlement} \longrightarrow \text{Trust Receipt}$$

1. **Intent & Agreement**: Human principals or AI-assisted workflows negotiate structured commercial terms, milestone criteria, and designated verification roles under explicit policy constraints.
2. **Escrow Protection**: Non-custodial escrow on high-throughput Monad locks native MON or ERC-20 assets under a formal 14-state machine ensuring mathematical solvency ($V_{\text{bal}} \ge \sum L$).
3. **Execution & Evidence Anchoring**: Raw deliverables remain offchain; cryptographic commitments (Keccak-256 content hashes, metadata hashes, and storage URI hashes) are immutably anchored onchain.
4. **Independent Verification**: A designated independent verifier evaluates deliverable evidence and registers factual attestations (`PASS`, `FAIL`, `INCONCLUSIVE`).
5. **Consensus Dispute Resolution (Contested Only)**: For contested outcomes, advisory AI generates chronological dossiers with zero financial execution power; an independent 3-judge human panel renders deterministic median consensus.
6. **Settlement & Trust Receipt**: Terminal settlement automatically mints an immutable, non-transferable **VeriqoMesh Trust Receipt** carrying cryptographic proof of the transaction's history and final outcome.

---

## 2. Why Monad?

VeriqoMesh is designed to leverage Monad Metropolis as its target execution environment, relying on Monad's architectural capabilities:
- **Target 10,000 TPS & 1-Second Finality (Monad Network Architecture)**: Monad's designed high throughput and rapid finality provide the necessary infrastructure for sub-second escrow state transitions and multi-party verification attestations without long settlement stalls.
- **Parallel EVM Execution (Monad Design)**: Monad's parallel execution engine is designed to allow high-volume concurrent micro-escrows and independent judge ballot submissions to process in parallel across independent state paths.
- **Micro-Fee Predictability (Testnet Economics)**: Monad's gas efficiency is well suited to high-frequency commercial micro-escrows, including the 0.001 MON live testnet transaction demonstrated here.

---

## 3. Core Architecture & Safety Models

### The AI Firewall & Safety Boundary
VeriqoMesh implements a strict, non-negotiable **AI Firewall**:
- **Zero Direct Financial Execution Authority**: AI models may structure natural language intent, extract terms, summarize evidence, and construct case dossiers. AI **never** releases funds, refunds escrow, alters terms, or bypasses verification.
- **Human & Wallet Policy Gates**: All onchain state changes, deposits, and settlement releases require explicit cryptographic signatures from authorized wallets. AI models do not possess unrestricted financial execution authority.
- **No Hidden Private Keys**: The protocol architecture never relies on embedded or server-side private keys for normal user or verifier roles.

### Evidence Model: Anchors vs References
- **Onchain Evidence Anchor**: A 32-byte cryptographic hash commitment (`contentHash`, `metadataHash`, `storageUriHash`, `submitter`, `timestamp`, `isEncrypted`) immutably logged on Monad.
- **Offchain Storage Pointer**: Reference URIs (e.g., `ipfs://<hash>`) point to external data storage. Pointers serve as reference commitments and are never falsely marketed as verified decentralized storage without independent verification.

### Verification Model vs Dispute Adjudication
VeriqoMesh enforces two distinct paths:
1. **Normal Transaction (Independent Verification Flow)**:
   $$\text{AI-Assisted Intent / Policy} \to \text{Authorized Wallet Signing} \to \text{Agreement} \to \text{Escrow Funding} \to \text{Evidence Anchoring} \to \text{Independent Verifier PASS} \to \text{Authorized Release} \to \text{Trust Receipt}$$
   *Normal verified transactions proceed through AI-assisted intent and policy processing, followed by authorized wallet- or policy-controlled onchain financial execution, with release gated by designated independent verification. Autonomous AI models never hold direct or unconstrained financial execution authority.*
2. **Contested Transaction (Human Dispute Adjudication)**:
   $$\text{Evidence Conflict} \to \text{Escrow Protected} \to \text{Advisory AI Dossier} \to \text{3 Independent Human Judges} \to \text{Deterministic Median Consensus} \to \text{Onchain Resolution} \to \text{Trust Receipt}$$
   *Human adjudication is strictly invoked when verification is INCONCLUSIVE or disputed.*

### Privacy Model
- **Selective Cryptographic Disclosure**: Commercial contracts, invoices, and serial numbers remain offchain. Only cryptographic roots, hashes, and commitments touch the public blockchain.
- **Audit Trails**: Counterparties can selectively prove fulfillment and receipt issuance to auditors or regulators using offchain preimage data matching onchain commitments.

---

## 4. Deployed Testnet Infrastructure (Monad Metropolis)

The smart contracts are deployed and verified on **Monad Metropolis Testnet** (`Chain ID: 10143`):

| Contract Component | Onchain Address | MonadVision Explorer | Function |
| :--- | :--- | :--- | :--- |
| **TrustMeshEscrow** | `0x925ea880cA53DE0352b84B24d0C0dee5B258015A` | [View on Explorer](https://testnet.monadvision.com/address/0x925ea880cA53DE0352b84B24d0C0dee5B258015A) | 14-State Escrow Vault with Solvency Invariant |
| **TrustReceiptRegistry** | `0xE1994e0dF7CD5A836be4b02AE2164A542418B819` | [View on Explorer](https://testnet.monadvision.com/address/0xE1994e0dF7CD5A836be4b02AE2164A542418B819) | Soulbound Non-Transferable Accountability Receipts |
| **Active Dispute Resolver** | `0x12f9e53c31F7629aCAE0BA70588794945EC6c35E` | [View on Explorer](https://testnet.monadvision.com/address/0x12f9e53c31F7629aCAE0BA70588794945EC6c35E) | Authorized Stage 4 Dispute Dispatcher |

---

## 5. Authoritative Live Onchain Transactions

### Live Flow A: Complete End-to-End Normal Settlement (Receipt #3)
- **Transaction ID**: `0x961c70865bf6097eb16d1b3a19d90f950b2cdd789eda5554c93baba1de0954e1`
- **Buyer**: `0xa4bCC57d40311D715ECe34940191820d4a81C50F`
- **Seller**: `0x0e73dBFf9047423b520FA9fc23a95645fC986Ee8`
- **Designated Verifier**: `0xb064d69428B9838C2a3e408cF995ea8eb5182c48`
- **Amount**: `0.001 MON`
- **Final Onchain State**: **`11 (SETTLED)`**
- **Verification Result**: **`1 (PASS)`**
- **Settlement Transaction**: [`0x691f7a80d65fe1deece2f45e8b6600ee4b2b0ffc14f3fe733d995566e2d83b52`](https://testnet.monadvision.com/tx/0x691f7a80d65fe1deece2f45e8b6600ee4b2b0ffc14f3fe733d995566e2d83b52) (Block `66436615`)
- **Trust Receipt**: **Receipt #3** on `TrustReceiptRegistry`

#### Complete 10-Step Onchain Lifecycle Trace:
1. **Transaction Proposed**: `createTransactionWithVerifier` — Tx [`0xeddd26b0...`](https://testnet.monadvision.com/tx/0xeddd26b03699fa0dd8aabd5a8ff260abca029ece60c13dae916fe4060f33e2cd) (Block `65963660`)
2. **Mutual Agreement**: `agreeTransaction` — Tx [`0x4ac4c4b6...`](https://testnet.monadvision.com/tx/0x4ac4c4b6cdf18b753f5e5f536f83a93545c5c185129ea58418ca9e38cdf11f8a) (Block `65963910`)
3. **Escrow Funding**: `fundEscrow` — 0.001 MON deposited (Timestamp `1790502098`, State `4 FUNDED`)
4. **Work Started**: `startWork` — Tx [`0xb085f043...`](https://testnet.monadvision.com/tx/0xb085f04396db481be7d06034a6b86c345d522b5ce79bf968fb24b05b3dfb470b) (Block `66098350`)
5. **Evidence Anchored**: `anchorEvidence` (Bill of Lading) — Tx [`0x698ef9be...`](https://testnet.monadvision.com/tx/0x698ef9bed9a8007db66a6047187783dd97d026055b0f2e30cfe75826ad7b923e) (Block `66434952`)
6. **Verification Requested**: `requestVerification` — Tx [`0x0c1a3b6b...`](https://testnet.monadvision.com/tx/0x0c1a3b6b468da55a01f11bf77ae0b016a6053cef4d3673aabf56c5995131a121) (Block `66436074`)
7. **Verification Attestation**: `submitVerification` (`PASS`) — Tx [`0x4d4ff904...`](https://testnet.monadvision.com/tx/0x4d4ff904821b9d3fe145b00a0e27f2096e567155a6d20c50e7b6913095f29bb0) (Block `66436440`)
8. **Authorized Release**: `releaseEscrow` — Tx [`0x691f7a80...`](https://testnet.monadvision.com/tx/0x691f7a80d65fe1deece2f45e8b6600ee4b2b0ffc14f3fe733d995566e2d83b52) (Block `66436615`)
9. **SETTLED State**: State `11 (SETTLED)` reached; 0.001 MON delivered to Seller
10. **Trust Receipt Issued**: `TrustReceiptIssued` event emitted; **Trust Receipt #3** recorded

---

### Live Flow B: Canonical Contested Freight Dispute (Receipt #2)
- **Transaction ID**: `0x2b57d6b0ef1ba16a60c4f801d90d27d23e598fd6b1381e0175077201dc6afcc4`
- **Dispute Cause**: Physical delivery of damaged solar panels (85 intact, 15 damaged in transit)
- **Verification Outcome**: `INCONCLUSIVE` (Triggers Stage 4 Human Dispute Panel)
- **Consensus**: 3 Independent Human Judges render 8500 BPS (85% release to Seller / 15% refund to Buyer)
- **Onchain Settlement Dispatch**: [`0x91ff62584f4386250ccb09f28808453bb373273d9fa5f56cf04378c2a78084ba`](https://testnet.monadvision.com/tx/0x91ff62584f4386250ccb09f28808453bb373273d9fa5f56cf04378c2a78084ba) (Block `65147986`)
- **Trust Receipt**: **Receipt #2** on `TrustReceiptRegistry`

---

## 6. How to Run Locally

### Prerequisites
- Node.js `>= 20.0.0`
- Foundry (`forge`, `cast`)
- MetaMask or injected Web3 browser wallet

### Setup & Run
```bash
# Clone the repository
git clone https://github.com/Solking-crpto/veriqomesh-network.git
cd veriqomesh-network

# Install dependencies across monorepo workspaces
npm install

# Build all TypeScript packages & Next.js web application
npm run build

# Start the production web application
npm run start -w @trustmesh/web
```
Open **`http://localhost:3000`** in your browser.

---

## 7. How to Run Tests

### Smart Contract Tests (Foundry)
```bash
cd contracts
forge test -vv
```
*Result: 17/17 tests passing (including fuzz tests, access control, and solvency invariant checks).*

### State Machine & Integration Tests (Node.js Test Runner)
```bash
npm run test
```
*Result: 45/45 tests passing (including 14-state transitions, judge consensus, role isolation, and evidence hashing).*

---

## 8. Navigating the Public Demo

The web application clearly distinguishes between live blockchain execution and simulated demonstrations:

1. **Tab A: Autonomous Procurement (SIMULATED)**:
   - Walkthrough of AI agent commercial intent generation, natural language parameter negotiation, and automated settlement. Clearly labeled **`SIMULATED DEMO`**.
2. **Tab B: Contested Freight Dispute (LIVE READ-ONLY AUDIT)**:
   - Live audit record of Canonical Testnet Transaction `0x2b57...afcc4`, demonstrating the 3-judge human consensus protocol that resolved into onchain settlement and **Trust Receipt #2**.
3. **Tab C: Live Monad Testnet (FRESH LIVE TRANSACTION)**:
   - Full live verification room for Transaction `0x961c...54e1`, showing all 10 verified onchain milestones, verifier attestations, and **Trust Receipt #3**.

---

## 9. Known Limitations & Security Assumptions

- **Testnet Environment**: Operates exclusively on Monad Metropolis Testnet (`Chain ID: 10143`). Testnet assets have no real-world monetary value.
- **Storage Decentralization**: Current offchain IPFS references (`ipfs://`) serve as content-hash integrity commitments. Production mainnet deployment will integrate permanent decentralized storage pinning (e.g., Filecoin/Arweave).
- **Resolver Centralization in Testnet**: Stage 4 human dispute settlement is currently dispatched via a designated testnet resolver address (`0x12f9...c35E`) that enforces consensus signatures offchain before dispatching `resolveDispute`. Future iterations will deploy onchain multi-sig or ZK consensus verification.

---

## 10. Monorepo Structure

```
trustmesh/
├── apps/
│   └── web/                   # Next.js 15 Web Application & Transaction Rooms
├── contracts/
│   ├── src/                   # Solidity Contracts: TrustMeshEscrow, TrustReceiptRegistry
│   └── test/                  # Foundry Unit, Fuzz, and Solvency Invariant Tests
├── services/
│   ├── ai/                    # Advisory AI Intent & Docket Generator
│   ├── api/                   # Orchestration API
│   ├── dispute/               # 3-Judge Assignment & Median Consensus Engine
│   └── verification/          # Evidence Verification Attestation Service
├── packages/
│   ├── config/                # Deployed contract addresses, constants, RPC configs
│   ├── sdk/                   # TypeScript SDK with complete typed contract methods
│   └── types/                 # Shared domain types & 14-State Machine definitions
├── tests/                     # Integration, role isolation, & regression test suites
└── scripts/                   # Monad deployment, lifecycle monitors, & audit tools
```

---

## 11. Hackathon Provenance & License

- **Hackathon Build Window**: September 23, 2026 – September 28, 2026.
- **Built for**: Monad Metropolis Hackathon
- **License**: MIT
