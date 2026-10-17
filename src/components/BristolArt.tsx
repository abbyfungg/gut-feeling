/** Small, friendly, abstract illustrations of the Bristol Stool Form Scale. Decorative; the text label carries meaning. */
export function BristolArt({ type, size = 64 }: { type: number; size?: number }) {
  const fill = "#b67b4f";
  const dark = "#7c4d2d";
  const h = size * 0.5;
  const common = { width: size, height: h, viewBox: "0 0 80 40", "aria-hidden": true as const };
  switch (type) {
    case 1:
      return (
        <svg {...common}>
          <g fill={fill} stroke={dark} strokeWidth="1.5">
            <circle cx="14" cy="24" r="6" />
            <circle cx="30" cy="16" r="5" />
            <circle cx="44" cy="26" r="6.5" />
            <circle cx="58" cy="15" r="5" />
            <circle cx="68" cy="27" r="4.5" />
          </g>
        </svg>
      );
    case 2:
      return (
        <svg {...common}>
          <g fill={fill} stroke={dark} strokeWidth="1.5">
            <circle cx="16" cy="22" r="8" />
            <circle cx="28" cy="18" r="9" />
            <circle cx="41" cy="22" r="9" />
            <circle cx="54" cy="18" r="9" />
            <circle cx="65" cy="22" r="8" />
          </g>
        </svg>
      );
    case 3:
      return (
        <svg {...common}>
          <rect x="8" y="11" width="64" height="20" rx="10" fill={fill} stroke={dark} strokeWidth="1.5" />
          <g stroke={dark} strokeWidth="1.6" strokeLinecap="round">
            <path d="M22 13 l3 6" />
            <path d="M34 29 l2 -5" />
            <path d="M46 13 l2 5" />
            <path d="M58 29 l3 -6" />
          </g>
        </svg>
      );
    case 4:
      return (
        <svg {...common}>
          <path d="M10 26 C22 8 34 32 46 18 C54 9 62 14 70 18" fill="none" stroke={dark} strokeWidth="13" strokeLinecap="round" />
          <path d="M10 26 C22 8 34 32 46 18 C54 9 62 14 70 18" fill="none" stroke={fill} strokeWidth="10" strokeLinecap="round" />
          <path d="M20 17 C24 14 28 15 30 17" stroke="#d29d6e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </svg>
      );
    case 5:
      return (
        <svg {...common}>
          <g fill={fill} stroke={dark} strokeWidth="1.5">
            <ellipse cx="18" cy="23" rx="11" ry="8" />
            <ellipse cx="41" cy="18" rx="11" ry="8" />
            <ellipse cx="63" cy="24" rx="11" ry="8" />
          </g>
        </svg>
      );
    case 6:
      return (
        <svg {...common}>
          <g fill="#c48e60" stroke={dark} strokeWidth="1.5" strokeLinejoin="round">
            <path d="M8 26 q3 -9 9 -6 q2 -7 8 -3 q5 -4 7 3 q6 1 4 7 q-2 6 -9 4 q-5 4 -10 0 q-8 2 -9 -5 Z" />
            <path d="M44 22 q4 -8 10 -4 q4 -6 9 0 q7 0 6 7 q0 7 -8 6 q-5 4 -10 0 q-8 0 -7 -9 Z" />
          </g>
        </svg>
      );
    case 7:
      return (
        <svg {...common}>
          <path d="M6 28 q8 -6 18 -2 q10 -6 20 -1 q12 -5 22 0 q8 2 8 6 q-10 5 -24 3 q-14 3 -26 0 q-14 2 -18 -6 Z" fill="#cfa077" stroke={dark} strokeWidth="1.5" />
          <g fill="#cfa077" stroke={dark} strokeWidth="1.2">
            <path d="M30 10 q3 5 0 7 q-3 -2 0 -7 Z" />
            <path d="M52 6 q3 5 0 7 q-3 -2 0 -7 Z" />
          </g>
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <text x="40" y="26" textAnchor="middle" fontSize="16" fill={dark} fontWeight="700">
            ?
          </text>
        </svg>
      );
  }
}
