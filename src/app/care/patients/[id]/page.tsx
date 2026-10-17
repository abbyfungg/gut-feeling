import Link from "next/link";
import { notFound } from "next/navigation";
import { AiSummary } from "@/components/AiSummary";
import { Avatar } from "@/components/Avatar";
import { FlagCard } from "@/components/FlagCard";
import { Icon } from "@/components/Icon";
import { Timeline } from "@/components/Timeline";
import { TrendChart } from "@/components/TrendChart";
import { getConfig, isGeminiConfigured } from "@/lib/config";
import { bristolInfo } from "@/lib/domain";
import { AccessError, getPatientOverview } from "@/lib/records";
import { requirePage } from "@/lib/session";
import { formatDateTime, formatTime, localDay } from "@/lib/time";
import { flagAnchor, relativeTime } from "@/lib/ui";

export const metadata = { title: "Patient" };

export default async function CarePatient({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const user = await requirePage("practitioner");
  const { id } = await params;
  const savedKey = (await searchParams).saved;
  const tz = getConfig().timezone;
  const now = new Date();
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
  const cutoffDay = localDay(new Date(new Date(o.trends.days[o.trends.days.length - 1].day + "T12:00:00Z").getTime() - 9 * 86_400_000), tz);
  const isRecent = (e: (typeof o.entries)[number]) => localDay(e.occurredAt, tz) >= cutoffDay || highlight.includes(e.id);
  const recentEntries = o.entries.filter(isRecent);
  const olderEntries = o.entries.filter((e) => !isRecent(e));
  const savedFlag = savedKey ? o.flags.find((f) => f.key === savedKey && f.latestReview) : undefined;
  const flagTitle = Object.fromEntries(o.flags.map((f) => [f.key, f.title]));
  const hasHigh = open.some((f) => f.severity === "high");

  const stats = [
    { label: "Movements · 7 d", value: String(t.recent.movements), sub: `prior week ${t.previous.movements}` },
    { label: "Days logged", value: `${t.recent.loggedDays}/7`, sub: "this week" },
    { label: "Avg Bristol type", value: String(t.recent.avgType ?? "–"), sub: `prior week ${t.previous.avgType ?? "–"}` },
    { label: "Open items", value: String(open.length), sub: `${done.length} reviewed`, tone: open.length ? (hasHigh ? "var(--high)" : "var(--med)") : "var(--ok)" },
  ];

  return (
    <div className="stack-lg">
      <Link href="/care" className="btn btn-ghost btn-sm" style={{ width: "fit-content", marginLeft: -10 }}>
        <Icon name="back" size={16} /> Review queue
      </Link>

      <header className="card pad-lg stack-lg">
        <div className="row top wrap" style={{ gap: 16 }}>
          <Avatar name={o.patient.name} size="lg" />
          <div className="grow stack-sm" style={{ minWidth: 220 }}>
            <h1>{o.patient.name}</h1>
            {o.patient.about && <p className="muted small">{o.patient.about}</p>}
            <div className="row wrap" style={{ gap: 6, marginTop: 4 }}>
              <span className="pill pill-ok">
                <Icon name="lock" size={12} /> Sharing since {o.sharedSince ? formatDateTime(o.sharedSince, tz).replace(/, \d.*$/, "") : "unknown"}
              </span>
              <span className="pill">
                <Icon name="user" size={12} /> Self-reported
              </span>
              {o.patient.isSynthetic && <span className="pill pill-synthetic">Synthetic patient</span>}
            </div>
          </div>
        </div>
        <div className="grid-4">
          {stats.map((s) => (
            <div key={s.label} className="stat" style={{ padding: "12px 14px", borderRadius: "var(--r-md)", background: "var(--surface-2)" }}>
              <span className="stat-label">{s.label}</span>
              <span className="stat-value" style={{ marginTop: 4, color: s.tone }}>
                {s.value}
              </span>
              <span className="tiny faint">{s.sub}</span>
            </div>
          ))}
        </div>
      </header>

      {savedFlag && (
        <div className="notice notice-ok pop" role="status">
          <Icon name="check" size={18} />
          <span>
            <strong>Review saved</strong>
            {savedFlag.title}: {savedFlag.latestReview?.decisionLabel}.{savedFlag.latestReview?.followUpStatus === "open" ? " Added to follow-ups." : ""}
          </span>
        </div>
      )}

      {o.notices.map((n, i) => (
        <p key={i} className="notice notice-info">
          <Icon name="info" size={18} />
          <span>
            <strong>{n.kind === "logging_gap" ? "Data gap" : "Limited data"}</strong>
            {n.message}
          </span>
        </p>
      ))}

      <div className="patient-grid">
        <div className="stack-lg" style={{ minWidth: 0 }}>
          <section className="stack" aria-labelledby="flags">
            <div className="section-head" style={{ marginBottom: 0 }}>
              <h2 id="flags">Flags</h2>
              <span className="row" style={{ gap: 6 }}>
                <span className="pill pill-info">
                  <Icon name="shield" size={12} /> Rule-based · not a diagnosis
                </span>
              </span>
            </div>
            {o.flags.length === 0 && (
              <div className="card row">
                <span className="insight-icon ok" aria-hidden>
                  <Icon name="check" />
                </span>
                <span className="muted">No rules are met right now.</span>
              </div>
            )}
            {open.map((f) => (
              <FlagCard key={f.key} flag={f} patientId={o.patient.id} timeZone={tz} entryLabels={entryLabels} />
            ))}
            {done.length > 0 && (
              <details open={!!savedFlag} className="card flat" style={{ padding: "14px 18px" }}>
                <summary style={{ cursor: "pointer", fontWeight: 700 }}>
                  <span className="row" style={{ display: "inline-flex", gap: 8 }}>
                    <Icon name="check" size={16} /> Reviewed ({done.length})
                  </span>
                </summary>
                <div className="stack" style={{ marginTop: 12 }}>
                  {done.map((f) => (
                    <FlagCard key={f.key} flag={f} patientId={o.patient.id} timeZone={tz} entryLabels={entryLabels} />
                  ))}
                </div>
              </details>
            )}
          </section>

          <section className="card">
            <div className="section-head">
              <h2>Last 3 weeks</h2>
              {highlightDays.length > 0 && <span className="tiny faint">Shaded = days behind open flags</span>}
            </div>
            <TrendChart days={t.days} title={`${o.patient.name}, last three weeks`} highlightDays={highlightDays} />
          </section>

          <section aria-labelledby="history">
            <div className="section-head">
              <h2 id="history">Timeline</h2>
              <span className="row tiny faint" style={{ gap: 6 }}>
                <span className="dot" style={{ background: "var(--lavender-strong)" }} /> Evidence for an open flag
              </span>
            </div>
            {o.entries.length ? (
              <div className="stack">
                <Timeline entries={recentEntries} timeZone={tz} audience="care" highlight={highlight} />
                {olderEntries.length > 0 && (
                  <details>
                    <summary className="btn btn-secondary btn-sm" style={{ listStyle: "none", width: "fit-content" }}>
                      Older entries ({olderEntries.length})
                    </summary>
                    <div style={{ marginTop: 12 }}>
                      <Timeline entries={olderEntries} timeZone={tz} audience="care" highlight={highlight} />
                    </div>
                  </details>
                )}
              </div>
            ) : (
              <p className="card muted">No entries yet.</p>
            )}
          </section>
        </div>

        <aside className="sticky-col">
          <div className="card tint-lavender">
            <AiSummary patientId={o.patient.id} enabled={isGeminiConfigured()} flagTitles={flagTitle} entryLabels={entryLabels} />
          </div>

          <section className="card stack" aria-labelledby="reviews-h">
            <div className="row between">
              <h2 id="reviews-h" style={{ fontSize: "var(--t-lg)" }}>
                Reviews
              </h2>
              <span className="pill">{o.reviews.length}</span>
            </div>
            {o.reviews.length === 0 ? (
              <p className="small faint">No reviews yet.</p>
            ) : (
              <ul className="stack" style={{ listStyle: "none" }}>
                {o.reviews.slice(0, 8).map((r) => (
                  <li key={r.id} className="row top" style={{ gap: 10 }}>
                    <Avatar name={r.practitionerName} size="sm" />
                    <div className="grow">
                      <div className="small bold">{r.decisionLabel}</div>
                      <a href={`#${flagAnchor(r.flagKey)}`} className="tiny faint" style={{ textDecoration: "none", display: "block" }}>
                        {flagTitle[r.flagKey] ?? r.flagTitle}
                      </a>
                      <div className="row wrap" style={{ gap: 6, marginTop: 4 }}>
                        <span className="tiny faint" title={formatDateTime(r.createdAt, tz)}>
                          {r.practitionerName.split(" ")[0]} · {relativeTime(r.createdAt, now)}
                        </span>
                        {r.followUpStatus === "open" && <span className="pill pill-lav">Follow-up open</span>}
                        {r.followUpStatus === "done" && <span className="pill pill-ok">Follow-up done</span>}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className="tiny faint row top" style={{ gap: 6, padding: "0 4px" }}>
            <Icon name="info" size={14} />
            <span>Entries are self-reported. Flags are prompts for clinical judgement, not diagnoses.</span>
          </p>
        </aside>
      </div>
    </div>
  );
}
