import { LogForm } from "@/components/LogForm";
import { isGeminiConfigured } from "@/lib/config";
import { requirePage } from "@/lib/session";

export const metadata = { title: "Log a movement" };

export default async function LogPage() {
  await requirePage("patient");
  return (
    <main id="main">
      <LogForm aiEnabled={isGeminiConfigured()} />
    </main>
  );
}
