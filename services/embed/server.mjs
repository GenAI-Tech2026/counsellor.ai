/**
 * Standalone embedding microservice.
 *
 * WHY: The Next.js /api/chat function currently loads the on-device ONNX model
 * (`bge-small-en-v1.5`) in-process. On a cold serverless instance that load costs
 * multiple seconds and competes with the event loop. This service runs the model
 * once in a long-lived, always-warm container so the app can make a ~5ms HTTP
 * call instead.
 *
 * RESPONSE-SAFETY: it imports the app's OWN `lib/embeddings.mjs` and calls the
 * same `embedText()` — same model, same CLS pooling, same L2 normalize, same
 * query instruction. The returned vector is therefore bit-for-bit identical to
 * the in-process path, so retrieval and the bot's answers do not change. The app
 * only calls this when EMBED_SERVICE_URL is set and falls back to its bundled
 * model on any error (see lib/rag.js), so this is a pure performance optimisation,
 * never a hard dependency.
 *
 * Run it from the REPO ROOT so `process.cwd()` resolves ./models (the weights
 * lib/embeddings.mjs reads from disk):  `npm run embed:serve`  (or via Docker,
 * see ./Dockerfile which sets WORKDIR /app).
 *
 * Contract:
 *   GET  /health   -> { ok, warm, dim }
 *   POST /embed    { "text": "...", "query": true }  -> { "embedding": number[384], "dim": 384 }
 */
import http from 'node:http';
import { embedText, EMBED_DIM } from '../../lib/embeddings.mjs';

const PORT = Number(process.env.PORT) || 8080;
const TOKEN = process.env.EMBED_SERVICE_TOKEN || ''; // optional shared secret
const MAX_BODY = 64 * 1024; // 64 KB — queries are short strings

let warm = false;

function send(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'content-type': 'application/json',
    'content-length': Buffer.byteLength(body),
  });
  res.end(body);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new Error('request body too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch {
        reject(new Error('invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    return send(res, 200, { ok: true, warm, dim: EMBED_DIM });
  }

  if (req.method === 'POST' && req.url === '/embed') {
    if (TOKEN) {
      const auth = req.headers['authorization'] || '';
      if (auth !== `Bearer ${TOKEN}`) return send(res, 401, { error: 'unauthorized' });
    }
    let body;
    try {
      body = await readJson(req);
    } catch (e) {
      return send(res, 400, { error: e.message });
    }
    const text = body?.text;
    if (typeof text !== 'string' || !text.length) {
      return send(res, 400, { error: 'field "text" (non-empty string) is required' });
    }
    try {
      // query flag mirrors lib/embeddings.mjs — true prepends the bge retrieval
      // instruction. The app always sends query:true (it embeds search queries).
      const embedding = await embedText(text, { query: body?.query === true });
      return send(res, 200, { embedding, dim: embedding.length });
    } catch (e) {
      console.error('[embed] embedText failed:', e?.message);
      return send(res, 500, { error: 'embedding failed' });
    }
  }

  return send(res, 404, { error: 'not found' });
});

server.listen(PORT, async () => {
  console.log(`[embed] listening on :${PORT} (dim=${EMBED_DIM})`);
  // Warm the model at boot so the first real request doesn't pay the load cost.
  try {
    await embedText('warmup', { query: true });
    warm = true;
    console.log('[embed] model warm — ready');
  } catch (e) {
    console.error('[embed] warmup failed (will load lazily on first request):', e?.message);
  }
});
