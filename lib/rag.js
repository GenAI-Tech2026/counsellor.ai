import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { embedText } from './embeddings.mjs';
import { redisEnabled, redisGet, redisSetEx } from './redis.js';

const EMB_PREFIX = 'emb:';
const EMB_TTL_SEC = 60 * 60 * 24; // 1 day — query embeddings are deterministic

/**
 * Embed a query string, caching the result in Redis when configured. Embeddings
 * are deterministic, so identical queries skip the (CPU-heavy, cold-start-prone)
 * local ONNX model entirely. Falls back to a plain local embed otherwise.
 */
async function embedQuery(text) {
  if (!redisEnabled()) return embedText(text);
  const key = EMB_PREFIX + createHash('sha1').update(String(text)).digest('hex');
  try {
    const cached = await redisGet(key);
    if (cached) {
      const vec = JSON.parse(cached);
      if (Array.isArray(vec) && vec.length) return vec;
    }
  } catch { /* ignore — fall back to a fresh embed */ }
  const vec = await embedText(text);
  try { await redisSetEx(key, JSON.stringify(vec), EMB_TTL_SEC); } catch { /* ignore */ }
  return vec;
}

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

function formatMatch(metadata) {
  const m = metadata;
  const ranks = RANK_FIELDS
    .filter(f => m[f] && m[f] > 0)
    .map(f => `${RANK_LABELS[f]}: ${m[f]}`)
    .join(', ');

  return [
    `[Source: TGEAPCET Official Last Rank Statement — ${m.phase}]`,
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
 * @param {object} [opts]      - Optional structured-metadata facet filters applied
 *                               BEFORE similarity ranking (added; backward-compatible).
 * @param {string|null} [opts.exam]  - e.g. 'TGEAPCET'
 * @param {number|null} [opts.year]  - e.g. 2025
 * @param {string|null} [opts.state] - e.g. 'Telangana'
 */
export async function retrieveContext(queryText, topK = 8, whereFilter = null, opts = {}) {
  const { exam = null, year = null, state = null } = opts || {};
  const supabase = getSupabase();
  const embedding = await embedQuery(queryText);

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
    exam_filter: exam,
    year_filter: year,
    state_filter: state,
  });

  if (error) throw new Error(`Supabase RPC error: ${error.message}`);
  if (!data || data.length === 0) return { contextBlock: '', sources: [] };

  const contextBlock = data.map(row => formatMatch(row.metadata)).join('\n\n');
  return { contextBlock, sources: data.map(row => row.metadata) };
}

// ── JEE / JoSAA 2025 ───────────────────────────────────────────────────────

// Map common user phrasings to the exact JoSAA seat-type / gender values.
export const JEE_SEAT_TYPE = {
  'OPEN': 'OPEN', 'GENERAL': 'OPEN', 'GEN': 'OPEN', 'OC': 'OPEN',
  'EWS': 'EWS',
  'OBC': 'OBC-NCL', 'OBC-NCL': 'OBC-NCL', 'BC': 'OBC-NCL',
  'SC': 'SC',
  'ST': 'ST',
};
export const JEE_GENDER = {
  boys: 'Gender-Neutral',
  // Female candidates are eligible for BOTH gender-neutral and female-only seats,
  // so we deliberately leave girls unfiltered (null) at the SQL layer.
  girls: null,
};

function formatJeeMatch(m) {
  const gender = String(m.gender || '').startsWith('Female') ? 'Female-only' : 'Gender-Neutral';
  return [
    `[Source: JoSAA — ${m.round}]`,
    `Institute: ${m.institute} (${m.institute_type})`,
    `Program: ${m.program}`,
    `Quota: ${m.quota} | Seat type: ${m.seat_type} | Gender: ${gender}`,
    `Opening rank: ${m.opening_rank}, Closing rank: ${m.closing_rank}`,
  ].join('\n');
}

