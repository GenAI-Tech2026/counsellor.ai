"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './chat.module.css';
import {
  ArrowUp, User, Bot, Loader2, BookOpen, ThumbsUp, ThumbsDown, Copy, Check,
  Download, Menu, GraduationCap, GitCompare, Compass, Square, ArrowDown,
} from 'lucide-react';
import Link from 'next/link';
import Sidebar from './Sidebar';
import { createClient } from '@/lib/supabase/client';

const SOURCE_RE = /\[Source:\s*([^\]]+)\]/g;

const GREETING = {
  role: 'model',
  text: "Hello! I'm your **Admission Mantrana AI Counsellor**.\n\nI can help you find colleges using **TGEAPCET**, **AP EAPCET**, **JEE Main & Advanced**, **KCET**, and **MHT-CET** data. Just tell me your exam and rank, and I'll guide you through the rest! 🎓",
  sources: [],
  greeting: true,
};

// Hero "jump-start" cards shown on an empty chat. Each fills the composer with a
// ready-to-send prompt so newcomers don't face a blank box.
const SUGGESTIONS = [
  {
    icon: GraduationCap,
    title: 'Find my colleges',
    desc: 'Share your exam & rank — get a college list within reach.',
    prompt: 'I have a TGEAPCET rank of 5000 (OC, male). Which CSE colleges can I get?',
  },
  {
    icon: GitCompare,
    title: 'Compare branches',
    desc: 'CSE vs ECE vs Mechanical — see what fits your rank.',
    prompt: 'Compare CSE, ECE and Mechanical options for TGEAPCET rank 8000, BC-B.',
  },
  {
    icon: Compass,
    title: 'Plan by category',
    desc: 'Options matched to your category, gender & exam.',
    prompt: 'JEE Main rank 15000, OBC-NCL male — which NIT branches are realistic?',
  },
];

function parseSources(text) {
  const sources = [];
  const clean = text.replace(SOURCE_RE, (_, src) => {
    sources.push(src.trim());
    return '';
  }).trim();
  return { clean, sources: [...new Set(sources)] };
}

