export type MascotMood = "happy" | "wave" | "celebrate" | "think" | "sleepy" | "calm";

/**
 * Pip: a small, well-meaning swirl who is quietly proud of you for checking in.
 * Decorative by default; pass a label when the mascot carries meaning.
 */
export function Mascot({ mood = "happy", size = 120, label, bob = true }: { mood?: MascotMood; size?: number; label?: string; bob?: boolean }) {
  const body = "#b67b4f";
  const light = "#d29d6e";
  const line = "#7c4d2d";
  const eyesClosed = mood === "sleepy";
  return (
    <svg
      className={`mascot${bob && mood !== "calm" ? " bob" : ""}`}
      width={size}
      height={size}
      viewBox="0 0 140 140"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {/* shadow */}
      <ellipse cx="70" cy="128" rx="44" ry="6" fill="#000" opacity="0.08" />
      {/* arms behind */}
      {mood === "celebrate" && (
        <g stroke={line} strokeWidth="3" fill={body} strokeLinecap="round">
          <path d="M28 86 C14 74 12 60 16 52" fill="none" strokeWidth="9" stroke={line} />
          <path d="M28 86 C14 74 12 60 16 52" fill="none" strokeWidth="5" stroke={body} />
          <path d="M112 86 C126 74 128 60 124 52" fill="none" strokeWidth="9" stroke={line} />
          <path d="M112 86 C126 74 128 60 124 52" fill="none" strokeWidth="5" stroke={body} />
        </g>
      )}
      {mood === "wave" && (
        <g className="wave-arm">
          <path d="M110 92 C124 84 130 70 128 58" fill="none" strokeWidth="9" stroke={line} strokeLinecap="round" />
          <path d="M110 92 C124 84 130 70 128 58" fill="none" strokeWidth="5" stroke={body} strokeLinecap="round" />
        </g>
      )}
      {/* swirl body */}
      <g stroke={line} strokeWidth="3" strokeLinejoin="round">
        <path d="M18 104 C14 88 26 78 40 78 L100 78 C116 78 126 90 122 104 C120 116 108 122 96 122 L44 122 C30 122 20 116 18 104 Z" fill={body} />
        <path d="M30 78 C26 64 38 54 50 54 L90 54 C104 54 112 66 108 78 Z" fill={body} />
        <path d="M44 56 C40 44 50 34 62 34 C74 34 82 40 84 46 C86 52 82 56 80 56 Z" fill={body} />
        <path d="M62 34 C60 24 68 16 76 18 C72 22 72 28 76 30" fill={body} />
      </g>
      {/* highlights */}
      <path d="M34 92 C40 86 52 84 60 85" stroke={light} strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M44 66 C50 61 58 60 64 61" stroke={light} strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M54 44 C57 41 61 40 64 40" stroke={light} strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* cheeks */}
      <ellipse cx="44" cy="104" rx="8" ry="5" fill="#f39aa3" opacity="0.75" />
      <ellipse cx="96" cy="104" rx="8" ry="5" fill="#f39aa3" opacity="0.75" />
      {/* eyes */}
      {eyesClosed ? (
        <g stroke={line} strokeWidth="3.5" fill="none" strokeLinecap="round">
          <path d="M50 96 q6 5 12 0" />
          <path d="M78 96 q6 5 12 0" />
        </g>
      ) : mood === "celebrate" ? (
        <g stroke="#2d2420" strokeWidth="4" fill="none" strokeLinecap="round">
          <path d="M50 98 q6 -8 12 0" />
          <path d="M78 98 q6 -8 12 0" />
        </g>
      ) : (
        <g className="blink">
          <ellipse cx="56" cy={mood === "think" ? 93 : 96} rx="6" ry="7.5" fill="#2d2420" />
          <ellipse cx="84" cy={mood === "think" ? 93 : 96} rx="6" ry="7.5" fill="#2d2420" />
          <circle cx="58" cy={mood === "think" ? 90 : 93} r="2.2" fill="#fff" />
          <circle cx="86" cy={mood === "think" ? 90 : 93} r="2.2" fill="#fff" />
        </g>
      )}
      {/* mouth */}
      {mood === "celebrate" ? (
        <path d="M60 106 q10 14 20 0 Z" fill="#7a2a2a" stroke="#2d2420" strokeWidth="2.5" strokeLinejoin="round" />
      ) : mood === "think" ? (
        <path d="M65 110 q5 -3 10 0" stroke="#2d2420" strokeWidth="3" fill="none" strokeLinecap="round" />
      ) : mood === "sleepy" ? (
        <ellipse cx="70" cy="110" rx="3.5" ry="3" fill="#2d2420" />
      ) : mood === "calm" ? (
        <path d="M63 108 q7 5 14 0" stroke="#2d2420" strokeWidth="3" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M60 106 q10 10 20 0" stroke="#2d2420" strokeWidth="3.2" fill="none" strokeLinecap="round" />
      )}
      {/* extras */}
      {mood === "celebrate" && (
        <g fill="#f6cf5d" stroke="#c99b22" strokeWidth="1.5">
          <path d="M14 30 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 Z" />
          <path d="M118 20 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 Z" />
          <circle cx="104" cy="44" r="3" fill="#fbd6dc" stroke="#e79aa6" />
          <circle cx="30" cy="54" r="3" fill="#d5ecdb" stroke="#7bbf91" />
        </g>
      )}
      {mood === "think" && (
        <text x="104" y="40" fontSize="26" fontFamily="var(--font-display)" fill="#5f45ad" fontWeight="700">
          ?
        </text>
      )}
      {mood === "sleepy" && (
        <text x="100" y="40" fontSize="18" fontFamily="var(--font-display)" fill="#5f45ad" fontWeight="700">
          z<tspan dy="-8" fontSize="14">z</tspan>
        </text>
      )}
    </svg>
  );
}
