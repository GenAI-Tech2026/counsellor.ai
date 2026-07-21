import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit } from '@/lib/ratelimit';
import { clientIp } from '@/lib/client-ip';

// This endpoint is UNAUTHENTICATED and writes with the service-role key, so it is
// an attractive target for bulk PII spam. We defend it with (1) a per-IP rate
// limit and (2) strict input validation before any DB write. Genuine users
// submit once (the client also guards via localStorage), so a generous cap can't
// hurt conversions while still capping an abuse script.
const LEADS_MAX_PER_HOUR = 20;

// Permissive but junk-rejecting. The client sends a valid email (type=email) and
// `+91` + exactly 10 digits, so real submissions always pass; these only stop a
// direct-to-API attacker sending garbage.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9][0-9\s-]{7,18}$/;
const MAX_LEN = 120;
const MAX_PHONE_LEN = 20;

const clean = (v) => (typeof v === 'string' ? v.trim() : '');

export async function POST(req) {
  try {
    // 1. Per-IP abuse guard. Fails OPEN (see checkRateLimit) so a limiter blip
    //    never blocks a real lead.
    const ip = clientIp(req);
    const { allowed } = await checkRateLimit(`leads:ip:${ip}`, LEADS_MAX_PER_HOUR);
    if (!allowed) {
      return NextResponse.json({ error: 'Too many submissions. Please try again later.' }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const name = clean(body.name);
    const phone = clean(body.phone);
    const state = clean(body.state);
    const email = clean(body.email);
    const studyYear = clean(body.studyYear);

    // 2. Validate shape + bound length BEFORE touching the DB. Malformed or
    //    oversized input is now a real 4xx instead of being silently stored.
    if (!name || !phone || !state || !email || !studyYear) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (name.length > MAX_LEN || state.length > MAX_LEN || studyYear.length > MAX_LEN ||
        email.length > MAX_LEN || phone.length > MAX_PHONE_LEN) {
      return NextResponse.json({ error: 'A field is too long' }, { status: 400 });
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }
    if (!PHONE_RE.test(phone)) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
    }

    // We use the service role key to insert leads without RLS blocking us.
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase environment variables for leads insertion.');
      // Fail gracefully so we don't block the user if keys are missing.
      return NextResponse.json({ success: true, warning: 'Keys missing, data not saved' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

    const { error } = await supabase
      .from('leads')
      .insert([{ name, phone, state, email, study_year: studyYear }]);

    if (error) {
      console.error('Error inserting lead:', error.message);
      // Genuine DB/infra error (e.g. a missing table) must not lock the user out
      // of the app, so we still return 200 here. Note: this only masks
      // INFRASTRUCTURE failures — malformed input was already rejected above.
      return NextResponse.json({ success: true, warning: 'Database error, data not saved' });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Leads API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
