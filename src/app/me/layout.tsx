import { TabBar } from "@/components/TabBar";
import { requirePage } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function PatientLayout({ children }: { children: React.ReactNode }) {
  await requirePage("patient");
  return (
    <div className="app-bg">
      <div className="app">
        {children}
        <TabBar />
      </div>
    </div>
  );
}
