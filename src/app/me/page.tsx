import Link from "next/link";
import { Icon } from "@/components/Icon";
import { NoMovementButton } from "@/components/NoMovementButton";
import { PatientFlags } from "@/components/PatientFlags";
import { PixelScene } from "@/components/PixelScene";
import { Womby } from "@/components/Womby";
import { EntryList } from "@/components/patient/EntryList";
import { groupOf } from "@/components/patient/meta";
import { getConfig } from "@/lib/config";
import type { DayPoint } from "@/lib/rules/trends";
import { getPatientOverview, listSharing } from "@/lib/records";
import { requirePage } from "@/lib/session";
import { localDay } from "@/lib/time";

export const metadata = { title: "Home" };

function greeting(tz: string, now: Date) {
  const h = Number(new Intl.DateTimeFormat("en-CA", { timeZone: tz, hour: "numeric", hourCycle: "h23" }).format(now));
  return h < 5 ? "Hi there" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function weekday(day: string) {
  return new Intl.DateTimeFormat("en-CA", { weekday: "short", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`)).slice(0, 3);
}

const GROUP_FILL = { hard: "var(--g-hard)", typical: "var(--g-typical)", loose: "var(--g-loose)", "": "var(--g-none)" } as const;

function WeekBars({ days, today }: { days: DayPoint[]; today: string }) {
  return (
    <div className="weekbars" role="img" aria-label={days.map((d) => `${weekday(d.day)}: ${d.movements == null ? "not logged" : d.movements === 0 ? "confirmed none" : `${d.movements} logged`}`).join(", ")}>
      {days.map((d) => (
        <div key={d.day} className={`weekbar${d.day === today ? " today" : ""}`}>
          <div className="weekbar-col">
            {d.movements == null ? (
              <i style={{ height: 3, background: "var(--line-strong)" }} />
            ) : d.movements === 0 ? (
              <i style={{ height: 14, border: "1.5px dashed var(--line-strong)", background: "transparent" }} />
            ) : d.types.length ? (
              d.types.slice(0, 3).map((t, i) => <i key={i} style={{ background: GROUP_FILL[groupOf(t)] }} />)
            ) : (
              Array.from({ length: Math.min(3, d.movements) }, (_, i) => <i key={i} style={{ background: GROUP_FILL[""] }} />)
            )}
          </div>
          <span className="weekbar-day">{d.day === today ? "Today" : weekday(d.day)}</span>
        </div>
      ))}
    </div>
  );
}

export default async function PatientHome({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
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
  const week = o.trends.days.slice(-7);
  const weekStart = week[0]?.day ?? today;
  const weekEntries = o.entries.filter((e) => localDay(e.occurredAt, tz) >= weekStart);
  const weekLogs = weekEntries.filter((e) => e.kind === "movement").length;
  const weekSymptoms = weekEntries.reduce((n, e) => n + (e.symptoms?.length ?? 0), 0);
  const isEmpty = o.entries.length === 0;

  const sub = isEmpty
    ? "Welcome in. Your first log takes about ten seconds."
    : activeFlags.some((f) => f.status !== "reviewed")
      ? "A couple of things are worth a look below."
      : movementToday || noneToday
        ? "You've checked in today. Nice work."
        : "Your gut's been busy lately.";

  return (
    <main id="main" className="p-main fade-in">
      <div className="p-top">
        <span className="grow" />
        <Link href="/me/settings" className="icon-btn" aria-label="Settings">
          <Icon name="settings" size={22} />
        </Link>
      </div>

      <div className="stack-6">
        <section className="hero" aria-label="Today">
          <div className="hero-scene" aria-hidden="true">
            <PixelScene height={34} seed={11} />
          </div>
          <div className="hero-content">
            <h1>
              {sp.welcome ? "Welcome" : greeting(tz, now)}, {firstName}!
            </h1>
            <p>{sub}</p>
          </div>
          <div className="hero-womby">
            <Womby pose={isEmpty ? "wave" : "happy"} size={84} label={true} bob />
          </div>
        </section>

        <div className="stack-2">
          <Link href="/me/log" className="cta-log">
            <Icon name="plus" size={20} strokeWidth={2.25} /> Log a bathroom trip
          </Link>
          <NoMovementButton alreadyLoggedToday={movementToday} alreadyConfirmed={noneToday} />
        </div>

        {isEmpty ? (
          <section className="card stack" aria-labelledby="how">
            <h2 id="how" style={{ fontSize: "var(--fs-18)" }}>
              How it works
            </h2>
            {[
              { icon: "camera", t: "Pick a shape or snap a photo", s: "Photos are analysed, then thrown away" },
              { icon: "heart", t: "Add how you felt, if you like", s: "Everything except the shape is optional" },
              { icon: "chart", t: "Watch your patterns appear", s: "Compared with your own normal, not anyone else's" },
            ].map((s) => (
              <div key={s.t} className="row top">
                <span className="item-icon">
                  <Icon name={s.icon} size={18} />
                </span>
                <div>
                  <div className="strong">{s.t}</div>
                  <div className="small faint">{s.s}</div>
                </div>
              </div>
            ))}
          </section>
        ) : (
          <>
            <section className="card stack" aria-labelledby="this-week">
              <div className="section-head">
                <h2 id="this-week" style={{ fontSize: "var(--fs-16)" }}>
                  This week
                </h2>
                <Link href="/me/trends" className="link-btn small">
                  Trends <Icon name="chevron" size={16} />
                </Link>
              </div>
              <div className="stats">
                <div>
                  <div className="stat-value">{weekLogs}</div>
                  <div className="stat-label">{weekLogs === 1 ? "log" : "logs"}</div>
                </div>
                <div>
                  <div className="stat-value">{weekSymptoms}</div>
                  <div className="stat-label">{weekSymptoms === 1 ? "symptom" : "symptoms"}</div>
                </div>
                <div>
                  <div className="stat-value">{activeFlags.length}</div>
                  <div className="stat-label">{activeFlags.length === 1 ? "pattern" : "patterns"}</div>
                </div>
              </div>
              <WeekBars days={week} today={today} />
              <div className="legend" aria-hidden="true">
                <span>
                  <i style={{ background: "var(--g-hard)" }} />
                  Hard
                </span>
                <span>
                  <i style={{ background: "var(--g-typical)" }} />
                  Typical
                </span>
                <span>
                  <i style={{ background: "var(--g-loose)" }} />
                  Loose
                </span>
                <span>
                  <i style={{ border: "1.5px dashed var(--line-strong)" }} />
                  None
                </span>
              </div>
            </section>

            <PatientFlags flags={activeFlags} timeZone={tz} shared={shares.length > 0} />

            <section aria-labelledby="recent" className="stack-2">
              <div className="section-head">
                <h2 id="recent">Recent entries</h2>
                <Link href="/me/entries" className="link-btn small">
                  See all <Icon name="chevron" size={16} />
                </Link>
              </div>
              <EntryList entries={o.entries} timeZone={tz} today={today} limit={3} grouped={false} />
            </section>
          </>
        )}

        <Link href="/me/sharing" className="card row" style={{ textDecoration: "none", color: "inherit" }}>
          <span className="item-icon">
            <Icon name={shares.length ? "users" : "lock"} size={18} />
          </span>
          <span className="grow">
            <span className="item-title" style={{ display: "block" }}>
              {shares.length ? `Shared with ${shares.map((s) => s.practitioner.name).join(" and ")}` : "Private to you"}
            </span>
            <span className="item-sub">{shares.length ? "They can see your entries and patterns." : "Share with your care team whenever you like."}</span>
          </span>
          <Icon name="chevron" size={18} className="chev" />
        </Link>

        {user.isSynthetic && (
          <p className="center">
            <span className="badge badge-demo">Demo account · fictional data</span>
          </p>
        )}
      </div>
    </main>
  );
}
