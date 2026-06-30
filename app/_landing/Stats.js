'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './landing.module.css';

function Stat({ to, suffix = '', prefix = '', label }) {
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
        const p = Math.min(1, (t - t0) / 1400);
        setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.5 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [to]);
  return (
    <div className={styles.stat} ref={ref}>
      <span className={styles.statNum}>{prefix}{n.toLocaleString('en-IN')}{suffix}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}

export default function Stats() {
  return (
    <div className={styles.statsBand}>
      <Stat to={13} suffix="+" label="entrance exams covered" />
      <span className={styles.statDiv} />
      <Stat to={28} suffix="" label="states + all-India counselling" />
      <span className={styles.statDiv} />
      <Stat to={50} suffix="k+" label="college-branch cutoff records" />
      <span className={styles.statDiv} />
      <div className={styles.stat}>
        <span className={styles.statNum}>24/7</span>
        <span className={styles.statLabel}>instant answers, any hour</span>
      </div>
    </div>
  );
}
