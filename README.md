# VeriqoMesh Network

<p align="center">
  <img src="apps/web/public/brand/veriqomesh-logo.png" alt="VeriqoMesh Network" width="220" />
</p>

> **A programmable trust layer for commerce between humans and AI agents, built on Monad.**
> *Define the deal. Protect the transaction. Verify the outcome.*

- **Live app:** https://veriqomesh.xyz
- **Public benchmark (no wallet needed):** https://veriqomesh.xyz/transactions?tab=demo
- **Trust receipts and provenance:** https://veriqomesh.xyz/trust
- **Demo video:** `[ADD YouTube link once uploaded]`
- **Hackathon:** Monad Metropolis, track 4 (Trust / Identity & AI Infrastructure)
- **Network:** Monad Testnet (chain ID 10143). Testnet assets only, no real value.

---

## 1. Summary

### The problem
When businesses and AI agents transact, identity, payment, evidence and dispute handling live in separate places: chats, tracking portals, spreadsheets and private databases. Nobody can easily prove who agreed to what, what was delivered, who verified it, and how a disagreement was settled. AI agents also need a financial boundary: they must be able to help without holding funds.

### The solution
VeriqoMesh puts the lifecycle on chain:

Intent → Agreement → Escrow → Execution → Evidence → Verification → (Dispute, if contested) → Settlement → Trust Receipt

| Step | Role | What happens |
|---|---|---|
| 1 | **AI assists** | Plain-language intent is drafted into structured, canonical terms. The AI has no financial authority and never holds or moves funds. |
| 2 | **Humans authorize** | Counterparties ratify the terms with wallet signatures (EIP-191). |
| 3 | **Verifiers verify** | A designated verifier attests the delivery outcome onchain (PASS, FAIL or INCONCLUSIVE). |
| 4 | **Blockchain enforces** | The escrow contract holds the deposit and settles. An inconclusive outcome opens a dispute, which is resolved as a split in basis points. |

Every terminal outcome mints a **non-transferable ERC-5192 soulbound Trust Receipt** in the registry.

### Why Monad
Multi-step escrow lifecycles (create, agree, fund, start, anchor, verify, settle) need cheap, fast transactions to be practical. Monad's parallel EVM design goals (high throughput and fast finality) suit many small concurrent escrows. Our recorded flows use 0.001 MON per agreement.

---

## 2. Try it in 2 minutes

**No wallet (30 seconds):**
1. Open https://veriqomesh.xyz/trust and scroll the ledger. It shows two complete flows, with every event linked to the explorer.
2. Click any `tx:` link to confirm it on https://testnet.monadvision.com.
3. Scroll to **Soulbound Trust Receipts** to see Receipts #1, #2 and #3.

