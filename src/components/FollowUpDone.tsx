"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "./Icon";

export function FollowUpDone({ reviewId }: { reviewId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="row-2" style={{ display: "inline-flex", flexWrap: "wrap" }}>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          const res = await fetch(`/api/care/followups/${encodeURIComponent(reviewId)}`, { method: "POST" }).catch(() => null);
          if (res?.ok) router.refresh();
          else {
            const body = res ? await res.json().catch(() => ({})) : {};
            setError(res ? (body.error ?? "Didn't save. Try again.") : "Offline. Didn't save.");
            setBusy(false);
          }
        }}
      >
        {busy ? <span className="spinner" aria-hidden style={{ width: 14, height: 14 }} /> : <Icon name="check" size={14} />}
        Mark follow-up done
      </button>
      {error && (
        <span className="tiny" role="alert" style={{ color: "var(--danger)" }}>
          {error}
        </span>
      )}
    </span>
  );
}
