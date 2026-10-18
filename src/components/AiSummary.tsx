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

type State =
  | { kind: "idle" }
  | { kind: "busy" }
  | { kind: "ok"; draft: Draft }
  | { kind: "error"; title: string; message: string; retry: boolean };

const FAILURE_TITLES: Record<string, string> = {
  auth: "API key rejected",
  model_unavailable: "Model unavailable",
  quota: "Rate limit reached",
  timeout: "Timed out",
  invalid_response: "Draft discarded",
  blocked: "Draft discarded",
};

/**
 * Gemini handoff draft for the clinician. It explains the rule flags and cites real entries;
 * it never decides anything, and failures are shown as failures, never as a made-up summary.
 */
export function AiSummary({
  patientId,
  enabled,
  flagTitles,
  entryLabels,
  onPageIds = [],
  timelineHref,
  timeZone,
}: {
  patientId: string;
  enabled: boolean;
  flagTitles: Record<string, string>;
  entryLabels: Record<string, string>;
  /** Entry ids rendered on the current page; other citations link to the timeline tab. */
  onPageIds?: string[];
  timelineHref?: string;
  timeZone?: string;
}) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const onPage = new Set(onPageIds);
  const hrefFor = (id: string) => (onPage.has(id) || !timelineHref ? `#entry-${id}` : `${timelineHref}#entry-${id}`);

  async function run() {
    setState({ kind: "busy" });
    const res = await fetch(`/api/care/patients/${encodeURIComponent(patientId)}/summary`, { method: "POST" }).catch(() => null);
    if (!res) return setState({ kind: "error", title: "Can't reach the server", message: "Check your connection and try again. Nothing was drafted.", retry: true });
    const body = await res.json().catch(() => ({}));
    if (res.ok && body.draft) return setState({ kind: "ok", draft: body.draft });
    if (body.status === "unconfigured")
      return setState({ kind: "error", title: "Gemini isn't configured", message: body.message ?? "No API key on this server, so no AI draft is available.", retry: false });
    if (body.status === "failed")
      return setState({ kind: "error", title: FAILURE_TITLES[body.reason] ?? "Gemini didn't answer", message: body.message ?? "No draft was made.", retry: body.reason !== "auth" && body.reason !== "model_unavailable" });
    setState({ kind: "error", title: res.status === 429 ? "Too many drafts" : "Couldn't draft", message: body.error ?? body.message ?? "Something went wrong. Nothing was drafted.", retry: true });
  }

  return (
    <section className="panel c-ai" aria-labelledby="ai-h" id="handoff">
      <div className="panel-head">
        <h2 id="ai-h">
          <Icon name="sparkle" size={16} />
          Handoff summary
        </h2>
        <span className="badge badge-ai">AI draft · not a diagnosis</span>
      </div>
      <div className="panel-body stack-3" aria-live="polite" aria-busy={state.kind === "busy"}>
        {!enabled ? (
          <>
            <p className="small muted">
              AI drafting is off on this server because no Gemini API key is configured. Nothing is generated or simulated here. The rule-based flags and the timeline are complete on their own.
            </p>
          </>
        ) : state.kind === "idle" ? (
          <>
            <p className="small muted">Gemini drafts a short handoff that explains the open rule flags and cites the entries behind them. It never decides anything. Check it before you use it.</p>
            <button type="button" className="btn btn-secondary btn-block" onClick={run}>
              <Icon name="sparkle" size={16} />
              Draft with Gemini
            </button>
          </>
        ) : state.kind === "busy" ? (
          <div className="stack-2" role="status">
            <span className="row-2 small muted">
              <span className="spinner" aria-hidden style={{ width: 14, height: 14 }} />
              Drafting with Gemini. This can take up to 45 seconds.
            </span>
            <span className="skeleton" style={{ height: 12, width: "92%" }} />
            <span className="skeleton" style={{ height: 12, width: "78%" }} />
            <span className="skeleton" style={{ height: 12, width: "85%" }} />
          </div>
        ) : state.kind === "error" ? (
          <>
            <div className="notice notice-warn" role="alert">
              <Icon name="alert" size={16} />
              <span>
                <strong>{state.title}.</strong> {state.message}
              </span>
            </div>
            {state.retry && (
              <button type="button" className="btn btn-secondary btn-block" onClick={run}>
                Try again
              </button>
            )}
          </>
        ) : (
          <div className="ai-draft">
            <p className="ai-disclaimer">
              <Icon name="info" size={14} />
              <span>
                Generated by {state.draft.model} at{" "}
                {new Date(state.draft.generatedAt).toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit", timeZone })}. A draft explanation of rule flags, not a diagnosis. Check the cited entries.
              </span>
            </p>
            <p>{state.draft.overview}</p>
            {state.draft.flags.map((f) => (
              <div key={f.flagKey} className="stack-1">
                <h4>{flagTitles[f.flagKey] ?? "Flag"}</h4>
                <p className="muted">{f.explanation}</p>
                {f.citedEntryIds.length > 0 && (
                  <div className="evidence-list" aria-label="Cited entries">
                    {f.citedEntryIds.map((id) => (
                      <a key={id} className="evidence-chip" href={hrefFor(id)}>
                        {entryLabels[id] ?? "Entry"}
                      </a>
                    ))}
                  </div>
                )}
                {f.suggestedFollowUp && <p className="tiny faint">AI-suggested follow-up: {f.suggestedFollowUp}</p>}
              </div>
            ))}
            {state.draft.questionsToAsk.length > 0 && (
              <div className="stack-1">
                <h4>Questions to ask</h4>
                <ul>
                  {state.draft.questionsToAsk.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              </div>
            )}
            {state.draft.rejected > 0 && (
              <p className="tiny faint">
                {state.draft.rejected} part{state.draft.rejected === 1 ? " was" : "s were"} dropped for citing entries or flags that don&apos;t exist.
              </p>
            )}
            <button type="button" className="btn btn-ghost btn-sm" onClick={run} style={{ alignSelf: "flex-start" }}>
              <Icon name="sparkle" size={14} />
              Redraft
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
