import { AppBar } from "@/components/AppBar";
import { BristolArt } from "@/components/BristolArt";
import { Icon } from "@/components/Icon";
import { PrintButton } from "@/components/PrintButton";
import { Womby } from "@/components/Womby";
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
    { v: mv.length, l: "bathroom trips" },
    { v: `${days.size}/14`, l: "days logged" },
    { v: list.filter((e) => e.kind === "no_movement").length, l: "confirmed none" },
    { v: list.filter((e) => e.bloodReport === "yes").length, l: "red/black reports" },
  ];

  return (
    <main id="main" className="p-main fade-in">
      <AppBar title="Visit notes" back="/me/settings" right={<PrintButton />} />
      <div className="stack-6">
        <section className="card row" style={{ gap: "var(--s-4)" }} aria-label="Summary for">
          <div className="grow stack-1">
            <span className="eyebrow">Two-week summary</span>
            <h2 style={{ fontSize: "var(--fs-24)" }}>{user.name}</h2>
            <p className="small muted" style={{ margin: 0 }}>
              {formatDayLabel(start)} to {formatDayLabel(today)}
            </p>
            <div className="row wrap" style={{ gap: 6, marginTop: 4 }}>
              <span className="badge badge-patient">
                <Icon name="user" /> Self-reported
              </span>
              {user.isSynthetic && <span className="badge badge-demo">Fictional demo data</span>}
            </div>
          </div>
          <span className="no-print">
            <Womby pose="encouraging" size={72} />
          </span>
        </section>

        <section className="card stats" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))", rowGap: "var(--s-4)" }} aria-label="At a glance">
          {stats.map((s) => (
            <div key={s.l}>
              <div className="stat-value">{s.v}</div>
              <div className="stat-label">{s.l}</div>
            </div>
          ))}
        </section>
        <p className="tiny faint" style={{ margin: "-12px 4px 0" }}>
          Days with no log are unknown, not &ldquo;none&rdquo;. Colour unsure: {list.filter((e) => e.bloodReport === "unsure").length}.
        </p>

        <section className="card stack-3" aria-labelledby="v-shapes">
          <h2 id="v-shapes" style={{ fontSize: "var(--fs-16)" }}>
            Stool types
          </h2>
          {typed.length ? (
            <div className="row wrap" style={{ gap: 8 }}>
              {BRISTOL.filter((b) => typed.some((e) => e.bristolType === b.type)).map((b) => (
                <span key={b.type} className="chip" aria-pressed="false" style={{ cursor: "default" }}>
                  <BristolArt type={b.type} size={22} /> Type {b.type} <strong>×{typed.filter((e) => e.bristolType === b.type).length}</strong>
                </span>
              ))}
            </div>
          ) : (
            <p className="small muted" style={{ margin: 0 }}>
              None recorded.
            </p>
          )}
          <h3 style={{ fontSize: "var(--fs-15)", marginTop: 4 }}>Symptoms</h3>
          {sym.size ? (
            <div className="row wrap" style={{ gap: 8 }}>
              {[...sym.entries()].map(([s, n]) => (
                <span key={s} className="chip" aria-pressed="false" style={{ cursor: "default" }}>
                  {symptomLabel(s)} <strong>×{n}</strong>
                </span>
              ))}
            </div>
          ) : (
            <p className="small muted" style={{ margin: 0 }}>
              None reported.
            </p>
          )}
          <p className="tiny faint" style={{ margin: 0 }}>
            Answered on {list.filter((e) => e.symptoms !== null).length} logs.
          </p>
        </section>

        {flags.length > 0 && (
          <section className="stack-2" aria-labelledby="v-flags">
            <div className="row between" style={{ padding: "0 4px" }}>
              <h2 id="v-flags" className="eyebrow">
                Patterns Gut Feeling noticed
              </h2>
              <span className="badge badge-rule">Simple rules</span>
            </div>
            <div className="group">
              {flags.map((f) => (
                <div key={f.key} className="item" style={{ alignItems: "flex-start" }}>
                  <span className="item-icon" style={{ background: "var(--butter)", color: "var(--butter-ink)" }}>
                    <Icon name="flag" size={18} />
                  </span>
                  <div className="grow">
                    <div className="item-title">{f.title}</div>
                    <div className="item-sub">{f.whatChanged}</div>
                  </div>
                </div>
              ))}
            </div>
            <p className="tiny faint" style={{ margin: "0 4px" }}>
              From simple rules on my own logs. Not a diagnosis.
            </p>
          </section>
        )}

        {(ctx.length > 0 || notes.length > 0) && (
          <section className="card stack-2" aria-labelledby="v-notes">
            <h2 id="v-notes" style={{ fontSize: "var(--fs-16)" }}>
              Context and notes
            </h2>
            {ctx.map((e) => (
              <div key={`c-${e.id}`} className="small">
                <span className="muted">{formatDateTime(e.occurredAt, tz)}</span> · {e.context!.map(contextLabel).join(", ")}
              </div>
            ))}
            {notes.map((e) => (
              <div key={`n-${e.id}`} className="small">
                <span className="muted">{formatDateTime(e.occurredAt, tz)}</span> &ldquo;{e.notes}&rdquo;
              </div>
            ))}
          </section>
        )}

        <section className="card stack-2" style={{ background: "var(--butter)", borderColor: "transparent" }} aria-labelledby="v-q">
          <h2 id="v-q" style={{ fontSize: "var(--fs-16)" }}>
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
