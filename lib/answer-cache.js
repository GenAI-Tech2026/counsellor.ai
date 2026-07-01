/**
 * Multi-tier answer cache for the chat API. Designed so a cache hit can NEVER
 * make the bot "spew BS": the grounded FACTS and the PRESENTATION are kept
 * separate, keys are parameter-scoped (never free-text alone), and any reshaped
 * prose passes a deterministic fact-check before it is served.
 *
 *  Tier 0  Query-embedding cache — already implemented in lib/rag.js (embedQuery).
 *  Tier 1  Retrieval-ROW cache — caches the real eligible-college rows keyed by
 *          {exam, category, gender, branch, rank-bucket, DATA_VERSION}. The
 *          deterministic formatter then re-classifies Safe/Borderline against the
 *          new user's EXACT rank. Rows are real DB data + pure-code formatting →
 *          zero hallucination risk. This is the big win (skips retrieval + the
 *          extraction LLM call) and gets cross-user hits because ranks cluster.
 *  Tier 2  Semantic Q&A cache — ONLY for rank-independent questions (advice /
 *          general info / smalltalk). A new question is embedded and matched by
 *          cosine against stored answers for the same exam; a hit (≥ threshold)
 *          is served. Optional LLM reshape is gated by verifyGrounded().
 *
 * Storage: Upstash Redis when configured (shared, survives cold starts), else a
 * per-instance in-memory Map fallback. Every key carries DATA_VERSION so a data
 * re-ingest auto-evicts stale cutoffs.
 */

import { createHash } from 'node:crypto';
import { redisEnabled, redisGet, redisSetEx } from './redis.js';
import { embedText } from './embeddings.mjs';

// Bump on every data ingest (or set CACHE_DATA_VERSION) so stale cutoffs evict.
export const DATA_VERSION = process.env.CACHE_DATA_VERSION || 'v1';

// Master switches (default ON; set to '0' to disable a tier).
const ENABLED = process.env.ANSWER_CACHE !== '0';
const SEMANTIC_ENABLED = ENABLED && process.env.ANSWER_CACHE_SEMANTIC !== '0';
// Reshape is OFF by default: verbatim reuse of a vetted answer can't add BS and
// it's also the only path that actually skips an LLM call. Turn on to let a
// cheap model adapt wording (still fact-checked by verifyGrounded()).
const RESHAPE_ENABLED = SEMANTIC_ENABLED && process.env.ANSWER_CACHE_RESHAPE === '1';

const ROW_TTL_SEC = 6 * 60 * 60;        // 6h — cutoffs are static within a cycle
const SEM_TTL_SEC = 24 * 60 * 60;       // 24h
const SEM_THRESHOLD = Number(process.env.ANSWER_CACHE_SIM || '0.93'); // cosine
const SEM_MAX_PER_EXAM = 200;           // capped FIFO list per exam
const ROW_PREFIX = 'ac:rows:';
const SEM_PREFIX = 'ac:sem:';

// ── Observability (Phase 3) ────────────────────────────────────────────────
const metrics = {
  tier1: { hit: 0, miss: 0, store: 0 },
  tier2: { hit: 0, miss: 0, store: 0, rejected: 0 },
};
export function cacheMetrics() {
  const t1 = metrics.tier1, t2 = metrics.tier2;
  const t1total = t1.hit + t1.miss, t2total = t2.hit + t2.miss;
  return {
    enabled: ENABLED, semantic: SEMANTIC_ENABLED, reshape: RESHAPE_ENABLED,
    dataVersion: DATA_VERSION,
    tier1: { ...t1, hitRate: t1total ? +(t1.hit / t1total).toFixed(3) : null },
    tier2: { ...t2, hitRate: t2total ? +(t2.hit / t2total).toFixed(3) : null,
             // High rejection ⇒ the reshape is unreliable; tighten or disable.
             rejectRate: t2.hit + t2.rejected ? +(t2.rejected / (t2.hit + t2.rejected)).toFixed(3) : null },
  };
}

