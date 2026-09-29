/**
 * Storage Abstraction Layer
 * Supports IPFS, decentralized storage (Arweave/Filecoin), cloud object storage (S3),
 * and local encrypted stores without vendor lock-in.
 */

export interface StorageUploadResult {
  uri: string; // e.g., ipfs://bafy... or s3://...
  contentHash: string; // sha256 or keccak256 hash for onchain anchor
  sizeBytes: number;
  mimeType: string;
}

export interface IStorageProvider {
  /**
   * Upload arbitrary evidence or metadata buffer to storage
   */
  upload(data: Uint8Array | string, mimeType?: string): Promise<StorageUploadResult>;

  /**
   * Fetch data by URI reference
   */
  download(uri: string): Promise<Uint8Array>;

  /**
   * Compute deterministic cryptographic hash of content for onchain anchoring
   */
  computeHash(data: Uint8Array | string): string;

  /**
   * Verify whether the downloaded content matches the expected hash
   */
  verifyIntegrity(uri: string, expectedHash: string): Promise<boolean>;
}
