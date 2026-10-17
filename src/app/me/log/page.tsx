import Link from "next/link";
import { LogForm } from "@/components/LogForm";
import { Icon } from "@/components/Icon";
import { isGeminiConfigured } from "@/lib/config";
import { requirePage } from "@/lib/session";

export const metadata = { title: "Log a movement" };

export default async function LogPage() {
  await requirePage("patient");
  return (
    <main id="main">
      <div className="container narrow">
        <Link href="/me" className="btn btn-ghost btn-sm" style={{ marginBottom: 8 }}>
          <Icon name="back" size={16} /> Back
        </Link>
        <h1>Log a movement</h1>
        <p className="muted">Only the shape matters, and even that&apos;s optional. Skip anything you&apos;d rather not say.</p>
        <LogForm aiEnabled={isGeminiConfigured()} />
      </div>
    </main>
  );
}
