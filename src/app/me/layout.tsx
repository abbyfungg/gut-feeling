import { TabBar } from "@/components/TabBar";
import { Womby } from "@/components/Womby";
import { requirePage } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * The patient side is a phone app. On a phone it fills the screen; on a wider screen it is shown
 * inside a phone-sized device so it looks and behaves the same way it would in your hand.
 */
export default async function PatientLayout({ children }: { children: React.ReactNode }) {
  await requirePage("patient");
  return (
    <div className="p-shell">
      <aside className="p-desk-note" aria-label="About the app">
        <Womby pose="wave" size={88} />
        <h2>Gut Feeling is made for your phone.</h2>
        <p>Open this page on your phone and choose &ldquo;Add to Home Screen&rdquo;. It installs like an app, with no app store.</p>
        <p className="small faint">Care teams use the full-screen web workspace instead.</p>
      </aside>
      <div className="p-device">
        <div className="p-screen">{children}</div>
        <TabBar />
      </div>
    </div>
  );
}
