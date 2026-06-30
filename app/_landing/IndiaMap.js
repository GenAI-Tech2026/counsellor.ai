import m from './map.module.css';

/* Stylized (not survey-accurate) India silhouette, used purely as warm
   decoration to show counsa works across states. Pins glow at exam-heavy
   states; a few carry floating HTML labels. */

// Smooth, clearly-readable stylized India: wide north, northeast bulge,
// concave Bay of Bengal east coast, the Gujarat/Kutch notch on the west,
// and a clean tapering tip at Kanyakumari. Drawn clockwise from Kashmir.
const INDIA = 'M130 42 '
  + 'C156 30 184 42 210 60 C240 80 270 86 298 104 '          // wide northern border
  + 'C312 113 320 126 312 138 C304 150 290 149 279 156 '     // northeast bulge + neck
  + 'C273 167 270 182 266 198 C259 226 250 248 242 268 '     // West Bengal / Odisha coast
  + 'C233 292 222 318 206 348 C196 367 186 388 176 408 '     // concave Bay of Bengal -> tip
  + 'C172 400 168 390 164 378 C154 350 144 326 135 302 '     // Kanyakumari -> Kerala
  + 'C126 278 117 256 110 236 C104 220 98 206 94 196 '       // Karnataka / Konkan coast
  + 'C90 187 82 184 76 188 C84 179 95 177 100 169 '          // Saurashtra bump + Kutch notch
  + 'C91 164 80 166 72 158 C82 146 95 142 100 128 '          // Kutch point -> up
  + 'C106 110 108 88 112 72 C116 56 120 46 130 42 Z';        // northwest border -> Kashmir

// pins: [x, y, hot?]  (hot = exam-heavy southern states, shown in green)
const PINS = [
  [158, 92],          // Delhi (north-center)
  [244, 188],         // West Bengal (east)
  [128, 208],         // Maharashtra (west-center)
  [180, 222, true],   // Telangana (center)
  [210, 258, true],   // Andhra Pradesh (center-east)
  [155, 280, true],   // Karnataka (south-center-west)
  [194, 335, true],   // Tamil Nadu (south-east)
  [160, 350, true],   // Kerala (south-west)
];

// labels: [x, y, text] in viewBox coords (360x440); .tag floats just above
const LABELS = [
  [158, 92, 'Delhi'],
  [180, 222, 'Telangana'],
  [128, 208, 'Maharashtra'],
  [210, 258, 'Andhra'],
  [194, 335, 'Tamil Nadu'],
];

export default function IndiaMap() {
  return (
    <div className={m.wrap}>
      <svg className={m.map} viewBox="0 0 360 440" role="img" aria-label="counsa.ai works across India">
        <defs>
          <linearGradient id="indiaFill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffe3cf" />
            <stop offset="100%" stopColor="#ffc09c" />
          </linearGradient>
          <pattern id="indiaDots" width="14" height="14" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="3" r="1.5" className={m.dots} />
          </pattern>
          <clipPath id="indiaClip"><path d={INDIA} /></clipPath>
        </defs>

        <path className={m.land} d={INDIA} />
        <rect x="0" y="0" width="360" height="440" fill="url(#indiaDots)" clipPath="url(#indiaClip)" />

        {PINS.map(([x, y, hot], i) => (
          <g key={i}>
            <circle className={m.ring} cx={x} cy={y} r="7" style={{ animationDelay: `${i * 0.32}s` }} />
            <circle className={`${m.dot} ${hot ? m.dotHot : ''}`} cx={x} cy={y} r="4.5" />
          </g>
        ))}
      </svg>

      {LABELS.map(([x, y, text]) => (
        <span key={text} className={m.tag} style={{ left: `${(x / 360) * 100}%`, top: `${(y / 440) * 100}%` }}>{text}</span>
      ))}
    </div>
  );
}
