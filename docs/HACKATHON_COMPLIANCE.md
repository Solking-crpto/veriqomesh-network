# VeriqoMesh Network Hackathon Compliance Matrix

This document tracks official requirements, technical criteria, evaluation tracks, and compliance status for targeted global blockchain hackathons.

> **CRITICAL DIRECTIVE**: Do NOT invent or assume requirements. All unverified or unconfirmed items are marked explicitly as `REQUIRES_VERIFICATION`. Official rules, deadlines, and prize track criteria must be validated before implementation decisions are finalized.

---

## 1. Monad Metropolis (Primary Initial Target)

| Requirement / Criterion | Status / Value | Verification Source / Notes |
| :--- | :--- | :--- |
| **Target Blockchain** | Monad Metropolis Testnet / Devnet | Official hackathon announcement |
| **RPC Endpoint URL** | `https://testnet-rpc.monad.xyz` | Official Monad documentation |
| **Chain ID** | `10143` | Official Monad documentation |
| **Block Explorer** | `https://testnet.monadexplorer.com` | Official Monad documentation |
| **EVM Compatibility** | Standard EVM (Cancun equivalent) | Official Monad documentation |
| **Official Tracks / Categories** | `REQUIRES_VERIFICATION` | Official track list to be confirmed from hackathon portal |
| **Submission Deadline** | `REQUIRES_VERIFICATION` | Official submission timestamp to be confirmed |
| **Judging Criteria** | `REQUIRES_VERIFICATION` | Criteria breakdown to be confirmed |
| **Sponsor Bounties** | `REQUIRES_VERIFICATION` | Partner/sponsor bounties to be confirmed |
| **Contract Deployment Proof** | Required: Verified contract on Monad Explorer | Standard hackathon requirement |
| **Open Source Repository** | Required: Public GitHub repo with open license | Standard hackathon requirement |
| **Demo Video Requirements** | `REQUIRES_VERIFICATION` | Specific duration and hosting guidelines to be confirmed |

### Monad Metropolis Architectural Readiness
- Smart contracts configured in `contracts/foundry.toml` with `cancun` EVM target.
- Network parameters and explorer links integrated into `@trustmesh/config`.
- Transaction throughput and parallel execution architecture documented in `docs/CHAIN_ABSTRACTION.md`.

---

## 2. Crypto World's Fair

| Requirement / Criterion | Status / Value | Verification Source / Notes |
| :--- | :--- | :--- |
| **Target Blockchain(s)** | `REQUIRES_VERIFICATION` | Multi-chain / EVM eligibility to be confirmed |
| **Official Tracks / Categories** | `REQUIRES_VERIFICATION` | Track listings to be confirmed |
| **Submission Deadline** | `REQUIRES_VERIFICATION` | Official deadline to be confirmed |
| **Judging Criteria** | `REQUIRES_VERIFICATION` | Official rubrics to be confirmed |
| **Sponsor Bounties** | `REQUIRES_VERIFICATION` | Partner bounties to be confirmed |
| **Demo / Presentation Format** | `REQUIRES_VERIFICATION` | In-person vs virtual requirements to be confirmed |
| **Open Source License** | `REQUIRES_VERIFICATION` | MIT / Apache 2.0 eligibility to be confirmed |

---

## 3. Additional Hackathons to be Researched Later

| Hackathon Name | Focus Area | Status | Action Item |
| :--- | :--- | :--- | :--- |
| **ETHGlobal Series** | General EVM / Autonomous Agents | `REQUIRES_VERIFICATION` | Research upcoming dates, agent tracks, and sponsor bounties |
| **Chainlink Constellation / Hackathon**| Oracles, Cross-Chain, Compute | `REQUIRES_VERIFICATION` | Research Chainlink Functions and Automation tracks |
| **Autonomous Agent Hackathons** | ERC-8004, Agentic Web3 | `REQUIRES_VERIFICATION` | Monitor agentic AI hackathons for alignment with H2AI/AI2AI escrow |

---

## 4. Verification Workflow Prior to Implementation

1. **Official Verification Step**: Before locking smart contract parameters and feature scope for a specific hackathon, the team will review official documentation, developer portals, and hackathon Discord announcements.
2. **Matrix Update**: Replace `REQUIRES_VERIFICATION` tags with verified requirements, exact dates, and judging rubrics.
3. **Traceability**: All subsequent code pull requests and feature implementations will reference the verified requirements recorded in this matrix.
