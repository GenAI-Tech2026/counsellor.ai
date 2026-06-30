'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { Menu, X, ArrowRight } from 'lucide-react';
import styles from './landing.module.css';

const LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#how', label: 'How it works' },
  { href: '#coverage', label: 'Coverage' },
  { href: '#trust', label: 'Trust' },
];

export default function Nav() {
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 12);
      // Hide on scroll-down past the hero, show on scroll-up.
      if (y > 240 && y > lastY.current + 6) setHidden(true);
      else if (y < lastY.current - 6) setHidden(false);
      lastY.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`${styles.nav} ${scrolled ? styles.navScrolled : ''} ${hidden ? styles.navHidden : ''} ${open ? styles.menuOpen : ''}`}>
      <div className={styles.navInner}>
        <Link href="/" className={styles.brand} aria-label="counsa.ai home">
          <Image src="/branding/counsa_logo_mini.png" alt="" width={30} height={30} priority />
          <span>counsa<b style={{ color: 'var(--accent)' }}>.ai</b></span>
        </Link>

        <nav className={styles.navLinks} aria-label="Primary">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className={styles.navLink}>{l.label}</a>
          ))}
        </nav>

        <div className={styles.navCtas}>
          <Link href="/chat" className={styles.navPill}>
            <span className={styles.navPillText}>Open counsellor</span>
            <ArrowRight size={16} />
          </Link>
          <button className={styles.burger} aria-label="Menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      <div className={styles.mobileMenu}>
        {LINKS.map((l) => (
          <a key={l.href} href={l.href} onClick={() => setOpen(false)}>{l.label}</a>
        ))}
        <Link href="/chat" onClick={() => setOpen(false)}>Open counsellor →</Link>
      </div>
    </header>
  );
}
