/**
 * Strict Verification Script for SDK Lifecycle Selectors
 * Compares compiled Solidity artifact methodIdentifiers,
 * canonical ethers.Interface selectors, and TrustMeshClient implementation.
 * Exits nonzero if any mismatch exists.
 */
const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

const ARTIFACT_PATH = path.resolve(__dirname, '../contracts/out/TrustMeshEscrow.sol/TrustMeshEscrow.json');
if (!fs.existsSync(ARTIFACT_PATH)) {
  console.error(`Artifact not found at ${ARTIFACT_PATH}`);
  process.exit(1);
}

const artifact = JSON.parse(fs.readFileSync(ARTIFACT_PATH, 'utf8'));
const compiledIdentifiers = artifact.methodIdentifiers;
const escrowInterface = new ethers.Interface(artifact.abi);

const REQUIRED_SIGNATURES = [
  'createTransaction(bytes32,address,address,uint256,uint64,bytes32)',
  'createTransactionWithVerifier(bytes32,address,address,address,uint256,uint64,bytes32)',
  'agreeTransaction(bytes32)',
  'fundEscrow(bytes32)',
  'startWork(bytes32)',
  'anchorEvidence(bytes32,bytes32,bytes32,bool)',
  'anchorEvidence(bytes32,bytes32,bytes32,bytes32,bool)',
  'requestVerification(bytes32)',
  'submitVerification(bytes32,uint8,bytes32)',
  'releaseEscrow(bytes32)',
  'refundTransaction(bytes32)',
  'openDispute(bytes32)',
  'resolveDispute(bytes32,uint16)',
  'setDisputeResolver(address)',
];

console.log('========================================================================');
console.log('     VERIQOMESH PROTOCOL - SMART CONTRACT SELECTOR AUDIT');
console.log('========================================================================\n');

let hasMismatch = false;

// Also test that TrustMeshClient can instantiate and encode calls with these signatures
const { TrustMeshClient } = require('../packages/sdk/dist/index.js');
const client = new TrustMeshClient({
  escrowContractAddress: '0x925ea880cA53DE0352b84B24d0C0dee5B258015A',
  rpcUrl: 'https://testnet-rpc.monad.xyz',
});

for (const sig of REQUIRED_SIGNATURES) {
  const expected4Bytes = compiledIdentifiers[sig];
  if (!expected4Bytes) {
    console.error(`❌ Signature not found in compiled contract artifact: ${sig}`);
    hasMismatch = true;
    continue;
  }
  const expectedSelector = '0x' + expected4Bytes.toLowerCase();

  // 1. Check ethers.id computation
  const computedSelector = ethers.id(sig).slice(0, 10).toLowerCase();

  // 2. Check Interface resolution
  const ifaceFn = escrowInterface.getFunction(sig);
  const ifaceSelector = ifaceFn ? ifaceFn.selector.toLowerCase() : null;

  // 3. Check client._getSelector (via internal reflection/call)
  const clientSelector = client._getSelector ? client._getSelector(sig).toLowerCase() : null;

  const matchCompiled = expectedSelector === computedSelector;
  const matchIface = expectedSelector === ifaceSelector;
  const matchClient = expectedSelector === clientSelector;

  console.log(`Signature: ${sig}`);
  console.log(`  Compiled Artifact : ${expectedSelector}`);
  console.log(`  Computed (keccak) : ${computedSelector} [${matchCompiled ? 'PASS' : 'FAIL'}]`);
  console.log(`  Interface Lookup  : ${ifaceSelector} [${matchIface ? 'PASS' : 'FAIL'}]`);
  console.log(`  SDK Client Return : ${clientSelector} [${matchClient ? 'PASS' : 'FAIL'}]`);

  if (!matchCompiled || !matchIface || !matchClient) {
    hasMismatch = true;
    console.error(`  ❌ MISMATCH DETECTED FOR: ${sig}`);
  } else {
    console.log(`  ✓ PERFECT MATCH`);
  }
  console.log('');
}

// In addition, verify that agreeTransaction calldata for the live transaction matches
const testTxId = '0xbbd0176291d62b32c3e096d0314c0fab6bcfa9131c1b26a825b3ce994e645f5e';
const agreeEncoded = client._encodeSingleIdCall('agreeTransaction(bytes32)', testTxId);
const expectedAgreeCalldata = '0xbedf318bbbd0176291d62b32c3e096d0314c0fab6bcfa9131c1b26a825b3ce994e645f5e';

console.log('Testing live agreeTransaction encoding for target txId:');
console.log(`  Produced: ${agreeEncoded}`);
console.log(`  Expected: ${expectedAgreeCalldata}`);
if (agreeEncoded.toLowerCase() !== expectedAgreeCalldata.toLowerCase()) {
  console.error('❌ agreeTransaction encoded calldata mismatch!');
  hasMismatch = true;
} else {
  console.log('✓ agreeTransaction calldata matches expected 0xbedf318b... exactly\n');
}

if (hasMismatch) {
  console.error('FAILED: One or more function selectors mismatched.');
  process.exit(1);
} else {
  console.log('SUCCESS: All 14 lifecycle function selectors match 100% across Artifact, keccak256, Interface, and SDK Client.');
  process.exit(0);
}
