import { GoogleGenerativeAI } from '@google/generative-ai';

const SIMILARITY_THRESHOLD = 0.95;
const TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_ENTRIES = 1000;

let _genAI = null;
function getGenAI() {
  if (!_genAI) _genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return _genAI;
}

async function embedText(text) {
  const model = getGenAI().getGenerativeModel({ model: 'text-embedding-004' });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// In-memory cache entries: { embedding, paramsKey, response, timestamp }
const _cache = [];

function evict() {
  const now = Date.now();
  let i = 0;
  while (i < _cache.length) {
    if (now - _cache[i].timestamp > TTL_MS) _cache.splice(i, 1);
    else i++;
  }
  if (_cache.length > MAX_ENTRIES) _cache.splice(0, _cache.length - MAX_ENTRIES);
}

function paramsKey({ rank, category, gender }) {
  return `${rank ?? ''}|${category ?? ''}|${gender ?? ''}`;
}

/**
 * Check the semantic cache for a prior similar query.
 * Returns { hit: true, response } on cache hit, or
 *         { hit: false, embedding } so caller can reuse the embedding for storeCache.
 */
export async function checkCache(queryText, params) {
  evict();
  const embedding = await embedText(queryText);
  const pKey = paramsKey(params);

  for (const entry of _cache) {
    if (entry.paramsKey !== pKey) continue;
    if (cosineSimilarity(embedding, entry.embedding) >= SIMILARITY_THRESHOLD) {
      return { hit: true, response: entry.response };
    }
  }

  return { hit: false, embedding };
}

export function storeCache(embedding, params, response) {
  _cache.push({ embedding, paramsKey: paramsKey(params), response, timestamp: Date.now() });
}
