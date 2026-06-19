"use client";

import Link from 'next/link';
import {
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  SquarePen,
  MessageSquare,
  Trash2,
  Loader2,
  LogOut,
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
}) {
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
            onClick={onNew}
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
    <aside className={styles.sidebar} aria-label="Chat sidebar">
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
          className={styles.iconButton}
          onClick={onToggle}
          aria-label="Collapse sidebar"
          title="Collapse sidebar"
        >
          <PanelLeftClose size={20} />
        </button>
      </header>

      {/* ── New chat ── */}
      <button type="button" className={styles.newChat} onClick={onNew} aria-label="New chat">
        <Plus size={18} className={styles.newChatIcon} />
        <span>New chat</span>
      </button>

      {/* ── Recent list ── */}
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
                  onClick={() => onSelect?.(c.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelect?.(c.id);
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

      {/* ── Footer ── */}
      {user && (
        <footer className={styles.footer}>
          <div className={styles.userInfo}>
            <span className={styles.avatar} aria-hidden="true">
              {initialOf(user)}
            </span>
            <span className={styles.userName}>{user.name || user.email}</span>
          </div>
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
