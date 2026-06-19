"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './chat.module.css';
import { Send, User, Bot, Loader2, ArrowLeft, BookOpen } from 'lucide-react';
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
  const [conversations, setConversations] = useState([]);
  const [convLoading, setConvLoading] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [collapsed, setCollapsed] = useState(false);

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
    setInput('');
    inputRef.current?.focus();
  }, [isLoading, isStreaming]);

  const selectConversation = useCallback(async (id) => {
    if (isLoading || isStreaming || id === activeIdRef.current) return;
    setActiveId(id);
    activeIdRef.current = id;
    setMessages([]);
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

    let res;
    try {
      res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history }),
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
      let errMsg = 'Something went wrong. Please try again.';
      if (res.status === 429) errMsg = 'Too many messages — please wait a moment before trying again.';
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
      />

      <div className={styles.container}>
        {/* Header */}
        <header className={styles.header}>
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
      </div>
    </div>
  );
}
