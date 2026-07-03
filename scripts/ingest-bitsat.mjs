/**
 * BITSAT 2025 (2025-26) ingestion: XLSX → local bge-small-en-v1.5 → Supabase.
 *
 * Source: public/data/bitsat/BITSAT_CutOffs_2017_2025.xlsx (sheet "2025-26")
 *   wide: Academic Year | Campus | Programme | Cut-off Score | Max Marks
 *
 * One chunk per (campus × programme). No reservation categories.
 *
 * NOTE: BITSAT-SCORE based — HIGHER is BETTER, so eligibility inverts
 * (cut-off <= student's score). Only the latest year (2025-26) is ingested.
 *
 * Usage:   node scripts/ingest-bitsat.mjs   (npm run ingest:bitsat)
 * Prereqs: .env keys; apply *_create_bitsat_2025.sql first.
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
const FILE = join(__dirname, '../public/data/bitsat/BITSAT_CutOffs_2017_2025.xlsx');

const EXAM = 'BITSAT';
const YEAR = 2025;
const STATE = 'All India';
const TABLE = 'bitsat_2025';
const SHEET = '2025-26';

function norm(s) { return String(s ?? '').replace(/\s+/g, ' ').trim(); }
function toScore(v) {
  const n = parseInt(String(v).split('.')[0].replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}
function slug(s) { return norm(s).replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

function parseSheet(ws) {
  // The year-specific "2025-26" sheet omits the leading Academic Year column, so
  // columns are: Campus(0) | Programme(1) | Cut-off Score(2) | Max Marks(3).
  const grid = xlsxUtils.sheet_to_json(ws, { header: 1, defval: '' });
  const headerIdx = grid.findIndex(r => norm(r[0]).toLowerCase() === 'campus');
  if (headerIdx === -1) return [];

  const recs = [];
  for (let i = headerIdx + 1; i < grid.length; i++) {
    const r = grid[i];
    const campus  = norm(r[0]);
    const program = norm(r[1]);
    const cutoff  = toScore(r[2]);
    if (!campus || !program || !cutoff) continue;
    recs.push({
      campus, program, cutoff_score: cutoff, max_marks: toScore(r[3]),
      academic_year: SHEET,
    });
  }
  return recs;
}

function buildChunkText(rec) {
  const base = [
    `BITSAT ${rec.academic_year || '2025-26'} cut-off score (out of ${rec.max_marks || 390}).`,
    `Campus: BITS ${rec.campus}.`,
    `Programme: ${rec.program}.`,
    `Closing cut-off score: ${rec.cutoff_score}.`,
  ].join(' ');
  return base + enrichChunk({ college: `BITS ${rec.campus}`, place: rec.campus, branch: rec.program });
}

function chunkId(rec) {
  return `${slug(rec.campus)}_${slug(rec.program)}`.slice(0, 480);
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) { console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env'); process.exit(1); }
  const supabase = createClient(url, key);

  const wb = readFile(FILE);
  const ws = wb.Sheets[SHEET] || wb.Sheets[wb.SheetNames[0]];
  console.log(`Ingesting sheet: ${SHEET}`);
  let records = parseSheet(ws);

  const seen = new Set();
  records = records.filter(r => {
    const id = chunkId(r);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  console.log(`Total unique campus-programme records: ${records.length}`);

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
        source: 'BITSAT 2025-26', exam: EXAM, year: YEAR, state: STATE,
        campus: rec.campus, program: rec.program,
        cutoff_score: rec.cutoff_score, max_marks: rec.max_marks,
      },
    }));
    const { error } = await supabase.from(TABLE).upsert(rows, { onConflict: 'chunk_id' });
    if (error) throw new Error(`Supabase upsert error: ${error.message}`);
    done += slice.length;
    process.stdout.write(`  ${done}/${records.length} stored\r`);
  }
  console.log(`\nIngestion complete. ${done}/${records.length} BITSAT records in Supabase.`);
}

main().catch(err => { console.error(err); process.exit(1); });
