import { AppBar } from "@/components/AppBar";
import { LogForm } from "@/components/LogForm";
import { isGeminiConfigured } from "@/lib/config";
import { getOwnSession, pendingSession, type DeviceSession } from "@/lib/device";
import { requirePage } from "@/lib/session";

export const metadata = { title: "Log a bathroom trip" };

export default async function LogPage({ searchParams }: { searchParams: Promise<{ squeeze?: string }> }) {
  const user = await requirePage("patient");
  const sp = await searchParams;
  let squeeze: DeviceSession | null = null;
  try {
    squeeze = sp.squeeze ? getOwnSession(user, sp.squeeze) : pendingSession(user);
  } catch {
    squeeze = null;
  }
  if (squeeze && squeeze.status !== "ended" && squeeze.status !== "live") squeeze = null;
  return (
    <main id="main" className="p-main fade-in" style={{ paddingBottom: 0 }}>
      <AppBar title="Log a bathroom trip" back="/me" />
      <LogForm
        aiEnabled={isGeminiConfigured()}
        demo={user.isSynthetic}
        squeeze={squeeze && { id: squeeze.id, source: squeeze.source, peakEffort: squeeze.peakEffort, durationMs: squeeze.durationMs, squeezes: squeeze.squeezes, startedAt: squeeze.startedAt }}
      />
    </main>
  );
}
