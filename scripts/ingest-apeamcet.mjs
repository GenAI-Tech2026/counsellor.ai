/**
 * APEAMCET (AP EAPCET) 2022 ingestion: XLSX → local all-MiniLM-L6-v2 → Supabase.
 *
 * Sources (public/data/apeamcet/, both single-sheet "LastRanks"):
 *   - APEAPCET 2022 Last Ranks - MPC Stream.xlsx
 *   - APEAPCET 2022 Last Ranks - Private Universities & State-Wide.xlsx
 * The two files have slightly different leading columns, so parsing is fully
 * header-driven (we map header text → canonical field, like ingest.mjs) — column
 * order differences are handled automatically. One chunk per (institute × branch
 * × local area) carries every reservation category's last rank.
 *
 * Usage:   node scripts/ingest-apeamcet.mjs
 * Prereqs: .env SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY; apply the
 *          *_create_apeamcet_2022.sql migration first.
 */

import 'dotenv/config';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pkg from 'xlsx';
const { readFile, utils: xlsxUtils } = pkg;
import { createClient } from '@supabase/supabase-js';
import { embedBatch } from '../lib/embeddings.mjs';
import { enrichChunk, expandUniversity } from '../lib/text-enrich.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../public/data/apeamcet');

const EXAM = 'APEAMCET';
const YEAR = 2022;
const STATE = 'Andhra Pradesh';
const TABLE = 'apeamcet_2022';

const HEADER_MAP = {
  'inst code': 'inst_code',
  'institute name': 'inst_name',
  'place': 'place',
  'type': 'inst_type',
  'region': 'region',
  'dist': 'dist',
  'college type': 'col_type',
  'affiliated to': 'affiliated',
  'estd': 'estd',
  'branch code': 'branch_code',
  'branch name': 'branch_name',
  'local area': 'local_area',
  'college fee': 'fee',
  'oc boys': 'oc_boys',   'oc girls': 'oc_girls',
  'sc boys': 'sc_boys',   'sc girls': 'sc_girls',
  'st boys': 'st_boys',   'st girls': 'st_girls',
  'bc_a boys': 'bca_boys', 'bc_a girls': 'bca_girls',
  'bc_b boys': 'bcb_boys', 'bc_b girls': 'bcb_girls',
  'bc_c boys': 'bcc_boys', 'bc_c girls': 'bcc_girls',
  'bc_d boys': 'bcd_boys', 'bc_d girls': 'bcd_girls',
  'bc_e boys': 'bce_boys', 'bc_e girls': 'bce_girls',
  'ews boys': 'ews_boys', 'ews girls': 'ews_girls',
};

const RANK_FIELDS = [
  'oc_boys','oc_girls','sc_boys','sc_girls','st_boys','st_girls',
  'bca_boys','bca_girls','bcb_boys','bcb_girls','bcc_boys','bcc_girls',
  'bcd_boys','bcd_girls','bce_boys','bce_girls','ews_boys','ews_girls',
];

const RANK_LABELS = {
  oc_boys: 'OC Boys', oc_girls: 'OC Girls',
  sc_boys: 'SC Boys', sc_girls: 'SC Girls',
  st_boys: 'ST Boys', st_girls: 'ST Girls',
  bca_boys: 'BC-A Boys', bca_girls: 'BC-A Girls',
  bcb_boys: 'BC-B Boys', bcb_girls: 'BC-B Girls',
  bcc_boys: 'BC-C Boys', bcc_girls: 'BC-C Girls',
  bcd_boys: 'BC-D Boys', bcd_girls: 'BC-D Girls',
  bce_boys: 'BC-E Boys', bce_girls: 'BC-E Girls',
  ews_boys: 'EWS Boys', ews_girls: 'EWS Girls',
};

