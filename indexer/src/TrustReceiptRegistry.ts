// Envio HyperIndex Event Handlers for VeriqoMesh Network
// Contract: TrustReceiptRegistry
// Network: Monad Metropolis Testnet (Chain ID: 10143)

import { indexer } from "envio";

// 12. TrustReceiptIssued (from TrustReceiptRegistry)
indexer.onEvent(
  { contract: "TrustReceiptRegistry", event: "TrustReceiptIssued" },
  async ({ event, context }) => {
  const txId = event.params.transactionId;
  const receiptId = event.params.receiptId;

  const outcomeNum = Number(event.params.outcome);

  context.TrustReceipt.set({
    id: receiptId.toString(),
    transactionId: txId,
    partyA: event.params.partyA.toLowerCase(),
    partyB: event.params.partyB.toLowerCase(),
    outcome: outcomeNum,
    issuedBlock: event.block.number,
    issuedTimestamp: BigInt(event.block.timestamp),
    txHash: event.transaction?.hash ?? "",
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
    id: `${event.transaction?.hash ?? event.block.number}-${event.logIndex}`,
    eventType: "TrustReceiptIssued",
    transactionId: txId,
    actor: event.params.partyA.toLowerCase(),
    details: `Non-transferable Soulbound Trust Receipt #${receiptId.toString()} issued for transaction outcome ${event.params.outcome}`,
    blockNumber: event.block.number,
    timestamp: BigInt(event.block.timestamp),
    txHash: event.transaction?.hash ?? "",
  });
});
