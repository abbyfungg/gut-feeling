import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { Mascot } from "@/components/Mascot";
import { currentUser } from "@/lib/session";

export const metadata = { title: "Start your diary" };

export default async function SignUp() {
  const user = await currentUser();
  if (user) redirect(user.role === "patient" ? "/me" : "/care");
  return (
    <main id="main" className="container narrow" style={{ paddingTop: 40 }}>
      <Link href="/" className="brand">
        <Mascot size={34} bob={false} /> Gut Feeling
      </Link>
      <div className="card" style={{ marginTop: 20 }}>
        <div className="row" style={{ gap: 16, marginBottom: 12 }}>
          <Mascot mood="celebrate" size={80} />
          <div>
            <h1 style={{ fontSize: "1.9rem", marginBottom: 2 }}>It&apos;s okay to talk about poop here.</h1>
            <p className="muted" style={{ margin: 0 }}>
              Your diary is private. Nobody sees it unless you turn sharing on.
            </p>
          </div>
        </div>
        <AuthForm mode="signup" />
        <p className="hint" style={{ marginTop: 14 }}>
          This is a hackathon prototype. Please don&apos;t use it for real medical records. <Link href="/privacy">How we handle data</Link>
        </p>
        <p>
          Already have one? <Link href="/signin">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
