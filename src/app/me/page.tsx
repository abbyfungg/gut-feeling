import Link from "next/link";
import { AppBar, initials } from "@/components/AppBar";
import { BristolArt } from "@/components/BristolArt";
import { Confetti } from "@/components/Confetti";
import { Icon } from "@/components/Icon";
import { Mascot } from "@/components/Mascot";
import { NoMovementButton } from "@/components/NoMovementButton";
import { PatientFlags } from "@/components/PatientFlags";
import { Timeline } from "@/components/Timeline";
import { TrendChart } from "@/components/TrendChart";
import { getConfig } from "@/lib/config";
import { bristolInfo } from "@/lib/domain";
import type { DayPoint } from "@/lib/rules/trends";
import { getPatientOverview, listSharing } from "@/lib/records";
import { requirePage } from "@/lib/session";
import { localDay } from "@/lib/time";

export const metadata = { title: "Home" };

function greeting(tz: string, now: Date) {
  const h = Number(new Intl.DateTimeFormat("en-CA", { timeZone: tz, hour: "numeric", hourCycle: "h23" }).format(now));
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function dayGroup(d: DayPoint) {
  if (d.movements == null) return "unknown";
  if (d.movements === 0) return "none";
  if (!d.types.length) return "typical";
  const sorted = [...d.types].sort((a, b) => a - b);
  const mid = sorted[Math.floor(sorted.length / 2)];
  return mid <= 2 ? "hard" : mid >= 6 ? "loose" : "typical";
}

function weekday(day: string) {
  return new Intl.DateTimeFormat("en-CA", { weekday: "narrow", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`));
}

export default async function PatientHome({ searchParams }: { searchParams: Promise<{ saved?: string; welcome?: string }> }) {
  const user = await requirePage("patient");
  const sp = await searchParams;
  const tz = getConfig().timezone;
  const now = new Date();
  const o = getPatientOverview(user, user.id, now);
  const shares = listSharing(user).filter((s) => s.status === "active");
  const today = localDay(now, tz);
  const todays = o.entries.filter((e) => localDay(e.occurredAt, tz) === today);
  const movementToday = todays.some((e) => e.kind === "movement");
  const noneToday = todays.some((e) => e.kind === "no_movement");
  const firstName = user.name.split(" ")[0];
  const activeFlags = o.flags.filter((f) => f.status !== "reviewed" || now.getTime() - new Date(f.windowEnd).getTime() < 3 * 86_400_000);
  const needsLook = activeFlags.filter((f) => f.status !== "reviewed");
  const r = o.trends.recent;
  const common = bristolInfo(r.mostCommonType);
  const isEmpty = o.entries.length === 0;
  const week = o.trends.days.slice(-7);
  const prevAvg = o.trends.previous.avgType;
  const vibe =
    !o.trends.comparable || r.avgType == null || prevAvg == null
      ? { label: "Too early", sub: "to compare", tint: "tint-sky" }
      : Math.abs(r.avgType - prevAvg) < 1
        ? { label: "Steady", sub: "vs last week", tint: "tint-sage" }
        : r.avgType > prevAvg
          ? { label: "Looser", sub: "vs last week", tint: "tint-peach" }
          : { label: "Firmer", sub: "vs last week", tint: "tint-butter" };

  const hero = isEmpty
    ? { cls: "fresh", title: "Let's get things moving", body: "Log your first one. It takes about ten seconds.", mood: "wave" as const }
    : needsLook.length
      ? {
          cls: "attention",
          title: needsLook.length === 1 ? "One thing worth a look" : `${needsLook.length} things worth a look`,
          body: "Nothing to panic about. Tap below for the details.",
          mood: "calm" as const,
        }
      : movementToday || noneToday
        ? { cls: "", title: "You're all caught up", body: "Thanks for checking in today.", mood: "happy" as const }
        : { cls: "", title: "How's your gut today?", body: "No rush. Log whenever it suits you.", mood: "happy" as const };

  return (
    <main id="main" className="screen">
      <AppBar
        eyebrow={greeting(tz, now)}
        title={firstName}
        right={
          <Link href="/me/sharing" className="avatar" aria-label="Your profile and sharing">
            {initials(user.name)}
          </Link>
        }
      />

      <div className="stack-lg">
        {sp.saved && (
          <div className="card tint-sage pop" role="status" style={{ position: "relative", overflow: "hidden" }}>
            <Confetti />
            <div className="row" style={{ gap: 14 }}>
              <Mascot mood="celebrate" size={72} />
              <div>
                <h2 style={{ fontSize: "var(--t-lg)" }}>Today&apos;s report: logged.</h2>
                <p className="small" style={{ margin: "2px 0 0" }}>
                  {sp.saved === "none" ? "A quiet day, noted. That's useful too." : "Future you says thanks."}
                </p>
              </div>
            </div>
          </div>
        )}

        <section className={`hero-card ${hero.cls}`} aria-label="Today">
          <div className="hero-body stack-sm">
            <h2 className="hero-title">{sp.welcome && !isEmpty ? "Welcome to your gut diary" : hero.title}</h2>
            <p className="small" style={{ margin: 0, color: "var(--ink-2)" }}>
              {hero.body}
            </p>
            <div className="row wrap" style={{ gap: 6, marginTop: 4 }}>
              {!isEmpty && (
                <span className="glass-chip">
                  <Icon name="calendar" size={14} /> {r.loggedDays}/7 days
                </span>
              )}
              <span className="glass-chip">
                <Icon name={shares.length ? "users" : "lock"} size={14} /> {shares.length ? "Shared" : "Private"}
              </span>
            </div>
          </div>
          <div className="hero-mascot">
            <Mascot mood={hero.mood} size={128} label="Pip the mascot" />
          </div>
        </section>

        {!isEmpty && (
          <section aria-label="This week" className="card" style={{ padding: "10px 8px" }}>
            <div className="week">
              {week.map((d) => {
                const g = dayGroup(d);
                const isToday = d.day === today;
                return (
                  <div key={d.day} className={`week-day${isToday ? " today" : ""}`} title={d.movements == null ? "Not logged" : d.movements === 0 ? "Confirmed none" : `${d.movements} logged`}>
                    <span>{isToday ? "Today" : weekday(d.day)}</span>
                    <span className={`week-dot ${g}`} aria-label={d.movements == null ? "not logged" : d.movements === 0 ? "confirmed none" : `${d.movements} logged`}>
                      {d.movements == null ? "" : d.movements}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section aria-label="Quick actions" className="grid-2">
          <Link href="/me/log" className="tile tint-ink">
            <span className="tile-icon">
              <Icon name="plus" />
            </span>
            <span>
              <span className="tile-label" style={{ display: "block" }}>
                Log a movement
              </span>
              <span className="tile-sub">Photo or pick a shape</span>
            </span>
          </Link>
          <NoMovementButton alreadyLoggedToday={movementToday} alreadyConfirmed={noneToday} />
          <Link href="/me/visit" className="tile tint-peach">
            <span className="tile-icon">
              <Icon name="clipboard" />
            </span>
            <span>
              <span className="tile-label" style={{ display: "block" }}>
                Visit notes
              </span>
              <span className="tile-sub">One page for your appointment</span>
            </span>
          </Link>
          <Link href="/me/sharing" className="tile tint-lavender">
            <span className="tile-icon">
              <Icon name="shield" />
            </span>
            <span>
              <span className="tile-label" style={{ display: "block" }}>
                {shares.length ? `Shared with ${shares.length}` : "Sharing"}
              </span>
              <span className="tile-sub">{shares.length ? shares.map((s) => s.practitioner.name.replace(/^Dr\. /, "Dr ")).join(", ") : "Only you can see this"}</span>
            </span>
          </Link>
        </section>

        {isEmpty ? (
          <section className="card stack" aria-label="How it works">
            <h2 style={{ fontSize: "var(--t-lg)" }}>Three taps, that&apos;s it</h2>
            {[
              { n: 1, icon: "camera", t: "Snap a photo or pick a shape", s: "Photos are never stored" },
              { n: 2, icon: "heart", t: "Say how you felt", s: "Optional" },
              { n: 3, icon: "chart", t: "Watch your patterns appear", s: "After a few logs" },
            ].map((s) => (
              <div key={s.n} className="row" style={{ gap: 12 }}>
                <span className="stat-icon tint-butter" style={{ margin: 0 }}>
                  <Icon name={s.icon} size={18} />
                </span>
                <div>
                  <div className="bold">{s.t}</div>
                  <div className="tiny muted">{s.s}</div>
                </div>
              </div>
            ))}
          </section>
        ) : (
          <>
            <PatientFlags flags={activeFlags} timeZone={tz} shared={shares.length > 0} />

            <section aria-labelledby="week-stats" className="stack-sm">
              <div className="section-head">
                <h2 id="week-stats">This week</h2>
                <Link href="/me/trends" className="link small">
                  Insights
                </Link>
              </div>
              <div className="grid-3">
                <div className="card stat" style={{ padding: 14 }}>
                  <span className="stat-value">{r.movements}</span>
                  <span className="stat-label">logs</span>
                </div>
                <div className="card stat" style={{ padding: 14 }}>
                  {common ? (
                    <>
                      <BristolArt type={common.type} size={40} />
                      <span className="stat-label" style={{ marginTop: 4 }}>
                        Mostly {common.nickname.toLowerCase()}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="stat-value">–</span>
                      <span className="stat-label">Not sure yet</span>
                    </>
                  )}
                </div>
                <div className={`card stat ${vibe.tint}`} style={{ padding: 14, border: 0 }}>
                  <span className="stat-value" style={{ fontSize: "var(--t-lg)", lineHeight: 1.2 }}>
                    {vibe.label}
                  </span>
                  <span className="stat-label">{vibe.sub}</span>
                </div>
              </div>
              <div className="card">
                <TrendChart days={o.trends.days} title="Your last three weeks" compact />
              </div>
            </section>

            <section aria-labelledby="recent" className="stack-sm">
              <div className="section-head">
                <h2 id="recent">Recent</h2>
                <Link href="/me/diary" className="link small">
                  See all
                </Link>
              </div>
              <Timeline entries={o.entries} timeZone={tz} audience="patient" limit={4} />
            </section>
          </>
        )}
        {user.isSynthetic && (
          <p className="center tiny muted" style={{ margin: 0 }}>
            <span className="pill pill-synthetic">Demo account · synthetic data</span>
          </p>
        )}
      </div>
    </main>
  );
}
