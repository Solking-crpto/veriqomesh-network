# VeriqoMesh Network Development Roadmap & Architectural Risk Register

## 1. Multi-Stage Development Roadmap

```
Stage 1: Architectural Foundation (COMPLETED)
   |
   +--> Stage 2: Core State Engine & Smart Contracts (Foundry / Monad)
          |
          +--> Stage 3: Offchain Storage & Evidence Anchoring Pipeline
                 |
                 +--> Stage 4: AI Intent Parser & Dispute Docket Engine
                        |
                        +--> Stage 5: Human Judge Network & Quorum Consensus
                               |
                               +--> Stage 6: Frontend Experience & Web3 Wallet Flow
                                      |
                                      +--> Stage 7: Testnet Deployment & Hackathon Submission
```

### Stage 1: Architectural Foundation & Scaffolding (CURRENT STATUS: DONE)
- Monorepo initialized with Next.js, Foundry, Node/TypeScript, and shared packages.
- 14-state deterministic transaction state machine fully specified in `@trustmesh/types`.
- Core domain models for all 15 modules defined.
- Smart contract interfaces (`ITrustMeshEscrow`, `ITrustMeshDispute`, `ITrustReceiptRegistry`, `ITrustMeshTypes`) defined.
- Provider abstractions for Storage, AI, and Signers in `@trustmesh/sdk`.
- Complete architectural, security, privacy, dispute, AI, and compliance documentation.

### Stage 2: Core State Engine & Smart Contracts
- Implement `TrustMeshEscrow.sol` enforcing deterministic state progression and non-custodial deposits.
- Implement `TrustReceiptRegistry.sol` issuing soulbound receipt tokens upon settlement.
- Write Foundry unit tests and invariant fuzz tests verifying conservation of value and non-reentrancy.
- Deploy to local Anvil devnet and Monad Testnet.

### Stage 3: Offchain Storage & Evidence Anchoring Pipeline
- Implement `IPFSStorageProvider` and encrypted S3/local storage providers.
- Build client-side AES-256-GCM encryption with ECIES bilateral key encapsulation.
- Implement onchain Keccak-256 evidence anchoring in `TrustMeshEscrow.sol`.

### Stage 4: AI Intent Parser & Dispute Docket Engine
- Implement provider-agnostic LLM adapters (Gemini / Anthropic / OpenAI / Ollama).
- Build intent-to-terms parsing with strict schema validation.
- Implement evidence timeline chronologizer and neutral contradiction detector.
- Verify strict isolation: confirm zero autonomous financial execution capability.

### Stage 5: Human Judge Network & Quorum Consensus
- Implement `TrustMeshDispute.sol` with juror staking, commit-reveal voting, and trimmed median consensus.
- Build appellate court escalation and dispute bond slashing mechanisms.
- Build offchain juror coordination service in `services/dispute/`.

### Stage 6: Web Application & Web3 Experience
- Implement intuitive transaction creation flow (natural language input + parametric editor).
- Integrate wallet connections (injected wallets + embedded social login via Privy/Dynamic).
- Implement interactive lifecycle tracking visualization matching the 14-state machine.
- Build juror portal for case docket review and commit-reveal voting.

### Stage 7: Hackathon Hardening, Deployment & Submission
- Deploy verified contracts to Monad Testnet.
- Execute end-to-end integration demo: H2H, H2AI, and dispute resolution flows.
- Record demo video and prepare official Monad Metropolis and Crypto World's Fair submissions.

---

## 2. Architectural Risks Register

| Risk ID | Category | Risk Description | Likelihood | Impact | Mitigation Strategy |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **RSK-01** | **Security** | Smart contract vulnerability or reentrancy in escrow custody. | Low | Critical | Standard OpenZeppelin guards, formal invariant fuzz testing, pull-over-push payment patterns. |
| **RSK-02** | **Governance** | Juror apathy or insufficient quorum for dispute adjudication. | Medium | High | Economic incentives (juror fee share), inactivity timeouts with auto-fallback to senior tier. |
| **RSK-03** | **AI Integrity**| Prompt injection in natural language intent builder. | Medium | Medium | Strict schema validation; users must explicitly sign structured terms before onchain submission. |
| **RSK-04** | **Performance**| Offchain storage latency or IPFS pin unavailability during disputes. | Low | High | Multi-provider pinning (IPFS + Arweave/Filecoin fallback) and client-side cached verification. |
| **RSK-05** | **Collusion** | Sybil attack on human judge pool to steal disputed escrow. | Low | Critical | Staked bond requirements, commit-reveal voting, VRF random juror selection, and appellate review. |
| **RSK-06** | **Ecosystem** | Monad testnet RPC instability or breaking testnet upgrades during hackathon. | Medium | High | Chain abstraction allows immediate instant fallback to local Anvil or alternative EVM testnets. |

---

## 3. Unresolved Decisions & Open Architectural Questions

The following decisions require explicit stakeholder alignment before finalizing Stage 2 implementation:

1. **Soulbound Receipt Standard**:
   - *Option A*: Standard ERC-721 with transfer disabled (Soulbound Token).
   - *Option B*: ERC-1155 multi-token standard with batch receipts and milestone sub-tokens.
   - *Recommendation*: Option A (ERC-721 SBT) for MVP simplicity and universal wallet recognition.

2. **Offchain Storage Primary Provider**:
   - *Option A*: Pinata IPFS gateway.
   - *Option B*: Arweave / Bundlr permanent storage.
   - *Recommendation*: Start with generic `IStorageProvider` defaulting to Pinata IPFS with local mock for development.

3. **Dispute Quorum Size vs. Speed**:
   - *Trade-off*: Smaller quorum (3 jurors) resolves faster and cheaper; larger quorum (5–7 jurors) provides greater collusion resistance.
   - *Recommendation*: 3 jurors for standard disputes, 5 jurors for appellate tier.

4. **Embedded Wallet Provider Selection**:
   - *Trade-off*: Privy vs Dynamic vs Biconomy/ZeroDev.
   - *Action*: Keep abstracted behind `ISignerProvider` until hackathon sponsor requirements are verified.

---

## 4. Recommended Next Implementation Step

Upon user approval of this foundation stage:
- **Proceed to Stage 2: Core State Engine & Smart Contracts**:
  1. Implement `TrustMeshEscrow.sol` enforcing the 14-state deterministic state machine.
  2. Implement comprehensive Foundry unit tests verifying all state transitions, guards, and reverts.
  3. Verify contract compilation and gas benchmarking for Monad Metropolis.
