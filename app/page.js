import Link from 'next/link';
import {
  ArrowRight, Sparkles, Clock, ShieldCheck, Database, Target, UserRound,
  Check, Star, Zap, Lock, Gauge, BookOpenCheck, AtSign, MessageCircle, Mail,
} from 'lucide-react';
import styles from './_landing/landing.module.css';
import Nav from './_landing/Nav';
import Reveal from './_landing/Reveal';
import AnimatedHeadline from './_landing/AnimatedHeadline';
import HeroShowcase from './_landing/HeroShowcase';
import EmailCta from './_landing/EmailCta';
import Coverage from './_landing/Coverage';
import Stats from './_landing/Stats';
import IndiaMap from './_landing/IndiaMap';
import ScrollThread from './_landing/ScrollThread';
import { AlwaysOnMock, DataMock, MatchMock, ProfileMock } from './_landing/Mockups';

export const metadata = {
  title: 'counsa.ai — Your AI admission counsellor',
  description:
    'Tell counsa your exam, rank and category — it reads the official JoSAA & state-CET cutoffs and shows the colleges genuinely within your reach. Instant, grounded, 24/7.',
};

const EXAMS = ['JEE Main', 'JEE Advanced', 'AP EAMCET', 'TS EAMCET', 'KCET', 'MHT CET'];

const QUERIES = [
  { c: '#f35b04', i: 'A', name: 'Ananya · Andhra Pradesh', who: 'AP EAMCET · 8,900 rank', q: '“Can I get CSE in a good college near Vijayawada with the BC-B category?”', tag: 'Answered in 4s' },
  { c: '#0e9f6e', i: 'R', name: 'Rohan · Maharashtra', who: 'MHT CET · 96.4 %ile', q: '“Compare COEP vs VJTI for ENTC — which closes higher this year?”', tag: 'Answered in 6s' },
  { c: '#6366f1', i: 'M', name: 'Meera · All-India', who: 'JEE Main · 12,840 CRL', q: '“What are my realistic NIT options for CSE/AI under OBC-NCL?”', tag: 'Answered in 3s' },
];

const FEATURES = [
  {
    Art: AlwaysOnMock, eyebrow: 'Always on', title: 'A counsellor that never sleeps.',
    text: 'Counselling windows are short and the doubts come at midnight. Ask anything, any time — get a clear, grounded answer in seconds instead of waiting days for an appointment.',
    points: ['Instant replies, 24/7', 'No appointment, no queue', 'As patient as you need'],
  },
  {
    Art: DataMock, eyebrow: 'Grounded', title: 'Built on official cutoffs — not vibes.', reverse: true,
    text: 'Every recommendation is traced to real JoSAA and state-CET closing ranks. No inflated promises, no random lists — just what the data actually supports.',
    points: ['JoSAA + state CET data', 'Closing ranks, year on year', 'Sources you can trust'],
  },
  {
    Art: MatchMock, eyebrow: 'Personal', title: 'Matched to your rank and category.',
    text: 'It filters thousands of college-branch combinations down to the seats you can realistically get — by your rank, category, gender and home state.',
    points: ['Rank + category aware', 'Home-state quota handled', 'Reach, target & safe picks'],
  },
  {
    Art: ProfileMock, eyebrow: 'Effortless', title: 'Remembers you, every time.', reverse: true,
    text: 'Save your details once. Every future conversation already knows your rank, category and preferences — so you never repeat yourself.',
    points: ['Profile saved securely', 'Personal from message one', 'Pick up where you left off'],
  },
];

const TRUST = [
  { Icon: Database, title: 'Grounded in real data', text: 'Answers are built from official JoSAA and state-CET counselling records — verifiable, not guesswork.' },
  { Icon: Gauge, title: 'Answers in seconds', text: 'Tuned retrieval and caching mean you get a considered, rank-aware reply faster than you can open a cutoff PDF.' },
  { Icon: Lock, title: 'Private by default', text: 'Your rank and profile stay yours. We never sell your data, and you can clear your profile at any time.' },
];

const TESTIMONIALS = [
  { q: 'I had no idea which NITs were even possible at my rank. Counsa laid it out in two minutes — reach, target and safe. Saved us a paid counsellor.', name: 'Priya S.', who: 'Parent · JEE Main 2026' },
  { q: 'It actually knew the BC-B home-state quota for AP EAMCET. Every other tool just gave me a generic list.', name: 'Karthik R.', who: 'Student · Vijayawada' },
  { q: 'Asked it the same doubt five different ways at 1 AM. Never got tired, never gave me a wrong cutoff. This is the future.', name: 'Aarav M.', who: 'Student · Pune' },
];

