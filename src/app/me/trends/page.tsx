import Link from "next/link";
import { AppBar } from "@/components/AppBar";
import { BristolArt } from "@/components/BristolArt";
import { Icon } from "@/components/Icon";
import { Womby } from "@/components/Womby";
import { AiInsight } from "@/components/patient/AiInsight";
import { DailyChart, TypeChart } from "@/components/patient/Charts";
import { SYMPTOM_ICON } from "@/components/patient/meta";
import { getConfig, isGeminiConfigured } from "@/lib/config";
import { BRISTOL, symptomLabel, type SymptomId } from "@/lib/domain";
import { computeTrends } from "@/lib/rules/trends";
import { listEntries } from "@/lib/records";
import { requirePage } from "@/lib/session";
import { localDay } from "@/lib/time";

export const metadata = { title: "Trends" };

const RANGES = [7, 30, 90] as const;
const GROUP_FILL = { hard: "var(--g-hard)", typical: "var(--g-typical)", loose: "var(--g-loose)" } as const;

export default async function Trends({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const user = await requirePage("patient");
  const sp = await searchParams;
  const range = (RANGES as readonly number[]).includes(Number(sp.range)) ? Number(sp.range) : 7;
  const tz = getConfig().timezone;
  const now = new Date();
  const entries = listEntries(user, user.id);
  const t = computeTrends(entries, now, tz, range);
  const days = t.days.slice(-range);
  const start = days[0].day;
  const inRange = entries.filter((e) => localDay(e.occurredAt, tz) >= start);
  const typed = inRange.filter((e) => e.kind === "movement" && e.bristolType != null);
  const dist = BRISTOL.map((b) => ({ ...b, n: typed.filter((e) => e.bristolType === b.type).length }));
  const maxN = Math.max(1, ...dist.map((d) => d.n));
  const symptomCounts = new Map<string, number>();
  for (const e of inRange) for (const s of e.symptoms ?? []) symptomCounts.set(s, (symptomCounts.get(s) ?? 0) + 1);
  const answered = inRange.filter((e) => e.symptoms !== null).length;
  const typicalPct = t.recent.typicalShare == null ? null : Math.round(t.recent.typicalShare * 100);
  const diff = t.comparable && t.recent.avgType != null && t.previous.avgType != null ? t.recent.avgType - t.previous.avgType : null;
  const headline = range === 7 ? t.headline : typed.length < 3 ? "A few more logs and your patterns will start to show here." : diff == null ? `Mostly type ${t.recent.mostCommonType} over the last ${range} days.` : Math.abs(diff) < 1 ? `Steady compared with the ${range} days before.` : diff > 0 ? `A bit looser than the ${range} days before.` : `A bit firmer than the ${range} days before.`;

  return (
    <main id="main" className="p-main fade-in">
      <AppBar title="Trends" large />
      <div className="stack-6">
        <nav className="segmented" aria-label="Time range">
          {RANGES.map((r) => (
            <Link key={r} href={`/me/trends?range=${r}`} aria-current={r === range ? "page" : undefined} scroll={false}>
              {r === 7 ? "Week" : `${r} days`}
            </Link>
          ))}
        </nav>

        {entries.length === 0 ? (
          <section className="card empty">
            <Womby pose="curious" size={96} label="Womby, curious" />
            <h2>Your trends will grow here</h2>
            <p>After a few logs you&apos;ll see your own normal, and how each week compares with it.</p>
            <Link href="/me/log" className="btn btn-primary">
              <Icon name="plus" size={18} /> Log a bathroom trip
            </Link>
          </section>
        ) : (
          <>
            <section className="card card-sage row top" aria-label="Summary" style={{ gap: "var(--s-3)" }}>
              <Icon name="trend" size={20} />
              <div className="stack-1">
                <p className="strong" style={{ margin: 0 }}>
                  {headline}
                </p>
                <p className="tiny muted" style={{ margin: 0 }}>
                  Compared with your own history, using simple rules. Not a diagnosis.
                </p>
              </div>
            </section>

            <AiInsight key={range} days={range} aiEnabled={isGeminiConfigured()} />

            <section className="card stats" aria-label="Key numbers">
              <div>
                <div className="stat-value">{t.recent.movements}</div>
                <div className="stat-label">{range === 7 ? "trips this week" : `trips in ${range} days`}</div>
              </div>
              <div>
                <div className="stat-value">{t.recent.avgType ?? "–"}</div>
                <div className="stat-label">average type</div>
              </div>
              <div>
                <div className="stat-value">{typicalPct == null ? "–" : `${typicalPct}%`}</div>
                <div className="stat-label">in types 3–5</div>
              </div>
            </section>

            <section className="card stack-3" aria-labelledby="daily">
              <div className="section-head">
                <h2 id="daily" style={{ fontSize: "var(--fs-16)" }}>
                  Trips per day
                </h2>
                <span className="small faint">{t.recent.loggedDays} days logged</span>
              </div>
              <DailyChart days={days} label={`Trips per day over the last ${range} days`} />
              <div className="legend" aria-hidden="true">
                <span>
                  <i style={{ background: "var(--g-hard)" }} />
                  Hard (1–2)
                </span>
                <span>
                  <i style={{ background: "var(--g-typical)" }} />
                  Typical (3–5)
                </span>
                <span>
                  <i style={{ background: "var(--g-loose)" }} />
                  Loose (6–7)
                </span>
                <span>
                  <i style={{ border: "1.5px dashed var(--line-strong)" }} />
                  None
                </span>
              </div>
              <p className="tiny faint" style={{ margin: 0 }}>
                Days without a log are unknown, not &ldquo;none&rdquo;.
              </p>
            </section>

            <section className="card stack-3" aria-labelledby="types">
              <div className="section-head">
                <h2 id="types" style={{ fontSize: "var(--fs-16)" }}>
                  Stool type over time
                </h2>
                <span className="small faint">{typed.length} typed</span>
              </div>
              {typed.length ? (
                <>
                  <TypeChart days={days} average={t.recent.avgType} label={`Each typed log on the 1 to 7 scale over the last ${range} days`} />
                  <div className="legend" aria-hidden="true">
                    <span>
                      <i style={{ background: "var(--primary-soft)", border: "1px solid var(--line)" }} />
                      Typical range
                    </span>
                    <span>
                      <i style={{ height: 0, borderTop: "2px dashed var(--primary)", borderRadius: 0 }} />
                      Your average
                    </span>
                  </div>
                </>
              ) : (
                <p className="small muted" style={{ margin: 0 }}>
                  No typed logs in this range yet.
                </p>
              )}
            </section>

            <section className="card stack-3" aria-labelledby="shapes">
              <h2 id="shapes" style={{ fontSize: "var(--fs-16)" }}>
                Type breakdown
              </h2>
              {typed.length === 0 ? (
                <p className="small muted" style={{ margin: 0 }}>
                  Nothing to break down yet.
                </p>
              ) : (
                <div className="stack-2">
                  {dist.map((d) => (
                    <div key={d.type} className="row" style={{ gap: "var(--s-3)" }}>
                      <span style={{ width: 32, flex: "none", display: "grid", placeItems: "center" }}>
                        <BristolArt type={d.type} size={30} />
                      </span>
                      <span className="small" style={{ width: 112, flex: "none" }}>
                        <span className="strong">{d.type}</span> <span className="muted">{d.nickname}</span>
                      </span>
                      <span className="grow" style={{ height: 8, borderRadius: 4, background: "var(--surface-2)", overflow: "hidden" }}>
                        <span style={{ display: "block", height: "100%", width: `${(d.n / maxN) * 100}%`, background: GROUP_FILL[d.group], borderRadius: 4 }} />
                      </span>
                      <span className="small strong num" style={{ width: 24, textAlign: "right" }}>
                        {d.n}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="card stack-3" aria-labelledby="felt">
              <h2 id="felt" style={{ fontSize: "var(--fs-16)" }}>
                How you&apos;ve felt
              </h2>
              {answered === 0 ? (
                <p className="small muted" style={{ margin: 0 }}>
                  Not answered in this range. That&apos;s fine, it&apos;s optional.
                </p>
              ) : symptomCounts.size === 0 ? (
                <p className="small" style={{ margin: 0 }}>
                  No symptoms reported. Lovely.
                </p>
              ) : (
                <div className="group" style={{ border: 0 }}>
                  {[...symptomCounts.entries()]
                    .sort((a, b) => b[1] - a[1])
                    .map(([s, n]) => (
                      <div key={s} className="item" style={{ padding: "var(--s-2) 0", minHeight: 0 }}>
                        <span className="item-icon" style={{ width: 30, height: 30 }}>
                          <Icon name={SYMPTOM_ICON[s as SymptomId] ?? "circleDot"} size={16} />
                        </span>
                        <span className="grow small">{symptomLabel(s)}</span>
                        <span className="small strong num">×{n}</span>
                      </div>
                    ))}
                </div>
              )}
              {answered > 0 && (
                <p className="tiny faint" style={{ margin: 0 }}>
                  Answered on {answered} of {inRange.length} logs. Skipped ones don&apos;t count as fine.
                </p>
              )}
            </section>
          </>
        )}

        <Link href="/me/visit" className="card row" style={{ textDecoration: "none", color: "inherit" }}>
          <span className="item-icon" style={{ background: "var(--peach)", color: "var(--peach-ink)" }}>
            <Icon name="clipboard" size={18} />
          </span>
          <span className="grow">
            <span className="item-title" style={{ display: "block" }}>
              Seeing someone soon?
            </span>
            <span className="item-sub">Make a one-page summary for your visit</span>
          </span>
          <Icon name="chevron" size={18} className="chev" />
        </Link>
      </div>
    </main>
  );
}
