# VeriqoMesh Network Architecture Specification

## 1. Executive Overview

**VeriqoMesh Network** is a programmable trust and transaction infrastructure connecting humans, businesses, and AI agents through verifiable agreements, protected execution, evidence-based verification, and accountable dispute resolution. The platform translates natural-language commercial intent into cryptographically secured, structured transactions featuring configurable terms, identity criteria, selective privacy, payment protection, milestone verification (via the Veriqo Verification Layer), and decentralized human dispute adjudication.

The system is architected as an EVM-centric, multi-tier network with **Monad Metropolis** as its primary deployment target, leveraging Monad's 10,000 TPS, 1-second finality, and parallel transaction execution to handle high-frequency escrow lifecycle transitions and evidence anchoring at low gas overhead.

*(Note: Technical smart contract names `TrustMeshEscrow` and `TrustReceiptRegistry`, as well as package namespaces `@trustmesh/*`, are retained for onchain bytecode compatibility and deployment stability).*

---

## 2. Core Architectural Principles

1. **Chain-Aware, Not Chain-Dependent**: The core state machine and protocol rules are defined independently of any specific blockchain runtime. Smart contracts act as final settlement and escrow lock engines.
2. **Monad Primary Target**: Monad Metropolis is the reference deployment target, taking direct advantage of parallel EVM execution and sub-second transaction finality.
3. **Multi-Ecosystem Portability**: Avoid chain-specific non-standard opcodes. Contracts target Cancun EVM with standard OpenZeppelin primitives.
4. **Zero Bloat Onchain**: Never store raw documents, multimedia, or large text strings onchain.
5. **Offchain Evidence with Cryptographic Anchoring**: Private or voluminous evidence resides in offchain storage (IPFS, Arweave, encrypted object storage), with SHA-256 / Keccak-256 root commitments anchored onchain.
6. **Strict Ban on Autonomous AI Financial Penalties**: No AI model or autonomous agent has authority to unilaterally impose financial slashes or execute disputed fund transfers.
7. **Human Adjudication for Contested Outcomes**: AI models are restricted to evidence formatting, timeline structuring, and contradiction flagging. Contested outcomes are adjudicated strictly by the decentralized human judge network.
8. **Deterministic State Progression**: Transactions strictly adhere to an explicit 14-state deterministic state machine.
9. **Accountable Privacy**: Selective disclosure and zero-knowledge commitments ensure privacy without shielding bad-faith actors from dispute accountability.
10. **Security over Feature Quantity**: Formal verification, reentrancy guards, and invariant checks take priority over adding complex speculative features.
11. **Scoped & Verifiable MVP**: Every stage of the roadmap remains testable, demo-ready, and compliant with hackathon submission criteria.

---

## 3. High-Level System Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                                 CLIENT APPLICATIONS                               |
|   Web UI (Next.js / Tailwind)   |   Agent Runtime / SDK   |   External API Client |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                               TRUSTMESH SDK & ABSTRACTIONS                        |
|   +-----------------------+   +----------------------+   +--------------------+   |
|   |   ISignerProvider     |   |   IStorageProvider   |   |    IAIProvider     |   |
|   | (Injected/Privy/4337) |   | (IPFS/S3/Encrypted)  |   | (Gemini/OpenAI/LLM)|   |
|   +-----------------------+   +----------------------+   +--------------------+   |
+-----------------------------------------+-----------------------------------------+
                                          |
                      +-------------------+-------------------+
                      |                                       |
                      v                                       v
