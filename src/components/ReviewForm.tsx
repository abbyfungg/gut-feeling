"use client";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { REVIEW_DECISIONS, type ReviewDecision } from "@/lib/domain";

/** Practitioner records a decision. Suggested follow-up text is a draft they must accept or edit. */
export function ReviewForm({ patientId, flagKey, suggestion, onDone }: { patientId: string; flagKey: string; suggestion: string; onDone?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const [decision, setDecision] = useState<ReviewDecision | "">("");
  const [note, setNote] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [source, setSource] = useState<"none" | "rule_template" | "gemini_draft">("none");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const needsFollowUp = REVIEW_DECISIONS.find((d) => d.id === decision)?.followUp ?? false;
  const id = flagKey.replace(/[^a-zA-Z0-9]/g, "");

  return (
    <form
      className="stack"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!decision) return setError("Choose a decision first.");
        setBusy(true);
        setError(null);
        const res = await fetch(`/api/care/patients/${encodeURIComponent(patientId)}/reviews`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ flagKey, decision, note, followUp: needsFollowUp ? followUp : "", suggestionSource: needsFollowUp ? source : "none" }),
        }).catch(() => null);
        const body = res ? await res.json().catch(() => ({})) : {};
        if (res?.ok) {
          onDone?.();
          router.replace(`${pathname}?saved=${encodeURIComponent(flagKey)}`, { scroll: true });
          router.refresh();
        } else {
          setError(body.error ?? "Couldn't save the review.");
          setBusy(false);
        }
      }}
    >
      <div className="field">
        <label htmlFor={`d-${id}`}>Decision</label>
        <select id={`d-${id}`} value={decision} onChange={(e) => setDecision(e.target.value as ReviewDecision)} required>
          <option value="">Choose…</option>
          {REVIEW_DECISIONS.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </select>
      </div>
      {needsFollowUp && (
        <div className="field">
          <label htmlFor={`f-${id}`}>Follow-up</label>
          <textarea id={`f-${id}`} value={followUp} onChange={(e) => { setFollowUp(e.target.value); if (source === "rule_template" && e.target.value !== suggestion) setSource("none"); }} maxLength={500} style={{ minHeight: 70 }} />
          {suggestion && followUp !== suggestion && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setFollowUp(suggestion);
                setSource("rule_template");
              }}
            >
              Use suggested follow-up
            </button>
          )}
          {source === "rule_template" && <p className="hint">Suggested from the rule template. Edit it to fit your judgement and protocol.</p>}
        </div>
      )}
      <div className="field">
        <label htmlFor={`n-${id}`}>
          Note <span className="hint">(optional)</span>
        </label>
        <textarea id={`n-${id}`} value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} style={{ minHeight: 70 }} placeholder="What you checked or decided" />
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div>
        <button className="btn btn-green" type="submit" disabled={busy}>
          {busy && <span className="spinner" aria-hidden />}
          Save review
        </button>
      </div>
    </form>
  );
}
