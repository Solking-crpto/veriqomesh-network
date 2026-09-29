/**
 * Read-Only Diagnosis of Transaction 0xb350e98c1b131166c49c46cd38dc360f0d0c7e34b8a149b7da152028691bf43e
 * and Current Authoritative Onchain State
 */
const { ethers } = require('ethers');
const { TRUSTMESH_ESCROW_ABI } = require('../packages/sdk/dist/abi.js');

const RPC_URL = 'https://testnet-rpc.monad.xyz';
const CHAIN_ID = 10143;
const FAILED_TX_HASH = '0xb350e98c1b131166c49c46cd38dc360f0d0c7e34b8a149b7da152028691bf43e';
const ESCROW_ADDRESS = '0x925ea880cA53DE0352b84B24d0C0dee5B258015A';
const TARGET_TX_ID = '0xbbd0176291d62b32c3e096d0314c0fab6bcfa9131c1b26a825b3ce994e645f5e';

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL, CHAIN_ID, { staticNetwork: true });
  const escrow = new ethers.Contract(ESCROW_ADDRESS, TRUSTMESH_ESCROW_ABI, provider);
  const escrowInterface = new ethers.Interface(TRUSTMESH_ESCROW_ABI);

  console.log('========================================================================');
  console.log('   INSPECTION OF FAILED TRANSACTION 0xb350e98c...');
  console.log('========================================================================');

  const [tx, receipt] = await Promise.all([
    provider.getTransaction(FAILED_TX_HASH),
    provider.getTransactionReceipt(FAILED_TX_HASH),
  ]);

  if (!tx) {
    console.log('Transaction NOT FOUND on Monad RPC for hash:', FAILED_TX_HASH);
  } else {
    console.log(`Hash        : ${tx.hash}`);
    console.log(`From        : ${tx.from}`);
    console.log(`To          : ${tx.to}`);
    console.log(`Nonce       : ${tx.nonce}`);
    console.log(`Gas Limit   : ${tx.gasLimit.toString()}`);
    console.log(`Value       : ${ethers.formatEther(tx.value)} MON`);
    console.log(`Block Number: ${tx.blockNumber}`);
    console.log(`Calldata    : ${tx.data}`);
    console.log(`Selector    : ${tx.data.slice(0, 10)}`);

    // Decode calldata
    try {
      const decoded = escrowInterface.parseTransaction({ data: tx.data, value: tx.value });
      if (decoded) {
        console.log(`Decoded Function: ${decoded.name}`);
        console.log(`Decoded Signature: ${decoded.signature}`);
        console.log(`Decoded Arguments:`, decoded.args);
      }
    } catch (e) {
      console.log('Could not decode calldata with TrustMeshEscrow ABI:', e.message);
    }
  }

  if (!receipt) {
    console.log('Receipt: NULL');
  } else {
    console.log('\nReceipt Details:');
    console.log(`Status      : ${receipt.status} (${receipt.status === 1 ? 'SUCCESS' : 'REVERTED/FAILED'})`);
    console.log(`Block Number: ${receipt.blockNumber}`);
    console.log(`Gas Used    : ${receipt.gasUsed.toString()}`);
    console.log(`Logs Count  : ${receipt.logs.length}`);
    console.log(`Logs        :`, JSON.stringify(receipt.logs, null, 2));
  }

  // Attempt to recover revert reason via eth_call
  console.log('\n--- Replay / Revert Reason via eth_call ---');
  if (tx) {
    try {
      const callRes = await provider.call({
        to: tx.to,
        from: tx.from,
        data: tx.data,
        value: tx.value,
        gasLimit: tx.gasLimit,
        blockTag: tx.blockNumber - 1, // evaluate at block prior to inclusion
      });
      console.log('eth_call at block - 1 SUCCEEDED! Result:', callRes);
    } catch (err) {
      console.log('eth_call at block - 1 REVERTED!');
      console.log('Error message:', err.message);
      if (err.data) {
        console.log('Raw revert data:', err.data);
        try {
          const parsed = escrowInterface.parseError(err.data);
          console.log(`Decoded Custom Error: ${parsed.name}(${parsed.args.join(', ')})`);
        } catch {
          console.log('Could not parse error data with ABI');
        }
      }
    }

    try {
      const callResLatest = await provider.call({
        to: tx.to,
        from: tx.from,
        data: tx.data,
        value: tx.value,
      });
      console.log('eth_call at latest SUCCEEDED! Result:', callResLatest);
    } catch (err) {
      console.log('eth_call at latest REVERTED!');
      console.log('Error message:', err.message);
      if (err.data) {
        console.log('Raw revert data:', err.data);
        try {
          const parsed = escrowInterface.parseError(err.data);
          console.log(`Decoded Custom Error: ${parsed.name}(${parsed.args.join(', ')})`);
        } catch {
          console.log('Could not parse error data with ABI');
        }
      }
    }
  }

  console.log('\n========================================================================');
  console.log('   CURRENT AUTHORITATIVE CONTRACT STATE');
  console.log('========================================================================');

  const [txOnchain, stateIdx, anchors, totalLiabilities] = await Promise.all([
    escrow.getTransaction(TARGET_TX_ID),
    escrow.getTransactionState(TARGET_TX_ID),
    escrow.getEvidenceAnchors(TARGET_TX_ID),
    escrow.totalEscrowLiabilities(),
  ]);

  const STATE_NAMES = [
    'DRAFT', 'PROPOSED', 'NEGOTIATING', 'AGREED', 'FUNDED',
    'IN_PROGRESS', 'EVIDENCE_SUBMITTED', 'VERIFICATION', 'DISPUTED',
    'JUDGING', 'RESOLVED', 'SETTLED', 'REFUNDED', 'CANCELLED'
  ];

  console.log(`Transaction ID          : ${TARGET_TX_ID}`);
  console.log(`Current State Index     : ${stateIdx.toString()}`);
  console.log(`Human-Readable State    : ${STATE_NAMES[Number(stateIdx)] || 'UNKNOWN'}`);
  console.log(`Funded At (epoch)       : ${txOnchain.fundedAt.toString()}`);
  console.log(`Settled At (epoch)      : ${txOnchain.settledAt.toString()}`);
  console.log(`Escrow Amount           : ${ethers.formatEther(txOnchain.totalAmount)} MON (${txOnchain.totalAmount.toString()} wei)`);
  console.log(`Evidence Count          : ${anchors.length}`);
  console.log(`Evidence Anchors        :`, anchors);
  console.log(`Buyer                   : ${txOnchain.buyer}`);
  console.log(`Seller                  : ${txOnchain.seller}`);
  console.log(`Verifier                : ${txOnchain.verifier}`);
  console.log(`Terms Hash              : ${txOnchain.termsHash}`);
  console.log(`Total Escrow Liabilities: ${ethers.formatEther(totalLiabilities)} MON`);
}

main().catch(console.error);
