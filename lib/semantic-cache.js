/**
 * Exact-key response cache for deterministic answers.
 *
 * When the student's profile is fully known (exam + rank + category [+ gender]),
 * the grounded answer for a given message is deterministic — so we cache it by
 * (params + normalized message). A hit skips BOTH Gemini calls and retrieval.
 *
 * Storage: Upstash Redis when configured (shared across all serverless
 * instances, survives cold starts), otherwise a per-instance in-memory Map as a
 * dev/no-Redis fallback. No embedding is needed — the key is a content hash —
 * which also removes one local embedding from the request hot path.
 */

import { createHash } from 'node:crypto';
import { redisEnabled, redisGet, redisSetEx } from './redis.js';

const TTL_SEC = 60 * 60;     // 1 hour
const MAX_ENTRIES = 1000;    // in-memory fallback cap
const PREFIX = 'cache:resp:';

function normalize(msg) {
  return String(msg || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function keyFor(params, message) {
  const { exam, rank, category, gender } = params || {};
  const raw = `${exam ?? ''}|${rank ?? ''}|${category ?? ''}|${gender ?? ''}|${normalize(message)}`;
  return PREFIX + createHash('sha1').update(raw).digest('hex');
}

// ── In-memory fallback (per-instance) ──────────────────────────────────────
const _mem = new Map(); // key -> { response, expires }

function memGet(key) {
  const e = _mem.get(key);
  if (!e) return null;
  if (Date.now() > e.expires) { _mem.delete(key); return null; }
  return e.response;
}
function memSet(key, response) {
  if (_mem.size >= MAX_ENTRIES) {
    const oldest = _mem.keys().next().value; // Map preserves insertion order
    if (oldest !== undefined) _mem.delete(oldest);
  }
  _mem.set(key, { response, expires: Date.now() + TTL_SEC * 1000 });
}

/**
 * Look up a cached answer. Returns { hit: true, response } or { hit: false }.
 * @param {string} message - the raw user message
 * @param {object} params  - resolved params ({ exam, rank, category, gender })
 */
export async function checkCache(message, params) {
  const key = keyFor(params, message);
  if (redisEnabled()) {
    try {
      const hit = await redisGet(key);
      if (hit != null) return { hit: true, response: String(hit) };
      return { hit: false };
    } catch {
      // fall through to memory
    }
  }
  const memHit = memGet(key);
  return memHit != null ? { hit: true, response: memHit } : { hit: false };
}

/** Store an answer under its exact key. */
export async function storeCache(params, message, response) {
  const key = keyFor(params, message);
  if (redisEnabled()) {
    try { await redisSetEx(key, response, TTL_SEC); return; }
    catch { /* fall through to memory */ }
  }
  memSet(key, response);
}
