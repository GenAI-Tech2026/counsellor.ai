import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/conversations/search?q=<query>
 * Search the current user's conversations by title AND message content
 * (case-insensitive). Returns conversation id, title, updated_at and, when the
 * match came from a message, a short matching snippet. Anonymous users get an
 * empty list. RLS already restricts every row to its owner.
 */
export async function GET(request) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ results: [] });
    }

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();
    if (!q) {
      return Response.json({ results: [] });
    }

    // Escape characters with special meaning inside a Postgres LIKE pattern.
    const pattern = `%${q.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;

    // ── Title matches ──
    const { data: titleConvs, error: titleError } = await supabase
      .from('conversations')
      .select('id, title, updated_at')
      .ilike('title', pattern)
      .order('updated_at', { ascending: false });

    if (titleError) {
      console.error('Search conversations (title) error:', titleError.message);
      return Response.json({ results: [] });
    }

    // ── Message-content matches (join back the parent conversation) ──
    const { data: msgMatches, error: msgError } = await supabase
      .from('messages')
      .select('content, created_at, conversation:conversations!inner(id, title, updated_at)')
      .ilike('content', pattern)
      .order('created_at', { ascending: false });

    if (msgError) {
      console.error('Search conversations (content) error:', msgError.message);
      return Response.json({ results: [] });
    }

    // Build a snippet centred on the match so the UI can show context.
    const snippetOf = (content) => {
      if (typeof content !== 'string') return '';
      const idx = content.toLowerCase().indexOf(q.toLowerCase());
      const start = Math.max(0, idx - 40);
      const slice = content.slice(start, start + 120).replace(/\s+/g, ' ').trim();
      return (start > 0 ? '…' : '') + slice + (start + 120 < content.length ? '…' : '');
    };

    // Merge into a single list keyed by conversation id, newest first. The
    // first snippet seen per conversation wins (messages are newest-first).
    const byId = new Map();

    for (const conv of titleConvs ?? []) {
      byId.set(conv.id, {
        id: conv.id,
        title: conv.title,
        updated_at: conv.updated_at,
        snippet: null,
      });
    }

    for (const m of msgMatches ?? []) {
      const conv = m.conversation;
      if (!conv) continue;
      const existing = byId.get(conv.id);
      if (existing) {
        if (!existing.snippet) existing.snippet = snippetOf(m.content);
      } else {
        byId.set(conv.id, {
          id: conv.id,
          title: conv.title,
          updated_at: conv.updated_at,
          snippet: snippetOf(m.content),
        });
      }
    }

    const results = [...byId.values()].sort(
      (a, b) => new Date(b.updated_at) - new Date(a.updated_at)
    );

    return Response.json({ results });
  } catch (error) {
    console.error('GET /api/conversations/search error:', error);
    return Response.json({ error: 'Search failed' }, { status: 500 });
  }
}
