export const dynamic = "force-dynamic";

import Link from "next/link";
import { Icon } from "@/components/Icon";
import { PublicFooter } from "@/components/public/PublicFooter";
import { PublicNav } from "@/components/public/PublicNav";
import { getConfig, isGeminiConfigured } from "@/lib/config";
import { currentUser } from "@/lib/session";
import "../marketing.css";

export const metadata = { title: "Privacy, in plain English" };

const SECTIONS = [
  { id: "store", title: "What we store" },
  { id: "access", title: "Who can see it" },
  { id: "photos", title: "Photos" },
  { id: "deleting", title: "Deleting things" },
  { id: "claims", title: "What we don't claim" },
];

export default async function Privacy() {
  const ai = isGeminiConfigured();
  const user = await currentUser();
  const home = user ? (user.role === "patient" ? "/me" : "/care") : null;
  const homeLabel = user?.role === "patient" ? "Open my diary" : "Open my dashboard";

  return (
    <div className="mk-page">
      <PublicNav home={home} homeLabel={homeLabel} />
      <main id="main" className="mk-doc">
        <header className="mk-doc-head">
          <span className="eyebrow">Privacy</span>
          <h1>Privacy, in plain English</h1>
          <p>What this prototype actually does with your information. No fine print.</p>
          <nav aria-label="On this page">
            <ul className="mk-toc">
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`}>{s.title}</a>
                </li>
              ))}
            </ul>
          </nav>
        </header>

        <section id="store" aria-labelledby="store-h">
          <h2 id="store-h">
            <Icon name="book" size={20} /> What we store
          </h2>
          <ul>
            <li>Your name, email, and a hashed password.</li>
            <li>Diary entries: the time, the stool type, and only the extras you choose to add.</li>
            <li>If you share: when sharing was switched on or off, and any reviews your care team recorded.</li>
          </ul>
        </section>

        <section id="access" aria-labelledby="access-h">
          <h2 id="access-h">
            <Icon name="users" size={20} /> Who can see it
          </h2>
          <ul>
            <li>You.</li>
            <li>A care-team member, only while sharing is on. Switch it off and their access stops right away.</li>
            <li>The server checks permission on every request, so editing a link or an ID gets nobody in.</li>
          </ul>
        </section>

        <section id="photos" aria-labelledby="photos-h">
          <h2 id="photos-h">
            <Icon name="camera" size={20} /> Photos
          </h2>
          <div className="mk-status">
            <span className="badge badge-ok">
              <Icon name="check" size={12} /> Photo never stored
            </span>
            <span className={`badge ${ai ? "badge-ai" : ""}`}>
              <Icon name="sparkle" size={12} /> Photo help: {ai ? "on (Gemini API)" : "off · manual entry only"}
            </span>
          </div>
          <p>
            Photos are optional. With photo help on, the photo is sent to Google&apos;s Gemini API to estimate a stool type. It is held in memory for that
            one request, then discarded.
          </p>
          <p>
            <strong>We never save the photo</strong> to disk or to the database. Only the result is kept (for example, &ldquo;type 4, medium
            confidence&rdquo;), and only if you save the entry. The estimate is a suggestion you can change, not a diagnosis. Google&apos;s terms apply to
            data sent to Gemini.
          </p>
        </section>

        <section id="deleting" aria-labelledby="deleting-h">
          <h2 id="deleting-h">
            <Icon name="trash" size={20} /> Deleting things
          </h2>
          <p>
            Deleting an entry removes it from the database. Deleting your account removes your account, your entries, your sharing records, and any reviews
            of your record.
          </p>
          <p>Server backups, if the host keeps any, are outside the app&apos;s control.</p>
        </section>

        <section id="claims" aria-labelledby="claims-h">
          <div className="mk-claims">
            <h2 id="claims-h">
              <Icon name="info" size={20} /> What we don&apos;t claim
            </h2>
            <p>
              This is a hackathon prototype. It is not a medical device, it doesn&apos;t diagnose anything, and it has not been audited for health-privacy
              regulations. The database is a single file on the server ({getConfig().isProduction ? "hosted" : "local"}) and is not separately encrypted by
              the app. Demo accounts and their data are fictional.
            </p>
          </div>
        </section>

        <div className="mk-doc-foot">
          <Link href="/" className="btn btn-secondary">
            <Icon name="back" size={18} /> Back home
          </Link>
          {!user && (
            <Link href="/signup" className="btn btn-tonal">
              Create a private diary
            </Link>
          )}
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
