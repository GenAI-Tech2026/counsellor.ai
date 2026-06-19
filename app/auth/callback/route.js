import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * OAuth redirect target. Google sends the user back here with a `code` that we
 * exchange for a Supabase session (cookies set via the server client).
 */
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // Where to send the user after a successful login.
  const next = searchParams.get('next') ?? '/chat';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // `x-forwarded-host` is set by the hosting platform (e.g. Vercel).
      const forwardedHost = request.headers.get('x-forwarded-host');
      const isLocalEnv = process.env.NODE_ENV === 'development';
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Auth failed — send back to login with an error flag.
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
