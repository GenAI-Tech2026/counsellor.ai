import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/conversations/[id]
 * Return the messages for a conversation, oldest first. RLS ensures only the
 * owner can read; non-owners get an empty list.
 */
export async function GET(request, ctx) {
  try {
    const { id } = await ctx.params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('messages')
      .select('role, content, sources, created_at')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Load messages error:', error.message);
      return Response.json({ messages: [] });
    }

    return Response.json({ messages: data ?? [] });
  } catch (error) {
    console.error('GET /api/conversations/[id] error:', error);
    return Response.json({ error: 'Failed to load messages' }, { status: 500 });
  }
}

/**
 * DELETE /api/conversations/[id]
 * Delete a conversation (cascades to its messages). RLS scopes this to the
 * owning user.
 */
export async function DELETE(request, ctx) {
  try {
    const { id } = await ctx.params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete conversation error:', error.message);
      return Response.json({ error: 'Failed to delete conversation' }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/conversations/[id] error:', error);
    return Response.json({ error: 'Failed to delete conversation' }, { status: 500 });
  }
}
