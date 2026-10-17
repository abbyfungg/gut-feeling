import { AppBar } from "@/components/AppBar";
import { BristolArt } from "@/components/BristolArt";
import { Icon } from "@/components/Icon";
import { Mascot } from "@/components/Mascot";
import { PrintButton } from "@/components/PrintButton";
import { getConfig } from "@/lib/config";
import { BRISTOL, contextLabel, symptomLabel } from "@/lib/domain";
import { getPatientOverview } from "@/lib/records";
import { requirePage } from "@/lib/session";
import { addDays, formatDateTime, formatDayLabel, localDay } from "@/lib/time";

export const metadata = { title: "Visit notes" };

/** A deterministic, printable two-week summary the person can bring to an appointment. */
export default async function Visit() {
  const user = await requirePage("patient");
  const tz = getConfig().timezone;
  const now = new Date();
  const o = getPatientOverview(user, user.id, now);
  const today = localDay(now, tz);
  const start = addDays(today, -13);
  const list = o.entries.filter((e) => localDay(e.occurredAt, tz) >= start);
  const mv = list.filter((e) => e.kind === "movement");
  const typed = mv.filter((e) => e.bristolType != null);
  const days = new Set(list.map((e) => localDay(e.occurredAt, tz)));
  const sym = new Map<string, number>();
  for (const e of list) for (const s of e.symptoms ?? []) sym.set(s, (sym.get(s) ?? 0) + 1);
  const ctx = list.filter((e) => e.context?.length);
  const notes = list.filter((e) => e.notes);
  const flags = o.flags.filter((f) => localDay(f.windowEnd, tz) >= start);

  const stats = [
    { v: mv.length, l: "logs", tint: "tint-butter" },
    { v: `${days.size}/14`, l: "days logged", tint: "tint-sky" },
    { v: list.filter((e) => e.kind === "no_movement").length, l: "confirmed none", tint: "tint-lavender" },
    { v: list.filter((e) => e.bloodReport === "yes").length, l: "red/black reports", tint: "tint-blush" },
  ];

  return (
    <main id="main" className="screen">
      <AppBar title="Visit notes" back="/me/sharing" right={<PrintButton />} />
      <div className="stack-lg">
        <section className="hero-card" aria-label="Summary for">
          <div className="hero-body stack-sm" style={{ maxWidth: "70%" }}>
            <span className="eyebrow">Two-week summary</span>
            <h2 className="hero-title" style={{ fontSize: "var(--t-xl)" }}>
              {user.name}
            </h2>
            <p className="small" style={{ margin: 0, color: "var(--ink-2)" }}>
              {formatDayLabel(start)} to {formatDayLabel(today)}
            </p>
            <span className="glass-chip" style={{ alignSelf: "flex-start" }}>
              Self-reported{user.isSynthetic ? " · fictional demo data" : ""}
            </span>
          </div>
          <div className="hero-mascot">
            <Mascot mood="happy" size={110} bob={false} />
          </div>
        </section>

        <section className="grid-2" aria-label="At a glance">
          {stats.map((s) => (
            <div key={s.l} className={`card stat ${s.tint}`} style={{ border: 0, padding: 14 }}>
              <span className="stat-value">{s.v}</span>
              <span className="stat-label">{s.l}</span>
            </div>
          ))}
        </section>
        <p className="tiny muted" style={{ margin: "-10px 4px 0" }}>
          Days with no log are unknown, not &ldquo;none&rdquo;. Colour unsure: {list.filter((e) => e.bloodReport === "unsure").length}.
        </p>

        <section className="card stack-sm" aria-labelledby="v-shapes">
          <h2 id="v-shapes" style={{ fontSize: "var(--t-lg)" }}>
            Shapes
          </h2>
          {typed.length ? (
            <div className="row wrap" style={{ gap: 8 }}>
              {BRISTOL.filter((b) => typed.some((e) => e.bristolType === b.type)).map((b) => (
                <span key={b.type} className="pill" style={{ height: "auto", padding: "6px 10px" }}>
                  <BristolArt type={b.type} size={28} /> Type {b.type} <strong>×{typed.filter((e) => e.bristolType === b.type).length}</strong>
                </span>
              ))}
            </div>
          ) : (
            <p className="small muted" style={{ margin: 0 }}>
              None recorded.
            </p>
          )}
          <h3 style={{ fontSize: "var(--t-md)", marginTop: 8 }}>Symptoms</h3>
          {sym.size ? (
            <div className="chips">
              {[...sym.entries()].map(([s, n]) => (
                <span key={s} className="pill">
                  {symptomLabel(s)} <strong>×{n}</strong>
                </span>
              ))}
            </div>
          ) : (
            <p className="small muted" style={{ margin: 0 }}>
              None reported.
            </p>
          )}
          <p className="tiny muted" style={{ margin: 0 }}>
            Answered on {list.filter((e) => e.symptoms !== null).length} logs.
          </p>
        </section>

        {flags.length > 0 && (
          <section className="stack-sm" aria-labelledby="v-flags">
            <div className="section-head">
              <h2 id="v-flags">Things Gut Feeling noticed</h2>
            </div>
            <div className="list">
              {flags.map((f) => (
                <div key={f.key} className="list-row">
                  <div className="row-main" style={{ cursor: "default", alignItems: "flex-start" }}>
                    <span className={`insight-icon ${f.severity}`} aria-hidden style={{ width: 36, height: 36, borderRadius: 12 }}>
                      <Icon name="alert" size={18} />
                    </span>
                    <div className="grow">
                      <div className="row-title">{f.title}</div>
                      <div className="small muted">{f.whatChanged}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="tiny muted" style={{ margin: "0 4px" }}>
              From simple rules on my own logs. Not a diagnosis.
            </p>
          </section>
        )}

        {(ctx.length > 0 || notes.length > 0) && (
          <section className="card stack-sm" aria-labelledby="v-notes">
            <h2 id="v-notes" style={{ fontSize: "var(--t-lg)" }}>
              Context and notes
            </h2>
            {ctx.map((e) => (
              <div key={`c-${e.id}`} className="small">
                <span className="muted">{formatDateTime(e.occurredAt, tz)}</span> · {e.context!.map(contextLabel).join(", ")}
              </div>
            ))}
            {notes.map((e) => (
              <div key={`n-${e.id}`} className="small">
                <span className="muted">{formatDateTime(e.occurredAt, tz)}</span> <span className="quote">&ldquo;{e.notes}&rdquo;</span>
              </div>
            ))}
          </section>
        )}

        <section className="card tint-butter stack-sm" style={{ border: 0 }} aria-labelledby="v-q">
          <h2 id="v-q" style={{ fontSize: "var(--t-lg)" }}>
            Questions to ask
          </h2>
          {["Is this pattern worth watching, or acting on?", "Could my medicines or recent changes be relevant?", "What should make me call sooner?"].map((q) => (
            <div key={q} className="row top small" style={{ gap: 8 }}>
              <Icon name="chevron" size={16} /> {q}
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
