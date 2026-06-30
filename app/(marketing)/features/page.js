import Link from 'next/link';
import styles from '../marketing.module.css';
import {
  ArrowRight, Database, Target, UserCircle, History,
  MessageSquareHeart, ShieldCheck,
} from 'lucide-react';
import Reveal from '../_components/Reveal';

export const metadata = {
  title: 'Features — counsa.ai',
  description: 'Everything counsa.ai does: official-data answers, profile personalization, saved & searchable sessions, and more.',
};

const FEATURES = [
  { icon: Database, title: 'Built on official data', text: 'Every answer is grounded in official last-rank statements and JoSAA closing ranks — across JEE, JEE Advanced and state CETs like TGEAPCET, APEAMCET, KCET & MHT-CET. Not guesswork.' },
  { icon: Target, title: 'Matched to your rank', text: 'Tell it your exam, rank, category and gender. It filters thousands of college-branch cutoffs to what you can realistically get.' },
  { icon: UserCircle, title: 'Remembers your profile', text: 'Save your details once and every chat is personalized automatically — no repeating yourself each session.' },
  { icon: History, title: 'Save & search sessions', text: 'Your conversations are kept and fully searchable, so you can revisit advice whenever you need it.' },
  { icon: MessageSquareHeart, title: 'Helpful, and improving', text: 'Rate answers, copy them, or export a whole session as a file — your feedback sharpens future guidance.' },
  { icon: ShieldCheck, title: 'Honest by design', text: 'Reference-only guidance with sources shown. It asks for what it needs and never invents colleges.' },
];

export default function Features() {
  return (
    <>
      <Reveal as="header" className={styles.pageHero}>
        <span className={styles.eyebrow}>Features</span>
        <h1 className={styles.pageHeroTitle}>Everything you need to choose well.</h1>
        <p className={styles.pageHeroLede}>
          Not a chatbot bolted onto a search box — a counsellor that knows the data,
          remembers you, and earns your trust.
        </p>
      </Reveal>

      <section className={styles.section} style={{ paddingTop: '1.5rem' }}>
        <div className={styles.featureGrid}>
          {FEATURES.map(({ icon: Icon, title, text }, i) => (
            <Reveal key={title} as="article" className={styles.featureCard} delay={(i % 3) * 90}>
              <span className={styles.featureIcon}><Icon size={20} /></span>
              <h3 className={styles.featureTitle}>{title}</h3>
              <p className={styles.featureText}>{text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className={styles.ctaSection}>
        <Reveal className={styles.ctaCard}>
          <h2 className={styles.ctaTitle}>Try it on your rank.</h2>
          <p className={styles.ctaText}>It only takes your rank to get a first shortlist.</p>
          <Link href="/chat" className={styles.ctaButton}>Open the counsellor <ArrowRight size={18} /></Link>
        </Reveal>
      </section>
    </>
  );
}
