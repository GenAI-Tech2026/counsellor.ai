import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  retrieveContext, retrieveJeeContext, retrieveJeeAdvancedContext,
  retrieveApeamcetContext, retrieveKcetContext, retrieveMhtcetContext,
  JEE_SEAT_TYPE, JEE_GENDER,
  APEAMCET_CATEGORY_FIELD, KCET_CATEGORY_CODE, MHTCET_CATEGORY_CODE,
} from '@/lib/rag';
import { SYSTEM_PROMPT } from '@/lib/system-prompt';
import { checkRateLimit, checkGlobalBudget, MAX_PER_HOUR, GUEST_MAX_PER_HOUR } from '@/lib/ratelimit';
import { checkCache, storeCache } from '@/lib/semantic-cache';
import { createClient } from '@/lib/supabase/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'dummy-key-for-build');

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

/**
 * Semantically extract structured admission params from the full conversation.
 * Uses Gemini so it understands "backward class A", "five hundred", "she", etc.
 */
async function extractParams(history, currentMessage) {
  const userMessages = [
    ...history.filter(h => h.role === 'user').map(h =>
      h.parts.map(p => p.text || '').join(' ')
    ),
    currentMessage,
  ].join('\n');

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

Conversation:
"""
${userMessages}
"""

JSON schema (null for anything not mentioned):
{
  "rank": <integer or null>,
  "exam": <"TGEAPCET" | "APEAMCET" | "JEE" | "JEE Advanced" | "KCET" | "MHTCET" | null>,
  "category": <category code or null — see per-exam rules>,
  "gender": <"boys"|"girls" | null>,
  "branch_preference": <plain English or null>,
  "location_preference": <city/district or null>
}

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

Other:
- "girl / female / she / woman" → "girls"; "boy / male / he / man" → "boys"
- "five hundred" → 500; "1000" → 1000`;

  try {
    const result = await model.generateContent(prompt);
    // JSON mode returns clean JSON; keep a defensive fence-strip just in case.
    const text = result.response.text().trim()
      .replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    return JSON.parse(text);
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
  return out;
}

export async function POST(req) {
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

  // Only re-run the LLM extractor when it can actually change something: the
  // profile is incomplete, or the message mentions a number / exam / category /
  // branch keyword. Otherwise reuse the known profile and skip a Gemini call.
  // Cap the history we feed the models to the last few turns (cost + latency).
  const HISTORY_WINDOW = 10;
  const recentHistory = Array.isArray(history) ? history.slice(-HISTORY_WINDOW) : [];
  const shouldExtract = !isProfileComplete(prior) || looksLikeChange(message);
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
  const resolved = { ...prior };
  for (const [k, v] of Object.entries(params || {})) {
    if (v != null) resolved[k] = v;
  }
  const { rank, exam, category, gender, branch_preference, location_preference } = resolved;

  const hasRank = rank != null;
  // Gender is a cutoff axis for the state EAMCET-style exams and JoSAA (female-only
  // seats), but NOT for KCET / MHT-CET (their category codes are gender-neutral).
  const genderMatters = exam !== 'KCET' && exam !== 'MHTCET';
  const hasAllRequired = hasRank && !!category && (genderMatters ? !!gender : true);

  // Header value shared by every successful response (streaming + cache hit).
  const paramsHeader = encodeURIComponent(JSON.stringify(resolved));
  const successHeaders = (extra = {}) => {
    const h = { 'X-Chat-Params': paramsHeader, ...extra };
    if (remaining != null) h['X-RateLimit-Remaining'] = String(remaining);
    return h;
  };

  // 4. Exact-key response cache (only when all params known — deterministic).
  //    A hit skips both the retrieval and the answer Gemini call.
  if (hasAllRequired) {
    try {
      const cacheResult = await checkCache(message, resolved);
      if (cacheResult.hit) {
        mark('cache_hit');
        if (timing) console.log('[chat] cache HIT', JSON.stringify(marks));
        const cached = new TextEncoder().encode(cacheResult.response);
        const stream = new ReadableStream({
          start(controller) { controller.enqueue(cached); controller.close(); },
        });
        return new Response(stream, {
          headers: successHeaders({ 'Content-Type': 'text/plain; charset=utf-8', 'X-Cache': 'HIT' }),
        });
      }
    } catch {
      // Cache miss / unavailable — proceed normally
    }
  }

  // 5. Decide retrieval strategy (exam-aware). Each exam has its own Supabase
  //    table + retriever; when all eligibility params are known we filter the
  //    corpus hard (rank/category) before similarity ranking, otherwise we fall
  //    back to a plain semantic lookup so the model can still ground its reply.
  let contextBlock = '';
  let contextLabel = 'TGEAPCET official data — eligible colleges only';
  const prefParts = [];
  if (branch_preference) prefParts.push(branch_preference);
  if (location_preference) prefParts.push(location_preference);
  try {
    if (exam === 'JEE' || exam === 'JEE Advanced') {
      const isAdv = exam === 'JEE Advanced';
      const retrieve = isAdv ? retrieveJeeAdvancedContext : retrieveJeeContext;
      const label = isAdv ? 'JEE Advanced' : 'JEE Main JoSAA';
      contextLabel = isAdv
        ? 'JEE Advanced (IIT) official data — eligible programs only'
        : 'JEE Main JoSAA official data — eligible programs only';
      if (hasAllRequired) {
        const seatType = JEE_SEAT_TYPE[String(category).toUpperCase()] || null;
        const genderVal = JEE_GENDER[gender] ?? null;
        const parts = [label, category, gender, `rank ${rank}`, 'eligible colleges closing rank', ...prefParts];
        ({ contextBlock } = await retrieve(parts.join(' '), 12, { rank, seatType, gender: genderVal }));
      } else if (!hasRank) {
        ({ contextBlock } = await retrieve(message, 6));
      }
    } else if (exam === 'APEAMCET') {
      contextLabel = 'APEAMCET (AP EAPCET) official last-rank data — eligible colleges only';
      if (hasAllRequired) {
        const fieldName = APEAMCET_CATEGORY_FIELD[category]?.[gender];
        const whereFilter = fieldName ? { [fieldName]: { '$gte': rank } } : null;
        const parts = ['APEAMCET 2022', category, gender, `rank ${rank}`, 'eligible colleges last rank', ...prefParts];
        ({ contextBlock } = await retrieveApeamcetContext(parts.join(' '), 12, whereFilter));
      } else if (!hasRank) {
        ({ contextBlock } = await retrieveApeamcetContext(message, 6));
      }
    } else if (exam === 'KCET') {
      contextLabel = 'KCET Engineering official cutoff data — eligible colleges only';
      if (hasAllRequired) {
        const code = KCET_CATEGORY_CODE[String(category).toUpperCase()] || null;
        const parts = ['KCET 2024 Engineering', category, `rank ${rank}`, 'eligible colleges closing rank', ...prefParts];
        ({ contextBlock } = await retrieveKcetContext(parts.join(' '), 12, { rankField: code, rank }));
      } else if (!hasRank) {
        ({ contextBlock } = await retrieveKcetContext(message, 6));
      }
    } else if (exam === 'MHTCET') {
      contextLabel = 'MHT-CET Engineering official cutoff data — eligible colleges only';
      if (hasAllRequired) {
        const code = MHTCET_CATEGORY_CODE[String(category).toUpperCase()] || null;
        const parts = ['MHT-CET 2024 Engineering', category, `CET merit number ${rank}`, 'eligible colleges closing rank', ...prefParts];
        ({ contextBlock } = await retrieveMhtcetContext(parts.join(' '), 12, { rankField: code, rank }));
      } else if (!hasRank) {
        ({ contextBlock } = await retrieveMhtcetContext(message, 6));
      }
    } else {
      // Default: TGEAPCET (Telangana) — also covers exam === null / 'TGEAPCET'.
      if (hasAllRequired) {
        const fieldName = CATEGORY_FIELD[category]?.[gender];
        const whereFilter = fieldName ? { [fieldName]: { '$gte': rank } } : null;
        const parts = ['TGEAPCET 2025', category, gender, `rank ${rank}`, 'eligible colleges last rank cutoff', ...prefParts];
        ({ contextBlock } = await retrieveContext(parts.join(' '), 12, whereFilter));
      } else if (!hasRank) {
        ({ contextBlock } = await retrieveContext(message, 6));
      }
    }
    // Rank known but category/gender missing → no retrieval; model asks questions
  } catch (err) {
    console.error('Retrieval error (continuing without context):', err.message);
  }
  mark('retrieve');

  // 6. Build augmented message
  const augmentedMessage = contextBlock
    ? `RETRIEVED CONTEXT (${contextLabel}):\n${contextBlock}\n\nUSER MESSAGE:\n${message}`
    : message;

  // 7. Build clean chat history (windowed — same recent turns we extracted from)
  const chatHistory = recentHistory.map(turn => ({
    role: turn.role,
    parts: [{ text: turn.parts.map(p => p.text || '').join('') }],
  }));

  // 8. Stream Gemini response
  try {
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
        let fullText = '';
        let first = true;
        try {
          for await (const chunk of geminiStream.stream) {
            const text = chunk.text();
            if (text) {
              if (first) { first = false; mark('first_token'); if (timing) console.log('[chat] first_token', marks.first_token + 'ms'); }
              fullText += text;
              controller.enqueue(encoder.encode(text));
            }
          }
          // Cache the deterministic answer for future identical queries.
          if (hasAllRequired && fullText.length > 50) {
            storeCache(resolved, message, fullText);
          }
        } catch (err) {
          // Log the detail server-side; never leak provider/internal error text.
          console.error('Chat stream error:', err);
          controller.enqueue(encoder.encode('\n\n_Sorry — something went wrong while generating the response. Please try again._'));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: successHeaders({ 'Content-Type': 'text/plain; charset=utf-8' }),
    });
  } catch (error) {
    console.error('Gemini error:', error);
    return errorResponse(500, 'server_error', 'Failed to generate response. Please try again.');
  }
}
