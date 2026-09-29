import { ethers } from "ethers";
import fs from "fs";

const RPC_URL = "https://testnet-rpc.monad.xyz";
const provider = new ethers.JsonRpcProvider(RPC_URL);

const ESCROW_ADDRESS = "0x925ea880cA53DE0352b84B24d0C0dee5B258015A";
const REGISTRY_ADDRESS = "0xE1994e0dF7CD5A836be4b02AE2164A542418B819";
const TARGET_TX_ID = "0x961c70865bf6097eb16d1b3a19d90f950b2cdd789eda5554c93baba1de0954e1";

const STATE_NAMES = [
  'DRAFT (0)',
  'PROPOSED (1)',
  'NEGOTIATING (2)',
  'AGREED (3)',
  'FUNDED (4)',
  'IN_PROGRESS (5)',
  'EVIDENCE_SUBMITTED (6)',
  'VERIFICATION (7)',
  'DISPUTED (8)',
  'JUDGING (9)',
  'RESOLVED (10)',
  'SETTLED (11)',
  'REFUNDED (12)',
  'CANCELLED (13)'
];

const OUTCOME_NAMES = ['NONE (0)', 'PASS (1)', 'FAIL (2)', 'INCONCLUSIVE (3)'];

async function checkState() {
  const artifact = JSON.parse(fs.readFileSync("contracts/out/TrustMeshEscrow.sol/TrustMeshEscrow.json", "utf-8"));
  const escrow = new ethers.Contract(ESCROW_ADDRESS, artifact.abi, provider);

  const tx = await escrow.getTransaction(TARGET_TX_ID);
  const stateNum = Number(tx.state);
  const outcomeNum = Number(tx.verificationOutcome);
  const liabilities = await escrow.totalEscrowLiabilities();

  console.log(`\n======================================================`);
  console.log(`  VERIQOMESH LIVE ONCHAIN STATE CHECK: 0x961c...54e1`);
  console.log(`======================================================`);
  console.log(`TRANSACTION ID        : ${tx.transactionId}`);
  console.log(`BUYER                 : ${tx.buyer}`);
  console.log(`SELLER                : ${tx.seller}`);
  console.log(`DESIGNATED VERIFIER   : ${tx.verifier}`);
  console.log(`TOTAL AMOUNT          : ${ethers.formatEther(tx.totalAmount)} MON`);
  console.log(`CURRENT STATE         : ${STATE_NAMES[stateNum] || stateNum}`);
  console.log(`VERIFICATION OUTCOME  : ${OUTCOME_NAMES[outcomeNum] || outcomeNum}`);
  console.log(`EVIDENCE ROOT         : ${tx.evidenceRoot}`);
  console.log(`TERMS HASH            : ${tx.termsHash}`);
  console.log(`CREATED AT            : ${Number(tx.createdAt) > 0 ? new Date(Number(tx.createdAt) * 1000).toISOString() : 'None'}`);
  console.log(`FUNDED AT             : ${Number(tx.fundedAt) > 0 ? new Date(Number(tx.fundedAt) * 1000).toISOString() : 'Not Yet Funded'}`);
  console.log(`SETTLED AT            : ${Number(tx.settledAt) > 0 ? new Date(Number(tx.settledAt) * 1000).toISOString() : 'Not Yet Settled'}`);
  console.log(`ESCROW LIABILITIES    : ${ethers.formatEther(liabilities)} MON`);
  console.log(`======================================================\n`);

  return { stateNum, outcomeNum, tx };
}

checkState().catch(console.error);
