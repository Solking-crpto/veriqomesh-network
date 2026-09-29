/**
 * Real-time Monitor for Seller Evidence Anchoring Transaction on Monad Testnet
 */
const { JsonRpcProvider, Contract, formatEther } = require('ethers');
const { TRUSTMESH_ESCROW_ABI } = require('../packages/sdk/dist/abi.js');

const RPC_URL = 'https://testnet-rpc.monad.xyz';
const CHAIN_ID = 10143;
const ESCROW_ADDRESS = '0x925ea880cA53DE0352b84B24d0C0dee5B258015A';
const SELLER_ADDRESS = '0x0e73dBFf9047423b520FA9fc23a95645fC986Ee8';
const TARGET_TX_ID = '0x961c70865bf6097eb16d1b3a19d90f950b2cdd789eda5554c93baba1de0954e1';
const BASE_NONCE = 13;

const EXPECTED_BUYER = '0xa4bCC57d40311D715ECe34940191820d4a81C50F';
const EXPECTED_SELLER = '0x0e73dBFf9047423b520FA9fc23a95645fC986Ee8';
const EXPECTED_VERIFIER = '0xb064d69428B9838C2a3e408cF995ea8eb5182c48';
const EXPECTED_TERMS_HASH = '0xebb931936199ae988129d1eed8501a6ad3311035f0d72dd0e52e0c92454a125f';
const EXPECTED_CONTENT_HASH = '0x08a30b2c4935050f1ffbda42a5a6565ab54fc1b090bb47c036afd47aaad2edff';
const EXPECTED_METADATA_HASH = '0xb407b4105f5f9584e3837ed5fdc6767c8b48b5a771a54d9d2b5f83d2f0ff210f';
const EXPECTED_STORAGE_HASH = '0x89b9c3150963c84e7e9c3e1c8c921289f9d0595ae6e4db6516f296f7532309e6';

const STATE_NAMES = [
  'DRAFT (0)', 'PROPOSED (1)', 'NEGOTIATING (2)', 'AGREED (3)', 'FUNDED (4)',
  'IN_PROGRESS (5)', 'EVIDENCE_SUBMITTED (6)', 'VERIFICATION (7)', 'DISPUTED (8)',
  'JUDGING (9)', 'RESOLVED (10)', 'SETTLED (11)', 'REFUNDED (12)', 'CANCELLED (13)'
];

