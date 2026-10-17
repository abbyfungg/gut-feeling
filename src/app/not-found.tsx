import Link from "next/link";
import { Mascot } from "@/components/Mascot";

export default function NotFound() {
  return (
    <main id="main" className="container narrow" style={{ textAlign: "center", paddingTop: 60 }}>
      <Mascot mood="think" size={140} />
      <h1>Hmm, nothing here</h1>
      <p className="muted">That page doesn&apos;t exist, or you don&apos;t have access to it.</p>
      <Link href="/" className="btn btn-primary">
        Back to safety
      </Link>
    </main>
  );
}
