import Link from "next/link";
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
  return (
    <main id="main">
      <div className="container narrow">
        <div className="row between">
          <div>
            <h1>My diary</h1>
            <p className="muted">Every entry, newest first. Only you can delete entries.</p>
          </div>
          <Link href="/me/log" className="btn btn-primary">
            <Icon name="plus" /> Log
          </Link>
        </div>
        {highlight.length > 0 && (
          <p className="notice notice-info" style={{ marginBottom: 16 }}>
            Highlighted: the {highlight.length} {highlight.length === 1 ? "entry" : "entries"} behind that note. <Link href="/me/diary">Clear</Link>
          </p>
        )}
        {entries.length === 0 ? (
          <div className="card" style={{ textAlign: "center" }}>
            <Mascot mood="sleepy" size={110} />
            <h2>Nothing here yet</h2>
            <p className="muted">Your diary fills up as you log. No pressure, Pip is very patient.</p>
            <Link href="/me/log" className="btn btn-primary">
              Log my first one
            </Link>
          </div>
        ) : (
          <div className="card">
            <Timeline entries={entries} timeZone={getConfig().timezone} audience="patient" highlight={highlight} canDelete />
          </div>
        )}
      </div>
    </main>
  );
}
