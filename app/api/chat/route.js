import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  retrieveContext, retrieveJeeContext, retrieveJeeAdvancedContext,
  retrieveApeamcetContext, retrieveKcetContext, retrieveMhtcetContext,
  retrieveNextgenContext,
  JEE_SEAT_TYPE, JEE_GENDER,
  APEAMCET_CATEGORY_FIELD, KCET_CATEGORY_CODE, MHTCET_CATEGORY_CODE,
  tokenizeCollege,
} from '@/lib/rag';
import { SYSTEM_PROMPT } from '@/lib/system-prompt';
import { checkRateLimit, checkGlobalBudget, MAX_PER_HOUR, GUEST_MAX_PER_HOUR } from '@/lib/ratelimit';
import { createClient } from '@/lib/supabase/server';
import {
  rowCacheKey, getCachedRows, setCachedRows, rankBucket,
  semanticGet, semanticStore, verifyGrounded, countReject, RESHAPE_ENABLED,
  cacheMetrics,
} from '@/lib/answer-cache';
import { detectNextgen, formatNextgenContext } from '@/lib/nextgen';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'dummy-key-for-build');

// Give the on-device embedding model room to cold-start on Vercel. The first
// request on a fresh instance downloads + initializes the bge model; a short
// default timeout would kill it mid-load, so every cold request would fail.
// Warm invocations reuse the cached model and return in milliseconds.
export const maxDuration = 60;

/**
 * Call model.generateContent with retries on TRANSIENT errors (Gemini 503 "high
 * demand", 429, 500, network blips). These spikes are usually momentary, so a
 * couple of short backoffs turn a user-visible "extraction failed" into a normal
 * answer. Non-transient errors (bad request, auth) throw immediately.
 */
async function generateWithRetry(model, prompt, { attempts = 3, baseDelayMs = 400 } = {}) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await model.generateContent(prompt);
    } catch (err) {
      lastErr = err;
      const msg = String(err?.message || '');
      const transient = /\b(503|502|500|429)\b|overloaded|high demand|unavailable|fetch failed|ECONNRESET|ETIMEDOUT/i.test(msg);
      if (!transient || i === attempts - 1) throw err;
      await new Promise((r) => setTimeout(r, baseDelayMs * (i + 1)));
    }
  }
  throw lastErr;
}

/**
 * Standardized error response.
 *
 * All non-success responses from this route share one JSON shape so the
 * frontend can switch on a stable `code`:
 *   { error: { code, message, retryAfter? } }
 *
 * @param {number} status   HTTP status code.
 * @param {string} code     stable machine-readable code (e.g. "rate_limited").
 * @param {string} message  human-readable message for display.
 * @param {object} [extra]  optional extras, e.g. { retryAfter } and headers.
 */
function errorResponse(status, code, message, extra = {}) {
  const { retryAfter, headers } = extra;
  const error = { code, message };
  if (retryAfter != null) error.retryAfter = retryAfter;
  return Response.json({ error }, { status, headers });
}

const CATEGORY_FIELD = {
  'OC':    { boys: 'oc_boys',  girls: 'oc_girls'  },
  'BC-A':  { boys: 'bca_boys', girls: 'bca_girls' },
  'BC-B':  { boys: 'bcb_boys', girls: 'bcb_girls' },
  'BC-C':  { boys: 'bcc_boys', girls: 'bcc_girls' },
  'BC-D':  { boys: 'bcd_boys', girls: 'bcd_girls' },
  'BC-E':  { boys: 'bce_boys', girls: 'bce_girls' },
  'SC-I':  { boys: 'sc1_boys', girls: 'sc1_girls' },
  'SC-II': { boys: 'sc2_boys', girls: 'sc2_girls' },
  'SC-III':{ boys: 'sc3_boys', girls: 'sc3_girls' },
  'ST':    { boys: 'st_boys',  girls: 'st_girls'  },
  'EWS':   { boys: 'ews_boys', girls: 'ews_girls' },
};

// For the "recommend colleges for my rank" path we pull the FULL eligible set
// (rank-mode) so the deterministic builder can pick the colleges whose closing
// rank is genuinely CLOSEST to the student's — a cutoff-proximity task that a
// top-K semantic search silently gets wrong (it can bury MGIT/CVR/BVRIT at rank
// ~5–7k under semantically-similar but rank-distant colleges). This bound sits
// above the largest corpus (JEE Advanced, ~18.7k rows) so every eligible row is
// returned (paged in rag.js); the answer-builder then keeps only the nearest few.
const RECOMMEND_FULL_TOPK = 20000;

// Build {college, branch, closing, phase} rows DIRECTLY from the retrieved DB
// metadata — no LLM. The closing rank is read from the real field for the
// student's exam/category/gender, so it can't be mis-transcribed. Returns [] when
// it can't map (the caller then falls back to the LLM row-extractor). This skips a
// whole Gemini call on the most common turn (the college list).
function metaToRows(exam, sources, { category, gender }) {
  if (!Array.isArray(sources) || sources.length === 0) return [];
  const cat = category ? String(category).toUpperCase() : null;
  const g = gender === 'girls' ? 'girls' : 'boys';
  const out = [];
  for (const m of sources) {
    if (!m) continue;
    let college, branch, closing, phase;
    if (exam === 'JEE' || exam === 'JEE Advanced') {
      // Row is already filtered to the student's seat type + gender → closing_rank is theirs.
      college = m.institute; branch = m.program; closing = Number(m.closing_rank); phase = m.round;
    } else if (exam === 'APEAMCET') {
      const field = APEAMCET_CATEGORY_FIELD[cat]?.[g];
      college = m.inst_name; branch = m.branch_name; closing = field ? Number(m[field]) : NaN; phase = m.phase || 'Final';
    } else if (exam === 'KCET') {
      const code = KCET_CATEGORY_CODE[cat] || null;
      college = m.college_name; branch = m.branch_name; closing = code ? Number(m[code]) : NaN; phase = m.round;
    } else if (exam === 'MHTCET') {
      const code = MHTCET_CATEGORY_CODE[cat] || null;
      college = m.college_name; branch = m.branch_name; closing = code ? Number(m[code]) : NaN; phase = m.round;
    } else {
      // TGEAPCET (default).
      const field = CATEGORY_FIELD[cat]?.[g];
      college = m.inst_name; branch = m.branch_name; closing = field ? Number(m[field]) : NaN; phase = m.phase;
    }
    if (college && branch && Number.isFinite(closing) && closing > 0) {
      out.push({
        college: String(college).trim(), branch: String(branch).trim(),
        closing: Math.trunc(closing), phase: String(phase || '').trim(),
      });
    }
  }
  return out;
}

/**
 * Semantically extract structured admission params from the full conversation.
 * Uses Gemini so it understands "backward class A", "five hundred", "she", etc.
 */
