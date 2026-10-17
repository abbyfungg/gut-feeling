import Link from "next/link";
import { Suspense } from "react";
import { Avatar } from "@/components/Avatar";
import { CareNav } from "@/components/CareNav";
import { Icon } from "@/components/Icon";
import { Mascot } from "@/components/Mascot";
import { SignOutButton } from "@/components/SignOutButton";
import { getCaseload, listOpenFollowUps } from "@/lib/records";
import { requirePage } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Re-tints the shared ghost button for the dark sidebar / top bar via inherited tokens. */
const onDark = { "--ink-2": "rgba(255,250,244,0.72)", "--ink": "#fff", "--surface-2": "rgba(255,255,255,0.08)" } as React.CSSProperties;

export default async function CareLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePage("practitioner");
  const caseload = getCaseload(user);
  const counts = { queue: caseload.reduce((n, c) => n + c.outstanding.length, 0), followups: listOpenFollowUps(user).length };
  const brand = (
    <Link href="/care" className="brand">
      <span className="brand-mark">
        <Mascot size={30} bob={false} />
      </span>
      Gut Feeling
    </Link>
  );

  return (
    <div className="console">
      <aside className="sidebar">
        {brand}
        <span className="eyebrow" style={{ color: "rgba(255,250,244,0.45)", margin: "0 12px 6px" }}>
          Care team
        </span>
        <Suspense fallback={null}>
          <CareNav variant="side" counts={counts} />
        </Suspense>
        <div className="side-foot">
          <div className="row">
            <Avatar name={user.name} size="sm" />
            <div className="grow">
              <div className="small bold" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user.name}
              </div>
              {user.title && (
                <div className="tiny" style={{ color: "rgba(255,250,244,0.55)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user.title}
                </div>
              )}
            </div>
          </div>
          <span style={onDark}>
            <SignOutButton />
          </span>
          <p className="tiny row top" style={{ color: "rgba(255,250,244,0.5)", gap: 6 }}>
            <Icon name="shield" size={14} />
            <span>Rule-based prompts, not diagnoses. Fictional patients.</span>
          </p>
        </div>
      </aside>

      <div style={{ minWidth: 0 }}>
        <header className="mobile-top">
          {brand}
          <span className="grow" />
          <Avatar name={user.name} size="sm" />
          <span style={onDark}>
            <SignOutButton />
          </span>
        </header>
        <Suspense fallback={null}>
          <CareNav variant="tabs" counts={counts} />
        </Suspense>
        <main id="main" className="console-main">
          {children}
        </main>
      </div>
    </div>
  );
}
