/**
 * KCET (Karnataka CET) 2024 Engineering ingestion: XLSX → local
 * all-MiniLM-L6-v2 → Supabase.
 *
 * Source: public/data/kcet/KCET_2024_ENGG_AllRounds_CutOff.xlsx
 *   - 6 sheets: GEN Mock/R1/R2 and HK Mock/R1/R2 (HK = Hyderabad-Karnataka)
 *   - long format, one row per (college × branch × category code):
 *     College Code | College Name | Place | Branch Code | Branch Name |
 *     Category | Closing Rank
 *
 * We pivot long → WIDE: one chunk per (college × branch × round) holding every
 * category's closing rank as a metadata key (GM, 2AG, SCG, STH, …), so a single
 * retrieval surfaces the whole reservation picture. All rounds ingested.
 *
 * Usage:   node scripts/ingest-kcet.mjs
 * Prereqs: .env SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY; apply the
 *          *_create_kcet_2024.sql migration first.
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
const FILE = join(__dirname, '../public/data/kcet/KCET_2024_ENGG_AllRounds_CutOff.xlsx');

const EXAM = 'KCET';
const YEAR = 2024;
const STATE = 'Karnataka';
const TABLE = 'kcet_2024';

function norm(s) { return String(s ?? '').replace(/\s+/g, ' ').trim(); }
function toRank(v) {
  // Drop any fractional part BEFORE stripping separators. Some source cells are
  // strings like "1105820.0"; removing the dot first would append the "0" and
  // 10× the rank ("11058200"). split('.')[0] keeps only the integer portion.
  const n = parseInt(String(v).split('.')[0].replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Pivot one sheet's long rows into wide (college×branch) groups. */
function parseSheet(ws, sheetName) {
  const grid = xlsxUtils.sheet_to_json(ws, { header: 1, defval: '' });
  const headerIdx = grid.findIndex(r => norm(r[0]).toLowerCase() === 'college code');
  if (headerIdx === -1) return [];

  const region = sheetName.startsWith('HK') ? 'Hyderabad-Karnataka' : 'General';
  const groups = new Map(); // key -> record

  for (let i = headerIdx + 1; i < grid.length; i++) {
    const r = grid[i];
    const collegeCode = norm(r[0]);
    const branchCode  = norm(r[3]);
    const category    = norm(r[5]);
    const closing     = toRank(r[6]);
    if (!collegeCode || !branchCode || !category || !closing) continue;

    const key = `${collegeCode}|${branchCode}|${sheetName}`;
    let rec = groups.get(key);
    if (!rec) {
      rec = {
        round: sheetName,
        region,
        college_code: collegeCode,
        college_name: norm(r[1]),
        place: norm(r[2]),
        branch_code: branchCode,
        branch_name: norm(r[4]),
        ranks: {},
      };
      groups.set(key, rec);
    }
    // Keep the best (lowest) closing rank if a category repeats within a group.
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
    `KCET 2024 Engineering cut-off (${rec.round}, ${rec.region} stream).`,
    `College: ${rec.college_name} (Code: ${rec.college_code}), ${rec.place}.`,
    `Branch: ${rec.branch_name} (Code: ${rec.branch_code}).`,
    `Closing ranks by category — ${rankParts}.`,
  ].join(' ');
  return base + enrichChunk({
    college: rec.college_name, place: rec.place, branch: rec.branch_name,
  });
}

function chunkId(rec) {
  return `${rec.college_code}_${rec.branch_code}_${rec.round}`.replace(/\s+/g, '');
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
    console.log(`  ${sn}: ${recs.length} college-branch groups`);
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
        source: 'KCET 2024', exam: EXAM, year: YEAR, state: STATE,
        round: rec.round, region: rec.region,
        college_code: rec.college_code, college_name: rec.college_name, place: rec.place,
        branch_code: rec.branch_code, branch_name: rec.branch_name,
        ...rec.ranks, // each category code → numeric closing rank
      },
    }));

    const { error } = await supabase.from(TABLE).upsert(rows, { onConflict: 'chunk_id' });
    if (error) throw new Error(`Supabase upsert error: ${error.message}`);

    done += slice.length;
    process.stdout.write(`  ${done}/${records.length} stored\r`);
  }
  console.log(`\nIngestion complete. ${done}/${records.length} KCET records in Supabase.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
