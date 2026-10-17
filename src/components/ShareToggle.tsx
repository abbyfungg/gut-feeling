"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ShareToggle({ practitionerId, name, active }: { practitionerId: string; name: string; active: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(active);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div style={{ textAlign: "right" }}>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={`Share my diary with ${name}`}
        className="toggle"
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
          } else setError("Didn't save. Try again?");
          setBusy(false);
        }}
      />
      <div className="hint" aria-live="polite">
        {on ? "Sharing" : "Not sharing"}
      </div>
      {error && (
        <div className="hint" role="alert" style={{ color: "var(--high)" }}>
          {error}
        </div>
      )}
    </div>
  );
}
