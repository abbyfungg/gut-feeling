"use client";
import { useState } from "react";
import { GUT_FACTS } from "@/lib/facts";
import { Icon } from "./Icon";
import { Womby } from "./Womby";
import type { WombyPose } from "@/lib/womby";

/** Womby shares a gut fact in a speech bubble. The first fact is picked on the server so markup matches. */
export function WombyFact({ start, pose = "encouraging", compact = false, showMascot = true }: { start: number; pose?: WombyPose; compact?: boolean; showMascot?: boolean }) {
  const [i, setI] = useState(start % GUT_FACTS.length);
  return (
    <section className={`womby-fact${compact ? " compact" : ""}`} aria-label="Gut fact from Womby">
      {showMascot && (
        <span className="womby-fact-mascot">
          <Womby pose={pose} size={compact ? 52 : 64} />
        </span>
      )}
      <div className="womby-fact-bubble">
        <div className="womby-fact-head">
          <span className="eyebrow">Womby&apos;s gut fact</span>
          <button type="button" className="link-btn small" onClick={() => setI((n) => (n + 1) % GUT_FACTS.length)} aria-label="Show another gut fact">
            Another <Icon name="arrow" size={14} />
          </button>
        </div>
        <p aria-live="polite">{GUT_FACTS[i]}</p>
      </div>
    </section>
  );
}
