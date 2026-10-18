"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "./Icon";

/** Explicit "no movement today" check-in, so a quiet day is recorded as confirmed rather than unknown. */
export function NoMovementButton({ alreadyLoggedToday, alreadyConfirmed = false }: { alreadyLoggedToday: boolean; alreadyConfirmed?: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">(alreadyConfirmed ? "done" : "idle");
  if (state === "done")
    return (
      <p className="row-2 small muted" role="status" style={{ justifyContent: "center", minHeight: 44 }}>
        <Icon name="checkCircle" size={18} /> Quiet day noted. Those count too.
      </p>
    );
  if (alreadyLoggedToday) return null;
  return (
    <div className="stack-1" style={{ alignItems: "center" }}>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
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
        {state === "busy" ? <span className="spinner" aria-hidden /> : <Icon name="moon" size={18} />}
        No movement today
      </button>
      {state === "error" && (
        <p className="tiny" role="alert" style={{ color: "var(--danger)" }}>
          That didn&apos;t save. Check your connection and try again.
        </p>
      )}
    </div>
  );
}
