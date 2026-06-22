import Link from 'next/link';
import { GraduationCap } from 'lucide-react';
import styles from '../marketing.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerBrand}>
          <span className={styles.brandMark}><GraduationCap size={18} /></span>
          <div>
            <p className={styles.footerName}>Admission Mantrana</p>
            <p className={styles.footerTag}>AI admission counselling for Indian students.</p>
          </div>
        </div>
        <nav className={styles.footerLinks}>
          <Link href="/about">About</Link>
          <Link href="/features">Features</Link>
          <Link href="/how-it-works">How it works</Link>
          <Link href="/chat">Open counsellor</Link>
        </nav>
      </div>
      <p className={styles.footerNote}>
        Data from TGEAPCET 2025 last-rank statements &amp; JEE Main 2025 JoSAA (final round).
        For reference only — always verify with official counselling authorities.
      </p>
    </footer>
  );
}