async function extractParams(history, currentMessage) {
  const historyMessages = history.filter(h => h.role === 'user').map(h =>
    h.parts.map(p => p.text || '').join(' ')
  ).join('\n');

  // JSON response mode → raw JSON (no markdown fences to strip) and a tight
  // token cap, since the output is a tiny fixed-shape object.
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.1-flash-lite',
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0,
      maxOutputTokens: 256,
    },
  });

  const prompt = `Extract admission counselling parameters from this student conversation.
Return ONLY valid JSON — no markdown, no explanation.

Earlier messages (context only):
"""
${historyMessages || '(none)'}
"""

LATEST message (AUTHORITATIVE — extract primarily from here):
"""
${currentMessage}
"""

CRITICAL — extract a DELTA, not the whole profile. Output a field's value ONLY when the LATEST message states it, changes it, or clearly refers to it (e.g. "there"/"that college" → a college named earlier; "ECE there" → branch ECE at that college). For EVERY field the latest message does not address, output null. Earlier values are already remembered by the system, so do NOT copy them into your answer — re-outputting an old exam/rank/category here would wrongly override the student's current context. If the latest message is vague (e.g. "which college should I choose?", "any suggestions?"), output all nulls.

JSON schema (null for anything not mentioned):
{
  "rank": <integer or null>,
  "exam": <"TGEAPCET" | "APEAMCET" | "JEE" | "JEE Advanced" | "KCET" | "MHTCET" | null>,
  "category": <category code or null — see per-exam rules>,
  "gender": <"boys"|"girls" | null>,
  "branch_preference": <plain English or null>,
  "location_preference": <city/district/institute name or null>,
  "target_college": <specific named college/university the student is asking the cutoff FOR, or null>,
  "intent": <"list_colleges" | "advice" | "college_lookup" | "general_info" | "off_topic" | "smalltalk" | null>
}

Intent — classify what the LATEST message is asking for (always set it; null only if truly unclear):
- "list_colleges" — wants the college/options list for their profile, or is giving/refining profile details to get that list (rank, category, branch, "show me", "any options?", "what can I get?").
- "advice" — wants guidance, an opinion, or a comparison that depends on THEIR rank/profile: "CSE or ECE for my rank — which is better?", "is NIT Warangal good for me?", "should I prefer branch or college?".
- "college_lookup" — asks the cutoff/admission of ONE specific named college (pairs with target_college).
- "general_info" — a GENERAL question about the admission process or exams whose answer does NOT depend on the student's own rank/category: "what is JoSAA?", "how does TGEAPCET counselling work?", "what documents do I need?", "what is a spot round?", "explain the rounds".
- "off_topic" — unrelated to engineering admissions (weather, math, coding, recipes, general knowledge).
- "smalltalk" — greeting, thanks, or asking who/what you are.

Exam mapping:
- "eamcet / eapcet / tgeapcet / Telangana EAPCET" → "TGEAPCET"
- "apeamcet / ap eapcet / ap eamcet / Andhra Pradesh EAPCET" → "APEAMCET"
- "jee main / mains / josaa / nit / iiit / gfti / mains rank" → "JEE"
- "jee advanced / advanced / iit (admission) / CRL advanced" → "JEE Advanced"
- "kcet / kea / karnataka cet / Karnataka CET" → "KCET"
- "mht-cet / mhtcet / maharashtra cet / cap round" → "MHTCET"

Category mapping when exam is TGEAPCET (Telangana categories):
- "backward class A / BC-A / BCA" → "BC-A" (same for B C D E)
- "scheduled caste / SC" → "SC-I" unless II or III specified
- "scheduled tribe / ST / tribal" → "ST"
- "general / open / unreserved" → "OC"
- "EWS / economically weaker" → "EWS"

Category mapping when exam is APEAMCET (Andhra Pradesh categories):
- "backward class A / BC-A / BCA" → "BC-A" (same for B C D E)
- "scheduled caste / SC" → "SC"; "scheduled tribe / ST" → "ST"
- "general / open / unreserved" → "OC"; "EWS" → "EWS"

Category mapping when exam is JEE or JEE Advanced (JoSAA seat types):
- "general / open / unreserved / OC" → "OPEN"
- "OBC / OBC-NCL / backward" → "OBC-NCL"
- "SC" → "SC"; "ST" → "ST"; "EWS" → "EWS"

Category mapping when exam is KCET (Karnataka categories):
- "general / GM / open" → "GENERAL"
- "category 1 / cat-1 / 1" → "1"
- "2A / 2B / 3A / 3B" → that exact code
- "SC" → "SC"; "ST" → "ST"

Category mapping when exam is MHTCET (Maharashtra categories):
- "general / open" → "GENERAL"
- "OBC" → "OBC"; "SC" → "SC"; "ST" → "ST"; "EWS" → "EWS"
- "VJ / VJNT" → "VJ"; "NT1 / NT-B" → "NT1"; "NT2 / NT-C" → "NT2"; "NT3 / NT-D" → "NT3"; "SEBC" → "SEBC"

target_college vs location_preference (IMPORTANT — keep them distinct):
- "target_college" → set ONLY when the student asks about ONE specific named college/university's cutoff or admission, e.g. "what's the CSE cutoff at JNTU Kakinada", "can I get into NIT Warangal", "last rank for Andhra University". Copy the institute/university name as written (keep the short common form, e.g. "JNTU Kakinada", "NIT Warangal").
- "location_preference" → a soft area/type preference for RECOMMENDATIONS, e.g. "colleges near Hyderabad", "somewhere in Guntur", "prefer government colleges". NOT a specific institution.
- If the student names a specific college AND it's clearly the thing they want the cutoff for, fill target_college (you may leave location_preference null).
- ANAPHORA: if the latest message refers back to a college named earlier in the conversation ("there", "that college", "same college", "what about ECE there"), resolve it and fill target_college with that earlier college's name.

IMPORTANT: return ONE single JSON object for the student's CURRENT intent — never an array, never one object per message.

Other:
- "girl / female / she / woman" → "girls"; "boy / male / he / man" → "boys"
- JoSAA seat-type wording for JEE / JEE Advanced: "gender-neutral / gender neutral / GN / neutral seat / open seat" → "boys" (the Gender-Neutral pool); "female-only / female only / supernumerary female" → "girls". Treat these as the gender field, never the category.
- "five hundred" → 500; "1000" → 1000
- Expand branch abbreviations: "CSE" → "Computer Science", "ECE" → "Electronics and Communication", "EEE" → "Electrical and Electronics", "ME" or "Mech" → "Mechanical Engineering", "IT" → "Information Technology".`;

  try {
    const result = await generateWithRetry(model, prompt);
    // JSON mode returns clean JSON; keep a defensive fence-strip just in case.
    const text = result.response.text().trim()
      .replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    let parsed = JSON.parse(text);
    // Defensive: the model occasionally returns an ARRAY (one object per turn)
    // instead of a single object. Spreading that into the profile would corrupt
    // it with numeric keys ('0', '1', …), so collapse to the latest entry.
    if (Array.isArray(parsed)) parsed = parsed[parsed.length - 1];
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

/** True when the profile already has everything retrieval needs (so we can skip
 *  re-running the LLM extractor on a pure follow-up). */
function isProfileComplete(p) {
  if (!p || !p.exam || p.rank == null || !p.category) return false;
  const genderMatters = p.exam !== 'KCET' && p.exam !== 'MHTCET';
  return genderMatters ? !!p.gender : true;
}

// A message "might change the profile" if it mentions a number or any exam /
// category / branch / location keyword. Pure follow-ups ("show the list", "any
// city is fine") match nothing here, so we reuse the known profile and skip a
// whole Gemini extraction round-trip.
const CHANGE_RE = /\d|\b(eamcet|eapcet|tgeapcet|apeamcet|jee|josaa|nit|iit|iiit|gfti|advanced|kcet|kea|mht|cet|cap|oc|obc|sc|st|ews|bc|gm|general|open|reserv|boy|girl|male|female|she|he|rank|cse|ece|mech|civil|eee|branch|college|university|city|district|location|near|prefer)\b/i;
function looksLikeChange(msg) {
  return CHANGE_RE.test(String(msg || ''));
}

// A "plain follow-up": the WHOLE message is a short, unmistakable continuation
// that can only mean "give me the colleges for my existing profile" — "yes",
// "show the list", "more options", "any safe ones?". Used purely to skip the
// extractor's intent-classification call on these (a latency/cost fast path).
// Anchored ^…$ on purpose: a message that merely CONTAINS a follow-up word ("give
// me a recipe") must NOT match, or it would skip classification and wrongly get a
// college dump. False negatives here are harmless — they just run the (cheap)
// extractor, which still classifies intent correctly — so this stays strict.
const FOLLOWUP_RE = /^\s*(?:(?:yes|yeah|yep|yup|sure|ok|okay|kk?|fine|please|pls|thanks|thank you|go ahead|continue|proceed|go on|next|and\??|more|any more|others?|other options|show|show me|show the list|see more|list( them)?|the list|options|any options|safe( ones| colleges)?|borderline( ones| colleges)?|reach( ones| colleges)?|recommend( some)?|which( ones)?)[\s,.!?]*)+$/i;
function looksLikeFollowUp(msg) {
  return FOLLOWUP_RE.test(String(msg || ''));
}

// Cap the message we accept — a multi-MB body would blow up tokens/memory/cost.
const MAX_MESSAGE_CHARS = 8000;
const MAX_HISTORY_ITEMS = 100;

/**
 * Trusted client IP. The leftmost x-forwarded-for entry is client-CLAIMED and
 * spoofable; rate-limiting on it lets a caller mint unlimited guest buckets.
 * Prefer the platform-set `x-real-ip`, else the LAST (closest-proxy) hop.
 */
function clientIp(req) {
  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const hops = xff.split(',').map(s => s.trim()).filter(Boolean);
    if (hops.length) return hops[hops.length - 1];
  }
  return 'unknown';
}