/**
 * Retrieve eligible JEE / JoSAA 2025 programs for a query.
 *
 * @param {string} queryText
 * @param {number} topK
 * @param {object} opts
 * @param {number|null} opts.rank      - student's JEE rank; returns programs with closing_rank >= rank
 * @param {string|null} opts.seatType  - exact JoSAA seat type ('OPEN','OBC-NCL','SC','ST','EWS')
 * @param {string|null} opts.gender    - exact JoSAA gender value, or null for no filter
 * @param {string|null} opts.quota     - exact quota ('AI','HS','OS'), or null
 * @param {string|null} opts.exam      - structured facet filter, e.g. 'JEE' (added)
 * @param {number|null} opts.year      - structured facet filter, e.g. 2025 (added)
 * @param {string|null} opts.state     - structured facet filter, e.g. 'All India' (added)
 */
export async function retrieveJeeContext(queryText, topK = 10, opts = {}) {
  const {
    rank = null, seatType = null, gender = null, quota = null,
    exam = null, year = null, state = null,
  } = opts;
  const supabase = getSupabase();
  const embedding = await embedQuery(queryText);

  const { data, error } = await supabase.rpc('match_jee_josaa_2025', {
    query_embedding: embedding,
    match_count: topK,
    min_rank: rank,
    seat_type_filter: seatType,
    gender_filter: gender,
    quota_filter: quota,
    exam_filter: exam,
    year_filter: year,
    state_filter: state,
  });

  if (error) throw new Error(`Supabase JEE RPC error: ${error.message}`);
  if (!data || data.length === 0) return { contextBlock: '', sources: [] };

  const contextBlock = data.map(row => formatJeeMatch(row.metadata)).join('\n\n');
  return { contextBlock, sources: data.map(row => row.metadata) };
}

// ── JEE Advanced 2025 (IIT seats) ──────────────────────────────────────────
// Same ORCR shape as JoSAA but keyed on the JEE Advanced rank, with a `round`
// facet (all rounds ingested). Reuses JEE_SEAT_TYPE / JEE_GENDER for mapping.

function formatJeeAdvancedMatch(m) {
  const gender = String(m.gender || '').startsWith('Female') ? 'Female-only' : 'Gender-Neutral';
  return [
    `[Source: JEE Advanced (IIT) — ${m.round}]`,
    `Institute: ${m.institute} (IIT)`,
    `Program: ${m.program}`,
    `Quota: ${m.quota} | Seat type: ${m.seat_type} | Gender: ${gender}`,
    `Opening rank: ${m.opening_rank}, Closing rank: ${m.closing_rank}`,
  ].join('\n');
}

/**
 * Retrieve eligible JEE Advanced 2025 IIT programs for a query.
 * @param {string} queryText
 * @param {number} topK
 * @param {object} opts  { rank, seatType, gender, round, exam, year, state }
 */
export async function retrieveJeeAdvancedContext(queryText, topK = 10, opts = {}) {
  const {
    rank = null, seatType = null, gender = null, round = null,
    exam = null, year = null, state = null,
  } = opts;
  const supabase = getSupabase();
  const embedding = await embedQuery(queryText);

  const { data, error } = await supabase.rpc('match_jee_advanced_2025', {
    query_embedding: embedding,
    match_count: topK,
    min_rank: rank,
    seat_type_filter: seatType,
    gender_filter: gender,
    round_filter: round,
    exam_filter: exam,
    year_filter: year,
    state_filter: state,
  });

  if (error) throw new Error(`Supabase JEE Advanced RPC error: ${error.message}`);
  if (!data || data.length === 0) return { contextBlock: '', sources: [] };

  const contextBlock = data.map(row => formatJeeAdvancedMatch(row.metadata)).join('\n\n');
  return { contextBlock, sources: data.map(row => row.metadata) };
}

// ── APEAMCET (AP EAPCET) 2022 ──────────────────────────────────────────────
// Wide category format (mirrors TGEAPCET) with AP reservation categories.

