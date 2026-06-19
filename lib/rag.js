import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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

let _supabase = null;
function getSupabase() {
  if (_supabase) return _supabase;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars are not set');
  _supabase = createClient(url, key);
  return _supabase;
}

async function embedText(text) {
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

function formatMatch(metadata) {
  const m = metadata;
  const ranks = RANK_FIELDS
    .filter(f => m[f] && m[f] > 0)
    .map(f => `${RANK_LABELS[f]}: ${m[f]}`)
    .join(', ');

  return [
    `[Source: TGEAPCET 2025 Official Last Rank Statement — ${m.phase}]`,
    `College: ${m.inst_name} (${m.inst_code}) | ${m.place}, ${m.dist_code} | ${m.col_type} | Affiliated: ${m.affiliated}`,
    `Branch: ${m.branch_name} (${m.branch_code})`,
    `Last ranks: ${ranks}`,
  ].join('\n');
}

/**
 * Retrieve the most relevant rank records for a query using Supabase pgvector.
 *
 * @param {string} queryText   - Natural language query
 * @param {number} topK        - Number of results to return
 * @param {object} whereFilter - Optional ChromaDB-style filter, e.g. { oc_boys: { '$gte': 500 } }
 */
export async function retrieveContext(queryText, topK = 8, whereFilter = null) {
  const supabase = getSupabase();
  const embedding = await embedText(queryText);

  // Translate ChromaDB-style filter to rank_field / min_rank params
  let rankField = null;
  let minRank = null;
  if (whereFilter) {
    const entries = Object.entries(whereFilter);
    if (entries.length > 0) {
      const [field, condition] = entries[0];
      rankField = field;
      minRank = condition['$gte'] ?? null;
    }
  }

  const { data, error } = await supabase.rpc('match_tgeapcet_2025', {
    query_embedding: embedding,
    match_count: topK,
    rank_field: rankField,
    min_rank: minRank,
  });

  if (error) throw new Error(`Supabase RPC error: ${error.message}`);
  if (!data || data.length === 0) return { contextBlock: '', sources: [] };

  const contextBlock = data.map(row => formatMatch(row.metadata)).join('\n\n');
  return { contextBlock, sources: data.map(row => row.metadata) };
}
