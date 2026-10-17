import Link from "next/link";
import { BristolArt } from "@/components/BristolArt";
import { DemoSignIn } from "@/components/DemoSignIn";
import { Icon } from "@/components/Icon";
import { Mascot } from "@/components/Mascot";
import { getConfig } from "@/lib/config";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/seed";
import { currentUser } from "@/lib/session";

const WEEK: { d: string; kind: "typical" | "hard" | "loose" | "none" | "unknown"; n?: number }[] = [
  { d: "M", kind: "typical", n: 4 },
  { d: "T", kind: "typical", n: 3 },
  { d: "W", kind: "hard", n: 2 },
  { d: "T", kind: "none" },
  { d: "F", kind: "typical", n: 4 },
  { d: "S", kind: "loose", n: 6 },
  { d: "S", kind: "unknown" },
];

/** Static, decorative mini version of the patient home screen. */
function PhoneMock() {
  return (
    <div className="phone" role="img" aria-label="Preview of the Gut Feeling app home screen">
      <div className="phone-notch" />
      <div className="phone-screen">
        <div className="row between">
          <div>
            <div className="tiny faint bold">Friday</div>
            <div className="display bold" style={{ fontSize: "var(--t-lg)" }}>
              Hi Maya
            </div>
          </div>
          <span className="avatar sm">M</span>
        </div>

        <div className="hero-card" style={{ padding: 16, minHeight: 132 }}>
          <div className="hero-body stack-sm">
            <span className="glass-chip" style={{ width: "fit-content", height: 24 }}>
              <Icon name="check" size={12} /> Logged today
            </span>
            <div className="hero-title" style={{ fontSize: "var(--t-xl)" }}>
              Smooth sailing.
            </div>
            <div className="tiny muted bold">4-day streak</div>
          </div>
          <div className="hero-mascot">
            <Mascot mood="happy" size={96} bob={false} />
          </div>
        </div>

        <div className="card flat" style={{ padding: 10 }}>
          <div className="week">
            {WEEK.map((w, i) => (
              <div key={i} className={`week-day${i === 5 ? " today" : ""}`} style={{ padding: "6px 0", gap: 4, fontSize: 10 }}>
                {w.d}
                <span className={`week-dot ${w.kind}`} style={{ width: 22, height: 22, fontSize: 10 }}>
                  {w.n ?? ""}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid-2" style={{ gap: 8 }}>
          <div className="tile tint-butter" style={{ minHeight: 0, padding: 12, gap: 10 }}>
            <span className="tile-icon" style={{ width: 30, height: 30, borderRadius: 10 }}>
              <Icon name="plus" size={16} />
            </span>
            <span className="small bold">Log</span>
          </div>
          <div className="tile tint-sky" style={{ minHeight: 0, padding: 12, gap: 10 }}>
            <span className="tile-icon" style={{ width: 30, height: 30, borderRadius: 10 }}>
              <Icon name="chart" size={16} />
            </span>
            <span className="small bold">Trends</span>
          </div>
        </div>

        <div className="insight">
          <div className="row" style={{ padding: "10px 12px" }}>
            <span className="insight-icon ok" style={{ width: 32, height: 32, borderRadius: 10 }}>
              <Icon name="heart" size={16} />
            </span>
            <div className="grow">
              <div className="small bold">Right on your normal</div>
              <div className="insight-sub">Last 7 days</div>
            </div>
          </div>
        </div>
        <div className="insight">
          <div className="row" style={{ padding: "10px 12px" }}>
            <span className="insight-icon medium" style={{ width: 32, height: 32, borderRadius: 10 }}>
              <Icon name="drop" size={16} />
            </span>
            <div className="grow">
              <div className="small bold">Drink a little more</div>
              <div className="insight-sub">2 harder days</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const FEATURES = [
  { icon: "clock", tint: "tint-butter", title: "5-second logging", line: "Tap a shape. Done." },
  { icon: "chart", tint: "tint-sky", title: "Plain-English patterns", line: "Compared with your own normal." },
  { icon: "users", tint: "tint-lavender", title: "Your care team, in the loop", line: "Only if you switch sharing on." },
  { icon: "lock", tint: "tint-sage", title: "Private by default", line: "Photos are never stored." },
];

export default async function Landing() {
  const user = await currentUser();
  const demo = getConfig().seedDemoData;
  const home = user ? (user.role === "patient" ? "/me" : "/care") : null;
  const homeLabel = user?.role === "patient" ? "Open my diary" : "Open my dashboard";

  return (
    <div style={{ overflowX: "hidden" }}>
      <div className="container">
        <header className="site-nav">
          <Link href="/" className="brand">
            <span className="brand-mark">
              <Mascot size={30} bob={false} />
            </span>
            Gut Feeling
          </Link>
          <nav className="nav-links" aria-label="Main">
            <Link href="/privacy" className="btn btn-ghost btn-sm">
              Privacy
            </Link>
            {home ? (
              <Link href={home} className="btn btn-secondary btn-sm">
                {homeLabel}
              </Link>
            ) : (
              <Link href="/signin" className="btn btn-secondary btn-sm">
                Sign in
              </Link>
            )}
          </nav>
        </header>
      </div>

      <main id="main">
        <section className="container">
          <div className="hero">
            <div>
              <span className="pill pill-lav">
                <Icon name="heart" size={12} /> Gut health, minus the awkward
              </span>
              <h1 style={{ marginTop: 18 }}>Everybody poops.</h1>
              <p className="lede">Nobody should have to feel embarrassed about it.</p>
              <p className="muted" style={{ marginTop: 10, maxWidth: "38ch" }}>
                A private gut diary you can share with your care team.
              </p>
              <div className="row wrap" style={{ marginTop: 26 }}>
                {home ? (
                  <Link href={home} className="btn btn-primary btn-lg">
                    {homeLabel} <Icon name="arrow" size={18} />
                  </Link>
                ) : (
                  <>
                    <Link href="/signup" className="btn btn-primary btn-lg">
                      Start my gut diary <Icon name="arrow" size={18} />
                    </Link>
                    <Link href="/signin" className="btn btn-secondary btn-lg">
                      Sign in
                    </Link>
                  </>
                )}
              </div>
              <p className="row small muted" style={{ marginTop: 18, gap: 8 }}>
                <Icon name="phone" size={16} /> Add it to your home screen — it works like an app.
              </p>
            </div>

            <div style={{ position: "relative", padding: "24px 0" }}>
              <PhoneMock />
              <div className="float-card" style={{ top: 40, left: 0 }} aria-hidden>
                <span className="insight-icon ok" style={{ width: 28, height: 28, borderRadius: 9 }}>
                  <Icon name="check" size={14} />
                </span>
                Logged in 5 seconds
              </div>
              <div className="float-card" style={{ top: "46%", right: 0 }} aria-hidden>
                <span className="avatar sm" style={{ width: 28, height: 28, fontSize: 12, background: "var(--lavender)", color: "var(--lavender-strong)" }}>
                  PR
                </span>
                Shared with Nurse Priya
              </div>
              <div className="float-card" style={{ bottom: 40, left: 10 }} aria-hidden>
                <span className="insight-icon" style={{ width: 28, height: 28, borderRadius: 9, background: "var(--sky)", color: "var(--sky-strong)" }}>
                  <Icon name="camera" size={14} />
                </span>
                Photo never stored
              </div>
            </div>
          </div>
        </section>

        {demo && !user && (
          <section className="container">
            <div className="card pad-lg tint-butter row wrap between" style={{ gap: 18 }}>
              <div className="stack-sm">
                <h2>Take the tour</h2>
                <span className="pill pill-synthetic" style={{ width: "fit-content" }}>
                  Fictional people · synthetic data
                </span>
              </div>
              <DemoSignIn
                password={DEMO_PASSWORD}
                accounts={[
                  { label: "I'm Maya", sub: "patient view", email: DEMO_ACCOUNTS.patient, kind: "patient" },
                  { label: "I'm Nurse Priya", sub: "care-team view", email: DEMO_ACCOUNTS.practitioner, kind: "care" },
                ]}
              />
            </div>
          </section>
        )}

        <section className="container" style={{ marginTop: 56 }}>
          <div className="section-head">
            <h2 style={{ fontSize: "var(--t-2xl)" }}>How it works</h2>
            <div className="row" style={{ gap: 4 }} aria-hidden>
              <BristolArt type={3} size={36} />
              <BristolArt type={4} size={36} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))", gap: 12 }}>
            {FEATURES.map((f) => (
              <div key={f.title} className={`feature ${f.tint}`}>
                <span className="tile-icon" style={{ width: 48, height: 48, borderRadius: 16, display: "grid", placeItems: "center", background: "rgba(255,255,255,0.7)" }}>
                  <Icon name={f.icon} size={22} />
                </span>
                <h3 style={{ marginTop: "auto" }}>{f.title}</h3>
                <p className="muted small">{f.line}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="container" style={{ marginTop: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))", gap: 12 }}>
            <div className="card pad-lg stack">
              <h3>What it is</h3>
              {["A private poop diary", "A dated record to share", "A nudge to talk to a pro"].map((t) => (
                <p key={t} className="row small">
                  <span className="insight-icon ok" style={{ width: 28, height: 28, borderRadius: 9 }}>
                    <Icon name="check" size={14} />
                  </span>
                  {t}
                </p>
              ))}
            </div>
            <div className="card pad-lg stack">
              <h3>What it isn&apos;t</h3>
              {["Not a diagnosis", "Not an emergency service — worried? Call 911 or your provider", "Not a validated medical device"].map((t) => (
                <p key={t} className="row small">
                  <span className="insight-icon high" style={{ width: 28, height: 28, borderRadius: 9 }}>
                    <Icon name="x" size={14} />
                  </span>
                  {t}
                </p>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container row wrap between">
          <span>Gut Feeling · Hack the Valley 11 prototype · not a medical device</span>
          <Link href="/privacy" className="link">
            Privacy
          </Link>
        </div>
      </footer>
    </div>
  );
}
