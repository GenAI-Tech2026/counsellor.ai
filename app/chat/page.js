"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './chat.module.css';
import { Send, User, Bot, Loader2, ArrowLeft, BookOpen, ThumbsUp, ThumbsDown, Copy, Check, Download, Menu } from 'lucide-react';
import Link from 'next/link';
import Sidebar from './Sidebar';
import { createClient } from '@/lib/supabase/client';

const SOURCE_RE = /\[Source:\s*([^\]]+)\]/g;

const GREETING = {
  role: 'model',
  text: "Hello! I'm your **Admission Mantrana AI Counsellor**.\n\nI can help you find colleges using **TGEAPCET 2025** or **JEE Main 2025 (JoSAA)** data. Just tell me your exam and rank, and I'll guide you through the rest! 🎓",
  sources: [],
  greeting: true,
};

const EXAMPLE_QUESTIONS = [
  'TGEAPCET rank 5000, OC category, male — what CSE colleges can I get?',
  'JEE Main rank 8000, OPEN, gender-neutral — which IITs/NITs for CSE?',
  'Show ECE options for BC-B female with TGEAPCET rank 8000',
  'JEE rank 15000, OBC-NCL male — Mechanical at NITs?',
  'Top Hyderabad colleges for TGEAPCET rank 3000, SC, male',
];

function parseSources(text) {
  const sources = [];
  const clean = text.replace(SOURCE_RE, (_, src) => {
    sources.push(src.trim());
    return '';
  }).trim();
  return { clean, sources: [...new Set(sources)] };
}

// Build the behind-the-scenes context line appended to outgoing messages,
// e.g. "Context: User is OC Male with Rank 5000 for TGEAPCET." Only includes
// the fields the user has actually saved.
function buildProfileContext(profile) {
  if (!profile) return '';
  const traits = [];
  if (profile.category) traits.push(profile.category);
  if (profile.gender) traits.push(profile.gender === 'female' ? 'Female' : 'Male');

  let sentence = '';
  if (traits.length) sentence = `User is ${traits.join(' ')}`;
  if (profile.rank != null && profile.rank !== '') {
    sentence += sentence ? ` with Rank ${profile.rank}` : `User has Rank ${profile.rank}`;
  }
  if (profile.exam) sentence += sentence ? ` for ${profile.exam}` : `User is sitting ${profile.exam}`;

  return sentence ? `Context: ${sentence}.` : '';
}

function userFromSession(sessionUser) {
  if (!sessionUser) return null;
  const meta = sessionUser.user_metadata || {};
  return {
    email: sessionUser.email,
    name: meta.name || meta.full_name || null,
  };
}

