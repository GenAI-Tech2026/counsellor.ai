'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import styles from './landing.module.css';

/**
 * Email capture that simply forwards into the chat — the counsellor itself asks
 * for details, so we don't block on a form. The address is passed along so the
 * chat can prefill if it wants to.
 */
export default function EmailCta() {
  const router = useRouter();
  const [email, setEmail] = useState('');

  const go = (e) => {
    e.preventDefault();
    const q = email.trim() ? `?email=${encodeURIComponent(email.trim())}` : '';
    router.push(`/chat${q}`);
  };

  return (
    <form className={styles.ctaForm} onSubmit={go}>
      <input
        type="email"
        inputMode="email"
        placeholder="you@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        aria-label="Email address"
      />
      <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
        Get started <ArrowRight size={18} />
      </button>
    </form>
  );
}
