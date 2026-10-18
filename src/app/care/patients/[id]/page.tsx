import Link from "next/link";
import { notFound } from "next/navigation";
import { AiSummary } from "@/components/AiSummary";
import { Avatar } from "@/components/Avatar";
import { CareEmpty, CareTopbar, ProvenanceKey, SourceBadge } from "@/components/care/bits";
import { CareEntry, CareTimeline } from "@/components/care/CareTimeline";
import { CareTrendChart } from "@/components/care/CareTrendChart";
import { entryLabel, groupOf, longDate, shortDateTime } from "@/components/care/format";
import { FlagCard, type EntryRef } from "@/components/FlagCard";
import { FollowUpDone } from "@/components/FollowUpDone";
import { Icon } from "@/components/Icon";
import { getConfig, isGeminiConfigured } from "@/lib/config";
import { BRISTOL, SYMPTOMS, type Entry } from "@/lib/domain";
import { AccessError, getPatientOverview } from "@/lib/records";
import { requirePage } from "@/lib/session";
import { DAY, localDay } from "@/lib/time";
import { flagAnchor, relativeTime } from "@/lib/ui";

export const metadata = { title: "Patient" };

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "timeline", label: "Timeline" },
  { id: "trends", label: "Trends" },
  { id: "reviews", label: "Reviews" },
] as const;
type Tab = (typeof TABS)[number]["id"];

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

