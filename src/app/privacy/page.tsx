export const dynamic = "force-dynamic";

import Link from "next/link";
import { Mascot } from "@/components/Mascot";
import { getConfig, isGeminiConfigured } from "@/lib/config";

export const metadata = { title: "Privacy, in plain English" };

export default function Privacy() {
  const ai = isGeminiConfigured();
  return (
    <main id="main" className="container narrow" style={{ paddingTop: 32 }}>
      <Link href="/" className="brand">
        <Mascot size={34} bob={false} /> Gut Feeling
      </Link>
      <div className="stack-lg" style={{ marginTop: 20 }}>
        <div>
          <h1>Privacy, in plain English</h1>
          <p className="muted">What this prototype actually does with your information. No fine print, no fancy claims.</p>
        </div>
        <section className="card">
          <h2>What we store</h2>
          <ul>
            <li>Your account: name, email and a scrambled (hashed) password.</li>
            <li>Your diary entries: time, stool type, and only the extras you choose to add (symptoms, context, notes).</li>
            <li>If you share with a care-team member: when you turned sharing on or off, and any reviews they record.</li>
          </ul>
        </section>
        <section className="card">
          <h2>Photos</h2>
          <p>
            Photos are optional. If photo help is switched on, your photo is sent to Google&apos;s Gemini API to estimate a stool type, held in memory
            for that one request, and then discarded. <strong>We never save the photo</strong> to disk or to the database. We keep only the
            structured result (for example &ldquo;type 4, medium confidence&rdquo;), and only if you save the entry.
          </p>
          <p className="muted">
            Photo help on this server: <strong>{ai ? "switched on (Gemini API)" : "switched off; manual entry only"}</strong>. Google&apos;s own terms
            apply to data sent to the Gemini API.
          </p>
        </section>
        <section className="card">
          <h2>Who can see your diary</h2>
          <ul>
            <li>You.</li>
            <li>A care-team member, only while you have sharing turned on for them. You can switch it off any time, and access stops right away.</li>
            <li>The server checks this on every request; changing a link or ID doesn&apos;t get anyone in.</li>
          </ul>
        </section>
        <section className="card">
          <h2>Deleting things</h2>
          <p>
            Deleting an entry removes it from the database. Deleting your account removes your account, entries, sharing records and reviews of your
            record. Server backups, if whoever hosts this keeps any, are outside the app&apos;s control.
          </p>
        </section>
        <section className="card peach">
          <h2>What we don&apos;t claim</h2>
          <p style={{ marginBottom: 0 }}>
            This is a hackathon prototype. It is not a medical device, it doesn&apos;t diagnose anything, and it hasn&apos;t been audited for health-privacy
            regulations. The database is a single file on the server ({getConfig().isProduction ? "hosted" : "local"}) and is not separately encrypted by the app.
            Demo accounts and their data are fictional.
          </p>
        </section>
      </div>
    </main>
  );
}
