// Envio HyperIndex Event Handlers for VeriqoMesh Network
// Network: Monad Metropolis Testnet (Chain ID: 10143)

import {
  TrustMeshEscrow,
  TrustReceiptRegistry,
} from "generated";

function outcomeToString(outcome: number): "NONE" | "PASS" | "FAIL" | "INCONCLUSIVE" {
  switch (outcome) {
    case 1:
      return "PASS";
    case 2:
      return "FAIL";
    case 3:
      return "INCONCLUSIVE";
    default:
      return "NONE";
  }
}

// 1. TransactionCreated
TrustMeshEscrow.TransactionCreated.handler(async ({ event, context }) => {
  const txId = event.params.transactionId;
  const current = await context.Transaction.get(txId);

  context.Transaction.set({
    id: txId,
    buyer: event.params.buyer.toLowerCase(),
    seller: event.params.seller.toLowerCase(),
    verifier: event.params.verifier ? event.params.verifier.toLowerCase() : null,
    amount: event.params.amount,
    status: "CREATED",
    verificationOutcome: "NONE",
    createdAt: BigInt(event.block.timestamp),
    agreedAt: current?.agreedAt ?? null,
    fundedAt: current?.fundedAt ?? null,
    workStartedAt: current?.workStartedAt ?? null,
    verificationRequestedAt: current?.verificationRequestedAt ?? null,
    verificationSubmittedAt: current?.verificationSubmittedAt ?? null,
    disputeOpenedAt: current?.disputeOpenedAt ?? null,
    settledAt: current?.settledAt ?? null,
    refundedAt: current?.refundedAt ?? null,
    isDisputed: false,
    disputeResolver: null,
    buyerShareBps: null,
    createdBlock: event.block.number,
    createdTxHash: event.transaction.hash,
    evidenceCount: current?.evidenceCount ?? 0,
    receiptId: current?.receiptId ?? null,
    updatedAt: BigInt(event.block.timestamp),
  });

  context.LifecycleEvent.set({
    id: `${event.transaction.hash}-${event.logIndex}`,
    eventType: "TransactionCreated",
    transactionId: txId,
    actor: event.params.buyer.toLowerCase(),
    details: `Created transaction for ${event.params.amount.toString()} base units with seller ${event.params.seller.toLowerCase()}`,
    blockNumber: event.block.number,
    timestamp: BigInt(event.block.timestamp),
    txHash: event.transaction.hash,
  });
});

// 2. TransactionAgreed
TrustMeshEscrow.TransactionAgreed.handler(async ({ event, context }) => {
  const txId = event.params.transactionId;
  const tx = await context.Transaction.get(txId);

  if (tx) {
    context.Transaction.set({
      ...tx,
      status: "AGREED",
      agreedAt: BigInt(event.block.timestamp),
      updatedAt: BigInt(event.block.timestamp),
    });
  }

  context.LifecycleEvent.set({
    id: `${event.transaction.hash}-${event.logIndex}`,
    eventType: "TransactionAgreed",
    transactionId: txId,
    actor: event.params.seller.toLowerCase(),
    details: `Seller agreed to commercial terms onchain`,
    blockNumber: event.block.number,
    timestamp: BigInt(event.block.timestamp),
    txHash: event.transaction.hash,
  });
});

// 3. TransactionFunded
TrustMeshEscrow.TransactionFunded.handler(async ({ event, context }) => {
  const txId = event.params.transactionId;
  const tx = await context.Transaction.get(txId);

  if (tx) {
    context.Transaction.set({
      ...tx,
      status: "FUNDED",
      fundedAt: BigInt(event.block.timestamp),
      updatedAt: BigInt(event.block.timestamp),
    });
  }

  context.LifecycleEvent.set({
    id: `${event.transaction.hash}-${event.logIndex}`,
    eventType: "TransactionFunded",
    transactionId: txId,
    actor: event.params.funder.toLowerCase(),
    details: `Escrow funded with ${event.params.amount.toString()} base units`,
    blockNumber: event.block.number,
    timestamp: BigInt(event.block.timestamp),
    txHash: event.transaction.hash,
  });
});

// 4. TransactionStarted
TrustMeshEscrow.TransactionStarted.handler(async ({ event, context }) => {
  const txId = event.params.transactionId;
  const tx = await context.Transaction.get(txId);

  if (tx) {
    context.Transaction.set({
      ...tx,
      status: "STARTED",
      workStartedAt: BigInt(event.block.timestamp),
      updatedAt: BigInt(event.block.timestamp),
    });
  }

  context.LifecycleEvent.set({
    id: `${event.transaction.hash}-${event.logIndex}`,
    eventType: "TransactionStarted",
    transactionId: txId,
    actor: event.params.seller.toLowerCase(),
    details: `Seller commenced work execution under agreed mandate`,
    blockNumber: event.block.number,
    timestamp: BigInt(event.block.timestamp),
    txHash: event.transaction.hash,
  });
});

