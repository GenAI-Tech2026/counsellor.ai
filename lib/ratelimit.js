// In-memory sliding window rate limiter — 20 req/min and 100 req/hour per IP.
// Resets on server restart — fine for single-instance / dev.
// Swap for @upstash/ratelimit in multi-instance deployments.

const MINUTE_MS = 60_000;
const HOUR_MS   = 3_600_000;
const MAX_PER_MINUTE = 20;
const MAX_PER_HOUR   = 100;

const minuteStore = new Map(); // ip → { count, resetAt }
const hourStore   = new Map(); // ip → { count, resetAt }

export function checkRateLimit(ip) {
  const now = Date.now();

  // Per-minute window
  let min = minuteStore.get(ip);
  if (!min || now >= min.resetAt) min = { count: 0, resetAt: now + MINUTE_MS };
  if (min.count >= MAX_PER_MINUTE) {
    minuteStore.set(ip, min);
    return { allowed: false, retryAfter: Math.ceil((min.resetAt - now) / 1000) };
  }

  // Per-hour window
  let hr = hourStore.get(ip);
  if (!hr || now >= hr.resetAt) hr = { count: 0, resetAt: now + HOUR_MS };
  if (hr.count >= MAX_PER_HOUR) {
    hourStore.set(ip, hr);
    return { allowed: false, retryAfter: Math.ceil((hr.resetAt - now) / 1000) };
  }

  min.count++;
  hr.count++;
  minuteStore.set(ip, min);
  hourStore.set(ip, hr);
  return { allowed: true };
}
