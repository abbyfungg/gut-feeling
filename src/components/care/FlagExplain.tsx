"use client";
import { useState } from "react";
import { Icon } from "@/components/Icon";

type Explanation = { model: string; explanation: string; signals: { entryId: string; why: string }[]; worthChecking: string };
type State = { kind: "idle" } | { kind: "busy" } | { kind: "ok"; data: Explanation } | { kind: "note"; message: string };

/** "Why was this flagged?" On request, Gemini explains the rule firing in plain words, citing real entries. */
export function FlagExplain({ patientId, flagKey, labels, hrefFor }: { patientId: string; flagKey: string; labels: Record<string, string>; hrefFor: Record<string, string> }) {
  const [state, setState] = useState<State>({ kind: "idle" });
  async function run() {
    setState({ kind: "busy" });
    const res = await fetch(`/api/care/patients/${encodeURIComponent(patientId)}/explain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flagKey }),
    }).catch(() => null);
    if (!res) return setState({ kind: "note", message: "You're offline, so Gemini couldn't be reached." });
    const body = await res.json().catch(() => ({}));
    if (res.ok && body.status === "ok") return setState({ kind: "ok", data: body.explanation });
    setState({ kind: "note", message: body.message ?? body.error ?? "Gemini couldn't explain this one just now." });
  }
  return (
    <div className="flag-explain" aria-live="polite">
      {state.kind === "idle" && (
        <button type="button" className="btn btn-secondary btn-sm" onClick={run}>
          <Icon name="sparkle" size={15} /> Why was this flagged? Ask Gemini
        </button>
      )}
      {state.kind === "busy" && (
        <p className="row small muted" style={{ gap: 8, margin: 0 }}>
          <span className="spinner" /> Gemini is reading the evidence…
        </p>
      )}
      {state.kind === "note" && (
        <p className="small muted" style={{ margin: 0 }}>
          {state.message}{" "}
          <button type="button" className="link-btn small" onClick={run}>
            Try again
          </button>
        </p>
      )}
      {state.kind === "ok" && (
        <div className="flag-explain-box">
          <div className="row between wrap" style={{ gap: 8 }}>
            <span className="badge badge-ai">
              <Icon name="sparkle" /> AI explanation · needs clinician review
            </span>
            <span className="tiny faint">{state.data.model}</span>
          </div>
          <p>{state.data.explanation}</p>
          {state.data.signals.length > 0 && (
            <ul>
              {state.data.signals.map((s) => (
                <li key={s.entryId}>
                  <a href={hrefFor[s.entryId] ?? `#entry-${s.entryId}`} className="evidence-chip">
                    {labels[s.entryId] ?? "Entry"}
                  </a>{" "}
                  {s.why}
                </li>
              ))}
            </ul>
          )}
          {state.data.worthChecking && (
            <p className="small">
              <span className="strong">Worth checking: </span>
              {state.data.worthChecking}
            </p>
          )}
          <p className="tiny faint">Generated from patient-reported entries. Not a diagnosis. Nothing here is saved to the record.</p>
        </div>
      )}
    </div>
  );
}
