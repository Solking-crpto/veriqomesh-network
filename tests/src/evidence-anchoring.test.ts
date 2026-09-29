import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ethers } from 'ethers';
import {
  TrustMeshClient,
  hashEvidenceBytes,
  hashMetadata,
  canonicalizeJson,
} from '@trustmesh/sdk';
import type {
  ISignerProvider,
  TransactionRequest,
} from '@trustmesh/sdk/dist/abstractions/wallet.js';
import type {
  IStorageProvider,
  StorageUploadResult,
} from '@trustmesh/sdk/dist/abstractions/storage.js';

class MockSigner implements ISignerProvider {
  public lastTxRequest?: TransactionRequest;
  constructor(public address: string = '0x0e73dBFf9047423b520FA9fc23a95645fC986Ee8') {}
  async getAddress(): Promise<string> {
    return this.address;
  }
  async signMessage(): Promise<string> {
    return '0x1234';
  }
  async sendTransaction(tx: TransactionRequest): Promise<string> {
    this.lastTxRequest = tx;
    return '0x9999999999999999999999999999999999999999999999999999999999999999';
  }
  async getChainId(): Promise<number> {
    return 10143;
  }
}

class MockStorage implements IStorageProvider {
  public uploadCallCount = 0;
  async upload(data: Uint8Array | string): Promise<StorageUploadResult> {
    this.uploadCallCount++;
    return {
      uri: 'ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
      contentHash: ethers.id('mock-upload-hash'),
      sizeBytes: typeof data === 'string' ? data.length : data.byteLength,
      mimeType: 'text/plain',
    };
  }
  async download(): Promise<Uint8Array> {
    return new Uint8Array([1, 2, 3]);
  }
  computeHash(data: Uint8Array | string): string {
    const str = typeof data === 'string' ? data : Buffer.from(data).toString('utf-8');
    return ethers.keccak256(ethers.toUtf8Bytes(str));
  }
  async verifyIntegrity(): Promise<boolean> {
    return true;
  }
}

