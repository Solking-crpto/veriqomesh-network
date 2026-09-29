# VeriqoMesh Network Local End-to-End Demo Guide

This document provides exact, reproducible commands to execute the complete VeriqoMesh Network transaction lifecycle from a clean environment.

---

## 1. Prerequisites

- **Node.js**: v20+ (Tested on v26.9.0)
- **Solidity Compiler**: `solc` (0.8.28+) or Foundry (`forge`, `anvil`)
- **Git**: Installed and available

---

## 2. Environment Setup

Clone repository and link packages:

```bash
git clone <repo-url> trustmesh
cd trustmesh

# Install dependencies and link packages
npm install
```

---

## 3. Compile Smart Contracts

### Option A: Using Solc (Direct Compilation)
```bash
npx solcjs --bin --abi --base-path contracts contracts/src/TrustMeshEscrow.sol -o contracts/out
```
*Outputs compiled bytecode and ABI to `contracts/out/`.*

### Option B: Using Foundry Forge
```bash
cd contracts
forge build
```

---

## 4. Run Deterministic State Machine Unit Tests

Verify all 8 Phase B transition and authorization tests:

```bash
# Build TypeScript packages
npx -p typescript tsc --build

# Run state machine unit tests
node --test tests/dist/state-machine.test.js
```

**Expected Output**:
```
✔ 1. Numeric indices match Solidity enum 0-13 perfectly
✔ 2. Valid happy-path transitions
✔ 3. Invalid forward skips are rejected
✔ 4. Invalid backward transitions are rejected
✔ 5. Unauthorized role transitions are rejected
✔ 6. Terminal-state protection (SETTLED, REFUNDED, CANCELLED cannot transition anywhere)
✔ 7. Dispute entry and resolution path
✔ 8. Refund path protection
ℹ tests 8, suites 1, pass 8, fail 0
```

---

## 5. Local Anvil End-to-End Execution Flow

### Step 1: Start Local Anvil Node
In a separate terminal:
```bash
anvil --chain-id 31337 --port 8545
```

Default Anvil Accounts:
- **Deployer / Dispute Resolver**: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- **Buyer**: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`
- **Seller**: `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`

---

### Step 2: Deploy TrustMeshEscrow Contract

```bash
# Using cast send (or deployment script)
cast send --rpc-url http://127.0.0.1:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --create $(cat contracts/out/src_TrustMeshEscrow_sol_TrustMeshEscrow.bin) \
  0x000000000000000000000000f39Fd6e51aad88F6F4ce6aB8827279cffFb92266
```

---

### Step 3: Happy Path Transaction Flow

```bash
# Set environment variables
export ESCROW_ADDRESS="<DEPLOYED_CONTRACT_ADDRESS>"
export TX_ID="0x0000000000000000000000000000000000000000000000000000000000000001"
export BUYER_PK="0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
export SELLER_PK="0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"
export RESOLVER_PK="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
export SELLER_ADDR="0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"

# 1. Buyer creates transaction (Amount: 5 MON, Deadline: 1893456000)
cast send $ESCROW_ADDRESS \
  "createTransaction(bytes32,address,address,uint256,uint64,bytes32)" \
  $TX_ID $SELLER_ADDR 0x0000000000000000000000000000000000000000 5000000000000000000 1893456000 0x1111111111111111111111111111111111111111111111111111111111111111 \
  --private-key $BUYER_PK --rpc-url http://127.0.0.1:8545

# 2. Seller agrees to terms (State: PROPOSED -> AGREED)
cast send $ESCROW_ADDRESS "agreeTransaction(bytes32)" $TX_ID \
  --private-key $SELLER_PK --rpc-url http://127.0.0.1:8545

# 3. Buyer funds escrow (State: AGREED -> FUNDED)
cast send $ESCROW_ADDRESS "fundEscrow(bytes32)" $TX_ID \
  --value 5ether \
  --private-key $BUYER_PK --rpc-url http://127.0.0.1:8545

