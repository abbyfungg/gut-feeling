import Link from "next/link";
import { Mascot } from "@/components/Mascot";
import { NavLink } from "@/components/NavLink";
import { SignOutButton } from "@/components/SignOutButton";
import { requirePage } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function CareLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePage("practitioner");
  return (
    <div className="area-care">
      <header className="topbar">
        <div className="container topbar-inner">
          <Link href="/care" className="brand">
            <Mascot size={34} bob={false} /> Gut Feeling <span className="brand-tag hide-mobile">Care team</span>
          </Link>
          <nav className="nav desktop-only" aria-label="Main">
            <NavLink href="/care" exact>
              Review queue
            </NavLink>
          </nav>
          <div className="row" style={{ marginLeft: "auto", gap: 10 }}>
            <span className="hint hide-mobile" style={{ textAlign: "right", lineHeight: 1.2 }}>
              <strong style={{ color: "var(--ink)" }}>{user.name}</strong>
              <br />
              {user.title}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>
      {children}
      <footer className="footer">
        <div className="container">
          Gut Feeling care view · prototype using fictional patients · flags come from transparent rules on self-reported data and are prompts for clinical
          judgement, not diagnoses. Not connected to any clinical system.
        </div>
      </footer>
    </div>
  );
}
