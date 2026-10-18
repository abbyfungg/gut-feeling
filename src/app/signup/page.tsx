import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { Icon } from "@/components/Icon";
import { AuthCard } from "@/components/public/AuthCard";
import { Brand } from "@/components/public/Brand";
import { currentUser } from "@/lib/session";
import "../marketing.css";

export const metadata = { title: "Start your diary" };

export default async function SignUp() {
  const user = await currentUser();
  if (user) redirect(user.role === "patient" ? "/me" : "/care");
  return (
    <div className="mk-page">
      <main id="main" className="mk-auth">
        <Brand />
        <div className="mk-auth-col">
          <AuthCard
            pose="wave"
            title="Start your private diary"
            sub={
              <>
                It&apos;s okay to talk about poop here.
                <br />
                <span className="mk-assure" style={{ marginTop: 6 }}>
                  <Icon name="lock" size={14} /> Private until you choose to share.
                </span>
              </>
            }
          >
            <AuthForm mode="signup" />
            <p className="mk-auth-switch">
              Already have a diary? <Link href="/signin">Sign in</Link>
            </p>
          </AuthCard>
          <p className="mk-fine">
            Hackathon prototype. Please don&apos;t use it for real medical records. <Link href="/privacy">Privacy</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
