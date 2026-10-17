import Link from "next/link";
import { Confetti } from "@/components/Confetti";
import { Icon } from "@/components/Icon";
import { Mascot } from "@/components/Mascot";
import { NoMovementButton } from "@/components/NoMovementButton";
import { PatientFlags } from "@/components/PatientFlags";
import { Timeline } from "@/components/Timeline";
import { TrendChart } from "@/components/TrendChart";
import { getConfig } from "@/lib/config";
import { bristolInfo } from "@/lib/domain";
import { getPatientOverview, listSharing } from "@/lib/records";
import { requirePage } from "@/lib/session";
import { localDay } from "@/lib/time";

export const metadata = { title: "Home" };

const LINES = [
  "Your gut has been busy. Here's the scoop.",
  "A little movement goes a long way.",
  "No shame. Just data.",
  "Your bathroom diary, minus the awkward small talk.",
  "Everybody poops. You're in good company.",
  "Checking in is a kindness to future you.",
  "Your gut called. It left some notes.",
];

function greeting(tz: string, now: Date) {
  const h = Number(new Intl.DateTimeFormat("en-CA", { timeZone: tz, hour: "numeric", hourCycle: "h23" }).format(now));
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
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
  const firstName = user.name.split(" ")[0];
  const line = LINES[Number(today.replaceAll("-", "")) % LINES.length];
  const activeFlags = o.flags.filter((f) => f.status !== "reviewed" || Date.now() - new Date(f.windowEnd).getTime() < 3 * 86_400_000);
  const r = o.trends.recent;
  const common = bristolInfo(r.mostCommonType);
  const isEmpty = o.entries.length === 0;

  return (
    <main id="main">
      <div className="container stack-lg">
        {sp.saved && (
          <div className="card sage success-pop" role="status" style={{ position: "relative", overflow: "hidden" }}>
            <Confetti />
            <div className="row" style={{ gap: 18 }}>
              <Mascot mood="celebrate" size={96} />
              <div>
                <h2 style={{ marginBottom: 4 }}>Today&apos;s report: logged.</h2>
                <p style={{ margin: 0 }}>
                  {sp.saved === "none" ? "A quiet day, noted. That's useful information too." : "Thanks for checking in. Future you (and your care team, if you share) will appreciate it."}
                </p>
              </div>
            </div>
          </div>
        )}

        <section className="hero" aria-label="Welcome">
          <div>
            <p className="muted" style={{ fontWeight: 700, marginBottom: 4 }}>
              {greeting(tz, now)}, {firstName}
            </p>
            <h1>{sp.welcome ? "Welcome to your gut diary." : line}</h1>
            <div className="row" style={{ marginTop: 18 }}>
              <Link href="/me/log" className="btn btn-primary btn-big">
                <Icon name="plus" /> Log a movement
              </Link>
              {!todays.some((e) => e.kind === "no_movement") && <NoMovementButton alreadyLoggedToday={movementToday} />}
            </div>
            {!isEmpty && todays.length === 0 && (
              <p className="hint" style={{ marginTop: 12 }}>
                Nothing logged today yet. No rush; log whenever it suits you.
              </p>
            )}
          </div>
          <div style={{ display: "grid", placeItems: "center" }} className="blob-bg">
            <Mascot mood={isEmpty ? "wave" : activeFlags.length ? "calm" : "happy"} size={170} label="Pip the mascot" />
          </div>
        </section>

        {isEmpty ? (
          <section className="card butter">
            <div className="row" style={{ gap: 18, alignItems: "flex-start" }}>
              <Mascot mood="think" size={84} bob={false} />
              <div>
                <h2>Let&apos;s get things moving</h2>
                <p>
                  Your diary is empty, which is a perfectly fine way to start. Next time you go, tap <strong>Log a movement</strong>, pick the shape
                  that looks closest, and you&apos;re done. Everything else is optional.
                </p>
                <p className="hint" style={{ margin: 0 }}>
                  Patterns appear after a few entries. Missing a day never counts against you.
                </p>
              </div>
            </div>
          </section>
        ) : (
          <>
            <PatientFlags flags={activeFlags} timeZone={tz} shared={shares.length > 0} />

            <section aria-labelledby="week" className="stack">
              <div className="row between">
                <h2 id="week" style={{ margin: 0 }}>
                  Your week at a glance
                </h2>
                <Link href="/me/trends">More patterns</Link>
              </div>
              <div className="grid-3">
                <div className="card tight stat">
                  <span className="stat-value">{r.movements}</span>
                  <span className="stat-label">movements in the last 7 days</span>
                  <span className="hint">logged on {r.loggedDays} of 7 days</span>
                </div>
                <div className="card tight stat">
                  <span className="stat-value">{common ? common.nickname : "Not sure yet"}</span>
                  <span className="stat-label">most common this week{common ? ` (type ${common.type})` : ""}</span>
                </div>
                <div className="card tight stat">
                  <span className="stat-value" style={{ fontSize: "1.2rem", lineHeight: 1.3 }}>
                    {o.trends.headline}
                  </span>
                  <span className="stat-label">compared with your previous week</span>
                </div>
              </div>
              <div className="card">
                <TrendChart days={o.trends.days} title="Your last three weeks" />
              </div>
            </section>

            <div className="grid-2" style={{ alignItems: "start" }}>
              <section className="card" aria-labelledby="recent">
                <div className="card-title">
                  <h2 id="recent">Recent entries</h2>
                  <Link href="/me/diary">Full diary</Link>
                </div>
                <Timeline entries={o.entries} timeZone={tz} audience="patient" limit={5} />
              </section>
              <div className="stack">
                <section className={`card ${shares.length ? "lavender" : ""}`} aria-labelledby="share-status">
                  <h2 id="share-status" style={{ fontSize: "1.2rem" }}>
                    {shares.length ? "Shared with your care team" : "Private: only you can see this"}
                  </h2>
                  {shares.length ? (
                    <ul style={{ paddingLeft: 18, margin: "0 0 10px" }}>
                      {shares.map((s) => (
                        <li key={s.practitioner.id}>
                          <strong>{s.practitioner.name}</strong>, {s.practitioner.title}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>Want a nurse or doctor to see changes as they happen? You can share, and stop sharing, any time.</p>
                  )}
                  <Link href="/me/sharing" className="btn btn-soft btn-sm">
                    <Icon name="shield" size={16} /> Manage sharing
                  </Link>
                </section>
                <section className="card peach" aria-labelledby="visit">
                  <h2 id="visit" style={{ fontSize: "1.2rem" }}>
                    Seeing someone soon?
                  </h2>
                  <p>Get a one-page summary of the last two weeks to bring along. Much easier than remembering.</p>
                  <Link href="/me/visit" className="btn btn-soft btn-sm">
                    <Icon name="clipboard" size={16} /> Make my visit notes
                  </Link>
                </section>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
