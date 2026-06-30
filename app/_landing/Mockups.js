'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ShieldCheck, Zap, MousePointer2, BadgeCheck, Radar } from 'lucide-react';
import s from './mockups.module.css';

/* Shared living frame: drifting glow + sparkles behind the window. */
function Frame({ children, refEl }) {
  return (
    <div className={s.frame} ref={refEl}>
      <span className={s.glow} />
      <span className={s.spark} /><span className={s.spark} /><span className={s.spark} />
      {children}
    </div>
  );
}

function WinBar({ title }) {
  return (
    <div className={s.bar}>
      <i className={s.r} /><i className={s.y} /><i className={s.g} />
      <span className={s.barTitle}>{title}</span>
    </div>
  );
}

/* Runs a looping sequence of phases; pauses while off-screen to save cycles. */
function useLoop(steps, ref) {
  const [phase, setPhase] = useState(steps[0].phase);
  useEffect(() => {
    const el = ref?.current;
    let i = 0, t, running = true;
    const run = () => {
      if (!running) return;
      setPhase(steps[i].phase);
      t = setTimeout(() => { i = (i + 1) % steps.length; run(); }, steps[i].dur);
    };
    if (!el) { run(); return () => { running = false; clearTimeout(t); }; }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && running) { clearTimeout(t); run(); }
      else { clearTimeout(t); }
    }, { threshold: 0.25 });
    io.observe(el);
    return () => { running = false; clearTimeout(t); io.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return phase;
}

/* 1 ─ Always on: a chat thread that endlessly re-plays itself */
export function AlwaysOnMock() {
  const ref = useRef(null);
  // phase = how much of the convo is on screen (0 clears → re-animates)
  const phase = useLoop([
    { phase: 1, dur: 1000 },
    { phase: 2, dur: 1000 },
    { phase: 3, dur: 1300 },
    { phase: 4, dur: 2800 },
    { phase: 0, dur: 500 },
  ], ref);

  return (
    <Frame refEl={ref}>
      <div className={`${s.float} ${s.topRight}`}><span className={`${s.ic} ${s.fAccent}`}><Zap size={16} /></span><span>Replied in 3s<small>even at 1 AM</small></span></div>
      <div className={s.win}>
        <WinBar title="counsa.ai — live chat" />
        <div className={s.body}>
          <span className={s.status}><span className={s.statusDot} /> Online — replies 24/7</span>
          <div className={s.thread}>
            {phase >= 1 && <div className={`${s.bub} ${s.bot}`}>Hi! Tell me your exam &amp; rank — I&apos;ll find your colleges 👋</div>}
            {phase >= 2 && <div className={`${s.bub} ${s.usr}`}>Just got my JEE result… it&apos;s 1 AM though 😅</div>}
            {phase === 3 && <div className={s.typing}><i /><i /><i /></div>}
            {phase >= 4 && <div className={`${s.bub} ${s.bot}`}>Perfect time. Here are 14 colleges within your reach →</div>}
          </div>
        </div>
      </div>
    </Frame>
  );
}

/* 2 ─ Grounded: cutoff table whose live row keeps refreshing + scan chart */
export function DataMock() {
  const ref = useRef(null);
  const rows = [
    ['NIT Warangal', 'CSE', '2,134'],
    ['IIIT Hyderabad', 'CSE', '1,090'],
    ['NIT Raipur', 'IT', '8,760'],
  ];
  const bars = [42, 60, 50, 72, 64, 88, 56];
  const hot = useLoop(rows.map((_, i) => ({ phase: i, dur: 1700 })), ref);

  return (
    <Frame refEl={ref}>
      <div className={`${s.float} ${s.topRight}`}><span className={`${s.ic} ${s.fGreen}`}><ShieldCheck size={16} /></span><span>Official data<small>JoSAA &amp; CET verified</small></span></div>
      <div className={s.win}>
        <WinBar title="Closing ranks · live" />
        <div className={s.body}>
          <div className={s.tableHead}><span>College</span><span>Branch</span><span style={{ textAlign: 'right' }}>Rank</span></div>
          {rows.map(([c, br, rk], i) => (
            <div key={c} className={`${s.tableRow} ${i === hot ? s.hot : ''}`}>
              <b>{c}</b><span>{br}</span><span className={s.rank}>{rk}</span>
            </div>
          ))}
          <div className={s.chart}>
            <span className={s.scan} />
            {bars.map((h, i) => (
              <span key={i} className={s.col} style={{ height: `${h}%`, animationDelay: `${i * 90}ms, ${i * 90}ms` }} />
            ))}
          </div>
        </div>
      </div>
    </Frame>
  );
}

