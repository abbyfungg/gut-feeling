import Link from "next/link";
import { AppBar } from "@/components/AppBar";
import { Icon } from "@/components/Icon";
import { Mascot } from "@/components/Mascot";
import { Timeline } from "@/components/Timeline";
import { getConfig } from "@/lib/config";
import { listEntries } from "@/lib/records";
import { requirePage } from "@/lib/session";

export const metadata = { title: "My diary" };

export default async function Diary({ searchParams }: { searchParams: Promise<{ highlight?: string }> }) {
  const user = await requirePage("patient");
  const sp = await searchParams;
  const entries = listEntries(user, user.id);
  const highlight = (sp.highlight ?? "").split(",").filter(Boolean).slice(0, 50);
  const movements = entries.filter((e) => e.kind === "movement").length;
  return (
    <main id="main" className="screen">
      <AppBar
        title="My diary"
        eyebrow={entries.length ? `${movements} logs` : undefined}
        right={
          <Link href="/me/log" className="btn btn-primary btn-sm" aria-label="Log a new movement">
            <Icon name="plus" size={18} /> Log
          </Link>
        }
      />
      <div className="stack">
        {highlight.length > 0 && (
          <div className="notice notice-info row between">
            <span>
              Showing the {highlight.length} {highlight.length === 1 ? "log" : "logs"} behind that note
            </span>
            <Link href="/me/diary" className="link">
              Clear
            </Link>
          </div>
        )}
        {entries.length === 0 ? (
          <div className="card pad-lg stack center" style={{ alignItems: "center" }}>
            <Mascot mood="sleepy" size={110} />
            <h2>Nothing here yet</h2>
            <p className="muted small" style={{ margin: 0 }}>
              Pip is very patient.
            </p>
            <Link href="/me/log" className="btn btn-primary">
              Log my first one
            </Link>
          </div>
        ) : (
          <>
            <p className="tiny muted" style={{ margin: "0 4px" }}>
              Tap a log for details. Only you can delete logs.
            </p>
            <Timeline entries={entries} timeZone={getConfig().timezone} audience="patient" highlight={highlight} canDelete />
          </>
        )}
      </div>
    </main>
  );
}
