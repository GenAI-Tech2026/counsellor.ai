// Starts the Python ChromaDB server, bypassing the node_modules/.bin/chroma shim
// which doesn't support Windows x64.
const { spawn } = require('child_process');
const path = require('path');

const sep = process.platform === 'win32' ? ';' : ':';
const cleanPath = (process.env.PATH || '')
  .split(sep)
  .filter(p => !p.includes('node_modules'))
  .join(sep);

const chromaDir = path.resolve(__dirname, '../chroma_db');

const proc = spawn('chroma', ['run', '--path', chromaDir], {
  env: { ...process.env, PATH: cleanPath },
  stdio: 'inherit',
  shell: true,
});

proc.on('close', code => process.exit(code ?? 0));
