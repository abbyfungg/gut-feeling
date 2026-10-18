import { AppBar } from "@/components/AppBar";
import { LogForm } from "@/components/LogForm";
import { isGeminiConfigured } from "@/lib/config";
import { requirePage } from "@/lib/session";

export const metadata = { title: "Log a bathroom trip" };

export default async function LogPage() {
  await requirePage("patient");
  return (
    <main id="main" className="p-main fade-in" style={{ paddingBottom: 0 }}>
      <AppBar title="Log a bathroom trip" back="/me" />
      <LogForm aiEnabled={isGeminiConfigured()} />
    </main>
  );
}
