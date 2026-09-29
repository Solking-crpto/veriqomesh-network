# VeriqoMesh Trust Receipt Model

**Version**: 1.0 (Stage 3)  
**Status**: Executable Specification & Production Architecture  
**Protocol**: VeriqoMesh Network  
**Target Contracts**: `contracts/src/TrustReceiptRegistry.sol`, `contracts/src/interfaces/ITrustReceiptRegistry.sol`  

---

## 1. Overview & Architectural Philosophy

*“The transaction carries evidence of its own outcome.”*

A **VeriqoMesh Trust Receipt** is the immutable, cryptographically verifiable record of a concluded VeriqoMesh transaction. 

Unlike traditional NFT implementations (ERC-721 / ERC-1155) that focus on tradeable financial instruments, VeriqoMesh Trust Receipts represent **pure accountability records**:
- **Non-Transferable & Accountable**: They cannot be bought, sold, transferred, wrapped, or pledged as collateral.
- **Pure Registry Model**: Implemented as a lean onchain registry (`TrustReceiptRegistry.sol`) conforming to `ITrustReceiptRegistry.sol`.
- **Zero Financial Capabilities**: The registry cannot custody funds, process payments, or alter escrow balances. Any native deposit reverts immediately (`NativeDepositsNotAccepted`).
- **Deterministic 1-to-1 Mapping**: Exactly one Trust Receipt exists for each terminally settled or disputed transaction.

```
+-----------------------------------------------------------------------------------+
|                            TRUSTMESH ESCROW CONTRACT                              |
|                                                                                   |
|   1. Execution of Terminal Settlement                                             |
|      (releaseEscrow or resolveDispute)                                            |
|   2. Financial Disbursal (Native MON / ERC-20 to Buyer/Seller)                    |
|   3. Call: receiptRegistry.issueReceipt(txId, buyer, seller, amount, ...)         |
+-----------------------------------|-----------------------------------------------+
                                    |
                                    v
+-----------------------------------------------------------------------------------+
|                        TRUST RECEIPT REGISTRY (SOULBOUND)                         |
|                                                                                   |
|   TrustReceipt {                                                                  |
|       receiptId:           1                                                      |
|       transactionId:       0x4a9b...                                              |
|       buyer:               0xBuyer...                                             |
|       seller:              0xSeller...                                            |
|       finalAmount:         20000000000000000000 (20.0 MON)                        |
|       settledAt:           1727093200                                             |
|       resolutionState:     SETTLED                                                |
|       evidenceRoot:        0xa1b2c3...                                            |
|       verificationOutcome: PASS                                                   |
|       summaryHash:         0x7f8e... (hash of canonical settlement metadata)      |
|   }                                                                               |
+-----------------------------------------------------------------------------------+
```

---

## 2. Onchain Data Schema

Defined in `ITrustReceiptRegistry.sol`:

```solidity
struct TrustReceipt {
    uint256 receiptId;
    bytes32 transactionId;
    address buyer;
    address seller;
    uint256 finalAmount;
    uint64 settledAt;
    ResolutionState resolutionState;
    bytes32 evidenceRoot;
    VerificationOutcome verificationOutcome;
    bytes32 summaryHash;
}
```

### Field Definitions:
- `receiptId`: Monotonically incrementing unique receipt identifier.
- `transactionId`: Unique identifier of the underlying escrow transaction.
- `buyer`: Cryptographic identity of the buyer party.
- `seller`: Cryptographic identity of the seller party.
- `finalAmount`: Total settled currency amount.
- `settledAt`: Onchain block timestamp of terminal settlement.
- `resolutionState`: Terminal outcome (`SETTLED` or `REFUNDED`).
- `evidenceRoot`: Cryptographic root / digest anchoring all submitted evidence items.
- `verificationOutcome`: Verification result reached prior to settlement (`PASS`, `FAIL`, `INCONCLUSIVE`, or `NONE`).
- `summaryHash`: Digest of canonical offchain metadata documenting agreed scope, fulfillment terms, and audit trails.

---

## 3. Strict Boundary & Security Guarantees

### 3.1 Authorization Restrictions
- **Only Authorized Escrow**: Receipts can **only** be issued by the designated `authorizedEscrow` address set at deployment. Arbitrary accounts calling `issueReceipt()` revert with `OnlyAuthorizedEscrow()`.
- **Single Issuance Invariant**: A transaction cannot have duplicate receipts. If `receiptsByTransaction[transactionId] != 0`, subsequent attempts revert with `ReceiptAlreadyExists(transactionId)`.

### 3.2 Immutability & Balance Non-Interference
- **No Fund Custody**: The registry contract explicitly rejects native deposits:
  ```solidity
  receive() external payable {
      revert NativeDepositsNotAccepted();
  }
  ```
- **Terminal Record**: Once written, a Trust Receipt can never be updated, overwritten, or deleted.
- **No Escrow Side-Effects**: Receipt issuance occurs as the **final step** of terminal settlement in `TrustMeshEscrow.sol`. It cannot mutate transaction balances or escrow liabilities.

### 3.3 Non-Transferability (Soulbound)
By intentionally avoiding the ERC-721 specification:
- There is no `transferFrom()`, `safeTransferFrom()`, or `approve()`.
- The receipt remains permanently bound to the original transacting counterparties (`buyer` and `seller`).
- Reputation, trade history, and compliance track records cannot be acquired or transferred by third parties.

---

## 4. Query & Verification API

The registry exposes gas-efficient read methods for dApps, verification agents, and credit scoring contracts:

```solidity
function getReceipt(uint256 receiptId) external view returns (TrustReceipt memory);
function getReceiptByTransaction(bytes32 transactionId) external view returns (TrustReceipt memory);
function receiptExists(bytes32 transactionId) external view returns (bool);
function totalReceipts() external view returns (uint256);
```

In the TypeScript SDK (`packages/sdk/src/client.ts`):
```typescript
const receipt = await client.getTrustReceipt(transactionId);
console.log(`Receipt #${receipt.receiptId} for Tx ${receipt.transactionId}`);
console.log(`Outcome: ${receipt.verificationOutcome}, Settled: ${new Date(Number(receipt.settledAt) * 1000)}`);
```

---

## 5. Stage 4 Adjudication Records vs. Onchain Trust Receipts

> [!NOTE]
> **Adjudication vs. Receipt Linkage Boundary:**
> - **Onchain Trust Receipt**: Contains the terminal settlement amount, terminal outcome (`SETTLED` or `REFUNDED`), terms hash, and delivery `evidenceRoot`.
> - **Offchain Adjudication Record**: Contains 3-judge panel ballots, conflict attestations, AI evidence dossier hash, consensus spread, and a simulated IPFS-style CID reference.
> - **Contract Boundary**: The deployed Solidity `TrustReceiptRegistry.sol` does not store the Stage 4 offchain adjudication CID/hash onchain. Direct onchain linkage would require a future smart contract change and redeployment.

