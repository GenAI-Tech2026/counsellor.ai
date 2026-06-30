'use client';

import { useEffect, useState } from 'react';
import { MapPin, GraduationCap, Sparkles } from 'lucide-react';
import styles from './landing.module.css';

const COLLEGES = [
  { tag: 'N', name: 'NIT Warangal', branch: 'Computer Science · OBC-NCL', pct: '92% fit' },
  { tag: 'I', name: 'IIIT Hyderabad', branch: 'CSE (Spot round) · OBC-NCL', pct: '74% fit' },
  { tag: 'N', name: 'NIT Raipur', branch: 'Information Technology', pct: '96% fit' },
];

// phases: 0 user msg, 1 typing, 2 bot reply, 3 colleges rise — then loops
const STEPS = [
  { phase: 0, dur: 1200 },
  { phase: 1, dur: 1200 },
  { phase: 2, dur: 900 },
  { phase: 3, dur: 4200 },
];

export default function HeroShowcase() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    let i = 0, t, running = true;
    const run = () => {
      if (!running) return;
      setPhase(STEPS[i].phase);
      t = setTimeout(() => { i = (i + 1) % STEPS.length; run(); }, STEPS[i].dur);
    };
    run();
    return () => { running = false; clearTimeout(t); };
  }, []);

  return (
    <div className={styles.showcase}>
      <div className={styles.showcaseInner}>
        {/* floating pills */}
        <div className={`${styles.floatPill} ${styles.pillTL}`}>
          <i style={{ background: 'linear-gradient(135deg,#0e9f6e,#0b8a5f)' }}><GraduationCap size={18} /></i>
          <span>2,140 colleges<small>matched to your rank</small></span>
        </div>
        <div className={`${styles.floatPill} ${styles.pillBR}`}>
          <i style={{ background: 'linear-gradient(135deg,var(--accent-hover),var(--accent-press))' }}><Sparkles size={18} /></i>
          <span>Shortlist ready<small>in under 2 minutes</small></span>
        </div>
        <div className={`${styles.floatPill} ${styles.pillBL}`}>
          <i style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}><MapPin size={18} /></i>
          <span>All-India + state<small>JoSAA &amp; CET aware</small></span>
        </div>

        <div className={styles.window}>
          <div className={styles.windowBar}>
            <i className={styles.dotR} /><i className={styles.dotY} /><i className={styles.dotG} />
            <span className={styles.windowTitle}>counsa.ai — your admission counsellor</span>
          </div>
          <div className={styles.chatBody}>
            <div className={styles.msgUser}>JEE Main — 98.2 percentile, OBC-NCL, home state Telangana. Where can I get CSE?</div>

            {phase >= 1 && phase < 2 && (
              <div className={styles.msgBot}>
                <span className={styles.typing}><i /><i /><i /></span>
              </div>
            )}

            {phase >= 2 && (
              <div className={styles.msgBot}>
                Reading the latest JoSAA &amp; CET closing ranks. With ~98.2 percentile under OBC-NCL,
                these CSE seats are within reach 👇
              </div>
            )}

            {phase >= 3 && (
              <div className={styles.collegeRow}>
                {COLLEGES.map((c, i) => (
                  <div key={c.name} className={styles.collegeChip} style={{ animationDelay: `${i * 130}ms` }}>
                    <i>{c.tag}</i>
                    <div>
                      <b>{c.name}</b><br />
                      <span>{c.branch}</span>
                    </div>
                    <span className={styles.pct}>{c.pct}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