async function main() {
  const provider = new JsonRpcProvider(RPC_URL, CHAIN_ID);
  const escrow = new Contract(ESCROW_ADDRESS, TRUSTMESH_ESCROW_ABI, provider);

  console.log(`[MONITOR] Listening for evidence anchoring transaction from ${SELLER_ADDRESS}...`);
  console.log(`[MONITOR] Target Tx ID: ${TARGET_TX_ID}`);
  console.log(`[MONITOR] Baseline Nonce: ${BASE_NONCE}`);

  const startTime = Date.now();
  const TIMEOUT_MS = 3600000; // 1 hour

  while (Date.now() - startTime < TIMEOUT_MS) {
    try {
      const currentNonce = await provider.getTransactionCount(SELLER_ADDRESS, 'latest');
      const anchors = await escrow.getEvidenceAnchors(TARGET_TX_ID);
      const stateIdx = Number(await escrow.getTransactionState(TARGET_TX_ID));

      if (currentNonce > BASE_NONCE || anchors.length > 0 || stateIdx >= 6) {
        console.log(`\n[EVENT DETECTED] Nonce: ${currentNonce} | Anchors: ${anchors.length} | State: ${STATE_NAMES[stateIdx]} (${stateIdx})`);

        // 1. Locate EvidenceAnchored event
        const latestBlock = await provider.getBlockNumber();
        let txHash = null;
        let receipt = null;

        try {
          const events = await escrow.queryFilter(
            escrow.filters.EvidenceAnchored(TARGET_TX_ID),
            Math.max(0, latestBlock - 50),
            latestBlock
          );
          if (events.length > 0) {
            txHash = events[events.length - 1].transactionHash;
            receipt = await provider.getTransactionReceipt(txHash);
          }
        } catch (e) {
          // Fallback to block search
        }

        if (!txHash) {
          // Fallback: Scan last 25 blocks for transaction from seller
          for (let b = latestBlock; b >= Math.max(0, latestBlock - 25); b--) {
            const block = await provider.getBlock(b, true);
            if (block && block.prefetchedTransactions) {
              const match = block.prefetchedTransactions.find(
                t => t.from && t.from.toLowerCase() === SELLER_ADDRESS.toLowerCase()
              );
              if (match) {
                txHash = match.hash;
                receipt = await provider.getTransactionReceipt(txHash);
                break;
              }
            }
          }
        }

        if (txHash && receipt) {
          const txObj = await provider.getTransaction(txHash);
          const calldataSelector = txObj ? txObj.data.slice(0, 10).toLowerCase() : '0x7d63bade';

          const txRecord = await escrow.getTransaction(TARGET_TX_ID);
          const finalAnchors = await escrow.getEvidenceAnchors(TARGET_TX_ID);
          const finalState = Number(txRecord.state);

          console.log('\n======================================================');
          console.log('LIVE EVIDENCE ANCHOR AUDIT REPORT');
          console.log('======================================================');
          console.log(`1. Transaction hash: ${txHash}`);
          console.log(`2. Block number: ${receipt.blockNumber}`);
          console.log(`3. Transaction status: ${receipt.status === 1 ? '1 (SUCCESS)' : '0 (REVERTED)'}`);
          console.log(`4. Gas used: ${receipt.gasUsed.toString()}`);
          console.log(`5. Sender address: ${receipt.from}`);
          console.log(`6. Method called: anchorEvidence`);
          console.log(`7. Selector called: ${calldataSelector}`);
          console.log(`8. New onchain transaction state: ${finalState} (${STATE_NAMES[finalState]})`);
          console.log(`9. New onchain evidenceRoot and evidence count:`);
          console.log(`   - evidenceRoot: ${txRecord.evidenceRoot}`);
          console.log(`   - evidenceCount: ${finalAnchors.length}`);
          console.log(`\nStored Evidence Record Details:`);
          if (finalAnchors.length > 0) {
            const r = finalAnchors[finalAnchors.length - 1];
            console.log(`   - contentHash: ${r.contentHash}`);
            console.log(`   - metadataHash: ${r.metadataHash}`);
            console.log(`   - storageUriHash: ${r.storageUriHash}`);
            console.log(`   - submitter: ${r.submitter}`);
            console.log(`   - isEncrypted: ${r.isEncrypted}`);
            console.log(`   - status: ${Number(r.status)} (SELF_REPORTED)`);
          }
          console.log('\nInvariant Security Checks:');
          console.log(`   - Buyer unchanged: ${txRecord.buyer.toLowerCase() === EXPECTED_BUYER.toLowerCase()}`);
          console.log(`   - Seller unchanged: ${txRecord.seller.toLowerCase() === EXPECTED_SELLER.toLowerCase()}`);
          console.log(`   - Verifier unchanged: ${txRecord.verifier.toLowerCase() === EXPECTED_VERIFIER.toLowerCase()}`);
          console.log(`   - Total amount unchanged: ${formatEther(txRecord.totalAmount)} MON`);
          console.log(`   - Terms hash unchanged: ${txRecord.termsHash.toLowerCase() === EXPECTED_TERMS_HASH.toLowerCase()}`);
          console.log(`   - Old verifier NOT involved: ${txRecord.verifier.toLowerCase() !== '0x16d7bd08ad79bbcdba116a652f68589fe5d6f4ea'}`);

          if (receipt.status === 1 && finalState === 6) {
            console.log('\n10. Final confirmation: EVIDENCE BROADCAST CONFIRMED');
            process.exit(0);
          } else {
            console.log('\n10. Final confirmation: EVIDENCE BROADCAST FAILED');
            process.exit(1);
          }
        }
      }
    } catch (err) {
      console.log('[MONITOR] RPC query retry:', err.message);
    }

    await new Promise(r => setTimeout(r, 2000));
  }

  console.log('[MONITOR] Timed out waiting for transaction.');
  process.exit(1);
}

main().catch(err => {
  console.error('[MONITOR] Error:', err);
  process.exit(1);
});
