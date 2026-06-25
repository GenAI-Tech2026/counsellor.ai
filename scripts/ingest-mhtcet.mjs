/**
 * MHT-CET 2024 Engineering ingestion: XLSX → local all-MiniLM-L6-v2 → Supabase.
 *
 * Source: public/data/mhtcet/MHTCET_2024_ENGG_AllRounds_CutOff.xlsx
 *   - 3 sheets: CAP1, CAP2, CAP3 (each has a title-banner row above the header)
 *   - long format, one row per (college × branch × seat-type × category):
 *     College Code | College Name | Branch Code | Branch Name | Status |
 *     Seat Type | Stage | Category | Closing Rank (CET Merit No.) | Percentile
 *
 * We pivot long → WIDE: one chunk per (college × branch × round × seat_type)
 * holding every category's closing CET merit number as a metadata key (GOPENS,
 * GSCS, LOBCH, EWS, …). All CAP rounds ingested. The stored rank is the CET
 * merit number (lower = better, used like a rank for eligibility).
 *
 * Usage:   node scripts/ingest-mhtcet.mjs
 * Prereqs: .env SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY; apply the
 *          *_create_mhtcet_2024.sql migration first.
 */

import 'dotenv/config';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import pkg from 'xlsx';
const { readFile, utils: xlsxUtils } = pkg;
import { createClient } from '@supabase/supabase-js';
import { embedBatch } from '../lib/embeddings.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FILE = join(__dirname, '../public/data/mhtcet/MHTCET_2024_ENGG_AllRounds_CutOff.xlsx');

const EXAM = 'MHTCET';
const YEAR = 2024;
const STATE = 'Maharashtra';
const TABLE = 'mhtcet_2024';

function norm(s) { return String(s ?? '').replace(/\s+/g, ' ').trim(); }
function toRank(v) {
  const n = parseInt(String(v).replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}
function slug(s) { return norm(s).replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

/** Pivot one CAP sheet's long rows into wide (college×branch×seat_type) groups. */
function parseSheet(ws, sheetName) {
  const grid = xlsxUtils.sheet_to_json(ws, { header: 1, defval: '' });
  const headerIdx = grid.findIndex(r => norm(r[0]).toLowerCase() === 'college code');
  if (headerIdx === -1) return [];

  const groups = new Map();
  for (let i = headerIdx + 1; i < grid.length; i++) {
    const r = grid[i];
    const collegeCode = norm(r[0]);
    const branchCode  = norm(r[2]);
    const seatType    = norm(r[5]) || 'State Level';
    const category    = norm(r[7]);
    const closing     = toRank(r[8]);
    if (!collegeCode || !branchCode || !category || !closing) continue;

    const key = `${collegeCode}|${branchCode}|${sheetName}|${seatType}`;
    let rec = groups.get(key);
    if (!rec) {
      rec = {
        round: sheetName,
        seat_type: seatType,
        college_code: collegeCode,
        college_name: norm(r[1]),
        branch_code: branchCode,
        branch_name: norm(r[3]),
        status: norm(r[4]),
        ranks: {},
      };
      groups.set(key, rec);
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
  return [
    `MHT-CET 2024 Engineering cut-off (${rec.round}, ${rec.seat_type}).`,
    `College: ${rec.college_name} (Code: ${rec.college_code}). ${rec.status}.`,
    `Branch: ${rec.branch_name} (Code: ${rec.branch_code}).`,
    `Closing CET merit numbers by category — ${rankParts}.`,
  ].join(' ');
}

function chunkId(rec) {
  return `${rec.college_code}_${rec.branch_code}_${rec.round}_${slug(rec.seat_type)}`.slice(0, 480);
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
    console.log(`  ${sn}: ${recs.length} college-branch-seattype groups`);
    records = records.concat(recs);
  }

  // Deduplicate by chunk_id.
  const seen = new Set();
  records = records.filter(r => {
    const id = chunkId(r);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  console.log(`Total unique records: ${records.length}`);

  // Skip rows already present.
  const ids = records.map(chunkId);
  const existing = new Set();
  const PAGE = 1000;
  for (let i = 0; i < ids.length; i += PAGE) {
    const { data } = await supabase
      .from(TABLE)
      .select('chunk_id')
      .in('chunk_id', ids.slice(i, i + PAGE));
    (data || []).forEach(row => existing.add(row.chunk_id));
  }
  const pending = records.filter((_, i) => !existing.has(ids[i]));
  if (pending.length === 0) {
    console.log('All records already ingested. Nothing to do.');
    return;
  }
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
        source: 'MHTCET 2024', exam: EXAM, year: YEAR, state: STATE,
        round: rec.round, seat_type: rec.seat_type, status: rec.status,
        college_code: rec.college_code, college_name: rec.college_name,
        branch_code: rec.branch_code, branch_name: rec.branch_name,
        ...rec.ranks, // each category code → numeric closing CET merit number
      },
    }));

    const { error } = await supabase.from(TABLE).upsert(rows, { onConflict: 'chunk_id' });
    if (error) throw new Error(`Supabase upsert error: ${error.message}`);

    done += slice.length;
    process.stdout.write(`  ${done}/${records.length} stored\r`);
  }
  console.log(`\nIngestion complete. ${done}/${records.length} MHTCET records in Supabase.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
