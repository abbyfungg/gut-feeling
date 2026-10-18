"use client";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { Womby } from "@/components/Womby";

type Insight = {
  model: string;
  headline: string;
  explanation: string;
  dataPoints: { ref: string; label: string; observation: string }[];
  suggestions: string[];
  contactClinician: string;
  simulated: boolean;
  estimated: boolean;
};
type State = { kind: "idle" } | { kind: "busy" } | { kind: "ok"; insight: Insight } | { kind: "note"; message: string };

/** On request, Gemini relates water intake to the stool pattern. Clearly an AI estimate; nothing is saved. */
export function WaterInsight({ endpoint, aiEnabled, audience }: { endpoint: string; aiEnabled: boolean; audience: "patient" | "care" }) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const you = audience === "patient";
  if (!aiEnabled)
    return (
      <p className="notice">
        <Icon name="info" size={16} />
        <span>Gemini isn&apos;t switched on for this server, so there&apos;s no AI read. The water chart is complete on its own.</span>
      </p>
    );

  async function run() {
    setState({ kind: "busy" });
    const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).catch(() => null);
    if (!res) return setState({ kind: "note", message: "You seem to be offline. Try again when you're connected." });
    const body = await res.json().catch(() => ({}));
    if (res.ok && body.status === "ok") return setState({ kind: "ok", insight: body.insight });
    setState({ kind: "note", message: body.message ?? body.error ?? "Gemini couldn't give a read just now." });
  }

  return (
    <section className="ai-panel stack-3" aria-labelledby="water-ai" aria-live="polite" data-testid="water-insight">
      <div className="row between wrap" style={{ gap: 6 }}>
        <h2 id="water-ai" className="ai-title">
          <Icon name="sparkle" size={16} /> Gemini on {you ? "your" : "their"} water
        </h2>
        {state.kind === "ok" && (
          <span className="row wrap" style={{ gap: 6 }}>
            <span className="badge badge-ai">AI estimate · not medical advice</span>
            {state.insight.simulated && <span className="badge badge-demo">Simulated water data</span>}
          </span>
        )}
      </div>
      {state.kind === "idle" && (
        <>
          <p className="small" style={{ margin: 0 }}>
            {you
              ? "Ask Gemini how your water this week lines up with your stools, and what could help."
              : "Ask Gemini how this patient's water this week lines up with their stool entries."}
          </p>
          <button type="button" className="btn btn-secondary btn-sm" style={{ alignSelf: "flex-start" }} onClick={run}>
            <Icon name="sparkle" size={16} /> {you ? "Ask Gemini about my water" : "Ask Gemini about their water"}
          </button>
        </>
      )}
      {state.kind === "busy" && (
        <div className="row">
          <Womby pose="thinking" size={42} />
          <span className="small muted">Gemini is comparing water and entries…</span>
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
          <p className="small" style={{ margin: 0 }}>
            {state.insight.explanation}
          </p>
          {state.insight.dataPoints.length > 0 && (
            <div className="stack-1">
              <h3 className="insight-h">From the data</h3>
              <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
                {state.insight.dataPoints.map((p) => (
                  <li key={p.ref}>
                    <span className="strong">{p.label}:</span> {p.observation}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {state.insight.suggestions.length > 0 && (
            <div className="stack-1">
              <h3 className="insight-h">{you ? "Things you could try" : "Ideas to discuss"}</h3>
              <ul className="insight-try">
                {state.insight.suggestions.map((s, i) => (
                  <li key={i}>
                    <Icon name="water" size={14} /> <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="small" style={{ margin: 0 }}>
            <span className="strong">When to contact a clinician: </span>
            {state.insight.contactClinician}
          </p>
          <p className="tiny muted" style={{ margin: 0 }}>
            Written by {state.insight.model}.{" "}
            {state.insight.simulated ? "Some water amounts are simulated demo data. " : state.insight.estimated ? "Bottle amounts are estimates from sip counts. " : ""}
            AI estimate, not medical advice. It can be wrong and isn&apos;t saved.
          </p>
        </>
      )}
    </section>
  );
}
