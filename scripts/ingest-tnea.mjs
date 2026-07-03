/**
 * TNEA 2024 Engineering ingestion: XLSX → local bge-small-en-v1.5 → Supabase.
 *
 * Source: public/data/tnea/TNEA_MarkCutoffs_2021_2024.xlsx (sheet "Mark Cutoffs")
 *   long: Year | Stream | College Code | College Name | Branch Code |
 *         Branch Name | Category | Cutoff Mark
 *
 * Only the latest year (2024) is ingested. Pivoted WIDE: one chunk per
 * (college × branch × stream) holding every category's cut-off MARK as a metadata
 * key (OC, BC, BCM, MBC, MBCV, SC, SCA, ST, …).
 *
 * NOTE: MARK-based (out of 200) — HIGHER is BETTER, so eligibility inverts
 * (cut-off <= student's mark). Marks are fractional and stored as numbers.
 *
 * Usage:   node scripts/ingest-tnea.mjs   (npm run ingest:tnea)
 * Prereqs: .env keys; apply *_create_tnea_2024.sql first.
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
const FILE = join(__dirname, '../public/data/tnea/TNEA_MarkCutoffs_2021_2024.xlsx');

const EXAM = 'TNEA';
const YEAR = 2024;
const STATE = 'Tamil Nadu';
const TABLE = 'tnea_2024';

function norm(s) { return String(s ?? '').replace(/\s+/g, ' ').trim(); }
function toMark(v) {
  const n = parseFloat(String(v).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
}
function slug(s) { return norm(s).replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

function parseSheet(ws) {
  const grid = xlsxUtils.sheet_to_json(ws, { header: 1, defval: '' });
  const headerIdx = grid.findIndex(r => norm(r[0]).toLowerCase() === 'year');
  if (headerIdx === -1) return [];

  const groups = new Map();
  for (let i = headerIdx + 1; i < grid.length; i++) {
    const r = grid[i];
    const year = parseInt(String(r[0]).replace(/[^0-9]/g, ''), 10);
    if (year !== YEAR) continue;
    const stream      = norm(r[1]);
    const collegeCode = norm(r[2]);
    const branchCode  = norm(r[4]);
    const category    = norm(r[6]);
    const mark        = toMark(r[7]);
    if (!collegeCode || !branchCode || !category || !mark) continue;

    const kkey = `${collegeCode}|${branchCode}|${slug(stream)}`;
    let rec = groups.get(kkey);
    if (!rec) {
      rec = {
        stream,
        college_code: collegeCode,
        college_name: norm(r[3]),
        branch_code: branchCode,
        branch_name: norm(r[5]),
        marks: {},
      };
      groups.set(kkey, rec);
    }
    // Keep the LOWEST cut-off mark seen for a category (most inclusive).
    if (!rec.marks[category] || mark < rec.marks[category]) rec.marks[category] = mark;
  }
  return [...groups.values()];
}

function buildChunkText(rec) {
  const markParts = Object.entries(rec.marks)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([cat, mark]) => `${cat}: ${mark}`)
    .join(', ');
  const base = [
    `TNEA 2024 ${rec.stream} cut-off marks (out of 200).`,
    `College: ${rec.college_name} (Code: ${rec.college_code}).`,
    `Branch: ${rec.branch_name} (Code: ${rec.branch_code}).`,
    `Cut-off marks by category — ${markParts}.`,
  ].join(' ');
  return base + enrichChunk({ college: rec.college_name, branch: rec.branch_name });
}

function chunkId(rec) {
  return `${slug(rec.college_code)}_${slug(rec.branch_code)}_${slug(rec.stream)}`.slice(0, 480);
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) { console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env'); process.exit(1); }
  const supabase = createClient(url, key);

  const wb = readFile(FILE);
  const ws = wb.Sheets['Mark Cutoffs'] || wb.Sheets[wb.SheetNames[0]];
  let records = parseSheet(ws);
  console.log(`Total unique college-branch-stream groups (year ${YEAR}): ${records.length}`);

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
        source: 'TNEA 2024', exam: EXAM, year: YEAR, state: STATE,
        stream: rec.stream, college_code: rec.college_code, college_name: rec.college_name,
        branch_code: rec.branch_code, branch_name: rec.branch_name,
        ...rec.marks,
      },
    }));
    const { error } = await supabase.from(TABLE).upsert(rows, { onConflict: 'chunk_id' });
    if (error) throw new Error(`Supabase upsert error: ${error.message}`);
    done += slice.length;
    process.stdout.write(`  ${done}/${records.length} stored\r`);
  }
  console.log(`\nIngestion complete. ${done}/${records.length} TNEA records in Supabase.`);
}

main().catch(err => { console.error(err); process.exit(1); });
