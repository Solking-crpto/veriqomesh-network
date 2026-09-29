/**
 * Binary search seller nonce across blocks to pinpoint the exact ratification transaction
 * With retry on transient RPC network blips.
 */
const { ethers } = require('ethers');

const RPC_URL = 'https://testnet-rpc.monad.xyz';
const CHAIN_ID = 10143;
const SELLER = '0x0e73dBFf9047423b520FA9fc23a95645fC986Ee8';
const ESCROW = '0x925ea880cA53DE0352b84B24d0C0dee5B258015A';
const TARGET_TX_ID = '0xbbd0176291d62b32c3e096d0314c0fab6bcfa9131c1b26a825b3ce994e645f5e';

async function retry(fn, retries = 5, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL, CHAIN_ID, { staticNetwork: true });

  let low = 65536552; // Failed tx block
  let high = await retry(() => provider.getBlockNumber());

  console.log(`Binary searching block range [${low}, ${high}] for nonce 7 transition...`);

  const nonceLow = await retry(() => provider.getTransactionCount(SELLER, low));
  const nonceHigh = await retry(() => provider.getTransactionCount(SELLER, high));
  console.log(`Nonce at block ${low}: ${nonceLow}`);
  console.log(`Nonce at block ${high}: ${nonceHigh}`);

  if (nonceHigh < 7) {
    console.log('Nonce 7 not reached yet.');
    return;
  }

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    const nonceMid = await retry(() => provider.getTransactionCount(SELLER, mid));
    if (nonceMid >= 7) {
      high = mid;
    } else {
      low = mid + 1;
    }
  }

  const exactBlockNum = low;
  console.log(`\nExact block number found: ${exactBlockNum}`);

  const block = await retry(() => provider.getBlock(exactBlockNum, true));
  console.log(`Block hash: ${block.hash}`);
  console.log(`Block timestamp: ${new Date(block.timestamp * 1000).toISOString()}`);
  console.log(`Total transactions in block: ${block.transactions.length}`);

  let ratificationTx = null;
  for (const txHash of block.transactions) {
    const tx = await retry(() => provider.getTransaction(txHash));
    if (tx && tx.from.toLowerCase() === SELLER.toLowerCase() && tx.to && tx.to.toLowerCase() === ESCROW.toLowerCase()) {
      ratificationTx = tx;
      break;
    }
  }

  if (!ratificationTx) {
    for (const txHash of block.transactions) {
      const tx = await retry(() => provider.getTransaction(txHash));
      if (tx && tx.from.toLowerCase() === SELLER.toLowerCase()) {
        ratificationTx = tx;
        break;
      }
    }
  }

  if (ratificationTx) {
    console.log('\n========================================================================');
    console.log('             RATIFICATION TRANSACTION DETAILS');
    console.log('========================================================================');
    console.log(`Transaction Hash    : ${ratificationTx.hash}`);
    console.log(`Block Number        : ${exactBlockNum}`);
    console.log(`From (Seller)       : ${ratificationTx.from}`);
    console.log(`To (Escrow)         : ${ratificationTx.to}`);
    console.log(`Nonce               : ${ratificationTx.nonce}`);
    console.log(`Gas Limit           : ${ratificationTx.gasLimit.toString()}`);
    console.log(`Value               : ${ethers.formatEther(ratificationTx.value)} MON`);
    console.log(`Calldata            : ${ratificationTx.data}`);
    console.log(`Selector            : ${ratificationTx.data.slice(0, 10)}`);

    const receipt = await retry(() => provider.getTransactionReceipt(ratificationTx.hash));
    console.log(`Receipt Status      : ${receipt.status} (${receipt.status === 1 ? 'SUCCESS' : 'FAILED'})`);
    console.log(`Gas Used            : ${receipt.gasUsed.toString()}`);
    console.log(`Logs Count          : ${receipt.logs.length}`);

    // Query onchain state
    const { TRUSTMESH_ESCROW_ABI } = require('../packages/sdk/dist/abi.js');
    const escrow = new ethers.Contract(ESCROW, TRUSTMESH_ESCROW_ABI, provider);
    const txOnchain = await retry(() => escrow.getTransaction(TARGET_TX_ID));
    const state = await retry(() => escrow.getTransactionState(TARGET_TX_ID));

    const STATE_NAMES = [
      'DRAFT', 'PROPOSED', 'NEGOTIATING', 'AGREED', 'FUNDED',
      'IN_PROGRESS', 'EVIDENCE_SUBMITTED', 'VERIFICATION', 'DISPUTED',
      'JUDGING', 'RESOLVED', 'SETTLED', 'REFUNDED', 'CANCELLED'
    ];

    console.log('\n========================================================================');
    console.log('             ONCHAIN STATE AFTER RATIFICATION');
    console.log('========================================================================');
    console.log(`Resulting State     : ${state} (${STATE_NAMES[Number(state)]})`);
    console.log(`Seller Address      : ${txOnchain.seller}`);
    console.log(`Buyer Address       : ${txOnchain.buyer}`);
    console.log(`Terms Hash          : ${txOnchain.termsHash}`);
    console.log(`Terms Hash Matches  : ${txOnchain.termsHash === '0xebb931936199ae988129d1eed8501a6ad3311035f0d72dd0e52e0c92454a125f' ? 'YES (UNMODIFIED)' : 'NO'}`);
    console.log(`Total Amount        : ${ethers.formatEther(txOnchain.totalAmount)} MON`);
  }
}

main().catch(console.error);