// `priorParams` comes from the client, so never trust its shape: whitelist the
// fields and bound the values before they reach retrieval / the cache key.
const VALID_EXAMS = new Set(['TGEAPCET', 'APEAMCET', 'JEE', 'JEE Advanced', 'KCET', 'MHTCET']);
const VALID_GENDERS = new Set(['boys', 'girls']);
function sanitizeParams(p) {
  if (!p || typeof p !== 'object') return {};
  const out = {};
  if (typeof p.exam === 'string' && VALID_EXAMS.has(p.exam)) out.exam = p.exam;
  const rank = typeof p.rank === 'number' ? Math.trunc(p.rank) : NaN;
  if (Number.isFinite(rank) && rank > 0 && rank <= 5_000_000) out.rank = rank;
  if (typeof p.category === 'string' && p.category.length > 0 && p.category.length <= 16) out.category = p.category;
  if (typeof p.gender === 'string' && VALID_GENDERS.has(p.gender)) out.gender = p.gender;
  if (typeof p.branch_preference === 'string' && p.branch_preference.length <= 120) out.branch_preference = p.branch_preference;
  if (typeof p.location_preference === 'string' && p.location_preference.length <= 120) out.location_preference = p.location_preference;
  if (typeof p.target_college === 'string' && p.target_college.length > 0 && p.target_college.length <= 120) out.target_college = p.target_college;
  return out;
}

// Build the final college answer DETERMINISTICALLY from model-extracted rows.
// Classification, the "5 nearest to the rank" selection, and formatting all
// happen here in code — so Safe/Borderline is never mis-judged by the model.
//   Safe       = closing rank >= 1.2× the student's rank (comfortably within).
//   Borderline = closing rank in [0.85×, 1.2×) the rank (near / just-short).
//   (closing < 0.85× rank is dropped — too far below to be relevant.)
// Closing ranks above this are data artifacts — e.g. a source-parsing glitch
// that yields an 8-digit rank (we've seen ~11,000,000). No real exam admits at a
// rank this high (JEE Main, the largest, has on the order of ~1.5M candidates),
// so such rows are dropped before classification to keep them from surfacing as
// bogus "safe" options for an impossibly high rank.
const MAX_SANE_CLOSING = 2_000_000;

// Normalize model-extracted rows into clean {college, branch, closing, phase}.
function normalizeRows(rows) {
  return (Array.isArray(rows) ? rows : [])
    .map((r) => ({
      college: String(r?.college || '').trim(),
      branch: String(r?.branch || '').trim(),
      closing: Math.trunc(Number(r?.closing)),
      phase: String(r?.phase || '').trim(),
    }))
    .filter((r) => r.college && Number.isFinite(r.closing) && r.closing > 0 && r.closing <= MAX_SANE_CLOSING);
}

// Branch filter — keeps only the BEST-matching branch tier. We score each row by
// how many distinct query tokens its branch name contains and keep just the top
// scorers, so "Electronics and Communication" (ECE) keeps ECE rows (2 hits) over
// "Electrical and Electronics" (EEE) rows that merely share "electronics" (1).
// Falls back to the full list if nothing matches, so a typo never blanks it.
function filterByBranch(items, branchPref) {
  if (!branchPref) return items;
  const toks = (branchPref.toLowerCase().match(/[a-z]{3,}/g) || [])
    .filter((t) => !['and', 'the', 'engineering', 'branch', 'prefer', 'preferred'].includes(t));
  if (!toks.length) return items;
  let best = 0;
  const scored = items.map((r) => {
    const b = r.branch.toLowerCase();
    const score = toks.reduce((n, t) => n + (b.includes(t) ? 1 : 0), 0);
    if (score > best) best = score;
    return { r, score };
  });
  if (best === 0) return items;
  return scored.filter((x) => x.score === best).map((x) => x.r);
}

function buildCollegeAnswer(rows, { rank, catLabel, branchPref, locationPref }) {
  let items = filterByBranch(normalizeRows(rows), branchPref);

  // Optional loose location filter — only if it leaves something to show.
  if (locationPref) {
    const toks = (locationPref.toLowerCase().match(/[a-z]{3,}/g) || [])
      .filter((t) => !['and', 'the', 'college', 'university', 'institute', 'technology', 'prefer', 'preferred', 'location', 'city', 'near', 'iit', 'nit', 'iiit'].includes(t));
    if (toks.length) {
      const matched = items.filter((r) => {
        const c = r.college.toLowerCase();
        return toks.every((t) => c.includes(t));
      });
      if (matched.length) items = matched;
    }
  }

  // Dedupe by college+branch, keeping the entry closest to the rank.
  const seen = new Map();
  for (const r of items) {
    const key = `${r.college}|${r.branch}`.toLowerCase();
    const prev = seen.get(key);
    if (!prev || Math.abs(r.closing - rank) < Math.abs(prev.closing - rank)) seen.set(key, r);
  }
  const uniq = [...seen.values()];

  const safeCut = rank * 1.2;
  const lowCut = rank * 0.85;
  const safe = uniq
    .filter((r) => r.closing >= safeCut)
    .sort((a, b) => a.closing - b.closing) // nearest-above first
    .slice(0, 5);
  const border = uniq
    .filter((r) => r.closing >= lowCut && r.closing < safeCut)
    .sort((a, b) => Math.abs(a.closing - rank) - Math.abs(b.closing - rank))
    .slice(0, 5);

  const rankStr = rank.toLocaleString('en-IN');
  // Nothing survived extraction + filtering (empty extraction, or branch/location/
  // sane-rank filters removed everything). Return null so the caller falls through
  // to the conversational model rather than emitting a hard error or empty table.
  if (items.length === 0) {
    return null;
  }
  if (!safe.length && !border.length) {
    if (uniq.length > 0) {
      // Find the college with the closing rank closest to the user's rank
      const closest = uniq.reduce((prev, curr) => (Math.abs(curr.closing - rank) < Math.abs(prev.closing - rank) ? curr : prev));
      return `**No**, based on the latest data, your rank of ${rankStr} (${catLabel}) is too high for the specific colleges or branches you asked about.\n\nFor reference, the closest match found was **${closest.college}** (${closest.branch}), which closed at a rank of **${closest.closing.toLocaleString('en-IN')}**.\n\nI recommend broadening your search preferences to find safer options.`;
    }
    return `It looks like I couldn't find any colleges matching your exact rank of ${rankStr} (${catLabel}) in my current records. But don't worry! This might just mean we need to broaden our search. Try exploring a different branch, location, or double-checking your rank to see more options.`;
  }

  const table = (list) => [
    `| Institute/College | Program/Branch | Closing/Last Rank (${catLabel}) | Phase/Round |`,
    '| :--- | :--- | :--- | :--- |',
    ...list.map((r) => `| ${r.college} | ${r.branch} | ${r.closing.toLocaleString('en-IN')} | ${r.phase || '—'} |`),
  ].join('\n');

  const total = safe.length + border.length;
  const parts = [
    `Here ${total === 1 ? 'is the college' : `are the ${total} colleges`} closest to your rank of ${rankStr} (${catLabel}):`,
    '',
    '### 🟢 Safe colleges',
    safe.length ? table(safe) : '_No safe colleges found near your rank in our current records._',
    '',
    '### 🟡 Borderline colleges',
    border.length ? table(border) : '_No borderline colleges found in our current records for this profile._',
    '',
    '_Based on the most recent available data; future cutoffs may differ._',
  ];
  return parts.join('\n');
}

