'use client';

import { useEffect, useRef, useState } from 'react';
import s from './thread.module.css';

/**
 * A single SVG line that runs down the left gutter of the whole page, weaving
 * between two x-positions, drawing itself in proportion to scroll progress.
 * `nodes` = [{ id, num, label }] — each anchors to a section element by id.
 *
 * Geometry is measured from the live DOM (so it survives image/font reflow and
 * resize); the draw + comet + node-activation are updated in a rAF on scroll.
 */
export default function ScrollThread({ nodes }) {
  const drawRef = useRef(null);
  const cometRef = useRef(null);
  const nodeRefs = useRef([]);
  const [geo, setGeo] = useState({ w: 96, h: 0, d: '', pts: [] });

  // ── Measure the path + node points from the DOM ──
  useEffect(() => {
    const X1 = 28, X2 = 58;
    const measure = () => {
      const total = document.body.scrollHeight;
      const pts = nodes.map((n, i) => {
        const el = document.getElementById(n.id);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        const y = r.top + window.scrollY + Math.min(96, r.height * 0.16);
        return { x: i % 2 === 0 ? X1 : X2, y, num: n.num, label: n.label };
      }).filter(Boolean);
      if (!pts.length) return;

      let d = `M ${pts[0].x} 8`;
      d += ` L ${pts[0].x} ${pts[0].y}`;
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i];
        const my = (a.y + b.y) / 2;
        d += ` C ${a.x} ${my}, ${b.x} ${my}, ${b.x} ${b.y}`;
      }
      const last = pts[pts.length - 1];
      d += ` L ${last.x} ${Math.min(total - 24, last.y + 360)}`;
      setGeo({ w: 96, h: total, d, pts });
    };

    measure();
    const t1 = setTimeout(measure, 400);
    const t2 = setTimeout(measure, 1200);
    window.addEventListener('resize', measure);
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    return () => { clearTimeout(t1); clearTimeout(t2); window.removeEventListener('resize', measure); ro.disconnect(); };
  }, [nodes]);

  // ── Draw + comet + node activation on scroll ──
  useEffect(() => {
    const path = drawRef.current;
    if (!path || !geo.d) return;
    let raf = 0, len = 0;
    try { len = path.getTotalLength(); } catch { return; }
    path.style.strokeDasharray = `${len}`;

    const update = () => {
      raf = 0;
      const docH = document.body.scrollHeight - window.innerHeight;
      const prog = docH > 0 ? Math.min(1, Math.max(0, window.scrollY / docH)) : 0;
      const drawn = len * prog;
      path.style.strokeDashoffset = `${len - drawn}`;

      let tip;
      try { tip = path.getPointAtLength(drawn); } catch { tip = null; }
      if (tip && cometRef.current) cometRef.current.setAttribute('transform', `translate(${tip.x} ${tip.y})`);

      // a node is "reached" once the comet's y passes it
      const tipY = tip ? tip.y : 0;
      geo.pts.forEach((p, i) => {
        const g = nodeRefs.current[i];
        if (!g) return;
        const on = tipY >= p.y - 4;
        g.dataset.on = on ? '1' : '0';
        g.querySelector(`.${s.node}`)?.classList.toggle(s.nodeOn, on);
        g.querySelector(`.${s.ring}`)?.classList.toggle(s.ringOn, on);
        g.querySelector(`.${s.num}`)?.classList.toggle(s.numOn, on);
        g.querySelector(`.${s.label}`)?.classList.toggle(s.labelOn, on);
      });
    };

    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [geo]);

  return (
    <svg className={s.svg} style={{ height: geo.h || '100%' }} width={geo.w} height={geo.h} aria-hidden="true">
      <defs>
        <linearGradient id="threadGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff9a3d" />
          <stop offset="55%" stopColor="#f35b04" />
          <stop offset="100%" stopColor="#db5000" />
        </linearGradient>
      </defs>

      {geo.d && <path className={s.track} d={geo.d} />}
      {geo.d && <path ref={drawRef} className={s.draw} d={geo.d} />}

      {geo.pts.map((p, i) => (
        <g key={i} ref={(el) => (nodeRefs.current[i] = el)}>
          <circle className={s.ring} cx={p.x} cy={p.y} r="9" />
          <circle className={s.node} cx={p.x} cy={p.y} r="9" />
          <text className={s.num} x={p.x} y={p.y}>{p.num}</text>
          <text className={s.label} x={p.x + 18} y={p.y}>{p.label}</text>
        </g>
      ))}

      {geo.d && (
        <g ref={cometRef} className={s.comet}>
          <circle className={s.cometHalo} r="12" />
          <circle className={s.cometBody} r="6" />
          <circle className={s.cometCore} r="2.5" />
        </g>
      )}
    </svg>
  );
}
