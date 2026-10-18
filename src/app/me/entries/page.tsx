import Link from "next/link";
import { AppBar } from "@/components/AppBar";
import { Icon } from "@/components/Icon";
import { Womby } from "@/components/Womby";
import { EntryList } from "@/components/patient/EntryList";
import { getConfig } from "@/lib/config";
import { listEntries } from "@/lib/records";
import { requirePage } from "@/lib/session";
import { localDay } from "@/lib/time";

export const metadata = { title: "Entries" };

export default async function Entries({ searchParams }: { searchParams: Promise<{ highlight?: string }> }) {
  const user = await requirePage("patient");
  const sp = await searchParams;
  const tz = getConfig().timezone;
  const entries = listEntries(user, user.id);
  const highlight = (sp.highlight ?? "").split(",").filter(Boolean).slice(0, 50);
  const shown = highlight.length ? entries.filter((e) => highlight.includes(e.id)) : entries;
  const movements = entries.filter((e) => e.kind === "movement").length;
  return (
    <main id="main" className="p-main fade-in">
      <AppBar
        title="Entries"
        large
        right={
          entries.length > 0 && (
            <Link href="/me/log" className="btn btn-tonal btn-sm" aria-label="Log a bathroom trip">
              <Icon name="plus" size={16} /> Log
            </Link>
          )
        }
      />
      <div className="stack-6">
        {highlight.length > 0 && (
          <div className="notice notice-info between" role="status">
            <span>
              Showing the {shown.length} {shown.length === 1 ? "entry" : "entries"} behind that pattern.
            </span>
            <Link href="/me/entries" className="link-btn small">
              Show all
            </Link>
          </div>
        )}
        {entries.length === 0 ? (
          <section className="card empty">
            <Womby pose="sleepy" size={96} label="Womby napping" />
            <h2>No entries yet</h2>
            <p>Womby&apos;s having a nap until your first log. It only takes a few taps.</p>
            <Link href="/me/log" className="btn btn-primary">
              <Icon name="plus" size={18} /> Log a bathroom trip
            </Link>
          </section>
        ) : (
          <>
            {!highlight.length && (
              <p className="small faint" style={{ margin: "0 4px" }}>
                {movements} {movements === 1 ? "bathroom trip" : "bathroom trips"} logged. Tap one for details.
              </p>
            )}
            <EntryList entries={shown} timeZone={tz} today={localDay(new Date(), tz)} highlight={highlight} />
          </>
        )}
      </div>
    </main>
  );
}
