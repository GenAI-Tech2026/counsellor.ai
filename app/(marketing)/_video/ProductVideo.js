'use client';

import {
  AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate, spring,
} from 'remotion';

/* ── Brand palette ── */
const PAPER = '#f7f5f1';
const SURFACE = '#ffffff';
const INK = '#1b1b2b';
const INK_SOFT = '#43435a';
const MUTED = '#6b6b80';
const LINE = '#e8e3d9';
const INDIGO = '#4f46e5';
const INDIGO_DEEP = '#3730a3';
const EMERALD = '#0e9f6e';
const AMBER = '#f4a83b';
const SERIF = "var(--font-serif), Georgia, serif";
const SANS = "var(--font-sans), system-ui, sans-serif";

function Cap({ size = 46 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10 12 5 2 10l10 5 10-5Z" />
      <path d="M6 12v5c0 1 2.7 2.5 6 2.5s6-1.5 6-2.5v-5" />
    </svg>
  );
}

/* ── Scene 1: Brand ── */
function Brand() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logo = spring({ frame, fps, config: { damping: 13, mass: 0.7 } });
  const title = interpolate(frame, [10, 30], [0, 1], { extrapolateRight: 'clamp' });
  const titleY = interpolate(frame, [10, 30], [18, 0], { extrapolateRight: 'clamp' });
  const tag = interpolate(frame, [24, 44], [0, 1], { extrapolateRight: 'clamp' });
  const out = interpolate(frame, [62, 80], [1, 0], { extrapolateLeft: 'clamp' });
  return (
    <AbsoluteFill style={{ background: PAPER, alignItems: 'center', justifyContent: 'center', opacity: out }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 }}>
        <div style={{
          width: 104, height: 104, borderRadius: 26, background: `linear-gradient(135deg, #6366f1, ${INDIGO_DEEP})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transform: `scale(${logo})`, boxShadow: '0 24px 60px rgba(79,70,229,0.4)',
        }}>
          <Cap size={50} />
        </div>
        <div style={{ fontFamily: SERIF, fontSize: 60, fontWeight: 600, color: INK, opacity: title, transform: `translateY(${titleY}px)`, letterSpacing: '-0.02em' }}>
          Admission Mantrana
        </div>
        <div style={{ fontFamily: SANS, fontSize: 24, color: MUTED, opacity: tag }}>
          AI admission counselling
        </div>
      </div>
    </AbsoluteFill>
  );
}

/* ── Scene 2: The problem ── */
function Problem() {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [4, 22], [0, 1], { extrapolateRight: 'clamp' });
  const ty = interpolate(frame, [4, 22], [18, 0], { extrapolateRight: 'clamp' });
  const draw = interpolate(frame, [22, 64], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const goodIn = spring({ frame: frame - 50, fps: 30, config: { damping: 12 } });
  const badIn = spring({ frame: frame - 60, fps: 30, config: { damping: 12 } });
  const out = interpolate(frame, [104, 120], [1, 0], { extrapolateLeft: 'clamp' });
  return (
    <AbsoluteFill style={{ background: PAPER, alignItems: 'center', justifyContent: 'center', opacity: out }}>
      <div style={{ fontFamily: SERIF, fontSize: 52, fontWeight: 600, color: INK, opacity: t, transform: `translateY(${ty}px)`, letterSpacing: '-0.02em', marginBottom: 44 }}>
        Same rank. <span style={{ color: INDIGO }}>Different fates.</span>
      </div>
      <svg width="760" height="240" viewBox="0 0 760 240">
        <circle cx="120" cy="120" r="30" fill={INDIGO} />
        <text x="120" y="125" textAnchor="middle" fontFamily={SANS} fontSize="15" fontWeight="700" fill="#fff">rank</text>
        <path d="M150 120 C 300 120, 360 60, 520 60" stroke={INDIGO} strokeWidth="5" fill="none" strokeLinecap="round" strokeDasharray="420" strokeDashoffset={420 * draw} />
        <path d="M150 120 C 300 120, 360 180, 520 180" stroke="#c9c4bb" strokeWidth="5" fill="none" strokeLinecap="round" strokeDasharray="420" strokeDashoffset={420 * draw} />
        <g transform={`translate(540 30) scale(${goodIn})`} style={{ transformOrigin: '60px 30px' }}>
          <rect x="0" y="0" width="150" height="60" rx="14" fill={SURFACE} stroke={LINE} />
          <circle cx="26" cy="30" r="13" fill={EMERALD} />
          <path d="M20 30 l4 4 l8 -9" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="48" y="22" width="80" height="7" rx="3.5" fill={INK} opacity="0.8" />
          <rect x="48" y="36" width="56" height="6" rx="3" fill={MUTED} opacity="0.5" />
        </g>
        <g transform={`translate(540 150) scale(${badIn})`} style={{ transformOrigin: '60px 30px' }}>
          <rect x="6" y="6" width="120" height="54" rx="10" fill="#efece6" stroke={LINE} transform="rotate(-5 66 33)" />
          <rect x="0" y="0" width="120" height="54" rx="10" fill="#f4f1ec" stroke={LINE} />
          <circle cx="132" cy="8" r="13" fill="#d9d4ca" />
          <text x="132" y="13" textAnchor="middle" fontFamily={SANS} fontSize="16" fontWeight="800" fill="#fff">?</text>
        </g>
      </svg>
    </AbsoluteFill>
  );
}

/* ── Scene 3: Live chat answer ── */
function Chat() {
  const frame = useCurrentFrame();
  const card = spring({ frame, fps: 30, config: { damping: 14 } });
  const user = spring({ frame: frame - 8, fps: 30, config: { damping: 13 } });
  const reply = 'At ~12,000 CRL, these CSE picks are in reach:';
  const chars = Math.floor(interpolate(frame, [44, 86], [0, reply.length], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  const showDots = frame > 26 && frame < 46;
  const chips = ['NIT Goa · CSE', 'NIT Raipur · IT', 'IIIT Kota · CSE'];
  const out = interpolate(frame, [124, 140], [1, 0], { extrapolateLeft: 'clamp' });
  return (
    <AbsoluteFill style={{ background: PAPER, alignItems: 'center', justifyContent: 'center', opacity: out }}>
      <div style={{
        width: 620, background: SURFACE, borderRadius: 24, border: `1px solid ${LINE}`,
        boxShadow: '0 30px 70px rgba(27,27,43,0.14)', overflow: 'hidden', transform: `scale(${0.92 + 0.08 * card})`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px', borderBottom: `1px solid ${LINE}`, background: '#fbfaf7' }}>
          <span style={{ width: 11, height: 11, borderRadius: 6, background: '#e7b4ad' }} />
          <span style={{ width: 11, height: 11, borderRadius: 6, background: '#e6d39a' }} />
          <span style={{ width: 11, height: 11, borderRadius: 6, background: '#a9d8b8' }} />
          <span style={{ marginLeft: 8, fontFamily: SANS, fontSize: 16, fontWeight: 600, color: MUTED }}>Admission Mantrana</span>
        </div>
        <div style={{ padding: '26px 24px', minHeight: 200, fontFamily: SANS }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', opacity: user, transform: `translateY(${(1 - user) * 8}px)` }}>
            <div style={{ background: '#eef0fd', border: '1px solid #d9dbfb', color: INK, padding: '12px 16px', borderRadius: '14px 14px 6px 14px', fontSize: 18, maxWidth: 420 }}>
              JEE rank 12,000, OBC-NCL — CSE options?
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 18 }}>
            <span style={{ width: 34, height: 34, borderRadius: 9, background: INDIGO, flexShrink: 0 }} />
            <div style={{ fontSize: 18, lineHeight: 1.6, color: INK_SOFT, paddingTop: 4 }}>
              {showDots ? (
                <span style={{ color: MUTED, fontSize: 26, letterSpacing: 3 }}>•••</span>
              ) : frame >= 46 ? (
                <>
                  {reply.slice(0, chars)}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
                    {chips.map((c, i) => {
                      const cs = spring({ frame: frame - (90 + i * 10), fps: 30, config: { damping: 12 } });
                      return (
                        <span key={c} style={{
                          transform: `scale(${cs})`, padding: '7px 12px', borderRadius: 999,
                          background: SURFACE, border: `1px solid #d8d3c8`, color: INK, fontSize: 15, fontWeight: 600,
                          boxShadow: '0 1px 2px rgba(27,27,43,0.05)',
                        }}>{c}</span>
                      );
                    })}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

