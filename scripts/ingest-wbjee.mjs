/**
 * WBJEE 2025 Engineering ingestion: XLSX → local bge-small-en-v1.5 → Supabase.
 *
 * Source: public/data/wbjee/WBJEE_2025_ENGG_AllRounds_CutOff.xlsx
 *   - sheets Round1, Round2 (one row per institute×program×seat-type×quota×category)
 *     Institute | Program | Stream | Seat Type | Quota | Category |
 *     Opening Rank | Closing Rank
 *
 * Ingested LONG (same ORCR shape as JoSAA): one chunk per row holding that row's
 * opening/closing rank. Lower rank = better. All rounds ingested (`round` facet).
 *
 * Usage:   node scripts/ingest-wbjee.mjs   (npm run ingest:wbjee)
 * Prereqs: .env SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY; apply the
 *          *_create_wbjee_2025.sql migration first.
 */

import 'dotenv/config';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import pkg from 'xlsx';
const { readFile, utils: xlsxUtils } = pkg;
import { createClient } from '@supabase/supabase-js';
import { embedBatch } from '../lib/embeddings.mjs';
import { enrichChunk } from '../lib/text-enrich.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FILE = join(__dirname, '../public/data/wbjee/WBJEE_2025_ENGG_AllRounds_CutOff.xlsx');

const EXAM = 'WBJEE';
const YEAR = 2025;
const STATE = 'West Bengal';
const TABLE = 'wbjee_2025';

function norm(s) { return String(s ?? '').replace(/\s+/g, ' ').trim(); }
function toRank(v) {
  const n = parseInt(String(v).split('.')[0].replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}
function slug(s) { return norm(s).replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

function parseSheet(ws, sheetName) {
  const grid = xlsxUtils.sheet_to_json(ws, { header: 1, defval: '' });
  const headerIdx = grid.findIndex(r => norm(r[0]).toLowerCase() === 'institute');
  if (headerIdx === -1) return [];

  const recs = [];
  for (let i = headerIdx + 1; i < grid.length; i++) {
    const r = grid[i];
    const institute = norm(r[0]);
    const program   = norm(r[1]);
    const category  = norm(r[5]);
    const closing   = toRank(r[7]);
    if (!institute || !program || !category || !closing) continue;
    recs.push({
      round: sheetName,
      institute,
      program,
      stream: norm(r[2]),
      seat_type: norm(r[3]),
      quota: norm(r[4]),
      category,
      opening_rank: toRank(r[6]),
      closing_rank: closing,
    });
  }
  return recs;
}

function buildChunkText(rec) {
  const base = [
    `WBJEE 2025 Engineering cut-off (${rec.round}).`,
    `Institute: ${rec.institute}.`,
    `Program: ${rec.program}.`,
    `Quota: ${rec.quota} | Seat type: ${rec.seat_type} | Category: ${rec.category}.`,
    `Opening rank: ${rec.opening_rank}, Closing rank: ${rec.closing_rank}.`,
  ].join(' ');
  return base + enrichChunk({ college: rec.institute, branch: rec.program });
}

function chunkId(rec) {
  return `${slug(rec.institute)}_${slug(rec.program)}_${slug(rec.quota)}_${slug(rec.category)}_${rec.round}`.slice(0, 480);
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
  }
  const supabase = createClient(url, key);

  const wb = readFile(FILE);
  console.log(`Ingesting sheet(s): ${wb.SheetNames.join(', ')}`);

  let records = [];
  for (const sn of wb.SheetNames) {
    const recs = parseSheet(wb.Sheets[sn], sn);
    console.log(`  ${sn}: ${recs.length} rows`);
    records = records.concat(recs);
  }

  const seen = new Set();
  records = records.filter(r => {
    const id = chunkId(r);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  console.log(`Total unique records: ${records.length}`);

  const ids = records.map(chunkId);
  const existing = new Set();
  const PAGE = 1000;
  for (let i = 0; i < ids.length; i += PAGE) {
    const { data } = await supabase.from(TABLE).select('chunk_id').in('chunk_id', ids.slice(i, i + PAGE));
    (data || []).forEach(row => existing.add(row.chunk_id));
  }
  const pending = records.filter((_, i) => !existing.has(ids[i]));
  if (pending.length === 0) { console.log('All records already ingested. Nothing to do.'); return; }
  console.log(`Ingesting ${pending.length} new records (skipping ${existing.size} existing)...`);

  const BATCH = 64;
  let done = existing.size;
  for (let i = 0; i < pending.length; i += BATCH) {
    const slice = pending.slice(i, i + BATCH);
    const texts = slice.map(buildChunkText);
    const embeddings = await embedBatch(texts);
    const rows = slice.map((rec, j) => ({
      chunk_id: chunkId(rec),
      content: texts[j],
      embedding: embeddings[j],
      metadata: {
        source: 'WBJEE 2025', exam: EXAM, year: YEAR, state: STATE,
        round: rec.round, institute: rec.institute, program: rec.program,
        stream: rec.stream, seat_type: rec.seat_type, quota: rec.quota,
        category: rec.category, opening_rank: rec.opening_rank, closing_rank: rec.closing_rank,
      },
    }));
    const { error } = await supabase.from(TABLE).upsert(rows, { onConflict: 'chunk_id' });
    if (error) throw new Error(`Supabase upsert error: ${error.message}`);
    done += slice.length;
    process.stdout.write(`  ${done}/${records.length} stored\r`);
  }
  console.log(`\nIngestion complete. ${done}/${records.length} WBJEE records in Supabase.`);
}

main().catch(err => { console.error(err); process.exit(1); });
