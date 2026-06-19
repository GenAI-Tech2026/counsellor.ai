"use client";

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './chat.module.css';
import { Send, User, Bot, Loader2, ArrowLeft, BookOpen } from 'lucide-react';
import Link from 'next/link';

const SOURCE_RE = /\[Source:\s*([^\]]+)\]/g;

const EXAMPLE_QUESTIONS = [
  'My rank is 5000, OC category, male — what CSE colleges can I get?',
  'Show ECE options for BC-B female with rank 8000',
  'Top colleges in Hyderabad for rank 3000, SC category, male',
  'What branches can I get with rank 15000, OC category, female?',
  'BC-A male, rank 12000 — any Mechanical Engineering seats?',
];

function parseSources(text) {
  const sources = [];
  const clean = text.replace(SOURCE_RE, (_, src) => {
    sources.push(src.trim());
    return '';
  }).trim();
  return { clean, sources: [...new Set(sources)] };
}

export default function ChatPage() {
  const [messages, setMessages] = useState([
    {
      role: 'model',
      text: "Hello! I'm your **Admission Mantrana AI Counsellor**.\n\nI can help you find colleges based on your TGEAPCET 2025 rank. Just tell me your rank and I'll guide you through the rest! 🎓",
      sources: [],
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const sendMessage = async (text) => {
    const userMsg = { role: 'user', text, sources: [] };
    const history = messages
      .filter(m => m.role !== 'user' || m.text)
      .slice(1)                          // drop initial greeting
      .map(m => ({
        role: m.role,
        parts: [{ text: m.text }],
      }));

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

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

    // Start streaming
    setIsLoading(false);
    setIsStreaming(true);

    // Add a placeholder bot message that we'll update as chunks arrive
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
      // Finalise: parse sources out of the full text
      const { clean, sources } = parseSources(accumulated);
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'model',
          text: clean || accumulated,
          sources,
          streaming: false,
        };
        return updated;
      });
      setIsStreaming(false);
      inputRef.current?.focus();
    }
  };

  const hasUserMessages = messages.some(m => m.role === 'user');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading || isStreaming) return;
    sendMessage(input.trim());
  };

  return (
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
          Data from TGEAPCET 2025 official last rank statements. For reference only.
        </p>
      </footer>
    </div>
  );
}
