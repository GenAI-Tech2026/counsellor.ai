import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/** Sign the current user out, then redirect home. */
export async function POST(request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL('/', request.url), { status: 303 });
}
