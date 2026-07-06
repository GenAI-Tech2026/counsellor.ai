/**
 * Warm-up endpoint. A cheap band-aid for cold starts until the embedding service
 * (services/embed/) fully owns embedding in production.
 *
 * Ping it on a schedule (see vercel.json `crons`) to keep a serverless instance —
 * and the on-device fallback model — warm, so a real user request doesn't pay the
 * first-load cost. It performs NO retrieval and touches NO user data, so it can't
 * affect any chat response.
 *
 *   - EMBED_SERVICE_URL set  → checks the embedding service /health (keeps it warm)
 *   - otherwise              → runs one throwaway embed to load the bundled model
 */
import { embedText } from '@/lib/embeddings';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request) {
  // This endpoint does real work (an embed or an outbound fetch), so protect it
  // from being hammered. When CRON_SECRET is set, only callers presenting it may
  // trigger a warm-up — Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`
  // automatically. If CRON_SECRET is unset the route stays open (fine for local
  // dev); set it in production to lock warm-up to the scheduler.
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  const t0 = Date.now();
  const serviceUrl = process.env.EMBED_SERVICE_URL;

  try {
    if (serviceUrl) {
      const res = await fetch(`${serviceUrl.replace(/\/$/, '')}/health`, { method: 'GET' });
      const body = await res.json().catch(() => ({}));
      return Response.json({ ok: res.ok, mode: 'service', service: body, ms: Date.now() - t0 });
    }
    await embedText('warmup', { query: true });
    return Response.json({ ok: true, mode: 'local', ms: Date.now() - t0 });
  } catch (err) {
    return Response.json({ ok: false, error: String(err?.message || err), ms: Date.now() - t0 }, { status: 503 });
  }
}
