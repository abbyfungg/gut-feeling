"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "./Icon";

/** Explicit "no movement today" check-in, so a quiet day is recorded as confirmed rather than unknown. Renders as a home tile. */
export function NoMovementButton({ alreadyLoggedToday, alreadyConfirmed = false }: { alreadyLoggedToday: boolean; alreadyConfirmed?: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">(alreadyConfirmed ? "done" : "idle");
  if (state === "done")
    return (
      <div className="tile tint-sage" role="status">
        <span className="tile-icon">
          <Icon name="check" />
        </span>
        <span>
          <span className="tile-label" style={{ display: "block" }}>
            Quiet day noted
          </span>
          <span className="tile-sub">Quiet days count too</span>
        </span>
      </div>
    );
  return (
    <button
      className="tile tint-sky"
      disabled={state === "busy"}
      onClick={async () => {
        setState("busy");
        const res = await fetch("/api/entries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: "no_movement", occurredAt: new Date().toISOString(), notes: null }),
        }).catch(() => null);
        if (res?.ok) {
          setState("done");
          router.refresh();
        } else setState("error");
      }}
    >
      <span className="tile-icon">{state === "busy" ? <span className="spinner" aria-hidden /> : <Icon name="moon" />}</span>
      <span>
        <span className="tile-label" style={{ display: "block" }}>
          No movement today
        </span>
        <span className="tile-sub" role={state === "error" ? "alert" : undefined}>
          {state === "error" ? "Didn't save. Tap to retry" : alreadyLoggedToday ? "You already logged one" : "One tap check-in"}
        </span>
      </span>
    </button>
  );
}
