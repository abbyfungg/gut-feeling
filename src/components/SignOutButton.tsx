"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "./Icon";

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button" className="link-btn" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 600 }}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/auth/signout", { method: "POST" }).catch(() => null);
        router.replace("/");
        router.refresh();
      }}
    >
      <Icon name="out" size={18} /> {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