describe('Evidence Anchoring — In-Memory Hashing & Calldata Selector Invariants', () => {
  const dummyTxId = '0xbbd0176291d62b32c3e096d0314c0fab6bcfa9131c1b26a825b3ce994e645f5e';
  const escrowAddress = '0x925ea880cA53DE0352b84B24d0C0dee5B258015A';
  const rawPayload = 'Carrier Bill of Lading #BOL-2026-9812 - 4 Pallets Tier 1 PV';

  it('1. anchorEvidence succeeds WITHOUT a storage provider using deterministic hashing', async () => {
    const mockSigner = new MockSigner();
    const client = new TrustMeshClient({
      signer: mockSigner,
      escrowContractAddress: escrowAddress,
    });

    assert.equal(client.storage, undefined, 'Storage provider should be undefined');

    const result = await client.anchorEvidence({
      transactionId: dummyTxId,
      evidenceData: rawPayload,
      title: 'Bill of Lading #BOL-2026-9812 (4 Pallets)',
      metadata: { carrier: 'DHL Global Forwarding', pallets: 4 },
    });

    // Content hash must be deterministic SHA-256 of raw bytes
    const expectedContentHash = hashEvidenceBytes(rawPayload);
    assert.equal(result.contentHash, expectedContentHash);
    assert.equal(result.contentHash.length, 66);
    assert.ok(result.contentHash.startsWith('0x'));

    // Metadata hash must match canonical metadata hash
    const expectedMetaHash = hashMetadata({ carrier: 'DHL Global Forwarding', pallets: 4 });
    assert.equal(result.metadataHash, expectedMetaHash);

    // Storage URI should default to deterministic IPFS format
    assert.equal(result.storageUri, `ipfs://${expectedContentHash.slice(2)}`);

    // Storage URI hash must be valid bytes32 keccak256
    const expectedUriHash = ethers.keccak256(ethers.toUtf8Bytes(result.storageUri));
    assert.equal(result.storageUriHash, expectedUriHash);

    // Calldata selector must be exactly 0x7d63bade (5-param) and NOT 0xbedf318b (agreeTransaction)
    assert.ok(mockSigner.lastTxRequest);
    const data = mockSigner.lastTxRequest.data!;
    const selector = data.slice(0, 10).toLowerCase();
    assert.equal(selector, '0x7d63bade', 'Calldata selector must be 0x7d63bade');
    assert.notEqual(selector, '0xbedf318b', 'Calldata selector MUST NOT be agreeTransaction (0xbedf318b)');

    // Decode calldata with escrow interface and assert all parameters match
    const decoded = client.escrowInterface.decodeFunctionData(
      'anchorEvidence(bytes32,bytes32,bytes32,bytes32,bool)',
      data
    );
    assert.equal(decoded[0], dummyTxId);
    assert.equal(decoded[1], expectedContentHash);
    assert.equal(decoded[2], expectedMetaHash);
    assert.equal(decoded[3], expectedUriHash);
    assert.equal(decoded[4], false);

    // Client cache should retain record for getEvidence
    const cachedById = await client.getEvidence(result.evidenceId!);
    assert.equal(cachedById.contentHash, expectedContentHash);
    const cachedByHash = await client.getEvidence(expectedContentHash);
    assert.equal(cachedByHash.title, 'Bill of Lading #BOL-2026-9812 (4 Pallets)');
  });

  it('2. anchorEvidence WITH a storage provider invokes storage upload', async () => {
    const mockSigner = new MockSigner();
    const mockStorage = new MockStorage();
    const client = new TrustMeshClient({
      signer: mockSigner,
      storage: mockStorage,
      escrowContractAddress: escrowAddress,
    });

    const result = await client.anchorEvidence({
      transactionId: dummyTxId,
      evidenceData: rawPayload,
      title: 'Bill of Lading #BOL-2026-9812 (4 Pallets)',
    });

    assert.equal(mockStorage.uploadCallCount, 1, 'Storage upload should be invoked exactly once');
    assert.equal(result.storageUri, 'ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi');

    const data = mockSigner.lastTxRequest!.data!;
    assert.equal(data.slice(0, 10).toLowerCase(), '0x7d63bade');
  });

  it('3. anchorEvidence supports 4-param overload when useFourParamAnchor is true', async () => {
    const mockSigner = new MockSigner();
    const client = new TrustMeshClient({
      signer: mockSigner,
      escrowContractAddress: escrowAddress,
    });

    const result = await client.anchorEvidence({
      transactionId: dummyTxId,
      evidenceData: rawPayload,
      title: 'Bill of Lading #BOL-2026-9812 (4 Pallets)',
      useFourParamAnchor: true,
    });

    const data = mockSigner.lastTxRequest!.data!;
    const selector = data.slice(0, 10).toLowerCase();
    assert.equal(selector, '0x150987b4', 'Calldata selector must be 0x150987b4 for 4-param');
    assert.notEqual(selector, '0xbedf318b');

    const decoded = client.escrowInterface.decodeFunctionData(
      'anchorEvidence(bytes32,bytes32,bytes32,bool)',
      data
    );
    assert.equal(decoded[0], dummyTxId);
    assert.equal(decoded[1], result.contentHash);
    assert.equal(decoded[2], result.storageUriHash);
    assert.equal(decoded[3], false);
  });

  it('4. Hash determinism and key-ordering invariance', () => {
    const hash1 = hashEvidenceBytes(rawPayload);
    const hash2 = hashEvidenceBytes(rawPayload);
    assert.equal(hash1, hash2, 'Identical evidence bytes must produce identical contentHash');

    // Metadata canonicalization ignores property ordering
    const meta1 = { a: 1, b: 2, c: { x: 'test', y: 'foo' } };
    const meta2 = { b: 2, c: { y: 'foo', x: 'test' }, a: 1 };
    assert.equal(canonicalizeJson(meta1), canonicalizeJson(meta2));
    assert.equal(hashMetadata(meta1), hashMetadata(meta2));
  });

  it('5. createEvidence works in-memory without a storage provider', async () => {
    const mockSigner = new MockSigner();
    const client = new TrustMeshClient({
      signer: mockSigner,
      escrowContractAddress: escrowAddress,
    });

    const record = await client.createEvidence({
      transactionId: dummyTxId,
      evidenceType: 'BILL_OF_LADING',
      title: 'BOL Offline Test',
      payload: 'offline-evidence-payload',
    });

    assert.ok(record.evidenceId);
    assert.ok(record.storageReference.startsWith('ipfs://'));
    assert.equal(record.submitter, mockSigner.address);

    const fetched = await client.getEvidence(record.evidenceId);
    assert.equal(fetched.title, 'BOL Offline Test');
  });

  it('6. Explicit selector helper assertions', () => {
    const client = new TrustMeshClient({
      escrowContractAddress: escrowAddress,
    });

    assert.equal(
      client.getSelector('anchorEvidence(bytes32,bytes32,bytes32,bytes32,bool)'),
      '0x7d63bade'
    );
    assert.equal(
      client.getSelector('anchorEvidence(bytes32,bytes32,bytes32,bool)'),
      '0x150987b4'
    );
    assert.equal(
      client.getSelector('agreeTransaction(bytes32)'),
      '0xbedf318b'
    );
  });
});
