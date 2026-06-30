'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './landing.module.css';

/**
 * Fades + rises its children into view the first time they cross into the
 * viewport. `delay` (ms) staggers siblings; honours prefers-reduced-motion via
 * the CSS (the .reveal rule no-ops under reduced motion).
 */
export default function Reveal({ children, className = '', delay = 0, as: Tag = 'div', style, ...rest }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`${styles.reveal} ${shown ? styles.in : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms`, ...style }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
