/**
 * Read-Only Monad Testnet Diagnosis for Failed agreeTransaction
 */
const { JsonRpcProvider, Contract, formatEther, Interface } = require('ethers');

const RPC_URL = 'https://testnet-rpc.monad.xyz';
const CHAIN_ID = 10143;
const FAILED_TX_HASH = '0xbb9f603aff4d98f91ddad0e79db433dd281d1849c4e17b9dfc8546f171ed412b';
const TARGET_TX_ID = '0xbbd0176291d62b32c3e096d0314c0fab6bcfa9131c1b26a825b3ce994e645f5e';
const ESCROW_ADDRESS = '0x925ea880cA53DE0352b84B24d0C0dee5B258015A';
const SELLER_ADDRESS = '0x0e73dBFf9047423b520FA9fc23a95645fC986Ee8';
const BUYER_ADDRESS = '0xa4bCC57d40311D715ECe34940191820d4a81C50F';

const ESCROW_ABI = [
  'function agreeTransaction(bytes32 transactionId) external',
  'function getTransaction(bytes32 transactionId) external view returns (tuple(bytes32 transactionId, address buyer, address seller, address verifier, address tokenAddress, uint256 totalAmount, uint8 state, uint8 verificationOutcome, uint64 agreementDeadline, uint64 fulfillmentDeadline, uint64 disputeDeadline, bytes32 termsHash, bytes32 evidenceRoot, uint64 createdAt, uint64 fundedAt, uint64 settledAt))',
  'function getTransactionState(bytes32 transactionId) external view returns (uint8)',
  'error UnauthorizedActor(address caller, string expectedRole)',
  'error InvalidStateTransition(uint8 current, uint8 target)',
  'error TransactionDoesNotExist(bytes32 transactionId)',
];

const STATE_NAMES = [
  'DRAFT', 'PROPOSED', 'NEGOTIATING', 'AGREED', 'FUNDED',
  'IN_PROGRESS', 'EVIDENCE_SUBMITTED', 'VERIFICATION', 'DISPUTED',
  'JUDGING', 'RESOLVED', 'SETTLED', 'REFUNDED', 'CANCELLED'
];

