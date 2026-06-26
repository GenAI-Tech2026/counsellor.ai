/**
 * Local embedding model — `all-MiniLM-L6-v2`, the same model ChromaDB uses by
 * default (its built-in DefaultEmbeddingFunction). Runs fully on-device via
 * transformers.js (ONNX) — no API key, no network round-trips, no rate limits.
 *
 *   - 384-dimensional vectors (vs 768 for Gemini text-embedding-004)
 *   - mean pooling + L2 normalization → identical output to sentence-transformers
 *     / ChromaDB, so vectors are directly comparable with cosine similarity
 *   - batches hundreds of rows per second on CPU, which makes ingestion fast
 *
 * The SAME function is used at ingest time and query time so the query vector
 * lands in the same space as the stored vectors.
 *
 * Shared by both the Next.js app (lib/rag.js, lib/semantic-cache.js) and the
 * standalone Node ingestion script (scripts/ingest.mjs). Kept as `.mjs` so it
 * imports cleanly from both.
 */

import { pipeline, env } from '@xenova/transformers';

// Vector dimensionality of all-MiniLM-L6-v2. Must match the `vector(384)`
// column in supabase/schema.sql.
export const EMBED_DIM = 384;

const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';

// Cache the downloaded model weights on disk so we only fetch them once.
env.allowLocalModels = true;
env.useBrowserCache = false;
env.cacheDir = '/tmp';

// FORCE WebAssembly (WASM) backend instead of Node native (onnxruntime-node)
// Vercel Serverless functions crash when trying to load the native C++ bindings
// because Vercel's packager drops them. WASM runs safely in pure JS.
env.backends.onnx.wasm.numThreads = 1;

let _extractorPromise = null;

/** Lazily load (and cache) the feature-extraction pipeline. */
function getExtractor() {
  if (!_extractorPromise) {
    _extractorPromise = pipeline('feature-extraction', MODEL_ID);
  }
  return _extractorPromise;
}

/**
 * Embed a single string → number[384] (L2-normalized).
 */
export async function embedText(text) {
  const extractor = await getExtractor();
  const output = await extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

/**
 * Embed many strings in one forward pass → number[][] (each row 384-dim).
 * Far faster than awaiting one request per row, which is the whole point of
 * using a local model for ingestion.
 */
export async function embedBatch(texts) {
  if (texts.length === 0) return [];
  const extractor = await getExtractor();
  const output = await extractor(texts, { pooling: 'mean', normalize: true });

  const [rows, dim] = output.dims; // [texts.length, 384]
  const vectors = new Array(rows);
  for (let i = 0; i < rows; i++) {
    vectors[i] = Array.from(output.data.slice(i * dim, (i + 1) * dim));
  }
  return vectors;
}
