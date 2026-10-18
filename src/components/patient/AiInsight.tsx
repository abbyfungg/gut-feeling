"use client";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { Womby } from "@/components/Womby";

type Insight = { model: string; generatedAt: string; days: number; entryCount: number; headline: string; why: string[]; tryThis: string[]; talkToSomeone: string };
type State = { kind: "idle" } | { kind: "busy" } | { kind: "ok"; insight: Insight } | { kind: "note"; message: string };

/** On request, Gemini reads the person's own entries for this range and describes patterns. Clearly an AI estimate. */
export function AiInsight({ days, aiEnabled }: { days: number; aiEnabled: boolean }) {
  const [state, setState] = useState<State>({ kind: "idle" });
  if (!aiEnabled)
    return (
      <p className="notice">
        <Icon name="info" size={16} />
        <span>Gemini isn&apos;t switched on for this server, so there&apos;s no AI read. Your charts are complete on their own.</span>
      </p>
    );

  async function run() {
    setState({ kind: "busy" });
    const res = await fetch("/api/insights", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ days }) }).catch(() => null);
    if (!res) return setState({ kind: "note", message: "You seem to be offline. Try again when you're connected." });
    const body = await res.json().catch(() => ({}));
    if (res.ok && body.status === "ok") return setState({ kind: "ok", insight: body.insight });
    setState({ kind: "note", message: body.message ?? body.error ?? "Gemini couldn't give a read just now." });
  }

  return (
    <section className="ai-panel stack-3" aria-labelledby="ai-insight" aria-live="polite">
      <div className="row between">
        <h2 id="ai-insight" className="ai-title">
          <Icon name="sparkle" size={16} /> Gemini&apos;s read · not a diagnosis
        </h2>
        {state.kind === "ok" && <span className="badge badge-ai">AI estimate</span>}
      </div>
      {state.kind === "idle" && (
        <>
          <p className="small" style={{ margin: 0 }}>
            Ask Gemini why your last {days === 7 ? "week" : `${days} days`} may look like this, and what everyday habits could help your gut feel its best.
          </p>
          <button type="button" className="btn btn-secondary btn-sm" style={{ alignSelf: "flex-start" }} onClick={run}>
            <Icon name="sparkle" size={16} /> Ask Gemini
          </button>
        </>
      )}
      {state.kind === "busy" && (
        <div className="row">
          <Womby pose="thinking" size={42} />
          <span className="small muted">Gemini is reading your entries…</span>
        </div>
      )}
      {state.kind === "note" && (
        <>
          <p className="small" style={{ margin: 0 }}>
            {state.message}
          </p>
          <button type="button" className="link-btn small" style={{ alignSelf: "flex-start" }} onClick={run}>
            Try again
          </button>
        </>
      )}
      {state.kind === "ok" && (
        <>
          <p className="strong" style={{ margin: 0 }}>
            {state.insight.headline}
          </p>
          {state.insight.why.length > 0 && (
            <div className="stack-1">
              <h3 className="insight-h">Why it may look like this</h3>
              <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
                {state.insight.why.map((o, i) => (
                  <li key={i}>{o}</li>
                ))}
              </ul>
            </div>
          )}
          {state.insight.tryThis.length > 0 && (
            <div className="stack-1">
              <h3 className="insight-h">Things you could try</h3>
              <ul className="insight-try">
                {state.insight.tryThis.map((o, i) => (
                  <li key={i}>
                    <Icon name="leaf" size={14} /> <span>{o}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {state.insight.talkToSomeone && (
            <p className="small" style={{ margin: 0 }}>
              <span className="strong">When to check in: </span>
              {state.insight.talkToSomeone}
            </p>
          )}
          <p className="tiny muted" style={{ margin: 0 }}>
            Written by {state.insight.model} from your {state.insight.entryCount} entries. It can be wrong, it doesn&apos;t know your history, and it isn&apos;t saved. If something
            worries you, talk to a healthcare provider.
          </p>
        </>
      )}
    </section>
  );
}
