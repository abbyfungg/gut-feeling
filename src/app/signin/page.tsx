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
    <main id="main" className="auth-wrap">
      <div className="stack-lg" style={{ width: "100%", maxWidth: 420 }}>
        <Link href="/" className="brand" style={{ alignSelf: "center" }}>
          <span className="brand-mark">
            <Mascot size={30} bob={false} />
          </span>
          Gut Feeling
        </Link>
        <div className="auth-card stack-lg">
          <div className="stack center" style={{ alignItems: "center" }}>
            <Mascot mood="wave" size={88} />
            <h1 style={{ fontSize: "var(--t-2xl)" }}>Welcome back</h1>
            <p className="muted small">Your gut called. It left notes.</p>
          </div>
          <AuthForm mode="signin" />
          <p className="small center muted">
            New here?{" "}
            <Link href="/signup" className="bold" style={{ color: "var(--ink)" }}>
              Start a diary
            </Link>
          </p>
        </div>
        {getConfig().seedDemoData && (
          <div className="card tint-butter flat stack">
            <div className="row between wrap">
              <h2 style={{ fontSize: "var(--t-lg)" }}>Try a demo account</h2>
              <span className="pill pill-synthetic">Fictional people</span>
            </div>
            <DemoSignIn
              stacked
              password={DEMO_PASSWORD}
              accounts={[
                { label: "Maya", sub: "Patient view", email: DEMO_ACCOUNTS.patient, kind: "patient" },
                { label: "Nurse Priya", sub: "Care-team view", email: DEMO_ACCOUNTS.practitioner, kind: "care" },
                { label: "Dr. Okafor", sub: "Second practitioner", email: DEMO_ACCOUNTS.otherPractitioner, kind: "care" },
              ]}
            />
            <p className="tiny muted">
              Password for all: <span className="kbd">{DEMO_PASSWORD}</span>
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
