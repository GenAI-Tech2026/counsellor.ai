/**
 * Ingestion pipeline: XLSX → local all-MiniLM-L6-v2 embeddings → Supabase pgvector
 *
 * Embeddings run on-device with the same model ChromaDB uses by default
 * (transformers.js, 384-dim) — no API key, no rate limits, fast batch embedding.
 *
 * Usage:
 *   node scripts/ingest.mjs
 *
 * Prerequisites:
 *   Set in .env:
 *     SUPABASE_URL=...
 *     SUPABASE_SERVICE_ROLE_KEY=...
 *
 * Apply the migrations in supabase/migrations/ (or run supabase/schema.sql) first.
 */

import 'dotenv/config';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pkg from 'xlsx';
const { readFile, utils: xlsxUtils } = pkg;
import { createClient } from '@supabase/supabase-js';
import { embedBatch } from '../lib/embeddings.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../public/data/tgeamcet');

// Structured facets stamped onto every chunk so the retriever can filter the
// corpus hard before similarity ranking (see lib/rag.js + the chunk_metadata
// migration). TGEAPCET is the Telangana engineering common entrance test.
const EXAM = 'TGEAPCET';
const YEAR = 2025;
const STATE = 'Telangana';

const HEADER_MAP = {
  'inst code': 'inst_code',
  'institute name': 'inst_name',
  'place': 'place',
  'dist code': 'dist_code',
  'co education': 'co_ed',
  'college type': 'col_type',
  'branch code': 'branch_code',
  'branch name': 'branch_name',
  'oc boys': 'oc_boys',   'oc girls': 'oc_girls',
  'bc_a boys': 'bca_boys', 'bc a boys': 'bca_boys',
  'bc_a girls': 'bca_girls', 'bc a girls': 'bca_girls',
  'bc_b boys': 'bcb_boys', 'bc b boys': 'bcb_boys',
  'bc_b girls': 'bcb_girls', 'bc b girls': 'bcb_girls',
  'bc_c boys': 'bcc_boys', 'bc c boys': 'bcc_boys',
  'bc_c girls': 'bcc_girls', 'bc c girls': 'bcc_girls',
  'bc_d boys': 'bcd_boys', 'bc d boys': 'bcd_boys',
  'bc_d girls': 'bcd_girls', 'bc d girls': 'bcd_girls',
  'bc_e boys': 'bce_boys', 'bc e boys': 'bce_boys',
  'bc_e girls': 'bce_girls', 'bc e girls': 'bce_girls',
  'sc_i boys': 'sc1_boys', 'sc i boys': 'sc1_boys', 'sc1 boys': 'sc1_boys',
  'sc_i girls': 'sc1_girls', 'sc i girls': 'sc1_girls', 'sc1 girls': 'sc1_girls',
  'sc_ii boys': 'sc2_boys', 'sc ii boys': 'sc2_boys', 'sc2 boys': 'sc2_boys',
  'sc_ii girls': 'sc2_girls', 'sc ii girls': 'sc2_girls', 'sc2 girls': 'sc2_girls',
  'sc_iii boys': 'sc3_boys', 'sc iii boys': 'sc3_boys', 'sc3 boys': 'sc3_boys',
  'sc_iii girls': 'sc3_girls', 'sc iii girls': 'sc3_girls', 'sc3 girls': 'sc3_girls',
  'st boys': 'st_boys',   'st girls': 'st_girls',
  'ews boys': 'ews_boys', 'ews girls': 'ews_girls',
  'affiliated to': 'affiliated',
};

const RANK_FIELDS = [
  'oc_boys','oc_girls','bca_boys','bca_girls','bcb_boys','bcb_girls',
  'bcc_boys','bcc_girls','bcd_boys','bcd_girls','bce_boys','bce_girls',
  'sc1_boys','sc1_girls','sc2_boys','sc2_girls','sc3_boys','sc3_girls',
  'st_boys','st_girls','ews_boys','ews_girls',
];

const RANK_LABELS = {
  oc_boys: 'OC Boys', oc_girls: 'OC Girls',
  bca_boys: 'BC-A Boys', bca_girls: 'BC-A Girls',
  bcb_boys: 'BC-B Boys', bcb_girls: 'BC-B Girls',
  bcc_boys: 'BC-C Boys', bcc_girls: 'BC-C Girls',
  bcd_boys: 'BC-D Boys', bcd_girls: 'BC-D Girls',
  bce_boys: 'BC-E Boys', bce_girls: 'BC-E Girls',
  sc1_boys: 'SC-I Boys', sc1_girls: 'SC-I Girls',
  sc2_boys: 'SC-II Boys', sc2_girls: 'SC-II Girls',
  sc3_boys: 'SC-III Boys', sc3_girls: 'SC-III Girls',
  st_boys: 'ST Boys', st_girls: 'ST Girls',
  ews_boys: 'EWS Boys', ews_girls: 'EWS Girls',
};

function phaseFromFilename(filename) {
  const f = filename.toLowerCase();
  if (f.includes('final')) return 'Final Phase';
  if (f.includes('second') || f.includes('2nd')) return 'Second Phase';
  if (f.includes('first') || f.includes('1st')) return 'First Phase';
  return 'Unknown Phase';
}

