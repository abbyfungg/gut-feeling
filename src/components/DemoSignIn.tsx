"use client";
import { useState } from "react";
import { Avatar } from "./Avatar";
import { Icon } from "./Icon";

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
    <div className="stack">
      <div className={stacked ? "stack-sm" : "row wrap"}>
        {accounts.map((a) => (
          <button
            key={a.email}
            className={`btn ${a.kind === "patient" ? "btn-primary" : "btn-secondary"}${stacked ? " btn-block" : ""}`}
            style={{ height: "auto", minHeight: 56, padding: "8px 18px 8px 8px", justifyContent: "flex-start", textAlign: "left", gap: 12 }}
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
            {busy === a.email ? (
              <span className="avatar sm" aria-hidden style={{ background: "var(--surface-2)", color: "var(--ink)" }}>
                <span className="spinner" />
              </span>
            ) : (
              <Avatar name={a.label.replace(/^I'm\s+/, "")} size="sm" />
            )}
            <span className="grow" style={{ lineHeight: 1.2 }}>
              <span style={{ display: "block" }}>{a.label}</span>
              <span className="tiny" style={{ display: "block", fontWeight: 600, opacity: 0.65 }}>
                <span className="visually-hidden">(</span>
                {a.sub}
                <span className="visually-hidden">)</span>
              </span>
            </span>
            <Icon name="arrow" size={16} />
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
