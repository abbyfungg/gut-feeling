import Link from "next/link";
import { notFound } from "next/navigation";
import { AiSummary } from "@/components/AiSummary";
import { FlagCard } from "@/components/FlagCard";
import { Icon } from "@/components/Icon";
import { Timeline } from "@/components/Timeline";
import { TrendChart } from "@/components/TrendChart";
import { getConfig, isGeminiConfigured } from "@/lib/config";
import { bristolInfo } from "@/lib/domain";
import { AccessError, getPatientOverview } from "@/lib/records";
import { requirePage } from "@/lib/session";
import { formatDateTime, formatTime, localDay } from "@/lib/time";

export const metadata = { title: "Patient" };

export default async function CarePatient({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const user = await requirePage("practitioner");
  const { id } = await params;
  const savedKey = (await searchParams).saved;
  const tz = getConfig().timezone;
  let o;
  try {
    o = getPatientOverview(user, id);
  } catch (e) {
    if (e instanceof AccessError) notFound();
    throw e;
  }
  const open = o.flags.filter((f) => f.status !== "reviewed");
  const done = o.flags.filter((f) => f.status === "reviewed");
  const highlight = open.flatMap((f) => f.evidenceIds);
  const highlightDays = [...new Set(open.flatMap((f) => f.evidenceIds.map((eid) => o.entries.find((e) => e.id === eid)).filter(Boolean).map((e) => localDay(e!.occurredAt, tz))))];
  const entryLabels: Record<string, string> = {};
  for (const e of o.entries) {
    const b = bristolInfo(e.bristolType);
    entryLabels[e.id] = `${formatDateTime(e.occurredAt, tz).replace(/, \d.*$/, "")} ${formatTime(e.occurredAt, tz)} · ${e.kind === "no_movement" ? "no movement" : b ? `type ${b.type}` : "untyped"}`;
  }
  const t = o.trends;
  // Show the last 10 days plus anything that is evidence; older entries fold away.
  const cutoffDay = localDay(new Date(Date.now() - 9 * 86_400_000), tz);
  const isRecent = (e: (typeof o.entries)[number]) => localDay(e.occurredAt, tz) >= cutoffDay || highlight.includes(e.id);
  const recentEntries = o.entries.filter(isRecent);
  const olderEntries = o.entries.filter((e) => !isRecent(e));
  const savedFlag = savedKey ? o.flags.find((f) => f.key === savedKey && f.latestReview) : undefined;

  return (
    <main id="main">
      <div className="container stack-lg">
        <Link href="/care" className="btn btn-ghost btn-sm" style={{ width: "fit-content" }}>
          <Icon name="back" size={16} /> Review queue
        </Link>
        <div className="row between" style={{ alignItems: "flex-start" }}>
          <div>
            <h1 style={{ marginBottom: 2 }}>{o.patient.name}</h1>
            <p className="muted" style={{ margin: 0 }}>{o.patient.about}</p>
            <p className="hint" style={{ margin: "4px 0 0" }}>
              Shared with you since {o.sharedSince ? formatDateTime(o.sharedSince, tz) : "unknown"} · all data self-reported by the patient
            </p>
          </div>
          {o.patient.isSynthetic && <span className="pill pill-synthetic">Synthetic patient</span>}
        </div>

        <div className="grid-3">
          <div className="card tight stat">
            <span className="stat-value">{t.recent.movements}</span>
            <span className="stat-label">movements, last 7 days</span>
            <span className="hint">{t.recent.loggedDays}/7 days with any entry · prior week {t.previous.movements}</span>
          </div>
          <div className="card tight stat">
            <span className="stat-value">
              {t.recent.avgType ?? "–"} <span style={{ fontSize: "1rem" }} className="muted">vs {t.previous.avgType ?? "–"}</span>
            </span>
            <span className="stat-label">mean Bristol type, this week vs prior week</span>
          </div>
          <div className="card tight stat">
            <span className="stat-value">{open.length}</span>
            <span className="stat-label">open review items</span>
            <span className="hint">{done.length} reviewed</span>
          </div>
        </div>

        {savedFlag && (
          <div className="notice notice-ok success-pop" role="status">
            <span className="notice-icon" aria-hidden>
              ✓
            </span>
            <span>
              <strong>Review saved</strong>
              {savedFlag.title}: {savedFlag.latestReview?.decisionLabel}.
              {savedFlag.latestReview?.followUpStatus === "open" ? " Added to your follow-ups." : ""} It&apos;s now under Reviewed items.
            </span>
          </div>
        )}

        {o.notices.map((n, i) => (
          <p key={i} className="notice notice-info" style={{ margin: 0 }}>
            <span className="notice-icon" aria-hidden>
              i
            </span>
            <span>
              <strong>{n.kind === "logging_gap" ? "Data gap" : "Limited data"}</strong>
              {n.message}
            </span>
          </p>
        ))}

        <section className="stack" aria-labelledby="flags">
          <h2 id="flags" style={{ margin: 0 }}>
            Why this patient is flagged
          </h2>
          <div className="card tight lavender">
            <AiSummary patientId={o.patient.id} enabled={isGeminiConfigured()} flagTitles={Object.fromEntries(o.flags.map((f) => [f.key, f.title]))} entryLabels={entryLabels} />
          </div>
          {o.flags.length === 0 && <p className="card muted">No rules are currently met for this patient.</p>}
          {open.map((f) => (
            <FlagCard key={f.key} flag={f} patientId={o.patient.id} timeZone={tz} entryLabels={entryLabels} />
          ))}
          {done.length > 0 && (
            <details open={!!savedFlag}>
              <summary style={{ cursor: "pointer", fontWeight: 800 }}>Reviewed items ({done.length})</summary>
              <div className="stack" style={{ marginTop: 12 }}>
                {done.map((f) => (
                  <FlagCard key={f.key} flag={f} patientId={o.patient.id} timeZone={tz} entryLabels={entryLabels} />
                ))}
              </div>
            </details>
          )}
        </section>

        <section className="card">
          <h2>Last three weeks</h2>
          <TrendChart days={t.days} title={`${o.patient.name}, last three weeks`} highlightDays={highlightDays} />
          {highlightDays.length > 0 && <p className="hint" style={{ margin: "6px 0 0" }}>Shaded columns contain entries behind open items.</p>}
        </section>

        <section className="card">
          <div className="card-title">
            <h2>Full history</h2>
            <span className="hint">Outlined entries support an open item</span>
          </div>
          {o.entries.length ? (
            <>
              <Timeline entries={recentEntries} timeZone={tz} audience="care" highlight={highlight} />
              {olderEntries.length > 0 && (
                <details style={{ marginTop: 18 }}>
                  <summary style={{ cursor: "pointer", fontWeight: 800 }}>Older entries ({olderEntries.length})</summary>
                  <div style={{ marginTop: 12 }}>
                    <Timeline entries={olderEntries} timeZone={tz} audience="care" highlight={highlight} />
                  </div>
                </details>
              )}
            </>
          ) : (
            <p className="muted">No entries yet.</p>
          )}
        </section>
      </div>
    </main>
  );
}