const THREAD = [
  { id: 'hero', num: '1', label: 'Your rank' },
  { id: 'coverage', num: '2', label: 'Pick your exam' },
  { id: 'intent', num: '3', label: 'Ask anything' },
  { id: 'features', num: '4', label: 'Get matched' },
  { id: 'trust', num: '5', label: 'Trusted data' },
  { id: 'cta', num: '6', label: 'Your shortlist' },
];

export default function Home() {
  return (
    <div className={styles.page}>
      <Nav />
      <ScrollThread nodes={THREAD} />
      <main className={styles.main}>

        {/* ───────────────────────── HERO ───────────────────────── */}
        <header id="hero" className={styles.hero}>
          <span className={`${styles.heroBlob} ${styles.heroBlobA}`} aria-hidden="true" />
          <span className={`${styles.heroBlob} ${styles.heroBlobB}`} aria-hidden="true" />
          <div className={styles.wrap}>
            <div className={styles.heroCopy}>
              <span className={styles.badge}><i><Sparkles size={13} /></i> AI admission counselling</span>
              <AnimatedHeadline
                className={styles.heroTitle}
                segments={['Know exactly where your', { accent: 'rank' }, 'can take you.']}
              />
              <p className={styles.heroLede}>
                Tell counsa your exam, rank and category. It reads the official cutoffs and shows the
                colleges genuinely within your reach — in seconds.
              </p>
              <div className={styles.heroActions}>
                <Link href="/chat" className={`${styles.btn} ${styles.btnMesh}`}>Start chatting <ArrowRight size={18} /></Link>
              </div>
              <p className={styles.heroNote}><Sparkles size={15} color="var(--accent)" /> Free to start · no sign-up · your shortlist in <b>~2 minutes</b></p>
            </div>
          </div>
        </header>

        {/* ─────────────── HERO SHOWCASE (full-bleed band) ─────────────── */}
        <section className={styles.showcaseBand} aria-label="A preview of the counsellor">
          <div className={styles.showcaseBandInner}>
            <HeroShowcase />
          </div>
        </section>

        {/* ─────────────────────── COVERAGE ─────────────────────── */}
        <div id="coverage"><Coverage /></div>

        {/* ─────────────────────── STATS ─────────────────────────── */}
        <section className={styles.statsSection}>
          <div className={styles.wrap}><Stats /></div>
        </section>

        {/* ──────────────────── INTENT / LIVE GRID ──────────────── */}
        <section id="intent" className={`${styles.section} ${styles.intent}`}>
          <div className={styles.wrap}>
            <Reveal className={`${styles.sectionHead} ${styles.center}`}>
              <span className={styles.eyebrow}><Zap size={14} /> Works across every state</span>
              <h2 className={styles.h2}>Real questions. Grounded answers. Right now.</h2>
              <p className={styles.lede}>Students across India ask counsa rank-specific questions — the kind that used to need an expensive counsellor and a week of waiting.</p>
            </Reveal>
            <div className={styles.intentGrid}>
              <Reveal className={styles.mapCol}><IndiaMap /></Reveal>
              <div className={styles.feedCol}>
                {QUERIES.map((q, i) => (
                  <Reveal key={q.name} className={styles.queryCard} delay={i * 110}>
                    <div className={styles.queryHead}>
                      <span className={styles.avatar} style={{ background: q.c }}>{q.i}</span>
                      <div><b>{q.name}</b><small>{q.who}</small></div>
                    </div>
                    <p className={styles.queryText}>{q.q}</p>
                    <span className={styles.queryTag}><Check size={13} /> {q.tag}</span>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ───────────────────── FEATURES ───────────────────────── */}
        <section id="features" className={styles.section}>
          <div className={styles.wrap}>
            <Reveal className={`${styles.sectionHead} ${styles.center}`}>
              <span className={styles.eyebrow}><BookOpenCheck size={14} /> Why it&apos;s different</span>
              <h2 className={styles.h2}>A counsellor, not a search box.</h2>
              <p className={styles.lede}>Spreadsheets and rank predictors hand you raw numbers. Counsa understands your situation and tells you what to actually do with them.</p>
            </Reveal>

            <div id="how">
              {FEATURES.map(({ Art, eyebrow, title, text, points, reverse }) => (
                <div key={title} className={`${styles.featureRow} ${reverse ? styles.reverse : ''}`}>
                  <Reveal className={styles.featCopy}>
                    <span className={styles.eyebrow}>{eyebrow}</span>
                    <h3>{title}</h3>
                    <p>{text}</p>
                    <ul className={styles.featList}>
                      {points.map((p) => <li key={p}><Check size={19} /> {p}</li>)}
                    </ul>
                  </Reveal>
                  <Reveal className={styles.featArt} delay={120}>
                    <Art />
                  </Reveal>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ───────────────────── TRUST / SECURITY ───────────────── */}
        <section id="trust" className={styles.section} style={{ paddingInline: 0 }}>
          <div className={`${styles.trust}`} style={{ paddingBlock: 'clamp(56px,7vw,96px)' }}>
            <div className={styles.wrap}>
              <Reveal className={`${styles.sectionHead} ${styles.center}`}>
                <span className={styles.eyebrow}><ShieldCheck size={14} /> Built to be trusted</span>
                <h2 className={styles.h2}>Serious data. Serious care.</h2>
                <p className={styles.lede}>The stakes are your future, so the bar is high — accurate sources, fast answers, and your privacy respected.</p>
              </Reveal>
              <div className={styles.trioGrid}>
                {TRUST.map(({ Icon, title, text }, i) => (
                  <Reveal key={title} className={styles.trioCard} delay={i * 110}>
                    <div className={styles.trioIcon}><Icon size={24} /></div>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </Reveal>
                ))}
              </div>
              <Reveal className={styles.badgeRow}>
                <span className={styles.miniBadge}><Database size={14} /> Official JoSAA data</span>
                <span className={styles.miniBadge}><BookOpenCheck size={14} /> State-CET cutoffs</span>
                <span className={styles.miniBadge}><Lock size={14} /> Private by default</span>
                <span className={styles.miniBadge}><Clock size={14} /> 24/7 availability</span>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ───────────────────── TESTIMONIALS ───────────────────── */}
        <section className={`${styles.section} ${styles.testimonials}`}>
          <div className={styles.wrap}>
            <Reveal className={`${styles.sectionHead} ${styles.center}`}>
              <span className={styles.eyebrow}><Star size={14} /> Loved by students &amp; parents</span>
              <h2 className={styles.h2}>The clarity everyone wished they had.</h2>
            </Reveal>
            <div className={styles.tGrid}>
              {TESTIMONIALS.map((t, i) => (
                <Reveal key={t.name} className={styles.tCard} delay={i * 110}>
                  <div className={styles.stars}>{Array.from({ length: 5 }).map((_, k) => <Star key={k} size={16} fill="currentColor" />)}</div>
                  <p className={styles.tQuote}>{t.q}</p>
                  <div className={styles.tWho}>
                    <span className={styles.avatar} style={{ background: ['#f35b04', '#0e9f6e', '#6366f1'][i] }}>{t.name[0]}</span>
                    <div><b>{t.name}</b><small>{t.who}</small></div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ───────────────────────── CTA ────────────────────────── */}
        <section id="cta" className={`${styles.section} ${styles.cta}`}>
          <div className={styles.wrap}>
            <Reveal className={styles.ctaInner}>
              <h2 className={styles.ctaTitle}>Find your college with <em>confidence.</em></h2>
              <p className={styles.lede} style={{ marginInline: 'auto' }}>It only takes your rank to begin. Ask your first question now — free, no sign-up.</p>
              <EmailCta />
              <p className={styles.ctaNote}>Prefer to dive straight in? <Link href="/chat" style={{ color: 'var(--accent-press)', fontWeight: 700 }}>Open the counsellor →</Link></p>
            </Reveal>
          </div>
        </section>
      </main>

      {/* ───────────────────────── FOOTER ───────────────────────── */}
      <footer className={styles.footer}>
        <div className={styles.wrap}>
          <div className={styles.footTop}>
            <div className={styles.footBrand}>
              <span className={styles.brand}><span>counsa<b style={{ color: 'var(--accent)' }}>.ai</b></span></span>
              <p>Your AI admission counsellor — grounded in official cutoffs, available the moment you need it.</p>
            </div>
            <div className={styles.footCol}>
              <h4>Product</h4>
              <Link href="/chat">Open counsellor</Link>
              <a href="#features">Features</a>
              <a href="#how">How it works</a>
              <a href="#coverage">Coverage</a>
            </div>
            <div className={styles.footCol}>
              <h4>Exams</h4>
              {EXAMS.map((e) => <a key={e} href="/chat">{e}</a>)}
            </div>
            <div className={styles.footCol}>
              <h4>Company</h4>
              <a href="#trust">Trust &amp; data</a>
              <Link href="/login">Sign in</Link>
              <a href="mailto:hello@counsa.ai">Contact</a>
            </div>
          </div>
          <div className={styles.footBottom}>
            <span>© {new Date().getFullYear()} counsa.ai — Made with care in India.</span>
            <div className={styles.footSocials}>
              <a href="#" aria-label="X"><AtSign size={18} /></a>
              <a href="#" aria-label="Community"><MessageCircle size={18} /></a>
              <a href="mailto:hello@counsa.ai" aria-label="Email"><Mail size={18} /></a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
