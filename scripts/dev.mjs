/**
 * Dev launcher: starts the local "serverless cache" (Upstash-REST-compatible,
 * in-process) and THEN runs `next dev` pointed at it — so the answer-cache and
 * rate limiter use a real Redis-style cache locally with zero external setup.
 *
 * `npm run dev` → this. The Next child inherits UPSTASH_REDIS_REST_URL/TOKEN set
 * to the local cache, so lib/redis.js's redisEnabled() turns on automatically.
 * If the cache server can't start, we still launch Next (it degrades to the
 * in-memory fallback) so dev is never blocked.
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.LOCAL_CACHE_PORT || '8079';
const TOKEN = process.env.LOCAL_CACHE_TOKEN || 'local-dev-token';

const children = [];
function shutdown() {
  for (const c of children) { try { c.kill(); } catch {} }
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// 1) Start the local cache server.
const cache = spawn(process.execPath, [join(__dirname, 'local-cache-server.mjs')], {
  stdio: 'inherit',
  env: { ...process.env, LOCAL_CACHE_PORT: PORT, LOCAL_CACHE_TOKEN: TOKEN },
});
children.push(cache);
cache.on('error', (e) => console.error('[dev] local cache failed to start (continuing with in-memory):', e.message));

// 2) Start Next, pointing lib/redis.js at the local cache.
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const next = spawn(npmCmd, ['run', 'dev:plain'], {
  shell: process.platform === 'win32',
  stdio: 'inherit',
  env: {
    ...process.env,
    UPSTASH_REDIS_REST_URL: `http://127.0.0.1:${PORT}`,
    UPSTASH_REDIS_REST_TOKEN: TOKEN,
  },
});
children.push(next);
next.on('exit', (code) => { shutdown(); process.exitCode = code ?? 0; });
