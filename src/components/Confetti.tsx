const COLORS = ["#f6cf5d", "#fbd6dc", "#d5ecdb", "#e7defb", "#ffd5bd"];
// Deterministic layout so server and client render the same thing.
const PIECES = Array.from({ length: 26 }, (_, i) => ({ left: (i * 37 + 11) % 100, delay: ((i * 7) % 10) / 20, color: COLORS[i % COLORS.length] }));

/** A small, one-off burst of confetti. Hidden from assistive tech and disabled for reduced motion via CSS. */
export function Confetti() {
  return (
    <div className="confetti" aria-hidden>
      {PIECES.map((p, i) => (
        <span key={i} style={{ left: `${p.left}%`, animationDelay: `${p.delay}s`, background: p.color }} />
      ))}
    </div>
  );
}
