export default function HeroArt({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 520 440"
      role="img"
      aria-label="A student's rank connecting to colleges within reach"
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Soft background glow orb */}
        <radialGradient id="hero_orb" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.30" />
          <stop offset="55%" stopColor="#6366f1" stopOpacity="0.10" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </radialGradient>

        {/* Indigo ramp gradients */}
        <linearGradient id="hero_chip" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="55%" stopColor="#4f46e5" />
          <stop offset="100%" stopColor="#3730a3" />
        </linearGradient>
        <linearGradient id="hero_arc" x1="0" y1="1" x2="1" y2="0" gradientUnits="objectBoundingBox">
          <stop offset="0%" stopColor="#4f46e5" />
          <stop offset="50%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#3730a3" />
        </linearGradient>
        <linearGradient id="hero_card1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f7f5f1" />
        </linearGradient>
        <linearGradient id="hero_card2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#4f46e5" />
        </linearGradient>
        <radialGradient id="hero_dotGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f4a83b" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#f4a83b" stopOpacity="0" />
        </radialGradient>

        {/* Soft drop shadow */}
        <filter id="hero_shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="rgba(27,27,43,0.16)" />
        </filter>
        <filter id="hero_shadowSm" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="5" stdDeviation="6" floodColor="rgba(27,27,43,0.16)" />
        </filter>
      </defs>

      {/* paper backdrop */}
      <rect x="0" y="0" width="520" height="440" fill="#f7f5f1" />

      {/* Background glow orb with gentle pulse */}
      <circle cx="300" cy="180" r="150" fill="url(#hero_orb)">
        <animate
          attributeName="r"
          values="150; 162; 150"
          dur="7s"
          repeatCount="indefinite"
          calcMode="spline"
          keyTimes="0;0.5;1"
          keySplines="0.4 0 0.2 1;0.4 0 0.2 1"
        />
        <animate
          attributeName="opacity"
          values="0.85; 1; 0.85"
          dur="7s"
          repeatCount="indefinite"
        />
      </circle>

      {/* Connecting arc: rank -> colleges */}
      <path
        id="hero_path"
        d="M 118 322 C 200 300, 230 200, 330 150"
        fill="none"
        stroke="url(#hero_arc)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray="2 14"
        opacity="0.85"
      >
        <animate
          attributeName="stroke-dashoffset"
          values="0; -160"
          dur="5s"
          repeatCount="indefinite"
        />
      </path>

      {/* Traveling glow dot along the path */}
      <g>
        <circle r="11" fill="url(#hero_dotGlow)">
          <animateMotion dur="5s" repeatCount="indefinite" rotate="auto" calcMode="spline"
            keyTimes="0;1" keySplines="0.45 0 0.55 1">
            <mpath href="#hero_path" />
          </animateMotion>
        </circle>
        <circle r="4.5" fill="#f4a83b" stroke="#ffffff" strokeWidth="1.5">
          <animateMotion dur="5s" repeatCount="indefinite" rotate="auto" calcMode="spline"
            keyTimes="0;1" keySplines="0.45 0 0.55 1">
            <mpath href="#hero_path" />
          </animateMotion>
          <animate attributeName="r" values="4.5;5.5;4.5" dur="1.6s" repeatCount="indefinite" />
        </circle>
      </g>

      {/* ---------- College cluster (upper-right), parallax floats ---------- */}

      {/* Back college card */}
      <g transform="translate(372 96)">
        <animateTransform
          attributeName="transform"
          type="translate"
          additive="sum"
          values="0 0; 0 -7; 0 0"
          dur="6.5s"
          repeatCount="indefinite"
          calcMode="spline"
          keyTimes="0;0.5;1"
          keySplines="0.4 0 0.2 1;0.4 0 0.2 1"
        />
        <g filter="url(#hero_shadowSm)">
          <rect x="0" y="0" width="96" height="78" rx="14" fill="url(#hero_card2)" />
          {/* campus roof */}
          <path d="M 18 26 L 48 8 L 78 26 Z" fill="#ffffff" opacity="0.92" />
          <rect x="22" y="34" width="52" height="34" rx="5" fill="#ffffff" opacity="0.92" />
          <rect x="44" y="48" width="8" height="20" rx="2" fill="#4f46e5" />
          <circle cx="48" cy="20" r="3" fill="#f4a83b" />
        </g>
      </g>

      {/* Middle / tallest college card */}
      <g transform="translate(330 56)">
        <animateTransform
          attributeName="transform"
          type="translate"
          additive="sum"
          values="0 0; 0 -10; 0 0"
          dur="5.4s"
          repeatCount="indefinite"
          calcMode="spline"
          keyTimes="0;0.5;1"
          keySplines="0.4 0 0.2 1;0.4 0 0.2 1"
        />
        <g filter="url(#hero_shadow)">
          <rect x="0" y="0" width="108" height="118" rx="16" fill="url(#hero_card1)" stroke="#e8e3d9" strokeWidth="1" />
          {/* result-card header bar */}
          <rect x="14" y="16" width="80" height="10" rx="5" fill="url(#hero_chip)" />
          <rect x="14" y="34" width="58" height="7" rx="3.5" fill="#e8e3d9" />
          <rect x="14" y="48" width="44" height="7" rx="3.5" fill="#e8e3d9" />
          {/* emerald "match" pill */}
          <rect x="14" y="70" width="80" height="30" rx="10" fill="#0e9f6e" opacity="0.12" />
          <circle cx="30" cy="85" r="9" fill="#0e9f6e" />
          <path d="M 26 85 l 3 3 l 5 -6" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="46" y="80" width="40" height="10" rx="5" fill="#0e9f6e" opacity="0.55" />
        </g>
      </g>

      {/* Front small college card */}
      <g transform="translate(424 142)">
        <animateTransform
          attributeName="transform"
          type="translate"
          additive="sum"
          values="0 0; 0 -8; 0 0"
          dur="7.2s"
          repeatCount="indefinite"
          calcMode="spline"
          keyTimes="0;0.5;1"
          keySplines="0.4 0 0.2 1;0.4 0 0.2 1"
        />
        <g filter="url(#hero_shadowSm)">
          <rect x="0" y="0" width="72" height="72" rx="13" fill="url(#hero_card1)" stroke="#e8e3d9" strokeWidth="1" />
          <path d="M 14 28 L 36 12 L 58 28 Z" fill="url(#hero_chip)" />
          <rect x="18" y="34" width="36" height="26" rx="5" fill="#f7f5f1" stroke="#e8e3d9" strokeWidth="1" />
          <rect x="33" y="44" width="6" height="16" rx="2" fill="#6366f1" />
          <circle cx="36" cy="20" r="2.6" fill="#f4a83b" />
        </g>
      </g>

      {/* ---------- Rank chip / badge (lower-left) ---------- */}
      <g transform="translate(48 288)">
        <animateTransform
          attributeName="transform"
          type="translate"
          additive="sum"
          values="0 0; 0 -6; 0 0"
          dur="6s"
          repeatCount="indefinite"
          calcMode="spline"
          keyTimes="0;0.5;1"
          keySplines="0.4 0 0.2 1;0.4 0 0.2 1"
        />
        {/* offset depth layer */}
        <rect x="6" y="10" width="156" height="74" rx="18" fill="#3730a3" opacity="0.28" />
        <g filter="url(#hero_shadow)">
          <rect x="0" y="0" width="156" height="74" rx="18" fill="url(#hero_chip)" />
          {/* star accent */}
          <g transform="translate(26 37)">
            <circle r="16" fill="#ffffff" opacity="0.15" />
            <path
              d="M 0 -10 L 2.9 -3.1 L 10.3 -3.1 L 4.4 1.5 L 6.6 8.6 L 0 4.2 L -6.6 8.6 L -4.4 1.5 L -10.3 -3.1 L -2.9 -3.1 Z"
              fill="#f4a83b"
            >
              <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="18s" repeatCount="indefinite" />
            </path>
          </g>
          {/* label + rank value */}
          <text x="54" y="32" fontFamily="system-ui, -apple-system, Segoe UI, sans-serif" fontSize="11" fontWeight="600" fill="#ffffff" opacity="0.75" letterSpacing="1.5">RANK</text>
          <text x="54" y="56" fontFamily="system-ui, -apple-system, Segoe UI, sans-serif" fontSize="22" fontWeight="800" fill="#ffffff">12,000</text>
        </g>
      </g>

      {/* tiny floating accent dots for depth */}
      <circle cx="150" cy="120" r="4" fill="#0e9f6e" opacity="0.7">
        <animate attributeName="opacity" values="0.3;0.8;0.3" dur="4s" repeatCount="indefinite" />
        <animateTransform attributeName="transform" type="translate" values="0 0; 0 -8; 0 0" dur="6s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.4 0 0.2 1;0.4 0 0.2 1" />
      </circle>
      <circle cx="250" cy="372" r="5" fill="#f4a83b" opacity="0.65">
        <animate attributeName="opacity" values="0.35;0.75;0.35" dur="5s" repeatCount="indefinite" />
        <animateTransform attributeName="transform" type="translate" values="0 0; 0 7; 0 0" dur="7s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.4 0 0.2 1;0.4 0 0.2 1" />
      </circle>
    </svg>
  );
}
