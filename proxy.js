import { updateSession } from '@/lib/supabase/proxy-session';

// Next.js 16 renamed `middleware` → `proxy` (runs on the Node.js runtime).
// We use it to keep the Supabase auth session fresh on navigations.
export async function proxy(request) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run on all paths except static assets and image files so auth cookies
     * stay fresh, but CSS/JS/images aren't needlessly intercepted.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
