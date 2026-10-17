"use client";
import { useState } from "react";
import { Icon } from "./Icon";

export function SignOutButton() {
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="btn btn-ghost btn-sm"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/auth/signout", { method: "POST" }).catch(() => null);
        window.location.href = "/";
      }}
    >
      <Icon name="out" size={18} /> Sign out
    </button>
  );
}
