import Link from "next/link";
import { DemoSignIn } from "@/components/DemoSignIn";
import { Icon } from "@/components/Icon";
import { PublicFooter } from "@/components/public/PublicFooter";
import { PublicNav } from "@/components/public/PublicNav";
import { Womby } from "@/components/Womby";
import { getConfig } from "@/lib/config";
import { GutNudge } from "@/components/patient/GutNudge";
import { PatternChart } from "@/components/patient/PatternChart";
import { getStoryMoment } from "@/lib/story";
import { formatDateTime } from "@/lib/time";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/seed";
import { currentUser } from "@/lib/session";
import "../marketing.css";

export const metadata = { title: "Caught early: Walter's story" };

type Who = "patient" | "app" | "rule" | "clinician" | "outcome";
const STEPS: { day: string; who: Who; title: string; body: string }[] = [
  { day: "Day 1", who: "patient", title: "A new pain medicine", body: "After a hip appointment, Walter starts a new pain medicine. His son logs it as context in Gut Feeling." },
  { day: "Days 2–4", who: "patient", title: "Things get firmer", body: "His usual smooth type 4s turn into type 2s and a type 1, with straining and discomfort. He isn't drinking much." },
  { day: "Day 4", who: "rule", title: "First rule fires", body: "Three hard stools within a week trips the “repeated hard stools” rule. It cites the exact entries, and notes the new medicine as timing only." },
  { day: "Days 5–7", who: "patient", title: "Three quiet days", body: "His son confirms “no movement” three evenings in a row. On day 6: “Says his belly feels hard and full.”" },
  { day: "Days 3–7", who: "app", title: "Womby warns Walter first", body: "Before any nurse looks, Walter's own app shows a calm nudge: his stools went from his usual type 4 to hard lumps, he's straining, and then nothing for three days, with a few things that help and a prompt to call his care team. See exactly what he saw below." },
  { day: "Day 7", who: "rule", title: "It reaches the top of the queue", body: "Consecutive confirmed days with nothing raises a second flag. Nurse Priya sees both in her morning review queue, with the evidence one click away." },
  { day: "Day 8, 9 a.m.", who: "clinician", title: "A phone call, not a wait", body: "Priya calls his son, learns about the medicine and low fluids, and arranges a same-day GP review instead of waiting for next week's visit." },
  { day: "Days 9–14", who: "outcome", title: "Back to his normal", body: "The GP adjusts his plan. With more water and short walks, Walter is back to type 3s and 4s within days. No emergency visit." },
];

const WHAT_IF: { title: string; body: string }[] = [
  { title: "Stool keeps building up", body: "The longer it stays in the bowel, the more water is absorbed and the harder and larger it gets, which makes it even harder to pass." },
  { title: "Faecal impaction", body: "A hard mass forms that can't pass on its own. Watery stool can leak around it, which can look like diarrhoea and be mistaken for the opposite problem." },
  { title: "Knock-on effects in older adults", body: "Pain and pressure can bring loss of appetite, nausea, trouble passing urine, new confusion, and a higher chance of falls." },
  { title: "Bowel obstruction", body: "Severe cramping, a swollen belly and vomiting. This is an emergency that needs hospital care, and sometimes a procedure." },
  { title: "Rarely, damage to the bowel wall", body: "In the most serious cases, prolonged pressure can injure the bowel, which is life-threatening." },
];

const LABEL: Record<Who, { text: string; cls: string; icon: string }> = {
  patient: { text: "Patient-reported", cls: "badge-patient", icon: "user" },
  app: { text: "In Walter's app", cls: "badge-warn", icon: "phone" },
  rule: { text: "Rule-based flag", cls: "badge-rule", icon: "flag" },
  clinician: { text: "Clinician action", cls: "badge-clinician", icon: "check" },
  outcome: { text: "Outcome", cls: "badge-ok", icon: "heart" },
};

