import Link from 'next/link';
import styles from './marketing.module.css';
import { Sparkles, ArrowRight } from 'lucide-react';
import Reveal from './_components/Reveal';
import CountUp from './_components/CountUp';
import Parallax from './_components/Parallax';
import ChatDemo from './_components/ChatDemo';
import WelcomeVideo from './_video/WelcomeVideo';
import ForkArt from './_components/illustrations/ForkArt';
import JourneyArt from './_components/illustrations/JourneyArt';
import { DataStack, TargetMatch, ProfileCard } from './_components/illustrations/FeatureArt';

const FEATURE_STORIES = [
  { Art: DataStack, eyebrow: 'Grounded', title: 'Built on official data.', text: 'Every answer comes from official JoSAA & state-CET counselling cutoffs — never guesswork, never hype.' },
  { Art: TargetMatch, eyebrow: 'Personal', title: 'Matched to your rank.', text: 'It filters thousands of college-branch cutoffs down to the ones you can realistically get.' },
  { Art: ProfileCard, eyebrow: 'Effortless', title: 'Remembers you.', text: 'Save your details once and every conversation is personalized — no repeating yourself.' },
];

export default function Home() {
  return (
    <>
      {/* ── Hero ── */}
      <header className={styles.hero}>
        <span className={styles.heroGlow} aria-hidden="true" />
        <span className={styles.heroGlow2} aria-hidden="true" />
        <div className={styles.heroCopy}>
          <span className={styles.badge}><Sparkles size={14} /> AI admission counselling</span>
          <h1 className={styles.heroTitle}>
            Know where your<br /><em>rank</em> can take you.
          </h1>
          <p className={styles.heroLede}>
            Tell Counsa your exam and rank — it reads the official cutoffs and
            shows the colleges within your reach.
          </p>
          <div className={styles.heroActions}>
            <Link href="/chat" className={styles.ctaButton}>Start chatting <ArrowRight size={18} /></Link>
            <Link href="/how-it-works" className={styles.secondaryButton}>See how it works</Link>
          </div>
          <p className={styles.heroNote}>Free to try — no sign-up needed to start.</p>
        </div>
        <ChatDemo />
      </header>

      {/* ── Welcome video (Remotion, scroll-scrubbed) ── */}
      <section className={styles.videoSection}>
        <Reveal className={styles.sectionHead}>
          <span className={styles.eyebrow}>See it in action</span>
          <h2 className={styles.sectionTitle}>Your counsellor, in 20 seconds.</h2>
          <p className={styles.sectionLede}>Scroll to play — the story unfolds as you go.</p>
        </Reveal>
        <WelcomeVideo />
      </section>

      {/* ── Stats ── */}
      <section className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statNum}><CountUp to={6} /></span>
          <span className={styles.statLabel}>exams covered<br />JEE, state CETs &amp; more</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <span className={styles.statNum}><CountUp to={4} /></span>
          <span className={styles.statLabel}>states + All-India<br />counselling</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <span className={styles.statNum}>1000s</span>
          <span className={styles.statLabel}>college-branch<br />cutoff records</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <span className={styles.statNum}>24/7</span>
          <span className={styles.statLabel}>instant answers<br />any time</span>
        </div>
      </section>

      {/* ── Story: the problem ── */}
      <section className={styles.story}>
        <span className={`${styles.storyOrb} ${styles.storyOrbA}`} aria-hidden="true" />
        <div className={styles.storyInner}>
          <div className={styles.storyRow}>
            <Reveal className={styles.storyArtCol}>
              <Parallax speed={0.05}>
                <div className={styles.scenePanel}><ForkArt className={styles.sceneArt} /></div>
              </Parallax>
            </Reveal>
            <Reveal className={styles.storyCopyCol} delay={90}>
              <span className={styles.eyebrow}>The problem</span>
              <h2 className={styles.storyTitle}>Same rank.<br />Different fates.</h2>
              <p className={styles.storyText}>
                Two students, identical scores — one lands a great seat, the other drowns in
                cutoff sheets. The difference is rarely merit. It&apos;s knowing how to read the data.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Journey ── */}
      <section className={styles.story}>
        <span className={`${styles.storyOrb} ${styles.storyOrbB}`} aria-hidden="true" />
        <div className={styles.storyInner}>
          <Reveal className={styles.sectionHead}>
            <span className={styles.eyebrow}>How it works</span>
            <h2 className={styles.sectionTitle}>From rank to shortlist.</h2>
          </Reveal>
          <Reveal className={styles.journeyArtWrap}>
            <JourneyArt className={styles.journeyArt} />
          </Reveal>
          <Reveal style={{ textAlign: 'center' }}>
            <Link href="/how-it-works" className={styles.inlineLink}>
              See the full walkthrough <ArrowRight size={16} />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ── What you get (feature stories) ── */}
      <section className={styles.story}>
        <div className={styles.storyInner}>
          <Reveal className={styles.sectionHead}>
            <span className={styles.eyebrow}>Why it&apos;s different</span>
            <h2 className={styles.sectionTitle}>A counsellor, not a search box.</h2>
          </Reveal>
          {FEATURE_STORIES.map(({ Art, eyebrow, title, text }, i) => (
            <div key={title} className={`${styles.storyRow} ${styles.featureRow} ${i % 2 ? styles.reverse : ''}`}>
              <Reveal className={styles.storyArtCol}>
                <Parallax speed={0.045}>
                  <div className={styles.featureArtWrap}><Art className={styles.featureArt} /></div>
                </Parallax>
              </Reveal>
              <Reveal className={styles.storyCopyCol} delay={90}>
                <span className={styles.eyebrow}>{eyebrow}</span>
                <h3 className={styles.storyTitle}>{title}</h3>
                <p className={styles.storyText}>{text}</p>
              </Reveal>
            </div>
          ))}
          <Reveal style={{ textAlign: 'center', marginTop: '3rem' }}>
            <Link href="/features" className={styles.inlineLink}>
              Explore all features <ArrowRight size={16} />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className={styles.ctaSection}>
        <Reveal className={styles.ctaCard}>
          <h2 className={styles.ctaTitle}>Find your college with confidence.</h2>
          <p className={styles.ctaText}>Ask your first question now — it only takes your rank to begin.</p>
          <Link href="/chat" className={styles.ctaButton}>Open the counsellor <ArrowRight size={18} /></Link>
        </Reveal>
      </section>
    </>
  );
}
