"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function FollowUpDone({ reviewId }: { reviewId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  return (
    <span>
      <button
        className="btn btn-soft btn-sm"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const res = await fetch(`/api/care/followups/${encodeURIComponent(reviewId)}`, { method: "POST" }).catch(() => null);
          if (res?.ok) router.refresh();
          else {
            setError(true);
            setBusy(false);
          }
        }}
      >
        {busy && <span className="spinner" aria-hidden />}
        Mark follow-up done
      </button>
      {error && (
        <span className="hint" role="alert">
          {" "}
          Didn&apos;t save.
        </span>
      )}
    </span>
  );
}