export default async function Story() {
  const user = await currentUser();
  const demo = getConfig().seedDemoData;
  const home = user ? (user.role === "patient" ? "/me" : "/care") : null;
  const m = getStoryMoment();
  const tz = getConfig().timezone;
  return (
    <div className="mk-page">
      <div className="mk-top">
        <PublicNav home={home} homeLabel={user?.role === "patient" ? "Open my diary" : "Open my dashboard"} />
        <main id="main" className="mk-container" style={{ paddingBottom: "var(--s-12)" }}>
          <section className="mk-story-head">
            <div className="stack-3">
              <span className="badge badge-demo" style={{ width: "fit-content" }}>
                A fictional demo story · synthetic data
              </span>
              <h1>Caught early: Walter&apos;s story</h1>
              <p className="mk-lede">
                Severe constipation in older adults can end in an emergency room visit. Here is how a few taps a day gave Walter&apos;s nurse a week&apos;s warning instead of a crisis.
              </p>
            </div>
            <Womby pose="encouraging" size={120} />
          </section>

          <ol className="mk-story">
            {STEPS.map((s) => (
              <li key={s.title} className={`mk-story-step ${s.who}`}>
                <span className="mk-story-dot" aria-hidden>
                  <Icon name={LABEL[s.who].icon} size={16} />
                </span>
                <div className="mk-story-card">
                  <div className="row wrap" style={{ gap: 8 }}>
                    <span className="mk-story-day">{s.day}</span>
                    <span className={`badge ${LABEL[s.who].cls}`}>{LABEL[s.who].text}</span>
                  </div>
                  <h2>{s.title}</h2>
                  <p>{s.body}</p>
                </div>
              </li>
            ))}
          </ol>

          {m && (
            <section className="mk-views" aria-labelledby="two-views">
              <div className="stack-2">
                <span className="badge badge-demo" style={{ width: "fit-content" }}>
                  Rebuilt from Walter&apos;s synthetic entries
                </span>
                <h2 id="two-views">Two views of the same week</h2>
                <p className="muted">
                  Left: what Walter&apos;s phone showed him on the evening of day 7, using only the entries logged by then. Right: what Priya saw in her queue the next morning.
                </p>
              </div>
              <div className="mk-views-grid">
                <div className="mk-view">
                  <div className="mk-view-label">
                    <span className="badge badge-patient">
                      <Icon name="phone" /> Walter&apos;s view
                    </span>
                    <span className="small muted">{formatDateTime(m.asOf.toISOString(), tz)}</span>
                  </div>
                  <div className="mk-phone">
                    <div className="mk-phone-screen stack-4">
                      <section className="card stack-2" aria-label="Walter's last two weeks">
                        <strong style={{ fontSize: "var(--fs-15)" }}>Your last two weeks</strong>
                        <PatternChart days={m.pattern.days} usualType={m.pattern.usualType} highlight={m.flags.flatMap((f) => f.evidenceIds)} />
                      </section>
                      <GutNudge firstName={m.patient.name.split(" ")[0]} findings={m.pattern.findings} careTeam={m.careTeam} replay />
                    </div>
                  </div>
                </div>
                <div className="mk-view">
                  <div className="mk-view-label">
                    <span className="badge badge-clinician">
                      <Icon name="clipboard" /> Priya&apos;s view
                    </span>
                    <span className="small muted">Next morning, review queue</span>
                  </div>
                  <div className="mk-queue stack-3">
                    {m.flags.map((f) => (
                      <article key={f.key} className="mk-queue-item">
                        <div className="row wrap" style={{ gap: 6 }}>
                          <span className={`badge ${f.severity === "high" ? "badge-alert" : "badge-warn"}`}>{f.severity === "high" ? "High priority" : "Review"}</span>
                          <span className="badge badge-rule">Rule-based</span>
                        </div>
                        <h3>{f.title}</h3>
                        <p className="small">{f.whatChanged}</p>
                        <p className="tiny muted">
                          {f.evidenceIds.length} cited {f.evidenceIds.length === 1 ? "entry" : "entries"} · {f.ruleDescription}
                        </p>
                      </article>
                    ))}
                    {m.review && (
                      <article className="mk-queue-item reviewed">
                        <span className="badge badge-clinician" style={{ width: "fit-content" }}>
                          <Icon name="check" /> {m.review.practitionerName} · {formatDateTime(m.review.createdAt, tz)}
                        </span>
                        <p className="small">{m.review.note}</p>
                        <p className="tiny muted">Follow-up: {m.review.followUp}</p>
                      </article>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          <section className="mk-story-what-if" aria-labelledby="what-if">
            <span className="badge badge-warn" style={{ width: "fit-content" }}>
              Illustration of known risks · not a prediction
            </span>
            <h2 id="what-if">What could have happened without the early flag</h2>
            <p className="muted">
              Walter&apos;s next planned visit was a week away. Pain medicines like his slow the gut down, so this kind of constipation often doesn&apos;t clear up on its own. If nobody had noticed,
              this is how it can go:
            </p>
            <ol className="mk-whatif">
              {WHAT_IF.map((w) => (
                <li key={w.title}>
                  <strong>{w.title}</strong>
                  <span>{w.body}</span>
                </li>
              ))}
            </ol>
            <p className="small faint">
              These are well-known complications of severe, untreated constipation, especially in older adults. Every person is different, and most constipation is mild. If you&apos;re worried
              about your own symptoms, contact a healthcare provider. For severe belly pain, a swollen belly or repeated vomiting, get urgent care.
            </p>
          </section>

          <section className="mk-story-why">
            <h2>What made the difference</h2>
            <ul className="mk-ticks">
              <li>
                <span className="mk-tick" aria-hidden>
                  <Icon name="check" size={14} strokeWidth={2.25} />
                </span>
                Logging &ldquo;no movement&rdquo; on purpose, so a quiet day counts as information, not a gap.
              </li>
              <li>
                <span className="mk-tick" aria-hidden>
                  <Icon name="check" size={14} strokeWidth={2.25} />
                </span>
                Simple, visible rules that compare Walter with his own normal and show their evidence.
              </li>
              <li>
                <span className="mk-tick" aria-hidden>
                  <Icon name="check" size={14} strokeWidth={2.25} />
                </span>
                A person making the call. Gemini can explain why a flag fired, but only the nurse decides what happens next.
              </li>
            </ul>
            <p className="small faint">
              Walter, his son and Priya are made up, and so is every entry. Gut Feeling is a prototype, not a medical device, and doesn&apos;t diagnose anything.
            </p>
          </section>

          {demo && (
            <section className="mk-demo" aria-labelledby="see-it">
              <div className="stack-3">
                <h2 id="see-it">See it in the app</h2>
                <p className="muted" style={{ maxWidth: "46ch" }}>
                  Walter&apos;s whole diary, the flags and Priya&apos;s review are in the demo. Open it from either side.
                </p>
                <Link href="/" className="link-btn small">
                  <Icon name="back" size={14} /> Back to home
                </Link>
              </div>
              <DemoSignIn
                password={DEMO_PASSWORD}
                accounts={[
                  { label: "I'm Walter", sub: "His diary, on the phone app", email: DEMO_ACCOUNTS.story, kind: "patient" },
                  { label: "I'm Nurse Priya", sub: "The care-team workspace", email: DEMO_ACCOUNTS.practitioner, kind: "care" },
                ]}
              />
            </section>
          )}
        </main>
      </div>
      <PublicFooter />
    </div>
  );
}
