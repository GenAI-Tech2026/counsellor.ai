/**
 * Optional Upstash Redis (REST) client.
 *
 * Used for rate-limiting and caching WHEN configured. Everything degrades
 * gracefully: if the env vars are absent, or a call errors / times out, the
 * helpers return null and every caller falls back to its existing path
 * (Postgres rate-limit, in-memory cache, local embedding). This module never
 * throws on the request hot path.
 *
 * Configure by setting in .env:
 *   UPSTASH_REDIS_REST_URL=https://<your-db>.upstash.io
 *   UPSTASH_REDIS_REST_TOKEN=<rest-token>
 *
 * Uses the Upstash REST API directly via fetch (no SDK dependency), so it works
 * on both the Node and Edge runtimes.
 */

const REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const TIMEOUT_MS = 600; // never let Redis stall a request

export function redisEnabled() {
  return Boolean(REST_URL && REST_TOKEN);
}

async function post(path, body) {
  if (!redisEnabled()) return null;
  try {
    const res = await fetch(`${REST_URL}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REST_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null; // network / timeout / abort — caller falls back
  }
}

/** Run one Redis command, e.g. redisCmd(['GET','k']). Returns the result or null. */
export async function redisCmd(args) {
  const json = await post('', args);
  return json ? (json.result ?? null) : null;
}

/** Run a pipeline of commands. Returns an array of results, or null on failure. */
export async function redisPipeline(commands) {
  const json = await post('/pipeline', commands);
  if (!Array.isArray(json)) return null;
  return json.map(r => (r && typeof r === 'object' && 'result' in r ? r.result : null));
}

export async function redisGet(key) {
  return redisCmd(['GET', key]);
}

export async function redisSetEx(key, value, ttlSeconds) {
  return redisCmd(['SET', key, value, 'EX', String(ttlSeconds)]);
}

/**
 * Atomic fixed-window counter: INCR the key, then (re)set its TTL to the window
 * end. The key is window-scoped by the caller, so re-setting EXPIRE each hit is
 * idempotent. Returns the post-increment count, or null if Redis is unavailable.
 */
export async function redisIncrEx(key, ttlSeconds) {
  const results = await redisPipeline([
    ['INCR', key],
    ['EXPIRE', key, String(ttlSeconds)],
  ]);
  if (!results) return null;
  const count = Number(results[0]);
  return Number.isFinite(count) ? count : null;
}