// Build the answer for a NAMED-COLLEGE lookup ("what's the CSE cutoff at JNTU
// Kakinada"). Unlike buildCollegeAnswer this does NOT gate by the student's rank
// or split Safe/Borderline — it simply reports the named college's actual
// cutoffs (best/lowest per branch), sorted by closing rank.
function buildLookupAnswer(rows, { catLabel, collegeName, branchPref, rank }) {
  const items = filterByBranch(normalizeRows(rows), branchPref);
  if (items.length === 0) {
    return `I couldn't find ${branchPref ? `${branchPref} ` : ''}seats at "${collegeName}" in the most recent available records. Double-check the college name or branch, or I can list options near your rank instead.`;
  }

  // One row per college+branch — keep the best (lowest) closing rank.
  const seen = new Map();
  for (const r of items) {
    const key = `${r.college}|${r.branch}`.toLowerCase();
    const prev = seen.get(key);
    if (!prev || r.closing < prev.closing) seen.set(key, r);
  }

  // The institute filter also matches on shared AFFILIATION (so "JNTU Kakinada"
  // finds JNTUK colleges), which means a university-name query pulls in every
  // affiliated college too. Sorting by closing rank ascending naturally floats
  // the flagship/constituent campus to the top — it has the most competitive
  // (lowest) cutoff in its affiliation group — without brittle name matching.
  const uniq = [...seen.values()].sort((a, b) => a.closing - b.closing).slice(0, 12);

  // Honest framing: if several DISTINCT colleges match the name, say so rather
  // than implying they're all one campus.
  const distinctColleges = new Set(uniq.map((r) => r.college.toLowerCase())).size;
  const heading = distinctColleges > 1
    ? `Here are ${branchPref ? branchPref + ' ' : ''}options matching **${collegeName}** (${catLabel}), closest cutoffs first:`
    : `Here ${uniq.length === 1 ? 'is the cutoff' : 'are the cutoffs'} for **${collegeName}** (${catLabel}), based on the most recent available data:`;

  // Direct yes/no verdict when the student's rank is known — a "can I get into X?"
  // question deserves an answer, not just a cutoff table. A seat is reachable when
  // its closing rank is numerically >= the student's rank.
  let verdict = '';
  if (Number.isFinite(rank) && rank > 0) {
    const rankStr = Math.trunc(rank).toLocaleString('en-IN');
    const reachable = uniq.filter((r) => r.closing >= rank);
    if (reachable.length) {
      verdict = `**Yes — a rank of ${rankStr} (${catLabel}) is within reach at ${collegeName}.** ${reachable.length === 1 ? 'One option below closes' : `${reachable.length} of the options below close`} at or above your rank.\n\n`;
    } else {
      const best = uniq[uniq.length - 1].closing; // most lenient (highest) closing
      verdict = `**No — a rank of ${rankStr} (${catLabel}) is out of reach at ${collegeName}** on the latest data. Even its most lenient ${branchPref ? branchPref + ' ' : ''}cutoff closes at **${best.toLocaleString('en-IN')}** (a numerically lower — tougher — rank than yours). The cutoffs are below for reference.\n\n`;
    }
  }

  const table = [
    `| Institute/College | Program/Branch | Closing/Last Rank (${catLabel}) | Phase/Round |`,
    '| :--- | :--- | :--- | :--- |',
    ...uniq.map((r) => `| ${r.college} | ${r.branch} | ${r.closing.toLocaleString('en-IN')} | ${r.phase || '—'} |`),
  ].join('\n');

  return [
    verdict + heading,
    '',
    table,
    '',
    '_A lower closing rank means tougher admission; future cutoffs may differ._',
  ].join('\n');
}