# 4. Seller starts work (State: FUNDED -> IN_PROGRESS)
cast send $ESCROW_ADDRESS "startWork(bytes32)" $TX_ID \
  --private-key $SELLER_PK --rpc-url http://127.0.0.1:8545

# 5. Seller anchors deliverable evidence (State: IN_PROGRESS -> EVIDENCE_SUBMITTED)
cast send $ESCROW_ADDRESS "anchorEvidence(bytes32,bytes32,bytes32,bool)" \
  $TX_ID 0x2222222222222222222222222222222222222222222222222222222222222222 0x3333333333333333333333333333333333333333333333333333333333333333 false \
  --private-key $SELLER_PK --rpc-url http://127.0.0.1:8545

# 6. Request verification (State: EVIDENCE_SUBMITTED -> VERIFICATION)
cast send $ESCROW_ADDRESS "requestVerification(bytes32)" $TX_ID \
  --private-key $SELLER_PK --rpc-url http://127.0.0.1:8545

# 7. Buyer releases funds to seller (State: VERIFICATION -> SETTLED)
cast send $ESCROW_ADDRESS "releaseEscrow(bytes32)" $TX_ID \
  --private-key $BUYER_PK --rpc-url http://127.0.0.1:8545

# Check final state (Must be 11 = SETTLED)
cast call $ESCROW_ADDRESS "getTransactionState(bytes32)" $TX_ID --rpc-url http://127.0.0.1:8545
```

---

### Step 4: Refund Path Flow

```bash
export TX_REFUND="0x0000000000000000000000000000000000000000000000000000000000000002"

# 1. Create and fund immediately with 2 MON
cast send $ESCROW_ADDRESS \
  "createTransaction(bytes32,address,address,uint256,uint64,bytes32)" \
  $TX_REFUND $SELLER_ADDR 0x0000000000000000000000000000000000000000 2000000000000000000 1893456000 0x1111111111111111111111111111111111111111111111111111111111111111 \
  --value 2ether \
  --private-key $BUYER_PK --rpc-url http://127.0.0.1:8545

# 2. Seller consents to refund (work abandoned)
cast send $ESCROW_ADDRESS "refundTransaction(bytes32)" $TX_REFUND \
  --private-key $SELLER_PK --rpc-url http://127.0.0.1:8545

# Check state (Must be 12 = REFUNDED)
cast call $ESCROW_ADDRESS "getTransactionState(bytes32)" $TX_REFUND --rpc-url http://127.0.0.1:8545
```

---

### Step 5: Dispute Path Flow

```bash
export TX_DISPUTE="0x0000000000000000000000000000000000000000000000000000000000000003"

# 1. Create, fund, and start
cast send $ESCROW_ADDRESS \
  "createTransaction(bytes32,address,address,uint256,uint64,bytes32)" \
  $TX_DISPUTE $SELLER_ADDR 0x0000000000000000000000000000000000000000 10000000000000000000 1893456000 0x1111111111111111111111111111111111111111111111111111111111111111 \
  --value 10ether \
  --private-key $BUYER_PK --rpc-url http://127.0.0.1:8545

# 2. Buyer opens dispute (State: FUNDED -> DISPUTED)
cast send $ESCROW_ADDRESS "openDispute(bytes32)" $TX_DISPUTE \
  --private-key $BUYER_PK --rpc-url http://127.0.0.1:8545

# 3. Adjudication verdict: Dispute Resolver awards 60% (6000 bps) to Buyer, 40% to Seller
cast send $ESCROW_ADDRESS "resolveDispute(bytes32,uint16)" $TX_DISPUTE 6000 \
  --private-key $RESOLVER_PK --rpc-url http://127.0.0.1:8545
```

---

## 6. Monad Metropolis Testnet Deployment

To deploy directly to the live Monad Metropolis Testnet:

```bash
forge create contracts/src/TrustMeshEscrow.sol:TrustMeshEscrow \
  --rpc-url https://testnet-rpc.monad.xyz \
  --chain-id 10143 \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --constructor-args $DISPUTE_RESOLVER_ADDRESS
```
