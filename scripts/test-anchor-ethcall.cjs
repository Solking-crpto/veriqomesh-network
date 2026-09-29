/**
 * Test Canonical anchorEvidence eth_call against Monad Testnet RPC
 */
const { ethers } = require('ethers');
const { TRUSTMESH_ESCROW_ABI } = require('../packages/sdk/dist/abi.js');

const RPC_URL = 'https://testnet-rpc.monad.xyz';
const CHAIN_ID = 10143;
const ESCROW_ADDRESS = '0x925ea880cA53DE0352b84B24d0C0dee5B258015A';
const SELLER_ADDRESS = '0x0e73dBFf9047423b520FA9fc23a95645fC986Ee8';
const TARGET_TX_ID = '0xbbd0176291d62b32c3e096d0314c0fab6bcfa9131c1b26a825b3ce994e645f5e';

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL, CHAIN_ID, { staticNetwork: true });
  const escrowInterface = new ethers.Interface(TRUSTMESH_ESCROW_ABI);

  console.log('========================================================================');
  console.log('       INDEPENDENT SELECTOR DERIVATION FROM CANONICAL ABI');
  console.log('========================================================================');

  const fn4 = escrowInterface.getFunction('anchorEvidence(bytes32,bytes32,bytes32,bool)');
  const fn5 = escrowInterface.getFunction('anchorEvidence(bytes32,bytes32,bytes32,bytes32,bool)');

  console.log('Overload 1 (4-param):');
  console.log('  Signature : anchorEvidence(bytes32,bytes32,bytes32,bool)');
  console.log('  Selector  :', fn4.selector);
  console.log('  keccak256 :', ethers.id('anchorEvidence(bytes32,bytes32,bytes32,bool)').slice(0, 10));

  console.log('\nOverload 2 (5-param):');
  console.log('  Signature : anchorEvidence(bytes32,bytes32,bytes32,bytes32,bool)');
  console.log('  Selector  :', fn5.selector);
  console.log('  keccak256 :', ethers.id('anchorEvidence(bytes32,bytes32,bytes32,bytes32,bool)').slice(0, 10));

  // Prepare dummy evidence hashes
  const contentHash = ethers.keccak256(ethers.toUtf8Bytes('Carrier Bill of Lading #BOL-2026-9812 - 4 Pallets Tier 1 PV'));
  const metadataHash = ethers.keccak256(ethers.toUtf8Bytes('{"title":"Bill of Lading #BOL-2026-9812 (4 Pallets)"}'));
  const storageUriHash = ethers.keccak256(ethers.toUtf8Bytes('ipfs://bafybeic5...'));

  console.log('\n========================================================================');
  console.log('   READ-ONLY eth_call SIMULATION FOR OVERLOAD 1 (4-param)');
  console.log('========================================================================');
  const calldata4 = escrowInterface.encodeFunctionData('anchorEvidence(bytes32,bytes32,bytes32,bool)', [
    TARGET_TX_ID,
    contentHash,
    storageUriHash,
    false,
  ]);
  console.log('Calldata (4-param):', calldata4);

  try {
    const res4 = await provider.call({
      to: ESCROW_ADDRESS,
      from: SELLER_ADDRESS,
      data: calldata4,
    });
    console.log('✓ Overload 1 (4-param) eth_call SUCCEEDED! Result:', res4);
  } catch (err) {
    console.log('❌ Overload 1 (4-param) eth_call REVERTED!');
    console.log('Error message:', err.message);
    if (err.data) {
      try {
        const p = escrowInterface.parseError(err.data);
        console.log(`Parsed Error: ${p.name}(${p.args.join(', ')})`);
      } catch {}
    }
  }

  console.log('\n========================================================================');
  console.log('   READ-ONLY eth_call SIMULATION FOR OVERLOAD 2 (5-param)');
  console.log('========================================================================');
  const calldata5 = escrowInterface.encodeFunctionData('anchorEvidence(bytes32,bytes32,bytes32,bytes32,bool)', [
    TARGET_TX_ID,
    contentHash,
    metadataHash,
    storageUriHash,
    false,
  ]);
  console.log('Calldata (5-param):', calldata5);

  try {
    const res5 = await provider.call({
      to: ESCROW_ADDRESS,
      from: SELLER_ADDRESS,
      data: calldata5,
    });
    console.log('✓ Overload 2 (5-param) eth_call SUCCEEDED! Result:', res5);
  } catch (err) {
    console.log('❌ Overload 2 (5-param) eth_call REVERTED!');
    console.log('Error message:', err.message);
    if (err.data) {
      try {
        const p = escrowInterface.parseError(err.data);
        console.log(`Parsed Error: ${p.name}(${p.args.join(', ')})`);
      } catch {}
    }
  }
}

main().catch(console.error);
