import { GoogleAICacheManager } from '@google/generative-ai/server';
import { SYSTEM_PROMPT } from './system-prompt';

// EXPLICIT CONTEXT CACHING for the conversational model's system prompt.
//
// The conversational path re-sends the full SYSTEM_PROMPT (~2.5k tokens) as
// `systemInstruction` on every turn it handles. Those input tokens are identical
// every time, so we cache them ONCE with Gemini's context cache and reuse the
// handle — cached input tokens are billed at a large discount vs. fresh ones.
//
// This ONLY touches the conversational fallback path (the minority of turns; most
// are served deterministically or from the answer cache). It is deliberately
// best-effort: if the cache can't be created (model below the minimum cacheable
// token count, transient API error, etc.) we return null and the caller falls
// back to the normal uncached model, so chat NEVER breaks because of caching.
//
// Cost note: cached content is billed per hour of STORAGE while it lives. With a
// 1h TTL that's one cheap idle-storage slot at a time, refreshed lazily only when
// a conversational turn actually arrives — never a growing pile of caches.

const apiKey = process.env.GEMINI_API_KEY;

// Fully-qualified model id — MUST match the model used to generate (route.js
// conversational path). A cache is bound to one model version.
const CONV_MODEL = 'models/gemini-3.1-flash-lite';
const TTL_SECONDS = 3600; // 1 hour
const REFRESH_BUFFER_MS = 60_000; // recreate 60s before our tracked expiry

let cachePromise = null; // Promise<CachedContent|null> — in-flight or resolved
let expiresAt = 0; // epoch ms after which `cachePromise` is considered stale

/**
 * Returns a live CachedContent handle for the system prompt, or null when
 * caching is unavailable. Cheap on the hot path: reuses a live cache and only
 * (re)creates one after the TTL lapses. A creation failure is remembered for the
 * TTL window too, so a model that rejects caching won't trigger a create-storm.
 */
async function getSystemPromptCache() {
  const now = Date.now();
  if (cachePromise && now < expiresAt - REFRESH_BUFFER_MS) return cachePromise;

  expiresAt = now + TTL_SECONDS * 1000;
  cachePromise = (async () => {
    const manager = new GoogleAICacheManager(apiKey);
    return manager.create({
      model: CONV_MODEL,
      systemInstruction: SYSTEM_PROMPT,
      ttlSeconds: TTL_SECONDS,
    });
  })().catch((err) => {
    // Most common reason: the prompt is below the model's minimum cacheable size.
    // Not fatal — the caller uses the uncached model. Logged once per TTL window.
    console.warn('[prompt-cache] disabled (using uncached system prompt):', err?.message || err);
    return null;
  });
  return cachePromise;
}

/**
 * Resolve the conversational model, preferring the system-prompt cache.
 * Falls back to a normal model carrying the inline system prompt when the cache
 * is unavailable, so behavior is identical either way — only the billing differs.
 *
 * @param {import('@google/generative-ai').GoogleGenerativeAI} genAI
 * @returns {Promise<import('@google/generative-ai').GenerativeModel>}
 */
export async function getConversationalModel(genAI) {
  const cache = await getSystemPromptCache();
  if (cache) {
    try {
      // Model + systemInstruction both come from the cache; don't repeat them.
      return genAI.getGenerativeModelFromCachedContent(cache);
    } catch (err) {
      console.warn('[prompt-cache] getModelFromCache failed, using uncached model:', err?.message || err);
    }
  }
  return genAI.getGenerativeModel({
    model: 'gemini-3.1-flash-lite',
    systemInstruction: SYSTEM_PROMPT,
  });
}
