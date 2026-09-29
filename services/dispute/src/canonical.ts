import { ethers } from 'ethers';

/**
 * Deterministically sorts object keys recursively for canonical JSON serialization.
 */
export function canonicalizeJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return '[' + value.map(canonicalizeJson).join(',') + ']';
  }

  const keys = Object.keys(value as Record<string, unknown>).sort();
  const pairs = keys.map((key) => {
    const val = (value as Record<string, unknown>)[key];
    return `${JSON.stringify(key)}:${canonicalizeJson(val)}`;
  });

  return '{' + pairs.join(',') + '}';
}

/**
 * Computes deterministic Keccak-256 hash of canonical JSON string.
 */
export function hashCanonicalJson(value: unknown): string {
  const canonical = canonicalizeJson(value);
  return ethers.keccak256(ethers.toUtf8Bytes(canonical));
}