function normHeader(s) {
  return String(s ?? '').toLowerCase().replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Parse one TGEAPCET sheet into clean, row-by-row records.
 *
 * Reads the sheet as a raw 2-D grid (header:1) rather than trusting row 0 to be
 * the header — official statements sometimes prepend a title-banner row. We
 * locate the real header by finding the row whose first cell is "Inst Code",
 * map each header column to a canonical field, then emit ONE self-contained
 * record per data row with its columns kept intact (no merged-cell jumble).
 */
function parseXlsx(filepath, phase) {
  const wb = readFile(filepath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const grid = xlsxUtils.sheet_to_json(ws, { header: 1, defval: '' });

  if (grid.length === 0) throw new Error(`No rows in ${filepath}`);

  // Find the header row (skips any title-banner rows above it).
  const headerIdx = grid.findIndex(r => normHeader(r[0]) === 'inst code');
  if (headerIdx === -1) throw new Error(`Could not locate header row in ${filepath}`);

  // Map each column index → canonical field name.
  const headerRow = grid[headerIdx];
  const colMap = {}; // colIndex -> field
  headerRow.forEach((raw, idx) => {
    const mapped = HEADER_MAP[normHeader(raw)];
    if (mapped) colMap[idx] = mapped;
  });

  const records = [];
  for (let i = headerIdx + 1; i < grid.length; i++) {
    const row = grid[i];
    if (!row || row.length === 0) continue;

    const rec = { phase };
    for (const [idx, field] of Object.entries(colMap)) {
      const cell = row[idx];
      const val = String(cell ?? '').trim();
      if (RANK_FIELDS.includes(field)) {
        // A rank cell may arrive as a number or a string; '-' / '' means "no
        // allotment in this category".
        rec[field] = val && val !== '-' ? parseInt(val, 10) || 0 : 0;
      } else {
        rec[field] = val;
      }
    }
    // Drop blank/banner/summary rows: a real record has a clean institute code.
    if (!rec.inst_code || !/^[A-Z]{3,6}$/.test(rec.inst_code)) continue;
    records.push(rec);
  }
  return records;
}

function buildChunkText(rec) {
  const rankParts = RANK_FIELDS
    .filter(f => rec[f] > 0)
    .map(f => `${RANK_LABELS[f]}: ${rec[f]}`)
    .join(', ');

  return [
    `TGEAPCET 2025 ${rec.phase} — Last Rank Statement`,
    `College: ${rec.inst_name} (Code: ${rec.inst_code}), ${rec.place}, ${rec.dist_code}.`,
    `Type: ${rec.col_type || 'N/A'}, ${rec.co_ed || 'N/A'}. Affiliated to: ${rec.affiliated || 'N/A'}.`,
    `Branch: ${rec.branch_name} (Code: ${rec.branch_code}).`,
    `Last ranks by category — ${rankParts}.`,
  ].join(' ');
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. Find XLSX files
  const xlsxFiles = readdirSync(DATA_DIR).filter(f => /\.(xlsx|xls)$/i.test(f));
  if (xlsxFiles.length === 0) {
    console.error(`No XLSX files found in ${DATA_DIR}`);
    process.exit(1);
  }
  console.log(`Found ${xlsxFiles.length} XLSX file(s):`, xlsxFiles.join(', '));

  // 2. Parse all files
  let allRecords = [];
  for (const filename of xlsxFiles) {
    const phase = phaseFromFilename(filename);
    const records = parseXlsx(join(DATA_DIR, filename), phase);
    console.log(`  ${filename} (${phase}): ${records.length} records`);
    allRecords = allRecords.concat(records);
  }

  // 3. Deduplicate
  const seen = new Set();
  allRecords = allRecords.filter(r => {
    const id = `${r.inst_code}_${r.branch_code}_${r.phase.replace(/\s+/g, '')}`;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  console.log(`Total unique records: ${allRecords.length}`);

  // 4. Check which chunk_ids already exist
  const allChunkIds = allRecords.map(r =>
    `${r.inst_code}_${r.branch_code}_${r.phase.replace(/\s+/g, '')}`
  );

  const { data: existing } = await supabase
    .from('tgeapcet_2025')
    .select('chunk_id')
    .in('chunk_id', allChunkIds);

  const existingIds = new Set((existing || []).map(r => r.chunk_id));
  const pending = allRecords.filter((_, i) => !existingIds.has(allChunkIds[i]));

  if (pending.length === 0) {
    console.log('All records already ingested. Nothing to do.');
    return;
  }
  console.log(`Ingesting ${pending.length} new records (skipping ${existingIds.size} existing)...`);

  // 5. Embed and upsert in batches. Local model embeds the whole batch in one
  //    forward pass — much faster than one network request per row.
  const BATCH = 64;
  let done = existingIds.size;

  for (let i = 0; i < pending.length; i += BATCH) {
    const slice = pending.slice(i, i + BATCH);
    const texts = slice.map(buildChunkText);

    // Embed all texts in the batch locally (384-dim, all-MiniLM-L6-v2)
    const embeddings = await embedBatch(texts);

    const rows = slice.map((rec, j) => ({
      chunk_id: `${rec.inst_code}_${rec.branch_code}_${rec.phase.replace(/\s+/g, '')}`,
      content: texts[j],
      embedding: embeddings[j],
      metadata: {
        // Structured facets for cross-source filtering (exam/year/state).
        exam: EXAM, year: YEAR, state: STATE,
        phase: rec.phase, inst_code: rec.inst_code, inst_name: rec.inst_name,
        place: rec.place, dist_code: rec.dist_code, co_ed: rec.co_ed,
        col_type: rec.col_type, branch_code: rec.branch_code,
        branch_name: rec.branch_name, affiliated: rec.affiliated,
        ...Object.fromEntries(RANK_FIELDS.map(f => [f, rec[f] ?? 0])),
      },
    }));

    const { error } = await supabase.from('tgeapcet_2025').upsert(rows, { onConflict: 'chunk_id' });
    if (error) throw new Error(`Supabase upsert error: ${error.message}`);

    done += slice.length;
    process.stdout.write(`  ${done}/${allRecords.length} stored\r`);
  }

  console.log(`\nIngestion complete. ${done}/${allRecords.length} records in Supabase.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
