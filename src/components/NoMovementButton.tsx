"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

/** Explicit "no movement today" check-in, so a quiet day is recorded as confirmed rather than unknown. */
export function NoMovementButton({ alreadyLoggedToday }: { alreadyLoggedToday: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  if (state === "done")
    return (
      <p className="notice notice-ok success-pop" role="status" style={{ margin: 0 }}>
        Noted: no movement today. Quiet days count too.
      </p>
    );
  return (
    <div>
      <button
        className="btn btn-soft"
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
        {state === "busy" && <span className="spinner" aria-hidden />}
        No movement today
      </button>
      {alreadyLoggedToday && <p className="hint" style={{ margin: "6px 0 0" }}>You&apos;ve already logged a movement today, so you probably don&apos;t need this.</p>}
      {state === "error" && (
        <p className="hint" role="alert">
          That didn&apos;t save. Try again?
        </p>
      )}
    </div>
  );
}
