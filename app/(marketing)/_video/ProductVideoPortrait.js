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

function Cap({ size = 64 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10 12 5 2 10l10 5 10-5Z" />
      <path d="M6 12v5c0 1 2.7 2.5 6 2.5s6-1.5 6-2.5v-5" />
    </svg>
  );
}

const wrap = { paddingLeft: 70, paddingRight: 70, width: '100%' };

/* ── Scene 1: Brand ── */
function Brand() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logo = spring({ frame, fps, config: { damping: 13, mass: 0.7 } });
  const title = interpolate(frame, [10, 30], [0, 1], { extrapolateRight: 'clamp' });
  const titleY = interpolate(frame, [10, 30], [26, 0], { extrapolateRight: 'clamp' });
  const tag = interpolate(frame, [24, 44], [0, 1], { extrapolateRight: 'clamp' });
  const out = interpolate(frame, [62, 80], [1, 0], { extrapolateLeft: 'clamp' });
  return (
    <AbsoluteFill style={{ background: PAPER, alignItems: 'center', justifyContent: 'center', opacity: out, textAlign: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 34, ...wrap }}>
        <div style={{
          width: 150, height: 150, borderRadius: 38, background: `linear-gradient(135deg, #6366f1, ${INDIGO_DEEP})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transform: `scale(${logo})`, boxShadow: '0 30px 70px rgba(79,70,229,0.4)',
        }}>
          <Cap size={70} />
        </div>
        <div style={{ fontFamily: SERIF, fontSize: 82, fontWeight: 600, color: INK, opacity: title, transform: `translateY(${titleY}px)`, letterSpacing: '-0.02em', lineHeight: 1.05 }}>
          Admission Mantrana
        </div>
        <div style={{ fontFamily: SANS, fontSize: 34, color: MUTED, opacity: tag }}>
          AI admission counselling
        </div>
      </div>
    </AbsoluteFill>
  );
}

/* ── Scene 2: Problem ── */
function Problem() {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [4, 22], [0, 1], { extrapolateRight: 'clamp' });
  const ty = interpolate(frame, [4, 22], [24, 0], { extrapolateRight: 'clamp' });
  const goodIn = spring({ frame: frame - 40, fps: 30, config: { damping: 12 } });
  const badIn = spring({ frame: frame - 52, fps: 30, config: { damping: 12 } });
  const out = interpolate(frame, [104, 120], [1, 0], { extrapolateLeft: 'clamp' });
  return (
    <AbsoluteFill style={{ background: PAPER, alignItems: 'center', justifyContent: 'center', opacity: out, textAlign: 'center' }}>
      <div style={{ fontFamily: SERIF, fontSize: 74, fontWeight: 600, color: INK, opacity: t, transform: `translateY(${ty}px)`, letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 70, ...wrap }}>
        Same rank.<br /><span style={{ color: INDIGO }}>Different fates.</span>
      </div>
      <div style={{ display: 'flex', gap: 28, ...wrap, justifyContent: 'center' }}>
        <div style={{ flex: 1, transform: `scale(${goodIn})`, background: SURFACE, border: `1px solid ${LINE}`, borderRadius: 28, padding: '30px 22px', boxShadow: '0 20px 50px rgba(27,27,43,0.12)' }}>
          <div style={{ width: 56, height: 56, borderRadius: 28, background: EMERALD, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5L20 7" /></svg>
          </div>
          <div style={{ marginTop: 18, height: 12, borderRadius: 6, background: INK, opacity: 0.8 }} />
          <div style={{ marginTop: 10, height: 10, borderRadius: 5, background: MUTED, opacity: 0.4, width: '70%', marginLeft: 'auto', marginRight: 'auto' }} />
        </div>
        <div style={{ flex: 1, transform: `scale(${badIn})`, background: '#f1eee9', border: `1px solid ${LINE}`, borderRadius: 28, padding: '30px 22px' }}>
          <div style={{ width: 56, height: 56, borderRadius: 28, background: '#d9d4ca', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 800, color: '#fff', fontFamily: SANS }}>?</div>
          <div style={{ marginTop: 18, height: 12, borderRadius: 6, background: '#cfc9bd' }} />
          <div style={{ marginTop: 10, height: 10, borderRadius: 5, background: '#cfc9bd', width: '70%', marginLeft: 'auto', marginRight: 'auto' }} />
        </div>
      </div>
    </AbsoluteFill>
  );
}

/* ── Scene 3: Chat ── */
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
        width: 600, background: SURFACE, borderRadius: 36, border: `1px solid ${LINE}`,
        boxShadow: '0 36px 80px rgba(27,27,43,0.16)', overflow: 'hidden', transform: `scale(${0.92 + 0.08 * card})`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '22px 28px', borderBottom: `1px solid ${LINE}`, background: '#fbfaf7' }}>
          <span style={{ width: 14, height: 14, borderRadius: 8, background: '#e7b4ad' }} />
          <span style={{ width: 14, height: 14, borderRadius: 8, background: '#e6d39a' }} />
          <span style={{ width: 14, height: 14, borderRadius: 8, background: '#a9d8b8' }} />
          <span style={{ marginLeft: 8, fontFamily: SANS, fontSize: 22, fontWeight: 600, color: MUTED }}>Admission Mantrana</span>
        </div>
        <div style={{ padding: '34px 30px', minHeight: 300, fontFamily: SANS }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', opacity: user, transform: `translateY(${(1 - user) * 10}px)` }}>
            <div style={{ background: '#eef0fd', border: '1px solid #d9dbfb', color: INK, padding: '18px 22px', borderRadius: '20px 20px 8px 20px', fontSize: 26, maxWidth: 460, lineHeight: 1.4 }}>
              JEE rank 12,000, OBC-NCL — CSE options?
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 26 }}>
            <span style={{ width: 46, height: 46, borderRadius: 13, background: INDIGO, flexShrink: 0 }} />
            <div style={{ fontSize: 26, lineHeight: 1.55, color: INK_SOFT, paddingTop: 6 }}>
              {showDots ? (
                <span style={{ color: MUTED, fontSize: 40, letterSpacing: 5 }}>•••</span>
              ) : frame >= 46 ? (
                <>
                  {reply.slice(0, chars)}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 22 }}>
                    {chips.map((c, i) => {
                      const cs = spring({ frame: frame - (90 + i * 10), fps: 30, config: { damping: 12 } });
                      return (
                        <span key={c} style={{
                          transform: `scale(${cs})`, padding: '12px 20px', borderRadius: 999,
                          background: SURFACE, border: `1px solid #d8d3c8`, color: INK, fontSize: 22, fontWeight: 600,
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

/* ── Scene 4: Vertical journey ── */
function Flow() {
  const frame = useCurrentFrame();
  const nodes = ['Rank', 'Match', 'Shortlist'];
  const ys = [360, 660, 960];
  const dotY = interpolate(frame, [20, 70], [360, 960], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const t = interpolate(frame, [2, 18], [0, 1], { extrapolateRight: 'clamp' });
  const out = interpolate(frame, [84, 100], [1, 0], { extrapolateLeft: 'clamp' });
  return (
    <AbsoluteFill style={{ background: PAPER, alignItems: 'center', opacity: out }}>
      <div style={{ fontFamily: SERIF, fontSize: 64, fontWeight: 600, color: INK, opacity: t, marginTop: 140, letterSpacing: '-0.02em', textAlign: 'center', ...wrap }}>
        From rank to shortlist.
      </div>
      <svg width="720" height="1100" viewBox="0 0 720 1100" style={{ position: 'absolute', top: 0, left: 0 }}>
        <line x1="360" y1="360" x2="360" y2="960" stroke={LINE} strokeWidth="8" strokeLinecap="round" />
        <line x1="360" y1="360" x2="360" y2={dotY} stroke={INDIGO} strokeWidth="8" strokeLinecap="round" />
        <circle cx="360" cy={dotY} r="12" fill={INDIGO} />
        {nodes.map((n, i) => {
          const appear = spring({ frame: frame - (10 + i * 16), fps: 30, config: { damping: 12 } });
          const reached = dotY >= ys[i] - 8;
          return (
            <g key={n} transform={`translate(360 ${ys[i]}) scale(${appear})`}>
              <circle r="56" fill={reached ? INDIGO : SURFACE} stroke={reached ? INDIGO : LINE} strokeWidth="3" />
              <text x="86" y="10" textAnchor="start" fontFamily={SANS} fontSize="34" fontWeight="700" fill={INK}>{n}</text>
              <text y="12" textAnchor="middle" fontFamily={SANS} fontSize="34" fontWeight="800" fill={reached ? '#fff' : MUTED}>{i + 1}</text>
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
  const ty = interpolate(frame, [4, 24], [26, 0], { extrapolateRight: 'clamp' });
  const btn = spring({ frame: frame - 20, fps: 30, config: { damping: 12 } });
  return (
    <AbsoluteFill style={{
      alignItems: 'center', justifyContent: 'center', textAlign: 'center',
      background: `radial-gradient(70% 50% at 50% 0%, rgba(79,70,229,0.5), transparent 70%), ${INK}`,
    }}>
      <div style={{ fontFamily: SERIF, fontSize: 78, fontWeight: 600, color: '#fff', opacity: t, transform: `translateY(${ty}px)`, letterSpacing: '-0.02em', lineHeight: 1.1, ...wrap }}>
        Find your college with confidence.
      </div>
      <div style={{
        marginTop: 56, transform: `scale(${btn})`, background: '#fff', color: INDIGO_DEEP,
        fontFamily: SANS, fontWeight: 700, fontSize: 32, padding: '24px 50px', borderRadius: 20,
        boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
      }}>
        Start chatting  →
      </div>
    </AbsoluteFill>
  );
}

export default function ProductVideoPortrait() {
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
