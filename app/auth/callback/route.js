import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Validate the post-login `next` target: it must be a SAME-ORIGIN relative path.
 * Anything that could escape to another origin (protocol-relative `//evil.com`,
 * back-slash tricks `/\evil.com`, or an absolute URL) is rejected → `/chat`.
 */
function safeNext(raw) {
  if (typeof raw !== 'string' || !raw.startsWith('/')) return '/chat';
  if (raw.startsWith('//') || raw.startsWith('/\\')) return '/chat';
  return raw;
}

// Hosts we will trust from the `x-forwarded-host` header (client-controllable).
// Set ALLOWED_REDIRECT_HOSTS="app.example.com,www.example.com" in prod.
const ALLOWED_HOSTS = (process.env.ALLOWED_REDIRECT_HOSTS || '')
  .split(',').map(s => s.trim()).filter(Boolean);

/**
 * OAuth redirect target. Google sends the user back here with a `code` that we
 * exchange for a Supabase session (cookies set via the server client).
 */
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = safeNext(searchParams.get('next'));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Only honour x-forwarded-host when it's explicitly allow-listed — it is a
      // client-controllable header, so trusting it blindly is an open redirect.
      const forwardedHost = request.headers.get('x-forwarded-host');
      const isLocalEnv = process.env.NODE_ENV === 'development';
      if (!isLocalEnv && forwardedHost && ALLOWED_HOSTS.includes(forwardedHost)) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Auth failed — send back to login with an error flag.
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