// ── SHARED CONTRACT (client ⇄ server) ──
// The server returns the resolved student profile on every turn via the
// `X-Chat-Params` header (encodeURIComponent(JSON.stringify(profile))) and the
// remaining hourly quota via `X-RateLimit-Remaining`. Both may be absent or
// malformed — read defensively and never throw.
function readChatParams(res) {
  try {
    const raw = res.headers.get('X-Chat-Params');
    if (!raw) return null;
    const parsed = JSON.parse(decodeURIComponent(raw));
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}
function readRateRemaining(res) {
  try {
    const raw = res.headers.get('X-RateLimit-Remaining');
    if (raw == null || raw === '') return null;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}
// The model ends its reply with a "SUGGESTIONS: a | b | c" line that the app
// Quick-details form (above the input): the student picks exam / rank / category
// / gender once, and those flow to the server as `priorParams` so the bot uses
// them directly instead of asking each in chat. Values match the server's enums;
// category options depend on the chosen exam.
const EXAM_CHOICES = [
  { value: 'TGEAPCET', label: 'TGEAPCET' },
  { value: 'APEAMCET', label: 'AP EAPCET' },
  { value: 'JEE', label: 'JEE Main' },
  { value: 'JEE Advanced', label: 'JEE Advanced' },
  { value: 'KCET', label: 'KCET' },
  { value: 'MHTCET', label: 'MHT-CET' },
];
const CATEGORY_CHOICES = {
  TGEAPCET: ['OC', 'BC-A', 'BC-B', 'BC-C', 'BC-D', 'BC-E', 'SC-I', 'SC-II', 'SC-III', 'ST', 'EWS'],
  APEAMCET: ['OC', 'BC-A', 'BC-B', 'BC-C', 'BC-D', 'BC-E', 'SC', 'ST', 'EWS'],
  JEE: ['OPEN', 'OBC-NCL', 'SC', 'ST', 'EWS'],
  'JEE Advanced': ['OPEN', 'OBC-NCL', 'SC', 'ST', 'EWS'],
  KCET: ['GM', '1', '2A', '2B', '3A', '3B', 'SC', 'ST'],
  MHTCET: ['General', 'OBC', 'SC', 'ST', 'EWS', 'VJ', 'NT1', 'NT2', 'NT3', 'SEBC'],
};
// KCET / MHT-CET cutoffs aren't split by gender.
function examNeedsGender(exam) {
  return Boolean(exam) && exam !== 'KCET' && exam !== 'MHTCET';
}

// Pull plain text out of a react-markdown cell's children (for the mobile
// card layout's labels/values). Cells are usually a string or an array.
function cellText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(cellText).join('');
  if (node?.props?.children != null) return cellText(node.props.children);
  return '';
}

// Custom react-markdown table renderer (#11): keeps the normal <table> on
// desktop, but on phones re-projects each body row into a stacked, labeled
// card ("Header: value" per cell) so wide result tables stay readable. Both
// layouts live in the DOM; CSS toggles them per breakpoint, so it stays
// accessible (the real table is still present for assistive tech on desktop).
function MarkdownTable({ children }) {
  const childArray = Array.isArray(children) ? children : [children];

  let headers = [];
  const rows = [];
  for (const section of childArray) {
    const tag = section?.type;
    const sectionRows = section?.props?.children;
    const rowList = Array.isArray(sectionRows) ? sectionRows : sectionRows ? [sectionRows] : [];
    for (const row of rowList) {
      const cells = row?.props?.children;
      const cellList = Array.isArray(cells) ? cells : cells ? [cells] : [];
      const texts = cellList.map(c => cellText(c?.props?.children));
      if (tag === 'thead') {
        headers = texts;
      } else {
        rows.push(texts);
      }
    }
  }

  return (
    <div className={styles.tableWrap}>
      {/* Desktop: the genuine, fully-accessible table. */}
      <table className={styles.tableDesktop}>{children}</table>

      {/* Mobile: each row as a labeled card. aria-hidden on desktop via CSS. */}
      <div className={styles.tableCards} role="presentation">
        {rows.map((row, ri) => (
          <div key={ri} className={styles.tableCard}>
            {row.map((value, ci) => (
              <div key={ci} className={styles.tableCardRow}>
                {headers[ci] != null && headers[ci] !== '' && (
                  <span className={styles.tableCardLabel}>{headers[ci]}</span>
                )}
                <span className={styles.tableCardValue}>{value}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

const MARKDOWN_COMPONENTS = { table: MarkdownTable };

// Build the behind-the-scenes context line appended to outgoing messages,
// e.g. "Context: User is OC Male with Rank 5000 for TGEAPCET." Only includes
// the fields the user has actually saved.
function buildProfileContext(profile) {
  if (!profile) return '';
  const traits = [];
  if (profile.category) traits.push(profile.category);
  if (profile.gender) traits.push(profile.gender === 'girls' ? 'Girls' : 'Boys');

  let sentence = '';
  if (traits.length) sentence = `User is ${traits.join(' ')}`;
  if (profile.rank != null && profile.rank !== '') {
    sentence += sentence ? ` with Rank ${profile.rank}` : `User has Rank ${profile.rank}`;
  }
  if (profile.exam) sentence += sentence ? ` for ${profile.exam}` : `User is sitting ${profile.exam}`;

  return sentence ? `Context: ${sentence}.` : '';
}

// A fully-specified "find colleges" message for the form's Show-colleges button,
// so the bot has every detail in the message itself and won't re-ask.
function buildFindMessage(p) {
  const parts = [`Find eligible colleges for ${p.exam}`, `rank ${p.rank}`, `category ${p.category}`];
  if (examNeedsGender(p.exam) && p.gender) parts.push(p.gender === 'girls' ? 'Girls' : 'Boys');
  if (p.branch_preference) parts.push(p.branch_preference);
  if (p.location_preference) parts.push(`in ${p.location_preference}`);
  return parts.join(', ') + '.';
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

  // Remaining hourly quota (#14) read from X-RateLimit-Remaining; null = unknown.
  const [rateRemaining, setRateRemaining] = useState(null);

  // Aborts an in-flight streaming request when the user hits "Stop" (#12).
  const abortRef = useRef(null);

  // Floating "scroll to latest" affordance (#13) — shown when scrolled up.
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  // activeId is needed synchronously inside async send flow.
  const activeIdRef = useRef(null);
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const chatAreaRef = useRef(null);

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  // Auto-follow the latest message — but only while the user is already near the
  // bottom, so we don't yank them back up if they've scrolled away to read (#13).
  useEffect(() => {
    const el = chatAreaRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom) scrollToBottom('smooth');
  }, [messages, isLoading, scrollToBottom]);

  // Reveal the floating "scroll to latest" button when the user scrolls up (#13).
  useEffect(() => {
    const el = chatAreaRef.current;
    if (!el) return undefined;
    const onScroll = () => {
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowScrollBtn(distance > 240);
    };
    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [messages]);

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

  // Defer all state updates into an async callback so the effect body itself
  // never calls setState synchronously (avoids cascading-render lint, #18).
  useEffect(() => {
    let active = true;
    (async () => {
      if (user) {
        await loadConversations();
      } else if (active) {
        setConversations([]);
        setActiveId(null);
      }
    })();
    return () => { active = false; };
  }, [user, loadConversations]);

  // ── Load the saved profile (for behind-the-scenes context injection) ──
  // The async IIFE keeps every setProfile call out of the synchronous effect
  // body, so the load and the signed-out reset both run in a callback (#18).
  useEffect(() => {
    let active = true;
    (async () => {
      if (!user) {
        if (active) setProfile(null);
        return;
      }
      try {
        const res = await fetch('/api/profile');
        const data = await res.json();
        if (active) setProfile(data.profile || null);
      } catch {
        if (active) setProfile(null);
      }
    })();
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

  // Update one field of the quick-details form. The merged profile flows to the
  // server as `priorParams`, so the bot uses these without re-asking. Changing
  // the exam clears a now-invalid category / gender.
  const updateProfileField = useCallback((key, value) => {
    setProfile(prev => {
      const next = { ...(prev || {}) };
      next[key] = value === '' || value == null ? null : value;
      if (key === 'exam') {
        const cats = CATEGORY_CHOICES[value] || [];
        if (next.category && !cats.includes(next.category)) next.category = null;
        if (!examNeedsGender(value)) next.gender = null;
      }
      return next;
    });
  }, []);

  const sendMessage = async (text) => {
    const userMsg = { role: 'user', text, sources: [] };
    const history = messages
      .filter(m => !m.greeting && (m.role !== 'user' || m.text))
      .map(m => ({ role: m.role, parts: [{ text: m.text }] }));

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setIsLoading(true);

    // Make sure a conversation exists, then persist the user's message.
    const convId = await ensureConversation();
    if (convId) persistMessage(convId, 'user', text, []);

    // Quietly append the saved profile so the AI always knows the student's
    // details, without changing what's shown or stored as their message.
    const profileContext = buildProfileContext(profile);
    const apiMessage = profileContext ? `${text}\n\n${profileContext}` : text;

    // SHARED CONTRACT: send last turn's resolved profile as `priorParams`
    // (null on the first turn). Cleared chips (#3) are null in `profile`, so
    // they're naturally dropped here. Shape matches the contract exactly.
    const priorParams = profile
      ? {
          exam: profile.exam ?? null,
          rank: profile.rank ?? null,
          category: profile.category ?? null,
          gender: profile.gender ?? null,
          branch_preference: profile.branch_preference ?? null,
          location_preference: profile.location_preference ?? null,
        }
      : null;

    // AbortController lets the "Stop" control cancel the in-flight stream (#12).
    const controller = new AbortController();
    abortRef.current = controller;

    let res;
    try {
      res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: apiMessage, history, priorParams }),
        signal: controller.signal,
      });
    } catch (err) {
      abortRef.current = null;
      setIsLoading(false);
      // A user-initiated abort before headers arrive — leave the chat clean.
      if (err?.name === 'AbortError') return;
      setMessages(prev => [
        ...prev,
        { role: 'model', text: 'Network error. Please check your connection.', sources: [] },
      ]);
      return;
    }

    // SHARED CONTRACT: read the resolved profile + remaining quota from headers
    // (defensively; helpers swallow absent/malformed values).
    const nextProfile = readChatParams(res);
    if (nextProfile) setProfile(nextProfile);
    const remaining = readRateRemaining(res);
    if (remaining != null) setRateRemaining(remaining);

    if (!res.ok || !res.body) {
      abortRef.current = null;
      setIsLoading(false);
      // Surface the API's standardized error: { error: { code, message, retryAfter? } }
      let errMsg = 'Something went wrong. Please try again.';
      let upsell = false;
      try {
        const data = await res.json();
        if (res.status === 429) {
          // Frame the limit as a benefit, not a wall (#14).
          errMsg = user
            ? (data?.error?.message || 'You’ve hit this hour’s limit — it resets shortly. Thanks for your patience!')
            : 'You’ve reached the free guest limit for now. Sign in (free) to keep chatting with higher limits and saved conversations.';
          upsell = !user;
        } else if (data?.error?.message) {
          errMsg = data.error.message;
        }
      } catch {
        if (res.status === 429) {
          errMsg = user
            ? 'You’ve hit this hour’s limit — it resets shortly. Thanks for your patience!'
            : 'You’ve reached the free guest limit for now. Sign in (free) to keep chatting with higher limits and saved conversations.';
          upsell = !user;
        }
      }
      setMessages(prev => [...prev, { role: 'model', text: errMsg, sources: [] }]);
      if (upsell) showToast('Sign in (free) to keep chatting.');
      return;
    }

    setIsLoading(false);
    setIsStreaming(true);
    setMessages(prev => [...prev, { role: 'model', text: '', sources: [], streaming: true }]);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    // Hold the running text on an object property (not a reassigned `let`) so the
    // React Compiler doesn't flag it as mutated-after-capture in the loop closure.
    const buf = { text: '' };
    let aborted = false;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf.text += decoder.decode(value, { stream: true });
        // Strip "[Source: …]" lines live so they never flash in the prose; the
        // extracted citations render as chips under the answer instead (#9).
        const { clean } = parseSources(buf.text);
        const live = clean || buf.text;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            text: live,
          };
          return updated;
        });
      }
    } catch (err) {
      // A "Stop" abort surfaces here mid-stream; keep whatever streamed so far.
      if (err?.name === 'AbortError') aborted = true;
    } finally {
      abortRef.current = null;
      const { clean, sources } = parseSources(buf.text);
      const finalText = clean || buf.text;
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
      // Skip persistence on an aborted turn to avoid storing a partial answer.
      if (convId && finalText && !aborted) {
        await persistMessage(convId, 'model', finalText, sources);
        loadConversations();
      }
    }
  };

  // Abort the in-flight streaming request from the "Stop" control (#12).
  const handleStop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const hasUserMessages = messages.some(m => m.role === 'user');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading || isStreaming) return;
    sendMessage(input.trim());
  };

  // Auto-grow the composer as the student types (capped so it never eats the view).
  const handleComposerChange = (e) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  };

  // Enter sends; Shift+Enter inserts a newline (standard chat affordance).
  const handleComposerKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Drop a hero suggestion into the composer and focus it (ready to send/edit).
  const fillPrompt = useCallback((prompt) => {
    setInput(prompt);
    const el = inputRef.current;
    if (el) {
      el.focus();
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
      // Place the caret at the end so editing feels natural.
      const len = prompt.length;
      requestAnimationFrame(() => el.setSelectionRange(len, len));
    }
  }, []);

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
      showToast('Copied to clipboard');
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
    showToast(rating === 'up' ? 'Thanks for the feedback!' : 'Thanks — we’ll use this to improve.');

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
  }, [feedback, messages, showToast]);

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

  // Shared composer — used centered in the hero and docked during a chat.
  // While a reply streams, the send button becomes a "Stop" control (#12).
  const busy = isLoading || isStreaming;
  const composer = (
    <form onSubmit={handleSubmit} className={styles.composer}>
      <textarea
        ref={inputRef}
        value={input}
        onChange={handleComposerChange}
        onKeyDown={handleComposerKeyDown}
        placeholder="Ask anything — your exam, rank and category…"
        className={styles.composerInput}
        rows={1}
        disabled={busy}
        autoFocus
      />
      {isStreaming ? (
        <button
          type="button"
          className={`${styles.sendButton} ${styles.stopButton}`}
          onClick={handleStop}
          aria-label="Stop generating"
          title="Stop generating"
        >
          <Square size={15} fill="currentColor" />
        </button>
      ) : (
        <button
          type="submit"
          className={styles.sendButton}
          disabled={!input.trim() || busy}
          aria-label="Send message"
        >
          <ArrowUp size={18} />
        </button>
      )}
    </form>
  );

  // Quick-details form above the composer — pick exam / rank / category / gender
  // once and the bot uses them (sent as priorParams) without asking in chat.
  const formExam = profile?.exam || '';
  const categoryOptions = CATEGORY_CHOICES[formExam] || [];
  const showGender = examNeedsGender(formExam);
  const formComplete =
    !!formExam && profile?.rank != null && profile?.rank !== '' && !!profile?.category &&
    (showGender ? !!profile?.gender : true);

  const detailsForm = (
    <div className={styles.detailsForm} aria-label="Your details">
      <label className={styles.detailField}>
        <span className={styles.detailLabel}>Exam</span>
        <select
          className={styles.detailSelect}
          value={formExam}
          onChange={(e) => updateProfileField('exam', e.target.value)}
          disabled={busy}
        >
          <option value="">Select…</option>
          {EXAM_CHOICES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>

      <label className={styles.detailField}>
        <span className={styles.detailLabel}>Rank</span>
        <input
          type="number"
          min="1"
          inputMode="numeric"
          placeholder="e.g. 12000"
          className={styles.detailInput}
          value={profile?.rank ?? ''}
          onChange={(e) => updateProfileField('rank', e.target.value === '' ? null : parseInt(e.target.value, 10))}
          disabled={busy}
        />
      </label>

      <label className={styles.detailField}>
        <span className={styles.detailLabel}>Category</span>
        <select
          className={styles.detailSelect}
          value={profile?.category || ''}
          onChange={(e) => updateProfileField('category', e.target.value)}
          disabled={busy || !formExam}
        >
          <option value="">{formExam ? 'Select…' : 'Pick exam'}</option>
          {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>

      {showGender && (
        <div className={styles.detailField}>
          <span className={styles.detailLabel}>Gender</span>
          <div className={styles.genderToggle}>
            <button
              type="button"
              className={`${styles.genderOpt} ${profile?.gender === 'boys' ? styles.genderActive : ''}`}
              onClick={() => updateProfileField('gender', 'boys')}
              disabled={busy}
            >Boys</button>
            <button
              type="button"
              className={`${styles.genderOpt} ${profile?.gender === 'girls' ? styles.genderActive : ''}`}
              onClick={() => updateProfileField('gender', 'girls')}
              disabled={busy}
            >Girls</button>
          </div>
        </div>
      )}

      {formComplete && (
        <button
          type="button"
          className={styles.detailGo}
          onClick={() => sendMessage(buildFindMessage(profile))}
          disabled={busy}
        >
          Show colleges
        </button>
      )}
    </div>
  );

  // Subtle "N messages left this hour" hint near the composer (#14) — only when
  // the server reported a low remaining count.
  const rateHint = rateRemaining != null && rateRemaining >= 0 && rateRemaining <= 3 && (
    <p className={styles.rateHint}>
      {rateRemaining === 0
        ? 'No messages left this hour — it resets shortly.'
        : `${rateRemaining} message${rateRemaining === 1 ? '' : 's'} left this hour`}
      {!user && ' · '}
      {!user && <Link href="/login" className={styles.rateHintLink}>Sign in for more</Link>}
    </p>
  );

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
          {/* Identity lives in the sidebar (#6). Use this space only for
              lightweight context — the resolved exam, when we know it. */}
          <div className={styles.headerContext}>
            {profile?.exam && (
              <span className={styles.headerExam}>
                <GraduationCap size={14} />
                {profile.exam}
              </span>
            )}
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

        {hasUserMessages ? (
        <>
        {/* Messages */}
        <main className={styles.chatArea} ref={chatAreaRef}>
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
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
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

        {/* Docked input */}
        <footer className={styles.inputArea}>
          {/* Floating "scroll to latest" — only when scrolled up (#13). */}
          {showScrollBtn && (
            <button
              type="button"
              className={styles.scrollToBottom}
              onClick={() => scrollToBottom('smooth')}
              aria-label="Scroll to latest message"
              title="Scroll to latest"
            >
              <ArrowDown size={18} />
            </button>
          )}
          {detailsForm}
          {composer}
          {rateHint}
          <p className={styles.disclaimer}>
            Data from official TGEAPCET, AP EAPCET, JEE Main & Advanced, KCET & MHT-CET cutoffs. For reference only.
          </p>
        </footer>
        </>
        ) : (
        /* ── Hero / empty state ── */
        <main className={styles.hero}>
          <div className={styles.heroInner}>
            <span className={styles.heroMark} aria-hidden="true">
              <Bot size={30} />
            </span>
            <h1 className={styles.heroTitle}>What can I help you with today?</h1>
            <p className={styles.heroSub}>
              Tell me your exam and rank — I&apos;ll map out the colleges within reach.
            </p>

            <div className={styles.heroComposer}>
              {detailsForm}
              {composer}
              {rateHint}
            </div>

            <div className={styles.suggestions}>
              {SUGGESTIONS.map(({ icon: Icon, title, desc, prompt }) => (
                <button
                  key={title}
                  type="button"
                  className={styles.suggestionCard}
                  onClick={() => fillPrompt(prompt)}
                  disabled={isLoading || isStreaming}
                >
                  <span className={styles.suggestionIcon}>
                    <Icon size={18} />
                  </span>
                  <span className={styles.suggestionTitle}>{title}</span>
                  <span className={styles.suggestionDesc}>{desc}</span>
                </button>
              ))}
            </div>

            <p className={styles.disclaimer}>
              Data from official TGEAPCET, AP EAPCET, JEE Main & Advanced, KCET & MHT-CET cutoffs. For reference only.
            </p>
          </div>
        </main>
        )}

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
