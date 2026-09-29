/**
 * Deterministic Cryptographic Hashing Utilities
 *
 * Enforces:
 * 1. contentHash = sha256(rawBytes) — identity of the exact evidence content.
 * 2. metadataHash = sha256(canonicalJson) — identity of structured metadata.
 * 3. storageReference is a retrieval location only, NOT the evidence identity.
 */

import { sha256, toUtf8Bytes } from 'ethers';

/**
 * Produces deterministic canonical JSON with recursively sorted keys
 */
export function canonicalizeJson(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return `[${obj.map((item) => canonicalizeJson(item)).join(',')}]`;
  }
  const sortedKeys = Object.keys(obj as Record<string, unknown>).sort();
  const pairs = sortedKeys.map(
    (key) => `${JSON.stringify(key)}:${canonicalizeJson((obj as Record<string, unknown>)[key])}`
  );
  return `{${pairs.join(',')}}`;
}

/**
 * Deterministic SHA-256 hash of raw evidence bytes
 * Returns 32-byte hex string (0x...)
 */
export function hashEvidenceBytes(data: Uint8Array | string): string {
  if (typeof data === 'string') {
    return sha256(toUtf8Bytes(data));
  }
  return sha256(data);
}

/**
 * Deterministic SHA-256 hash of canonicalized metadata
 * Returns 32-byte hex string (0x...)
 */
export function hashMetadata(metadata: Record<string, unknown>): string {
  const canonical = canonicalizeJson(metadata);
  return hashEvidenceBytes(canonical);
}
