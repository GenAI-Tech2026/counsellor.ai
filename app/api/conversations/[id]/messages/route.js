import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/conversations/[id]/messages
 * Append a message to a conversation. Body: { role, content, sources? }.
 * Bumps the conversation's updated_at, and auto-titles the conversation from
 * the first user message. RLS blocks writes to conversations the user
 * doesn't own.
 */
export async function POST(request, ctx) {
  try {
    const { id } = await ctx.params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    let role, content, sources;
    try {
      ({ role, content, sources } = await request.json());
    } catch {
      return Response.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Validate role + content.
    if (role !== 'user' && role !== 'model') {
      return Response.json({ error: "Invalid role" }, { status: 400 });
    }
    if (typeof content !== 'string' || !content.trim()) {
      return Response.json({ error: 'Content is required' }, { status: 400 });
    }

    // Insert the message.
    const { data: message, error: insertError } = await supabase
      .from('messages')
      .insert({
        conversation_id: id,
        role,
        content,
        sources: Array.isArray(sources) ? sources : [],
      })
      .select('id, conversation_id, role, content, sources, created_at')
      .single();

    if (insertError) {
      console.error('Insert message error:', insertError.message);
      return Response.json({ error: 'Failed to save message' }, { status: 500 });
    }

    // Bump updated_at; auto-title from the first user message if still default.
    const update = { updated_at: new Date().toISOString() };
    if (role === 'user') {
      const { data: conv } = await supabase
        .from('conversations')
        .select('title')
        .eq('id', id)
        .single();

      if (conv && conv.title === 'New chat') {
        update.title = content.trim().replace(/\s+/g, ' ').slice(0, 50);
      }
    }

    const { error: updateError } = await supabase
      .from('conversations')
      .update(update)
      .eq('id', id);

    if (updateError) {
      console.error('Update conversation error:', updateError.message);
    }

    return Response.json({ message }, { status: 201 });
  } catch (error) {
    console.error('POST /api/conversations/[id]/messages error:', error);
    return Response.json({ error: 'Failed to save message' }, { status: 500 });
  }
}
