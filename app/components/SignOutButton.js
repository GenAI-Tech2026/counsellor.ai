"use client";

import { useEffect, useState } from 'react';
import { LogOut } from 'lucide-react';
import styles from './SignOutButton.module.css';

/**
 * Sign-out trigger that asks for confirmation before posting to /auth/signout.
 * Pass `className` to style the trigger button to match its surroundings.
 */
export default function SignOutButton({ className, iconSize = 16, label = 'Sign out' }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const close = () => {
    if (!loading) setOpen(false);
  };

  // Close on Escape while the dialog is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape' && !loading) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, loading]);

  return (
    <>
      <button
        type="button"
        className={className}
        aria-label={label}
        onClick={() => setOpen(true)}
      >
        <LogOut size={iconSize} />
        <span>{label}</span>
      </button>

      {open && (
        <div
          className={styles.overlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="signout-title"
          onClick={close}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 id="signout-title" className={styles.title}>
              Sign out?
            </h2>
            <p className={styles.message}>
              You&apos;ll need to sign in again to access your chats.
            </p>
            <form
              action="/auth/signout"
              method="post"
              className={styles.actions}
              onSubmit={() => setLoading(true)}
            >
              <button
                type="button"
                className={styles.cancel}
                onClick={close}
                disabled={loading}
              >
                Cancel
              </button>
              <button type="submit" className={styles.confirm} disabled={loading}>
                {loading ? 'Signing out…' : 'Sign out'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
