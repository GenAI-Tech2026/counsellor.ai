import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Supabase client for use in Server Components, Route Handlers, and Server
 * Actions. Reads/writes the session via Next.js cookies.
 *
 * Note: in Next.js 16 `cookies()` is async, so this helper is async too.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — safe to ignore when the proxy
            // (proxy.js) is responsible for refreshing the session cookie.
          }
        },
      },
    }
  );
}
