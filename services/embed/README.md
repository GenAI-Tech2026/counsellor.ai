# Embedding service

A tiny, always-warm HTTP service that runs the app's on-device embedding model
(`bge-small-en-v1.5`) out-of-process, so `/api/chat` doesn't pay the multi-second
ONNX cold-start on the request path.

## Why it doesn't change the bot's answers

It imports the app's **own** `lib/embeddings.mjs` and calls the same
`embedText()` — same model, same CLS pooling, same L2 normalize, same query
instruction. The vector it returns is therefore identical to the in-process path,
so retrieval (and every answer) is unchanged.

The app only calls the service when `EMBED_SERVICE_URL` is set, and **falls back
to its bundled model on any error** (`lib/rag.js` → `embedQueryVector`). So the
service is a performance optimisation, never a hard dependency, and turning it off
(unset the env var) restores the exact previous behaviour.

## API

```
GET  /health   -> { ok, warm, dim }
POST /embed    { "text": "...", "query": true }  -> { "embedding": number[384], "dim": 384 }
```

Optional bearer auth: set `EMBED_SERVICE_TOKEN` on the service and the same value
on the app; the app sends `Authorization: Bearer <token>`.

## Run locally

```bash
# from the repo root (needs ./models on disk)
npm run embed:serve
curl -s localhost:8080/health
curl -s -X POST localhost:8080/embed -H 'content-type: application/json' \
  -d '{"text":"CSE cutoff at JNTU Kakinada","query":true}' | head -c 120
```

## Run with Docker (build context = repo root)

```bash
docker build -f services/embed/Dockerfile -t counsellor-embed .
docker run -p 8080:8080 counsellor-embed
```

Deploy that image to any always-on host (Fly.io, Railway, Render, Cloud Run with
min-instances=1). Give it ~512MB–1GB RAM.

## Rollout (safe order — no answer changes)

1. Deploy the service; confirm `GET /health` returns `{ "ok": true, "warm": true }`.
2. **Prove parity** before sending any prod traffic to it:
   ```bash
   EMBED_SERVICE_URL=https://your-embed-service npm run check:embed-parity
   ```
   It embeds sample queries locally and remotely and asserts the vectors match
   (max abs diff ≤ 1e-5). Only proceed if it prints `PARITY OK`.
3. Set `EMBED_SERVICE_URL` (and optionally `EMBED_SERVICE_TOKEN`) in the app's
   environment. Query embeds now go to the service; the Redis embedding cache
   still fronts it, and the bundled model still answers on any hiccup.
4. Monitor. If anything looks off, unset `EMBED_SERVICE_URL` — instant rollback to
   the in-process model.

## What NOT to remove yet

The on-device model, `maxDuration = 60`, and the `next.config.mjs` native-binary
tracing (onnxruntime `.so`, `outputFileTracingIncludes`, the sharp stub) are the
**fallback path**. Keep them until the service has run reliably in production for
a while. Only then, as a separate change, consider dropping them to slim the
function — and accept that doing so removes the fallback.

## Tuning knobs (app side)

| env | default | meaning |
| --- | --- | --- |
| `EMBED_SERVICE_URL` | _(unset)_ | base URL of this service; unset = in-process model |
| `EMBED_SERVICE_TIMEOUT_MS` | `2000` | fall back to local if the service is slower than this |
| `EMBED_SERVICE_TOKEN` | _(unset)_ | optional shared secret |
| `EMBED_SERVICE_DEBUG` | _(unset)_ | `1` logs a line whenever it falls back to local |
