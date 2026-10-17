import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Mascot } from "@/components/Mascot";

export default function NotFound() {
  return (
    <main id="main" className="auth-wrap">
      <div className="auth-card stack center" style={{ alignItems: "center" }}>
        <span className="pill">404</span>
        <Mascot mood="think" size={130} />
        <h1 style={{ fontSize: "var(--t-2xl)" }}>Hmm, nothing here</h1>
        <p className="muted small">This page doesn&apos;t exist, or you don&apos;t have access.</p>
        <Link href="/" className="btn btn-primary" style={{ marginTop: 8 }}>
          <Icon name="home" size={18} /> Back to safety
        </Link>
      </div>
    </main>
  );
}
