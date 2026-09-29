import { ethers } from "ethers";
import fs from "fs";

const RPC_URL = "https://testnet-rpc.monad.xyz";
const provider = new ethers.JsonRpcProvider(RPC_URL);

const ESCROW_ADDRESS = "0x925ea880cA53DE0352b84B24d0C0dee5B258015A";
const TARGET_TX_ID = "0x961c70865bf6097eb16d1b3a19d90f950b2cdd789eda5554c93baba1de0954e1";

const EXPECTED_BUYER = "0xa4bCC57d40311D715ECe34940191820d4a81C50F";
const EXPECTED_SELLER = "0x0e73dBFf9047423b520FA9fc23a95645fC986Ee8";
const EXPECTED_VERIFIER = "0xb064d69428B9838C2a3e408cF995ea8eb5182c48";
const OLD_VERIFIER = "0x16D7bD08Ad79bBCdBa116A652f68589FE5d6F4EA";

async function main() {
  const artifact = JSON.parse(fs.readFileSync("contracts/out/TrustMeshEscrow.sol/TrustMeshEscrow.json", "utf-8"));
  const escrow = new ethers.Contract(ESCROW_ADDRESS, artifact.abi, provider);

  console.log(`[MONITOR] Listening on Monad Testnet for creation of txId: ${TARGET_TX_ID}...`);

  const filter = escrow.filters.TransactionCreated(TARGET_TX_ID);

  while (true) {
    try {
      const txRecord = await escrow.getTransaction(TARGET_TX_ID);
      if (txRecord.buyer !== ethers.ZeroAddress) {
        console.log(`\n[✓] TRANSACTION MINED ONCHAIN!`);
        
        // Find creation event to get txHash and blockNumber
        const currentBlock = await provider.getBlockNumber();
        const startBlock = Math.max(0, currentBlock - 200);
        let txHash = "UNKNOWN";
        let blockNumber = currentBlock;
        let gasUsed = "UNKNOWN";
        let receiptStatus = 1;

        try {
          const queryPromise = escrow.queryFilter(filter, startBlock, currentBlock);
          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('RPC queryFilter timeout')), 6000));
          const events = await Promise.race([queryPromise, timeoutPromise]);
          if (events && events.length > 0) {
            const ev = events[events.length - 1];
            txHash = ev.transactionHash;
            blockNumber = ev.blockNumber;
            const receipt = await provider.getTransactionReceipt(txHash);
            if (receipt) {
              receiptStatus = receipt.status;
              gasUsed = receipt.gasUsed.toString();
            }
          }
        } catch (filterErr) {
          console.log(`[NOTE] Event query lookup note: ${filterErr.message}. Record confirmed via storage.`);
        }

        const stateNum = Number(txRecord.state);
        const STATE_NAMES = [
          'DRAFT', 'PROPOSED', 'NEGOTIATING', 'AGREED', 'FUNDED',
          'IN_PROGRESS', 'EVIDENCE_SUBMITTED', 'VERIFICATION', 'DISPUTED',
          'JUDGING', 'RESOLVED', 'SETTLED', 'REFUNDED', 'CANCELLED'
        ];

        console.log(`TRANSACTION HASH       : ${txHash}`);
        console.log(`BLOCK NUMBER           : ${blockNumber}`);
        console.log(`RECEIPT STATUS         : ${receiptStatus} (${receiptStatus === 1 ? 'SUCCESS' : 'FAILED'})`);
        console.log(`GAS USED               : ${gasUsed}`);
        console.log(`BUYER                  : ${txRecord.buyer}`);
        console.log(`SELLER                 : ${txRecord.seller}`);
        console.log(`VERIFIER               : ${txRecord.verifier}`);
        console.log(`AMOUNT                 : ${ethers.formatEther(txRecord.totalAmount)} MON`);
        console.log(`STATE                  : ${stateNum} (${STATE_NAMES[stateNum]})`);
        console.log(`TERMS HASH             : ${txRecord.termsHash}`);
        console.log(`OLD VERIFIER CHECK     : ${txRecord.verifier.toLowerCase() !== OLD_VERIFIER.toLowerCase() ? 'CONFIRMED NOT USED' : 'FAILED - OLD VERIFIER DETECTED'}`);

        break;
      }
    } catch (e) {
      // transient RPC error
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
}

main().catch(console.error);
