/**
 * NDA & NA cut-offs ingestion: XLSX → local bge-small-en-v1.5 → Supabase.
 *
 * Source: public/data/nda/NDA_NA_CutOffs_2020_2024.xlsx (sheet "Cut-offs")
 *   Year | Session | Examination | Written Cut-off (out of 900) |
 *   Min % per Subject (written) | Final Cut-off (out of 1800) |
 *   Total Vacancies | Candidates Recommended
 *
 * INFO-ONLY: aggregate national exam data (one row per year × session). No
 * colleges/branches — this only powers factual Q&A, not college recommendation.
 *
 * Usage:   node scripts/ingest-nda.mjs   (npm run ingest:nda)
 * Prereqs: .env keys; apply *_create_nda_na.sql first.
 */

import 'dotenv/config';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import pkg from 'xlsx';
const { readFile, utils: xlsxUtils } = pkg;
import { createClient } from '@supabase/supabase-js';
import { embedBatch } from '../lib/embeddings.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FILE = join(__dirname, '../public/data/nda/NDA_NA_CutOffs_2020_2024.xlsx');

const EXAM = 'NDA';
const TABLE = 'nda_na';
const SHEET = 'Cut-offs';

function norm(s) { return String(s ?? '').replace(/\s+/g, ' ').trim(); }
function toInt(v) {
  const n = parseInt(String(v).split('.')[0].replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}
function slug(s) { return norm(s).replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

function parseSheet(ws) {
  const grid = xlsxUtils.sheet_to_json(ws, { header: 1, defval: '' });
  const headerIdx = grid.findIndex(r => norm(r[0]).toLowerCase() === 'year');
  if (headerIdx === -1) return [];

  const recs = [];
  for (let i = headerIdx + 1; i < grid.length; i++) {
    const r = grid[i];
    const year = toInt(r[0]);
    const session = norm(r[1]);
    if (!year || !session) continue;
    recs.push({
      year,
      session,
      exam_name: norm(r[2]),
      written_cutoff: toInt(r[3]),
      min_pct: toInt(r[4]),
      final_cutoff: toInt(r[5]),
      vacancies: toInt(r[6]),
      recommended: toInt(r[7]),
    });
  }
  return recs;
}

function buildChunkText(rec) {
  const bits = [
    `NDA & NA ${rec.exam_name || `(${rec.session}), ${rec.year}`} official cut-offs.`,
    rec.written_cutoff != null ? `Written cut-off: ${rec.written_cutoff} out of 900 (minimum ${rec.min_pct}% per subject).` : '',
    rec.final_cutoff != null ? `Final cut-off (after SSB): ${rec.final_cutoff} out of 1800.` : '',
    rec.vacancies != null ? `Total vacancies: ${rec.vacancies}.` : '',
    rec.recommended != null ? `Candidates recommended: ${rec.recommended}.` : '',
    `Exam: National Defence Academy and Naval Academy (NDA & NA), year ${rec.year}, ${rec.session} session.`,
  ].filter(Boolean);
  return bits.join(' ');
}

function chunkId(rec) {
  return `nda_${rec.year}_${slug(rec.session)}`.slice(0, 480);
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) { console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env'); process.exit(1); }
  const supabase = createClient(url, key);

  const wb = readFile(FILE);
  const ws = wb.Sheets[SHEET] || wb.Sheets[wb.SheetNames[0]];
  const records = parseSheet(ws);
  console.log(`Total NDA/NA records: ${records.length}`);
  if (!records.length) { console.log('Nothing parsed. Check the sheet layout.'); return; }

  const texts = records.map(buildChunkText);
  const embeddings = await embedBatch(texts);
  const rows = records.map((rec, j) => ({
    chunk_id: chunkId(rec),
    content: texts[j],
    embedding: embeddings[j],
    metadata: {
      source: 'NDA & NA Cut-offs', exam: EXAM, year: rec.year, session: rec.session,
      exam_name: rec.exam_name, written_cutoff: rec.written_cutoff, min_pct: rec.min_pct,
      final_cutoff: rec.final_cutoff, vacancies: rec.vacancies, recommended: rec.recommended,
    },
  }));

  const { error } = await supabase.from(TABLE).upsert(rows, { onConflict: 'chunk_id' });
  if (error) throw new Error(`Supabase upsert error: ${error.message}`);
  console.log(`Ingestion complete. ${rows.length} NDA/NA records in Supabase.`);
}

main().catch(err => { console.error(err); process.exit(1); });