const AP_RANK_FIELDS = [
  'oc_boys','oc_girls','sc_boys','sc_girls','st_boys','st_girls',
  'bca_boys','bca_girls','bcb_boys','bcb_girls','bcc_boys','bcc_girls',
  'bcd_boys','bcd_girls','bce_boys','bce_girls','ews_boys','ews_girls',
];
const AP_RANK_LABELS = {
  oc_boys: 'OC Boys', oc_girls: 'OC Girls', sc_boys: 'SC Boys', sc_girls: 'SC Girls',
  st_boys: 'ST Boys', st_girls: 'ST Girls',
  bca_boys: 'BC-A Boys', bca_girls: 'BC-A Girls', bcb_boys: 'BC-B Boys', bcb_girls: 'BC-B Girls',
  bcc_boys: 'BC-C Boys', bcc_girls: 'BC-C Girls', bcd_boys: 'BC-D Boys', bcd_girls: 'BC-D Girls',
  bce_boys: 'BC-E Boys', bce_girls: 'BC-E Girls', ews_boys: 'EWS Boys', ews_girls: 'EWS Girls',
};

function formatApeamcetMatch(m) {
  const ranks = AP_RANK_FIELDS
    .filter(f => m[f] && m[f] > 0)
    .map(f => `${AP_RANK_LABELS[f]}: ${m[f]}`)
    .join(', ');
  return [
    `[Source: APEAMCET (AP EAPCET) Last Rank Statement]`,
    `College: ${m.inst_name} (${m.inst_code}) | ${m.place}, ${m.dist} (${m.region}) | ${m.col_type} | Affiliated: ${m.affiliated}${m.local_area ? ` | Local area: ${m.local_area}` : ''}`,
    `Branch: ${m.branch_name} (${m.branch_code})`,
    `Last ranks: ${ranks}`,
  ].join('\n');
}

/**
 * Retrieve eligible APEAMCET 2022 seats for a query.
 * @param {object} [opts]   { exam, year, state }
 * @param {object} whereFilter  ChromaDB-style { <ap_rank_field>: { '$gte': rank } }
 */
export async function retrieveApeamcetContext(queryText, topK = 8, whereFilter = null, opts = {}) {
  const { exam = null, year = null, state = null } = opts || {};
  const supabase = getSupabase();
  const embedding = await embedQuery(queryText);

  let rankField = null, minRank = null;
  if (whereFilter) {
    const [field, condition] = Object.entries(whereFilter)[0] || [];
    if (field) { rankField = field; minRank = condition['$gte'] ?? null; }
  }

  const { data, error } = await supabase.rpc('match_apeamcet_2022', {
    query_embedding: embedding,
    match_count: topK,
    rank_field: rankField,
    min_rank: minRank,
    exam_filter: exam,
    year_filter: year,
    state_filter: state,
  });

  if (error) throw new Error(`Supabase APEAMCET RPC error: ${error.message}`);
  if (!data || data.length === 0) return { contextBlock: '', sources: [] };

  const contextBlock = data.map(row => formatApeamcetMatch(row.metadata)).join('\n\n');
  return { contextBlock, sources: data.map(row => row.metadata) };
}

// ── KCET 2024 & MHT-CET 2024 (wide, arbitrary category-code keys) ───────────
// Both store every category's closing rank as its own metadata key. We format
// by reconstructing the category→rank list from the non-reserved metadata keys.

const _WIDE_META_KEYS = new Set([
  'source','exam','year','state','round','region','seat_type','status',
  'college_code','college_name','place','branch_code','branch_name',
]);

function _categoryRanks(m) {
  return Object.entries(m)
    .filter(([k, v]) => !_WIDE_META_KEYS.has(k) && Number.isFinite(Number(v)) && Number(v) > 0)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');
}

function formatKcetMatch(m) {
  return [
    `[Source: KCET Engineering — ${m.round} (${m.region} stream)]`,
    `College: ${m.college_name} (${m.college_code}) | ${m.place}`,
    `Branch: ${m.branch_name} (${m.branch_code})`,
    `Closing ranks by category: ${_categoryRanks(m)}`,
  ].join('\n');
}

function formatMhtcetMatch(m) {
  return [
    `[Source: MHT-CET Engineering — ${m.round} (${m.seat_type})]`,
    `College: ${m.college_name} (${m.college_code})${m.status ? ` | ${m.status}` : ''}`,
    `Branch: ${m.branch_name} (${m.branch_code})`,
    `Closing CET merit numbers by category: ${_categoryRanks(m)}`,
  ].join('\n');
}

/**
 * Retrieve eligible KCET 2024 seats for a query.
 * @param {object} opts  { rankField (KCET code e.g. 'GM','SCG'), rank, round, exam, year, state }
 */
