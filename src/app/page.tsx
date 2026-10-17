import Link from "next/link";
import { Mascot } from "@/components/Mascot";
import { DemoSignIn } from "@/components/DemoSignIn";
import { BristolArt } from "@/components/BristolArt";
import { getConfig } from "@/lib/config";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/seed";
import { currentUser } from "@/lib/session";

export default async function Landing() {
  const user = await currentUser();
  const demo = getConfig().seedDemoData;
  return (
    <div className="area-patient">
      <header className="topbar">
        <div className="container topbar-inner">
          <Link href="/" className="brand">
            <Mascot size={34} bob={false} /> Gut Feeling
          </Link>
          <nav className="nav" aria-label="Main">
            <Link href="/privacy">Privacy</Link>
            {user ? (
              <Link href={user.role === "patient" ? "/me" : "/care"}>Open my {user.role === "patient" ? "diary" : "dashboard"}</Link>
            ) : (
              <Link href="/signin">Sign in</Link>
            )}
          </nav>
        </div>
      </header>

      <main id="main">
        <section className="container">
          <div className="hero" style={{ paddingTop: 24 }}>
            <div>
              <span className="pill pill-lav">Bowel health, minus the awkward small talk</span>
              <h1 style={{ fontSize: "clamp(2.4rem, 6vw, 3.6rem)", marginTop: 14 }}>
                Everybody poops.
                <br />
                Let&apos;s talk about it.
              </h1>
              <p style={{ fontSize: "1.15rem", maxWidth: 520 }} className="muted">
                Gut Feeling is a private bathroom diary that takes 20 seconds a day. When something changes, the people caring for you see what changed,
                when, and the entries behind it. No more &ldquo;I&apos;ve had tummy trouble for a while, I think?&rdquo;
              </p>
              <div className="row" style={{ marginTop: 22 }}>
                {user ? (
                  <Link href={user.role === "patient" ? "/me" : "/care"} className="btn btn-primary btn-big">
                    Open my {user.role === "patient" ? "diary" : "dashboard"}
                  </Link>
                ) : (
                  <>
                    <Link href="/signup" className="btn btn-primary btn-big">
                      Start my gut diary
                    </Link>
                    <Link href="/signin" className="btn btn-soft btn-big">
                      Sign in
                    </Link>
                  </>
                )}
              </div>
            </div>
            <div className="blob-bg" style={{ display: "grid", placeItems: "center", padding: "30px 0" }}>
              <div className="speech" style={{ marginBottom: 18 }}>
                Hi, I&apos;m Pip! No shame here. Just data.
              </div>
              <Mascot mood="wave" size={220} label="Pip, a friendly swirl-shaped mascot, waving hello" />
            </div>
          </div>
        </section>

        {demo && !user && (
          <section className="container" style={{ marginTop: 28 }}>
            <div className="card butter">
              <div className="row between">
                <div>
                  <h2 style={{ marginBottom: 4 }}>Take the tour</h2>
                  <p style={{ margin: 0 }}>
                    Every person in the demo is fictional. <span className="pill pill-synthetic">Synthetic demo data</span>
                  </p>
                </div>
                <DemoSignIn
                  password={DEMO_PASSWORD}
                  accounts={[
                    { label: "I'm Maya, tracking my gut", sub: "patient view", email: DEMO_ACCOUNTS.patient, kind: "patient" },
                    { label: "I'm Nurse Priya", sub: "care-team view", email: DEMO_ACCOUNTS.practitioner, kind: "care" },
                  ]}
                />
              </div>
            </div>
          </section>
        )}

        <section className="container" style={{ marginTop: 48 }}>
          <h2>How it works</h2>
          <div className="grid-3" style={{ marginTop: 14 }}>
            <div className="card">
              <div className="b-art" style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                <BristolArt type={3} size={60} />
                <BristolArt type={4} size={60} />
              </div>
              <h3>1. Log in seconds</h3>
              <p className="muted">Pick the shape that looks closest, or let a photo suggest one. Add how you felt if you like. Skip anything you want.</p>
            </div>
            <div className="card">
              <div style={{ marginBottom: 10 }}>
                <Mascot mood="think" size={64} bob={false} />
              </div>
              <h3>2. Patterns, explained</h3>
              <p className="muted">We compare you with your own normal, using plain rules you can read. Missing a day is fine; we never treat it as a symptom.</p>
            </div>
            <div className="card">
              <div style={{ marginBottom: 10 }}>
                <Mascot mood="celebrate" size={64} bob={false} />
              </div>
              <h3>3. Your care team, in the loop</h3>
              <p className="muted">Only if you say so. They see what changed and the exact entries behind it, then record what they decided.</p>
            </div>
          </div>
        </section>

        <section className="container" style={{ marginTop: 40 }}>
          <div className="grid-2">
            <div className="card sage">
              <h3>What Gut Feeling is</h3>
              <ul>
                <li>A private diary for bowel movements and how you felt</li>
                <li>A way to share a clear, dated record with people you choose</li>
                <li>A nudge to talk to a professional when something changes</li>
              </ul>
            </div>
            <div className="card peach">
              <h3>What it isn&apos;t</h3>
              <ul>
                <li>A diagnosis. It can&apos;t tell you what&apos;s causing anything</li>
                <li>An emergency service. If you&apos;re worried, contact a healthcare provider or call 911</li>
                <li>A clinically validated device. This is a hackathon prototype</li>
              </ul>
            </div>
          </div>
        </section>
      </main>
      <footer className="footer">
        <div className="container row between">
          <span>Gut Feeling · built at Hack the Valley 11 · prototype, not a medical device</span>
          <Link href="/privacy">How we handle your data</Link>
        </div>
      </footer>
    </div>
  );
}