async function runDiagnosis() {
  const provider = new JsonRpcProvider(RPC_URL, CHAIN_ID);
  const escrow = new Contract(ESCROW_ADDRESS, ESCROW_ABI, provider);
  const escrowInterface = new Interface(ESCROW_ABI);

  console.log('=== 1 & 2. TX AND RECEIPT LOOKUP ===');
  const [tx, receipt] = await Promise.all([
    provider.getTransaction(FAILED_TX_HASH),
    provider.getTransactionReceipt(FAILED_TX_HASH),
  ]);

  if (!tx) {
    console.log('Transaction NOT FOUND on Monad RPC for hash:', FAILED_TX_HASH);
  } else {
    console.log('Transaction found:');
    console.log('  Hash:        ', tx.hash);
    console.log('  From:        ', tx.from);
    console.log('  To:          ', tx.to);
    console.log('  Nonce:       ', tx.nonce);
    console.log('  Gas Limit:   ', tx.gasLimit.toString());
    console.log('  Value:       ', formatEther(tx.value), 'MON');
    console.log('  Block Number:', tx.blockNumber);
    console.log('  Input:       ', tx.data);
  }

  if (!receipt) {
    console.log('Receipt: NOT MINED / NULL');
  } else {
    console.log('Receipt:');
    console.log('  Status:      ', receipt.status, receipt.status === 1 ? '(SUCCESS)' : '(REVERTED/FAILED)');
    console.log('  Block:       ', receipt.blockNumber);
    console.log('  Gas Used:    ', receipt.gasUsed.toString());
    console.log('  Logs count:  ', receipt.logs.length);
    console.log('  Logs:        ', JSON.stringify(receipt.logs, null, 2));
  }

  console.log('\n=== 4. CALLDATA DECODING ===');
  if (tx && tx.data) {
    try {
      const decoded = escrowInterface.parseTransaction({ data: tx.data, value: tx.value });
      if (decoded) {
        console.log('  Function:    ', decoded.name);
        console.log('  Signature:   ', decoded.signature);
        console.log('  Selector:    ', tx.data.slice(0, 10));
        console.log('  Argument[0]: ', decoded.args[0]);
        console.log('  Matches Target TxId:', decoded.args[0].toLowerCase() === TARGET_TX_ID.toLowerCase());
      }
    } catch (e) {
      console.log('  Failed to decode calldata:', e.message);
    }
  }

  console.log('\n=== 5 & 6. REVERT DIAGNOSIS & READ-ONLY eth_call FROM SELLER ===');
  // Run eth_call simulating agreeTransaction from the seller
  const calldata = escrowInterface.encodeFunctionData('agreeTransaction', [TARGET_TX_ID]);
  try {
    const callResult = await provider.call({
      to: ESCROW_ADDRESS,
      from: SELLER_ADDRESS,
      data: calldata,
    });
    console.log('eth_call from SELLER (' + SELLER_ADDRESS + ') SUCCEEDED!');
    console.log('Call result:', callResult);
  } catch (err) {
    console.log('eth_call from SELLER (' + SELLER_ADDRESS + ') REVERTED!');
    console.log('Error message:', err.message);
    if (err.data) {
      console.log('Raw revert data:', err.data);
      try {
        const parsedError = escrowInterface.parseError(err.data);
        console.log('Parsed custom error:', parsedError.name, parsedError.args);
      } catch (parseErr) {
        console.log('Could not parse error data with ABI');
      }
    }
  }

  // Also simulate eth_call from the ACTUAL sender of the failed tx if different
  if (tx && tx.from.toLowerCase() !== SELLER_ADDRESS.toLowerCase()) {
    console.log('\nSimulating eth_call from actual tx.from (' + tx.from + '):');
    try {
      const callResultFromActual = await provider.call({
        to: ESCROW_ADDRESS,
        from: tx.from,
        data: calldata,
      });
      console.log('eth_call from ' + tx.from + ' SUCCEEDED!');
    } catch (err) {
      console.log('eth_call from ' + tx.from + ' REVERTED!');
      console.log('Error message:', err.message);
      if (err.data) {
        console.log('Raw revert data:', err.data);
        try {
          const parsedError = escrowInterface.parseError(err.data);
          console.log('Parsed custom error:', parsedError.name, parsedError.args);
        } catch {
          // ignore
        }
      }
    }
  }

  console.log('\n=== 7 & 8. CURRENT ONCHAIN STATE ===');
  try {
    const [rawTx, stateIdx] = await Promise.all([
      escrow.getTransaction(TARGET_TX_ID),
      escrow.getTransactionState(TARGET_TX_ID),
    ]);
    console.log('Transaction details for', TARGET_TX_ID);
    console.log('  Buyer:       ', rawTx.buyer);
    console.log('  Seller:      ', rawTx.seller);
    console.log('  Verifier:    ', rawTx.verifier);
    console.log('  Total Amount:', formatEther(rawTx.totalAmount), 'MON');
    console.log('  Terms Hash:  ', rawTx.termsHash);
    console.log('  State Index: ', Number(stateIdx), '(' + (STATE_NAMES[Number(stateIdx)] || 'UNKNOWN') + ')');
    console.log('  Raw State:   ', Number(rawTx.state), '(' + (STATE_NAMES[Number(rawTx.state)] || 'UNKNOWN') + ')');
    console.log('  Funded At:   ', rawTx.fundedAt.toString());
    console.log('  Settled At:  ', rawTx.settledAt.toString());
  } catch (err) {
    console.log('Error reading transaction:', err.message);
  }

  console.log('\n=== 9. SELLER WALLET BALANCE & NONCE ===');
  const [balanceSeller, nonceSeller] = await Promise.all([
    provider.getBalance(SELLER_ADDRESS),
    provider.getTransactionCount(SELLER_ADDRESS, 'latest'),
  ]);
  console.log('Seller:', SELLER_ADDRESS);
  console.log('  MON Balance:', formatEther(balanceSeller), 'MON (', balanceSeller.toString(), 'wei )');
  console.log('  Nonce:      ', nonceSeller);

  console.log('\n=== 10. BUYER WALLET BALANCE & NONCE ===');
  const [balanceBuyer, nonceBuyer] = await Promise.all([
    provider.getBalance(BUYER_ADDRESS),
    provider.getTransactionCount(BUYER_ADDRESS, 'latest'),
  ]);
  console.log('Buyer:', BUYER_ADDRESS);
  console.log('  MON Balance:', formatEther(balanceBuyer), 'MON (', balanceBuyer.toString(), 'wei )');
  console.log('  Nonce:      ', nonceBuyer);
}

runDiagnosis().catch(console.error);
