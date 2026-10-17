"use client";
import { useEffect, useState } from "react";

const COLORS = ["#f6cf5d", "#fbd6dc", "#d5ecdb", "#e7defb", "#ffd5bd"];

/** A small, one-off burst of confetti. Hidden from assistive tech and disabled for reduced motion via CSS. */
export function Confetti() {
  const [pieces, setPieces] = useState<{ left: number; delay: number; color: string }[]>([]);
  useEffect(() => {
    setPieces(Array.from({ length: 26 }, (_, i) => ({ left: Math.random() * 100, delay: Math.random() * 0.5, color: COLORS[i % COLORS.length] })));
  }, []);
  return (
    <div className="confetti" aria-hidden>
      {pieces.map((p, i) => (
        <span key={i} style={{ left: `${p.left}%`, animationDelay: `${p.delay}s`, background: p.color }} />
      ))}
    </div>
  );
}
