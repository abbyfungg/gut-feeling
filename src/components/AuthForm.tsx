"use client";
import { useState } from "react";

export function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="stack"
      onSubmit={async (ev) => {
        ev.preventDefault();
        setBusy(true);
        setError(null);
        const data = Object.fromEntries(new FormData(ev.currentTarget));
        const res = await fetch(`/api/auth/${mode}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }).catch(() => null);
        const body = res ? await res.json().catch(() => ({})) : {};
        if (res?.ok && body.redirect) {
          window.location.href = body.redirect;
          return;
        }
        setError(body.error ?? "We couldn't reach the server. Check your connection and try again.");
        setBusy(false);
      }}
    >
      {mode === "signup" && (
        <div className="field">
          <label htmlFor="name">What should we call you?</label>
          <input id="name" name="name" type="text" autoComplete="given-name" required maxLength={60} />
        </div>
      )}
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="field">
        <label htmlFor="password">
          Password {mode === "signup" && <span className="hint">(at least 10 characters)</span>}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          required
          minLength={mode === "signup" ? 10 : 1}
        />
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="btn btn-primary btn-big" type="submit" disabled={busy} style={{ width: "100%" }}>
        {busy && <span className="spinner" aria-hidden />}
        {mode === "signin" ? "Sign in" : "Create my private diary"}
      </button>
    </form>
  );
}
