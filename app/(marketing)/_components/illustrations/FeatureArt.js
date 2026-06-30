// Bold editorial 3D-ish animated SVG illustrations for the marketing site.
// Three self-contained scenes, SMIL animation only, light "paper" theme.
// Palette: paper #f7f5f1, surface #ffffff, ink #1b1b2b, line #e8e3d9,
// indigo #ff7a3c/#f35b04/#bc4400, emerald #0e9f6e, amber #f4a83b, muted #6b6b80.

export function DataStack({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 320 260"
      role="img"
      aria-label="Built on official data"
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="data_sheet" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#f7f5f1" />
        </linearGradient>
        <linearGradient id="data_top" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff7a3c" />
          <stop offset="1" stopColor="#f35b04" />
        </linearGradient>
        <linearGradient id="data_seal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0e9f6e" />
          <stop offset="1" stopColor="#0a7d56" />
        </linearGradient>
        <filter id="data_shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="6" stdDeviation="7" floodColor="rgba(27,27,43,0.16)" />
        </filter>
        <filter id="data_shadowSm" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="rgba(27,27,43,0.16)" />
        </filter>
      </defs>

      {/* paper backdrop */}
      <rect x="0" y="0" width="320" height="260" fill="#f7f5f1" />

      {/* floating stack group */}
      <g>
        <animateTransform
          attributeName="transform"
          type="translate"
          values="0 0;0 -5;0 0"
          dur="6s"
          repeatCount="indefinite"
          calcMode="spline"
          keyTimes="0;0.5;1"
          keySplines="0.4 0 0.2 1;0.4 0 0.2 1"
        />

        {/* back sheets, offset for depth */}
        <g filter="url(#data_shadow)">
          <rect x="78" y="64" width="150" height="120" rx="14" fill="url(#data_sheet)" stroke="#e8e3d9" strokeWidth="2" opacity="0.55" transform="rotate(-6 153 124)" />
          <rect x="84" y="58" width="150" height="120" rx="14" fill="url(#data_sheet)" stroke="#e8e3d9" strokeWidth="2" opacity="0.8" transform="rotate(-3 159 118)" />
        </g>

        {/* front sheet */}
        <g filter="url(#data_shadow)">
          <rect x="90" y="52" width="150" height="120" rx="14" fill="url(#data_sheet)" stroke="#e8e3d9" strokeWidth="2" />
          {/* header band */}
          <rect x="90" y="52" width="150" height="30" rx="14" fill="url(#data_top)" />
          <rect x="90" y="70" width="150" height="12" fill="url(#data_top)" />
          <circle cx="106" cy="67" r="4" fill="#ffffff" opacity="0.9" />
          <rect x="116" y="63" width="64" height="8" rx="4" fill="#ffffff" opacity="0.85" />

          {/* data rows */}
          <rect x="104" y="98" width="92" height="8" rx="4" fill="#e8e3d9" />
          <rect x="104" y="116" width="120" height="8" rx="4" fill="#e8e3d9" />
          <rect x="104" y="134" width="78" height="8" rx="4" fill="#e8e3d9" />
          <rect x="104" y="152" width="108" height="8" rx="4" fill="#e8e3d9" />

          {/* sweeping highlight row */}
          <rect x="104" y="116" width="120" height="8" rx="4" fill="#ff7a3c" opacity="0.18">
            <animate attributeName="y" values="98;152;98" dur="5s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.4 0 0.2 1;0.4 0 0.2 1" />
            <animate attributeName="width" values="92;108;78;120;92" dur="5s" repeatCount="indefinite" />
          </rect>
        </g>

        {/* emerald seal / check badge */}
        <g filter="url(#data_shadowSm)" transform="translate(214 142)">
          <animateTransform attributeName="transform" type="translate" values="214 142;214 138;214 142" dur="5s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.4 0 0.2 1;0.4 0 0.2 1" additive="sum" />
          <circle cx="0" cy="0" r="22" fill="url(#data_seal)" />
          <circle cx="0" cy="0" r="22" fill="none" stroke="#ffffff" strokeWidth="2" opacity="0.6" />
          {/* pulsing glow ring */}
          <circle cx="0" cy="0" r="22" fill="none" stroke="#0e9f6e" strokeWidth="2">
            <animate attributeName="r" values="22;30;22" dur="4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.5;0;0.5" dur="4s" repeatCount="indefinite" />
          </circle>
          {/* checkmark */}
          <path d="M -9 1 L -3 7 L 9 -7" fill="none" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </g>
    </svg>
  );
}

