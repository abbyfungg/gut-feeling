"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "./Icon";

export function DeleteEntryButton({ id }: { id: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!confirming)
    return (
      <button className="btn btn-ghost btn-sm" onClick={() => setConfirming(true)} aria-label="Delete this entry">
        <Icon name="trash" size={16} />
      </button>
    );
  return (
    <div className="row" style={{ gap: 6 }}>
      <button
        className="btn btn-danger btn-sm"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const res = await fetch(`/api/entries/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => null);
          if (res?.ok) router.refresh();
          else {
            setError("Couldn't delete");
            setBusy(false);
          }
        }}
      >
        Delete for good
      </button>
      <button className="btn btn-ghost btn-sm" onClick={() => setConfirming(false)}>
        Keep
      </button>
      {error && <span role="alert" className="hint">{error}</span>}
    </div>
  );
}
