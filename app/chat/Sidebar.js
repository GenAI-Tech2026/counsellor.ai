"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import {
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  SquarePen,
  MessageSquare,
  Trash2,
  Loader2,
  LogOut,
  UserCog,
  Search,
  X,
} from 'lucide-react';
import styles from './sidebar.module.css';

function initialOf(user) {
  const base = (user?.name || user?.email || '?').trim();
  return base ? base.charAt(0).toUpperCase() : '?';
}

export default function Sidebar({
  conversations = [],
  activeId = null,
  onSelect,
  onNew,
  onDelete,
  user = null,
  loading = false,
  collapsed = false,
  onToggle,
  mobileOpen = false,
  onCloseMobile,
}) {
  // Navigating on mobile should also close the drawer.
  const handleNew = () => { onNew?.(); onCloseMobile?.(); };
  const handleSelect = (id) => { onSelect?.(id); onCloseMobile?.(); };

  // ── Search state ──
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const isSearching = query.trim().length > 0;

  // Debounced search against /api/conversations/search. All state updates run
  // inside the timeout/fetch (asynchronously) to avoid cascading renders.
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      let cancelled = false;
      const reset = setTimeout(() => {
        if (!cancelled) {
          setResults([]);
          setSearching(false);
        }
      }, 0);
      return () => {
        cancelled = true;
        clearTimeout(reset);
      };
    }

    let active = true;
    const handle = setTimeout(async () => {
      if (active) setSearching(true);
      try {
        const res = await fetch(`/api/conversations/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (active) setResults(data.results || []);
      } catch {
        if (active) setResults([]);
      } finally {
        if (active) setSearching(false);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(handle);
    };
  }, [query]);

  // ── Collapsed: thin rail with just the toggle + new chat ──
  if (collapsed) {
    return (
      <aside className={`${styles.sidebar} ${styles.collapsed}`} aria-label="Chat sidebar">
        <div className={styles.railTop}>
          <button
            type="button"
            className={styles.iconButton}
            onClick={onToggle}
            aria-label="Expand sidebar"
            title="Expand sidebar"
          >
            <PanelLeftOpen size={20} />
          </button>
          <button
            type="button"
            className={`${styles.iconButton} ${styles.railNew}`}
            onClick={handleNew}
            aria-label="New chat"
            title="New chat"
          >
            <SquarePen size={20} />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={`${styles.sidebar} ${mobileOpen ? styles.mobileOpen : ''}`}
      aria-label="Chat sidebar"
    >
      {/* ── Header ── */}
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">
            <MessageSquare size={16} />
          </span>
          <span className={styles.brandName}>Admission Mantrana</span>
        </div>
        <button
          type="button"
          className={`${styles.iconButton} ${styles.collapseToggle}`}
          onClick={onToggle}
          aria-label="Collapse sidebar"
          title="Collapse sidebar"
        >
          <PanelLeftClose size={20} />
        </button>
        <button
          type="button"
          className={`${styles.iconButton} ${styles.mobileClose}`}
          onClick={onCloseMobile}
          aria-label="Close menu"
          title="Close menu"
        >
          <X size={20} />
        </button>
      </header>

      {/* ── Search ── */}
      {user && (
        <div className={styles.searchWrap}>
          <Search size={15} className={styles.searchIcon} aria-hidden="true" />
          <input
            type="search"
            className={styles.searchInput}
            placeholder="Search chats…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search conversations"
          />
          {query && (
            <button
              type="button"
              className={styles.searchClear}
              onClick={() => setQuery('')}
              aria-label="Clear search"
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {/* ── New chat ── */}
      <button type="button" className={styles.newChat} onClick={handleNew} aria-label="New chat">
        <Plus size={18} className={styles.newChatIcon} />
        <span>New chat</span>
      </button>

      {/* ── Search results ── */}
      {isSearching ? (
        <div className={styles.listSection}>
          <p className={styles.sectionLabel}>
            {searching ? 'Searching…' : `Results (${results.length})`}
          </p>

          <nav className={styles.list} aria-label="Search results">
            {searching && results.length === 0 ? (
              <div className={styles.loadingText}>
                <Loader2 size={14} className={styles.spinner} />
                <span>Searching…</span>
              </div>
            ) : results.length === 0 ? (
              <p className={styles.empty}>No chats match “{query.trim()}”.</p>
            ) : (
              results.map((r) => {
                const isActive = r.id === activeId;
                return (
                  <div
                    key={r.id}
                    className={`${styles.row} ${styles.resultRow} ${isActive ? styles.rowActive : ''}`}
                    role="button"
                    tabIndex={0}
                    aria-current={isActive ? 'true' : undefined}
                    onClick={() => handleSelect(r.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelect(r.id);
                      }
                    }}
                    title={r.title}
                  >
                    <MessageSquare size={16} className={styles.rowIcon} />
                    <div className={styles.resultText}>
                      <span className={styles.rowTitle}>{r.title || 'Untitled chat'}</span>
                      {r.snippet && (
                        <span className={styles.resultSnippet}>{r.snippet}</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </nav>
        </div>
      ) : (
      /* ── Recent list ── */
      <div className={styles.listSection}>
        <p className={styles.sectionLabel}>Recent</p>

        <nav className={styles.list} aria-label="Recent conversations">
          {loading ? (
            <div className={styles.loadingWrap}>
              <div className={styles.skeleton} />
              <div className={styles.skeleton} />
              <div className={styles.skeleton} />
              <div className={styles.loadingText}>
                <Loader2 size={14} className={styles.spinner} />
                <span>Loading…</span>
              </div>
            </div>
          ) : !user ? (
            <div className={styles.prompt}>
              <p className={styles.promptText}>Sign in to save and revisit your chats</p>
              <Link href="/login" className={styles.signInButton}>
                Sign in
              </Link>
            </div>
          ) : conversations.length === 0 ? (
            <p className={styles.empty}>No chats yet — start a new conversation.</p>
          ) : (
            conversations.map((c) => {
              const isActive = c.id === activeId;
              return (
                <div
                  key={c.id}
                  className={`${styles.row} ${isActive ? styles.rowActive : ''}`}
                  role="button"
                  tabIndex={0}
                  aria-current={isActive ? 'true' : undefined}
                  onClick={() => handleSelect(c.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelect(c.id);
                    }
                  }}
                  title={c.title}
                >
                  <MessageSquare size={16} className={styles.rowIcon} />
                  <span className={styles.rowTitle}>{c.title || 'Untitled chat'}</span>
                  <button
                    type="button"
                    className={styles.deleteButton}
                    aria-label={`Delete chat: ${c.title || 'Untitled chat'}`}
                    title="Delete chat"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete?.(c.id);
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })
          )}
        </nav>
      </div>
      )}

      {/* ── Footer: user info, profile link, sign out ── */}
      {user && (
        <footer className={styles.footer}>
          <div className={styles.userInfo}>
            <span className={styles.avatar} aria-hidden="true">
              {initialOf(user)}
            </span>
            <span className={styles.userName}>{user.name || user.email}</span>
          </div>
          <Link href="/profile" className={styles.profileLink}>
            <UserCog size={16} />
            <span>My details</span>
          </Link>
          <form action="/auth/signout" method="post" className={styles.signOutForm}>
            <button type="submit" className={styles.signOutButton} aria-label="Sign out">
              <LogOut size={16} />
              <span>Sign out</span>
            </button>
          </form>
        </footer>
      )}
    </aside>
  );
}
