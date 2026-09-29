/**
 * Real-time Monitor for Seller Ratification Transaction on Monad Testnet
 */
const { JsonRpcProvider, Contract, formatEther, Interface } = require('ethers');
const { TRUSTMESH_ESCROW_ABI } = require('../packages/sdk/dist/abi.js');

const RPC_URL = 'https://testnet-rpc.monad.xyz';
const CHAIN_ID = 10143;
const ESCROW_ADDRESS = '0x925ea880cA53DE0352b84B24d0C0dee5B258015A';
const SELLER_ADDRESS = '0x0e73dBFf9047423b520FA9fc23a95645fC986Ee8';
const TARGET_TX_ID = '0xbbd0176291d62b32c3e096d0314c0fab6bcfa9131c1b26a825b3ce994e645f5e';
const BASE_NONCE = 6;

const STATE_NAMES = [
  'DRAFT', 'PROPOSED', 'NEGOTIATING', 'AGREED', 'FUNDED',
  'IN_PROGRESS', 'EVIDENCE_SUBMITTED', 'VERIFICATION', 'DISPUTED',
  'JUDGING', 'RESOLVED', 'SETTLED', 'REFUNDED', 'CANCELLED'
];

async function main() {
  const provider = new JsonRpcProvider(RPC_URL, CHAIN_ID);
  const escrow = new Contract(ESCROW_ADDRESS, TRUSTMESH_ESCROW_ABI, provider);

  console.log('Listening for seller ratification transaction from ' + SELLER_ADDRESS + '...');
  console.log('Target Transaction ID: ' + TARGET_TX_ID);
  console.log('Baseline Nonce: ' + BASE_NONCE);

  const startTime = Date.now();
  const TIMEOUT_MS = 300000; // 5 minutes

  while (Date.now() - startTime < TIMEOUT_MS) {
    const currentNonce = await provider.getTransactionCount(SELLER_ADDRESS, 'latest');
    const stateIdx = await escrow.getTransactionState(TARGET_TX_ID);

    // If nonce changed or state is no longer PROPOSED (1)
    if (currentNonce > BASE_NONCE || Number(stateIdx) >= 3) {
      console.log(`\nTransaction detected! Nonce: ${currentNonce} | Current State: ${stateIdx}`);

      // Query TransactionAgreed event
      const latestBlock = await provider.getBlockNumber();
      const events = await escrow.queryFilter(
        escrow.filters.TransactionAgreed(TARGET_TX_ID),
        Math.max(0, latestBlock - 50),
        latestBlock
      );

      let txHash = null;
      let receipt = null;

      if (events.length > 0) {
        txHash = events[0].transactionHash;
        receipt = await provider.getTransactionReceipt(txHash);
      } else {
        // Fallback: look at recent block transactions from seller
        const block = await provider.getBlock(latestBlock, true);
        if (block && block.prefetchedTransactions) {
          const matchingTx = block.prefetchedTransactions.find(
            t => t.from && t.from.toLowerCase() === SELLER_ADDRESS.toLowerCase()
          );
          if (matchingTx) {
            txHash = matchingTx.hash;
            receipt = await provider.getTransactionReceipt(txHash);
          }
        }
      }

      const txData = await escrow.getTransaction(TARGET_TX_ID);

      console.log('\n========================================================================');
      console.log('        SELLER RATIFICATION VERIFICATION RESULT');
      console.log('========================================================================');
      console.log(`Transaction Hash    : ${txHash || 'Pending event indexing'}`);
      if (receipt) {
        console.log(`Block Number        : ${receipt.blockNumber}`);
        console.log(`Receipt Status      : ${receipt.status} (${receipt.status === 1 ? 'SUCCESS' : 'REVERTED'})`);
        console.log(`Gas Used            : ${receipt.gasUsed.toString()}`);
      }
      console.log(`Seller Address      : ${txData.seller}`);
      console.log(`Buyer Address       : ${txData.buyer}`);
      console.log(`Resulting State     : ${Number(stateIdx)} (${STATE_NAMES[Number(stateIdx)] || 'UNKNOWN'})`);
      console.log(`Terms Hash          : ${txData.termsHash}`);
      console.log(`Terms Hash Intact   : ${txData.termsHash === '0xebb931936199ae988129d1eed8501a6ad3311035f0d72dd0e52e0c92454a125f' ? 'YES (0xebb9...125f)' : 'MUTATED'}`);
      console.log(`Total Amount        : ${formatEther(txData.totalAmount)} MON`);

      return;
    }

    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log('Monitor timed out. Please check MetaMask.');
}

main().catch(console.error);
