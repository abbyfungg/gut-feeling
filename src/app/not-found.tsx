import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Brand } from "@/components/public/Brand";
import { Womby } from "@/components/Womby";
import "./marketing.css";

export default function NotFound() {
  return (
    <div className="mk-page">
      <div className="mk-container" style={{ paddingTop: 12 }}>
        <Brand />
      </div>
      <main id="main" className="mk-lost">
        <div className="mk-lost-art">
          <Womby pose="curious" size={112} />
        </div>
        <span className="eyebrow">Page not found</span>
        <h1>Womby looked everywhere.</h1>
        <p>This page doesn&apos;t exist, or you don&apos;t have access to it.</p>
        <Link href="/" className="btn btn-primary btn-lg" style={{ marginTop: 8 }}>
          <Icon name="home" size={18} /> Back to home
        </Link>
      </main>
    </div>
  );
}
