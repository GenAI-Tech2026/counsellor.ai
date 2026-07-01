/**
 * Local embedding model — `bge-small-en-v1.5` (BAAI), run fully on-device via
 * transformers.js (ONNX). A stronger retrieval model than all-MiniLM-L6-v2
 * (notably higher MTEB retrieval scores) while staying **384-dimensional**, so
 * it drops into the existing `vector(384)` columns with no schema migration.
 *
 *   - 384-dim vectors (same as MiniLM) → no DB change needed
 *   - **CLS pooling + L2 normalization** (bge uses the [CLS] token, NOT mean
 *     pooling — this is required for the vectors to match the model's training)
 *   - **Asymmetric retrieval:** passages are embedded as-is; QUERIES are prefixed
 *     with a short instruction (`QUERY_INSTRUCTION`). bge-v1.5 works without it,
 *     but the instruction measurably improves short-query → passage matching,
 *     which is exactly our case ("CSE cutoff at JNTU Kakinada" → a data row).
 *
 * The SAME function + pooling is used at ingest time (passage mode) and query
 * time (query mode) so both land in the same vector space.
 *
 * NOTE: switching the model invalidates every previously stored vector — the
 * whole corpus must be re-ingested (see scripts/ingest*.mjs). Query-embedding
 * caches are keyed by model (see lib/rag.js) so stale MiniLM vectors are never
 * reused.
 *
 * Shared by both the Next.js app (lib/rag.js) and the standalone Node ingestion
 * scripts. Kept as `.mjs` so it imports cleanly from both.
 */

// Vector dimensionality of bge-small-en-v1.5. Must match the `vector(384)`
// column in supabase/schema.sql.
export const EMBED_DIM = 384;

const MODEL_ID = 'Xenova/bge-small-en-v1.5';

// bge uses the [CLS] token embedding (not mean pooling) — see model card.
const POOLING = 'cls';

// Short instruction prepended to QUERIES only (asymmetric retrieval). The
// recommended bge-v1.5 retrieval instruction; passages get no prefix.
export const QUERY_INSTRUCTION = 'Represent this sentence for searching relevant passages: ';

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

/** Prepend the retrieval instruction for query-side embeds (no-op for passages). */
function prep(text, query) {
  return query ? QUERY_INSTRUCTION + String(text ?? '') : String(text ?? '');
}

/**
 * Embed a single string → number[384] (L2-normalized).
 * @param {string} text
 * @param {object} [opts]
 * @param {boolean} [opts.query=false]  true for a search query (prepends the
 *   bge retrieval instruction); false for a stored passage.
 */
export async function embedText(text, { query = false } = {}) {
  const input = prep(text, query);

  // On Vercel, the local ONNX model is too heavy for the serverless function —
  // use the free HuggingFace Inference API for the SAME model instead.
  if (process.env.VERCEL) {
    try {
      const hfResponse = await fetch(`https://api-inference.huggingface.co/pipeline/feature-extraction/${MODEL_ID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: [input] }),
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
  const output = await extractor(input, { pooling: POOLING, normalize: true });
  return Array.from(output.data);
}

/**
 * Embed many strings in one forward pass → number[][] (each row 384-dim).
 * Far faster than awaiting one request per row, which is the whole point of
 * using a local model for ingestion. Passage mode by default.
 * @param {string[]} texts
 * @param {object} [opts]
 * @param {boolean} [opts.query=false]  true to embed each string as a query.
 */
export async function embedBatch(texts, { query = false } = {}) {
  if (texts.length === 0) return [];
  const inputs = texts.map((t) => prep(t, query));
  const extractor = await getExtractor();
  const output = await extractor(inputs, { pooling: POOLING, normalize: true });

  const [rows, dim] = output.dims; // [texts.length, 384]
  const vectors = new Array(rows);
  for (let i = 0; i < rows; i++) {
    vectors[i] = Array.from(output.data.slice(i * dim, (i + 1) * dim));
  }
  return vectors;
}
