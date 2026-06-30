import Link from 'next/link';
import Image from 'next/image';
import styles from '../marketing.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerBrand}>
          <Image src="/branding/counsa_logo_mini.png" alt="counsa.ai" width={30} height={30} unoptimized className={styles.brandLogo} />
          <div>
            <p className={styles.footerName}>counsa.ai</p>
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
        Data from official last-rank statements &amp; JoSAA / state-CET counselling cutoffs.
        For reference only — always verify with official counselling authorities.
      </p>
    </footer>
  );
}
