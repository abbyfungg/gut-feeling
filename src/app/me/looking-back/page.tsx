import Link from "next/link";
import { redirect } from "next/navigation";
import { AppBar } from "@/components/AppBar";
import { Icon } from "@/components/Icon";
import { GutNudge } from "@/components/patient/GutNudge";
import { PatternChart } from "@/components/patient/PatternChart";
import { getConfig } from "@/lib/config";
import { requirePage } from "@/lib/session";
import { getStoryMoment } from "@/lib/story";
import { formatDateTime } from "@/lib/time";

export const metadata = { title: "Last week, in your app" };

/** Walter's demo: a replay of what his own app showed him the evening before the nurse called. */
export default async function LookingBack() {
  const user = await requirePage("patient");
  const m = getStoryMoment(user);
  if (!m) redirect("/me");
  const tz = getConfig().timezone;
  const evidence = m.flags.flatMap((f) => f.evidenceIds);
  const first = user.name.split(" ")[0];
  return (
    <main id="main" className="p-main fade-in">
      <AppBar title="Last week, in your app" back="/me" />
      <div className="stack-6">
        <section className="stack-2">
          <span className="badge badge-demo" style={{ width: "fit-content" }}>
            {m.live ? "Right now · fictional demo story" : "Replay · fictional demo story"}
          </span>
          {m.live ? (
            <p className="small">
              This is what Gut Feeling shows you now, from your own entries. Your care team can see the same entries, and nobody has reviewed them yet.
            </p>
          ) : (
            <p className="small">
              This is what Gut Feeling showed you on <strong>{formatDateTime(m.asOf.toISOString(), tz)}</strong>, built only from the entries you had logged by then. Nobody had
              reviewed anything yet.
            </p>
          )}
        </section>

        <section className="card stack-3" aria-labelledby="two-weeks">
          <div className="row" style={{ justifyContent: "space-between", gap: 8 }}>
            <h2 id="two-weeks" style={{ fontSize: "var(--fs-18)" }}>
              Your last two weeks
            </h2>
            <span className="badge badge-patient">
              <Icon name="user" /> Your entries
            </span>
          </div>
          <PatternChart days={m.pattern.days} usualType={m.pattern.usualType} highlight={evidence} />
        </section>

        <GutNudge firstName={first} findings={m.pattern.findings} careTeam={m.careTeam} replay entriesHref={`/me/entries?highlight=${encodeURIComponent(evidence.join(","))}`} />

        {m.review && (
          <section className="card stack-2" aria-labelledby="next">
            <span className="badge badge-clinician" style={{ width: "fit-content" }}>
              <Icon name="check" /> Next morning
            </span>
            <h2 id="next" style={{ fontSize: "var(--fs-18)" }}>
              {m.review.practitionerName} called the next morning
            </h2>
            <p className="small muted">{formatDateTime(m.review.createdAt, tz)}</p>
            <p className="small">{m.review.note}</p>
            <p className="small muted">Plan: {m.review.followUp}</p>
            <p className="small">Within a few days you were back to your usual type 3s and 4s.</p>
            <Link href="/story" className="link-btn small">
              See the whole story, including what {m.review.practitionerName.split(" ")[0]} saw <Icon name="arrow" size={14} />
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}
