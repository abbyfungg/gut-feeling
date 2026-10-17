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
  if (!enabled)
    return (
      <p className="hint" style={{ margin: 0 }}>
        Gemini drafting is off on this server (no API key configured). The rule explanations below are complete on their own.
      </p>
    );
  return (
    <div className="stack">
      <div className="row">
        <button
          className="btn btn-soft"
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
          {state.kind === "ok" ? "Redraft with Gemini" : "Draft a handoff summary with Gemini"}
        </button>
        <span className="hint">Draft only. Gemini explains the rule flags; it doesn&apos;t decide them.</span>
      </div>
      <div aria-live="polite">
        {state.kind === "error" && <p className="notice notice-info">{state.message}</p>}
        {state.kind === "ok" && (
          <div className="ai-draft stack">
            <div className="row between">
              <strong>AI draft · review before using</strong>
              <span className="pill pill-lav">{state.draft.model}</span>
            </div>
            <p style={{ margin: 0 }}>{state.draft.overview}</p>
            {state.draft.flags.map((f) => (
              <div key={f.flagKey}>
                <strong>{flagTitles[f.flagKey] ?? f.flagKey}</strong>
                <p style={{ margin: "2px 0" }}>{f.explanation}</p>
                <div className="evidence-list" style={{ marginBottom: 4 }}>
                  {f.citedEntryIds.map((id) => (
                    <a key={id} className="evidence-chip" href={`#entry-${id}`}>
                      {entryLabels[id] ?? id}
                    </a>
                  ))}
                </div>
                {f.suggestedFollowUp && <p className="hint" style={{ margin: 0 }}>Suggested: {f.suggestedFollowUp}</p>}
              </div>
            ))}
            {state.draft.questionsToAsk.length > 0 && (
              <div>
                <strong>Questions to ask</strong>
                <ul style={{ margin: "4px 0 0" }}>
                  {state.draft.questionsToAsk.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              </div>
            )}
            {state.draft.rejected > 0 && <p className="hint" style={{ margin: 0 }}>{state.draft.rejected} part(s) of the draft were dropped because they cited entries or flags that don&apos;t exist.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
