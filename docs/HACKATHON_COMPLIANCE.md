# Hackathon compliance: Monad Metropolis

VeriqoMesh Network is entered in the **Monad Metropolis** hackathon, track 4: **Trust / Identity & AI Infrastructure**.

- **Build window:** September 1 to October 13, 2026 (submission deadline October 13, 2026, per the hackathon page).
- **Network:** Monad Testnet, chain ID 10143. RPC `https://testnet-rpc.monad.xyz`. Explorer `https://testnet.monadvision.com`.

## How the project meets each requirement

| Requirement | How VeriqoMesh meets it |
|---|---|
| Built on Monad | Contracts deployed on Monad Testnet: Escrow `0x925ea880cA53DE0352b84B24d0C0dee5B258015A`, Receipt Registry `0xE1994e0dF7CD5A836be4b02AE2164A542418B819`. |
| A working product, not only a pitch | Live app at https://veriqomesh.xyz. Two complete flows (verified release, and inconclusive verification with dispute resolution) and three soulbound receipts, all with explorer-linked transactions listed in the README. |
| Public submission materials | Live app, public GitHub repository, README with architecture, benchmarks and limits, and a demo video (linked in the README). |
| Work created during the build window | No code in this repository predates September 1, 2026. The escrow contract was deployed on September 23 and the repository was first published on September 29. The README build log lists the work by date. |
| Indexing | Envio HyperIndex indexes 12 lifecycle event types from block 65,000,000 and powers the Trust page ledger, which shows indexed block, chain head and lag (see README section 6). |

## Project rules we follow

- No AI financial authority. The AI layer only structures terms and prepares summaries. It never holds, releases or refunds funds.
- No claim of decentralized storage. Evidence is anchored as Keccak-256 hashes, and files are not stored or retrieved by this project.
- Recorded transactions are real testnet transactions run by the team, and the team wallets are labeled as such. The delivery scenario is illustrative.
- No claim of Envio features that are not implemented.
- No private keys or secrets in the repository.
- Testnet only. Contracts are unaudited.