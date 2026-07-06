/**
 * Embedding parity check — the go/no-go gate before pointing production at the
 * embedding microservice (services/embed/).
 *
 * It embeds a set of representative queries BOTH locally (the model bundled in
 * the app) and via the remote service, then asserts the two vectors are
 * effectively identical (max element-wise abs diff below EPS, cosine ~1.0). If
 * this passes, setting EMBED_SERVICE_URL cannot change retrieval — and therefore
 * cannot change the bot's answers. If it fails, DO NOT enable the service.
 *
 * Usage:
 *   EMBED_SERVICE_URL=https://your-embed-service node scripts/check-embed-parity.mjs
 *   # add EMBED_SERVICE_TOKEN=... if the service requires a bearer token
 *
 * Exit code 0 = parity OK, 1 = mismatch / error.
 */
import { embedText, EMBED_DIM } from '../lib/embeddings.mjs';

const URL = process.env.EMBED_SERVICE_URL;
const TOKEN = process.env.EMBED_SERVICE_TOKEN || '';
const EPS = Number(process.env.EMBED_PARITY_EPS) || 1e-5;

if (!URL) {
  console.error('Set EMBED_SERVICE_URL to the embedding service base URL first.');
  process.exit(1);
}

const SAMPLES = [
  'I got 15200 rank in TGEAPCET, category BC-B, male. Can I get CSE in Hyderabad?',
  'CSE cutoff at JNTU Kakinada',
  'best colleges for ECE with 45000 rank KCET general',
  'Can I get into IIT Bombay with 3000 rank JEE Advanced?',
  'affordable private engineering colleges in Maharashtra MHTCET',
];

async function remoteEmbed(text) {
  const headers = { 'content-type': 'application/json' };
  if (TOKEN) headers.authorization = `Bearer ${TOKEN}`;
  const res = await fetch(`${URL.replace(/\/$/, '')}/embed`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ text, query: true }),
  });
  if (!res.ok) throw new Error(`service HTTP ${res.status}`);
  const json = await res.json();
  if (!Array.isArray(json?.embedding) || json.embedding.length !== EMBED_DIM) {
    throw new Error('service returned a malformed vector');
  }
  return json.embedding;
}

function maxAbsDiff(a, b) {
  let m = 0;
  for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i] - b[i]));
  return m;
}

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

let worstDiff = 0;
let failed = false;

for (const text of SAMPLES) {
  const [local, remote] = await Promise.all([embedText(text, { query: true }), remoteEmbed(text)]);
  const diff = maxAbsDiff(local, remote);
  const cos = cosine(local, remote);
  worstDiff = Math.max(worstDiff, diff);
  const ok = diff <= EPS;
  if (!ok) failed = true;
  console.log(`${ok ? 'OK ' : 'FAIL'}  diff=${diff.toExponential(2)}  cos=${cos.toFixed(8)}  "${text.slice(0, 48)}..."`);
}

console.log(`\nWorst max-abs-diff: ${worstDiff.toExponential(3)} (threshold ${EPS.toExponential(0)})`);
if (failed) {
  console.error('PARITY FAILED — do NOT set EMBED_SERVICE_URL in production; vectors differ.');
  process.exit(1);
}
console.log('PARITY OK — remote vectors match local; enabling the service will not change answers.');
