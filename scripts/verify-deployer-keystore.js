import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { ethers } from 'ethers';

const EXPECTED_ADDRESS = ethers.getAddress('0x19539685BD5ceC58f00B3EfE8b76B2Cc48cb2B70');

async function promptPasswordInteractive(promptText = 'Enter Keystore Password: ') {
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

async function verifyKeystore() {
  console.log('================================================================');
  console.log('VERIQOMESH — DEPLOYER KEYSTORE UNLOCK & DERIVATION AUDIT');
  console.log('================================================================\n');

  const defaultKeystoreDir = path.join(
    process.env.USERPROFILE || process.env.HOME || '',
    '.foundry',
    'keystores',
  );
  const keystorePath = path.join(defaultKeystoreDir, 'monad-deployer');

  if (!fs.existsSync(keystorePath)) {
    console.error(`✗ FAIL: Keystore file not found at ${keystorePath}`);
    process.exit(1);
  }

  const stat = fs.statSync(keystorePath);
  console.log(`Keystore Path:     ${keystorePath}`);
  console.log(`Last Modified:     ${stat.mtime.toISOString()}`);

  const keystoreJson = JSON.parse(fs.readFileSync(keystorePath, 'utf8'));
  console.log(`Cipher:            ${keystoreJson.crypto?.cipher}`);
  console.log(`KDF:               ${keystoreJson.crypto?.kdf}`);

  console.log('\n[?] Prompting for new password to verify interactive decryption:');
  const password = await promptPasswordInteractive('Deployer Keystore Password: ');

  try {
    const wallet = ethers.Wallet.fromEncryptedJsonSync(JSON.stringify(keystoreJson), password);
    const derived = ethers.getAddress(wallet.address);
    console.log(`\nDerived Address:   ${derived}`);
    console.log(`Expected Address:  ${EXPECTED_ADDRESS}`);

    if (derived === EXPECTED_ADDRESS) {
      console.log('\n✓ PASS: Keystore unlocked successfully and derived exact expected address!');
      console.log('Zero secrets were logged, persisted, or broadcast.\n');
    } else {
      console.error(`\n✗ FAIL: Derived address mismatch: ${derived} !== ${EXPECTED_ADDRESS}`);
      process.exit(1);
    }
  } catch (err) {
    console.error(`\n✗ FAIL: Keystore decryption failed: ${err.message}`);
    process.exit(1);
  }
}

verifyKeystore().catch(console.error);
