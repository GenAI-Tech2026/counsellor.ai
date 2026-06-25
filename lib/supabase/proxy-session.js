import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

/**
 * Refresh the Supabase auth session on every matched request and propagate the
 * rotated cookies onto the response. Called from the root `proxy.js`
 * (the Next.js 16 replacement for `middleware.js`).
 *
 * Must run so that Server Components always see a valid, non-expired session.
 */
export async function updateSession(request) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: do not run code between createServerClient and getUser().
  // getUser() revalidates the token and triggers cookie rotation.
  await supabase.auth.getUser();

  return response;
}
