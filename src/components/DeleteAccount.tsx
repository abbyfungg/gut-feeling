"use client";
import { useState } from "react";

export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!open)
    return (
      <button className="btn btn-danger" onClick={() => setOpen(true)}>
        Delete my account and diary
      </button>
    );
  return (
    <div className="stack">
      <label htmlFor="confirm-delete">
        This permanently deletes your account, every entry, your sharing settings and any reviews. Type <span className="kbd">DELETE</span> to confirm.
      </label>
      <input id="confirm-delete" type="text" value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" />
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="row">
        <button
          className="btn btn-danger"
          disabled={text !== "DELETE" || busy}
          onClick={async () => {
            setBusy(true);
            const res = await fetch("/api/account", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ confirm: text }),
            }).catch(() => null);
            if (res?.ok) window.location.href = "/";
            else {
              setError("Couldn't delete right now. Try again.");
              setBusy(false);
            }
          }}
        >
          Permanently delete
        </button>
        <button className="btn btn-ghost" onClick={() => setOpen(false)}>
          Never mind
        </button>
      </div>
    </div>
  );
}
