export default function JourneyArt({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 720 240"
      role="img"
      aria-label="Rank to match to shortlist journey"
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Soft dimensional drop shadow */}
        <filter id="journey_shadow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="rgba(27,27,43,0.16)" />
        </filter>
        <filter id="journey_shadowSoft" x="-60%" y="-60%" width="220%" height="220%">
          <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="rgba(27,27,43,0.16)" />
        </filter>
        {/* Glow for the travelling dot */}
        <filter id="journey_glow" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Background paper wash */}
        <linearGradient id="journey_paper" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#f7f5f1" />
        </linearGradient>

        {/* Indigo path gradient */}
        <linearGradient id="journey_pathGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ff7a3c" />
          <stop offset="0.5" stopColor="#f35b04" />
          <stop offset="1" stopColor="#bc4400" />
        </linearGradient>

        {/* Node face gradients */}
        <radialGradient id="journey_nodeIndigo" cx="0.35" cy="0.3" r="0.85">
          <stop offset="0" stopColor="#ff7a3c" />
          <stop offset="0.6" stopColor="#f35b04" />
          <stop offset="1" stopColor="#bc4400" />
        </radialGradient>
        <radialGradient id="journey_nodeLight" cx="0.35" cy="0.3" r="0.9">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#f7f5f1" />
        </radialGradient>
        <radialGradient id="journey_ring" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0.6" stopColor="#ff7a3c" stopOpacity="0" />
          <stop offset="0.85" stopColor="#ff7a3c" stopOpacity="0.35" />
          <stop offset="1" stopColor="#ff7a3c" stopOpacity="0" />
        </radialGradient>

        <radialGradient id="journey_dotGrad" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.4" stopColor="#ffc59e" />
          <stop offset="1" stopColor="#f35b04" />
        </radialGradient>

        {/* The route the dot travels — also the visible connecting path */}
        <path
          id="journey_route"
          d="M 150 120 C 250 70, 280 70, 360 120 C 440 170, 470 170, 570 120"
          fill="none"
        />
      </defs>

      {/* Background panel */}
      <rect x="6" y="10" width="708" height="220" rx="28" fill="url(#journey_paper)" stroke="#e8e3d9" />

      <g>
        {/* Gentle float on the whole scene */}
        <animateTransform
          attributeName="transform"
          type="translate"
          values="0 0; 0 -4; 0 0"
          dur="6s"
          repeatCount="indefinite"
          calcMode="spline"
          keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"
          keyTimes="0;0.5;1"
        />

        {/* Connecting path — soft underlay then bright gradient */}
        <use href="#journey_route" stroke="#e8e3d9" strokeWidth="16" strokeLinecap="round" />
        <use
          href="#journey_route"
          stroke="url(#journey_pathGrad)"
          strokeWidth="10"
          strokeLinecap="round"
          filter="url(#journey_shadowSoft)"
        />
        {/* Dashed progress shimmer along the route */}
        <use
          href="#journey_route"
          stroke="#ffffff"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="2 26"
          strokeOpacity="0.7"
        >
          <animate attributeName="stroke-dashoffset" from="0" to="-28" dur="1.6s" repeatCount="indefinite" />
        </use>

        {/* ---------- NODE 1 : RANK ---------- */}
        <g>
          <circle cx="150" cy="120" r="54" fill="url(#journey_ring)">
            <animate
              attributeName="opacity"
              values="0.2;1;0.2"
              dur="4s"
              begin="0s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="r"
              values="50;58;50"
              dur="4s"
              begin="0s"
              repeatCount="indefinite"
            />
          </circle>
          <circle cx="150" cy="120" r="40" fill="url(#journey_nodeIndigo)" filter="url(#journey_shadow)" />
          <ellipse cx="150" cy="106" rx="26" ry="14" fill="#ffffff" opacity="0.18" />
          {/* tag / rank shape */}
          <g transform="translate(150 120)">
            <path
              d="M -16 -12 H 6 L 18 0 L 6 12 H -16 Z"
              fill="#ffffff"
              filter="url(#journey_shadowSoft)"
            />
            <circle cx="9" cy="0" r="3" fill="#f35b04" />
            <rect x="-12" y="-4" width="14" height="3.2" rx="1.6" fill="#ff7a3c" />
            <rect x="-12" y="2" width="9" height="3.2" rx="1.6" fill="#ffc59e" />
          </g>
          <text
            x="150"
            y="190"
            textAnchor="middle"
            fontFamily="system-ui, -apple-system, Segoe UI, sans-serif"
            fontSize="16"
            fontWeight="700"
            fill="#1b1b2b"
          >
            Rank
          </text>
        </g>

        {/* ---------- NODE 2 : MATCH ---------- */}
        <g>
          <circle cx="360" cy="120" r="58" fill="url(#journey_ring)">
            <animate
              attributeName="opacity"
              values="0.2;1;0.2"
              dur="4s"
              begin="1.33s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="r"
              values="54;62;54"
              dur="4s"
              begin="1.33s"
              repeatCount="indefinite"
            />
          </circle>
          <circle cx="360" cy="120" r="46" fill="url(#journey_nodeLight)" stroke="#e8e3d9" filter="url(#journey_shadow)" />
          <ellipse cx="360" cy="104" rx="30" ry="15" fill="#ffffff" opacity="0.5" />
          {/* funnel / filter shape */}
          <g transform="translate(360 120)">
            <path
              d="M -22 -18 H 22 L 7 4 V 18 L -7 24 V 4 Z"
              fill="url(#journey_pathGrad)"
              filter="url(#journey_shadowSoft)"
            />
            <rect x="-22" y="-18" width="44" height="6" rx="3" fill="#bc4400" />
            <circle cx="0" cy="-1" r="2.4" fill="#ffffff" opacity="0.85" />
          </g>
          <text
            x="360"
            y="196"
            textAnchor="middle"
            fontFamily="system-ui, -apple-system, Segoe UI, sans-serif"
            fontSize="16"
            fontWeight="700"
            fill="#1b1b2b"
          >
            Match
          </text>
        </g>

        {/* ---------- NODE 3 : SHORTLIST ---------- */}
        <g>
          <circle cx="570" cy="120" r="54" fill="url(#journey_ring)">
            <animate
              attributeName="opacity"
              values="0.2;1;0.2"
              dur="4s"
              begin="2.66s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="r"
              values="50;58;50"
              dur="4s"
              begin="2.66s"
              repeatCount="indefinite"
            />
          </circle>
          <circle cx="570" cy="120" r="40" fill="url(#journey_nodeLight)" stroke="#e8e3d9" filter="url(#journey_shadow)" />
          <ellipse cx="570" cy="106" rx="26" ry="13" fill="#ffffff" opacity="0.5" />
          {/* checklist / list with checkmark */}
          <g transform="translate(570 120)">
            <rect x="-18" y="-20" width="36" height="40" rx="6" fill="#ffffff" stroke="#e8e3d9" filter="url(#journey_shadowSoft)" />
            <rect x="-12" y="-13" width="8" height="6" rx="2" fill="#0e9f6e" />
            <rect x="-1" y="-12" width="13" height="3.2" rx="1.6" fill="#6b6b80" />
            <rect x="-12" y="-1" width="8" height="6" rx="2" fill="#f4a83b" />
            <rect x="-1" y="0" width="13" height="3.2" rx="1.6" fill="#6b6b80" />
            <rect x="-12" y="11" width="8" height="6" rx="2" fill="#ff7a3c" />
            <rect x="-1" y="12" width="11" height="3.2" rx="1.6" fill="#6b6b80" />
            {/* big confirming checkmark badge */}
            <g transform="translate(13 -16)">
              <circle r="11" fill="#0e9f6e" filter="url(#journey_shadowSoft)" />
              <path d="M -5 0 L -1.5 4 L 5 -4" fill="none" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          </g>
          <text
            x="570"
            y="190"
            textAnchor="middle"
            fontFamily="system-ui, -apple-system, Segoe UI, sans-serif"
            fontSize="16"
            fontWeight="700"
            fill="#1b1b2b"
          >
            Shortlist
          </text>
        </g>

        {/* ---------- Travelling glowing dot ---------- */}
        <circle r="7" fill="url(#journey_dotGrad)" filter="url(#journey_glow)">
          <animateMotion dur="4s" repeatCount="indefinite" rotate="auto" calcMode="spline" keySplines="0.45 0 0.55 1" keyPoints="0;1" keyTimes="0;1">
            <mpath href="#journey_route" />
          </animateMotion>
          <animate attributeName="r" values="6;8.5;6" dur="1.2s" repeatCount="indefinite" />
        </circle>
      </g>
    </svg>
  );
}