// 5. EvidenceAnchored
TrustMeshEscrow.EvidenceAnchored.handler(async ({ event, context }) => {
  const txId = event.params.transactionId;
  const contentHash = event.params.contentHash;

  context.EvidenceAnchor.set({
    id: `${txId}-${contentHash}`,
    transactionId: txId,
    contentHash: contentHash,
    submitter: event.params.submitter.toLowerCase(),
    blockNumber: event.block.number,
    timestamp: BigInt(event.block.timestamp),
    txHash: event.transaction.hash,
  });

  const tx = await context.Transaction.get(txId);
  if (tx) {
    context.Transaction.set({
      ...tx,
      evidenceCount: tx.evidenceCount + 1,
      updatedAt: BigInt(event.block.timestamp),
    });
  }

  context.LifecycleEvent.set({
    id: `${event.transaction.hash}-${event.logIndex}`,
    eventType: "EvidenceAnchored",
    transactionId: txId,
    actor: event.params.submitter.toLowerCase(),
    details: `Cryptographic evidence anchored: ${contentHash}`,
    blockNumber: event.block.number,
    timestamp: BigInt(event.block.timestamp),
    txHash: event.transaction.hash,
  });
});

// 6. VerificationStarted
TrustMeshEscrow.VerificationStarted.handler(async ({ event, context }) => {
  const txId = event.params.transactionId;
  const tx = await context.Transaction.get(txId);

  if (tx) {
    context.Transaction.set({
      ...tx,
      status: "VERIFYING",
      verifier: event.params.verifier.toLowerCase(),
      verificationRequestedAt: BigInt(event.block.timestamp),
      updatedAt: BigInt(event.block.timestamp),
    });
  }

  context.LifecycleEvent.set({
    id: `${event.transaction.hash}-${event.logIndex}`,
    eventType: "VerificationStarted",
    transactionId: txId,
    actor: event.params.verifier.toLowerCase(),
    details: `Independent verifier initiated deliverable evaluation`,
    blockNumber: event.block.number,
    timestamp: BigInt(event.block.timestamp),
    txHash: event.transaction.hash,
  });
});

// 7. VerificationSubmitted
TrustMeshEscrow.VerificationSubmitted.handler(async ({ event, context }) => {
  const txId = event.params.transactionId;
  const outcomeStr = outcomeToString(event.params.outcome);

  context.VerificationAttestation.set({
    id: `${txId}-${event.params.verifier.toLowerCase()}`,
    transactionId: txId,
    verifier: event.params.verifier.toLowerCase(),
    outcome: outcomeStr,
    reportHash: event.params.reportHash,
    blockNumber: event.block.number,
    timestamp: BigInt(event.block.timestamp),
    txHash: event.transaction.hash,
  });

  const tx = await context.Transaction.get(txId);
  if (tx) {
    context.Transaction.set({
      ...tx,
      verificationOutcome: outcomeStr,
      verificationSubmittedAt: BigInt(event.block.timestamp),
      updatedAt: BigInt(event.block.timestamp),
    });
  }

  context.LifecycleEvent.set({
    id: `${event.transaction.hash}-${event.logIndex}`,
    eventType: "VerificationSubmitted",
    transactionId: txId,
    actor: event.params.verifier.toLowerCase(),
    details: `Verifier attestation submitted: ${outcomeStr} (Report Hash: ${event.params.reportHash})`,
    blockNumber: event.block.number,
    timestamp: BigInt(event.block.timestamp),
    txHash: event.transaction.hash,
  });
});

// 8. DisputeOpened
TrustMeshEscrow.DisputeOpened.handler(async ({ event, context }) => {
  const txId = event.params.transactionId;

  context.DisputeRecord.set({
    id: txId,
    transactionId: txId,
    initiator: event.params.initiator.toLowerCase(),
    resolver: null,
    buyerShareBps: null,
    isResolved: false,
    openedBlock: event.block.number,
    openedTimestamp: BigInt(event.block.timestamp),
    openedTxHash: event.transaction.hash,
    resolvedBlock: null,
    resolvedTimestamp: null,
    resolvedTxHash: null,
  });

  const tx = await context.Transaction.get(txId);
  if (tx) {
    context.Transaction.set({
      ...tx,
      status: "DISPUTED",
      isDisputed: true,
      disputeOpenedAt: BigInt(event.block.timestamp),
      updatedAt: BigInt(event.block.timestamp),
    });
  }

  context.LifecycleEvent.set({
    id: `${event.transaction.hash}-${event.logIndex}`,
    eventType: "DisputeOpened",
    transactionId: txId,
    actor: event.params.initiator.toLowerCase(),
    details: `Dispute opened due to inconclusive verification or contested deliverable`,
    blockNumber: event.block.number,
    timestamp: BigInt(event.block.timestamp),
    txHash: event.transaction.hash,
  });
});

