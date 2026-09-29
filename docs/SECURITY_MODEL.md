# VeriqoMesh Network Security Model & Threat Matrix

## 1. Security Architecture Principles

Security is prioritized over feature velocity. The TrustMesh protocol enforces the following foundational security boundaries:
1. **Zero-Trust Smart Contract Custody**: All escrow balances are held in non-custodial smart contracts (`TrustMeshEscrow.sol`). No administrator, protocol multisig, or AI agent can arbitrarily seize user funds.
2. **Strict Ban on Autonomous AI Financial Execution**: Under Architecture Principles 6 & 7, AI models are strictly prohibited from possessing private keys that control disputed escrow or autonomously executing financial slashes.
3. **Formal State Machine Enclosure**: Contract state transitions are deterministic and cannot be bypassed via reentrancy, fallback loops, or unauthenticated delegate calls.
4. **Pull Over Push Payment Distribution**: Settlement and refund disbursements follow the CEI (Checks-Effects-Interactions) and pull-payment pattern to prevent denial-of-service through malicious recipient fallback functions.

---

## 2. Threat Matrix & Mitigation Strategies

| Threat Scenario | Vector / Description | Severity | Protocol Mitigation |
| :--- | :--- | :--- | :--- |
| **Buyer Non-Payment / Default** | Buyer agrees to work but fails to pay upon completion. | **Critical** | Funds are locked in escrow prior to `IN_PROGRESS` state. Seller only starts once `FUNDED` event is emitted. |
| **Seller Non-Delivery / Abandonment** | Seller accepts funds in escrow but never delivers work. | **High** | Milestone deadlines enforce auto-refund triggers if seller fails to submit evidence before timeout. |
| **Frivolous Dispute Griefing** | Bad-faith party triggers disputes to lock counterparty capital indefinitely. | **Medium** | Opening a dispute requires posting a non-refundable **Dispute Bond** (e.g. 10% of transaction value), forfeited if claims are deemed malicious. |
| **Juror Collusion & Sybil Voting** | Malicious actors acquire multiple juror slots to skew dispute verdicts. | **Critical** | Staked juror pool with commit-reveal voting scheme (prevents vote copying), randomized juror selection, and stake slashing for outliers. |
| **Rogue AI Agent Spending** | An autonomous AI agent with delegated key goes into an infinite spending loop. | **Critical** | Smart contract spending policies enforce maximum allowances per transaction, daily volume caps, and authorized recipient whitelists. |
| **Tampered / Fabricated Evidence** | Participant submits fraudulent screenshots or altered code commits. | **High** | Onchain evidence anchoring stores Keccak-256 hashes at submission timestamp. Offchain changes immediately invalidate the cryptographic hash. |
| **Frontrunning / Reordering on Monad** | MEV bots attempt to frontrun dispute filings or settlement calls. | **Medium** | State transitions require cryptographic signatures from designated participants; parallel EVM execution isolates non-dependent state paths. |
| **Reentrancy Attacks** | Malicious recipient re-enters escrow during funds disbursement. | **Critical** | ReentrancyGuard on all state-altering external functions; state updated before external token transfer. |

---

## 3. Escrow Security & Smart Contract Invariants

### 3.1 State Progression Invariant
A transaction can only transition to state $S_{t+1}$ if:
$$S_{t+1} \in \text{VALID\_TRANSITIONS}[S_t] \quad \land \quad \text{msg.sender} \in \text{AuthorizedActors}(S_t \to S_{t+1})$$

### 3.2 Solvency Invariant
The contract's token balance must always equal or exceed the total unsettled escrow liabilities:
$$\text{ContractBalance}(Token) \ge \sum_{i \in \text{ActiveTx}} \text{EscrowAmount}(i, Token) + \sum_{d \in \text{ActiveDisputes}} \text{DisputeBond}(d, Token)$$

### 3.3 Reentrancy Protection
```solidity
// Standard CEI Pattern enforced across all settlement calls
function releaseEscrow(bytes32 transactionId) external nonReentrant {
    TransactionRecord storage txRecord = transactions[transactionId];
    require(txRecord.state == TransactionState.VERIFICATION, "Invalid state");
    
    // 1. CHECKS completed
    
    // 2. EFFECTS: Update state before external transfer
    txRecord.state = TransactionState.SETTLED;
    emit TransactionSettled(transactionId, txRecord.seller, txRecord.totalAmount);
    
    // 3. INTERACTIONS: Safe transfer
    _disburseFunds(txRecord.tokenAddress, txRecord.seller, txRecord.totalAmount);
}
```

---

## 4. AI Security Boundaries (Principle 6 & 7 Enclosure)

TrustMesh implements an uncompromised firewall between AI inference and financial execution:

```
[ UNTRUSTED AI SERVICE ]
         |
         | (1) Suggests structured terms
         | (2) Generates timeline chronology
         | (3) Flags text contradictions
         v
[ STRICT VALIDATION GATEWAY ]
         |
         | Verification: Validates signatures, schemas, constraints
         v
[ HUMAN PARTICIPANTS / JURORS ]
         |
         | (4) Must sign transaction acceptance
         | (5) Must cast human votes on disputes
         v
[ ONCHAIN SMART CONTRACT (MONAD) ]
         |
         | (6) Deterministic execution of signed human/state rules
         v
[ SETTLEMENT / REFUND ]
```

- **No Autonomous Financial Slashes**: An AI model can never trigger an escrow payout, freeze accounts, or impose slashes without human review.
- **Adversarial Prompt Resistance**: Intent extraction outputs structured JSON validated against strict TypeScript/JSON schemas. Any prompt injection attempting to overwrite transaction amounts or transfer targets is filtered out before transaction proposal.

---

## 5. Juror Staking & Economic Slashing

To guarantee dispute adjudication integrity:
1. **Minimum Juror Stake**: Jurors must lock a minimum threshold of native MON (e.g. 1 MON for Apprentice tier) into the staking contract.
2. **Commit-Reveal Voting**: Jurors submit a salt-hashed commitment `keccak256(buyerShareBps, salt)` during the voting phase. Votes are revealed simultaneously during the reveal window. This prevents lazy jurors from simply copying earlier votes.
3. **Consensus Slashing**: Jurors whose votes deviate by more than 2 standard deviations from the final trimmed median verdict receive a reputation penalty. Chronic divergence triggers stake slashing.
4. **Appellate Escalation**: Either counterparty can appeal a first-instance ruling to an Appellate Quorum (Senior Jurors) by staking an Appellate Bond. If the appeal fails, the bond is distributed to the initial jurors and winner.
