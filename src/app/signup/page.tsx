import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { Icon } from "@/components/Icon";
import { Mascot } from "@/components/Mascot";
import { currentUser } from "@/lib/session";

export const metadata = { title: "Start your diary" };

export default async function SignUp() {
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
            <Mascot mood="celebrate" size={88} />
            <h1 style={{ fontSize: "var(--t-2xl)" }}>It&apos;s okay to talk about poop here.</h1>
            <span className="pill pill-ok">
              <Icon name="lock" size={12} /> Private until you share
            </span>
          </div>
          <AuthForm mode="signup" />
          <p className="small center muted">
            Already have one?{" "}
            <Link href="/signin" className="bold" style={{ color: "var(--ink)" }}>
              Sign in
            </Link>
          </p>
        </div>
        <p className="tiny faint center">
          Hackathon prototype — please don&apos;t use it for real medical records.{" "}
          <Link href="/privacy" className="link tiny">
            Privacy
          </Link>
        </p>
      </div>
    </main>
  );
}