**With a wallet (about 2 minutes):**
1. Add Monad Testnet to your wallet: chain ID `10143`, RPC `https://testnet-rpc.monad.xyz`.
2. Get testnet MON from the faucet linked in the official Monad docs (https://docs.monad.xyz).
3. Open https://veriqomesh.xyz, click **Connect Wallet**, then **Create**.
4. Describe a deal in plain language, review the structured terms, and sign.
5. Enter a **second wallet address of your own** as the counterparty. The team wallets listed on `/receivers` are for the recorded benchmark flows and will not respond to new agreements.

---

## 3. Safety model

### AI boundary
- **No financial execution authority.** AI may structure natural-language intent, extract terms, summarize evidence and prepare case summaries. It never releases funds, refunds escrow, alters terms or bypasses verification.
- **Wallet gates.** Every onchain state change, deposit and release requires a signature from an authorized wallet.
- **No embedded keys.** The protocol does not rely on server-side private keys for normal user or verifier roles.

### Evidence model
- **Onchain anchor:** a 32-byte Keccak-256 content hash commitment, plus metadata hash, storage URI hash, submitter, timestamp and an encryption flag, logged in the escrow contract.
- **Files stay offchain.** We anchor commitments, not documents. This project does not claim decentralized file storage or retrieval.

### Two resolution paths
1. **Normal:** funded escrow → evidence anchored → designated verifier attests PASS → authorized release → Trust Receipt.
2. **Contested:** verification INCONCLUSIVE or disputed → escrow stays protected → dispute resolved by a three-judge process → allocation dispatched onchain → Trust Receipt.

### Privacy
Commercial contracts, invoices and serial numbers stay offchain. Only hashes and commitments touch the public chain. Counterparties can later prove fulfillment by revealing offchain data that matches the onchain commitments.

---

## 4. Contracts (Monad Testnet, chain ID 10143)

| Contract | Address | Function |
|---|---|---|
| `TrustMeshEscrow` | [`0x925ea880cA53DE0352b84B24d0C0dee5B258015A`](https://testnet.monadvision.com/address/0x925ea880cA53DE0352b84B24d0C0dee5B258015A) | State-machine escrow with solvency checks |
| `TrustReceiptRegistry` (ERC-5192) | [`0xE1994e0dF7CD5A836be4b02AE2164A542418B819`](https://testnet.monadvision.com/address/0xE1994e0dF7CD5A836be4b02AE2164A542418B819) | Soulbound, non-transferable receipts |
| Authorized resolver (a wallet, not a contract) | [`0x12f9e53c31F7629aCAE0BA70588794945EC6c35E`](https://testnet.monadvision.com/address/0x12f9e53c31F7629aCAE0BA70588794945EC6c35E) | Submits dispute resolutions to the escrow |

`[CONFIRM: source code verified on the explorer for all three? If yes, add "verified" and link. If not, verify them before submitting.]`

---

## 5. Verified onchain benchmarks

All transactions are real Monad Testnet transactions run by the team. All wallets are team-controlled. The delivery scenario (solar procurement) is illustrative; the onchain data is limited to state transitions, hashes and amounts. Explorer: https://testnet.monadvision.com

### Flow A: verified delivery, full release (Receipt #3)

Agreement ID `0x961c70865bf6097eb16d1b3a19d90f950b2cdd789eda5554c93baba1de0954e1`. Buyer `0xa4bCC57d40311D715ECe34940191820d4a81C50F`, seller `0x0e73dBFf9047423b520FA9fc23a95645fC986Ee8`, designated verifier `0xb064d69428B9838C2a3e408cF995ea8eb5182c48`, amount 0.001 MON, final state 11 (SETTLED), verification result 1 (PASS).

| Event | Tx hash | Block |
|---|---|---|
| TransactionCreated | `0xeddd26b03699fa0dd8aabd5a8ff260abca029ece60c13dae916fe4060f33e2cd` | 65,963,660 |
| TransactionAgreed | `0x4ac4c4b6cdf18b753f5e5f536f83a93545c5c185129ea58418ca9e38cdf11f8a` | 65,963,910 |
| TransactionFunded | `0xdcb8564bd5b35e8ea6f041ff34e06d9a9ba950fc1ba130da42ba687303a04f3e` | 66,096,522 |
| TransactionStarted | `0xb085f0436d4f64f4347712d9c02d131f31f6dfeb780e0c8ee0b66bce3dfb470b` | 66,098,350 |
| EvidenceAnchored | `0x698ef9beafecf6ffb5a610f4435cb24e64f728fa544b60a37ff29ea1ad7b923e` | 66,434,952 |
| VerificationStarted | `0x0c1a3b6be1a04d5526cb59cae3240e94ffeb50d18e87498c4d2fe9b55131a121` | 66,436,074 |
| VerificationSubmitted (PASS) | `0x4d4ff9041349f8746c1a84fbe3d93bfbb6e4dd79e4f509fa85b6727295f29bb0` | 66,436,440 |
| TransactionSettled + Receipt #3 | `0x691f7a80d65fe1deece2f45e8b6600ee4b2b0ffc14f3fe733d995566e2d83b52` | 66,436,615 |

### Flow B: inconclusive verification, dispute resolution (Receipt #2)

Agreement ID `0x2b57d6b0ef1ba16a60c4f801d90d27d23e598fd6b1381e0175077201dc6afcc4`. Outcome 3 (INCONCLUSIVE) opened a dispute, resolved as 1,500 bps (15%) to the buyer and 8,500 bps (85%) to the seller.

| Event | Tx hash | Block |
|---|---|---|
| TransactionCreated | `0x3a9ec0ea9cff2882c80a875812cfd63737f894867c64465038e975f233a18310` | 65,122,781 |
| TransactionAgreed | `0xc60a3ebf14f0b36818b510d971505781b70d52e5073036fc7f051180f179d5b1` | 65,122,843 |
| TransactionFunded | `0xf466a3acb09a0dee38525b36bbe3809ce88853098fea327d9b09c1178c3f3227` | 65,122,921 |
| TransactionStarted | `0x7456f91e842f2842133f92b75ce80eae3b2af455a53de3d7f176c26daab8054f` | 65,122,938 |
| EvidenceAnchored | `0x722d4a339f888b5ea50e4738b53e1dcf4ad5461e954275a50004ea3d2c05c91c` | 65,122,948 |
| VerificationStarted | `0x753f2b5c98d1e784887e6ce0697b4596aa56ba9fa4eabe201b4f34f5dd0c5994` | 65,122,960 |
| VerificationSubmitted (INCONCLUSIVE) | `0x5778e6a8d77db4f77bf04d9cfc9e51896b1e7a6de1a0e17d27b09f355b3f1485` | 65,122,972 |
| DisputeOpened | `0xb01a687de4c65113a647b7bd7f3db23d440c7088eda0445bf5d32a05495106e4` | 65,122,986 |
| DisputeResolved + Receipt #2 | `0x91ff62584f4386250ccb09f28808453bb373273d9fa5f56cf04378c2a78084ba` | 65,129,932 |

### Receipt #1: initial protocol validation run
Mint tx `0x1ef8e57ee21262d1c67d1fc0d1f4ba96ff29ee79989b5c3e62f01704c98b1cb3` (block 65,092,494), run before Flows A and B.

If an explorer page fails to load for an older block, the same data can be read from the RPC (`eth_getTransactionReceipt` at https://testnet-rpc.monad.xyz) or from the indexed ledger on `/trust`.

---

## 6. Envio HyperIndex

[Envio HyperIndex](https://envio.dev) is the read-only indexing layer for the Trust page.
- **12 lifecycle event types** indexed from block 65,000,000, from `TransactionCreated` through `DisputeResolved` and `TrustReceiptIssued`.
- **GraphQL API** with `Transaction`, `EvidenceAnchor`, `VerificationAttestation`, `DisputeRecord`, `TrustReceipt` and chronological `LifecycleEvent` entities.
- **Visible status.** The Trust page shows the indexed block, chain head and lag in blocks, and the source: "Envio HyperIndex" when GraphQL is used, "Monad RPC fallback" when it is not.

Run the indexer locally:
```bash
cd indexer
npm install
npm run codegen
npm run dev
```

---

## 7. Run locally and test

**Prerequisites:** Node.js 20 or later; Foundry (`forge`) for contract tests; a browser wallet.

```bash
git clone https://github.com/Solking-crpto/veriqomesh-network.git
cd veriqomesh-network
npm install
npm run build
npm run start -w @trustmesh/web      # then open http://localhost:3000
```

`[FILL IN: .env.example variable names (RPC URL, Envio GraphQL URL, contract addresses). Never commit real keys.]`

**Tests**
```bash
npm test                 # application, state-machine and invariant suites: 189 tests across 27 suites
cd contracts && forge test -vv   # contract tests, including fuzz and solvency checks
```
`[CONFIRM: run forge test and put the real passing count here.]`

---

## 8. Repository structure

```
trustmesh/
├── apps/web/            Next.js 15 application (workspace, trust ledger, evidence explorer)
├── contracts/           Solidity contracts (TrustMeshEscrow, TrustReceiptRegistry) and Foundry tests
├── indexer/             Envio HyperIndex indexer (config.yaml, schema.graphql, ABIs, handlers)
├── services/
│   ├── ai/              Advisory AI intent and case-summary generator
│   ├── api/             Orchestration API
│   ├── dispute/         Three-judge assignment and median consensus engine
│   └── verification/    Evidence verification attestation service
├── packages/            config (addresses, constants), sdk (typed contract methods), types
├── tests/               Integration, role-isolation and regression suites
└── scripts/             Deployment, lifecycle monitoring and audit tools
```

---

## 9. Hackathon build log

Monad Metropolis build window: **September 1 to October 13, 2026.**

**Repository history.** The public repository's first commit is `e0bba32` on 2026-09-29 ("publish VeriqoMesh Network Monad implementation"). `[FILL IN: an honest sentence on when development began and where it lived before that commit, and whether any code predates Sept 1.]` The onchain record is independent of git history: the first Trust Receipt was minted on 2026-09-23 (block 65,092,494) and Flow B ran the same day. `[FILL IN: contract deployment date from the explorer's contract-creation transaction.]`

| Date | Work |
|---|---|
| Sept 29 | Published the Monad implementation; Vercel deployment config; Envio HyperIndex provenance layer and Envio Cloud deployment (`9034d11`, `d16707f`, `061d78e`, `d612714`) |
| Sept 29 to 30 | Indexer fixes: Envio v3 config, HyperSync endpoint with RPC fallback, handler restructuring, ESM and Node 22, event handlers migrated, numeric and transaction-hash field handling (`f322f52` to `19601c3`) |
| Sept 30 | Production trust view connected to Envio (`7461005`); user workspace separated from the public demo (`b3c3542`); persistent invitations and receiver action inbox (`2b15eb0`); signature-authorized invitation updates (`711783d`) |
| Oct 1 | Persona dashboards and actionable requests (`194c45d`); wallet identity separated from application role (`04426e4`); open agreement creation (`8bfaee8`); public benchmark data isolated from personal transactions; demo fixtures removed from the public interface; brand identity (`d9d6380`) |
| Oct 2 onward | Responsive mobile, tablet and desktop redesign (`ddcd1d4`, `3f1ca25`); audit of our own public data against the hackathon rules: replaced it with chain-verified transactions, corrected block order, timestamps and receipt actors, added live Envio status (indexed block, chain head, lag), a single explorer, and removed claims the contracts do not support (`22a5ae2` to `c143205`) |

---

## 10. Known limitations and assumptions

- **Testnet only.** Tokens carry no real value. The contracts are unaudited.
- **Designated roles.** In the recorded flows the verifier and the resolver are team-controlled wallets assigned by role. There is no open or decentralized verifier or judge network yet.
- **Dispute resolution is dispatched by a resolver wallet.** The three-judge median is computed by the dispute service, and the authorized resolver wallet (`0x12f9…c35E`) then calls `resolveDispute` on the escrow with the result. Future work: onchain multi-signature or verifiable consensus. `[CONFIRM: whether the three ballots in Flow B came from three distinct wallets, and whether any ballots are recorded onchain, by checking the input data of the DisputeResolved transaction.]`
- **AI is advisory.** It drafts terms and case summaries. It has no financial authority. `[CONFIRM: whether services/ai calls an external model API, and which one.]`
- **Evidence is hash-anchored.** Files are not stored or retrieved by this project. Storage URIs are committed as hashes only.
- **Illustrative scenario.** The solar-procurement narrative is an example; the onchain data is limited to state transitions, hashes and amounts.

---

## 11. License and contact

MIT. veriqomeshnetwork@gmail.com · [@veriqomesh_ai](https://x.com/veriqomesh_ai)
