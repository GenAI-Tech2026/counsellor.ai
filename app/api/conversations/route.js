import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/conversations
 * List the current user's conversations, newest first by updated_at.
 * Anonymous users simply have no history.
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ conversations: [] });
    }

    const { data, error } = await supabase
      .from('conversations')
      .select('id, title, updated_at')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('List conversations error:', error.message);
      return Response.json({ conversations: [] });
    }

    return Response.json({ conversations: data ?? [] });
  } catch (error) {
    console.error('GET /api/conversations error:', error);
    return Response.json({ error: 'Failed to load conversations' }, { status: 500 });
  }
}

/**
 * POST /api/conversations
 * Create a new conversation for the current user. Body: { title } (optional).
 */
export async function POST(request) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    let title;
    try {
      ({ title } = await request.json());
    } catch {
      // No / invalid body — fall back to the column default.
      title = undefined;
    }

    const insert = { user_id: user.id };
    if (typeof title === 'string' && title.trim()) {
      insert.title = title.trim();
    }

    const { data, error } = await supabase
      .from('conversations')
      .insert(insert)
      .select('id, title, updated_at')
      .single();

    if (error) {
      console.error('Create conversation error:', error.message);
      return Response.json({ error: 'Failed to create conversation' }, { status: 500 });
    }

    return Response.json({ conversation: data }, { status: 201 });
  } catch (error) {
    console.error('POST /api/conversations error:', error);
    return Response.json({ error: 'Failed to create conversation' }, { status: 500 });
  }
}