function normHeader(s) {
  return String(s ?? '').toLowerCase().replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseXlsx(filepath) {
  const wb = readFile(filepath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const grid = xlsxUtils.sheet_to_json(ws, { header: 1, defval: '' });
  if (grid.length === 0) throw new Error(`No rows in ${filepath}`);

  const headerIdx = grid.findIndex(r => normHeader(r[0]) === 'inst code');
  if (headerIdx === -1) throw new Error(`Could not locate header row in ${filepath}`);

  const colMap = {};
  grid[headerIdx].forEach((raw, idx) => {
    const mapped = HEADER_MAP[normHeader(raw)];
    if (mapped) colMap[idx] = mapped;
  });

  const records = [];
  for (let i = headerIdx + 1; i < grid.length; i++) {
    const row = grid[i];
    if (!row || row.length === 0) continue;

    const rec = {};
    for (const [idx, field] of Object.entries(colMap)) {
      const val = String(row[idx] ?? '').trim();
      if (RANK_FIELDS.includes(field)) {
        rec[field] = val && val !== '-' ? parseInt(val, 10) || 0 : 0;
      } else {
        rec[field] = val;
      }
    }
    if (!rec.inst_code || !/^[A-Z0-9]{3,10}$/.test(rec.inst_code)) continue;
    if (!rec.branch_code) continue;
    records.push(rec);
  }
  return records;
}

function buildChunkText(rec) {
  const rankParts = RANK_FIELDS
    .filter(f => rec[f] > 0)
    .map(f => `${RANK_LABELS[f]}: ${rec[f]}`)
    .join(', ');
  const localArea = rec.local_area ? ` Local area: ${rec.local_area}.` : '';
  const base = [
    `APEAMCET (AP EAPCET) 2022 — Last Rank Statement.`,
    `College: ${rec.inst_name} (Code: ${rec.inst_code}), ${rec.place}, ${rec.dist || ''} (${rec.region || ''}).`,
    `Type: ${rec.col_type || rec.inst_type || 'N/A'}. Affiliated to: ${rec.affiliated || 'N/A'}.${localArea}`,
    `Branch: ${rec.branch_name} (Code: ${rec.branch_code}).`,
    `Last ranks by category — ${rankParts}.`,
  ].join(' ');
  return base + enrichChunk({
    college: rec.inst_name, place: rec.place, dist: rec.dist, region: rec.region,
    affiliated: rec.affiliated, branch: rec.branch_name,
  });
}

function chunkId(rec) {
  return `${rec.inst_code}_${rec.branch_code}_${(rec.local_area || 'NA')}`.replace(/\s+/g, '');
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
  }
  const supabase = createClient(url, key);

  const files = readdirSync(DATA_DIR).filter(f => /\.(xlsx|xls)$/i.test(f));
  if (files.length === 0) {
    console.error(`No XLSX files found in ${DATA_DIR}`);
    process.exit(1);
  }
  console.log(`Found ${files.length} XLSX file(s):`, files.join(', '));

  let allRecords = [];
  for (const filename of files) {
    const records = parseXlsx(join(DATA_DIR, filename));
    console.log(`  ${filename}: ${records.length} records`);
    allRecords = allRecords.concat(records);
  }

  // Deduplicate by chunk_id.
  const seen = new Set();
  allRecords = allRecords.filter(r => {
    const id = chunkId(r);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  console.log(`Total unique records: ${allRecords.length}`);

  // Skip rows already present.
  const ids = allRecords.map(chunkId);
  const existing = new Set();
  const PAGE = 1000;
  for (let i = 0; i < ids.length; i += PAGE) {
    const { data } = await supabase
      .from(TABLE)
      .select('chunk_id')
      .in('chunk_id', ids.slice(i, i + PAGE));
    (data || []).forEach(row => existing.add(row.chunk_id));
  }
  const pending = allRecords.filter((_, i) => !existing.has(ids[i]));
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
        source: 'APEAMCET 2022', exam: EXAM, year: YEAR, state: STATE,
        inst_code: rec.inst_code, inst_name: rec.inst_name, place: rec.place,
        region: rec.region, dist: rec.dist, col_type: rec.col_type || rec.inst_type,
        affiliated: rec.affiliated, aff_full: expandUniversity(rec.affiliated),
        local_area: rec.local_area || '',
        branch_code: rec.branch_code, branch_name: rec.branch_name,
        ...Object.fromEntries(RANK_FIELDS.map(f => [f, rec[f] ?? 0])),
      },
    }));

    const { error } = await supabase.from(TABLE).upsert(rows, { onConflict: 'chunk_id' });
    if (error) throw new Error(`Supabase upsert error: ${error.message}`);

    done += slice.length;
    process.stdout.write(`  ${done}/${allRecords.length} stored\r`);
  }
  console.log(`\nIngestion complete. ${done}/${allRecords.length} APEAMCET records in Supabase.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
