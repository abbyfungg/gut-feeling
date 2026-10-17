"use client";
import { useState } from "react";

export function DemoSignIn({ accounts, password }: { accounts: { label: string; sub: string; email: string; kind: "patient" | "care" }[]; password: string }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="stack">
      <div className="row">
        {accounts.map((a) => (
          <button
            key={a.email}
            className={`btn ${a.kind === "patient" ? "btn-sun" : "btn-soft"}`}
            disabled={busy !== null}
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
                setError(body.error ?? "Couldn't sign in. Is the server running?");
                setBusy(null);
              }
            }}
          >
            {busy === a.email ? <span className="spinner" aria-hidden /> : null}
            <span>
              {a.label}
              <span className="visually-hidden"> ({a.sub})</span>
            </span>
          </button>
        ))}
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
