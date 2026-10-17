"use client";
import { useState } from "react";
import { Icon } from "./Icon";

type Draft = {
  model: string;
  generatedAt: string;
  overview: string;
  flags: { flagKey: string; explanation: string; citedEntryIds: string[]; suggestedFollowUp: string }[];
  questionsToAsk: string[];
  rejected: number;
};

export function AiSummary({ patientId, enabled, flagTitles, entryLabels }: { patientId: string; enabled: boolean; flagTitles: Record<string, string>; entryLabels: Record<string, string> }) {
  const [state, setState] = useState<{ kind: "idle" } | { kind: "busy" } | { kind: "ok"; draft: Draft } | { kind: "error"; message: string }>({ kind: "idle" });
  const header = (
    <div className="row" style={{ gap: 12 }}>
      <span className="insight-icon" style={{ background: "var(--surface)", color: "var(--lavender-strong)" }} aria-hidden>
        <Icon name="sparkle" size={20} />
      </span>
      <div className="grow">
        <h2 style={{ fontSize: "var(--t-lg)" }}>Handoff summary</h2>
        <p className="tiny faint">AI draft · explains the rule flags, never decides them</p>
      </div>
      <span className="pill pill-lav">AI</span>
    </div>
  );
  if (!enabled)
    return (
      <div className="stack">
        {header}
        <p className="small muted">AI drafting is off on this server (no API key). The rule flags are complete on their own.</p>
      </div>
    );
  return (
    <div className="stack">
      {header}
      <button
        className={`btn ${state.kind === "ok" ? "btn-secondary" : "btn-primary"} btn-block`}
        disabled={state.kind === "busy"}
        onClick={async () => {
          setState({ kind: "busy" });
          const res = await fetch(`/api/care/patients/${encodeURIComponent(patientId)}/summary`, { method: "POST" }).catch(() => null);
          const body = res ? await res.json().catch(() => ({})) : {};
          if (res?.ok && body.draft) setState({ kind: "ok", draft: body.draft });
          else setState({ kind: "error", message: body.message ?? body.error ?? "Couldn't reach the server." });
        }}
      >
        {state.kind === "busy" ? <span className="spinner" aria-hidden /> : <Icon name="sparkle" />}
        {state.kind === "ok" ? "Redraft with Gemini" : "Draft with Gemini"}
      </button>
      <div aria-live="polite">
        {state.kind === "error" && <p className="notice notice-info">{state.message}</p>}
        {state.kind === "ok" && (
          <div className="ai-draft stack">
            <div className="row between wrap">
              <strong className="small">AI draft · check before using</strong>
              <span className="pill pill-lav">{state.draft.model}</span>
            </div>
            <p className="small">{state.draft.overview}</p>
            {state.draft.flags.map((f) => (
              <div key={f.flagKey} className="stack-sm">
                <strong className="small">{flagTitles[f.flagKey] ?? f.flagKey}</strong>
                <p className="small muted">{f.explanation}</p>
                <div className="evidence-list">
                  {f.citedEntryIds.map((id) => (
                    <a key={id} className="evidence-chip" href={`#entry-${id}`}>
                      {entryLabels[id] ?? id}
                    </a>
                  ))}
                </div>
                {f.suggestedFollowUp && <p className="tiny faint">Suggested: {f.suggestedFollowUp}</p>}
              </div>
            ))}
            {state.draft.questionsToAsk.length > 0 && (
              <div className="stack-sm">
                <strong className="small">Questions to ask</strong>
                <ul className="small" style={{ paddingLeft: 18 }}>
                  {state.draft.questionsToAsk.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              </div>
            )}
            {state.draft.rejected > 0 && <p className="tiny faint">{state.draft.rejected} part(s) dropped for citing entries or flags that don&apos;t exist.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
