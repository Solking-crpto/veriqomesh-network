import { ethers } from "ethers";
import fs from "fs";

const RPC_URL = "https://testnet-rpc.monad.xyz";
const provider = new ethers.JsonRpcProvider(RPC_URL);

const ESCROW_ADDRESS = "0x925ea880cA53DE0352b84B24d0C0dee5B258015A";
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

async function watch() {
  const artifact = JSON.parse(fs.readFileSync("contracts/out/TrustMeshEscrow.sol/TrustMeshEscrow.json", "utf-8"));
  const escrow = new ethers.Contract(ESCROW_ADDRESS, artifact.abi, provider);

  const initialTx = await escrow.getTransaction(TARGET_TX_ID);
  const initialState = Number(initialTx.state);
  console.log(`[WATCHER] Active. Initial state: ${STATE_NAMES[initialState] || initialState}. Waiting for next state transition...`);

  let lastState = initialState;
  while (true) {
    try {
      const tx = await escrow.getTransaction(TARGET_TX_ID);
      const curState = Number(tx.state);
      if (curState !== lastState) {
        console.log(`\n======================================================`);
        console.log(`[✓] STATE TRANSITION DETECTED!`);
        console.log(`FROM: ${STATE_NAMES[lastState]}`);
        console.log(`TO  : ${STATE_NAMES[curState]}`);
        console.log(`VERIFICATION OUTCOME : ${Number(tx.verificationOutcome)}`);
        console.log(`EVIDENCE ROOT        : ${tx.evidenceRoot}`);
        console.log(`FUNDED AT            : ${Number(tx.fundedAt) > 0 ? new Date(Number(tx.fundedAt) * 1000).toISOString() : 'Not Yet'}`);
        console.log(`SETTLED AT           : ${Number(tx.settledAt) > 0 ? new Date(Number(tx.settledAt) * 1000).toISOString() : 'Not Yet'}`);
        console.log(`======================================================\n`);
        lastState = curState;
      }
    } catch (e) {
      // transient network glitch
    }
    await new Promise(r => setTimeout(r, 2000));
  }
}

watch().catch(console.error);
