import Link from "next/link";
import { Icon } from "@/components/Icon";
import { PixelScene } from "@/components/PixelScene";
import { Womby } from "@/components/Womby";
import { entryTitle } from "@/components/patient/EntryList";
import { getEntry } from "@/lib/records";
import { requirePage } from "@/lib/session";
import type { Entry } from "@/lib/domain";

export const metadata = { title: "Logged" };

export default async function Saved({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const user = await requirePage("patient");
  const { id } = await searchParams;
  let entry: Entry | null = null;
  try {
    entry = id ? getEntry(user, id) : null;
  } catch {
    entry = null;
  }
  return (
    <main id="main" className="p-main fade-in" style={{ paddingTop: "var(--s-6)" }}>
      <div className="stack-6">
        <section className="success" aria-labelledby="saved-title">
          <div className="stack-2 center" style={{ position: "relative", zIndex: 1, alignItems: "center", padding: "0 var(--s-6)" }}>
            <h1 id="saved-title" style={{ fontSize: "var(--fs-32)" }}>
              Logged!
            </h1>
            <p className="muted" style={{ maxWidth: "30ch" }}>
              {entry ? `${entryTitle(entry)} is saved to your diary.` : "Your entry is saved to your diary."} Thanks for checking in.
            </p>
          </div>
          <div style={{ position: "relative", zIndex: 1, marginTop: "var(--s-4)" }}>
            <Womby pose="celebrate" size={128} label="Womby celebrating" bob />
          </div>
          <div aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
            <PixelScene height={30} seed={5} />
          </div>
        </section>
        <div className="stack-2">
          {entry && (
            <Link href={`/me/entries/${entry.id}`} className="btn btn-primary btn-lg btn-block">
              View my entry
            </Link>
          )}
          <Link href="/me" className={`btn ${entry ? "btn-secondary" : "btn-primary"} btn-lg btn-block`}>
            <Icon name="home" size={18} /> Back to home
          </Link>
          <Link href="/me/log" className="btn btn-ghost btn-block">
            <Icon name="plus" size={18} /> Log another
          </Link>
        </div>
      </div>
    </main>
  );
}
