'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ShieldCheck, Zap, MousePointer2, BadgeCheck } from 'lucide-react';
import s from './mockups.module.css';

function WinBar({ title }) {
  return (
    <div className={s.bar}>
      <i className={s.r} /><i className={s.y} /><i className={s.g} />
      <span className={s.barTitle}>{title}</span>
    </div>
  );
}

/* Counts up to `to` once the element scrolls into view. */
function useCountUp(to, ms = 1400) {
  const ref = useRef(null);
  const [n, setN] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const tick = (t) => {
        const p = Math.min(1, (t - t0) / ms);
        const eased = 1 - Math.pow(1 - p, 3);
        setN(Math.round(to * eased));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [to, ms]);
  return [ref, n];
}

/* 1 ─ Always on: a live chat thread that never sleeps */
export function AlwaysOnMock() {
  return (
    <div className={s.frame}>
      <div className={`${s.float} ${s.topRight}`}><span className={s.ic + ' ' + s.fAccent}><Zap size={16} /></span><span>Replied in 3s<small>even at 1 AM</small></span></div>
      <div className={s.win}>
        <WinBar title="counsa.ai — live chat" />
        <div className={s.body}>
          <span className={s.status}><span className={s.statusDot} /> Online — replies 24/7</span>
          <div className={s.thread}>
            <div className={`${s.bub} ${s.bot}`}>Hi! Tell me your exam &amp; rank and I&apos;ll find your colleges 👋</div>
            <div className={`${s.bub} ${s.usr}`}>Just got my JEE result… it&apos;s 1 AM though 😅</div>
            <div className={s.typing}><i /><i /><i /></div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* 2 ─ Grounded: official cutoff table + closing-rank chart */
export function DataMock() {
  const rows = [
    ['NIT Warangal', 'CSE', '2,134'],
    ['IIIT Hyderabad', 'CSE', '1,090'],
    ['NIT Raipur', 'IT', '8,760'],
  ];
  const bars = [42, 58, 50, 70, 64, 86];
  return (
    <div className={s.frame}>
      <div className={`${s.float} ${s.topRight}`}><span className={s.ic + ' ' + s.fGreen}><ShieldCheck size={16} /></span><span>Official data<small>JoSAA &amp; CET verified</small></span></div>
      <div className={s.win}>
        <WinBar title="Closing ranks · 2025" />
        <div className={s.body}>
          <div className={s.tableHead}><span>College</span><span>Branch</span><span style={{ textAlign: 'right' }}>Rank</span></div>
          {rows.map(([c, br, rk], i) => (
            <div key={c} className={`${s.tableRow} ${i === 0 ? s.hot : ''}`}>
              <b>{c}</b><span>{br}</span><span className={s.rank}>{rk}</span>
            </div>
          ))}
          <div className={s.chart}>
            {bars.map((h, i) => (
              <span key={i} className={s.col} style={{ height: `${h}%`, animationDelay: `${i * 90}ms, ${i * 90}ms` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* 3 ─ Matched: filters narrow thousands to a shortlist */
export function MatchMock() {
  const [ref, n] = useCountUp(2140);
  return (
    <div className={s.frame} ref={ref}>
      <div className={`${s.float} ${s.btmRight}`}><span className={s.ic + ' ' + s.fAccent}><BadgeCheck size={16} /></span><span>14 strong fits<small>reach · target · safe</small></span></div>
      <div className={s.cursor}><MousePointer2 size={20} fill="#fff" color="#2a1f17" /><span>YOU</span></div>
      <div className={s.win}>
        <WinBar title="Matched to you" />
        <div className={s.body}>
          <div className={s.chips}>
            {['Rank 12,840', 'OBC-NCL', 'Telangana'].map((c) => (
              <span key={c} className={s.chip}><span className={s.ck}><Check size={10} /></span>{c}</span>
            ))}
          </div>
          <div className={s.bigNum}><b>{n.toLocaleString('en-IN')}</b><span>seats scanned</span></div>
          <div className={s.resCard}>
            <span className={s.logo}>N</span>
            <div><div className={s.nm}>NIT Warangal · CSE</div><div className={s.sub}>OBC-NCL · home state</div></div>
            <div className={s.fitTrack}><div className={s.fitFill} style={{ width: '92%' }} /></div>
          </div>
          <div className={s.resCard}>
            <span className={s.logo} style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>I</span>
            <div><div className={s.nm}>IIIT Hyderabad · CSE</div><div className={s.sub}>spot round</div></div>
            <div className={s.fitTrack}><div className={s.fitFill} style={{ width: '74%', animationDelay: '.2s' }} /></div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* 4 ─ Remembers you: a saved profile that personalises every chat */
export function ProfileMock() {
  const chips = ['Rank 12,840', 'OBC-NCL', 'Telangana', 'CSE / AI', 'Home-state quota'];
  return (
    <div className={s.frame}>
      <div className={`${s.float} ${s.btmLeft}`}><span className={s.ic + ' ' + s.fGreen}><Check size={16} /></span><span>Profile saved<small>personal from msg 1</small></span></div>
      <div className={s.win}>
        <WinBar title="Your profile" />
        <div className={s.body}>
          <div className={s.profTop}>
            <span className={s.profAv}>R</span>
            <div><b>Welcome back, Rudhra</b><small>picking up where you left off</small></div>
          </div>
          <div className={s.saved}>
            {chips.map((c, i) => (
              <span key={c} className={s.savedChip} style={{ animationDelay: `${i * 120}ms` }}><i />{c}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
