"use client";
import { useState } from "react";
import { Icon } from "./Icon";

function initials(label: string): string {
  const parts = label
    .replace(/^I'm\s+/i, "")
    .replace(/^(Dr|Nurse)\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean);
  return parts.map((p) => p[0]).join("").slice(0, 2).toUpperCase() || "?";
}

/** One-tap sign-in for the fictional demo accounts. */
export function DemoSignIn({
  accounts,
  password,
  stacked = false,
}: {
  accounts: { label: string; sub: string; email: string; kind: "patient" | "care" }[];
  password: string;
  stacked?: boolean;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="stack-3">
      <div className={`mk-demo-list${stacked ? " stacked" : ""}`}>
        {accounts.map((a) => (
          <button
            key={a.email}
            type="button"
            className={`mk-demo-btn${busy === a.email ? " is-busy" : ""}`}
            disabled={busy !== null}
            aria-busy={busy === a.email}
            onClick={async () => {
              setBusy(a.email);
              setError(null);
              const res = await fetch("/api/auth/signin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: a.email, password }),
              }).catch(() => null);
              const body = res ? await res.json().catch(() => ({})) : {};
              if (res?.ok && body.redirect) window.location.href = body.redirect;
              else {
                setError(body.error ?? "Couldn't sign in to the demo. Is the server running?");
                setBusy(null);
              }
            }}
          >
            <span className={`mk-avatar ${a.kind}`} aria-hidden>
              {busy === a.email ? <span className="spinner" /> : initials(a.label)}
            </span>
            <span className="grow">
              <span className="mk-demo-name">{a.label}</span>
              <span className="mk-demo-sub">
                <span className="visually-hidden">(</span>
                {a.sub}
                <span className="visually-hidden">)</span>
              </span>
            </span>
            <Icon name="arrow" size={18} />
          </button>
        ))}
      </div>
      {error && (
        <p className="form-error" role="alert">
          <Icon name="alert" size={18} />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
