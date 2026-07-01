/**
 * New-age / next-gen tech colleges (NIAT, Scaler, Polaris, Newton, Plaksha).
 * Single source of truth = public/data/nextgen/colleges.json (also read by
 * scripts/ingest-nextgen.mjs). These colleges admit through their OWN process
 * (not JoSAA / state counselling), so they sit outside the rank-cutoff corpus.
 *
 * The chat route grounds its answer in this real, sourced data, so the bot can
 * talk about these colleges accurately instead of guessing.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

let _data = null;
function load() {
  if (_data) return _data;
  try {
    const p = join(process.cwd(), 'public', 'data', 'nextgen', 'colleges.json');
    _data = JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    _data = { colleges: [], _meta: {} };
  }
  return _data;
}

export function allNextgenColleges() {
  return load().colleges || [];
}

// Per-college trigger words (lowercased). A message that contains any of these
// is about that specific college.
const ALIASES = {
  niat: ['niat', 'nxtwave', 'nxt wave', 'nxtwave institute', 'institute of advanced technologies'],
  scaler: ['scaler', 'sst', 'scaler school'],
  polaris: ['polaris'],
  newton: ['newton school', 'newton school of technology', 'nst', 'rishihood'],
  plaksha: ['plaksha'],
};

// Generic phrases that ask about the whole category.
const GENERIC_RE = /\bnew[\s-]?age (tech(nology)? )?colleges?\b|\bnext[\s-]?gen colleges?\b|\bprivate tech colleges?\b|\bcolleges? without jee\b/i;

/**
 * Detect which next-gen college(s) a message is about.
 * @returns {{ colleges: object[], generic: boolean }} matched colleges; `generic`
 *   true when the message asks about the category rather than a named college.
 */
export function detectNextgen(message) {
  const m = String(message || '').toLowerCase();
  const cols = allNextgenColleges();
  const matched = cols.filter((c) => (ALIASES[c.key] || [c.key]).some((a) => m.includes(a)));
  if (matched.length) return { colleges: matched, generic: false };
  if (GENERIC_RE.test(message || '')) return { colleges: cols, generic: true };
  return { colleges: [], generic: false };
}

/** Build a grounded, plain-text info block for the LLM from college records. */
export function formatNextgenContext(colleges) {
  const meta = load()._meta || {};
  const blocks = (colleges || []).map((c) => [
    `### ${c.full_name}`,
    `Location: ${(c.locations || []).join('; ')}.`,
    `Programs: ${(c.programs || []).join('; ')}. Duration: ${c.duration_years} years. Mode: ${c.mode}.`,
    `Degree: ${c.degree_and_affiliation}`,
    `Eligibility: ${c.eligibility}`,
    `Admission test: ${c.admission_test}. Process: ${c.admission_process}`,
    `Fees (approximate — confirm on official site): ${c.fees_approx}`,
    `Scholarships: ${c.scholarships}`,
    `Highlights: ${c.highlights}`,
    `Admission route: ${c.admission_route}`,
    `Official site: ${c.official_url}`,
  ].join('\n')).join('\n\n');
  const note = meta.disclaimer
    ? `\n\nNOTE: ${meta.disclaimer}`
    : '';
  return blocks + note;
}
