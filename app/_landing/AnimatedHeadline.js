'use client';

import { useEffect, useState } from 'react';

/**
 * Reveals a headline word-by-word on mount: each word rises + fades in with a
 * staggered delay. `segments` is an array where each item is either a string
 * (plain words) or { accent: 'text' } (rendered with the gradient <em>).
 */
export default function AnimatedHeadline({ segments, className }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  // Flatten into word tokens, preserving accent flag.
  const tokens = [];
  segments.forEach((seg) => {
    const isAccent = typeof seg === 'object';
    const text = isAccent ? seg.accent : seg;
    text.split(' ').forEach((w) => tokens.push({ w, accent: isAccent }));
  });

  return (
    <h1 className={className} aria-label={tokens.map((t) => t.w).join(' ')}>
      {tokens.map((t, i) => (
        <span
          key={i}
          aria-hidden="true"
          style={{
            display: 'inline-block',
            whiteSpace: 'pre',
            overflow: 'hidden',
            verticalAlign: 'top',
            lineHeight: 1.08,
            paddingBottom: '0.14em',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              transform: mounted ? 'translateY(0)' : 'translateY(110%)',
              opacity: mounted ? 1 : 0,
              transition: `transform .9s cubic-bezier(.2,.85,.2,1) ${i * 65}ms, opacity .9s ease ${i * 65}ms`,
            }}
          >
            {t.accent ? <em>{t.w}</em> : t.w}
            {i < tokens.length - 1 ? ' ' : ''}
          </span>
        </span>
      ))}
    </h1>
  );
}