+-------------------------------------------+ +-------------------------------------+
|         OFFCHAIN SERVICE MESH             | |         ONCHAIN PROTOCOL (EVM)      |
|                                           | |         (Monad Metropolis Target)   |
|  +-------------------------------------+  | |                                     |
|  | API Gateway / Coordinator           |  | |  +-------------------------------+  |
|  | - Transaction draft negotiation     |  | |  | TrustMeshEscrow.sol           |  |
|  | - Event listener & state sync       |  | |  | - 14-state deterministic FSM |  |
|  +-------------------------------------+  | |  | - Native MON & ERC20 vaults   |  |
|  +-------------------------------------+  | |  | - Time-locked release & refund|  |
|  | AI Processing Engine                |  | |  +-------------------------------+  |
|  | - Intent-to-terms parsing           |  | |  +-------------------------------+  |
|  | - Evidence chronological synthesis  |  | |  | TrustMeshDispute.sol          |  |
|  | - Contradiction identification      |  | |  | - Human judge staking & pool  |  |
|  +-------------------------------------+  | |  | - Quorum voting & consensus   |  |
|  +-------------------------------------+  | |  | - Binding resolution payout   |  |
|  | Verification Worker                 |  | |  +-------------------------------+  |
|  | - Oracle attestation processing    |  | |  +-------------------------------+  |
|  | - Milestone criteria evaluator      |  | |  | TrustReceiptRegistry.sol      |  |
|  +-------------------------------------+  | |  | - Portable soulbound receipts |  |
|  +-------------------------------------+  | |  | - Cryptographic evidence roots|  |
|  | Dispute Coordinator                 |  | |  +-------------------------------+  |
|  | - Juror assignment & stake tracking |  | |                                     |
|  +-------------------------------------+  | |                                     |
+-------------------------------------------+ +-------------------------------------+
```

---

## 4. Monorepo Structure & Package Boundaries

```
trustmesh/
├── apps/
│   └── web/                   # Next.js 15 App Router, TypeScript, Tailwind CSS
├── contracts/
│   ├── src/                   # Solidity contracts, core interfaces
│   ├── test/                  # Foundry unit & fuzz tests
│   └── script/                # Deployment and orchestration scripts
├── services/
│   ├── api/                   # Central coordinator & indexing service
│   ├── ai/                    # Provider-agnostic AI intent & docket parser
│   ├── verification/          # Deliverable verification worker
│   └── dispute/               # Human judge pool & quorum coordinator
├── packages/
│   ├── types/                 # Shared TypeScript models & 14-state machine
│   ├── config/                # Network parameters, protocol constants & env
│   └── sdk/                   # TypeScript SDK client & provider interfaces
├── docs/                      # Architectural, security, privacy & product specs
└── tests/                     # Integration tests across monorepo packages
```

### Module Responsibilities

1. **`@trustmesh/types`**:
   - Contains zero external dependencies.
   - Defines the canonical `TransactionState` enum, state transition table, and domain interfaces for all 15 core domain modules.
   - Shared between frontend, backend microservices, and client SDKs.

2. **`@trustmesh/config`**:
   - Encapsulates chain configurations (Monad Metropolis Testnet 10143, Anvil Devnet 31337), protocol timeout constants, dispute bond calculations, and type-safe environment loaders.

3. **`@trustmesh/sdk`**:
   - Exposes clean interfaces for `ISignerProvider`, `IStorageProvider`, and `IAIProvider`.
   - Offers an `ITrustMeshClient` interface for composing transactions, funding escrow, submitting evidence, and requesting verification.

4. **`contracts/`**:
   - Foundry-managed EVM contracts targeting Cancun EVM.
   - Pure, interface-first design separating Escrow custody, Dispute settlement, and Receipt registry.

5. **`services/`**:
   - Loosely coupled microservices communicating via typed event topics and PostgreSQL backing store.
   - Isolated AI engine with strict non-punitive guardrails.

---

## 5. The 15 Core Domain Modules

| Module ID | Domain Module | Primary Architectural Responsibility |
| :--- | :--- | :--- |
| **01** | **Transaction Engine** | Translates natural language intent into structured milestone terms and manages state transitions. |
| **02** | **Identity** | Resolves participant identities across humans, businesses, and AI agents (DID, ERC-8004 compatibility). |
| **03** | **Privacy** | Manages selective disclosure, offchain client-side encryption, and zero-knowledge commitment anchors. |
| **04** | **Policy & Authorization** | Governs multi-sig authorizations, corporate spending limits, and delegated AI agent allowances. |
| **05** | **Escrow & Payment Protection** | Non-custodial smart contract vaults holding native MON, ERC-20, or x402 streaming deposits. |
| **06** | **Evidence** | Collects offchain deliverable artifacts, hashes content, and registers cryptographic anchors onchain. |
| **07** | **Verification** | Evaluates milestone completion via oracle feeds, automated proofs, or independent verifier sign-offs. |
| **08** | **Dispute Resolution** | Coordinates dispute lifecycles, locks contested escrow, and packages evidence for adjudication. |
| **09** | **Human Judge Network** | Curates staked human jurors, calculates consensus verdicts, and distributes juror compensation. |
| **10** | **Accountability** | Imposes proportional penalties, stake slashing, and cooldown periods on proven bad-faith actors. |
| **11** | **Reputation** | Maintains multi-dimensional verifiable scores based on settled transaction track records. |
| **12** | **Trust Receipts** | Issues portable, soulbound cryptographic receipts attesting to successful transaction fulfillment. |
| **13** | **AI Agent Infrastructure** | Manages AI identity, cryptographic key delegation, capability matrices, and spending caps. |
| **14** | **Notification & Event System** | Dispatches real-time WebSocket and webhook updates on state transitions and dispute triggers. |
| **15** | **Developer SDK & API** | Provides developer-friendly TypeScript and REST interfaces for integrating TrustMesh into 3rd-party apps. |

---

## 6. Data Architecture & Separation of Concerns

```
+-----------------------------------+-----------------------------------+
|         ONCHAIN (MONAD EVM)       |        OFFCHAIN (STORAGE / DB)    |
+-----------------------------------+-----------------------------------+
| - Deterministic Transaction State | - Unstructured Natural Language   |
| - Escrow Token Balances           | - Full Deliverable Files / Media  |
| - Cryptographic Hashes (Bytes32)  | - Private Evidence Payloads       |
| - Participant Addresses           | - Detailed Chat & Negotiation Logs|
| - Dispute Verdict Ratios (Bps)    | - Human Juror Written Rationale   |
| - Soulbound Receipt Token IDs     | - High-Dimensional Vector Embeds  |
+-----------------------------------+-----------------------------------+
```

By maintaining this strict separation:
- Gas consumption on Monad is kept minimal and predictable.
- Sensitive counterparty data is never permanently exposed on a public ledger.
- System throughput scales linearly with storage and AI infrastructure, decoupled from blockchain state bloat.
