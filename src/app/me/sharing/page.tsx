import Link from "next/link";
import { AppBar, initials } from "@/components/AppBar";
import { DeleteAccount } from "@/components/DeleteAccount";
import { Icon } from "@/components/Icon";
import { InstallApp } from "@/components/InstallApp";
import { ShareToggle } from "@/components/ShareToggle";
import { SignOutButton } from "@/components/SignOutButton";
import { getConfig, isGeminiConfigured } from "@/lib/config";
import { listReviewsForPatient, listSharing } from "@/lib/records";
import { requirePage } from "@/lib/session";
import { formatDateTime } from "@/lib/time";

export const metadata = { title: "You" };

export default async function Sharing() {
  const user = await requirePage("patient");
  const tz = getConfig().timezone;
  const shares = listSharing(user);
  const reviews = listReviewsForPatient(user);
  const activeCount = shares.filter((s) => s.status === "active").length;
  return (
    <main id="main" className="screen">
      <AppBar title="You" eyebrow="Profile & privacy" />
      <div className="stack-lg">
        <section className="card row" style={{ gap: 14 }} aria-label="Profile">
          <span className="avatar lg">{initials(user.name)}</span>
          <div className="grow" style={{ minWidth: 0 }}>
            <div className="bold" style={{ fontSize: "var(--t-lg)" }}>
              {user.name}
            </div>
            <div className="small muted" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
              {user.email}
            </div>
            <div className="row wrap" style={{ gap: 6, marginTop: 6 }}>
              <span className={`pill ${activeCount ? "pill-lav" : ""}`}>
                <Icon name={activeCount ? "users" : "lock"} size={12} /> {activeCount ? `Shared with ${activeCount}` : "Private"}
              </span>
              {user.isSynthetic && <span className="pill pill-synthetic">Demo account</span>}
            </div>
          </div>
        </section>

        <InstallApp />

        <section className="stack-sm" aria-labelledby="care-team">
          <div className="section-head">
            <h2 id="care-team">Sharing &amp; privacy</h2>
          </div>
          <p className="tiny muted" style={{ margin: "0 4px" }}>
            Sharing lets them see your logs, notes and patterns, and record a review. Turn it off and access stops instantly. They can&apos;t edit anything.
          </p>
          <div className="list">
            {shares.map((s) => (
              <div key={s.practitioner.id} className="list-row">
                <div className="row-main" style={{ cursor: "default" }}>
                  <span className="avatar sm" style={{ background: s.status === "active" ? "var(--lavender)" : "var(--surface-3)", color: "var(--ink)" }}>
                    {initials(s.practitioner.name.replace(/^Dr\.\s*/, ""))}
                  </span>
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="row-title">{s.practitioner.name}</div>
                    <div className="tiny muted">{s.practitioner.title}</div>
                    <div className="tiny faint">
                      {s.status === "active" && s.grantedAt && `Since ${formatDateTime(s.grantedAt, tz)}`}
                      {s.status === "revoked" && s.revokedAt && `Stopped ${formatDateTime(s.revokedAt, tz)}`}
                      {s.status === "never" && (s.practitioner.organization ?? "Never shared")}
                    </div>
                  </div>
                  <ShareToggle practitionerId={s.practitioner.id} name={s.practitioner.name} active={s.status === "active"} />
                </div>
              </div>
            ))}
          </div>
          <p className="tiny faint" style={{ margin: "0 4px" }}>
            Prototype: the care-team directory is a fixed list of fictional clinicians.
          </p>
        </section>

        <section className="stack-sm" aria-labelledby="reviews">
          <div className="section-head">
            <h2 id="reviews">Reviews</h2>
            <span className="pill">{reviews.length}</span>
          </div>
          {reviews.length === 0 ? (
            <div className="card flat small muted">Nobody has recorded a review yet.</div>
          ) : (
            <div className="list">
              {reviews.map((r) => (
                <div key={r.id} className="list-row">
                  <div className="row-main" style={{ cursor: "default", alignItems: "flex-start" }}>
                    <span className="insight-icon ok" aria-hidden style={{ width: 36, height: 36, borderRadius: 12 }}>
                      <Icon name="check" size={18} />
                    </span>
                    <div className="grow" style={{ minWidth: 0 }}>
                      <div className="row-title">{r.decisionLabel}</div>
                      <div className="tiny muted">
                        {r.practitionerName} · {formatDateTime(r.createdAt, tz)}
                      </div>
                      <div className="tiny faint">About: {r.flagTitle.toLowerCase()}</div>
                    </div>
                    {r.followUpStatus === "open" && <span className="pill pill-med">Follow-up planned</span>}
                    {r.followUpStatus === "done" && <span className="pill pill-ok">Done</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="list" aria-label="More">
          <div className="list-row">
          <Link href="/me/visit" className="row-main" style={{ textDecoration: "none", color: "inherit" }}>
            <span className="stat-icon tint-peach" style={{ margin: 0 }}>
              <Icon name="clipboard" size={18} />
            </span>
            <span className="grow bold">Visit notes</span>
            <Icon name="chevron" size={18} />
          </Link>
          </div>
          <div className="list-row">
          <Link href="/privacy" className="row-main" style={{ textDecoration: "none", color: "inherit" }}>
            <span className="stat-icon tint-sky" style={{ margin: 0 }}>
              <Icon name="lock" size={18} />
            </span>
            <span className="grow">
              <span className="bold" style={{ display: "block" }}>
                Photos &amp; AI
              </span>
              <span className="tiny muted">{isGeminiConfigured() ? "Photos go to Gemini for a suggestion, then are discarded. Never saved." : "Photo help is off. No photos are uploaded."}</span>
            </span>
            <Icon name="chevron" size={18} />
          </Link>
          </div>
        </section>

        <div className="row between">
          <SignOutButton />
        </div>

        <details className="card flat">
          <summary className="bold small" style={{ cursor: "pointer", color: "var(--high)" }}>
            Delete everything
          </summary>
          <div className="stack-sm" style={{ marginTop: 12 }}>
            <p className="small muted" style={{ margin: 0 }}>
              Delete single logs from your diary, or everything at once here.
            </p>
            {user.isSynthetic ? <p className="small muted">This is a shared demo account, so deleting it is turned off.</p> : <DeleteAccount />}
          </div>
        </details>
      </div>
    </main>
  );
}
