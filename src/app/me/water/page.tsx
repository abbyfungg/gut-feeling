import { AppBar } from "@/components/AppBar";
import { WaterPanel } from "@/components/patient/WaterPanel";
import { WaterInsight } from "@/components/WaterInsight";
import { getConfig, isGeminiConfigured } from "@/lib/config";
import { getPairing } from "@/lib/device";
import { hydrationSummary } from "@/lib/hydration";
import { requirePage } from "@/lib/session";
import { localDay } from "@/lib/time";

export const metadata = { title: "Water" };
export const dynamic = "force-dynamic";

export default async function WaterPage() {
  const user = await requirePage("patient");
  return (
    <main id="main" className="p-main fade-in">
      <AppBar title="Water" back="/me" />
      <WaterPanel
        initial={hydrationSummary(user, user.id)}
        initialPairing={getPairing(user)}
        today={localDay(new Date(), getConfig().timezone)}
        insight={<WaterInsight endpoint="/api/hydration/insight" aiEnabled={isGeminiConfigured()} audience="patient" />}
      />
    </main>
  );
}
