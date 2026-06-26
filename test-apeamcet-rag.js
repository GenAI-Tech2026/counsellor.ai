import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { embedBatch } from './lib/embeddings.mjs';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const [embedding] = await embedBatch(["JEE Main JoSAA OPEN Boys rank 5000 eligible colleges closing rank Computer Science NIT Warangal"]);
  
  const { data, error } = await supabase.rpc('match_jee_josaa_2025', {
    query_embedding: embedding,
    match_count: 100,
    min_rank: null,
    seat_type_filter: null,
    gender_filter: null,
    quota_filter: null,
    exam_filter: null,
    year_filter: null,
    state_filter: null,
  });
  
  console.log('Error:', error);
  if (data) {
    const warangalCse = data.filter(d => d.metadata.institute.includes('Warangal') && d.metadata.program.includes('Computer Science'));
    console.log('Warangal CSE matches:', warangalCse.length);
    warangalCse.forEach(d => console.log(d.metadata.program, '|', d.metadata.seat_type, '|', d.metadata.closing_rank, '| sim:', d.similarity));
  }
}
run();
