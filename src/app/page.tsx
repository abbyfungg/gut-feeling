import Link from "next/link";
import { DemoSignIn } from "@/components/DemoSignIn";
import { Icon } from "@/components/Icon";
import { PixelScene } from "@/components/PixelScene";
import { PublicFooter } from "@/components/public/PublicFooter";
import { PublicNav } from "@/components/public/PublicNav";
import { Womby } from "@/components/Womby";
import { getConfig } from "@/lib/config";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/seed";
import { currentUser } from "@/lib/session";
import "./marketing.css";

const FEATURES: { icon: string; tint: string; title: string; line: string }[] = [
  { icon: "note", tint: "", title: "Log bowel movements", line: "Pick a stool type, add what matters, done in seconds." },
  { icon: "trend", tint: "sky", title: "Track symptoms & patterns", line: "Plain-English trends, compared with your own normal." },
  { icon: "camera", tint: "lavender", title: "Optional photo analysis", line: "An AI estimate you can accept or change. The photo is never stored." },
  { icon: "users", tint: "peach", title: "Share with your care team", line: "Only when you switch sharing on. Switch it off any time." },
  { icon: "palette", tint: "butter", title: "Make it yours", line: "Light, dark and colour themes that feel like home." },
];

const IS = ["A private diary for your bowel health", "A dated record you can bring to appointments", "A gentle nudge to talk to a professional"];
const ISNT = [
  "Not a diagnosis. AI estimates are suggestions, never conclusions.",
  "Not an emergency service. Worried right now? Call 911 or your provider.",
  "Not a validated medical device.",
];

export default async function Landing() {
  const user = await currentUser();
  const demo = getConfig().seedDemoData;
  const home = user ? (user.role === "patient" ? "/me" : "/care") : null;
  const homeLabel = user?.role === "patient" ? "Open my diary" : "Open my dashboard";

  return (
    <div className="mk-page">
      <div className="mk-top">
        <PublicNav home={home} homeLabel={homeLabel} />
        <main id="main">
          <section className="mk-hero" aria-labelledby="hero-title">
            <div className="mk-hero-art">
              <PixelScene height={72} seed={7} />
              <div className="mk-hero-womby">
                <Womby pose="happy" size={168} bob />
              </div>
              <span className="mk-art-chip" aria-hidden>
                <Icon name="lock" size={16} /> Private until you share
              </span>
            </div>

            <div className="mk-hero-copy">
              <h1 id="hero-title">Your gut has a lot to say.</h1>
              <p className="mk-lede">Track your bowel movements, notice patterns, and share useful info with your care team.</p>
              <div className="mk-cta">
                {home ? (
                  <Link href={home} className="btn btn-primary btn-lg">
                    {homeLabel} <Icon name="arrow" size={18} />
                  </Link>
                ) : (
                  <>
                    <Link href="/signup" className="btn btn-primary btn-lg">
                      Let&apos;s get started
                    </Link>
                    <Link href="/signin" className="btn btn-secondary btn-lg">
                      Sign in
                    </Link>
                  </>
                )}
                {demo && (
                  <a href="#demo" className="btn btn-ghost btn-lg">
                    <Icon name="sparkle" size={18} /> Try the demo
                  </a>
                )}
              </div>
              <p className="mk-assure">
                <Icon name="lock" size={16} /> Your data is private and always in your control.
              </p>
            </div>
          </section>

          <div className="mk-container">
            {demo && (
              <section id="demo" className="mk-section" aria-labelledby="demo-title" style={{ scrollMarginTop: 24 }}>
                <div className="mk-demo">
                  <div className="stack-3">
                    <span className="badge badge-demo" style={{ width: "fit-content" }}>
                      Fictional people · synthetic data
                    </span>
                    <h2 id="demo-title">{user ? "Switch to a demo account" : "Try the demo"}</h2>
                    <Link href="/story" className="mk-story-link">
                      <Icon name="heart" size={16} /> Read the story: how the app caught Walter&apos;s problem early <Icon name="arrow" size={16} />
                    </Link>
                    <p className="muted" style={{ maxWidth: "46ch" }}>
                      Look around as a patient or as a nurse, with three weeks of sample entries, patterns to review, and live Gemini photo analysis. These people are made up, and nothing here touches real health records.
                    </p>
                  </div>
                  <DemoSignIn
                    password={DEMO_PASSWORD}
                    accounts={[
                      { label: "I'm Maya", sub: "Patient view", email: DEMO_ACCOUNTS.patient, kind: "patient" },
                      { label: "I'm Nurse Priya", sub: "Care-team view", email: DEMO_ACCOUNTS.practitioner, kind: "care" },
                      { label: "I'm Walter", sub: "Caught-early story", email: DEMO_ACCOUNTS.story, kind: "patient" },
                      { label: "I'm Nora", sub: "Water bottle + hard stools", email: DEMO_ACCOUNTS.fluids, kind: "patient" },
                    ]}
                  />
                </div>
              </section>
            )}

            <section className="mk-section" aria-labelledby="features-title">
              <div className="mk-section-head">
                <span className="eyebrow">What it does</span>
                <h2 id="features-title">A calm place to keep track.</h2>
                <p>Small notes add up to patterns you and your care team can actually use.</p>
              </div>
              <ul className="mk-features">
                {FEATURES.map((f) => (
                  <li key={f.title} className="mk-feature">
                    <span className={`mk-ficon ${f.tint}`} aria-hidden>
                      <Icon name={f.icon} size={20} />
                    </span>
                    <h3>{f.title}</h3>
                    <p>{f.line}</p>
                  </li>
                ))}
              </ul>
            </section>

            <section className="mk-section" aria-labelledby="honest-title">
              <div className="mk-section-head">
                <span className="eyebrow">Straight talk</span>
                <h2 id="honest-title">What it is, and what it isn&apos;t.</h2>
              </div>
              <div className="mk-honest">
                <div className="mk-honest-col">
                  <h3>What it is</h3>
                  <ul className="mk-ticks">
                    {IS.map((t) => (
                      <li key={t}>
                        <span className="mk-tick" aria-hidden>
                          <Icon name="check" size={14} strokeWidth={2.25} />
                        </span>
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mk-honest-col">
                  <h3>What it isn&apos;t</h3>
                  <ul className="mk-ticks">
                    {ISNT.map((t) => (
                      <li key={t}>
                        <span className="mk-tick no" aria-hidden>
                          <Icon name="x" size={14} strokeWidth={2.25} />
                        </span>
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            <section className="mk-section" aria-labelledby="close-title" style={{ borderTop: 0, paddingTop: 0 }}>
              <div className="mk-close">
                <Womby pose="encouraging" size={84} />
                <h2 id="close-title">Everybody poops.</h2>
                <p>Nobody should have to feel embarrassed about it.</p>
                {!home && (
                  <Link href="/signup" className="btn btn-primary btn-lg">
                    Start my private diary <Icon name="arrow" size={18} />
                  </Link>
                )}
              </div>
            </section>
          </div>
        </main>
      </div>
      <PublicFooter />
    </div>
  );
}
