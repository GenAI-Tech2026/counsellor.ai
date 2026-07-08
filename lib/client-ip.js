/**
 * Best-effort TRUSTED client IP for rate-limit keying.
 *
 * Header order matters for security: a caller can put arbitrary values in
 * `x-forwarded-for` / `x-real-ip`, so we only lead with headers the platform
 * injects and overwrites.
 *
 *   1. `x-vercel-forwarded-for` — set by Vercel's edge; incoming `x-vercel-*`
 *      headers are stripped, so a client cannot spoof it. Preferred when present.
 *   2. `x-real-ip` — also set by Vercel (and many trusted reverse proxies). Kept
 *      as a fallback for non-Vercel hosts that populate it at a proxy you control.
 *   3. `x-forwarded-for` LAST hop — the closest-proxy address. The LEFTMOST XFF
 *      entry is client-CLAIMED and must never be trusted; the last hop is the
 *      weakest acceptable fallback.
 *
 * NOTE: if you deploy behind a proxy that is NOT Vercel (including the ngrok dev
 * tunnel), make sure that proxy overwrites these headers — otherwise IP-based
 * limits remain spoofable and guests can mint unlimited buckets.
 */
export function clientIp(req) {
  const vercel = req.headers.get('x-vercel-forwarded-for');
  if (vercel) return vercel.split(',')[0].trim();

  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();

  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const hops = xff.split(',').map((s) => s.trim()).filter(Boolean);
    if (hops.length) return hops[hops.length - 1];
  }
  return 'unknown';
}
