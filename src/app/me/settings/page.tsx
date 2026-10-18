import Link from "next/link";
import { AppBar, initials } from "@/components/AppBar";
import { DeleteAccount } from "@/components/DeleteAccount";
import { Icon } from "@/components/Icon";
import { InstallApp } from "@/components/InstallApp";
import { SignOutButton } from "@/components/SignOutButton";
import { ThemePicker } from "@/components/ThemePicker";
import { isGeminiConfigured } from "@/lib/config";
import { listSharing } from "@/lib/records";
import { requirePage } from "@/lib/session";

export const metadata = { title: "More" };

function LinkItem({ href, icon, title, sub, tint }: { href: string; icon: string; title: string; sub?: string; tint?: string }) {
  return (
    <Link href={href} className="item">
      <span className="item-icon" style={tint ? { background: `var(--${tint})`, color: `var(--${tint}-ink)` } : undefined}>
        <Icon name={icon} size={18} />
      </span>
      <span className="grow" style={{ minWidth: 0 }}>
        <span className="item-title" style={{ display: "block" }}>
          {title}
        </span>
        {sub && <span className="item-sub">{sub}</span>}
      </span>
      <Icon name="chevron" size={18} className="chev" />
    </Link>
  );
}

export default async function Settings() {
  const user = await requirePage("patient");
  const active = listSharing(user).filter((s) => s.status === "active");
  const ai = isGeminiConfigured();
  return (
    <main id="main" className="p-main fade-in">
      <AppBar title="More" large />
      <div className="stack-6">
        <section className="card row" style={{ gap: "var(--s-4)" }} aria-label="Account">
          <span className="item-icon" style={{ width: 52, height: 52, borderRadius: 16, fontWeight: 700, fontSize: "var(--fs-18)" }} aria-hidden="true">
            {initials(user.name)}
          </span>
          <div className="grow" style={{ minWidth: 0 }}>
            <div className="strong" style={{ fontSize: "var(--fs-18)" }}>
              {user.name}
            </div>
            <div className="small muted truncate">{user.email}</div>
            {user.isSynthetic && (
              <span className="badge badge-demo" style={{ marginTop: 6 }}>
                Demo account · fictional data
              </span>
            )}
          </div>
        </section>

        <section className="stack-2" aria-labelledby="appearance">
          <h2 id="appearance" className="eyebrow" style={{ padding: "0 4px" }}>
            Theme &amp; appearance
          </h2>
          <div className="card">
            <ThemePicker />
          </div>
        </section>

        <section className="stack-2" aria-labelledby="privacy">
          <h2 id="privacy" className="eyebrow" style={{ padding: "0 4px" }}>
            Privacy &amp; care team
          </h2>
          <div className="group">
            <LinkItem
              href="/me/sharing"
              icon={active.length ? "users" : "lock"}
              title="Sharing"
              sub={active.length ? `Shared with ${active.map((s) => s.practitioner.name).join(" and ")}` : "Private to you"}
              tint="sky"
            />
            <LinkItem href="/me/water" icon="water" title="Water bottle" sub="Track water, or try the simulator" tint="sky" />
            <LinkItem href="/me/visit" icon="clipboard" title="Visit notes" sub="A printable two-week summary" tint="peach" />
            <LinkItem
              href="/privacy"
              icon="shield"
              title="Photos & AI"
              sub={ai ? "Photos are sent to Gemini for an estimate, then discarded" : "Photo analysis is off on this server"}
              tint="lavender"
            />
          </div>
        </section>

        <InstallApp />

        <section className="stack-2" aria-labelledby="account">
          <h2 id="account" className="eyebrow" style={{ padding: "0 4px" }}>
            Account
          </h2>
          <div className="group">
            <div className="item">
              <SignOutButton />
            </div>
            <details className="flag-item">
              <summary className="item" style={{ cursor: "pointer", color: "var(--danger)" }}>
                <Icon name="trash" size={18} />
                <span className="grow strong">Delete everything</span>
                <Icon name="chevronDown" size={18} className="chev" />
              </summary>
              <div className="stack-3" style={{ padding: "0 var(--s-4) var(--s-4)" }}>
                <p className="small muted" style={{ margin: 0 }}>
                  Delete single entries from Entries, or your whole account here.
                </p>
                {user.isSynthetic ? <p className="small muted">This is a shared demo account, so deleting it is turned off.</p> : <DeleteAccount />}
              </div>
            </details>
          </div>
        </section>

        <p className="tiny faint center">Gut Feeling is a prototype. It doesn&apos;t diagnose anything and isn&apos;t for emergencies.</p>
      </div>
    </main>
  );
}
