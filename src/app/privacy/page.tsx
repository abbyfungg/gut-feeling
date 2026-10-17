export const dynamic = "force-dynamic";

import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Mascot } from "@/components/Mascot";
import { getConfig, isGeminiConfigured } from "@/lib/config";

export const metadata = { title: "Privacy, in plain English" };

function Point({ children }: { children: React.ReactNode }) {
  return (
    <li className="row top small" style={{ gap: 10 }}>
      <span style={{ color: "var(--ok)", marginTop: 2 }}>
        <Icon name="check" size={16} />
      </span>
      <span>{children}</span>
    </li>
  );
}

function Section({ icon, tint, title, children }: { icon: string; tint: string; title: string; children: React.ReactNode }) {
  return (
    <section className="card pad-lg stack">
      <div className="row" style={{ gap: 12 }}>
        <span className={`stat-icon ${tint}`} style={{ margin: 0, width: 40, height: 40, borderRadius: 14 }} aria-hidden>
          <Icon name={icon} size={20} />
        </span>
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  );
}

export default function Privacy() {
  const ai = isGeminiConfigured();
  return (
    <div className="container" style={{ maxWidth: 820 }}>
      <header className="site-nav">
        <Link href="/" className="brand">
          <span className="brand-mark">
            <Mascot size={30} bob={false} />
          </span>
          Gut Feeling
        </Link>
        <nav className="nav-links" aria-label="Main">
          <Link href="/signin" className="btn btn-secondary btn-sm">
            Sign in
          </Link>
        </nav>
      </header>

      <main id="main" className="page stack-lg">
        <div className="stack">
          <span className="pill pill-ok" style={{ width: "fit-content" }}>
            <Icon name="lock" size={12} /> No fine print
          </span>
          <h1>Privacy, in plain English</h1>
          <p className="muted">What this prototype actually does with your information.</p>
        </div>

        <div className="grid-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))" }}>
          <Section icon="book" tint="tint-butter" title="What we store">
            <ul className="stack" style={{ listStyle: "none" }}>
              <Point>Name, email, and a hashed password.</Point>
              <Point>Diary entries: time, stool type, and only the extras you add.</Point>
              <Point>If you share: when sharing changed, and any reviews recorded.</Point>
            </ul>
          </Section>

          <Section icon="users" tint="tint-lavender" title="Who can see it">
            <ul className="stack" style={{ listStyle: "none" }}>
              <Point>You.</Point>
              <Point>A care-team member, only while sharing is on. Switch it off and access stops right away.</Point>
              <Point>The server checks on every request — editing a link or ID gets nobody in.</Point>
            </ul>
          </Section>
        </div>

        <Section icon="camera" tint="tint-sky" title="Photos">
          <div className="row wrap" style={{ gap: 6 }}>
            <span className="pill pill-ok">
              <Icon name="check" size={12} /> Photo never stored
            </span>
            <span className={`pill ${ai ? "pill-lav" : ""}`}>
              <Icon name="sparkle" size={12} /> Photo help: {ai ? "on (Gemini API)" : "off · manual entry only"}
            </span>
          </div>
          <p className="small muted">
            Photos are optional. With photo help on, the photo goes to Google&apos;s Gemini API to estimate a stool type, is held in memory for that one
            request, then discarded. <strong style={{ color: "var(--ink)" }}>We never save the photo</strong> to disk or the database — only the result
            (e.g. &ldquo;type 4, medium confidence&rdquo;), and only if you save the entry. Google&apos;s terms apply to data sent to Gemini.
          </p>
        </Section>

        <Section icon="trash" tint="tint-blush" title="Deleting things">
          <p className="small muted">
            Deleting an entry removes it from the database. Deleting your account removes your account, entries, sharing records and reviews of your
            record. Server backups, if the host keeps any, are outside the app&apos;s control.
          </p>
        </Section>

        <section className="card pad-lg tint-peach stack">
          <div className="row" style={{ gap: 10 }}>
            <Icon name="alert" size={20} />
            <h2>What we don&apos;t claim</h2>
          </div>
          <p className="small">
            A hackathon prototype. Not a medical device, doesn&apos;t diagnose anything, and not audited for health-privacy regulations. The database is a
            single file on the server ({getConfig().isProduction ? "hosted" : "local"}), not separately encrypted by the app. Demo accounts and their data
            are fictional.
          </p>
        </section>
      </main>

      <footer className="footer">
        <Link href="/" className="link">
          ← Back home
        </Link>
      </footer>
    </div>
  );
}
