'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Counts up from 0 to `to` once it scrolls into view.
 * `plain` skips thousands grouping (e.g. for a year like 2025).
 */
export default function CountUp({ to, duration = 1400, plain = false, suffix = '', className }) {
  const ref = useRef(null);
  const [val, setVal] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const tick = (now) => {
            const p = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - p, 3);
            setVal(Math.round(eased * to));
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.6 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [to, duration]);

  return (
    <span ref={ref} className={className}>
      {plain ? val : val.toLocaleString()}{suffix}
    </span>
  );
}
