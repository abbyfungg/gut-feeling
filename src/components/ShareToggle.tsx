"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ShareToggle({ practitionerId, name, active }: { practitionerId: string; name: string; active: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(active);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="stack-1" style={{ alignItems: "flex-end", flex: "none" }}>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={`Share my diary with ${name}`}
        className="switch"
        disabled={busy}
        onClick={async () => {
          const next = !on;
          setBusy(true);
          setError(null);
          const res = await fetch("/api/sharing", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ practitionerId, active: next }),
          }).catch(() => null);
          if (res?.ok) {
            setOn(next);
            router.refresh();
          } else setError(res ? "Didn't save. Try again?" : "You're offline.");
          setBusy(false);
        }}
      />
      <span className="tiny muted" aria-live="polite">
        {on ? "Sharing" : "Off"}
      </span>
      {error && (
        <span className="tiny" role="alert" style={{ color: "var(--danger)" }}>
          {error}
        </span>
      )}
    </div>
  );
}
