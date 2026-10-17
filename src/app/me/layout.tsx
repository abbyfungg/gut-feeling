import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Mascot } from "@/components/Mascot";
import { NavLink } from "@/components/NavLink";
import { SignOutButton } from "@/components/SignOutButton";
import { requirePage } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function PatientLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePage("patient");
  return (
    <div className="area-patient">
      <header className="topbar">
        <div className="container topbar-inner">
          <Link href="/me" className="brand">
            <Mascot size={34} bob={false} /> Gut Feeling
          </Link>
          <nav className="nav desktop-only" aria-label="Main">
            <NavLink href="/me" exact>
              Home
            </NavLink>
            <NavLink href="/me/diary">Diary</NavLink>
            <NavLink href="/me/trends">Patterns</NavLink>
            <NavLink href="/me/sharing">Sharing &amp; privacy</NavLink>
          </nav>
          <div className="row" style={{ marginLeft: "auto", gap: 6 }}>
            {user.isSynthetic && <span className="pill pill-synthetic hide-mobile">Demo account</span>}
            <SignOutButton />
          </div>
        </div>
      </header>
      {children}
      <nav className="bottom-nav" aria-label="Main">
        <NavLink href="/me" exact>
          <Icon name="home" />
          Home
        </NavLink>
        <NavLink href="/me/log">
          <Icon name="plus" />
          Log
        </NavLink>
        <NavLink href="/me/diary">
          <Icon name="book" />
          Diary
        </NavLink>
        <NavLink href="/me/sharing">
          <Icon name="shield" />
          Sharing
        </NavLink>
      </nav>
    </div>
  );
}
