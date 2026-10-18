import Link from "next/link";
import { Suspense } from "react";
import { Avatar } from "@/components/Avatar";
import { CareNav } from "@/components/CareNav";
import { Icon } from "@/components/Icon";
import { SignOutButton } from "@/components/SignOutButton";
import { Womby } from "@/components/Womby";
import { getCaseload, listOpenFollowUps } from "@/lib/records";
import { requirePage } from "@/lib/session";
import "./care.css";

export const dynamic = "force-dynamic";

export default async function CareLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePage("practitioner");
  const caseload = getCaseload(user);
  const counts = { queue: caseload.reduce((n, c) => n + c.outstanding.length, 0), followups: listOpenFollowUps(user).length };
  const brand = (
    <Link href="/care" className="care-brand" aria-label="Gut Feeling care team, review queue">
      <span className="care-brand-mark">
        <Womby pose="happy" size={28} />
      </span>
      <span>
        <span className="care-brand-name">Gut Feeling</span>
        <span className="care-brand-sub">Care team</span>
      </span>
    </Link>
  );

  return (
    <div className="care-app">
      <aside className="care-side" aria-label="Care team navigation">
        {brand}
        <Suspense fallback={null}>
          <CareNav variant="side" counts={counts} />
        </Suspense>
        <div className="care-side-foot">
          <div className="row" style={{ gap: 10 }}>
            <Avatar name={user.name} />
            <div className="grow">
              <div className="small strong truncate">{user.name}</div>
              {(user.title || user.organization) && <div className="tiny faint truncate">{[user.title, user.organization].filter(Boolean).join(" · ")}</div>}
            </div>
          </div>
          <SignOutButton />
          <p className="care-note">
            <Icon name="shield" size={14} />
            <span>Rule-based prompts, not diagnoses.</span>
          </p>
        </div>
      </aside>

      <div className="care-main">
        <header className="care-mtop">
          {brand}
          <span className="grow" />
          <SignOutButton />
        </header>
        <Suspense fallback={null}>
          <CareNav variant="tabs" counts={counts} />
        </Suspense>
        <main id="main" className="care-main">
          {children}
        </main>
      </div>
    </div>
  );
}
