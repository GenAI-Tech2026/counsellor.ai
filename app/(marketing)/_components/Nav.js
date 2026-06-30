'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { LogIn, LogOut, Menu, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import styles from '../marketing.module.css';

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/features', label: 'Features' },
  { href: '/how-it-works', label: 'How it works' },
];

export default function Nav({ initialUser = null }) {
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState(initialUser);
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const lastY = useRef(0);

  // Live auth — keeps the nav correct after sign in/out without a hard reload,
  // and side-steps any stale server/route cache on back-navigation.
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) =>
      setUser(data.user ? { email: data.user.email } : null)
    );
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? { email: session.user.email } : null);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  // Smart sticky: hide on scroll down, reveal on scroll up.
  useEffect(() => {
    lastY.current = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        setScrolled(y > 6);
        if (!open) {
          const goingDown = y > lastY.current;
          if (goingDown && y > 140) setHidden(true);
          else if (!goingDown) setHidden(false);
        }
        lastY.current = y;
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [open]);

  const navClass = `${styles.nav} ${scrolled ? styles.navScrolled : ''} ${hidden ? styles.navHidden : ''}`;

  return (
    <header className={navClass}>
      <div className={styles.navInner}>
        <Link href="/" className={styles.brand} onClick={() => setOpen(false)}>
          <Image src="/branding/counsa_logo_mini.png" alt="counsa.ai" width={30} height={30} unoptimized className={styles.brandLogo} />
          <span className={styles.brandName}>counsa.ai</span>
        </Link>

        <nav className={styles.navLinks}>
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`${styles.navLink} ${pathname === l.href ? styles.navLinkActive : ''}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className={styles.navActions}>
          {user ? (
            <form action="/auth/signout" method="post">
              <button type="submit" className={styles.navGhost}>
                <LogOut size={16} /> Sign out
              </button>
            </form>
          ) : (
            <Link href="/login" className={styles.navGhost}>
              <LogIn size={16} /> Sign in
            </Link>
          )}
          <Link href="/chat" className={styles.navCta}>Open the counsellor</Link>
        </div>

        <button
          type="button"
          className={styles.navBurger}
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className={styles.navMobile}>
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={styles.navMobileLink}
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          {user ? (
            <form action="/auth/signout" method="post" style={{ width: '100%' }}>
              <button type="submit" className={styles.navMobileLink} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }}>
                Sign out
              </button>
            </form>
          ) : (
            <Link href="/login" className={styles.navMobileLink} onClick={() => setOpen(false)}>
              Sign in
            </Link>
          )}
          <Link href="/chat" className={styles.navCta} onClick={() => setOpen(false)}>
            Open the counsellor
          </Link>
        </div>
      )}
    </header>
  );
}