export async function POST(req) {
  try {
    const t0 = Date.now();
    const timing = process.env.CHAT_TIMING === '1';
    const marks = {};
    const mark = (name) => { if (timing) marks[name] = Date.now() - t0; };

    // 1. Parse the body FIRST so we can start the (slow) Gemini param extraction
    //    in parallel with the auth + rate-limit round-trips.
    let message, history, priorParams;
    try {
      ({ message, history, priorParams } = await req.json());
    } catch {
      return errorResponse(400, 'invalid_request', 'Invalid request body.');
    }
  if (!message?.trim()) {
    return errorResponse(400, 'missing_message', 'Message is required.');
  }
  if (message.length > MAX_MESSAGE_CHARS) {
    return errorResponse(400, 'message_too_long', `Message too long (max ${MAX_MESSAGE_CHARS} characters).`);
  }
  if (Array.isArray(history) && history.length > MAX_HISTORY_ITEMS) {
    history = history.slice(-MAX_HISTORY_ITEMS);
  }

  // Validate + whitelist client-supplied params before they touch retrieval/cache.
  const prior = sanitizeParams(priorParams);

  // Re-run the LLM extractor when it can change something OR when we need it to
  // judge intent. We skip it (reuse the known profile, save a Gemini call) ONLY
  // for a clear in-domain follow-up on an already-complete profile ("show the
  // list", "yes", "any options?") — those always mean "give the colleges". Any
  // other message on a complete profile (a profile change, an advice question, or
  // something off-topic) goes through the extractor so `intent` is classified.
  // Cap the history we feed the models to the last few turns (cost + latency).
  const HISTORY_WINDOW = 10;
  const recentHistory = Array.isArray(history) ? history.slice(-HISTORY_WINDOW) : [];
  const isPlainFollowUp = isProfileComplete(prior) && !looksLikeChange(message) && looksLikeFollowUp(message);
  const shouldExtract = !isPlainFollowUp;
  const extractPromise = shouldExtract
    ? extractParams(recentHistory, message)
    : Promise.resolve({});

  // 2. Auth + rate-limit — run WHILE extraction is in flight.
  let userId = null;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    // Anonymous / auth lookup failed — fall through to IP keying.
  }
  mark('auth');

  const rateKey = userId || `ip:${clientIp(req)}`;
  const maxPerHour = userId ? MAX_PER_HOUR : GUEST_MAX_PER_HOUR;
  // maxPerHour <= 0 means "no limit" (guest cap is currently disabled).
  const { allowed, retryAfter, remaining } = maxPerHour > 0
    ? await checkRateLimit(rateKey, maxPerHour)
    : { allowed: true, retryAfter: 0, remaining: null };
  mark('ratelimit');
  if (!allowed) {
    const limitMsg = userId
      ? 'Rate limit exceeded. Try again in 1 hour.'
      : `Guest message limit reached (${GUEST_MAX_PER_HOUR}/hour). Sign in to send more, or try again in 1 hour.`;
    return errorResponse(429, 'rate_limited', limitMsg, {
      retryAfter,
      headers: { 'Retry-After': String(retryAfter) },
    });
  }

  // Global circuit-breaker: cap total daily LLM calls so a spike (or abuse that
  // slips past per-key limits) can't run up an unbounded Gemini bill.
  const budget = await checkGlobalBudget();
  if (!budget.allowed) {
    return errorResponse(503, 'service_busy', 'We are experiencing high demand right now. Please try again shortly.');
  }

  // 3. Resolve params: merge so known fields persist across turns — a field the
  //    user already gave is never re-asked, and the exam isn't lost when the
  //    topic shifts. (extractPromise resolved to {} when extraction was skipped.)
  const params = await extractPromise;
  mark('extract');
  // Pull the LLM's intent classification out of the delta — it describes the
  // latest message, it's not a profile field, so it must not be merged into
  // `resolved` (that would leak it into retrieval keys + the X-Chat-Params
  // header). Null when extraction was skipped (a plain follow-up → list intent).
  const intent = params && typeof params.intent === 'string' ? params.intent : null;
  if (params && 'intent' in params) delete params.intent;
  // EXAM SWITCH: if the new message names a different exam, the old exam's
  // rank/category/gender no longer apply (a KCET rank isn't a TGEAPCET rank, and
  // category codes differ per exam). Start fresh from the new params instead of
  // inheriting stale fields. Compared case-insensitively since `params.exam` may
  // not be normalized to the enum yet.
  const examChanged = params?.exam && prior.exam &&
    String(params.exam).toLowerCase().replace(/[^a-z]/g, '') !== String(prior.exam).toLowerCase().replace(/[^a-z]/g, '');
  const resolved = examChanged ? {} : { ...prior };
  for (const [k, v] of Object.entries(params || {})) {
    if (v != null) resolved[k] = v;
  }
  
  // Normalize exam if the LLM output a raw string instead of the enum
  if (typeof resolved.exam === 'string' && !VALID_EXAMS.has(resolved.exam)) {
    const e = resolved.exam.toLowerCase();
    if (e.includes('jee') || e.includes('josaa') || e.includes('nit') || e.includes('mains')) {
      resolved.exam = e.includes('advanced') ? 'JEE Advanced' : 'JEE';
    } else if (e.includes('ap eamcet') || e.includes('apeamcet')) {
      resolved.exam = 'APEAMCET';
    } else if (e.includes('kcet') || e.includes('kea')) {
      resolved.exam = 'KCET';
    } else if (e.includes('mht')) {
      resolved.exam = 'MHTCET';
    } else {
      resolved.exam = 'TGEAPCET';
    }
  }

  if (typeof resolved.category === 'string') {
    resolved.category = resolved.category.toUpperCase();
    if ((resolved.exam === 'JEE' || resolved.exam === 'JEE Advanced') && JEE_SEAT_TYPE[resolved.category]) {
      resolved.category = JEE_SEAT_TYPE[resolved.category];
    }
  }
  if (typeof resolved.gender === 'string') resolved.gender = resolved.gender.toLowerCase();

  // Deterministic gender backstop for JEE/JoSAA: the extractor sometimes drops
  // "gender-neutral"/"female-only" (JoSAA seat-type wording, not boy/girl), which
  // would leave gender null and silently block the complete-profile path. Infer
  // it from the raw message when the LLM didn't, so a JoSAA-phrased query still
  // resolves. (boys = Gender-Neutral pool, girls = Female-only pool.)
  if ((resolved.exam === 'JEE' || resolved.exam === 'JEE Advanced') && !resolved.gender) {
    const m = String(message).toLowerCase();
    if (/\bfemale[\s-]*only\b|supernumerary/.test(m)) resolved.gender = 'girls';
    else if (/\bgender[\s-]*neutral\b|\bgn\b|\bneutral seat\b/.test(m)) resolved.gender = 'boys';
  }

  // UNSTICK a named-college lookup. We persist target_college across turns so a
  // "Can I get into IIT Bombay?" question can finish over several messages (it
  // only triggers the lookup once category/gender are in). But once the student
  // moves on to a general search, the inherited target must drop — otherwise
  // every later turn keeps answering about that one college. Clear it when the
  // current message brought no new target AND its intent is a general list/advice
  // ask that explicitly broadens away from the specific college.
  if (!params?.target_college && resolved.target_college &&
      (intent === 'list_colleges' || intent === 'advice') &&
      /\b(other|others|else|elsewhere|general|broaden|broader|different|instead|any college|other colleges|other options|more options|what else)\b/i.test(message)) {
    resolved.target_college = null;
  }

  const { rank, exam, category, gender, branch_preference, location_preference, target_college } = resolved;

  // NAMED-COLLEGE LOOKUP: when the student asks about a specific institute (e.g.
  // "CSE cutoff at JNTU Kakinada") we hard-filter retrieval to that college via
  // inst_tokens AND drop the rank-eligibility gate — so the college's true
  // cutoff surfaces regardless of the student's own rank. Needs an exam (to pick
  // the table) and at least one distinctive token from the name.
  const instTokens = (target_college && exam) ? tokenizeCollege(target_college) : null;
  // A named college triggers lookup INTENT (drop the rank gate, bias retrieval to
  // that college) even when it yields no hard tokens — e.g. "RV College" → only
  // the 2-char "rv", which we don't hard-filter on. Without tokens we lean on the
  // semantic query (which includes the college name) instead of the SQL filter.
  const lookupActive = !!target_college && !!exam;

  const hasRank = rank != null;
  // Gender is a cutoff axis for the state EAMCET-style exams and JoSAA (female-only
  // seats), but NOT for KCET / MHT-CET (their category codes are gender-neutral).
  const genderMatters = exam !== 'KCET' && exam !== 'MHTCET';
  const hasAllRequired = hasRank && !!category && (genderMatters ? !!gender : true);

  console.log("RESOLVED:", resolved, "HAS_ALL_REQUIRED:", hasAllRequired);

  // Eligibility filters keep only colleges whose closing rank ≥ this bound. We
  // widen it ~15% below the student's true rank so the corpus also includes
  // options the student is *just* short of — these become the "Borderline"
  // section. The model still classifies against the TRUE rank (sent in the
  // message), so Safe vs Borderline stays accurate.
  let retrievalMinRank = (hasRank && !location_preference) ? Math.max(1, Math.floor(rank * 0.85)) : null;

  // Header value shared by every successful response (streaming + cache hit).
  const paramsHeader = encodeURIComponent(JSON.stringify(resolved));
  const successHeaders = (extra = {}) => {
    const h = { 'X-Chat-Params': paramsHeader, ...extra };
    if (remaining != null) h['X-RateLimit-Remaining'] = String(remaining);
    return h;
  };

  // 4. (Response cache removed — every turn is generated fresh so answers always
  //    reflect the latest data + prompt/classification logic.)

  // 5. Decide retrieval strategy (exam-aware). Each exam has its own Supabase
  //    table + retriever; when all eligibility params are known we filter the
  //    corpus hard (rank/category) before similarity ranking, otherwise we fall
  //    back to a plain semantic lookup so the model can still ground its reply.
  let contextBlock = '';
  // Set when retrieval THREW (e.g. the embedding step failed) — distinct from a
  // clean empty result. An infra failure must not be reported to the student as
  // "no colleges match your rank"; we surface a transient-error message instead.
  let retrievalFailed = false;
  // Structured metadata of the retrieved rows (parallel to contextBlock). Lets the
  // deterministic path build the college rows directly from real DB fields and skip
  // the row-extraction LLM call entirely (it falls back to extraction if empty).
  let retrievedSources = null;
  let contextLabel = 'TGEAPCET official data — eligible colleges only';
  const prefParts = [];
  if (branch_preference) prefParts.push(branch_preference);
  if (location_preference) prefParts.push(location_preference);

  // INTENT-DRIVEN ROUTING (replaces the old keyword heuristics): the extractor
  // classifies the latest message, so we can tell "what's the capital of France?"
  // (off-topic) and "CSE or ECE — which is better?" (advice) apart from "show me
  // the colleges" (list) reliably, instead of guessing from keywords.
  //   • OFF-TOPIC → skip retrieval; the conversational model declines & steers
  //     back per the system prompt (no college list dumped for unrelated asks).
  //   • ADVICE → still retrieve (so the model can ground its guidance in real
  //     cutoffs) but route to the conversational model instead of the
  //     deterministic Safe/Borderline table, so it actually answers the question.
  // A clear follow-up skips extraction (intent === null) → defaults to listing.
  const offTopic = (intent === 'off_topic' || intent === 'smalltalk') && !lookupActive;
  const wantsAdvice = intent === 'advice' && !lookupActive;
  // A general process/exam question ("what is JoSAA?") doesn't depend on the
  // student's rank and needs no college retrieval — route it to the conversational
  // model (where Tier-2 cache applies) instead of a Safe/Borderline table.
  const generalInfo = intent === 'general_info' && !lookupActive;

  // NEXT-GEN COLLEGES: questions about NIAT / Scaler / Polaris / Newton / Plaksha
  // (which admit via their OWN process, not JoSAA/state counselling) are answered
  // from verified, sourced data injected as grounding — never the rank-cutoff path.
  const ng = detectNextgen(message);
  let nextgenContext = '';
  if (ng.colleges.length) {
    // Prefer the ingested DB (semantic match over the embeddings); fall back to the
    // local JSON if the table/RPC isn't available. Both hold the same sourced data.
    try {
      const key = ng.colleges.length === 1 ? ng.colleges[0].key : null;
      const { contextBlock } = await retrieveNextgenContext(message, 5, key);
      nextgenContext = contextBlock || formatNextgenContext(ng.colleges);
    } catch {
      nextgenContext = formatNextgenContext(ng.colleges);
    }
  }

  // TIER-1 CACHE: the deterministic "recommend colleges for my rank" path caches
  // the extracted rows keyed by exam/category/gender/branch/rank-bucket. A later
  // user in the same bucket reuses the real rows, and buildCollegeAnswer
  // re-classifies Safe/Borderline against THEIR exact rank — pure code, so no
  // hallucination. A hit skips retrieval AND the extraction LLM call.
  const recommendDeterministic = !wantsAdvice && !generalInfo && !offTopic && !nextgenContext && hasAllRequired && !lookupActive
    && hasRank && !location_preference;
  const rowKey = recommendDeterministic
    ? rowCacheKey({ exam, category, gender, branchPref: branch_preference, rank })
    : null;
  const cachedRows = rowKey ? await getCachedRows(rowKey) : null;
  // On a miss we'll populate the bucket — retrieve from the bucket's BEST rank so
  // the cached candidate set is a superset for every (higher) rank in the bucket.
  if (recommendDeterministic && !cachedRows) {
    retrievalMinRank = Math.max(1, Math.floor(rankBucket(rank).low * 0.85));
  }

  try {
    if (offTopic || generalInfo || nextgenContext || cachedRows) {
      // Skip cutoff retrieval: off-topic → deflection; general_info → rank-
      // independent answer; nextgenContext → answered from injected next-gen data;
      // cachedRows → Tier-1 hit (deterministic block uses the cached rows).
    } else if (exam === 'JEE' || exam === 'JEE Advanced') {
      const isAdv = exam === 'JEE Advanced';
      const retrieve = isAdv ? retrieveJeeAdvancedContext : retrieveJeeContext;
      const label = isAdv ? 'JEE Advanced' : 'JEE Main JoSAA';
      contextLabel = isAdv
        ? 'JEE Advanced (IIT) official data — eligible programs only'
        : 'JEE Main JoSAA official data — eligible programs only';
      if (lookupActive) {
        const seatType = category ? (JEE_SEAT_TYPE[String(category).toUpperCase()] || null) : null;
        const genderVal = gender ? (JEE_GENDER[gender] ?? null) : null;
        const parts = [label, target_college, category, gender, branch_preference, 'closing rank'].filter(Boolean);
        ({ contextBlock, sources: retrievedSources } = await retrieve(parts.join(' '), 40, { instTokens, seatType, gender: genderVal }));
      } else if (hasAllRequired) {
        const seatType = JEE_SEAT_TYPE[String(category).toUpperCase()] || null;
        const genderVal = JEE_GENDER[gender] ?? null;
        const parts = [label, category, gender, `rank ${rank}`, 'eligible colleges closing rank', ...prefParts];
        const queryStr = parts.filter(Boolean).length > 1 ? parts.filter(Boolean).join(' ') + ' ' + message : message;
        ({ contextBlock, sources: retrievedSources } = await retrieve(queryStr, RECOMMEND_FULL_TOPK, { rank: retrievalMinRank, seatType, gender: genderVal, rankMode: true }));
        if (!contextBlock) {
          ({ contextBlock, sources: retrievedSources } = await retrieve(queryStr, RECOMMEND_FULL_TOPK, { rank: null, seatType, gender: genderVal, rankMode: true }));
        }
      } else if (!hasRank) {
        const parts = [label, category, gender, ...prefParts];
        const query = parts.filter(Boolean).length > 1 ? parts.filter(Boolean).join(' ') + ' ' + message : message;
        ({ contextBlock, sources: retrievedSources } = await retrieve(query, 6));
      }
    } else if (exam === 'APEAMCET') {
      contextLabel = 'APEAMCET (AP EAPCET) official last-rank data — eligible colleges only';
      if (lookupActive) {
        const parts = ['APEAMCET 2022', target_college, category, gender, branch_preference, 'last rank'].filter(Boolean);
        ({ contextBlock, sources: retrievedSources } = await retrieveApeamcetContext(parts.join(' '), 40, null, { instTokens }));
      } else if (hasAllRequired) {
        const fieldName = APEAMCET_CATEGORY_FIELD[category]?.[gender];
        const whereFilter = fieldName ? { [fieldName]: { '$gte': retrievalMinRank } } : null;
        const fallbackFilter = fieldName ? { [fieldName]: { '$gte': 1 } } : null;
        const parts = ['APEAMCET 2022', category, gender, `rank ${rank}`, 'eligible colleges last rank', ...prefParts];
        const queryStr = parts.filter(Boolean).length > 1 ? parts.filter(Boolean).join(' ') + ' ' + message : message;
        ({ contextBlock, sources: retrievedSources } = await retrieveApeamcetContext(queryStr, RECOMMEND_FULL_TOPK, whereFilter, { rankMode: true }));
        if (!contextBlock) {
          ({ contextBlock, sources: retrievedSources } = await retrieveApeamcetContext(queryStr, RECOMMEND_FULL_TOPK, fallbackFilter, { rankMode: true }));
        }
      } else if (!hasRank) {
        const parts = ['APEAMCET 2022', category, gender, ...prefParts];
        const query = parts.filter(Boolean).length > 1 ? parts.filter(Boolean).join(' ') + ' ' + message : message;
        ({ contextBlock, sources: retrievedSources } = await retrieveApeamcetContext(query, 6));
      }
    } else if (exam === 'KCET') {
      contextLabel = 'KCET Engineering official cutoff data — eligible colleges only';
      if (lookupActive) {
        const parts = ['KCET 2024 Engineering', target_college, category, branch_preference, 'closing rank'].filter(Boolean);
        ({ contextBlock, sources: retrievedSources } = await retrieveKcetContext(parts.join(' '), 40, { instTokens }));
      } else if (hasAllRequired) {
        const code = KCET_CATEGORY_CODE[String(category).toUpperCase()] || null;
        const parts = ['KCET 2024 Engineering', category, `rank ${rank}`, 'eligible colleges closing rank', ...prefParts];
        const queryStr = parts.filter(Boolean).length > 1 ? parts.filter(Boolean).join(' ') + ' ' + message : message;
        ({ contextBlock, sources: retrievedSources } = await retrieveKcetContext(queryStr, RECOMMEND_FULL_TOPK, { rankField: code, rank: retrievalMinRank, rankMode: true }));
        if (!contextBlock) {
          ({ contextBlock, sources: retrievedSources } = await retrieveKcetContext(queryStr, RECOMMEND_FULL_TOPK, { rankField: code, rank: null, rankMode: true }));
        }
      } else if (!hasRank) {
        const parts = ['KCET 2024 Engineering', category, ...prefParts];
        const query = parts.filter(Boolean).length > 1 ? parts.filter(Boolean).join(' ') + ' ' + message : message;
        ({ contextBlock, sources: retrievedSources } = await retrieveKcetContext(query, 6));
      }
    } else if (exam === 'MHTCET') {
      contextLabel = 'MHT-CET Engineering official cutoff data — eligible colleges only';
      if (lookupActive) {
        const parts = ['MHT-CET 2024 Engineering', target_college, category, branch_preference, 'closing rank'].filter(Boolean);
        ({ contextBlock, sources: retrievedSources } = await retrieveMhtcetContext(parts.join(' '), 40, { instTokens }));
      } else if (hasAllRequired) {
        const code = MHTCET_CATEGORY_CODE[String(category).toUpperCase()] || null;
        const parts = ['MHT-CET 2024 Engineering', category, `CET merit number ${rank}`, 'eligible colleges closing rank', ...prefParts];
        const queryStr = parts.filter(Boolean).length > 1 ? parts.filter(Boolean).join(' ') + ' ' + message : message;
        ({ contextBlock, sources: retrievedSources } = await retrieveMhtcetContext(queryStr, RECOMMEND_FULL_TOPK, { rankField: code, rank: retrievalMinRank, rankMode: true }));
        if (!contextBlock) {
          ({ contextBlock, sources: retrievedSources } = await retrieveMhtcetContext(queryStr, RECOMMEND_FULL_TOPK, { rankField: code, rank: null, rankMode: true }));
        }
      } else if (!hasRank) {
        const parts = ['MHT-CET 2024 Engineering', category, ...prefParts];
        const query = parts.filter(Boolean).length > 1 ? parts.filter(Boolean).join(' ') + ' ' + message : message;
        ({ contextBlock, sources: retrievedSources } = await retrieveMhtcetContext(query, 6));
      }
    } else {
      // Default: TGEAPCET (Telangana) — also covers exam === null / 'TGEAPCET'.
      if (lookupActive) {
        const parts = ['TGEAPCET 2025', target_college, category, gender, branch_preference, 'last rank cutoff'].filter(Boolean);
        ({ contextBlock, sources: retrievedSources } = await retrieveContext(parts.join(' '), 40, null, { instTokens }));
      } else if (hasAllRequired) {
        const fieldName = CATEGORY_FIELD[category]?.[gender];
        const whereFilter = fieldName ? { [fieldName]: { '$gte': retrievalMinRank } } : null;
        const fallbackFilter = fieldName ? { [fieldName]: { '$gte': 1 } } : null;
        const parts = ['TGEAPCET 2025', category, gender, `rank ${rank}`, 'eligible colleges last rank cutoff', ...prefParts];
        const queryStr = parts.filter(Boolean).length > 1 ? parts.filter(Boolean).join(' ') + ' ' + message : message;
        // Rank-mode: pull ALL eligible colleges (closing >= retrievalMinRank) so the
        // deterministic builder can rank them by cutoff proximity, not embedding
        // similarity — otherwise the colleges nearest the student's rank get dropped.
        ({ contextBlock, sources: retrievedSources } = await retrieveContext(queryStr, RECOMMEND_FULL_TOPK, whereFilter, { rankMode: true }));
        if (!contextBlock) {
          ({ contextBlock, sources: retrievedSources } = await retrieveContext(queryStr, RECOMMEND_FULL_TOPK, fallbackFilter, { rankMode: true }));
        }
      } else if (!hasRank) {
        const parts = ['TGEAPCET 2025', category, gender, ...prefParts];
        const query = parts.filter(Boolean).length > 1 ? parts.filter(Boolean).join(' ') + ' ' + message : message;
        ({ contextBlock, sources: retrievedSources } = await retrieveContext(query, 6));
      }
    }
    // Rank known but category/gender missing → no retrieval; model asks questions
  } catch (err) {
    retrievalFailed = true;
    console.error('Retrieval error (continuing without context):', err.message);
  }
  mark('retrieve');

  // 6. Build augmented message.
  // Always restate the resolved profile so the model knows the student's
  // rank/category/gender even if the client didn't append it — without this it
  // may re-ask for details it already has.
  const profileBits = [];
  if (exam) profileBits.push(`exam ${exam}`);
  if (rank != null) profileBits.push(`rank ${rank}`);
  if (category) profileBits.push(`category ${category}`);
  if (genderMatters && gender) profileBits.push(`gender ${gender === 'girls' ? 'Girls' : 'Boys'}`);
  if (branch_preference) profileBits.push(`branch preference ${branch_preference}`);
  if (location_preference) profileBits.push(`location preference ${location_preference}`);
  if (target_college) profileBits.push(`asking specifically about ${target_college}`);
  const profileLine = profileBits.length ? `STUDENT PROFILE (already provided — do not re-ask): ${profileBits.join(', ')}.` : '';

  const augmentedMessage = [
    contextBlock ? `RETRIEVED CONTEXT (${contextLabel}):\n${contextBlock}` : '',
    // Authoritative, verified info for new-age colleges — answer ONLY from this;
    // present fees as approximate and point to the official site for exact figures.
    nextgenContext ? `NEXT-GEN COLLEGE INFO (authoritative — answer using ONLY this; do not invent numbers; fees are approximate):\n${nextgenContext}` : '',
    profileLine,
    `USER MESSAGE:\n${message}`,
  ].filter(Boolean).join('\n\n');

  // 7. Build clean chat history (windowed — same recent turns we extracted from)
  const chatHistory = recentHistory.map(turn => ({
    role: turn.role,
    parts: [{ text: turn.parts.map(p => p.text || '').join('') }],
  }));

  // 8. Generate the answer.
  // Two DETERMINISTIC paths (the model only EXTRACTS rows from context as JSON —
  // a transcription task it does reliably — then code formats):
  //   • RECOMMEND: all params known → Safe/Borderline classification by rank.
  //   • LOOKUP: a named college is in play and we know the category → just report
  //     that college's actual cutoffs (no rank gate, no Safe/Borderline).
  // A named-college lookup whose category isn't known yet falls through to the
  // conversational stream, which still grounds on the inst-filtered context.
  // Deterministic lookup table only when we have hard tokens to filter the named
  // college (otherwise the retrieved rows aren't guaranteed to be that college,
  // so we let the model answer conversationally from the semantic context).
  const lookupReady = lookupActive && !!instTokens && !!category && (genderMatters ? !!gender : true);
  // An advice question routes to the conversational model even with a full
  // profile, so it gets a real answer (grounded in `contextBlock`) instead of a
  // Safe/Borderline table.
  const useDeterministic = !wantsAdvice && (!!contextBlock || !!cachedRows) && (lookupReady || (hasAllRequired && !lookupActive));
  if (useDeterministic) {
    try {
      const isJee = exam === 'JEE' || exam === 'JEE Advanced';
      const genderLabel = genderMatters ? (gender === 'girls' ? 'Girls' : 'Boys') : '';
      const catLabel = [category, genderLabel].filter(Boolean).join(' ');

      let rows = [];
      if (cachedRows) {
        // TIER-1 HIT: reuse the cached real rows; buildCollegeAnswer below
        // re-classifies them against this user's exact rank.
        rows = cachedRows;
        if (timing) console.log('[cache] tier1 hit', rowKey);
      } else {
      // DETERMINISTIC-FIRST: build the rows straight from the retrieved DB metadata
      // — no LLM call. Saves a Gemini round-trip on the common college-list turn and
      // removes a transcription/hallucination surface. Falls back to the extractor
      // only when this can't map (empty result).
      rows = metaToRows(exam, retrievedSources, { category, gender });
      if (timing && rows.length) console.log('[chat] rows from metadata (no extract LLM):', rows.length);
      if (!rows.length) {
      const closingRule = isJee
        ? `- "closing" MUST be the "Closing rank" listed in the row.`
        : `- "closing" MUST be the rank listed for the student's exact category "${catLabel}". If that category has no rank for a row, skip the row.`;

      const extractModel = genAI.getGenerativeModel({
        model: 'gemini-3.1-flash-lite',
        generationConfig: { responseMimeType: 'application/json', temperature: 0, maxOutputTokens: 8192 },
      });
      const extractPrompt = `From the RETRIEVED CONTEXT, extract every college-branch row and output ONLY a JSON array (no prose).

RETRIEVED CONTEXT (${contextLabel}):
"""
${contextBlock}
"""

For EACH row, output: { "college": "<institute name>", "branch": "<program/branch>", "closing": <the closing rank as an integer>, "phase": "<phase/round>" }
Rules:
${closingRule}
- Copy numbers EXACTLY from the context (digits only, no commas). Never invent. Output [] if none.`;

      try {
        const r = await generateWithRetry(extractModel, extractPrompt);
        const txt = r.response.text().trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
        const parsed = JSON.parse(txt);
        if (Array.isArray(parsed)) rows = parsed;
        else if (parsed && typeof parsed === 'object') {
          // Some responses wrap the array in an object — grab the first array value.
          const arr = Object.values(parsed).find((v) => Array.isArray(v));
          if (arr) rows = arr;
        }
      } catch (e) {
        console.error('College extract parse failed:', e.message);
        rows = [];
      }
      } // end LLM-extraction fallback
      // TIER-1 POPULATE: cache the real rows for this bucket.
      if (rowKey && rows.length) await setCachedRows(rowKey, rows);
      }
      mark('extract');
      if (timing) console.log('[chat] deterministic', JSON.stringify(marks));

      const finalText = lookupReady
        ? buildLookupAnswer(rows, { catLabel, collegeName: target_college, branchPref: branch_preference, rank })
        : buildCollegeAnswer(rows, { rank, catLabel, branchPref: branch_preference, locationPref: location_preference });

      if (finalText) {
        const out = new TextEncoder().encode(finalText);
        const stream = new ReadableStream({
          start(controller) { controller.enqueue(out); controller.close(); },
        });
        return new Response(stream, {
          headers: successHeaders({ 'Content-Type': 'text/plain; charset=utf-8' }),
        });
      }

      // finalText is null (nothing eligible) → fall through to the conversational path.
    } catch (err) {
      console.error('Deterministic extraction failed, falling back to conversational:', err.message);
    }
  }

    // COMPLETE PROFILE BUT NO ELIGIBLE COLLEGES (e.g. an impossibly high rank, or
    // no records for this category): answer deterministically. Without this, the
    // empty context falls to the conversational model, which can improvise a
    // misleading table from earlier turns in the chat history.
    if (!offTopic && !wantsAdvice && !generalInfo && !nextgenContext && !contextBlock && hasAllRequired && !lookupActive) {
      // Retrieval THREW (embedding/DB error) → don't claim there are no matching
      // colleges (there almost certainly are). Ask the student to retry.
      if (retrievalFailed) {
        const msg = `Sorry — I hit a temporary problem looking up colleges just now. Please send your message again in a moment and I'll pull your options.`;
        const out = new TextEncoder().encode(msg);
        const stream = new ReadableStream({ start(c) { c.enqueue(out); c.close(); } });
        return new Response(stream, {
          headers: successHeaders({ 'Content-Type': 'text/plain; charset=utf-8' }),
        });
      }
      const genderLabel = genderMatters ? (gender === 'girls' ? 'Girls' : 'Boys') : '';
      const catLabel = [category, genderLabel].filter(Boolean).join(' ');
      const rankStr = Number(rank).toLocaleString('en-IN');
      const finalText = `I couldn't find any colleges in our current records that admit at a rank of ${rankStr}${catLabel ? ` (${catLabel})` : ''}. Every option on record closes at a stronger (lower) rank, so there's no eligible match for this profile. Please double-check the rank, or try a different exam, category, or branch and I'll take another look.`;
      const out = new TextEncoder().encode(finalText);
      const stream = new ReadableStream({ start(c) { c.enqueue(out); c.close(); } });
      return new Response(stream, {
        headers: successHeaders({ 'Content-Type': 'text/plain; charset=utf-8' }),
      });
    }

    // TIER-2 CACHE (rank-independent Q&A): a general-info / smalltalk answer does
    // not depend on the student's rank, so a high-similarity match from a prior
    // user is reusable. Exam-scoped; served VERBATIM by default (a vetted answer
    // reused as-is can't introduce BS). Optional reshape is fact-checked before use.
    const cacheableQA = (intent === 'general_info' || intent === 'smalltalk');
    if (cacheableQA) {
      const hit = await semanticGet(exam, message);
      if (hit) {
        let answer = hit.answer;
        let serve = true;
        if (RESHAPE_ENABLED) {
          try {
            const reshapeModel = genAI.getGenerativeModel({
              model: 'gemini-3.1-flash-lite',
              generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
            });
            const rp = `Rephrase the ANSWER to directly fit the new QUESTION. Use ONLY facts already in the ANSWER — never add a college, number, or claim that is not in it. If the QUESTION asks for something the ANSWER does not cover, reply with exactly NEEDS_FRESH.\n\nQUESTION:\n${message}\n\nANSWER:\n"""\n${hit.answer}\n"""`;
            const reshaped = (await generateWithRetry(reshapeModel, rp)).response.text().trim();
            if (/NEEDS_FRESH/.test(reshaped)) serve = false;                 // cache doesn't fit → fresh
            else if (reshaped && verifyGrounded(reshaped, hit.answer)) answer = reshaped;
            else countReject();                                              // reshape invented facts → verbatim
          } catch { /* reshape failed → verbatim */ }
        }
        if (serve) {
          if (timing) console.log('[cache] tier2 hit', { exam, score: hit.score });
          const out = new TextEncoder().encode(answer);
          const stream = new ReadableStream({ start(c) { c.enqueue(out); c.close(); } });
          return new Response(stream, {
            headers: successHeaders({ 'Content-Type': 'text/plain; charset=utf-8', 'X-Cache': 'tier2' }),
          });
        }
      }
    }

    // Conversational path (asking for a missing detail, off-topic, etc.) — stream.
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.1-flash-lite',
      systemInstruction: SYSTEM_PROMPT,
    });
    const chat = model.startChat({
      history: chatHistory,
      generationConfig: { maxOutputTokens: 2048 },
    });
    const geminiStream = await chat.sendMessageStream(augmentedMessage);
    if (timing) console.log('[chat] miss', JSON.stringify(marks));

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let first = true;
        let full = '';
        try {
          for await (const chunk of geminiStream.stream) {
            const text = chunk.text();
            if (text) {
              if (first) { first = false; mark('first_token'); if (timing) console.log('[chat] first_token', marks.first_token + 'ms'); }
              full += text;
              controller.enqueue(encoder.encode(text));
            }
          }
        } catch (err) {
          console.error('Chat stream error:', err);
          controller.enqueue(encoder.encode('\n\n_Sorry — something went wrong while generating the response. Please try again._'));
        } finally {
          controller.close();
          // TIER-2 POPULATE: cache the freshly-generated rank-independent answer.
          if (cacheableQA && full.trim().length > 40) semanticStore(exam, message, full).catch(() => {});
        }
      },
    });

    return new Response(stream, {
      headers: successHeaders({ 'Content-Type': 'text/plain; charset=utf-8' }),
    });
  } catch (error) {
    console.error('Server error:', error);
    return errorResponse(500, 'server_error', 'An unexpected error occurred. Please try again.');
  }
}

// Observability (Phase 3): GET /api/chat returns answer-cache hit rates so the
// cache can be monitored. Watch tier2.rejectRate — a rising value means reshape
// is inventing facts (the BS canary) and should be tightened or disabled.
export async function GET() {
  return Response.json({ cache: cacheMetrics() });
}
