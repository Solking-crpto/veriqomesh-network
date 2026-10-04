# VeriqoMesh Network — Monad Testnet Deployment & Verification Guide

**Status**: Verified Operational Specification (Stage 3.6)  
**Protocol**: VeriqoMesh Network  
**Target Network**: Monad Testnet  
**Target Chain ID**: `10143`  
**Reference Contracts**: `contracts/src/TrustMeshEscrow.sol`, `contracts/src/TrustReceiptRegistry.sol`  

---

> [!WARNING]
> **CRITICAL SECURITY WARNING**:
> Never commit raw private keys, seed phrases, or unencrypted `.env` secrets to git or any public repository.
> Always utilize encrypted Foundry keystores (`cast wallet import`) or ephemeral injected environment variables that are excluded from source control.

---

## 1. Verified Monad Testnet Network Parameters

These parameters have been validated directly against official Monad documentation (`docs.monad.xyz`):

| Parameter | Official Value | Description |
| :--- | :--- | :--- |
| **Network Name** | `Monad Testnet` | Official public developer testnet |
| **Chain ID** | `10143` | EVM Chain ID |
| **Currency Symbol** | `MON` | Native gas token (18 decimals) |
| **Primary RPC URL** | `https://testnet-rpc.monad.xyz` | QuickNode / Official load-balanced RPC |
| **Alternative RPCs** | `https://rpc-testnet.monadinfra.com`<br>`https://rpc.ankr.com/monad_testnet` | Official Foundation & Ankr RPC endpoints |
| **Primary Explorer** | `https://testnet.monadvision.com` | MonadVision (Powered by BlockVision) |
| **Secondary Explorer** | `https://testnet.monadscan.com` | Monadscan (Powered by Etherscan engine) |
| **Official Faucet** | `https://faucet.monad.xyz` | Faucet claiming portal (requires EVM address & CAPTCHA/social check) |
| **Contract Verifier API** | `https://sourcify-api-monad.blockvision.org/` | Official Sourcify verification endpoint for MonadVision |

---

## 2. Deployer Wallet Prerequisites & Faucet Process

1. **Create an Encrypted Keystore (Recommended)**:
   Avoid handling raw hex private keys. Use Foundry's native keystore encryption:
   ```bash
   cast wallet import monad-deployer --interactive
   ```
   Foundry will prompt for your private key and password, storing the keystore securely in `~/.foundry/keystores/monad-deployer`.