// 9. DisputeResolved
TrustMeshEscrow.DisputeResolved.handler(async ({ event, context }) => {
  const txId = event.params.transactionId;
  const dispute = await context.DisputeRecord.get(txId);

  if (dispute) {
    context.DisputeRecord.set({
      ...dispute,
      resolver: event.params.resolver.toLowerCase(),
      buyerShareBps: event.params.buyerShareBps,
      isResolved: true,
      resolvedBlock: event.block.number,
      resolvedTimestamp: BigInt(event.block.timestamp),
      resolvedTxHash: event.transaction.hash,
    });
  }

  const tx = await context.Transaction.get(txId);
  if (tx) {
    context.Transaction.set({
      ...tx,
      status: "SETTLED",
      disputeResolver: event.params.resolver.toLowerCase(),
      buyerShareBps: event.params.buyerShareBps,
      updatedAt: BigInt(event.block.timestamp),
    });
  }

  context.LifecycleEvent.set({
    id: `${event.transaction.hash}-${event.logIndex}`,
    eventType: "DisputeResolved",
    transactionId: txId,
    actor: event.params.resolver.toLowerCase(),
    details: `Dispute resolved via quorum consensus with buyer share ${event.params.buyerShareBps} BPS`,
    blockNumber: event.block.number,
    timestamp: BigInt(event.block.timestamp),
    txHash: event.transaction.hash,
  });
});

// 10. TransactionSettled
TrustMeshEscrow.TransactionSettled.handler(async ({ event, context }) => {
  const txId = event.params.transactionId;
  const tx = await context.Transaction.get(txId);

  if (tx) {
    context.Transaction.set({
      ...tx,
      status: "SETTLED",
      settledAt: BigInt(event.block.timestamp),
      updatedAt: BigInt(event.block.timestamp),
    });
  }

  context.LifecycleEvent.set({
    id: `${event.transaction.hash}-${event.logIndex}`,
    eventType: "TransactionSettled",
    transactionId: txId,
    actor: event.params.recipient.toLowerCase(),
    details: `Settlement disbursed: ${event.params.amount.toString()} base units to ${event.params.recipient.toLowerCase()}`,
    blockNumber: event.block.number,
    timestamp: BigInt(event.block.timestamp),
    txHash: event.transaction.hash,
  });
});

// 11. TransactionRefunded
TrustMeshEscrow.TransactionRefunded.handler(async ({ event, context }) => {
  const txId = event.params.transactionId;
  const tx = await context.Transaction.get(txId);

  if (tx) {
    context.Transaction.set({
      ...tx,
      status: "REFUNDED",
      refundedAt: BigInt(event.block.timestamp),
      updatedAt: BigInt(event.block.timestamp),
    });
  }

  context.LifecycleEvent.set({
    id: `${event.transaction.hash}-${event.logIndex}`,
    eventType: "TransactionRefunded",
    transactionId: txId,
    actor: event.params.recipient.toLowerCase(),
    details: `Escrow refunded: ${event.params.amount.toString()} base units to ${event.params.recipient.toLowerCase()}`,
    blockNumber: event.block.number,
    timestamp: BigInt(event.block.timestamp),
    txHash: event.transaction.hash,
  });
});

// 12. TrustReceiptIssued (from TrustReceiptRegistry)
TrustReceiptRegistry.TrustReceiptIssued.handler(async ({ event, context }) => {
  const txId = event.params.transactionId;
  const receiptId = event.params.receiptId;

  context.TrustReceipt.set({
    id: receiptId.toString(),
    transactionId: txId,
    partyA: event.params.partyA.toLowerCase(),
    partyB: event.params.partyB.toLowerCase(),
    outcome: event.params.outcome,
    issuedBlock: event.block.number,
    issuedTimestamp: BigInt(event.block.timestamp),
    txHash: event.transaction.hash,
  });

  const tx = await context.Transaction.get(txId);
  if (tx) {
    context.Transaction.set({
      ...tx,
      receiptId: receiptId,
      updatedAt: BigInt(event.block.timestamp),
    });
  }

  context.LifecycleEvent.set({
    id: `${event.transaction.hash}-${event.logIndex}`,
    eventType: "TrustReceiptIssued",
    transactionId: txId,
    actor: event.params.partyA.toLowerCase(),
    details: `Non-transferable Soulbound Trust Receipt #${receiptId.toString()} issued for transaction outcome ${event.params.outcome}`,
    blockNumber: event.block.number,
    timestamp: BigInt(event.block.timestamp),
    txHash: event.transaction.hash,
  });
});
