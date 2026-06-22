export default function ForkArt({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 560 360"
      role="img"
      aria-label="The same rank leading to a clear path or a confusing one"
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Background paper wash */}
        <linearGradient id="fork_paper" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#f7f5f1" />
        </linearGradient>

        {/* Indigo ramp gradient for paths */}
        <linearGradient id="fork_indigoPath" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#6366f1" />
          <stop offset="0.55" stopColor="#4f46e5" />
          <stop offset="1" stopColor="#3730a3" />
        </linearGradient>

        {/* Rank badge fill */}
        <linearGradient id="fork_badge" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6366f1" />
          <stop offset="1" stopColor="#4f46e5" />
        </linearGradient>

        {/* Success card surface */}
        <linearGradient id="fork_card" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#f7f5f1" />
        </linearGradient>

        {/* Success card top accent bar */}
        <linearGradient id="fork_cardAccent" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#4f46e5" />
          <stop offset="1" stopColor="#0e9f6e" />
        </linearGradient>

        {/* Emerald glow ring gradient */}
        <radialGradient id="fork_glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#0e9f6e" stopOpacity="0.55" />
          <stop offset="0.6" stopColor="#0e9f6e" stopOpacity="0.18" />
          <stop offset="1" stopColor="#0e9f6e" stopOpacity="0" />
        </radialGradient>

        {/* Soft drop shadow */}
        <filter id="fork_shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="rgba(27,27,43,0.16)" />
        </filter>

        {/* Lighter shadow for the rank badge / chips */}
        <filter id="fork_shadowSm" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="rgba(27,27,43,0.16)" />
        </filter>
      </defs>

      {/* ---- Backdrop ---- */}
      <rect x="0" y="0" width="560" height="360" rx="22" fill="url(#fork_paper)" />
      <rect
        x="0.5"
        y="0.5"
        width="559"
        height="359"
        rx="22"
        fill="none"
        stroke="#e8e3d9"
        strokeWidth="1"
      />

      {/* ===================== UPPER (CLARITY) ===================== */}
      {/* Smooth indigo path drawing in from rank node to success card */}
      <path
        d="M 118 184 C 200 150, 250 96, 372 96"
        fill="none"
        stroke="url(#fork_indigoPath)"
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray="420"
        strokeDashoffset="420"
      >
        <animate
          attributeName="stroke-dashoffset"
          from="420"
          to="0"
          dur="5s"
          begin="0.3s"
          fill="freeze"
        />
      </path>

      {/* Traveling spark along the clear path */}
      <circle r="4.5" fill="#0e9f6e">
        <animateMotion
          path="M 118 184 C 200 150, 250 96, 372 96"
          dur="6s"
          begin="1.2s"
          repeatCount="indefinite"
          rotate="auto"
        />
        <animate
          attributeName="opacity"
          values="0;1;1;0"
          keyTimes="0;0.1;0.85;1"
          dur="6s"
          begin="1.2s"
          repeatCount="indefinite"
        />
      </circle>

      {/* Floating success card group */}
      <g>
        <animateTransform
          attributeName="transform"
          type="translate"
          values="0 0; 0 -7; 0 0"
          dur="6s"
          repeatCount="indefinite"
          additive="sum"
        />

        {/* Pulsing emerald glow behind card */}
        <ellipse cx="448" cy="100" rx="92" ry="74" fill="url(#fork_glow)">
          <animate
            attributeName="opacity"
            values="0.45;0.95;0.45"
            dur="4.5s"
            repeatCount="indefinite"
          />
        </ellipse>

        {/* Card body */}
        <g filter="url(#fork_shadow)">
          <rect x="372" y="52" width="150" height="100" rx="16" fill="url(#fork_card)" />
        </g>
        <rect
          x="372"
          y="52"
          width="150"
          height="100"
          rx="16"
          fill="none"
          stroke="#e8e3d9"
          strokeWidth="1"
        />
        {/* Top accent bar */}
        <rect x="372" y="52" width="150" height="12" rx="6" fill="url(#fork_cardAccent)" />

        {/* Emerald success check disc */}
        <circle cx="400" cy="92" r="15" fill="#0e9f6e" filter="url(#fork_shadowSm)" />
        <path
          d="M 393 92 l 5 5 l 9 -10"
          fill="none"
          stroke="#ffffff"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="26"
          strokeDashoffset="26"
        >
          <animate
            attributeName="stroke-dashoffset"
            from="26"
            to="0"
            dur="0.8s"
            begin="2.4s"
            fill="freeze"
          />
        </path>

        {/* Card text lines */}
        <rect x="424" y="84" width="74" height="8" rx="4" fill="#1b1b2b" />
        <rect x="424" y="98" width="54" height="6" rx="3" fill="#6b6b80" />

        {/* Amber star accent */}
        <path
          d="M 487 124 l 3.4 6.9 l 7.6 1.1 l -5.5 5.4 l 1.3 7.6 l -6.8 -3.6 l -6.8 3.6 l 1.3 -7.6 l -5.5 -5.4 l 7.6 -1.1 z"
          fill="#f4a83b"
        />
        {/* Admission line chip */}
        <rect x="388" y="122" width="78" height="18" rx="9" fill="#f7f5f1" stroke="#e8e3d9" />
        <rect x="396" y="128" width="44" height="6" rx="3" fill="#4f46e5" />
      </g>

      {/* ===================== LOWER (CHAOS) ===================== */}
      {/* Tangled zig-zag muted path drawing in */}
      <path
        d="M 118 196 C 168 224, 150 258, 198 252 C 246 246, 222 290, 270 286 C 316 282, 300 314, 348 308"
        fill="none"
        stroke="#6b6b80"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="560"
        strokeDashoffset="560"
        opacity="0.8"
      >
        <animate
          attributeName="stroke-dashoffset"
          from="560"
          to="0"
          dur="7s"
          begin="0.5s"
          fill="freeze"
        />
      </path>

      {/* Cluster of overlapping, askew muted cutoff sheets (gently jitters) */}
      <g>
        <animateTransform
          attributeName="transform"
          type="translate"
          values="0 0; 0 3; 0 0"
          dur="5.5s"
          repeatCount="indefinite"
          additive="sum"
        />

        {/* Sheet 3 (back) */}
        <g transform="rotate(-9 430 290)">
          <rect
            x="388"
            y="250"
            width="92"
            height="78"
            rx="8"
            fill="#ffffff"
            stroke="#e8e3d9"
            strokeWidth="1.5"
            filter="url(#fork_shadowSm)"
          />
          <rect x="398" y="262" width="60" height="6" rx="3" fill="#e8e3d9" />
          <rect x="398" y="276" width="70" height="5" rx="2.5" fill="#e8e3d9" />
          <rect x="398" y="288" width="48" height="5" rx="2.5" fill="#e8e3d9" />
          <rect x="398" y="300" width="64" height="5" rx="2.5" fill="#e8e3d9" />
        </g>

        {/* Sheet 2 (mid) */}
        <g transform="rotate(7 422 296)">
          <rect
            x="404"
            y="262"
            width="92"
            height="80"
            rx="8"
            fill="#ffffff"
            stroke="#e8e3d9"
            strokeWidth="1.5"
            filter="url(#fork_shadowSm)"
          />
          <rect x="414" y="274" width="56" height="6" rx="3" fill="#6b6b80" opacity="0.5" />
          <rect x="414" y="288" width="70" height="5" rx="2.5" fill="#e8e3d9" />
          <rect x="414" y="300" width="52" height="5" rx="2.5" fill="#e8e3d9" />
          <rect x="414" y="312" width="66" height="5" rx="2.5" fill="#e8e3d9" />
        </g>

        {/* Sheet 1 (front) */}
        <g transform="rotate(-3 372 300)">
          <rect
            x="344"
            y="270"
            width="94"
            height="82"
            rx="8"
            fill="#ffffff"
            stroke="#e8e3d9"
            strokeWidth="1.5"
            filter="url(#fork_shadow)"
          />
          <rect x="354" y="282" width="50" height="6" rx="3" fill="#6b6b80" opacity="0.6" />
          <rect x="354" y="296" width="72" height="5" rx="2.5" fill="#e8e3d9" />
          <rect x="354" y="308" width="58" height="5" rx="2.5" fill="#e8e3d9" />
          <rect x="354" y="320" width="68" height="5" rx="2.5" fill="#e8e3d9" />
          <rect x="354" y="332" width="44" height="5" rx="2.5" fill="#e8e3d9" />

          {/* Question-mark confusion badge */}
          <circle cx="424" cy="282" r="12" fill="#f7f5f1" stroke="#6b6b80" strokeWidth="1.5" />
          <text
            x="424"
            y="287"
            textAnchor="middle"
            fontFamily="Georgia, 'Times New Roman', serif"
            fontSize="15"
            fontWeight="700"
            fill="#6b6b80"
          >
            ?
          </text>
        </g>
      </g>

      {/* ===================== LEFT: RANK NODE ===================== */}
      <g>
        <animateTransform
          attributeName="transform"
          type="translate"
          values="0 0; 0 -4; 0 0"
          dur="5s"
          repeatCount="indefinite"
          additive="sum"
        />
        {/* Connector hub */}
        <circle cx="118" cy="190" r="9" fill="#4f46e5" filter="url(#fork_shadowSm)" />
        <circle cx="118" cy="190" r="3.5" fill="#ffffff" />

        {/* Rank badge */}
        <g filter="url(#fork_shadow)">
          <rect x="34" y="160" width="80" height="60" rx="14" fill="url(#fork_badge)" />
        </g>
        <rect x="34" y="160" width="80" height="60" rx="14" fill="none" stroke="#3730a3" strokeWidth="1" opacity="0.4" />
        <text
          x="74"
          y="183"
          textAnchor="middle"
          fontFamily="'Segoe UI', Helvetica, Arial, sans-serif"
          fontSize="9"
          fontWeight="600"
          letterSpacing="1.5"
          fill="#e8e3d9"
        >
          RANK
        </text>
        <text
          x="74"
          y="206"
          textAnchor="middle"
          fontFamily="'Segoe UI', Helvetica, Arial, sans-serif"
          fontSize="19"
          fontWeight="800"
          fill="#ffffff"
        >
          12,480
        </text>
      </g>
    </svg>
  );
}
