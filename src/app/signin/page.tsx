import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { DemoSignIn } from "@/components/DemoSignIn";
import { Mascot } from "@/components/Mascot";
import { getConfig } from "@/lib/config";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/seed";
import { currentUser } from "@/lib/session";

export const metadata = { title: "Sign in" };

export default async function SignIn() {
  const user = await currentUser();
  if (user) redirect(user.role === "patient" ? "/me" : "/care");
  return (
    <main id="main" className="container narrow" style={{ paddingTop: 40 }}>
      <Link href="/" className="brand">
        <Mascot size={34} bob={false} /> Gut Feeling
      </Link>
      <div className="card" style={{ marginTop: 20 }}>
        <div className="row" style={{ gap: 16, marginBottom: 12 }}>
          <Mascot mood="wave" size={80} />
          <div>
            <h1 style={{ fontSize: "1.9rem", marginBottom: 2 }}>Welcome back</h1>
            <p className="muted" style={{ margin: 0 }}>
              Your gut called. It left some notes.
            </p>
          </div>
        </div>
        <AuthForm mode="signin" />
        <p style={{ marginTop: 16 }}>
          New here? <Link href="/signup">Start a diary</Link>
        </p>
      </div>
      {getConfig().seedDemoData && (
        <div className="card butter flat" style={{ marginTop: 18 }}>
          <h2 style={{ fontSize: "1.15rem" }}>Demo accounts (fictional people)</h2>
          <DemoSignIn
            password={DEMO_PASSWORD}
            accounts={[
              { label: "Maya (patient)", sub: "patient view", email: DEMO_ACCOUNTS.patient, kind: "patient" },
              { label: "Nurse Priya (care team)", sub: "care-team view", email: DEMO_ACCOUNTS.practitioner, kind: "care" },
              { label: "Dr. Okafor (care team)", sub: "second practitioner", email: DEMO_ACCOUNTS.otherPractitioner, kind: "care" },
            ]}
          />
          <p className="hint" style={{ marginTop: 10, marginBottom: 0 }}>
            Demo password for all of them: <span className="kbd">{DEMO_PASSWORD}</span>
          </p>
        </div>
      )}
    </main>
  );
}
