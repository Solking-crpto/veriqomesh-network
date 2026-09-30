/**
 * Server-Side Upstash Redis Client
 * Connects exclusively via Vercel's provider-managed REST API credentials:
 * - KV_REST_API_URL
 * - KV_REST_API_TOKEN
 *
 * INVARIANT: Never import this file into client components ('use client').
 * INVARIANT: Never expose tokens or print secret values.
 */

function getCredentials() {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    throw new Error('Upstash Redis credentials (KV_REST_API_URL, KV_REST_API_TOKEN) are not configured.');
  }

  return { url, token };
}

export async function redisCommand<T = any>(command: (string | number)[]): Promise<T> {
  const { url, token } = getCredentials();

  const bodyStr = JSON.stringify(command);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: bodyStr,
    cache: 'no-store',
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Redis REST error (${res.status}): ${errorText}`);
  }

  const json = await res.json();
  if (json.error) {
    throw new Error(`Redis command error: ${json.error}`);
  }

  return json.result as T;
}

export async function redisPing(): Promise<boolean> {
  try {
    const result = await redisCommand<string>(['PING']);
    return result === 'PONG';
  } catch {
    return false;
  }
}

export async function redisGet<T = any>(key: string): Promise<T | null> {
  const raw = await redisCommand<string | null>(['GET', key]);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return raw as unknown as T;
  }
}

export async function redisSet(
  key: string,
  value: any,
  ttlSeconds: number = 30 * 86400 // Default 30-day TTL
): Promise<boolean> {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  const args: (string | number)[] = ['SET', key, serialized];
  if (ttlSeconds > 0) {
    args.push('EX', ttlSeconds);
  }
  const result = await redisCommand<string>(args);
  return result === 'OK';
}

export async function redisDel(key: string): Promise<boolean> {
  const count = await redisCommand<number>(['DEL', key]);
  return count > 0;
}

export async function redisSAdd(key: string, member: string): Promise<boolean> {
  const count = await redisCommand<number>(['SADD', key, member]);
  return count > 0;
}

export async function redisSMembers(key: string): Promise<string[]> {
  const members = await redisCommand<string[]>(['SMEMBERS', key]);
  return Array.isArray(members) ? members : [];
}

export async function redisSRem(key: string, member: string): Promise<boolean> {
  const count = await redisCommand<number>(['SREM', key, member]);
  return count > 0;
}
