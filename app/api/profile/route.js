import { createClient } from '@/lib/supabase/server';

const EXAMS = ['TGEAPCET', 'JEE'];
const CATEGORIES = ['OC', 'BC', 'SC', 'ST'];
const GENDERS = ['male', 'female'];

/**
 * GET /api/profile
 * Return the current user's saved profile, or null if none / signed out.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ profile: null });

    const { data, error } = await supabase
      .from('profiles')
      .select('exam, rank, category, gender')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Load profile error:', error.message);
      return Response.json({ profile: null });
    }

    return Response.json({ profile: data ?? null });
  } catch (error) {
    console.error('GET /api/profile error:', error);
    return Response.json({ error: 'Failed to load profile' }, { status: 500 });
  }
}

/**
 * PUT /api/profile
 * Create or update the current user's profile.
 * Body: { exam?, rank?, category?, gender? }. Unknown / blank values are stored
 * as null so partial profiles are allowed.
 */
export async function PUT(request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const exam = EXAMS.includes(body.exam) ? body.exam : null;
    const category = CATEGORIES.includes(body.category) ? body.category : null;
    const gender = GENDERS.includes(body.gender) ? body.gender : null;

    let rank = null;
    if (body.rank !== '' && body.rank != null) {
      const n = parseInt(body.rank, 10);
      if (Number.isInteger(n) && n > 0) rank = n;
    }

    const { data, error } = await supabase
      .from('profiles')
      .upsert(
        { user_id: user.id, exam, rank, category, gender, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
      .select('exam, rank, category, gender')
      .single();

    if (error) {
      console.error('Save profile error:', error.message);
      return Response.json({ error: 'Failed to save profile' }, { status: 500 });
    }

    return Response.json({ profile: data });
  } catch (error) {
    console.error('PUT /api/profile error:', error);
    return Response.json({ error: 'Failed to save profile' }, { status: 500 });
  }
}