/* 3 ─ Matched: re-scans thousands of seats with a clicking cursor */
export function MatchMock() {
  const ref = useRef(null);
  const TARGET = 2140;
  const [n, setN] = useState(0);
  const [filled, setFilled] = useState(false);
  const [cursor, setCursor] = useState({ x: 0, y: 0, tap: false, chip: -1 });
  const chips = ['Rank 12,840', 'OBC-NCL', 'Telangana'];

  useEffect(() => {
    const el = ref.current;
    let raf, timers = [], running = true;

    const cycle = () => {
      if (!running) return;
      setN(0); setFilled(false);
      // count up
      const t0 = performance.now();
      const tick = (t) => {
        const p = Math.min(1, (t - t0) / 1500);
        setN(Math.round(TARGET * (1 - Math.pow(1 - p, 3))));
        if (p < 1 && running) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      // cursor taps chips, then fits fill in
      timers.push(setTimeout(() => setCursor({ x: 6, y: -6, tap: true, chip: 1 }), 400));
      timers.push(setTimeout(() => setCursor((c) => ({ ...c, tap: false })), 700));
      timers.push(setTimeout(() => setCursor({ x: 70, y: -6, tap: true, chip: 2 }), 1100));
      timers.push(setTimeout(() => setCursor((c) => ({ ...c, tap: false, chip: -1 })), 1400));
      timers.push(setTimeout(() => setFilled(true), 900));
      timers.push(setTimeout(cycle, 4200));
    };

    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { running = true; cycle(); }
      else { running = false; timers.forEach(clearTimeout); cancelAnimationFrame(raf); }
    }, { threshold: 0.3 });
    io.observe(el);
    return () => { running = false; timers.forEach(clearTimeout); cancelAnimationFrame(raf); io.disconnect(); };
  }, []);

  return (
    <Frame refEl={ref}>
      <div className={`${s.float} ${s.btmRight}`}><span className={`${s.ic} ${s.fAccent}`}><BadgeCheck size={16} /></span><span>14 strong fits<small>reach · target · safe</small></span></div>
      <div className={`${s.cursor} ${cursor.tap ? s.tap : ''}`} style={{ left: 26, top: 92, transform: `translate(${cursor.x}px, ${cursor.y}px)` }}>
        <MousePointer2 size={20} fill="#fff" color="#2a1f17" />
        <span>YOU</span>
      </div>
      <div className={s.win}>
        <WinBar title="Matched to you" />
        <div className={s.body}>
          <div className={s.chips}>
            {chips.map((c, i) => (
              <span key={c} className={`${s.chip} ${cursor.chip === i ? s.click : ''}`}><span className={s.ck}><Check size={10} /></span>{c}</span>
            ))}
          </div>
          <div className={s.bigNum}><b>{n.toLocaleString('en-IN')}</b><span><Radar size={11} style={{ verticalAlign: '-1px' }} /> seats scanned</span></div>
          <div className={s.resCard}>
            <span className={s.logo}>N</span>
            <div><div className={s.nm}>NIT Warangal · CSE</div><div className={s.sub}>OBC-NCL · home state</div></div>
            <div className={s.fitTrack}><div className={s.fitFill} style={{ width: filled ? '92%' : '0%' }} /></div>
          </div>
          <div className={s.resCard}>
            <span className={s.logo} style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>I</span>
            <div><div className={s.nm}>IIIT Hyderabad · CSE</div><div className={s.sub}>spot round</div></div>
            <div className={s.fitTrack}><div className={s.fitFill} style={{ width: filled ? '74%' : '0%', transitionDelay: '.15s' }} /></div>
          </div>
        </div>
      </div>
    </Frame>
  );
}

/* 4 ─ Remembers you: a profile that keeps re-assembling itself */
export function ProfileMock() {
  const ref = useRef(null);
  const chips = ['Rank 12,840', 'OBC-NCL', 'Telangana', 'CSE / AI', 'Home-state quota'];
  const [gen, setGen] = useState(0);

  useEffect(() => {
    const el = ref.current;
    let id;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) id = setInterval(() => setGen((g) => g + 1), 4500);
      else clearInterval(id);
    }, { threshold: 0.3 });
    io.observe(el);
    return () => { clearInterval(id); io.disconnect(); };
  }, []);

  return (
    <Frame refEl={ref}>
      <div className={`${s.float} ${s.btmLeft}`}><span className={`${s.ic} ${s.fGreen}`}><Check size={16} /></span><span>Profile saved<small>personal from msg 1</small></span></div>
      <div className={s.win}>
        <WinBar title="Your profile" />
        <div className={s.body}>
          <div className={s.profTop}>
            <span className={s.profAv}>R</span>
            <div><b>Welcome back, Rudhra</b><small>picking up where you left off</small></div>
          </div>
          <div className={s.saved}>
            {chips.map((c, i) => (
              <span key={`${gen}-${c}`} className={s.savedChip} style={{ animationDelay: `${i * 130}ms` }}><i />{c}</span>
            ))}
          </div>
        </div>
      </div>
    </Frame>
  );
}
