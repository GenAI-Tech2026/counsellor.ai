/**
 * Chunk-text enrichment for the RAG ingestion pipeline.
 *
 * The raw rows abbreviate heavily — affiliations are codes like "JNTUK", branch
 * names are long official strings, and a student's phrasing ("CSE at JNTU
 * Kakinada") shares few literal tokens with the stored text. The embedding model
 * only "sees" the chunk text, so we enrich it with:
 *
 *   1. University/affiliation acronym EXPANSION (JNTUK → Jawaharlal Nehru
 *      Technological University Kakinada) — so "JNTU Kakinada" lands near the row.
 *   2. Branch ABBREVIATIONS (Computer Science and Engineering → CSE) — so "CSE"
 *      matches a row whose official branch name never contains the letters "CSE".
 *   3. A compact "Search keywords" line that repeats the salient entities
 *      (college, place, district, affiliation, branch + aliases) once more, which
 *      strengthens recall for short, entity-heavy queries.
 *
 * Shared by every scripts/ingest*.mjs so all six datasets enrich consistently.
 */

// AP + Telangana affiliating universities (the EAMCET states). Keyed by the
// short codes that appear in the `Affiliated To` column, expanded to the full
// name plus the city — both useful anchors for a query like "JNTU Kakinada".
const UNIVERSITY_ALIASES = {
  JNTUK:  'Jawaharlal Nehru Technological University Kakinada (JNTUK), Kakinada',
  JNTUH:  'Jawaharlal Nehru Technological University Hyderabad (JNTUH), Hyderabad',
  JNTUA:  'Jawaharlal Nehru Technological University Anantapur (JNTUA), Anantapur',
  JNTUGV: 'Jawaharlal Nehru Technological University Gurajada Vizianagaram (JNTUGV), Vizianagaram',
  ANU:    'Acharya Nagarjuna University (ANU), Guntur',
  SVU:    'Sri Venkateswara University (SVU), Tirupati',
  SKU:    'Sri Krishnadevaraya University (SKU), Anantapur',
  AU:     'Andhra University (AU), Visakhapatnam',
  AKNU:   'Adikavi Nannaya University (AKNU), Rajahmundry',
  YVU:    'Yogi Vemana University (YVU), Kadapa',
  VSU:    'Vikrama Simhapuri University (VSU), Nellore',
  DBRAU:  'Dr. B. R. Ambedkar University, Srikakulam',
  RGUKT:  'Rajiv Gandhi University of Knowledge Technologies (RGUKT)',
  OU:     'Osmania University (OU), Hyderabad',
  KU:     'Kakatiya University (KU), Warangal',
  SU:     'Satavahana University (SU), Karimnagar',
  TU:     'Telangana University (TU), Nizamabad',
  MGU:    'Mahatma Gandhi University (MGU), Nalgonda',
  PU:     'Palamuru University (PU), Mahbubnagar',
};

/** Expand an affiliation code to its full university name, or '' if unknown. */
export function expandUniversity(code) {
  if (!code) return '';
  const key = String(code).toUpperCase().replace(/[^A-Z]/g, '');
  return UNIVERSITY_ALIASES[key] || '';
}

// Branch-name keyword → abbreviation aliases. Each entry: if the official branch
// name contains `needle`, add `aliases`. A row can pick up several (e.g. a
// "Computer Science and Engineering (AI & ML)" branch → CSE + AI + ML).
const BRANCH_ALIASES = [
  ['computer science and engineering', ['CSE', 'Computer Science Engineering']],
  ['computer science and business',    ['CSBS']],
  ['computer science',                 ['CSE', 'CS']],
  ['information technology',            ['IT']],
  ['electronics and communication',    ['ECE']],
  ['electronics & communication',      ['ECE']],
  ['electrical and electronics',       ['EEE']],
  ['electrical & electronics',         ['EEE']],
  ['electronics and instrumentation',  ['EIE']],
  ['mechanical engineering',           ['ME', 'MECH']],
  ['civil engineering',                ['CE', 'CIVIL']],
  ['chemical engineering',             ['CHEM']],
  ['artificial intelligence and machine learning', ['AIML', 'AI', 'ML']],
  ['artificial intelligence and data science',     ['AIDS', 'AI', 'DS']],
  ['artificial intelligence',          ['AI']],
  ['machine learning',                 ['ML']],
  ['data science',                     ['DS']],
  ['data analytics',                   ['DA']],
  ['internet of things',               ['IoT']],
  ['cyber security',                   ['Cyber']],
  ['biotechnology',                    ['BT', 'Biotech']],
  ['bio technology',                   ['BT', 'Biotech']],
  ['aeronautical',                     ['AERO']],
  ['aerospace',                        ['AERO']],
  ['automobile',                       ['AUTO']],
  ['metallurgical',                    ['METG']],
  ['mining engineering',               ['MINING']],
  ['agricultural engineering',         ['AGRI']],
  ['food technology',                  ['FT']],
  ['pharmacy',                         ['Pharma']],
];

/** Return abbreviation aliases for a branch name (deduped), e.g. ['CSE']. */
export function branchAliases(branchName) {
  const b = String(branchName || '').toLowerCase();
  const out = [];
  for (const [needle, aliases] of BRANCH_ALIASES) {
    if (b.includes(needle)) {
      for (const a of aliases) if (!out.includes(a)) out.push(a);
    }
  }
  return out;
}

/**
 * Build the enrichment suffix appended to a chunk's base text. All fields are
 * optional; only the non-empty ones are emitted.
 *
 * @param {object} f
 * @param {string} [f.college]    institute / college name
 * @param {string} [f.place]      place / city
 * @param {string} [f.dist]       district
 * @param {string} [f.region]     region / zone
 * @param {string} [f.affiliated] affiliation code (e.g. 'JNTUK')
 * @param {string} [f.branch]     official branch / program name
 * @returns {string} sentences to append to the base chunk text (leading space).
 */
export function enrichChunk(f = {}) {
  const lines = [];

  const uni = expandUniversity(f.affiliated);
  if (uni) lines.push(`Affiliating university: ${uni}.`);

  const aliases = branchAliases(f.branch);
  if (aliases.length) {
    lines.push(`Branch also known as: ${aliases.join(', ')}.`);
  }

  // A single keyword line repeating the salient entities once more.
  const kw = [f.college, f.place, f.dist, f.region, f.affiliated, uni, f.branch, ...aliases]
    .map((s) => String(s || '').trim())
    .filter(Boolean);
  if (kw.length) lines.push(`Search keywords: ${[...new Set(kw)].join(' | ')}.`);

  return lines.length ? ' ' + lines.join(' ') : '';
}