export default async function CarePatient({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; tab?: string; highlight?: string }>;
}) {
  const user = await requirePage("practitioner");
  const { id } = await params;
  const sp = await searchParams;
  const tab: Tab = TABS.some((t) => t.id === sp.tab) ? (sp.tab as Tab) : "overview";
  const tz = getConfig().timezone;
  const now = new Date();
  let o;
  try {
    o = getPatientOverview(user, id, now);
  } catch (e) {
    if (e instanceof AccessError) notFound();
    throw e;
  }

  const base = `/care/patients/${o.patient.id}`;
  const open = o.flags.filter((f) => f.status !== "reviewed");
  const done = o.flags.filter((f) => f.status === "reviewed");
  const openEvidence = [...new Set(open.flatMap((f) => f.evidenceIds))];
  const allEvidence = new Set(o.flags.flatMap((f) => f.evidenceIds));
  const reviewedIds = [...new Set(o.reviews.flatMap((r) => r.evidenceIds))];
  const entryRefs: Record<string, EntryRef> = {};
  const entryLabels: Record<string, string> = {};
  for (const e of o.entries) {
    entryLabels[e.id] = entryLabel(e, tz);
    entryRefs[e.id] = { label: entryLabels[e.id], group: e.kind === "no_movement" ? "none" : groupOf(e.bristolType) };
  }
  const savedFlag = sp.saved ? o.flags.find((f) => f.key === sp.saved && f.latestReview) : undefined;
  const flagTitle = Object.fromEntries(o.flags.map((f) => [f.key, f.title]));
  const t = o.trends;
  const latest = o.entries[0];
  const openFollowUps = o.reviews.filter((r) => r.followUpStatus === "open").length;

  // Overview shows the last 7 days plus every entry a flag cites, so evidence links resolve on the same page.
  const weekStart = t.days[t.days.length - 7]?.day ?? localDay(now, tz);
  const overviewEntries = o.entries.filter((e) => localDay(e.occurredAt, tz) >= weekStart || allEvidence.has(e.id));
  const overviewIds = overviewEntries.map((e) => e.id);

  // Personal baseline for the chart: average Bristol type over days 8–21 (everything before the current week).
  const priorTypes = t.days.slice(0, Math.max(0, t.days.length - 7)).flatMap((d) => d.types);
  const baseline = priorTypes.length >= 3 ? round1(priorTypes.reduce((a, b) => a + b, 0) / priorTypes.length) : null;
  const evidenceDays = [...new Set(openEvidence.map((eid) => o.entries.find((e) => e.id === eid)).filter((e): e is Entry => !!e).map((e) => localDay(e.occurredAt, tz)))];

  const highlightFlag = sp.highlight ? o.flags.find((f) => f.key === sp.highlight) : undefined;
  const tabTitle = TABS.find((x) => x.id === tab)!.label;

  return (
    <>
      <CareTopbar
        title={tabTitle}
        heading={false}
        crumbs={
          <>
            <Link href="/care?view=patients">Patients</Link>
            <Icon name="chevron" size={12} />
            <span aria-current="page">{o.patient.name}</span>
          </>
        }
      />

      <div className="phead">
        <div className="phead-row">
          <Avatar name={o.patient.name} size="lg" />
          <div className="grow" style={{ minWidth: 220 }}>
            <div className="row wrap" style={{ gap: 10 }}>
              <h1>{o.patient.name}</h1>
              {o.patient.isSynthetic && <span className="badge badge-demo">Synthetic demo patient</span>}
            </div>
            <div className="phead-meta">
              {o.patient.about && <span>{o.patient.about}</span>}
              <span>
                <Icon name="lock" size={14} />
                Sharing since {o.sharedSince ? longDate(o.sharedSince, tz) : "unknown"}
              </span>
              <span>
                <Icon name="clock" size={14} />
                {latest ? `Last entry ${relativeTime(latest.occurredAt, now)}` : "No entries yet"}
              </span>
            </div>
          </div>
          <div className="phead-actions">
            {open.length > 0 && (
              <Link href={`${base}#flags`} className="btn btn-primary">
                <Icon name="flag" size={16} />
                Review {open.length} open {open.length === 1 ? "flag" : "flags"}
              </Link>
            )}
            {isGeminiConfigured() && (
              <Link href={`${base}#handoff`} className="btn btn-secondary">
                <Icon name="sparkle" size={16} />
                Draft handoff
              </Link>
            )}
          </div>
        </div>
        <nav className="ptabs" aria-label="Patient record">
          {TABS.map((x) => (
            <Link key={x.id} href={x.id === "overview" ? base : `${base}?tab=${x.id}`} aria-current={tab === x.id ? "page" : undefined}>
              {x.label}
              {x.id === "overview" && open.length > 0 && <span className="care-count">{open.length}</span>}
              {x.id === "timeline" && <span className="care-count">{o.entries.length}</span>}
              {x.id === "reviews" && o.reviews.length > 0 && <span className="care-count">{o.reviews.length}</span>}
            </Link>
          ))}
        </nav>
      </div>

      <div className="care-content">
        {savedFlag && (
          <div className="notice notice-ok" role="status">
            <Icon name="checkCircle" size={16} />
            <span>
              <strong>Review saved.</strong> {savedFlag.title}: {savedFlag.latestReview?.decisionLabel}.
              {savedFlag.latestReview?.followUpStatus === "open" ? " Added to follow-ups." : ""}
            </span>
          </div>
        )}

        {(tab === "overview" || tab === "trends") &&
          o.notices.map((n, i) => (
            <p key={i} className="notice notice-info">
              <Icon name="info" size={16} />
              <span>
                <strong>{n.kind === "logging_gap" ? "Data gap." : "Limited data."}</strong> {n.message}
              </span>
            </p>
          ))}

        {tab === "overview" && (
          <div className="pgrid">
            <div className="stack-6" style={{ minWidth: 0 }}>
              <div className="statstrip">
                <div>
                  <span className="stat-k">Movements · 7 days</span>
                  <span className="stat-v">{t.recent.movements}</span>
                  <span className="stat-s">prior 7 days: {t.previous.movements}</span>
                </div>
                <div>
                  <span className="stat-k">Days logged</span>
                  <span className="stat-v">{t.recent.loggedDays}/7</span>
                  <span className="stat-s">prior 7 days: {t.previous.loggedDays}/7</span>
                </div>
                <div>
                  <span className="stat-k">Avg Bristol type</span>
                  <span className="stat-v">{t.recent.avgType ?? "–"}</span>
                  <span className="stat-s">prior 7 days: {t.previous.avgType ?? "–"}</span>
                </div>
                <div>
                  <span className="stat-k">Open flags</span>
                  <span className="stat-v" style={open.some((f) => f.severity === "high") ? { color: "var(--danger)" } : undefined}>
                    {open.length}
                  </span>
                  <span className="stat-s">
                    {done.length} reviewed · {openFollowUps} follow-up{openFollowUps === 1 ? "" : "s"}
                  </span>
                </div>
              </div>

              <section className="stack-3" id="flags" aria-labelledby="flags-h" style={{ scrollMarginTop: 80 }}>
                <div className="section-head">
                  <h2 id="flags-h" style={{ fontSize: "var(--fs-16)" }}>
                    Flags <span className="h-count">{open.length} open</span>
                  </h2>
                  <span className="tiny faint">Rule-based prompts from patient-reported entries · not diagnoses</span>
                </div>
                {o.flags.length === 0 && (
                  <div className="panel panel-body row-2 small muted">
                    <Icon name="checkCircle" size={16} />
                    No rules are met by this patient&apos;s recent entries.
                  </div>
                )}
                {open.map((f) => (
                  <FlagCard key={f.key} flag={f} patientId={o.patient.id} timeZone={tz} entries={entryRefs} />
                ))}
                {done.length > 0 && (
                  <details open={!!savedFlag || open.length === 0} className="panel data-details" style={{ padding: "12px 16px" }}>
                    <summary>Reviewed flags ({done.length})</summary>
                    <div className="stack-3" style={{ marginTop: 12 }}>
                      {done.map((f) => (
                        <FlagCard key={f.key} flag={f} patientId={o.patient.id} timeZone={tz} entries={entryRefs} />
                      ))}
                    </div>
                  </details>
                )}
              </section>

              <section className="panel" aria-labelledby="recent-h">
                <div className="panel-head">
                  <h2 id="recent-h">
                    Recent entries <span className="h-count">{overviewEntries.length}</span>
                  </h2>
                  <Link href={`${base}?tab=timeline`} className="link-btn small">
                    Full timeline <Icon name="arrow" size={14} />
                  </Link>
                </div>
                {overviewEntries.length ? (
                  <CareTimeline entries={overviewEntries} timeZone={tz} evidenceIds={openEvidence} reviewedIds={reviewedIds} />
                ) : (
                  <CareEmpty title="No entries this week" pose="sleepy">
                    Nothing logged in the last 7 days. Missing days are unknown, not evidence of no movements.
                  </CareEmpty>
                )}
                <div className="panel-foot">Last 7 days, plus older entries cited by a flag. Orange edge = evidence for an open flag.</div>
              </section>
            </div>

            <aside className="prail" aria-label="Summary">
              <section className="panel" aria-labelledby="latest-h">
                <div className="panel-head">
                  <h2 id="latest-h">Most recent entry</h2>
                  {latest && <span className="meta num">{shortDateTime(latest.occurredAt, tz)}</span>}
                </div>
                {latest ? (
                  <ul className="ctl-entries" style={{ padding: 12 }}>
                    <CareEntry
                      e={latest}
                      timeZone={tz}
                      evidence={openEvidence.includes(latest.id)}
                      focus={false}
                      reviewed={reviewedIds.includes(latest.id)}
                      idPrefix="latest-"
                    />
                  </ul>
                ) : (
                  <p className="panel-body small muted">No entries yet.</p>
                )}
              </section>

              <AiSummary
                patientId={o.patient.id}
                enabled={isGeminiConfigured()}
                flagTitles={flagTitle}
                entryLabels={entryLabels}
                onPageIds={overviewIds}
                timelineHref={`${base}?tab=timeline`}
                timeZone={tz}
              />

              <section className="panel" aria-labelledby="rv-h">
                <div className="panel-head">
                  <h2 id="rv-h">Clinician reviews</h2>
                  <Link href={`${base}?tab=reviews`} className="link-btn small">
                    All <Icon name="arrow" size={14} />
                  </Link>
                </div>
                {o.reviews.length === 0 ? (
                  <p className="panel-body small muted">No reviews recorded yet.</p>
                ) : (
                  <ul className="mini-list">
                    {o.reviews.slice(0, 3).map((r) => (
                      <li key={r.id} className="stack-1 small">
                        <span className="row-2 wrap">
                          <SourceBadge kind="clinician">{r.decisionLabel}</SourceBadge>
                        </span>
                        <span className="muted">{flagTitle[r.flagKey] ?? r.flagTitle}</span>
                        <span className="tiny faint num">
                          {r.practitionerName} · {shortDateTime(r.createdAt, tz)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="panel panel-body stack-2">
                <ProvenanceKey />
                <p className="tiny faint">Entries are self-reported by the patient. AI estimates are suggestions the patient accepted or changed. Rule-based flags are prompts. Only clinician reviews record a clinical decision.</p>
              </section>
            </aside>
          </div>
        )}

        {tab === "timeline" && (
          <section className="panel" aria-labelledby="tl-h">
            <div className="panel-head">
              <h2 id="tl-h">
                All entries <span className="h-count">{o.entries.length}</span>
              </h2>
              <ProvenanceKey />
            </div>
            {o.flags.length > 0 && (
              <div className="toolbar">
                <span className="small muted">Highlight evidence for:</span>
                <div className="fchips">
                  {o.flags.map((f) => (
                    <Link
                      key={f.key}
                      href={highlightFlag?.key === f.key ? `${base}?tab=timeline` : `${base}?tab=timeline&highlight=${encodeURIComponent(f.key)}#entry-${f.evidenceIds[0]}`}
                      className="fchip"
                      aria-current={highlightFlag?.key === f.key ? "true" : undefined}
                      style={highlightFlag?.key === f.key ? { background: "var(--src-rule-bg)", borderColor: "var(--src-rule)", color: "var(--text)", fontWeight: 600 } : undefined}
                    >
                      {f.title}
                      <span className="care-count">{f.evidenceIds.length}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {o.entries.length ? (
              <CareTimeline entries={o.entries} timeZone={tz} evidenceIds={openEvidence} focusIds={highlightFlag?.evidenceIds ?? []} reviewedIds={reviewedIds} />
            ) : (
              <CareEmpty title="No entries yet" pose="sleepy">
                Entries appear here as soon as the patient logs them.
              </CareEmpty>
            )}
          </section>
        )}

        {tab === "trends" && <Trends entries={o.entries} days={t.days} baseline={baseline} evidenceDays={evidenceDays} name={o.patient.name} now={now} />}

        {tab === "reviews" && (
          <section className="panel" aria-labelledby="rh-h">
            <div className="panel-head">
              <h2 id="rh-h">
                Review history <span className="h-count">{o.reviews.length}</span>
              </h2>
              <SourceBadge kind="clinician" />
            </div>
            {o.reviews.length === 0 ? (
              <CareEmpty title="No reviews yet" pose="curious">
                Decisions recorded on this patient&apos;s flags appear here with who made them and when.
              </CareEmpty>
            ) : (
              <ul className="mini-list">
                {o.reviews.map((r) => {
                  const active = o.flags.some((f) => f.key === r.flagKey);
                  return (
                    <li key={r.id} className="row top" style={{ gap: 12, padding: "14px 16px" }}>
                      <Avatar name={r.practitionerName} />
                      <div className="grow stack-1">
                        <div className="row wrap" style={{ gap: 8 }}>
                          <strong>{r.decisionLabel}</strong>
                          <span className="tiny faint num">
                            {r.practitionerName} · {shortDateTime(r.createdAt, tz)} ({relativeTime(r.createdAt, now)})
                          </span>
                        </div>
                        <span className="small muted">
                          {active ? (
                            <Link href={`${base}#${flagAnchor(r.flagKey)}`}>{flagTitle[r.flagKey] ?? r.flagTitle}</Link>
                          ) : (
                            <>{r.flagTitle} · no longer active</>
                          )}{" "}
                          · {r.evidenceIds.length} {r.evidenceIds.length === 1 ? "entry" : "entries"} reviewed
                        </span>
                        {r.note && <p className="small">{r.note}</p>}
                        {r.followUp && (
                          <div className="row wrap small" style={{ gap: 8 }}>
                            <span>
                              <span className="faint">Follow-up:</span> {r.followUp}
                            </span>
                            {r.followUpStatus === "done" ? (
                              <span className="badge badge-ok">Done{r.completedAt ? ` ${shortDateTime(r.completedAt, tz)}` : ""}</span>
                            ) : (
                              <span className="badge">Open</span>
                            )}
                            {r.followUpStatus === "open" && <FollowUpDone reviewId={r.id} />}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}
      </div>
    </>
  );
}

function Trends({
  entries,
  days,
  baseline,
  evidenceDays,
  name,
  now,
}: {
  entries: Entry[];
  days: Parameters<typeof CareTrendChart>[0]["days"];
  baseline: number | null;
  evidenceDays: string[];
  name: string;
  now: Date;
}) {
  const since = now.getTime() - 30 * DAY;
  const last30 = entries.filter((e) => new Date(e.occurredAt).getTime() >= since);
  const movements = last30.filter((e) => e.kind === "movement");
  const typed = movements.filter((e) => e.bristolType != null);
  const typeCounts = BRISTOL.map((b) => ({ b, n: typed.filter((e) => e.bristolType === b.type).length }));
  const maxType = Math.max(1, ...typeCounts.map((x) => x.n));
  const asked = movements.filter((e) => e.symptoms != null);
  const symptomCounts = SYMPTOMS.map((s) => ({ s, n: asked.filter((e) => e.symptoms!.includes(s.id)).length })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n);
  const maxSym = Math.max(1, ...symptomCounts.map((x) => x.n));
  const colourYes = movements.filter((e) => e.bloodReport === "yes").length;
  const colourUnsure = movements.filter((e) => e.bloodReport === "unsure").length;
  const withAi = movements.filter((e) => e.ai);
  const aiChanged = withAi.filter((e) => e.bristolSource === "ai_corrected").length;
  const aiSimulated = withAi.filter((e) => e.ai?.simulated).length;
  const noneDays = last30.filter((e) => e.kind === "no_movement").length;

  return (
    <>
      <section className="panel" aria-labelledby="chart-h">
        <div className="panel-head">
          <h2 id="chart-h">Stool form and logging, last 21 days</h2>
          <span className="meta">Baseline = average type over days 8–21{baseline == null ? " (not enough data)" : ""}</span>
        </div>
        <div className="panel-body">
          <CareTrendChart days={days} baseline={baseline} evidenceDays={evidenceDays} label={`${name}: Bristol type per movement and logs per day, last 21 days`} />
        </div>
      </section>

      <div className="trend-grid">
        <section className="panel" aria-labelledby="dist-h">
          <div className="panel-head">
            <h2 id="dist-h">Form distribution, last 30 days</h2>
            <span className="meta num">{typed.length} typed movements</span>
          </div>
          <div className="panel-body">
            {typed.length === 0 ? (
              <p className="small muted">No typed movements in the last 30 days.</p>
            ) : (
              <ul className="hbars">
                {typeCounts.map(({ b, n }) => (
                  <li key={b.type} className="hbar">
                    <span className="row-2" style={{ minWidth: 0 }}>
                      <span className={`tmark sm ${b.group}`} aria-hidden>
                        {b.type}
                      </span>
                      <span className="truncate">{b.clinical.replace(/^Type \d: /, "")}</span>
                    </span>
                    <span className="hbar-track" aria-hidden>
                      <span className={`hbar-fill ${b.group}`} style={{ width: `${(n / maxType) * 100}%`, display: "block" }} />
                    </span>
                    <span className="hbar-v">
                      {n} <span className="faint">· {Math.round((n / typed.length) * 100)}%</span>
                      <span className="visually-hidden"> type {b.type}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="panel" aria-labelledby="sym-h">
          <div className="panel-head">
            <h2 id="sym-h">Symptoms reported, last 30 days</h2>
            <span className="meta num">asked on {asked.length} of {movements.length}</span>
          </div>
          <div className="panel-body stack-4">
            {symptomCounts.length === 0 ? (
              <p className="small muted">{asked.length ? "No symptoms reported." : "The symptom question was skipped on every entry."}</p>
            ) : (
              <ul className="hbars">
                {symptomCounts.map(({ s, n }) => (
                  <li key={s.id} className="hbar">
                    <span className="truncate">{s.label}</span>
                    <span className="hbar-track" aria-hidden>
                      <span className="hbar-fill" style={{ width: `${(n / maxSym) * 100}%`, display: "block" }} />
                    </span>
                    <span className="hbar-v">
                      {n} <span className="faint">/ {asked.length}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <dl className="kv" style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
              <dt>Red/black colour</dt>
              <dd className="num">
                {colourYes > 0 ? <span className="color-flag">{colourYes} reported</span> : "None reported"}
                {colourUnsure > 0 && <span className="faint"> · {colourUnsure} unsure</span>}
              </dd>
              <dt>Confirmed none</dt>
              <dd className="num">
                {noneDays} {noneDays === 1 ? "day" : "days"}
              </dd>
              <dt>AI-assisted</dt>
              <dd className="num">
                {withAi.length} of {movements.length} entries
                {withAi.length > 0 && (
                  <span className="faint">
                    {" "}
                    · patient changed the estimate on {aiChanged}
                    {aiSimulated > 0 ? ` · ${aiSimulated} simulated (demo)` : ""}
                  </span>
                )}
              </dd>
            </dl>
          </div>
        </section>
      </div>
    </>
  );
}
