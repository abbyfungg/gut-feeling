import { notFound } from "next/navigation";
import { AppBar } from "@/components/AppBar";
import { DeleteEntryButton } from "@/components/DeleteEntryButton";
import { Icon } from "@/components/Icon";
import { EntryArt, entryTitle } from "@/components/patient/EntryList";
import { CONTEXT_ICON, SYMPTOM_ICON } from "@/components/patient/meta";
import { getConfig } from "@/lib/config";
import { bristolInfo, contextLabel, symptomLabel, type Entry } from "@/lib/domain";
import { getEntry } from "@/lib/records";
import { EffortSummary } from "@/components/patient/Effort";
import { requirePage } from "@/lib/session";
import { formatDateTime } from "@/lib/time";

export const metadata = { title: "Entry" };

function Row({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="item" style={{ alignItems: "flex-start" }}>
      <span className="item-icon">
        <Icon name={icon} size={18} />
      </span>
      <div className="grow stack-1" style={{ minWidth: 0 }}>
        <div className="item-sub">{title}</div>
        <div>{children}</div>
      </div>
    </div>
  );
}

export default async function EntryDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePage("patient");
  const { id } = await params;
  let e: Entry;
  try {
    e = getEntry(user, id);
  } catch {
    notFound();
  }
  const tz = getConfig().timezone;
  const info = bristolInfo(e.bristolType);
  const ai = e.ai;
  const aiInfo = bristolInfo(ai?.estimatedType ?? null);
  const corrected = e.bristolSource === "ai_corrected";
  const effort = e.effort;

  return (
    <main id="main" className="p-main fade-in">
      <AppBar title="Entry" back="/me/entries" />
      <div className="stack-6">
        <section className="card row" style={{ gap: "var(--s-4)" }}>
          <EntryArt entry={e} size={64} />
          <div className="grow stack-1" style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: "var(--fs-20)" }}>{entryTitle(e)}</h2>
            <div className="small muted">{formatDateTime(e.occurredAt, tz)}</div>
            <div className="row wrap" style={{ gap: 6, marginTop: 4 }}>
              <span className="badge badge-patient">
                <Icon name="user" /> You reported
              </span>
              {ai && (
                <span className="badge badge-ai">
                  <Icon name="sparkle" /> AI estimate attached
                </span>
              )}
            </div>
          </div>
        </section>

        {e.bloodReport === "yes" && (
          <div className="notice notice-alert" role="note">
            <Icon name="alert" size={18} />
            <span>
              You reported red or black colour. If it happens again, or you feel unwell, contact your care team. For heavy bleeding, dizziness or severe pain, call 911.
            </span>
          </div>
        )}

        <section className="group" aria-label="Details">
          {e.kind === "movement" && (
            <Row icon="circleDot" title="Stool type">
              {info ? (
                <>
                  <span className="strong">
                    Type {info.type}, {info.nickname}
                  </span>
                  <div className="small muted">{info.description}</div>
                </>
              ) : (
                <span className="muted">Not recorded</span>
              )}
            </Row>
          )}
          {e.kind === "movement" && (
            <Row icon="drop" title="Red or black colour">
              {e.bloodReport === "yes" ? "Yes" : e.bloodReport === "no" ? "No" : e.bloodReport === "unsure" ? "Not sure" : <span className="muted">Not answered</span>}
            </Row>
          )}
          <Row icon="heart" title="Symptoms">
            {e.symptoms == null ? (
              <span className="muted">Not answered</span>
            ) : e.symptoms.length === 0 ? (
              "Felt fine"
            ) : (
              <div className="chips" style={{ marginTop: 4 }}>
                {e.symptoms.map((s) => (
                  <span key={s} className="chip" aria-pressed="false">
                    <Icon name={SYMPTOM_ICON[s] ?? "circleDot"} size={14} /> {symptomLabel(s)}
                  </span>
                ))}
              </div>
            )}
          </Row>
          {e.context && e.context.length > 0 && (
            <Row icon="leaf" title="Context">
              <div className="chips" style={{ marginTop: 4 }}>
                {e.context.map((c) => (
                  <span key={c} className="chip" aria-pressed="false">
                    <Icon name={CONTEXT_ICON[c] ?? "circleDot"} size={14} /> {contextLabel(c)}
                  </span>
                ))}
              </div>
            </Row>
          )}
          {e.notes && (
            <Row icon="note" title="Notes">
              <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{e.notes}</p>
            </Row>
          )}
        </section>

        {effort && (
          <section className="card stack-2" aria-labelledby="effort-h">
            <h2 id="effort-h" style={{ fontSize: "var(--fs-18)" }}>
              Squeeze effort
            </h2>
            <EffortSummary s={effort} />
          </section>
        )}

        {ai && (
          <section className="ai-panel stack-3" aria-labelledby="ai-h">
            <div className="row between">
              <h2 id="ai-h" className="ai-title">
                <Icon name="sparkle" size={16} /> AI estimate · not a diagnosis
              </h2>
              <span className="badge badge-ai">{ai.simulated ? "Demo sample" : ai.confidence + " confidence"}</span>
            </div>
            {ai.usable && aiInfo ? (
              <p style={{ margin: 0 }}>
                The photo looked most like <strong>Type {aiInfo.type}, {aiInfo.nickname}</strong>.{" "}
                {corrected ? `You chose Type ${e.bristolType} instead, and your choice is what's saved.` : "You accepted this estimate."}
              </p>
            ) : (
              <p style={{ margin: 0 }}>The photo couldn&apos;t be classified, so you picked the type yourself.</p>
            )}
            {ai.observations.length > 0 && (
              <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
                {ai.observations.map((o, i) => (
                  <li key={i}>{o}</li>
                ))}
              </ul>
            )}
            {ai.limitations && <p className="tiny muted" style={{ margin: 0 }}>{ai.limitations}</p>}
            <p className="tiny faint" style={{ margin: 0 }}>
              The photo itself was not stored. Only this short text estimate was saved.
            </p>
          </section>
        )}

        <section className="stack-2">
          <DeleteEntryButton id={e.id} redirectTo="/me/entries" />
          <p className="tiny faint">Only you can delete your entries. Anyone you share with will stop seeing it right away.</p>
        </section>
      </div>
    </main>
  );
}
