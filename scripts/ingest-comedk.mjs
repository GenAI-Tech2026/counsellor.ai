/**
 * COMEDK 2024 Engineering ingestion: XLSX → local bge-small-en-v1.5 → Supabase.
 *
 * Source: public/data/comedk/COMEDK_Engineering_CutOffs_2023_2024.xlsx (sheet "2024")
 *   long: Year | College Code | College Name | Seat Category | Branch Code |
 *         Branch Name | Closing Rank
 *
 * Pivoted WIDE (same shape as kcet_2024): one chunk per (college × branch)
 * holding every seat category's closing rank as a metadata key (GM, KKR, SC, …).
 * Lower rank = better.
 *
 * Usage:   node scripts/ingest-comedk.mjs   (npm run ingest:comedk)
 * Prereqs: .env keys; apply *_create_comedk_2024.sql first.
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
const FILE = join(__dirname, '../public/data/comedk/COMEDK_Engineering_CutOffs_2023_2024.xlsx');

const EXAM = 'COMEDK';
const YEAR = 2024;
const STATE = 'Karnataka';
const TABLE = 'comedk_2024';
const SHEET = '2024';

function norm(s) { return String(s ?? '').replace(/\s+/g, ' ').trim(); }
function toRank(v) {
  const n = parseInt(String(v).split('.')[0].replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}
function slug(s) { return norm(s).replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

function parseSheet(ws) {
  // The year-specific "2024" sheet omits the leading Year column, so columns are:
  // College Code(0) | College Name(1) | Seat Category(2) | Branch Code(3) |
  // Branch Name(4) | Closing Rank(5).
  const grid = xlsxUtils.sheet_to_json(ws, { header: 1, defval: '' });
  const headerIdx = grid.findIndex(r => norm(r[0]).toLowerCase() === 'college code');
  if (headerIdx === -1) return [];

  const groups = new Map();
  for (let i = headerIdx + 1; i < grid.length; i++) {
    const r = grid[i];
    const collegeCode = norm(r[0]);
    const category    = norm(r[2]);
    const branchCode  = norm(r[3]);
    const closing     = toRank(r[5]);
    if (!collegeCode || !branchCode || !category || !closing) continue;

    const kkey = `${collegeCode}|${branchCode}`;
    let rec = groups.get(kkey);
    if (!rec) {
      rec = {
        college_code: collegeCode,
        college_name: norm(r[1]),
        branch_code: branchCode,
        branch_name: norm(r[4]),
        ranks: {},
      };
      groups.set(kkey, rec);
    }
    if (!rec.ranks[category] || closing < rec.ranks[category]) rec.ranks[category] = closing;
  }
  return [...groups.values()];
}

function buildChunkText(rec) {
  const rankParts = Object.entries(rec.ranks)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([cat, rank]) => `${cat}: ${rank}`)
    .join(', ');
  const base = [
    `COMEDK 2024 Engineering closing rank.`,
    `College: ${rec.college_name} (Code: ${rec.college_code}).`,
    `Branch: ${rec.branch_name} (Code: ${rec.branch_code}).`,
    `Closing ranks by seat category — ${rankParts}.`,
  ].join(' ');
  return base + enrichChunk({ college: rec.college_name, branch: rec.branch_name });
}

function chunkId(rec) {
  return `${slug(rec.college_code)}_${slug(rec.branch_code)}`.slice(0, 480);
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
  console.log(`Total unique college-branch groups: ${records.length}`);

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
        source: 'COMEDK 2024', exam: EXAM, year: YEAR, state: STATE,
        college_code: rec.college_code, college_name: rec.college_name,
        branch_code: rec.branch_code, branch_name: rec.branch_name,
        ...rec.ranks,
      },
    }));
    const { error } = await supabase.from(TABLE).upsert(rows, { onConflict: 'chunk_id' });
    if (error) throw new Error(`Supabase upsert error: ${error.message}`);
    done += slice.length;
    process.stdout.write(`  ${done}/${records.length} stored\r`);
  }
  console.log(`\nIngestion complete. ${done}/${records.length} COMEDK records in Supabase.`);
}

main().catch(err => { console.error(err); process.exit(1); });
