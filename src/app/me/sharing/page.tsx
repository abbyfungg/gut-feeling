import Link from "next/link";
import { DeleteAccount } from "@/components/DeleteAccount";
import { Mascot } from "@/components/Mascot";
import { ShareToggle } from "@/components/ShareToggle";
import { getConfig, isGeminiConfigured } from "@/lib/config";
import { listReviewsForPatient, listSharing } from "@/lib/records";
import { requirePage } from "@/lib/session";
import { formatDateTime } from "@/lib/time";

export const metadata = { title: "Sharing & privacy" };

export default async function Sharing() {
  const user = await requirePage("patient");
  const tz = getConfig().timezone;
  const shares = listSharing(user);
  const reviews = listReviewsForPatient(user);
  return (
    <main id="main">
      <div className="container narrow stack-lg">
        <div className="row" style={{ gap: 16 }}>
          <Mascot mood="calm" size={80} />
          <div>
            <h1 style={{ marginBottom: 4 }}>Sharing &amp; privacy</h1>
            <p className="muted" style={{ margin: 0 }}>
              Your diary is yours. Here&apos;s exactly who can see it.
            </p>
          </div>
        </div>

        <section className="card">
          <h2>Who can see my diary</h2>
          <p className="hint">
            When sharing is on, that person can see all your entries, notes and the patterns Gut Feeling spots, and can record that they reviewed them.
            Turn it off and their access stops immediately. They can&apos;t edit or delete your entries.
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }} className="stack">
            {shares.map((s) => (
              <li key={s.practitioner.id} className="card tight flat row between" style={{ alignItems: "flex-start" }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <strong>{s.practitioner.name}</strong>
                  <div className="muted">
                    {s.practitioner.title} · {s.practitioner.organization}
                  </div>
                  {s.practitioner.about && <div className="hint">{s.practitioner.about}</div>}
                  <div className="hint" style={{ marginTop: 4 }}>
                    {s.status === "active" && s.grantedAt && `Sharing since ${formatDateTime(s.grantedAt, tz)}`}
                    {s.status === "revoked" && s.revokedAt && `You stopped sharing on ${formatDateTime(s.revokedAt, tz)}`}
                    {s.status === "never" && "Never shared"}
                  </div>
                </div>
                <ShareToggle practitionerId={s.practitioner.id} name={s.practitioner.name} active={s.status === "active"} />
              </li>
            ))}
          </ul>
          <p className="hint" style={{ marginTop: 12, marginBottom: 0 }}>
            In this prototype the care-team directory is a fixed list of fictional clinicians.
          </p>
        </section>

        <section className="card">
          <h2>Who has reviewed my diary</h2>
          {reviews.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>
              Nobody has recorded a review yet.
            </p>
          ) : (
            <ul style={{ paddingLeft: 18, margin: 0 }}>
              {reviews.map((r) => (
                <li key={r.id} style={{ marginBottom: 8 }}>
                  <strong>{r.practitionerName}</strong> reviewed &ldquo;{r.flagTitle.toLowerCase()}&rdquo; on {formatDateTime(r.createdAt, tz)}: {r.decisionLabel}.
                  {r.followUpStatus === "open" && " A follow-up is planned."}
                  {r.followUpStatus === "done" && " Follow-up done."}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h2>Photos and AI</h2>
          <p style={{ marginBottom: 0 }}>
            {isGeminiConfigured()
              ? "Photo help is on. If you add a photo, it's sent to Google's Gemini API for a suggestion and then discarded. We never save photos. You can always skip photos and pick a type yourself."
              : "Photo help is off on this server, so no photos are uploaded anywhere."}{" "}
            <Link href="/privacy">Full privacy notes</Link>
          </p>
        </section>

        <section className="card">
          <h2>Delete everything</h2>
          <p className="hint">You can delete single entries from your diary, or everything at once here.</p>
          {user.isSynthetic ? <p className="hint">This is a shared demo account, so deleting it is turned off.</p> : <DeleteAccount />}
        </section>
      </div>
    </main>
  );
}
