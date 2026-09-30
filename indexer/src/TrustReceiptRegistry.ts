// Envio HyperIndex Event Handlers for VeriqoMesh Network
// Contract: TrustReceiptRegistry
// Network: Monad Metropolis Testnet (Chain ID: 10143)

import {
  TrustReceiptRegistry,
} from "generated";

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
