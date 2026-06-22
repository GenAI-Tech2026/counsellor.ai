import Link from 'next/link';
import styles from '../marketing.module.css';
import { ArrowRight, Scale, ShieldCheck, HeartHandshake } from 'lucide-react';
import Reveal from '../_components/Reveal';

export const metadata = {
  title: 'About — Admission Mantrana',
  description: 'Why Admission Mantrana exists: fair, data-grounded admission counselling for every student.',
};

const VALUES = [
  { icon: Scale, title: 'Fairness', text: 'The same official cutoffs the experts use — available to every student, free to start.' },
  { icon: ShieldCheck, title: 'Honesty', text: 'Answers are grounded in real data with sources shown. It never invents colleges.' },
  { icon: HeartHandshake, title: 'Guidance', text: 'It asks what it needs and explains the “why”, like a counsellor who has time for you.' },
];

export default function About() {
  return (
    <>
      <Reveal as="header" className={styles.pageHero}>
        <span className={styles.eyebrow}>About</span>
        <h1 className={styles.pageHeroTitle}>Counselling, for everyone.</h1>
        <p className={styles.pageHeroLede}>
          We&apos;re leveling a playing field that has long rewarded those with the right
          connections over those with the right results.
        </p>
      </Reveal>

      <section className={styles.section} style={{ paddingTop: '1.5rem' }}>
        <Reveal className={styles.prose}>
          <p>
            Every year, students with the <strong>same rank</strong> end up at very different
            colleges — often just because someone in their circle knew how to read the cutoff
            sheets, juggle the categories, and time the counselling rounds.
          </p>
          <p>
            <strong>Admission Mantrana</strong> exists to close that gap. It speaks plain
            language, understands your exam, rank, category and preferences, and matches them
            against the same official TGEAPCET and JEE JoSAA data the experts rely on — so the
            advice you get doesn&apos;t depend on who you know.
          </p>
        </Reveal>

        <Reveal as="p" className={styles.pullQuote}>
          “Your future shouldn&apos;t depend on <span>who you know</span> — only on what you&apos;ve earned.”
        </Reveal>

        <Reveal className={styles.valueGrid}>
          {VALUES.map(({ icon: Icon, title, text }) => (
            <article key={title} className={styles.valueCard}>
              <span className={styles.valueIcon}><Icon size={20} /></span>
              <h3 className={styles.valueTitle}>{title}</h3>
              <p className={styles.valueText}>{text}</p>
            </article>
          ))}
        </Reveal>
      </section>

      <section className={styles.ctaSection}>
        <Reveal className={styles.ctaCard}>
          <h2 className={styles.ctaTitle}>Meet your counsellor.</h2>
          <p className={styles.ctaText}>See what it can do for your rank — no sign-up needed to start.</p>
          <Link href="/chat" className={styles.ctaButton}>Start chatting <ArrowRight size={18} /></Link>
        </Reveal>
      </section>
    </>
  );
}
