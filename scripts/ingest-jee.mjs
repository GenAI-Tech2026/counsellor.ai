/**
 * JEE / JoSAA 2025 ingestion: XLSX → local all-MiniLM-L6-v2 embeddings → Supabase.
 *
 * Source: public/data/jeemains/JEE_JoSAA_2025_AllRounds_ORCR.xlsx
 *   - one sheet per round (Round1 … Round6_Final)
 *   - columns: Institute | Academic Program Name | Quota | Seat Type | Gender |
 *              Opening Rank | Closing Rank  (real header is on the 2nd row;
 *              the 1st row is a title banner)
 *
 * By default only the FINAL round is ingested — its closing ranks are the
 * definitive "last rank" for each seat, and skipping the intermediate rounds
 * avoids 6 near-duplicate chunks per program (better retrieval, faster ingest).
 * Set JEE_ROUNDS=all to ingest every round (adds a `round` facet to metadata).
 *
 * Usage:
 *   node scripts/ingest-jee.mjs            # final round only
 *   JEE_ROUNDS=all node scripts/ingest-jee.mjs
 *
 * Prerequisites (.env): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Apply supabase/migrations/*_create_jee_josaa_2025.sql first.
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
const FILE = join(__dirname, '../public/data/jeemains/JEE_JoSAA_2025_AllRounds_ORCR.xlsx');

// Structured facets stamped onto every chunk for cross-source filtering in
// lib/rag.js (see the chunk_metadata migration). JoSAA is a single all-India
// counselling process, so there is no per-state facet.
const EXAM = 'JEE';
const YEAR = 2025;
const STATE = 'All India';

const ROUND_LABEL = {
  Round1: 'Round 1', Round2: 'Round 2', Round3: 'Round 3',
  Round4: 'Round 4', Round5: 'Round 5', Round6_Final: 'Round 6 (Final)',
};

function instituteType(name) {
  const n = name.toLowerCase();
  if (n.includes('indian institute of technology')) return 'IIT';
  if (n.includes('national institute of technology')) return 'NIT';
  if (n.includes('indian institute of information technology')) return 'IIIT';
  if (n.includes('school of planning')) return 'SPA';
  return 'GFTI';
}

function toRank(v) {
  // Drop any fractional part BEFORE stripping separators. Some source cells are
  // strings like "1105820.0"; removing the dot first would append the "0" and
  // 10× the rank ("11058200"). split('.')[0] keeps only the integer portion.
  const n = parseInt(String(v).split('.')[0].replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
}

function normalize(s) {
  return String(s ?? '').replace(/\s+/g, ' ').trim();
}

/** Parse one round sheet into structured records. */
function parseSheet(ws, sheetName) {
  const grid = xlsxUtils.sheet_to_json(ws, { header: 1, defval: '' });
  const headerIdx = grid.findIndex(r => normalize(r[0]) === 'Institute');
  if (headerIdx === -1) return [];

  const round = ROUND_LABEL[sheetName] || sheetName;
  const records = [];

  for (let i = headerIdx + 1; i < grid.length; i++) {
    const r = grid[i];
    const institute = normalize(r[0]);
    if (!institute) continue;

    const program   = normalize(r[1]);
    const quota      = normalize(r[2]);
    const seatType   = normalize(r[3]);
    const gender     = normalize(r[4]);
    const openRank   = toRank(r[5]);
    const closeRank  = toRank(r[6]);
    if (!program || !closeRank) continue;

    records.push({
      round,
      institute,
      institute_type: instituteType(institute),
      program,
      quota,
      seat_type: seatType,
      gender,
      opening_rank: openRank,
      closing_rank: closeRank,
    });
  }
  return records;
}

function buildChunkText(rec) {
  const genderShort = rec.gender.startsWith('Female') ? 'Female-only' : 'Gender-Neutral';
  const base = [
    `JEE Main 2025 JoSAA seat allocation (${rec.round}).`,
    `Institute: ${rec.institute} (${rec.institute_type}).`,
    `Program: ${rec.program}.`,
    `Quota: ${rec.quota}. Seat type: ${rec.seat_type}. Gender: ${genderShort}.`,
    `Opening rank: ${rec.opening_rank}, Closing rank: ${rec.closing_rank}.`,
  ].join(' ');
  return base + enrichChunk({ college: rec.institute, branch: rec.program });
}

function chunkId(rec) {
  return [rec.round, rec.institute_type, rec.institute, rec.program, rec.quota, rec.seat_type, rec.gender]
    .join('|')
    .replace(/\s+/g, '_')
    .slice(0, 480);
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
  const allRounds = (process.env.JEE_ROUNDS || '').toLowerCase() === 'all';
  const sheets = allRounds
    ? wb.SheetNames
    : wb.SheetNames.filter(s => /final/i.test(s) || /round6/i.test(s));

  if (sheets.length === 0) {
    console.error('No matching round sheet found. Sheets:', wb.SheetNames.join(', '));
    process.exit(1);
  }
  console.log(`Ingesting sheet(s): ${sheets.join(', ')}`);

  let records = [];
  for (const sn of sheets) {
    const recs = parseSheet(wb.Sheets[sn], sn);
    console.log(`  ${sn}: ${recs.length} records`);
    records = records.concat(recs);
  }

  // Deduplicate by chunk_id (idempotent re-runs).
  const seen = new Set();
  records = records.filter(r => {
    const id = chunkId(r);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  console.log(`Total unique records: ${records.length}`);

  // Sharding: each parallel worker handles a disjoint slice (by row index).
  // Launch N processes with JEE_SHARD=0..N-1 and JEE_SHARDS=N to use N cores.
  const shards = parseInt(process.env.JEE_SHARDS || '1', 10);
  const shard = parseInt(process.env.JEE_SHARD || '0', 10);
  if (shards > 1) {
    records = records.filter((_, i) => i % shards === shard);
    console.log(`[shard ${shard}/${shards}] handling ${records.length} records`);
  }

  // Skip rows already present.
  const ids = records.map(chunkId);
  const existing = new Set();
  const PAGE = 1000;
  for (let i = 0; i < ids.length; i += PAGE) {
    const { data } = await supabase
      .from('jee_josaa_2025')
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
      metadata: { source: 'JoSAA 2025', exam: EXAM, year: YEAR, state: STATE, ...rec },
    }));

    const { error } = await supabase.from('jee_josaa_2025').upsert(rows, { onConflict: 'chunk_id' });
    if (error) throw new Error(`Supabase upsert error: ${error.message}`);

    done += slice.length;
    process.stdout.write(`  ${done}/${records.length} stored\r`);
  }
  console.log(`\nIngestion complete. ${done}/${records.length} JEE/JoSAA records in Supabase.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