export function TargetMatch({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 320 260"
      role="img"
      aria-label="Matched to your exact rank"
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="match_funnel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff7a3c" />
          <stop offset="1" stopColor="#bc4400" />
        </linearGradient>
        <linearGradient id="match_glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#f7f5f1" />
        </linearGradient>
        <radialGradient id="match_dot" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#ff9d5c" />
          <stop offset="1" stopColor="#f35b04" />
        </radialGradient>
        <filter id="match_shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="6" stdDeviation="7" floodColor="rgba(27,27,43,0.16)" />
        </filter>
        <filter id="match_shadowSm" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="rgba(27,27,43,0.16)" />
        </filter>
        <clipPath id="match_funnelClip">
          <path d="M 96 64 L 224 64 L 178 138 L 178 196 L 142 196 L 142 138 Z" />
        </clipPath>
      </defs>

      <rect x="0" y="0" width="320" height="260" fill="#f7f5f1" />

      {/* MANY small muted dots drifting down into the funnel mouth */}
      <g>
        <circle cx="118" cy="36" r="4" fill="#6b6b80" opacity="0.55">
          <animate attributeName="cy" values="36;70;36" dur="4.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.55;0.1;0.55" dur="4.5s" repeatCount="indefinite" />
        </circle>
        <circle cx="150" cy="28" r="3.5" fill="#6b6b80" opacity="0.5">
          <animate attributeName="cy" values="28;66;28" dur="5.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.5;0.1;0.5" dur="5.5s" repeatCount="indefinite" />
        </circle>
        <circle cx="172" cy="40" r="4" fill="#6b6b80" opacity="0.5">
          <animate attributeName="cy" values="40;72;40" dur="5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.5;0.1;0.5" dur="5s" repeatCount="indefinite" />
        </circle>
        <circle cx="200" cy="32" r="3.5" fill="#6b6b80" opacity="0.45">
          <animate attributeName="cy" values="32;68;32" dur="6s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.45;0.1;0.45" dur="6s" repeatCount="indefinite" />
        </circle>
        <circle cx="134" cy="46" r="3" fill="#6b6b80" opacity="0.45">
          <animate attributeName="cy" values="46;74;46" dur="4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.45;0.1;0.45" dur="4s" repeatCount="indefinite" />
        </circle>
        <circle cx="186" cy="48" r="3" fill="#6b6b80" opacity="0.4">
          <animate attributeName="cy" values="48;74;48" dur="5.2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.4;0.1;0.4" dur="5.2s" repeatCount="indefinite" />
        </circle>
      </g>

      <g>
        <animateTransform
          attributeName="transform"
          type="translate"
          values="0 0;0 -5;0 0"
          dur="7s"
          repeatCount="indefinite"
          calcMode="spline"
          keyTimes="0;0.5;1"
          keySplines="0.4 0 0.2 1;0.4 0 0.2 1"
        />

        {/* funnel body */}
        <g filter="url(#match_shadow)">
          <path d="M 96 64 L 224 64 L 178 138 L 178 196 L 142 196 L 142 138 Z" fill="url(#match_glass)" stroke="#e8e3d9" strokeWidth="2" />
          {/* funnel rim accent */}
          <path d="M 96 64 L 224 64 L 214 80 L 106 80 Z" fill="url(#match_funnel)" />
          <rect x="142" y="138" width="36" height="58" fill="url(#match_funnel)" opacity="0.12" />
        </g>

        {/* dots filtering THROUGH the funnel neck (clipped to funnel) */}
        <g clipPath="url(#match_funnelClip)">
          <circle r="4" fill="url(#match_dot)">
            <animate attributeName="cx" values="120;160;160" dur="3s" repeatCount="indefinite" />
            <animate attributeName="cy" values="86;140;200" dur="3s" repeatCount="indefinite" />
          </circle>
          <circle r="4" fill="url(#match_dot)">
            <animate attributeName="cx" values="198;160;160" dur="3.4s" begin="0.6s" repeatCount="indefinite" />
            <animate attributeName="cy" values="86;140;200" dur="3.4s" begin="0.6s" repeatCount="indefinite" />
          </circle>
          <circle r="3.5" fill="url(#match_dot)">
            <animate attributeName="cx" values="150;160;160" dur="3.2s" begin="1.2s" repeatCount="indefinite" />
            <animate attributeName="cy" values="86;140;200" dur="3.2s" begin="1.2s" repeatCount="indefinite" />
          </circle>
        </g>

        {/* the FEW highlighted indigo result dots, landed below */}
        <g filter="url(#match_shadowSm)">
          <circle cx="160" cy="218" r="11" fill="url(#match_dot)">
            <animate attributeName="r" values="11;12.5;11" dur="4s" repeatCount="indefinite" />
          </circle>
          <circle cx="160" cy="218" r="11" fill="none" stroke="#ff7a3c" strokeWidth="2">
            <animate attributeName="r" values="11;20;11" dur="4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.6;0;0.6" dur="4s" repeatCount="indefinite" />
          </circle>
          <circle cx="132" cy="226" r="7" fill="url(#match_dot)" opacity="0.9" />
          <circle cx="188" cy="226" r="7" fill="url(#match_dot)" opacity="0.9" />
        </g>
        {/* a tiny amber pop on the prime match */}
        <circle cx="160" cy="218" r="3" fill="#f4a83b">
          <animate attributeName="opacity" values="1;0.3;1" dur="2.5s" repeatCount="indefinite" />
        </circle>
      </g>
    </svg>
  );
}

