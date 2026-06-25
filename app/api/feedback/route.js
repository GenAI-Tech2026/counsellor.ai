import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/feedback
 * Log a thumbs up/down rating on an assistant message.
 * Body: { rating: 'up' | 'down', message_text, user_query?, conversation_id? }.
 *
 * Works for signed-out visitors too — user_id is recorded when available and
 * left null otherwise. Inserts are allowed for everyone by RLS; the table is
 * not readable from the client.
 */
export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let rating, message_text, user_query, conversation_id;
    try {
      ({ rating, message_text, user_query, conversation_id } = await request.json());
    } catch {
      return Response.json({ error: 'Invalid request body' }, { status: 400 });
    }

    if (rating !== 'up' && rating !== 'down') {
      return Response.json({ error: 'Invalid rating' }, { status: 400 });
    }
    if (typeof message_text !== 'string' || !message_text.trim()) {
      return Response.json({ error: 'message_text is required' }, { status: 400 });
    }

    const { error } = await supabase.from('chat_feedback').insert({
      user_id: user?.id ?? null,
      conversation_id: conversation_id || null,
      message_text,
      user_query: typeof user_query === 'string' && user_query.trim() ? user_query : null,
      rating,
    });

    if (error) {
      console.error('Insert feedback error:', error.message);
      return Response.json({ error: 'Failed to save feedback' }, { status: 500 });
    }

    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error('POST /api/feedback error:', error);
    return Response.json({ error: 'Failed to save feedback' }, { status: 500 });
  }
}
