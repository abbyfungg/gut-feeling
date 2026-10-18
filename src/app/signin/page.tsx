import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { DemoSignIn } from "@/components/DemoSignIn";
import { AuthCard } from "@/components/public/AuthCard";
import { Brand } from "@/components/public/Brand";
import { getConfig } from "@/lib/config";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/seed";
import { currentUser } from "@/lib/session";
import "../marketing.css";

export const metadata = { title: "Sign in" };

export default async function SignIn() {
  const user = await currentUser();
  if (user) redirect(user.role === "patient" ? "/me" : "/care");
  return (
    <div className="mk-page">
      <main id="main" className="mk-auth">
        <Brand />
        <div className="mk-auth-col">
          <AuthCard pose="curious" title="Welcome back" sub="Your gut called. It left notes.">
            <AuthForm mode="signin" />
            <p className="mk-auth-switch">
              New here? <Link href="/signup">Create a private diary</Link>
            </p>
          </AuthCard>

          {getConfig().seedDemoData && (
            <section className="mk-panel" aria-labelledby="demo-title">
              <div className="row between wrap" style={{ gap: 8 }}>
                <h2 id="demo-title">Or try a demo account</h2>
                <span className="badge badge-demo">Fictional people</span>
              </div>
              <DemoSignIn
                stacked
                password={DEMO_PASSWORD}
                accounts={[
                  { label: "Maya", sub: "Patient view", email: DEMO_ACCOUNTS.patient, kind: "patient" },
                  { label: "Nurse Priya", sub: "Care-team view", email: DEMO_ACCOUNTS.practitioner, kind: "care" },
                  { label: "Walter", sub: "Caught-early story", email: DEMO_ACCOUNTS.story, kind: "patient" },
                  { label: "Dr. Okafor", sub: "Second practitioner", email: DEMO_ACCOUNTS.otherPractitioner, kind: "care" },
                ]}
              />
              <p className="tiny faint">
                Synthetic data only. Password for all: <span className="mk-kbd">{DEMO_PASSWORD}</span>
              </p>
            </section>
          )}

          <p className="mk-fine">
            <Link href="/privacy">How we handle your data</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
