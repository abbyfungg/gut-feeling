"use client";
import { useState } from "react";
import { Icon } from "./Icon";

export function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const signup = mode === "signup";
  return (
    <form
      className="mk-form"
      aria-busy={busy}
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
      {signup && (
        <div className="field">
          <label htmlFor="name">What should we call you?</label>
          <input id="name" name="name" type="text" autoComplete="given-name" required maxLength={60} />
        </div>
      )}
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" inputMode="email" spellCheck={false} required />
      </div>
      <div className="field">
        <label htmlFor="password">
          Password {signup && <span className="label-hint">(10+ characters)</span>}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={signup ? "new-password" : "current-password"}
          required
          minLength={signup ? 10 : 1}
        />
      </div>
      {error && (
        <p className="form-error" role="alert">
          <Icon name="alert" size={18} />
          <span>{error}</span>
        </p>
      )}
      <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={busy}>
        {busy && <span className="spinner" aria-hidden />}
        {signup ? "Create my private diary" : "Sign in"}
      </button>
    </form>
  );
}
