/**
 * Next-gen / new-age tech colleges ingestion: colleges.json → local
 * all-MiniLM-L6-v2 embeddings → Supabase (nextgen_colleges table).
 *
 * Source: public/data/nextgen/colleges.json (verified, sourced data — NIAT,
 *   Scaler, Polaris, Newton, Plaksha). One chunk per college.
 *
 * Prerequisites (.env): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Apply supabase/migrations/20260629140000_create_nextgen_colleges.sql first.
 *
 * Usage: node scripts/ingest-nextgen.mjs
 */

import 'dotenv/config';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { embedBatch } from '../lib/embeddings.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FILE = join(__dirname, '../public/data/nextgen/colleges.json');

// Build one rich, embeddable text chunk per college (mirrors lib/nextgen.js).
function buildChunkText(c) {
  return [
    `New-age / next-gen tech college: ${c.full_name}.`,
    `These colleges admit through their OWN application process, NOT JoSAA or state counselling.`,
    `Location: ${(c.locations || []).join('; ')}.`,
    `Programs: ${(c.programs || []).join('; ')}. Duration: ${c.duration_years} years. Mode: ${c.mode}.`,
    `Degree and affiliation: ${c.degree_and_affiliation}`,
    `Eligibility: ${c.eligibility}`,
    `Admission test: ${c.admission_test}. Admission process: ${c.admission_process}`,
    `Fees (approximate, confirm on official site): ${c.fees_approx}`,
    `Scholarships: ${c.scholarships}`,
    `Highlights: ${c.highlights}`,
    `Official site: ${c.official_url}.`,
  ].join(' ');
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
  }
  const supabase = createClient(url, key);

  const { colleges } = JSON.parse(readFileSync(FILE, 'utf8'));
  if (!Array.isArray(colleges) || colleges.length === 0) {
    console.error('No colleges found in', FILE);
    process.exit(1);
  }
  console.log(`Ingesting ${colleges.length} next-gen colleges...`);

  const texts = colleges.map(buildChunkText);
  const embeddings = await embedBatch(texts);

  const rows = colleges.map((c, i) => ({
    chunk_id: `nextgen:${c.key}`,
    content: texts[i],
    embedding: embeddings[i],
    metadata: {
      source: 'next-gen colleges (official sites + aggregators)',
      key: c.key,
      name: c.name,
      full_name: c.full_name,
      locations: c.locations,
      official_url: c.official_url,
      admission_route: c.admission_route,
    },
  }));

  // Upsert by chunk_id so re-runs refresh (idempotent).
  const { error } = await supabase.from('nextgen_colleges').upsert(rows, { onConflict: 'chunk_id' });
  if (error) throw new Error(`Supabase upsert error: ${error.message}`);

  console.log(`Ingestion complete. ${rows.length}/${colleges.length} next-gen colleges in Supabase.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