// ── In-memory fallback (per-instance) ──────────────────────────────────────
const _mem = new Map(); // key -> { value, expires }
function memGet(key) {
  const e = _mem.get(key);
  if (!e) return null;
  if (Date.now() > e.expires) { _mem.delete(key); return null; }
  return e.value;
}
function memSet(key, value, ttlSec) {
  if (_mem.size >= 2000) { const k = _mem.keys().next().value; if (k !== undefined) _mem.delete(k); }
  _mem.set(key, { value, expires: Date.now() + ttlSec * 1000 });
}
async function kvGet(key) {
  if (redisEnabled()) { try { return await redisGet(key); } catch { /* fall through */ } }
  return memGet(key);
}
async function kvSet(key, value, ttlSec) {
  if (redisEnabled()) { try { await redisSetEx(key, value, ttlSec); return; } catch { /* fall through */ } }
  memSet(key, value, ttlSec);
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function sha1(s) { return createHash('sha1').update(String(s)).digest('hex'); }

// ~12% geometric rank buckets: within a bucket ranks vary ≤12%, so the eligible
// set is near-identical. `low` is the bucket's best (smallest) rank — used to
// widen retrieval so the cached rows are a SUPERSET for everyone in the bucket.
export function rankBucket(rank) {
  const r = Math.max(1, Math.floor(Number(rank) || 0));
  const idx = Math.floor(Math.log(r) / Math.log(1.12));
  const low = Math.max(1, Math.floor(Math.pow(1.12, idx)));
  return { id: idx, low };
}

// Stable signature for a branch preference (so "CSE" and "Computer Science"
// collapse to the same key). 'any' when no/empty preference.
const BRANCH_STOP = new Set(['and', 'the', 'engineering', 'branch', 'prefer', 'preferred']);
export function branchKey(branchPref) {
  const toks = (String(branchPref || '').toLowerCase().match(/[a-z]{3,}/g) || [])
    .filter((t) => !BRANCH_STOP.has(t));
  return toks.length ? [...new Set(toks)].sort().join('-') : 'any';
}

function cosine(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return -1;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  const d = Math.sqrt(na) * Math.sqrt(nb);
  return d ? dot / d : -1;
}

// ── Tier 1: retrieval-row cache ──────────────────────────────────────────────
export function rowCacheKey({ exam, category, gender, branchPref, rank }) {
  const b = rankBucket(rank);
  const raw = `${exam}|${category}|${gender || 'na'}|${branchKey(branchPref)}|${b.id}`;
  return ROW_PREFIX + DATA_VERSION + ':' + sha1(raw);
}

export async function getCachedRows(key) {
  if (!ENABLED || !key) return null;
  const raw = await kvGet(key);
  if (raw == null) { metrics.tier1.miss++; return null; }
  try {
    const rows = JSON.parse(raw);
    if (Array.isArray(rows)) { metrics.tier1.hit++; return rows; }
  } catch { /* corrupt entry — treat as miss */ }
  metrics.tier1.miss++;
  return null;
}

export async function setCachedRows(key, rows) {
  if (!ENABLED || !key || !Array.isArray(rows) || rows.length === 0) return;
  await kvSet(key, JSON.stringify(rows), ROW_TTL_SEC);
  metrics.tier1.store++;
}

// ── Tier 2: semantic Q&A cache (rank-independent questions only) ──────────────
// Symmetric sentence embedding (no retrieval instruction) so question↔question
// similarity is meaningful.
async function embedQuestion(message) {
  return embedText(String(message || '').toLowerCase().replace(/\s+/g, ' ').trim(), { query: false });
}

function semListKey(exam) {
  return SEM_PREFIX + DATA_VERSION + ':' + sha1(exam || 'general');
}

/**
 * @returns {Promise<{answer:string, score:number}|null>} best semantic match for
 *   `message` within the same exam scope, or null on miss/low-confidence.
 */
export async function semanticGet(exam, message) {
  if (!SEMANTIC_ENABLED) return null;
  let list;
  try { list = JSON.parse((await kvGet(semListKey(exam))) || '[]'); } catch { list = []; }
  if (!Array.isArray(list) || !list.length) { metrics.tier2.miss++; return null; }
  const e = await embedQuestion(message);
  let best = null, bestScore = -1;
  for (const item of list) {
    const s = cosine(e, item.e);
    if (s > bestScore) { bestScore = s; best = item; }
  }
  if (best && bestScore >= SEM_THRESHOLD) {
    metrics.tier2.hit++;
    return { answer: best.a, score: +bestScore.toFixed(3) };
  }
  metrics.tier2.miss++;
  return null;
}

export async function semanticStore(exam, message, answer) {
  if (!SEMANTIC_ENABLED) return;
  const ans = String(answer || '').trim();
  // Never cache errors / dead-ends / clarifying questions.
  if (ans.length < 40 || /something went wrong|please try again|could you|what is your|i need to know/i.test(ans)) return;
  let list;
  try { list = JSON.parse((await kvGet(semListKey(exam))) || '[]'); } catch { list = []; }
  if (!Array.isArray(list)) list = [];
  const e = await embedQuestion(message);
  list.push({ q: String(message).slice(0, 300), a: ans.slice(0, 4000), e });
  if (list.length > SEM_MAX_PER_EXAM) list = list.slice(list.length - SEM_MAX_PER_EXAM);
  await kvSet(semListKey(exam), JSON.stringify(list), SEM_TTL_SEC);
  metrics.tier2.store++;
}

/**
 * Anti-BS gate: every rank-like number in `answer` must appear in `sourceText`.
 * Catches a reshape (or stale cache) inventing a cutoff. Answers with no numbers
 * (pure definitions) pass — there's nothing factual to fabricate.
 * @returns {boolean} true = grounded / safe to serve.
 */
export function verifyGrounded(answer, sourceText) {
  const nums = String(answer || '').match(/\d[\d,]{1,}/g);
  if (!nums) return true;
  const src = String(sourceText || '').replace(/,/g, '');
  for (const n of nums) {
    const bare = n.replace(/,/g, '');
    if (bare.length < 3) continue; // ignore years / tiny counts
    if (!src.includes(bare)) return false;
  }
  return true;
}

export function countReject() { metrics.tier2.rejected++; }
export { RESHAPE_ENABLED, SEMANTIC_ENABLED, ENABLED as CACHE_ENABLED };
