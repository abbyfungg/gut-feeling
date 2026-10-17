import Link from "next/link";
import { Mascot } from "@/components/Mascot";
import { TrendChart } from "@/components/TrendChart";
import { getConfig } from "@/lib/config";
import { BRISTOL, bristolInfo, symptomLabel } from "@/lib/domain";
import { getPatientOverview } from "@/lib/records";
import { requirePage } from "@/lib/session";
import { addDays, localDay } from "@/lib/time";

export const metadata = { title: "My patterns" };

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

  return (
    <main id="main">
      <div className="container stack-lg">
        <div className="row" style={{ gap: 16 }}>
          <Mascot mood="think" size={80} bob={false} />
          <div>
            <h1 style={{ marginBottom: 4 }}>My patterns</h1>
            <p className="muted" style={{ margin: 0 }}>
              Calculated from your own entries with simple, readable maths. No guesses.
            </p>
          </div>
        </div>

        <section className="card butter">
          <h2 style={{ fontSize: "1.3rem" }}>{t.headline}</h2>
          <div className="grid-3" style={{ marginTop: 10 }}>
            <div className="stat">
              <span className="stat-value">{t.recent.avgType ?? "–"}</span>
              <span className="stat-label">average type, last 7 days</span>
            </div>
            <div className="stat">
              <span className="stat-value">{t.previous.avgType ?? "–"}</span>
              <span className="stat-label">average type, the 7 days before</span>
            </div>
            <div className="stat">
              <span className="stat-value">{t.recent.typicalShare == null ? "–" : `${Math.round(t.recent.typicalShare * 100)}%`}</span>
              <span className="stat-label">in the comfy middle (types 3–5)</span>
            </div>
          </div>
          {!t.comparable && (
            <p className="hint" style={{ marginTop: 12, marginBottom: 0 }}>
              We need at least 3 typed entries in each week to compare fairly. Until then we won&apos;t guess.
            </p>
          )}
        </section>

        <section className="card">
          <h2>Three weeks, day by day</h2>
          <TrendChart days={t.days} title="Your last three weeks" />
        </section>

        <div className="grid-2" style={{ alignItems: "start" }}>
          <section className="card">
            <h2>Shapes this month</h2>
            {typed.length === 0 ? (
              <p className="muted">No typed entries in the last 30 days.</p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {dist.map((d) => (
                  <li key={d.type} style={{ display: "grid", gridTemplateColumns: "130px 1fr 28px", gap: 10, alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontWeight: 700 }}>
                      {d.type} · {d.nickname}
                    </span>
                    <span style={{ background: "#f6ebdf", borderRadius: 999, height: 14, overflow: "hidden" }}>
                      <span style={{ display: "block", height: "100%", width: `${(d.n / maxN) * 100}%`, background: d.group === "typical" ? "#7bbf91" : d.group === "loose" ? "#f4a37c" : "#a86e45", borderRadius: 999 }} />
                    </span>
                    <span className="muted" style={{ textAlign: "right" }}>
                      {d.n}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="card">
            <h2>How you&apos;ve felt</h2>
            {answered === 0 ? (
              <p className="muted">You haven&apos;t answered the &ldquo;how did you feel&rdquo; question this month. That&apos;s fine; it&apos;s optional.</p>
            ) : (
              <>
                <p className="hint">You answered on {answered} of {month.length} entries. Skipped ones aren&apos;t counted as &ldquo;fine&rdquo;.</p>
                {symptomCounts.size === 0 ? (
                  <p>No symptoms reported. Lovely.</p>
                ) : (
                  <div className="chips">
                    {[...symptomCounts.entries()]
                      .sort((a, b) => b[1] - a[1])
                      .map(([s, n]) => (
                        <span key={s} className="pill pill-neutral" style={{ fontSize: "0.9rem" }}>
                          {symptomLabel(s)} × {n}
                        </span>
                      ))}
                  </div>
                )}
              </>
            )}
          </section>
        </div>

        {o.notices.length > 0 && (
          <section className="stack">
            {o.notices.map((n, i) => (
              <p key={i} className="notice notice-info">
                {n.kind === "logging_gap" ? "Quiet stretch in your diary: " : ""}
                {n.message}
              </p>
            ))}
          </section>
        )}
        <p className="hint">
          Most common recently: {bristolInfo(t.recent.mostCommonType)?.nickname ?? "not enough data"}. Want a summary to bring to an appointment?{" "}
          <Link href="/me/visit">Make visit notes</Link>.
        </p>
      </div>
    </main>
  );
}
