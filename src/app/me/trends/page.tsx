import Link from "next/link";
import { AppBar } from "@/components/AppBar";
import { BristolArt } from "@/components/BristolArt";
import { Icon } from "@/components/Icon";
import { TrendChart } from "@/components/TrendChart";
import { getConfig } from "@/lib/config";
import { BRISTOL, symptomLabel } from "@/lib/domain";
import { getPatientOverview } from "@/lib/records";
import { requirePage } from "@/lib/session";
import { addDays, localDay } from "@/lib/time";

export const metadata = { title: "Insights" };

const GROUP_COLOR = { hard: "var(--g-hard)", typical: "var(--sage-strong)", loose: "var(--g-loose)" } as const;

export default async function Trends() {
  const user = await requirePage("patient");
  const tz = getConfig().timezone;
  const now = new Date();
  const o = getPatientOverview(user, user.id, now);
  const t = o.trends;
  const since = addDays(localDay(now, tz), -29);
  const month = o.entries.filter((e) => localDay(e.occurredAt, tz) >= since);
  const typed = month.filter((e) => e.kind === "movement" && e.bristolType != null);
  const dist = BRISTOL.map((b) => ({ ...b, n: typed.filter((e) => e.bristolType === b.type).length }));
  const maxN = Math.max(1, ...dist.map((d) => d.n));
  const symptomCounts = new Map<string, number>();
  for (const e of month) for (const s of e.symptoms ?? []) symptomCounts.set(s, (symptomCounts.get(s) ?? 0) + 1);
  const answered = month.filter((e) => e.symptoms !== null).length;
  const typicalPct = t.recent.typicalShare == null ? null : Math.round(t.recent.typicalShare * 100);
  const diff = t.comparable && t.recent.avgType != null && t.previous.avgType != null ? t.recent.avgType - t.previous.avgType : null;

  return (
    <main id="main" className="screen">
      <AppBar title="Insights" eyebrow="From your own logs" />
      <div className="stack-lg">
        <section className="hero-card fresh" aria-label="Summary">
          <div className="stack-sm">
            <span className="eyebrow">This week</span>
            <h2 className="hero-title" style={{ fontSize: "var(--t-xl)" }}>
              {t.headline}
            </h2>
          </div>
        </section>

        <section className="grid-3" aria-label="Key numbers">
          <div className="card stat" style={{ padding: 14 }}>
            <span className="stat-value">{t.recent.avgType ?? "–"}</span>
            <span className="stat-label">avg type</span>
          </div>
          <div className="card stat" style={{ padding: 14 }}>
            <span className="stat-value" style={{ color: diff == null ? undefined : Math.abs(diff) < 1 ? "var(--ok)" : "var(--med)" }}>
              {diff == null ? "–" : `${diff > 0 ? "+" : ""}${diff.toFixed(1)}`}
            </span>
            <span className="stat-label">vs last week</span>
          </div>
          <div className="card stat" style={{ padding: 14 }}>
            <span className="stat-value">{typicalPct == null ? "–" : `${typicalPct}%`}</span>
            <span className="stat-label">in types 3–5</span>
          </div>
        </section>
        {!t.comparable && (
          <p className="tiny muted" style={{ margin: "-10px 4px 0" }}>
            We compare once each week has 3+ typed logs. Until then, no guessing.
          </p>
        )}

        <section className="card stack-sm" aria-labelledby="days">
          <h2 id="days" style={{ fontSize: "var(--t-lg)" }}>
            Last 3 weeks
          </h2>
          <TrendChart days={t.days} title="Your last three weeks" />
        </section>

        <section className="card stack-sm" aria-labelledby="shapes">
          <div className="section-head">
            <h2 id="shapes" style={{ fontSize: "var(--t-lg)" }}>
              Shapes this month
            </h2>
            <span className="pill">{typed.length} typed</span>
          </div>
          {typed.length === 0 ? (
            <p className="muted small">No typed logs in the last 30 days.</p>
          ) : (
            <div className="stack-sm">
              {dist.map((d) => (
                <div key={d.type} className="row" style={{ gap: 10 }}>
                  <span style={{ width: 44, flex: "none", display: "grid", placeItems: "center" }}>
                    <BristolArt type={d.type} size={40} />
                  </span>
                  <span className="small bold" style={{ width: 104, flex: "none" }}>
                    {d.nickname}
                  </span>
                  <span className="bar-track grow">
                    <span className="bar-fill" style={{ display: "block", width: `${(d.n / maxN) * 100}%`, background: GROUP_COLOR[d.group] }} />
                  </span>
                  <span className="small bold" style={{ width: 22, textAlign: "right" }}>
                    {d.n}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card stack-sm" aria-labelledby="felt">
          <h2 id="felt" style={{ fontSize: "var(--t-lg)" }}>
            How you&apos;ve felt
          </h2>
          {answered === 0 ? (
            <p className="muted small" style={{ margin: 0 }}>
              Not answered this month. That&apos;s fine, it&apos;s optional.
            </p>
          ) : symptomCounts.size === 0 ? (
            <p className="small" style={{ margin: 0 }}>
              No symptoms reported. Lovely.
            </p>
          ) : (
            <div className="chips">
              {[...symptomCounts.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([s, n]) => (
                  <span key={s} className="pill">
                    {symptomLabel(s)} <strong>×{n}</strong>
                  </span>
                ))}
            </div>
          )}
          {answered > 0 && (
            <p className="tiny muted" style={{ margin: 0 }}>
              Answered on {answered} of {month.length} logs. Skipped ones don&apos;t count as fine.
            </p>
          )}
        </section>

        {o.notices.map((n, i) => (
          <p key={i} className="notice notice-info" style={{ margin: 0 }}>
            {n.message}
          </p>
        ))}

        <Link href="/me/visit" className="tile tint-peach" style={{ minHeight: 0, flexDirection: "row", alignItems: "center" }}>
          <span className="tile-icon">
            <Icon name="clipboard" />
          </span>
          <span className="grow">
            <span className="tile-label" style={{ display: "block" }}>
              Seeing someone soon?
            </span>
            <span className="tile-sub">Make one-page visit notes</span>
          </span>
          <Icon name="chevron" />
        </Link>
      </div>
    </main>
  );
}
