import Link from 'next/link';
import styles from '../marketing.module.css';
import { ArrowRight, MessageSquareHeart, ListChecks, Compass } from 'lucide-react';
import Reveal from '../_components/Reveal';

export const metadata = {
  title: 'How it works — Admission Mantrana',
  description: 'From your rank to a realistic college shortlist in three simple steps.',
};

const STEPS = [
  { icon: MessageSquareHeart, title: 'Tell us about you', text: 'Share your exam, rank, category and any branch or city preference — in plain language. No forms, just a conversation.' },
  { icon: ListChecks, title: 'We match the data', text: 'We search official 2025 cutoffs filtered to your exact profile, so only the colleges and branches you’re eligible for surface.' },
  { icon: Compass, title: 'Get a clear shortlist', text: 'See realistic options with context on closing ranks, then ask follow-ups — widen branches, compare cities — until you feel confident.' },
];

export default function HowItWorks() {
  return (
    <>
      <Reveal as="header" className={styles.pageHero}>
        <span className={styles.eyebrow}>How it works</span>
        <h1 className={styles.pageHeroTitle}>From rank to shortlist in three steps.</h1>
        <p className={styles.pageHeroLede}>
          No spreadsheets, no jargon — just a conversation that ends with colleges you can
          actually get into.
        </p>
      </Reveal>

      <section className={styles.section} style={{ paddingTop: '1.5rem' }}>
        <div className={styles.stepGrid}>
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <Reveal key={title} as="article" className={styles.step} delay={i * 90}>
              <span className={styles.stepNum}>{String(i + 1).padStart(2, '0')}</span>
              <span className={styles.stepIcon}><Icon size={20} /></span>
              <h3 className={styles.stepTitle}>{title}</h3>
              <p className={styles.stepText}>{text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className={styles.ctaSection}>
        <Reveal className={styles.ctaCard}>
          <h2 className={styles.ctaTitle}>Ready when you are.</h2>
          <p className={styles.ctaText}>Start with your rank — the first answer is seconds away.</p>
          <Link href="/chat" className={styles.ctaButton}>Start chatting <ArrowRight size={18} /></Link>
        </Reveal>
      </section>
    </>
  );
}
