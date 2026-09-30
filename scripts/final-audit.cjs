const fs = require('fs');
const { ethers } = require('ethers');

async function audit() {
  const provider = new ethers.JsonRpcProvider('https://testnet-rpc.monad.xyz');
  const net = await provider.getNetwork();
  console.log('Chain ID:', net.chainId.toString());

  const escrowAddress = '0x925ea880cA53DE0352b84B24d0C0dee5B258015A';
  const registryAddress = '0xE1994e0dF7CD5A836be4b02AE2164A542418B819';
  const targetTxId = '0x961c70865bf6097eb16d1b3a19d90f950b2cdd789eda5554c93baba1de0954e1';
  const settlementTxHash = '0x691f7a80d65fe1deece2f45e8b6600ee4b2b0ffc14f3fe733d995566e2d83b52';

  const escrowArtifact = JSON.parse(fs.readFileSync('contracts/out/TrustMeshEscrow.sol/TrustMeshEscrow.json', 'utf-8'));
  const registryArtifact = JSON.parse(fs.readFileSync('contracts/out/TrustReceiptRegistry.sol/TrustReceiptRegistry.json', 'utf-8'));

  const escrow = new ethers.Contract(escrowAddress, escrowArtifact.abi, provider);
  const registry = new ethers.Contract(registryAddress, registryArtifact.abi, provider);

  // Escrow balance & liabilities
  const escrowBal = await provider.getBalance(escrowAddress);
  const liabilities = await escrow.totalEscrowLiabilities();
  console.log('Escrow Contract Balance:', ethers.formatEther(escrowBal), 'MON');
  console.log('Total Escrow Liabilities:', ethers.formatEther(liabilities), 'MON');

  // Query transaction onchain
  const txRec = await escrow.getTransaction(targetTxId);
  const anchors = await escrow.getEvidenceAnchors(targetTxId);
  console.log('Transaction Record:', {
    transactionId: txRec.transactionId,
    buyer: txRec.buyer,
    seller: txRec.seller,
    verifier: txRec.verifier,
    tokenAddress: txRec.tokenAddress,
    totalAmount: ethers.formatEther(txRec.totalAmount) + ' MON',
    state: Number(txRec.state),
    verificationOutcome: Number(txRec.verificationOutcome),
    agreementDeadline: Number(txRec.agreementDeadline),
    fulfillmentDeadline: Number(txRec.fulfillmentDeadline),
    disputeDeadline: Number(txRec.disputeDeadline),
    termsHash: txRec.termsHash,
    evidenceRoot: txRec.evidenceRoot,
    createdAt: Number(txRec.createdAt),
    fundedAt: Number(txRec.fundedAt),
    settledAt: Number(txRec.settledAt),
    anchorsCount: anchors.length
  });

  console.log('Anchors details:');
  anchors.forEach((a, i) => {
    console.log(`  Anchor #${i}:`, {
      contentHash: a.contentHash,
      metadataHash: a.metadataHash,
      storageUriHash: a.storageUriHash,
      submitter: a.submitter,
      status: Number(a.status),
      isEncrypted: a.isEncrypted,
      timestamp: Number(a.timestamp)
    });
  });

  // Check pending withdrawals for parties
  const buyerPending = await escrow.pendingWithdrawals(txRec.buyer);
  const sellerPending = await escrow.pendingWithdrawals(txRec.seller);
  console.log('Pending withdrawals - Buyer:', ethers.formatEther(buyerPending), 'Seller:', ethers.formatEther(sellerPending));

  // Settlement transaction receipt
  const receipt = await provider.getTransactionReceipt(settlementTxHash);
  if (receipt) {
    const txObj = await provider.getTransaction(settlementTxHash);
    console.log('Settlement Tx Receipt:', {
      hash: receipt.hash,
      blockNumber: receipt.blockNumber,
      status: receipt.status,
      gasUsed: receipt.gasUsed.toString(),
      from: receipt.from,
      to: receipt.to,
      selector: txObj ? txObj.data.slice(0, 10) : 'none'
    });
  } else {
    console.log('Settlement Tx not found onchain yet.');
  }

  // Registry audit: total receipts, receipt by txId, etc.
  try {
    const totalReceipts = await registry.totalReceipts();
    console.log('Receipt Registry totalReceipts:', totalReceipts.toString());
    for (let r = 1; r <= Number(totalReceipts); r++) {
      const rec = await registry.getReceipt(r);
      console.log(`Receipt #${r}:`, {
        receiptNumber: r,
        transactionId: rec.transactionId,
        partyA: rec.partyA,
        partyB: rec.partyB,
        tokenAddress: rec.tokenAddress,
        settledAmount: ethers.formatEther(rec.settledAmount) + ' MON',
        outcome: Number(rec.outcome),
        termsSummaryHash: rec.termsSummaryHash,
        evidenceRoot: rec.evidenceRoot,
        issuedAt: Number(rec.issuedAt)
      });
    }
    const txReceipt = await registry.getReceiptByTransaction(targetTxId);
    console.log('getReceiptByTransaction for targetTxId exists:', txReceipt.transactionId === targetTxId);
  } catch (e) {
    console.log('Error querying registry:', e.message);
  }
}

audit().catch(console.error);
