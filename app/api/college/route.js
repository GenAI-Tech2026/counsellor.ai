import { GoogleGenerativeAI } from '@google/generative-ai';
import { checkRateLimit, checkGlobalBudget, MAX_PER_HOUR, GUEST_MAX_PER_HOUR } from '@/lib/ratelimit';
import { createClient } from '@/lib/supabase/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'dummy-key-for-build');

// Standardized error shape, mirroring /api/chat.
function errorResponse(status, code, message, extra = {}) {
  const { retryAfter, headers } = extra;
  const error = { code, message };
  if (retryAfter != null) error.retryAfter = retryAfter;
  return Response.json({ error }, { status, headers });
}

// Server-side allowlist of the new-age tech colleges surfaced as "top-ranker
// picks". Only these fixed, official URLs are ever fetched — the client sends a
// `key`, never a URL — so this can't be turned into an SSRF probe.
const COLLEGES = {
  niat: {
    name: 'NIAT (NxtWave Institute of Advanced Technologies)',
    url: 'https://www.niatindia.com/',
  },
  scaler: {
    name: 'Scaler School of Technology',
    url: 'https://www.scaler.com/school-of-technology/',
  },
  polaris: {
    name: 'Polaris School of Technology',
    url: 'https://polariscampus.com/',
  },
  newton: {
    name: 'Newton School of Technology (Rishihood University)',
    url: 'https://www.newtonschool.co/newton-school-of-technology-nst/home',
  },
  plaksha: {
    name: 'Plaksha University',
    url: 'https://plaksha.edu.in/',
  },
};

const FETCH_TIMEOUT_MS = 8000;
const MAX_HTML_BYTES = 800_000;
const MAX_TEXT_CHARS = 6000;

const clientIp = (req) => {
  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const hops = xff.split(',').map((s) => s.trim()).filter(Boolean);
    if (hops.length) return hops[hops.length - 1];
  }
  return 'unknown';
};

// Pull a readable text digest out of raw HTML: drop scripts/styles, capture the
// <title> + meta description, strip the remaining tags, decode a few common
// entities and collapse whitespace. Good enough to ground a summary.
function htmlToText(html) {
  if (!html) return '';
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);

  let body = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');

  const text = [
    titleMatch ? titleMatch[1] : '',
    descMatch ? descMatch[1] : '',
    body,
  ].join('. ');

  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&rsquo;|&lsquo;/g, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_TEXT_CHARS);
}

async function fetchSiteText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        // A real UA — some sites serve a blank shell to unknown clients.
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });
    if (!res.ok) return '';
    const buf = await res.arrayBuffer();
    const slice = buf.byteLength > MAX_HTML_BYTES ? buf.slice(0, MAX_HTML_BYTES) : buf;
    const html = new TextDecoder('utf-8').decode(slice);
    return htmlToText(html);
  } catch {
    return '';
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return errorResponse(400, 'invalid_request', 'Invalid request body.');
  }

  const key = typeof body?.college === 'string' ? body.college.toLowerCase() : '';
  const college = COLLEGES[key];
  if (!college) {
    return errorResponse(400, 'unknown_college', 'Unknown college.');
  }

  // Auth + rate-limit (same scheme as /api/chat).
  let userId = null;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    // Anonymous — fall through to IP keying.
  }

  const rateKey = userId || `ip:${clientIp(req)}`;
  const maxPerHour = userId ? MAX_PER_HOUR : GUEST_MAX_PER_HOUR;
  const { allowed, retryAfter } = maxPerHour > 0
    ? await checkRateLimit(rateKey, maxPerHour)
    : { allowed: true, retryAfter: 0 };
  if (!allowed) {
    return errorResponse(429, 'rate_limited', 'Rate limit exceeded. Please try again shortly.', {
      retryAfter,
      headers: { 'Retry-After': String(retryAfter) },
    });
  }

  const budget = await checkGlobalBudget();
  if (!budget.allowed) {
    return errorResponse(503, 'service_busy', 'We are experiencing high demand right now. Please try again shortly.');
  }

  const siteText = await fetchSiteText(college.url);

  // Ground the summary in the scraped text; when the site is a thin JS shell we
  // let the model fall back to widely-known facts, but never invent numbers.
  const prompt = `You are briefing an Indian student who is choosing where to study. Summarize this college from its official website.

College: ${college.name}
Official site: ${college.url}

WEBSITE CONTENT (scraped, may be partial):
"""
${siteText || '(the site returned little readable text)'}
"""

Write a concise, factual overview in markdown. Use these short bold-labelled sections, each 1–2 lines:
- **Overview** — what it is and where it's located.
- **Programs** — degree(s) / specializations offered.
- **Admissions** — how to get in (entrance test / application) and eligibility if stated.
- **Fees** — the fee/cost if stated.
- **Highlights** — notable placements, industry partners, or standout features.

Rules:
- Use ONLY information present in the WEBSITE CONTENT above. Do NOT add anything from your own prior knowledge, and never fabricate fees, salary figures, rankings, or partners.
- If a section's detail isn't in the content, write exactly "Not listed on the site." for that section — do not guess.
- If the WEBSITE CONTENT is empty or has almost no usable detail, reply with ONLY this line: "The official site didn't return enough readable detail to summarize. [Visit the official site](${college.url})"
- Start directly with the **Overview** line — no preamble like "Here is a summary".
- Keep the whole answer under ~160 words. Be specific, skip marketing fluff.
- Finish with this exact line: [Visit the official site](${college.url})`;

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.1-flash-lite',
      generationConfig: { temperature: 0.2, maxOutputTokens: 512 },
    });
    const result = await model.generateContent(prompt);
    const summary = result.response.text().trim();
    if (!summary) {
      return errorResponse(502, 'empty_summary', 'Could not summarize this college right now. Please try again.');
    }
    return Response.json({ name: college.name, url: college.url, summary });
  } catch (error) {
    console.error('College summary error:', error);
    return errorResponse(500, 'server_error', 'Failed to summarize this college. Please try again.');
  }
}
