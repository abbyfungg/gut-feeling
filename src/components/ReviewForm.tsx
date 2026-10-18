"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { REVIEW_DECISIONS, type ReviewDecision } from "@/lib/domain";
import { Icon } from "./Icon";

/** Practitioner records a decision. Suggested follow-up text is a draft they must accept or edit. */
export function ReviewForm({ patientId, flagKey, suggestion, onDone }: { patientId: string; flagKey: string; suggestion: string; onDone?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
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
      className="review-form"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        if (!decision) return setError("Choose a decision first.");
        if (needsFollowUp && !followUp.trim()) return setError("Add a short follow-up so the next person knows what to do.");
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
          const next = new URLSearchParams();
          const tab = params.get("tab");
          if (tab) next.set("tab", tab);
          next.set("saved", flagKey);
          router.replace(`${pathname}?${next.toString()}`, { scroll: true });
          router.refresh();
        } else {
          setError(res ? (body.error ?? "Couldn't save the review. Please try again.") : "You appear to be offline. The review wasn't saved.");
          setBusy(false);
        }
      }}
    >
      <div className="field">
        <label htmlFor={`d-${id}`}>Decision</label>
        <select id={`d-${id}`} value={decision} onChange={(e) => setDecision(e.target.value as ReviewDecision)} required aria-describedby={error ? `err-${id}` : undefined}>
          <option value="">Choose…</option>
          {REVIEW_DECISIONS.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </select>
      </div>
      <div className="field" style={{ justifyContent: "flex-end" }}>
        <p className="help">{needsFollowUp ? "This decision adds a follow-up task to the team list." : "Decisions that need action add a follow-up task."}</p>
      </div>
      {needsFollowUp && (
        <div className="field full">
          <label htmlFor={`f-${id}`}>Follow-up</label>
          <textarea
            id={`f-${id}`}
            value={followUp}
            onChange={(e) => {
              setFollowUp(e.target.value);
              if (source === "rule_template" && e.target.value !== suggestion) setSource("none");
            }}
            maxLength={500}
            placeholder="Who does what, and by when"
          />
          <div className="row wrap" style={{ gap: 8 }}>
            {suggestion && followUp !== suggestion && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setFollowUp(suggestion);
                  setSource("rule_template");
                }}
              >
                <Icon name="clipboard" size={14} />
                Use suggested follow-up
              </button>
            )}
            {source === "rule_template" && (
              <span className="src-line">
                <span className="badge badge-rule">
                  <Icon name="flag" /> Rule template
                </span>
                Edit to fit your judgement.
              </span>
            )}
          </div>
        </div>
      )}
      <div className="field full">
        <label htmlFor={`n-${id}`}>
          Note <span className="faint" style={{ fontWeight: 500 }}>(optional)</span>
        </label>
        <textarea id={`n-${id}`} value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} placeholder="What you checked or decided" />
      </div>
      {error && (
        <p id={`err-${id}`} className="form-error full" role="alert">
          <Icon name="alert" size={16} />
          {error}
        </p>
      )}
      <div className="full row" style={{ gap: 8 }}>
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? <span className="spinner" aria-hidden /> : <Icon name="check" size={16} />}
          Save review
        </button>
        <span className="tiny faint">Saved with your name and the time.</span>
      </div>
    </form>
  );
}
