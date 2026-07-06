/**
 * Lightweight, additive request tracing for /api/chat.
 *
 * The route already collects stage timings in `marks` (extract / auth /
 * ratelimit / first_token / …). Historically those were printed as several ad-hoc
 * `console.log` lines only when CHAT_TIMING=1 — fine for eyeballing locally,
 * useless for computing p95/p99 across production traffic.
 *
 * `emitChatSpan` emits ONE structured JSON line per request instead. It is:
 *   - additive only — it never changes control flow, retrieval, or the response;
 *   - opt-in — a no-op unless CHAT_TIMING=1 or CHAT_TRACE=1, so prod logs are
 *     untouched until you want the data;
 *   - self-contained — it never throws (telemetry must not break a request).
 *
 * The line is prefixed `CHAT_SPAN ` so a log-based pipeline (Vercel log drains,
 * Datadog, Grafana Loki) can pattern-match and parse it into a span with
 * per-stage durations. To ship real OTLP spans later, forward these fields to an
 * OpenTelemetry exporter here — the call sites don't need to change.
 */
export function emitChatSpan(fields) {
  if (process.env.CHAT_TIMING !== '1' && process.env.CHAT_TRACE !== '1') return;
  try {
    // fields: { outcome, total, exam, intent, cache, marks: {...} }
    const { marks, ...rest } = fields || {};
    console.log('CHAT_SPAN ' + JSON.stringify({ t: 'chat', ...rest, ...(marks || {}) }));
  } catch {
    /* never throw from telemetry */
  }
}