2. **Claim Testnet Gas Tokens (MON)**:
   - Navigate to [https://faucet.monad.xyz](https://faucet.monad.xyz) (or [https://testnet.monad.xyz](https://testnet.monad.xyz)).
   - Paste the public address of `monad-deployer`.
   - Complete the anti-sybil verification (CAPTCHA / X / Discord account connection).
   - Confirm receipt of testnet MON:
     ```bash
     cast balance <DEPLOYER_ADDRESS> --rpc-url https://testnet-rpc.monad.xyz
     ```

---

## 3. Required Environment Variables

When executing scripts via Node or Foundry, configure the following variables (e.g. in your local shell session or private `.env.local` which is ignored by `.gitignore`):

```bash
# Network RPC (Defaults to official Monad testnet RPC)
MONAD_TESTNET_RPC_URL=https://testnet-rpc.monad.xyz

# Enforced Chain ID Guard (Prevents accidental deployment to wrong chain)
EXPECTED_CHAIN_ID=10143

# Initial Dispute Resolver Address (Must be valid non-zero checksummed EVM address)
DISPUTE_RESOLVER_ADDRESS=0xYourDesignatedResolverAddress

# Deployer Authentication:
# Either use Foundry named keystore:
DEPLOYER_ACCOUNT=monad-deployer
# Or pass DEPLOYER_PRIVATE_KEY only in secured non-persisted environment sessions:
# DEPLOYER_PRIVATE_KEY=0x... (DO NOT COMMIT)
```

> [!NOTE]
> **Dispute Resolver Classification**:
> `DISPUTE_RESOLVER_ADDRESS` designates strictly a **temporary designated testnet dispute resolver** primitive.
> It must **NOT** be described as the Human Judge Network, decentralized adjudication, juror network, or Stage 4 implementation. Stage 4 remains completely on hold.

---

## 4. Deterministic Deployment Sequence

The deployment follows a strict 3-step sequence:

```
[ Step 1: Deploy TrustMeshEscrow ]
  Constructor Arg: disputeResolver = DISPUTE_RESOLVER_ADDRESS
         │
         ▼
[ Step 2: Deploy TrustReceiptRegistry ]
  Constructor Arg: escrowContract = <DEPLOYED_ESCROW_ADDRESS>
         │
         ▼
[ Step 3: Wire Escrow Authorization ]
  Execute: escrow.setReceiptRegistry(<DEPLOYED_REGISTRY_ADDRESS>)
         │
         ▼
[ Step 4: Record Artifacts ]
  Write addresses & block numbers to deployments/monad-testnet.json
```

### Foundry CLI Execution:
```bash
# 1. Deploy Escrow
forge create contracts/src/TrustMeshEscrow.sol:TrustMeshEscrow \
  --rpc-url https://testnet-rpc.monad.xyz \
  --account monad-deployer \
  --constructor-args $DISPUTE_RESOLVER_ADDRESS \
  --broadcast

# 2. Deploy TrustReceiptRegistry (Pass deployed escrow address)
forge create contracts/src/TrustReceiptRegistry.sol:TrustReceiptRegistry \
  --rpc-url https://testnet-rpc.monad.xyz \
  --account monad-deployer \
  --constructor-args <ESCROW_ADDRESS> \
  --broadcast

# 3. Wire Authorization on Escrow
cast send <ESCROW_ADDRESS> "setReceiptRegistry(address)" <REGISTRY_ADDRESS> \
  --rpc-url https://testnet-rpc.monad.xyz \
  --account monad-deployer
```

---

## 5. Contract Verification Procedure

Monad testnet natively supports Sourcify verification on MonadVision:

### Verifying `TrustMeshEscrow`:
```bash
forge verify-contract \
  <ESCROW_ADDRESS> \
  contracts/src/TrustMeshEscrow.sol:TrustMeshEscrow \
  --chain 10143 \
  --verifier sourcify \
  --verifier-url https://sourcify-api-monad.blockvision.org/ \
  --constructor-args $(cast abi-encode "constructor(address)" $DISPUTE_RESOLVER_ADDRESS)
```

### Verifying `TrustReceiptRegistry`:
```bash
forge verify-contract \
  <REGISTRY_ADDRESS> \
  contracts/src/TrustReceiptRegistry.sol:TrustReceiptRegistry \
  --chain 10143 \
  --verifier sourcify \
  --verifier-url https://sourcify-api-monad.blockvision.org/ \
  --constructor-args $(cast abi-encode "constructor(address)" <ESCROW_ADDRESS>)
```

---

## 6. End-to-End Smoke-Test Procedure

Once deployed, execute the automated smoke test script:
```bash
node scripts/testnet-smoke.js --ephemeral
```

The smoke test exercises:
1. `createTransactionWithVerifier`: Creates transaction with 0.001 MON and designated verifier.
2. `agreeTransaction`: Seller counter-signs agreement.
3. `fundEscrow`: Buyer deposits 0.001 MON.
4. `startWork`: Seller transitions state to `IN_PROGRESS`.
5. `anchorEvidence`: Seller anchors content and metadata hashes.
6. `requestVerification`: Transitions to `VERIFICATION`.
7. `submitVerification(PASS)`: Designated verifier submits `VerificationOutcome.PASS`.
8. `releaseEscrow`: Buyer triggers release.
9. Verification of Terminal State:
   - State is `SETTLED (11)`.
   - Escrow liabilities are `0.0 MON`.
   - VeriqoMesh Trust Receipt is queried from `TrustReceiptRegistry` and verified onchain.

---

## 7. Emergency & Rollback Procedures

- **Resolver Compromise / Update**:
  The escrow contract owner can update the authorized dispute resolver at any time using:
  ```bash
  cast send <ESCROW_ADDRESS> "setDisputeResolver(address)" <NEW_RESOLVER_ADDRESS> \
    --rpc-url https://testnet-rpc.monad.xyz \
    --account monad-deployer
  ```
  The old resolver immediately loses authority.
- **Funds Safety Invariant**:
  The contract owner cannot withdraw or seize user escrow funds. All funds remain bound to the registered counterparties (`buyer` and `seller`).
