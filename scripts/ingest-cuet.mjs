/**
 * CUET UG 2025 (DU / CSAS) ingestion: XLSX → local bge-small-en-v1.5 → Supabase.
 *
 * Source: public/data/cuet/DU_CSAS_UG_2025_CUET_CutOffs.xlsx
 *   sheets Round 1, Round 3, Spot Round — already WIDE:
 *     College | Programme | UR cut-off | OBC | SC | ST | EWS | PwBD
 *
 * One chunk per (college × programme × round). Each category's closing CUET score
 * stored as its own metadata key (ur, obc, sc, st, ews, pwbd).
 *
 * NOTE: CUET-SCORE based — HIGHER is BETTER, so eligibility inverts
 * (cut-off <= student's score). Scores are fractional and stored as numbers.
 *
 * Usage:   node scripts/ingest-cuet.mjs   (npm run ingest:cuet)
 * Prereqs: .env keys; apply *_create_cuet_du_2025.sql first.
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
const FILE = join(__dirname, '../public/data/cuet/DU_CSAS_UG_2025_CUET_CutOffs.xlsx');

const EXAM = 'CUET';
const YEAR = 2025;
const STATE = 'Delhi';
const TABLE = 'cuet_du_2025';

// WIDE layout (Round 1 / Round 3): column index → metadata key per category.
const CAT_COLS = [[2, 'ur'], [3, 'obc'], [4, 'sc'], [5, 'st'], [6, 'ews'], [7, 'pwbd']];
// LONG layout (Spot Round): a single Category column → the same metadata keys.
const CAT_KEY = { UR: 'ur', OBC: 'obc', SC: 'sc', ST: 'st', EWS: 'ews', PWBD: 'pwbd', PWD: 'pwbd' };

function norm(s) { return String(s ?? '').replace(/\s+/g, ' ').trim(); }
function toScore(v) {
  const n = parseFloat(String(v).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
}
function slug(s) { return norm(s).replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

function parseSheet(ws, sheetName) {
  const grid = xlsxUtils.sheet_to_json(ws, { header: 1, defval: '' });
  const headerIdx = grid.findIndex(r => norm(r[0]).toLowerCase() === 'college');
  if (headerIdx === -1) return [];

  // Round 1 / Round 3 are WIDE (a column per category); Spot Round is LONG
  // (College | Programme | Category | Cut-off Score). Detect via the header.
  const header = grid[headerIdx].map(c => norm(c).toLowerCase());
  const isLong = header.includes('category');

  const groups = new Map();
  for (let i = headerIdx + 1; i < grid.length; i++) {
    const r = grid[i];
    const college = norm(r[0]);
    const program = norm(r[1]);
    if (!college || !program) continue;

    const kkey = `${college}|${program}`;
    let rec = groups.get(kkey);
    if (!rec) { rec = { round: sheetName, college_name: college, program, scores: {} }; groups.set(kkey, rec); }

    if (isLong) {
      const catKey = CAT_KEY[norm(r[2]).toUpperCase().replace(/[^A-Z]/g, '')];
      const s = toScore(r[3]);
      if (catKey && s) rec.scores[catKey] = rec.scores[catKey] ? Math.max(rec.scores[catKey], s) : s;
    } else {
      for (const [idx, keyName] of CAT_COLS) {
        const s = toScore(r[idx]);
        if (s) rec.scores[keyName] = s;
      }
    }
  }
  // Drop programmes with no populated cut-off (e.g. all-blank Round 3 rows).
  return [...groups.values()].filter(rec => Object.keys(rec.scores).length > 0);
}

function buildChunkText(rec) {
  const scoreParts = Object.entries(rec.scores)
    .map(([cat, s]) => `${cat.toUpperCase()}: ${s}`)
    .join(', ');
  const base = [
    `CUET UG 2025 Delhi University (CSAS ${rec.round}) closing cut-off.`,
    `College: ${rec.college_name}.`,
    `Programme: ${rec.program}.`,
    `Closing CUET scores by category — ${scoreParts}.`,
  ].join(' ');
  return base + enrichChunk({ college: rec.college_name, branch: rec.program });
}

function chunkId(rec) {
  return `${slug(rec.college_name)}_${slug(rec.program)}_${slug(rec.round)}`.slice(0, 480);
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) { console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env'); process.exit(1); }
  const supabase = createClient(url, key);

  const wb = readFile(FILE);
  console.log(`Ingesting sheet(s): ${wb.SheetNames.join(', ')}`);

  let records = [];
  for (const sn of wb.SheetNames) {
    const recs = parseSheet(wb.Sheets[sn], sn);
    console.log(`  ${sn}: ${recs.length} college-programme rows`);
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
        source: 'CUET UG 2025 (DU CSAS)', exam: EXAM, year: YEAR, state: STATE,
        round: rec.round, college_name: rec.college_name, program: rec.program,
        ...rec.scores,
      },
    }));
    const { error } = await supabase.from(TABLE).upsert(rows, { onConflict: 'chunk_id' });
    if (error) throw new Error(`Supabase upsert error: ${error.message}`);
    done += slice.length;
    process.stdout.write(`  ${done}/${records.length} stored\r`);
  }
  console.log(`\nIngestion complete. ${done}/${records.length} CUET records in Supabase.`);
}

main().catch(err => { console.error(err); process.exit(1); });