export default function ChatPage() {
  const supabase = useMemo(() => createClient(), []);

  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  // Auth + conversation state
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [convLoading, setConvLoading] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Per-message UI state, keyed by message index (reset when messages reset).
  const [feedback, setFeedback] = useState({}); // index -> 'up' | 'down'
  const [copiedIndex, setCopiedIndex] = useState(null);

  // Transient corner notification (e.g. prompting guests to sign in).
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  // activeId is needed synchronously inside async send flow.
  const activeIdRef = useRef(null);
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // ── Auth: track the signed-in user ──
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(userFromSession(data.user)));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(userFromSession(session?.user));
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  // ── Load the conversation list whenever the user changes ──
  const loadConversations = useCallback(async () => {
    if (!user) { setConversations([]); return; }
    setConvLoading(true);
    try {
      const res = await fetch('/api/conversations');
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch {
      setConversations([]);
    } finally {
      setConvLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadConversations();
    } else {
      setConversations([]);
      setActiveId(null);
    }
  }, [user, loadConversations]);

  // ── Load the saved profile (for behind-the-scenes context injection) ──
  useEffect(() => {
    if (!user) { setProfile(null); return; }
    let active = true;
    fetch('/api/profile')
      .then(res => res.json())
      .then(data => { if (active) setProfile(data.profile || null); })
      .catch(() => { if (active) setProfile(null); });
    return () => { active = false; };
  }, [user]);

  // ── Persist a message to the active conversation (logged-in only) ──
  const persistMessage = useCallback(async (convId, role, content, sources = []) => {
    if (!convId) return;
    try {
      await fetch(`/api/conversations/${convId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, content, sources }),
      });
    } catch {
      // Persistence is best-effort; the chat still works if it fails.
    }
  }, []);

  // Ensure a conversation exists, returning its id (creates one on first send).
  const ensureConversation = useCallback(async () => {
    if (!user) return null;
    if (activeIdRef.current) return activeIdRef.current;
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) return null;
      const { conversation } = await res.json();
      activeIdRef.current = conversation.id;
      setActiveId(conversation.id);
      return conversation.id;
    } catch {
      return null;
    }
  }, [user]);

  const startNewChat = useCallback(() => {
    if (isLoading || isStreaming) return;
    setActiveId(null);
    activeIdRef.current = null;
    setMessages([GREETING]);
    setFeedback({});
    setCopiedIndex(null);
    setInput('');
    inputRef.current?.focus();
  }, [isLoading, isStreaming]);

  const selectConversation = useCallback(async (id) => {
    if (isLoading || isStreaming || id === activeIdRef.current) return;
    setActiveId(id);
    activeIdRef.current = id;
    setMessages([]);
    setFeedback({});
    setCopiedIndex(null);
    setConvLoading(false);
    try {
      const res = await fetch(`/api/conversations/${id}`);
      const data = await res.json();
      const loaded = (data.messages || []).map(m => ({
        role: m.role,
        text: m.content,
        sources: Array.isArray(m.sources) ? m.sources : [],
      }));
      setMessages(loaded.length ? loaded : [GREETING]);
    } catch {
      setMessages([GREETING]);
    }
  }, [isLoading, isStreaming]);

  const deleteConversation = useCallback(async (id) => {
    setConversations(prev => prev.filter(c => c.id !== id));
    if (id === activeIdRef.current) startNewChat();
    try {
      await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
    } catch {
      // Re-sync on failure.
      loadConversations();
    }
  }, [startNewChat, loadConversations]);

  const sendMessage = async (text) => {
    const userMsg = { role: 'user', text, sources: [] };
    const history = messages
      .filter(m => !m.greeting && (m.role !== 'user' || m.text))
      .map(m => ({ role: m.role, parts: [{ text: m.text }] }));

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Make sure a conversation exists, then persist the user's message.
    const convId = await ensureConversation();
    if (convId) persistMessage(convId, 'user', text, []);

    // Quietly append the saved profile so the AI always knows the student's
    // details, without changing what's shown or stored as their message.
    const profileContext = buildProfileContext(profile);
    const apiMessage = profileContext ? `${text}\n\n${profileContext}` : text;

    let res;
    try {
      res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: apiMessage, history }),
      });
    } catch {
      setIsLoading(false);
      setMessages(prev => [
        ...prev,
        { role: 'model', text: 'Network error. Please check your connection.', sources: [] },
      ]);
      return;
    }

    if (!res.ok || !res.body) {
      setIsLoading(false);
      // Surface the API's standardized error: { error: { code, message, retryAfter? } }
      let errMsg = 'Something went wrong. Please try again.';
      try {
        const data = await res.json();
        if (data?.error?.message) {
          errMsg = data.error.message;
        } else if (res.status === 429) {
          errMsg = 'Too many messages — please wait a moment before trying again.';
        }
      } catch {
        if (res.status === 429) errMsg = 'Too many messages — please wait a moment before trying again.';
      }
      setMessages(prev => [...prev, { role: 'model', text: errMsg, sources: [] }]);
      return;
    }

    setIsLoading(false);
    setIsStreaming(true);
    setMessages(prev => [...prev, { role: 'model', text: '', sources: [], streaming: true }]);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let accumulated = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            text: accumulated,
          };
          return updated;
        });
      }
    } finally {
      const { clean, sources } = parseSources(accumulated);
      const finalText = clean || accumulated;
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'model',
          text: finalText,
          sources,
          streaming: false,
        };
        return updated;
      });
      setIsStreaming(false);
      inputRef.current?.focus();

      // Persist the assistant reply + refresh the sidebar (title/order).
      if (convId && finalText) {
        await persistMessage(convId, 'model', finalText, sources);
        loadConversations();
      }
    }
  };

  const hasUserMessages = messages.some(m => m.role === 'user');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading || isStreaming) return;
    sendMessage(input.trim());
  };

  // Show a brief corner notification that auto-dismisses.
  const showToast = useCallback((message) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  // ── Copy a bot reply to the clipboard (signed-in only) ──
  const handleCopy = useCallback(async (text, index) => {
    if (!user) {
      showToast('Sign in to copy responses.');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(c => (c === index ? null : c)), 1500);
    } catch {
      // Clipboard may be unavailable (e.g. insecure context); ignore.
    }
  }, [user, showToast]);

  // ── Log thumbs up/down feedback on a bot reply ──
  const handleFeedback = useCallback((index, rating) => {
    const current = feedback[index];
    if (current === rating) {
      // Clicking the active rating again clears the local selection.
      setFeedback(prev => {
        const next = { ...prev };
        delete next[index];
        return next;
      });
      return;
    }

    setFeedback(prev => ({ ...prev, [index]: rating }));

    const msg = messages[index];
    if (!msg) return;
    // Find the user question that prompted this reply, for evaluation context.
    let query = '';
    for (let i = index - 1; i >= 0; i--) {
      if (messages[i].role === 'user') { query = messages[i].text; break; }
    }

    fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rating,
        message_text: msg.text,
        user_query: query,
        conversation_id: activeIdRef.current,
      }),
    }).catch(() => {
      // Feedback logging is best-effort.
    });
  }, [feedback, messages]);

  // ── Download the current conversation as a Markdown file ──
  const handleExport = useCallback(() => {
    // Downloading is a signed-in feature; nudge guests to sign in.
    if (!user) {
      showToast('Sign in to download your chat.');
      return;
    }
    const turns = messages.filter(m => !m.greeting && m.text);
    if (turns.length === 0) return;

    const body = turns.map(m => {
      const who = m.role === 'user' ? 'You' : 'Counsellor';
      let block = `**${who}:**\n\n${m.text}`;
      if (m.sources?.length) block += `\n\n_Sources: ${m.sources.join(', ')}_`;
      return block;
    }).join('\n\n---\n\n');

    const content =
      `# Admission Mantrana — Counselling Session\n\n` +
      `_Exported ${new Date().toLocaleString()}_\n\n---\n\n` +
      body + '\n';

    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `counselling-session-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [messages, user, showToast]);

  return (
    <div className={styles.shell}>
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={selectConversation}
        onNew={startNewChat}
        onDelete={deleteConversation}
        user={user}
        loading={convLoading}
        collapsed={collapsed}
        onToggle={() => setCollapsed(c => !c)}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />
      {mobileNavOpen && (
        <div
          className={styles.mobileBackdrop}
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className={styles.container}>
        {/* Header */}
        <header className={styles.header}>
          <button
            type="button"
            className={styles.menuButton}
            onClick={() => { setCollapsed(false); setMobileNavOpen(true); }}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <Link href="/" className={styles.backButton} aria-label="Back to home">
            <ArrowLeft size={20} />
          </Link>
          <div className={styles.headerTitle}>
            <Bot size={24} className={styles.headerIcon} />
            <div>
              <h2>Admission Mantrana</h2>
              <span className={styles.headerSub}>TGEAPCET 2025 Counsellor</span>
            </div>
          </div>
          <div className={styles.headerBadge}>
            <span className={styles.dot} />
            Live
          </div>
          <button
            type="button"
            className={styles.exportButton}
            onClick={handleExport}
            disabled={!hasUserMessages}
            aria-label="Download chat"
            title="Download chat (.md)"
          >
            <Download size={16} />
            <span>Download</span>
          </button>
        </header>

        {/* Messages */}
        <main className={styles.chatArea}>
          <div className={styles.messagesList}>
            {messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={index}
                  className={`${styles.messageWrapper} ${isUser ? styles.messageUser : styles.messageBot}`}
                >
                  <div className={styles.avatar}>
                    {isUser ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div className={`${styles.bubble} ${isUser ? styles.bubbleUser : styles.bubbleBot}`}>
                    {isUser ? (
                      <p>{msg.text}</p>
                    ) : (
                      <div className={styles.markdownContent}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.text}
                        </ReactMarkdown>
                        {msg.streaming && <span className={styles.cursor} />}
                      </div>
                    )}

                    {/* Source citation chips */}
                    {msg.sources?.length > 0 && (
                      <div className={styles.citations}>
                        <BookOpen size={12} className={styles.citationIcon} />
                        {msg.sources.map((src, i) => (
                          <span key={i} className={styles.chip}>{src}</span>
                        ))}
                      </div>
                    )}

                    {/* Feedback + copy actions (bot replies only) */}
                    {!isUser && !msg.greeting && !msg.streaming && msg.text && (
                      <div className={styles.messageActions}>
                        <button
                          type="button"
                          className={`${styles.actionButton} ${feedback[index] === 'up' ? styles.actionButtonUp : ''}`}
                          onClick={() => handleFeedback(index, 'up')}
                          aria-label="Good response"
                          aria-pressed={feedback[index] === 'up'}
                          title="Good response"
                        >
                          <ThumbsUp size={15} />
                        </button>
                        <button
                          type="button"
                          className={`${styles.actionButton} ${feedback[index] === 'down' ? styles.actionButtonDown : ''}`}
                          onClick={() => handleFeedback(index, 'down')}
                          aria-label="Bad response"
                          aria-pressed={feedback[index] === 'down'}
                          title="Bad response"
                        >
                          <ThumbsDown size={15} />
                        </button>
                        {/* Copy: signed-in copies; guests get a sign-in nudge. */}
                        <button
                          type="button"
                          className={styles.actionButton}
                          onClick={() => handleCopy(msg.text, index)}
                          aria-label="Copy response"
                          title="Copy response"
                        >
                          {copiedIndex === index ? <Check size={15} /> : <Copy size={15} />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Thinking indicator */}
            {isLoading && (
              <div className={`${styles.messageWrapper} ${styles.messageBot}`}>
                <div className={styles.avatar}>
                  <Bot size={16} />
                </div>
                <div className={`${styles.bubble} ${styles.bubbleBot} ${styles.thinkingBubble}`}>
                  <Loader2 size={16} className={styles.spinner} />
                  <span>Thinking…</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </main>

        {/* Input */}
        <footer className={styles.inputArea}>
          <form onSubmit={handleSubmit} className={styles.inputForm}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Type your rank, question, or 'hi' to start…"
              className={styles.inputField}
              disabled={isLoading || isStreaming}
              autoFocus
            />
            <button
              type="submit"
              className={styles.sendButton}
              disabled={!input.trim() || isLoading || isStreaming}
              aria-label="Send"
            >
              <Send size={18} />
            </button>
          </form>
          {!hasUserMessages && !isLoading && !isStreaming && (
            <div className={styles.examples}>
              {EXAMPLE_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  className={styles.exampleChip}
                  onClick={() => sendMessage(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          )}
          <p className={styles.disclaimer}>
            Data from TGEAPCET 2025 last rank statements & JEE Main 2025 JoSAA (final round). For reference only.
          </p>
        </footer>

        {/* Transient sign-in nudge */}
        {toast && (
          <div className={styles.toast} role="status">
            <span>{toast}</span>
            <Link href="/login" className={styles.toastLink}>Sign in</Link>
          </div>
        )}
      </div>
    </div>
  );
}