export function ProfileCard({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 320 260"
      role="img"
      aria-label="Remembers you"
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="profile_card" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#f7f5f1" />
        </linearGradient>
        <linearGradient id="profile_avatar" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff7a3c" />
          <stop offset="1" stopColor="#bc4400" />
        </linearGradient>
        <linearGradient id="profile_pill" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ff7a3c" />
          <stop offset="1" stopColor="#f35b04" />
        </linearGradient>
        <filter id="profile_shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="6" stdDeviation="7" floodColor="rgba(27,27,43,0.16)" />
        </filter>
        <filter id="profile_shadowSm" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="rgba(27,27,43,0.16)" />
        </filter>
      </defs>

      <rect x="0" y="0" width="320" height="260" fill="#f7f5f1" />

      <g>
        <animateTransform
          attributeName="transform"
          type="translate"
          values="0 0;0 -5;0 0"
          dur="6.5s"
          repeatCount="indefinite"
          calcMode="spline"
          keyTimes="0;0.5;1"
          keySplines="0.4 0 0.2 1;0.4 0 0.2 1"
        />

        {/* offset back card for depth */}
        <rect x="64" y="58" width="180" height="148" rx="16" fill="#ffffff" stroke="#e8e3d9" strokeWidth="2" opacity="0.7" filter="url(#profile_shadow)" transform="translate(10 10)" />

        {/* main profile card */}
        <g filter="url(#profile_shadow)">
          <rect x="58" y="46" width="180" height="148" rx="16" fill="url(#profile_card)" stroke="#e8e3d9" strokeWidth="2" />

          {/* avatar */}
          <circle cx="88" cy="78" r="18" fill="url(#profile_avatar)" />
          <circle cx="88" cy="72" r="6.5" fill="#ffffff" opacity="0.95" />
          <path d="M 76 90 a 12 10 0 0 1 24 0 Z" fill="#ffffff" opacity="0.95" />

          {/* name + subtitle */}
          <rect x="116" y="68" width="78" height="9" rx="4.5" fill="#1b1b2b" opacity="0.85" />
          <rect x="116" y="83" width="52" height="7" rx="3.5" fill="#6b6b80" opacity="0.7" />

          {/* divider */}
          <rect x="74" y="108" width="148" height="2" rx="1" fill="#e8e3d9" />

          {/* saved field rows: label + value pill */}
          {/* Exam */}
          <rect x="74" y="122" width="40" height="8" rx="4" fill="#6b6b80" opacity="0.55" />
          <rect x="148" y="119" width="74" height="14" rx="7" fill="url(#profile_pill)" opacity="0.16" />
          <rect x="156" y="122" width="42" height="8" rx="4" fill="#f35b04" opacity="0.85" />
          {/* Rank */}
          <rect x="74" y="146" width="40" height="8" rx="4" fill="#6b6b80" opacity="0.55" />
          <rect x="148" y="143" width="74" height="14" rx="7" fill="url(#profile_pill)" opacity="0.16" />
          <rect x="156" y="146" width="34" height="8" rx="4" fill="#f35b04" opacity="0.85" />
          {/* Category */}
          <rect x="74" y="170" width="40" height="8" rx="4" fill="#6b6b80" opacity="0.55" />
          <rect x="148" y="167" width="74" height="14" rx="7" fill="url(#profile_pill)" opacity="0.16" />
          <rect x="156" y="170" width="50" height="8" rx="4" fill="#f35b04" opacity="0.85" />
        </g>

        {/* amber sparkle, twinkling near the card corner */}
        <g transform="translate(224 56)">
          <animateTransform attributeName="transform" type="translate" values="224 56;224 52;224 56" dur="5s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.4 0 0.2 1;0.4 0 0.2 1" additive="sum" />
          <g>
            <animateTransform attributeName="transform" type="scale" values="0.7;1.15;0.7" dur="2.4s" repeatCount="indefinite" additive="sum" />
            <animate attributeName="opacity" values="1;0.4;1" dur="2.4s" repeatCount="indefinite" />
            <path d="M 0 -12 C 1.5 -3 3 -1.5 12 0 C 3 1.5 1.5 3 0 12 C -1.5 3 -3 1.5 -12 0 C -3 -1.5 -1.5 -3 0 -12 Z" fill="#f4a83b" />
          </g>
        </g>
        {/* tiny secondary sparkle */}
        <circle cx="50" cy="180" r="3" fill="#f4a83b">
          <animate attributeName="opacity" values="0.2;1;0.2" dur="3s" begin="0.8s" repeatCount="indefinite" />
          <animate attributeName="r" values="2;3.5;2" dur="3s" begin="0.8s" repeatCount="indefinite" />
        </circle>
      </g>
    </svg>
  );
}
