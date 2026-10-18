"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "./Icon";

export function DeleteEntryButton({ id, redirectTo }: { id: string; redirectTo?: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!confirming)
    return (
      <button type="button" className="btn btn-danger-ghost btn-sm" onClick={() => setConfirming(true)} style={{ alignSelf: "flex-start" }}>
        <Icon name="trash" size={16} /> Delete entry
      </button>
    );
  return (
    <div className="notice notice-alert" role="group" aria-label="Confirm delete" style={{ flexWrap: "wrap", alignItems: "center" }}>
      <span className="grow">Delete this entry for good?</span>
      <div className="row-2">
        <button
          type="button"
          className="btn btn-danger btn-sm"
          disabled={busy}
          aria-busy={busy}
          onClick={async () => {
            setBusy(true);
            setError(null);
            const res = await fetch(`/api/entries/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => null);
            if (res?.ok) {
              if (redirectTo) router.replace(redirectTo);
              router.refresh();
            } else {
              setError(res ? "Couldn't delete. Try again?" : "You seem to be offline. Try again when you're connected.");
              setBusy(false);
            }
          }}
        >
          {busy ? "Deleting…" : "Delete"}
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setConfirming(false)} disabled={busy}>
          Keep
        </button>
      </div>
      {error && (
        <span role="alert" className="small" style={{ width: "100%" }}>
          {error}
        </span>
      )}
    </div>
  );
}
