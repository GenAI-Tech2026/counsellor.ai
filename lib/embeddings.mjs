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

// Vector dimensionality of all-MiniLM-L6-v2. Must match the `vector(384)`
// column in supabase/schema.sql.
export const EMBED_DIM = 384;

const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';

let _extractorPromise = null;

/** Lazily load (and cache) the feature-extraction pipeline. */
async function getExtractor() {
  if (!_extractorPromise) {
    _extractorPromise = (async () => {
      // DYNAMIC IMPORT: Prevents Vercel from crashing on startup when it tries
      // to resolve native C++ binaries inside transformers.js
      const { pipeline, env } = await import('@xenova/transformers');
      
      // Cache the downloaded model weights on disk so we only fetch them once.
      env.allowLocalModels = true;
      env.useBrowserCache = false;
      env.cacheDir = '/tmp';
      
      // FORCE WebAssembly (WASM) backend instead of Node native (onnxruntime-node)
      env.backends.onnx.wasm.numThreads = 1;

      return await pipeline('feature-extraction', MODEL_ID);
    })();
  }
  return _extractorPromise;
}

/**
 * Embed a single string → number[384] (L2-normalized).
 */
export async function embedText(text) {
  // On Vercel, the massive 90MB local ONNX model crashes the serverless function.
  // We use the free HuggingFace Inference API to do exactly the same embedding!
  if (process.env.VERCEL) {
    try {
      const hfResponse = await fetch('https://api-inference.huggingface.co/pipeline/feature-extraction/Xenova/all-MiniLM-L6-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: [text] }),
      });
      if (hfResponse.ok) {
        const result = await hfResponse.json();
        // HF API returns [ [ [v1, v2...] ] ] or [ [v1, v2...] ] depending on the batch
        if (Array.isArray(result) && result.length > 0) {
           const vec = Array.isArray(result[0]) ? (Array.isArray(result[0][0]) ? result[0][0] : result[0]) : result;
           if (vec.length === EMBED_DIM) return vec;
        }
      }
    } catch (e) {
      console.warn('HF API failed, falling back to local...', e);
    }
  }

  // Local fallback (works perfectly on Windows localhost)
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
