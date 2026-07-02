/**
 * KEAM 2025 Engineering ingestion: XLSX → local bge-small-en-v1.5 → Supabase.
 *
 * Source: public/data/keam/KEAM_2025_ENGG_AllPhases_LastRank.xlsx
 *   sheets Phase 1, Phase 2 (one row per college×branch×category)
 *     Branch | College Code | College | College Type | Category | Last Rank
 *
 * Pivoted WIDE (same shape as kcet_2024): one chunk per (college × branch ×
 * phase) holding every category's last rank as a metadata key (SM, EZ, MU, …).
 * `round` = allotment phase. Lower rank = better.
 *
 * Usage:   node scripts/ingest-keam.mjs   (npm run ingest:keam)
 * Prereqs: .env keys; apply *_create_keam_2025.sql first.
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
const FILE = join(__dirname, '../public/data/keam/KEAM_2025_ENGG_AllPhases_LastRank.xlsx');

const EXAM = 'KEAM';
const YEAR = 2025;
const STATE = 'Kerala';
const TABLE = 'keam_2025';

function norm(s) { return String(s ?? '').replace(/\s+/g, ' ').trim(); }
function toRank(v) {
  const n = parseInt(String(v).split('.')[0].replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}
function slug(s) { return norm(s).replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

function parseSheet(ws, sheetName) {
  const grid = xlsxUtils.sheet_to_json(ws, { header: 1, defval: '' });
  const headerIdx = grid.findIndex(r => norm(r[0]).toLowerCase() === 'branch');
  if (headerIdx === -1) return [];

  const groups = new Map();
  for (let i = headerIdx + 1; i < grid.length; i++) {
    const r = grid[i];
    const branch      = norm(r[0]);
    const collegeCode = norm(r[1]);
    const category    = norm(r[4]);
    const lastRank    = toRank(r[5]);
    if (!branch || !collegeCode || !category || !lastRank) continue;

    const kkey = `${collegeCode}|${slug(branch)}|${sheetName}`;
    let rec = groups.get(kkey);
    if (!rec) {
      rec = {
        round: sheetName,
        college_code: collegeCode,
        college_name: norm(r[2]),
        college_type: norm(r[3]),
        branch_name: branch,
        ranks: {},
      };
      groups.set(kkey, rec);
    }
    if (!rec.ranks[category] || lastRank < rec.ranks[category]) rec.ranks[category] = lastRank;
  }
  return [...groups.values()];
}

function buildChunkText(rec) {
  const rankParts = Object.entries(rec.ranks)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([cat, rank]) => `${cat}: ${rank}`)
    .join(', ');
  const base = [
    `KEAM 2025 Engineering last rank (${rec.round}).`,
    `College: ${rec.college_name} (Code: ${rec.college_code}, ${rec.college_type}).`,
    `Branch: ${rec.branch_name}.`,
    `Last ranks by category — ${rankParts}.`,
  ].join(' ');
  return base + enrichChunk({ college: rec.college_name, branch: rec.branch_name });
}

function chunkId(rec) {
  return `${slug(rec.college_code)}_${slug(rec.branch_name)}_${slug(rec.round)}`.slice(0, 480);
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
    console.log(`  ${sn}: ${recs.length} college-branch groups`);
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
        source: 'KEAM 2025', exam: EXAM, year: YEAR, state: STATE,
        round: rec.round, college_code: rec.college_code, college_name: rec.college_name,
        college_type: rec.college_type, branch_name: rec.branch_name,
        ...rec.ranks,
      },
    }));
    const { error } = await supabase.from(TABLE).upsert(rows, { onConflict: 'chunk_id' });
    if (error) throw new Error(`Supabase upsert error: ${error.message}`);
    done += slice.length;
    process.stdout.write(`  ${done}/${records.length} stored\r`);
  }
  console.log(`\nIngestion complete. ${done}/${records.length} KEAM records in Supabase.`);
}

main().catch(err => { console.error(err); process.exit(1); });
