/**
 * Local "serverless cache" — a tiny in-memory store that speaks the Upstash Redis
 * REST protocol, so lib/redis.js (and therefore the answer-cache + rate limiter)
 * can run against a real Redis-style cache in local dev with ZERO external setup.
 *
 * It implements just the commands the app uses: GET, SET (… EX ttl), INCR, EXPIRE,
 * DEL, plus a /pipeline endpoint. Data lives in memory for the life of this
 * process (shared across all requests, survives Next.js hot-reloads since it's a
 * separate process). Not durable — it's a cache.
 *
 * Started automatically by scripts/dev.mjs. Standalone:  node scripts/local-cache-server.mjs
 *   PORT (default 8079) and CACHE_TOKEN (default 'local-dev-token') are read from env.
 */

import { createServer } from 'node:http';

const PORT = Number(process.env.LOCAL_CACHE_PORT || 8079);
const TOKEN = process.env.LOCAL_CACHE_TOKEN || 'local-dev-token';

const store = new Map(); // key -> { v: string, exp: number|null (epoch ms) }

function alive(e) {
  if (!e) return null;
  if (e.exp != null && Date.now() > e.exp) return null;
  return e;
}
// Periodic sweep so expired keys don't accumulate.
setInterval(() => {
  const now = Date.now();
  for (const [k, e] of store) if (e.exp != null && now > e.exp) store.delete(k);
}, 60_000).unref();

// Execute one Upstash-style command array, e.g. ['SET','k','v','EX','60'].
function run(cmd) {
  if (!Array.isArray(cmd) || !cmd.length) return { error: 'invalid command' };
  const op = String(cmd[0]).toUpperCase();
  const key = cmd[1];
  switch (op) {
    case 'GET': {
      const e = alive(store.get(key));
      return { result: e ? e.v : null };
    }
    case 'SET': {
      let exp = null;
      for (let i = 3; i < cmd.length - 1; i++) {
        const flag = String(cmd[i]).toUpperCase();
        if (flag === 'EX') exp = Date.now() + Number(cmd[i + 1]) * 1000;
        else if (flag === 'PX') exp = Date.now() + Number(cmd[i + 1]);
      }
      store.set(key, { v: String(cmd[2]), exp });
      return { result: 'OK' };
    }
    case 'INCR': {
      const e = alive(store.get(key));
      const n = (e ? Number(e.v) || 0 : 0) + 1;
      store.set(key, { v: String(n), exp: e ? e.exp : null });
      return { result: n };
    }
    case 'EXPIRE': {
      const e = alive(store.get(key));
      if (!e) return { result: 0 };
      e.exp = Date.now() + Number(cmd[2]) * 1000;
      store.set(key, e);
      return { result: 1 };
    }
    case 'DEL': {
      let removed = 0;
      for (let i = 1; i < cmd.length; i++) if (store.delete(cmd[i])) removed++;
      return { result: removed };
    }
    case 'PING':
      return { result: 'PONG' };
    default:
      return { error: `unsupported command: ${op}` };
  }
}

let _commands = 0; // observability: how many ops the app has sent us

const server = createServer((req, res) => {
  // Unauthenticated stats endpoint (dev-only) to confirm the app is using us.
  if (req.url === '/__stats') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ keys: store.size, commands: _commands }));
    return;
  }
  // Auth (lib/redis.js sends `Authorization: Bearer <token>`). Accept the dev token.
  const auth = req.headers['authorization'] || '';
  if (TOKEN && auth !== `Bearer ${TOKEN}`) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'unauthorized' }));
    return;
  }
  let body = '';
  req.on('data', (c) => { body += c; if (body.length > 5_000_000) req.destroy(); });
  req.on('end', () => {
    let payload;
    try { payload = body ? JSON.parse(body) : []; } catch { payload = []; }
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/pipeline') {
      const cmds = Array.isArray(payload) ? payload : [];
      _commands += cmds.length;
      res.end(JSON.stringify(cmds.map(run)));
    } else {
      _commands += 1;
      res.end(JSON.stringify(run(payload)));
    }
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[local-cache] serverless cache up on http://127.0.0.1:${PORT}`);
});
