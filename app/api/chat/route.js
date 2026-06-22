import { GoogleGenerativeAI } from '@google/generative-ai';
import { retrieveContext, retrieveJeeContext, JEE_SEAT_TYPE, JEE_GENDER } from '@/lib/rag';
import { SYSTEM_PROMPT } from '@/lib/system-prompt';
import { checkRateLimit, MAX_PER_HOUR, GUEST_MAX_PER_HOUR } from '@/lib/ratelimit';
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

  const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' });

  const prompt = `Extract admission counselling parameters from this student conversation.
Return ONLY valid JSON — no markdown, no explanation.

Conversation:
"""
${userMessages}
"""

JSON schema (null for anything not mentioned):
{
  "rank": <integer or null>,
  "exam": <"TGEAPCET" | "JEE" | null>,
  "category": <category code or null — see rules>,
  "gender": <"boys"|"girls" | null>,
  "branch_preference": <plain English or null>,
  "location_preference": <city/district or null>
}

Exam mapping:
- "eamcet / eapcet / tgeapcet / Telangana EAPCET" → "TGEAPCET"
- "jee / jee main / jee advanced / josaa / iit / nit / iiit / mains rank / CRL" → "JEE"

Category mapping when exam is TGEAPCET (Telangana categories):
- "backward class A / BC-A / BCA" → "BC-A" (same for B C D E)
- "scheduled caste / SC" → "SC-I" unless II or III specified
- "scheduled tribe / ST / tribal" → "ST"
- "general / open / unreserved" → "OC"
- "EWS / economically weaker" → "EWS"

Category mapping when exam is JEE (JoSAA seat types):
- "general / open / unreserved / OC" → "OPEN"
- "OBC / OBC-NCL / backward" → "OBC-NCL"
- "SC" → "SC"; "ST" → "ST"; "EWS" → "EWS"

Other:
- "girl / female / she / woman" → "girls"; "boy / male / he / man" → "boys"
- "five hundred" → 500; "1000" → 1000`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim()
      .replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    return JSON.parse(text);
  } catch {
    return {};
  }
}

export async function POST(req) {
  // 1. Rate limiting — persistent, per hour. Signed-in users get the full
  //    allowance and are keyed by user id; signed-out visitors get a tighter
  //    guest cap keyed by IP. Identifying the user is best-effort; on any auth
  //    error we fall back to IP keying + the guest cap.
  let userId = null;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    // Anonymous / auth lookup failed — fall through to IP keying.
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rateKey = userId || `ip:${ip}`;
  const maxPerHour = userId ? MAX_PER_HOUR : GUEST_MAX_PER_HOUR;
  const { allowed, retryAfter } = await checkRateLimit(rateKey, maxPerHour);
  if (!allowed) {
    const message = userId
      ? 'Rate limit exceeded. Try again in 1 hour.'
      : `Guest message limit reached (${GUEST_MAX_PER_HOUR}/hour). Sign in to send more, or try again in 1 hour.`;
    return errorResponse(429, 'rate_limited', message, {
      retryAfter,
      headers: { 'Retry-After': String(retryAfter) },
    });
  }

  // 2. Parse body
  let message, history;
  try {
    ({ message, history } = await req.json());
  } catch {
    return errorResponse(400, 'invalid_request', 'Invalid request body.');
  }

  if (!message?.trim()) {
    return errorResponse(400, 'missing_message', 'Message is required.');
  }

  // 3. Semantic param extraction from full conversation
  const params = await extractParams(history || [], message);
  const { rank, exam, category, gender, branch_preference, location_preference } = params;

  const isJee = exam === 'JEE';
  const hasRank = rank != null;
  const hasAllRequired = hasRank && category && gender;

  // 4. Semantic cache check (only when all params known — deterministic answers)
  let cacheEmbedding = null;
  if (hasAllRequired) {
    try {
      const cacheResult = await checkCache(message, params);
      if (cacheResult.hit) {
        const cached = new TextEncoder().encode(cacheResult.response);
        const stream = new ReadableStream({
          start(controller) { controller.enqueue(cached); controller.close(); },
        });
        return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Cache': 'HIT' } });
      }
      cacheEmbedding = cacheResult.embedding;
    } catch {
      // Cache miss — proceed normally
    }
  }

  // 5. Decide retrieval strategy (exam-aware: JEE/JoSAA vs TGEAPCET)
  let contextBlock = '';
  let contextLabel = 'TGEAPCET 2025 official data — eligible colleges only';
  try {
    if (isJee) {
      contextLabel = 'JEE Main 2025 JoSAA official data — eligible programs only';
      if (hasAllRequired) {
        const seatType = JEE_SEAT_TYPE[String(category).toUpperCase()] || null;
        const genderVal = JEE_GENDER[gender] ?? null;
        const parts = ['JEE Main 2025 JoSAA', category, gender, `rank ${rank}`, 'eligible colleges closing rank'];
        if (branch_preference) parts.push(branch_preference);
        if (location_preference) parts.push(location_preference);
        ({ contextBlock } = await retrieveJeeContext(parts.join(' '), 12, { rank, seatType, gender: genderVal }));
      } else if (!hasRank) {
        ({ contextBlock } = await retrieveJeeContext(message, 6));
      }
    } else if (hasAllRequired) {
      const fieldName = CATEGORY_FIELD[category]?.[gender];
      const whereFilter = fieldName ? { [fieldName]: { '$gte': rank } } : null;
      const parts = ['TGEAPCET 2025', category, gender, `rank ${rank}`, 'eligible colleges last rank cutoff'];
      if (branch_preference) parts.push(branch_preference);
      if (location_preference) parts.push(location_preference);
      ({ contextBlock } = await retrieveContext(parts.join(' '), 12, whereFilter));
    } else if (!hasRank) {
      ({ contextBlock } = await retrieveContext(message, 6));
    }
    // Rank known but category/gender missing → no retrieval; model asks questions
  } catch (err) {
    console.error('Retrieval error (continuing without context):', err.message);
  }

  // 6. Build augmented message
  const augmentedMessage = contextBlock
    ? `RETRIEVED CONTEXT (${contextLabel}):\n${contextBlock}\n\nUSER MESSAGE:\n${message}`
    : message;

  // 7. Build clean chat history
  const chatHistory = (history || []).map(turn => ({
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

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let fullText = '';
        try {
          for await (const chunk of geminiStream.stream) {
            const text = chunk.text();
            if (text) {
              fullText += text;
              controller.enqueue(encoder.encode(text));
            }
          }
          // Store in semantic cache after successful completion
          if (hasAllRequired && cacheEmbedding && fullText.length > 50) {
            storeCache(cacheEmbedding, { exam, rank, category, gender }, fullText);
          }
        } catch (err) {
          controller.enqueue(encoder.encode(`\n\n_Error generating response: ${err.message}_`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (error) {
    console.error('Gemini error:', error);
    return errorResponse(500, 'server_error', 'Failed to generate response. Please try again.');
  }
}
