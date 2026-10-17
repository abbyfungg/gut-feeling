import Link from "next/link";
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

  return (
    <main id="main">
      <div className="container narrow stack-lg">
        <div className="row between no-print">
          <Link href="/me" className="btn btn-ghost btn-sm">
            <Icon name="back" size={16} /> Back
          </Link>
          <PrintButton />
        </div>
        <div className="row" style={{ gap: 16 }}>
          <Mascot mood="happy" size={70} bob={false} />
          <div>
            <h1 style={{ marginBottom: 2 }}>Visit notes for {user.name}</h1>
            <p className="muted" style={{ margin: 0 }}>
              {formatDayLabel(start)} to {formatDayLabel(today)} · from my Gut Feeling diary (self-reported)
              {user.isSynthetic ? " · fictional demo data" : ""}
            </p>
          </div>
        </div>

        <section className="card">
          <h2>At a glance</h2>
          <ul>
            <li>
              {mv.length} movements logged, on {days.size} of 14 days. Days with no entry are unknown, not &ldquo;none&rdquo;.
            </li>
            <li>{list.filter((e) => e.kind === "no_movement").length} days confirmed with no movement.</li>
            <li>
              Shapes:{" "}
              {typed.length
                ? BRISTOL.filter((b) => typed.some((e) => e.bristolType === b.type))
                    .map((b) => `type ${b.type} × ${typed.filter((e) => e.bristolType === b.type).length}`)
                    .join(", ")
                : "none recorded"}
              .
            </li>
            <li>
              Symptoms:{" "}
              {sym.size
                ? [...sym.entries()].map(([s, n]) => `${symptomLabel(s).toLowerCase()} × ${n}`).join(", ")
                : "none reported"}{" "}
              (answered on {list.filter((e) => e.symptoms !== null).length} entries).
            </li>
            <li>Red or black colour reported: {list.filter((e) => e.bloodReport === "yes").length} times; unsure: {list.filter((e) => e.bloodReport === "unsure").length}.</li>
          </ul>
        </section>

        {flags.length > 0 && (
          <section className="card">
            <h2>Things Gut Feeling noticed</h2>
            <ul>
              {flags.map((f) => (
                <li key={f.key} style={{ marginBottom: 6 }}>
                  <strong>{f.title}.</strong> {f.whatChanged}
                </li>
              ))}
            </ul>
            <p className="hint" style={{ margin: 0 }}>
              From simple rules on my own entries. Not a diagnosis.
            </p>
          </section>
        )}

        {(ctx.length > 0 || notes.length > 0) && (
          <section className="card">
            <h2>Context and notes</h2>
            <ul>
              {ctx.map((e) => (
                <li key={`c-${e.id}`}>
                  {formatDateTime(e.occurredAt, tz)}: {e.context!.map(contextLabel).join(", ")}
                </li>
              ))}
              {notes.map((e) => (
                <li key={`n-${e.id}`}>
                  {formatDateTime(e.occurredAt, tz)}: &ldquo;{e.notes}&rdquo;
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="card butter">
          <h2>Questions I might ask</h2>
          <ul style={{ marginBottom: 0 }}>
            <li>Is this pattern something to keep an eye on, or something to act on?</li>
            <li>Could any of my medicines or recent changes be relevant?</li>
            <li>What should make me call sooner?</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