export async function retrieveKcetContext(queryText, topK = 10, opts = {}) {
  const { rankField = null, rank = null, round = null, exam = null, year = null, state = null } = opts;
  const supabase = getSupabase();
  const embedding = await embedQuery(queryText);

  const { data, error } = await supabase.rpc('match_kcet_2024', {
    query_embedding: embedding,
    match_count: topK,
    rank_field: rankField,
    min_rank: rank,
    round_filter: round,
    exam_filter: exam,
    year_filter: year,
    state_filter: state,
  });

  if (error) throw new Error(`Supabase KCET RPC error: ${error.message}`);
  if (!data || data.length === 0) return { contextBlock: '', sources: [] };

  const contextBlock = data.map(row => formatKcetMatch(row.metadata)).join('\n\n');
  return { contextBlock, sources: data.map(row => row.metadata) };
}

/**
 * Retrieve eligible MHT-CET 2024 seats for a query.
 * @param {object} opts  { rankField (MHTCET code e.g. 'GOPENS'), rank, round, exam, year, state }
 */
export async function retrieveMhtcetContext(queryText, topK = 10, opts = {}) {
  const { rankField = null, rank = null, round = null, exam = null, year = null, state = null } = opts;
  const supabase = getSupabase();
  const embedding = await embedQuery(queryText);

  const { data, error } = await supabase.rpc('match_mhtcet_2024', {
    query_embedding: embedding,
    match_count: topK,
    rank_field: rankField,
    min_rank: rank,
    round_filter: round,
    exam_filter: exam,
    year_filter: year,
    state_filter: state,
  });

  if (error) throw new Error(`Supabase MHTCET RPC error: ${error.message}`);
  if (!data || data.length === 0) return { contextBlock: '', sources: [] };

  const contextBlock = data.map(row => formatMhtcetMatch(row.metadata)).join('\n\n');
  return { contextBlock, sources: data.map(row => row.metadata) };
}

// ── Per-exam category → rank-field/code mapping (used by the chat route) ─────
// Translates the normalized category the param-extractor returns into the exact
// metadata key each exam's match function filters on. KCET/MHTCET codes are
// best-effort (the retrieved chunk carries ALL category cutoffs regardless), so
// an unmapped category simply skips the hard eligibility filter.

export const APEAMCET_CATEGORY_FIELD = {
  'OC':   { boys: 'oc_boys',  girls: 'oc_girls'  },
  'SC':   { boys: 'sc_boys',  girls: 'sc_girls'  },
  'ST':   { boys: 'st_boys',  girls: 'st_girls'  },
  'BC-A': { boys: 'bca_boys', girls: 'bca_girls' },
  'BC-B': { boys: 'bcb_boys', girls: 'bcb_girls' },
  'BC-C': { boys: 'bcc_boys', girls: 'bcc_girls' },
  'BC-D': { boys: 'bcd_boys', girls: 'bcd_girls' },
  'BC-E': { boys: 'bce_boys', girls: 'bce_girls' },
  'EWS':  { boys: 'ews_boys', girls: 'ews_girls' },
};

// KCET: the General-merit pool code per category (G suffix = general entry).
// HK-region students use the 'H' variants — handled in the route via region.
export const KCET_CATEGORY_CODE = {
  'GENERAL': 'GM', 'OC': 'GM', 'GM': 'GM',
  '1': '1G', 'CAT-1': '1G',
  '2A': '2AG', '2B': '2BG', '3A': '3AG', '3B': '3BG',
  'SC': 'SCG', 'ST': 'STG',
};

// MHT-CET: the General, State-level code per category (G…S).
export const MHTCET_CATEGORY_CODE = {
  'GENERAL': 'GOPENS', 'OPEN': 'GOPENS', 'OC': 'GOPENS',
  'SC': 'GSCS', 'ST': 'GSTS', 'OBC': 'GOBCS', 'SEBC': 'GSEBCS',
  'VJ': 'GVJS', 'NT1': 'GNT1S', 'NT2': 'GNT2S', 'NT3': 'GNT3S',
  'EWS': 'EWS',
};
