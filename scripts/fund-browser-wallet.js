import { ethers } from 'ethers';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

/**
 * VeriqoMesh Network — Controlled Browser Wallet Funding Script
 * 
 * Safely transfers exactly 0.05 MON from the existing deployer account
 * (0x19539685BD5ceC58f00B3EfE8b76B2Cc48cb2B70)
 * to the connected browser wallet to pay for testnet gas.
 */

const EXPECTED_CHAIN_ID = 10143n;
const SENDER_ADDRESS = ethers.getAddress('0x19539685BD5ceC58f00B3EfE8b76B2Cc48cb2B70');
const FUNDING_AMOUNT = ethers.parseEther('0.05');
const RPC_URL = process.env.MONAD_TESTNET_RPC_URL || 'https://testnet-rpc.monad.xyz';

async function promptPasswordInteractive(promptText = 'Enter Deployer Keystore Password: ') {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    try {
      if (process.stdin.isTTY && typeof process.stdin.setRawMode === 'function') {
        process.stdout.write(promptText);
        const stdin = process.stdin;
        stdin.setRawMode(true);
        stdin.resume();
        let pwd = '';
        const onData = (buffer) => {
          const char = buffer.toString('utf8');
          if (char === '\n' || char === '\r' || char === '\u0004') {
            stdin.setRawMode(false);
            stdin.pause();
            stdin.removeListener('data', onData);
            process.stdout.write('\n');
            rl.close();
            resolve(pwd);
          } else if (char === '\u0003') {
            process.exit(1);
          } else if (char === '\b' || char === '\x7f') {
            if (pwd.length > 0) pwd = pwd.slice(0, -1);
          } else {
            pwd += char;
          }
        };
        stdin.on('data', onData);
      } else {
        rl.question(promptText, (ans) => {
          rl.close();
          resolve(ans);
        });
      }
    } catch {
      rl.question(promptText, (ans) => {
        rl.close();
        resolve(ans);
      });
    }
  });
}

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);

  // 1. Verify Network Invariant
  const network = await provider.getNetwork();
  if (network.chainId !== EXPECTED_CHAIN_ID) {
    throw new Error(`Chain ID mismatch: ${network.chainId} !== ${EXPECTED_CHAIN_ID}`);
  }

  // 2. Verify Sender Balance
  const senderBalancePre = await provider.getBalance(SENDER_ADDRESS);
  if (senderBalancePre < FUNDING_AMOUNT + ethers.parseEther('0.01')) {
    throw new Error(`Insufficient sender balance: ${ethers.formatEther(senderBalancePre)} MON`);
  }

  // 3. Parse and Validate Recipient Address
  const rawRecipient = process.argv[2]?.trim();
  if (!rawRecipient) {
    console.log('============================================================');
    console.log('VERIQOMESH NETWORK — MONAD TESTNET WALLET FUNDING PRE-FLIGHT');
    console.log('============================================================');
    console.log(`Network:                 Monad Metropolis Testnet`);
    console.log(`Chain ID:                ${network.chainId}`);
    console.log(`RPC Endpoint:            ${RPC_URL}`);
    console.log(`Sender Public Address:   ${SENDER_ADDRESS}`);
    console.log(`Sender MON Balance:      ${ethers.formatEther(senderBalancePre)} MON`);
    console.log(`Planned Funding Amount:  ${ethers.formatEther(FUNDING_AMOUNT)} MON`);
    console.log('------------------------------------------------------------');
    console.log('[!] Missing Recipient Public Address.');
    console.log('To safely fund your connected browser wallet, provide its public address:');
    console.log('  node scripts/fund-browser-wallet.js <RECIPIENT_ADDRESS>');
    console.log('------------------------------------------------------------');
    process.exit(0);
  }

  let recipientAddress;
  try {
    recipientAddress = ethers.getAddress(rawRecipient);
  } catch (err) {
    throw new Error(`Invalid recipient EVM address: ${rawRecipient}`);
  }

  if (recipientAddress === SENDER_ADDRESS) {
    throw new Error('Recipient address cannot be the same as sender address');
  }
  if (recipientAddress === ethers.ZeroAddress) {
    throw new Error('Recipient address cannot be the zero address');
  }

  // 4. Locate and Unlock Keystore
  const defaultKeystoreDir = path.join(
    process.env.USERPROFILE || process.env.HOME || '',
    '.foundry',
    'keystores'
  );
  const keystorePath = path.join(defaultKeystoreDir, 'monad-deployer');
  if (!fs.existsSync(keystorePath)) {
    throw new Error(`Keystore file not found at: ${keystorePath}`);
  }

  const keystoreJson = JSON.parse(fs.readFileSync(keystorePath, 'utf8'));
  let password = process.env.DEPLOYER_PASSWORD || process.env.ETH_PASSWORD;
  if (!password) {
    password = await promptPasswordInteractive('Deployer Keystore Password: ');
  }

  const wallet = ethers.Wallet.fromEncryptedJsonSync(
    JSON.stringify(keystoreJson),
    password
  ).connect(provider);

  if (ethers.getAddress(wallet.address) !== SENDER_ADDRESS) {
    throw new Error(`Decrypted address mismatch: ${wallet.address} !== ${SENDER_ADDRESS}`);
  }

  // 5. Send Funding Transaction
  const recipientBalPre = await provider.getBalance(recipientAddress);
  const currentNonce = await provider.getTransactionCount(SENDER_ADDRESS, 'latest');

  const tx = await wallet.sendTransaction({
    to: recipientAddress,
    value: FUNDING_AMOUNT,
    nonce: currentNonce,
  });

  const receipt = await tx.wait(1);
  const recipientBalPost = await provider.getBalance(recipientAddress);

  // 6. Report strictly the requested fields
  console.log('============================================================');
  console.log('FUNDING TRANSACTION REPORT');
  console.log('============================================================');
  console.log(`sender public address:                ${SENDER_ADDRESS}`);
  console.log(`recipient public address:             ${recipientAddress}`);
  console.log(`amount sent:                          ${ethers.formatEther(FUNDING_AMOUNT)} MON`);
  console.log(`transaction hash:                     ${receipt.hash}`);
  console.log(`confirmation/status:                  ${receipt.status === 1 ? '1 (CONFIRMED / SUCCESS)' : '0 (FAILED)'}`);
  console.log(`recipient MON balance after funding:  ${ethers.formatEther(recipientBalPost)} MON`);
  console.log('============================================================');
}

main().catch((err) => {
  console.error(`ERROR: ${err.message}`);
  process.exit(1);
});
