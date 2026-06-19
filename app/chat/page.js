"use client";

import { useState, useRef, useEffect } from 'react';
import styles from './chat.module.css';
import { Send, User, Bot, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ChatPage() {
  const [messages, setMessages] = useState([
    { role: 'model', parts: [{ text: "Hello! I'm your Admission Mantrana AI Counsellor. How can I assist you with your college admissions journey today?" }] }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', parts: [{ text: input }] };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Map history to the format Gemini expects for existing conversation context
      // We skip the initial greeting message because history must start with a user message
      const history = messages.length > 1 ? messages.slice(1).map(msg => ({
        role: msg.role,
        parts: msg.parts
      })) : [];

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: input, history }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessages(prev => [...prev, { role: 'model', parts: [{ text: data.text }] }]);
      } else {
        console.error("Error from API:", data.error);
        setMessages(prev => [...prev, { role: 'model', parts: [{ text: "I'm sorry, I encountered an error while trying to respond. Please try again." }] }]);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      setMessages(prev => [...prev, { role: 'model', parts: [{ text: "Network error. Please check your connection and try again." }] }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={`${styles.header} glass`}>
        <Link href="/" className={styles.backButton}>
          <ArrowLeft size={20} />
        </Link>
        <div className={styles.headerTitle}>
          <Bot size={24} className={styles.headerIcon} />
          <h2>AI Counsellor</h2>
        </div>
      </header>

      <main className={styles.chatArea}>
        <div className={styles.messagesList}>
          {messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            return (
              <div key={index} className={`${styles.messageWrapper} ${isUser ? styles.messageUser : styles.messageBot}`}>
                <div className={styles.avatar}>
                  {isUser ? <User size={18} /> : <Bot size={18} />}
                </div>
                <div className={`${styles.bubble} ${isUser ? styles.bubbleUser : styles.bubbleBot} glass`}>
                  {msg.parts[0].text}
                </div>
              </div>
            );
          })}
          
          {isLoading && (
            <div className={`${styles.messageWrapper} ${styles.messageBot}`}>
              <div className={styles.avatar}>
                <Bot size={18} />
              </div>
              <div className={`${styles.bubble} ${styles.bubbleBot} ${styles.loadingBubble} glass`}>
                <Loader2 size={20} className={styles.spinner} />
                Thinking...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      <footer className={styles.inputArea}>
        <form onSubmit={handleSubmit} className={`${styles.inputForm} glass`}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your question here..."
            className={styles.inputField}
            disabled={isLoading}
          />
          <button type="submit" className={styles.sendButton} disabled={!input.trim() || isLoading}>
            <Send size={20} />
          </button>
        </form>
      </footer>
    </div>
  );
}
