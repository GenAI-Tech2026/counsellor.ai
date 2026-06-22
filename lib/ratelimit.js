// Persistent, Supabase-backed rate limiter for the chat API.
//
// Storage : Supabase table `rate_limits` (one row per bucket/window), bumped
//           atomically through the `increment_rate_limit` RPC. Survives server
//           restarts and is shared across instances — unlike the old in-memory
//           Map-based limiter.
// Window  : fixed 1-hour window, truncated to the top of the UTC hour.
// Limit   : caller-supplied per hour — MAX_PER_HOUR (20) for signed-in users,
//           GUEST_MAX_PER_HOUR (5) for signed-out visitors.
// Keying  : by user id when authenticated ("<uuid>"), otherwise by client IP
//           ("ip:<address>"). The caller decides which key + cap to pass.
//
// Writes use the SUPABASE_SERVICE_ROLE_KEY (server-only) so they bypass RLS.
// If Supabase is unreachable the limiter fails OPEN (allows the request) so an
// infra blip never takes down chat — the error is logged for visibility.

import { createClient } from '@supabase/supabase-js';

const HOUR_MS = 3_600_000;
const MAX_PER_HOUR = 20;       // signed-in users
const GUEST_MAX_PER_HOUR = 5;  // not signed in — tighter cap

let _supabase = null;
function getSupabase() {
  if (_supabase) return _supabase;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars are not set');
  _supabase = createClient(url, key, { auth: { persistSession: false } });
  return _supabase;
}

/**
 * Check (and consume) one unit of the hourly rate limit for `key`.
 *
 * @param {string} key - identity to limit on. Pass the authenticated user id
 *   when available, otherwise an IP-derived key like `ip:1.2.3.4`.
 * @param {number} [max=MAX_PER_HOUR] - allowed messages per hour for this caller
 *   (e.g. GUEST_MAX_PER_HOUR for signed-out visitors).
 * @returns {Promise<{ allowed: boolean, retryAfter?: number, remaining?: number }>}
 *   `retryAfter` is seconds until the current window resets (only when denied).
 */
export async function checkRateLimit(key, max = MAX_PER_HOUR) {
  const now = Date.now();
  // Start of the current fixed hour window (UTC).
  const windowStartMs = Math.floor(now / HOUR_MS) * HOUR_MS;
  const windowStart = new Date(windowStartMs).toISOString();
  const resetAtMs = windowStartMs + HOUR_MS;

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc('increment_rate_limit', {
      p_bucket_key: key,
      p_window_start: windowStart,
    });
    if (error) throw error;

    const count = typeof data === 'number' ? data : Number(data);

    if (count > max) {
      return {
        allowed: false,
        retryAfter: Math.ceil((resetAtMs - now) / 1000),
      };
    }

    return { allowed: true, remaining: Math.max(0, max - count) };
  } catch (err) {
    // Fail open: never block chat because the limiter backend is down.
    console.error('Rate limiter unavailable, allowing request:', err.message);
    return { allowed: true };
  }
}

export { MAX_PER_HOUR, GUEST_MAX_PER_HOUR };
