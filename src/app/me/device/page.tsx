import { AppBar } from "@/components/AppBar";
import { DevicePanel } from "@/components/patient/DevicePanel";
import { currentSession, getPairing } from "@/lib/device";
import { requirePage } from "@/lib/session";

export const metadata = { title: "Squeeze ball" };
export const dynamic = "force-dynamic";

export default async function DevicePage() {
  const user = await requirePage("patient");
  return (
    <main id="main" className="p-main fade-in">
      <AppBar title="Squeeze ball" back="/me/settings" />
      <DevicePanel initialPairing={getPairing(user)} initialSession={currentSession(user)} />
    </main>
  );
}