/* ── Scene 4: Rank → Match → Shortlist ── */
function Flow() {
  const frame = useCurrentFrame();
  const nodes = ['Rank', 'Match', 'Shortlist'];
  const xs = [180, 380, 580];
  const dotX = interpolate(frame, [20, 70], [180, 580], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const t = interpolate(frame, [2, 18], [0, 1], { extrapolateRight: 'clamp' });
  const out = interpolate(frame, [84, 100], [1, 0], { extrapolateLeft: 'clamp' });
  return (
    <AbsoluteFill style={{ background: PAPER, alignItems: 'center', justifyContent: 'center', opacity: out }}>
      <div style={{ fontFamily: SERIF, fontSize: 46, fontWeight: 600, color: INK, opacity: t, marginBottom: 50, letterSpacing: '-0.02em' }}>
        From rank to shortlist.
      </div>
      <svg width="760" height="200" viewBox="0 0 760 200">
        <line x1="180" y1="100" x2="580" y2="100" stroke={LINE} strokeWidth="6" strokeLinecap="round" />
        <line x1="180" y1="100" x2={dotX} y2="100" stroke={INDIGO} strokeWidth="6" strokeLinecap="round" />
        <circle cx={dotX} cy="100" r="9" fill={INDIGO} />
        <circle cx={dotX} cy="100" r="9" fill={INDIGO} opacity="0.3">
          <animate attributeName="r" values="9;16;9" dur="1.2s" repeatCount="indefinite" />
        </circle>
        {nodes.map((n, i) => {
          const appear = spring({ frame: frame - (10 + i * 16), fps: 30, config: { damping: 12 } });
          const reached = dotX >= xs[i] - 6;
          return (
            <g key={n} transform={`translate(${xs[i]} 100) scale(${appear})`}>
              <circle r="40" fill={reached ? INDIGO : SURFACE} stroke={reached ? INDIGO : LINE} strokeWidth="2" />
              <text y="78" textAnchor="middle" fontFamily={SANS} fontSize="18" fontWeight="700" fill={INK}>{n}</text>
              <text y="6" textAnchor="middle" fontFamily={SANS} fontSize="22" fontWeight="800" fill={reached ? '#fff' : MUTED}>{i + 1}</text>
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
}

/* ── Scene 5: CTA ── */
function CTA() {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [4, 24], [0, 1], { extrapolateRight: 'clamp' });
  const ty = interpolate(frame, [4, 24], [20, 0], { extrapolateRight: 'clamp' });
  const btn = spring({ frame: frame - 20, fps: 30, config: { damping: 12 } });
  return (
    <AbsoluteFill style={{
      alignItems: 'center', justifyContent: 'center',
      background: `radial-gradient(60% 60% at 50% 0%, rgba(79,70,229,0.45), transparent 70%), ${INK}`,
    }}>
      <div style={{ fontFamily: SERIF, fontSize: 56, fontWeight: 600, color: '#fff', opacity: t, transform: `translateY(${ty}px)`, textAlign: 'center', letterSpacing: '-0.02em', maxWidth: 720 }}>
        Find your college with confidence.
      </div>
      <div style={{
        marginTop: 36, transform: `scale(${btn})`, background: '#fff', color: INDIGO_DEEP,
        fontFamily: SANS, fontWeight: 700, fontSize: 22, padding: '16px 34px', borderRadius: 14,
        boxShadow: '0 20px 50px rgba(0,0,0,0.35)',
      }}>
        Start chatting  →
      </div>
      <div style={{ marginTop: 26, fontFamily: SANS, fontSize: 18, color: 'rgba(255,255,255,0.7)', opacity: t }}>
        admission-mantrana
      </div>
    </AbsoluteFill>
  );
}

export default function ProductVideo() {
  return (
    <AbsoluteFill style={{ background: PAPER }}>
      <Sequence durationInFrames={80}><Brand /></Sequence>
      <Sequence from={80} durationInFrames={120}><Problem /></Sequence>
      <Sequence from={200} durationInFrames={140}><Chat /></Sequence>
      <Sequence from={340} durationInFrames={100}><Flow /></Sequence>
      <Sequence from={440} durationInFrames={70}><CTA /></Sequence>
    </AbsoluteFill>
  );
}
