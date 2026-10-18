import { AppBar, initials } from "@/components/AppBar";
import { Icon } from "@/components/Icon";
import { ShareToggle } from "@/components/ShareToggle";
import { getConfig } from "@/lib/config";
import { listReviewsForPatient, listSharing } from "@/lib/records";
import { requirePage } from "@/lib/session";
import { formatDateTime } from "@/lib/time";

export const metadata = { title: "Sharing" };

export default async function Sharing() {
  const user = await requirePage("patient");
  const tz = getConfig().timezone;
  const shares = listSharing(user);
  const reviews = listReviewsForPatient(user);
  const active = shares.filter((s) => s.status === "active").length;
  return (
    <main id="main" className="p-main fade-in">
      <AppBar title="Sharing" back="/me/settings" />
      <div className="stack-6">
        <section className={`notice ${active ? "notice-info" : "notice-ok"}`}>
          <Icon name={active ? "users" : "lock"} size={18} />
          <span>
            {active
              ? `Shared with ${active} ${active === 1 ? "person" : "people"}. They can see your entries and patterns and record a review, but can't change anything.`
              : "Your diary is private. Nobody else can see it until you turn sharing on."}
          </span>
        </section>

        <section className="stack-2" aria-labelledby="care-team">
          <h2 id="care-team" className="eyebrow" style={{ padding: "0 4px" }}>
            Care team
          </h2>
          <div className="group">
            {shares.map((s) => (
              <div key={s.practitioner.id} className="item">
                <span className="item-icon" style={s.status === "active" ? undefined : { background: "var(--surface-2)", color: "var(--text-3)" }} aria-hidden="true">
                  <span className="strong small">{initials(s.practitioner.name)}</span>
                </span>
                <span className="grow" style={{ minWidth: 0 }}>
                  <span className="item-title" style={{ display: "block" }}>
                    {s.practitioner.name}
                  </span>
                  <span className="item-sub" style={{ display: "block" }}>
                    {s.practitioner.title}
                    {s.practitioner.organization ? ` · ${s.practitioner.organization}` : ""}
                  </span>
                  <span className="tiny faint" style={{ display: "block" }}>
                    {s.status === "active" && s.grantedAt && `Sharing since ${formatDateTime(s.grantedAt, tz)}`}
                    {s.status === "revoked" && s.revokedAt && `Stopped ${formatDateTime(s.revokedAt, tz)}`}
                    {s.status === "never" && "Never shared"}
                  </span>
                </span>
                <ShareToggle practitionerId={s.practitioner.id} name={s.practitioner.name} active={s.status === "active"} />
              </div>
            ))}
          </div>
          <p className="tiny faint" style={{ margin: "0 4px" }}>
            Turning sharing off stops access right away. Prototype: the care-team directory is a fixed list of fictional clinicians.
          </p>
        </section>

        <section className="stack-2" aria-labelledby="reviews">
          <div className="row between" style={{ padding: "0 4px" }}>
            <h2 id="reviews" className="eyebrow">
              Reviews from your care team
            </h2>
            <span className="badge badge-clinician">
              <Icon name="check" /> Clinician reviewed
            </span>
          </div>
          {reviews.length === 0 ? (
            <div className="card small muted">Nobody has recorded a review yet. When someone does, you&apos;ll see it here.</div>
          ) : (
            <div className="group">
              {reviews.map((r) => (
                <div key={r.id} className="item" style={{ alignItems: "flex-start" }}>
                  <span className="item-icon">
                    <Icon name="checkCircle" size={18} />
                  </span>
                  <span className="grow" style={{ minWidth: 0 }}>
                    <span className="item-title" style={{ display: "block" }}>
                      {r.decisionLabel}
                    </span>
                    <span className="item-sub" style={{ display: "block" }}>
                      {r.practitionerName} · {formatDateTime(r.createdAt, tz)}
                    </span>
                    <span className="tiny faint" style={{ display: "block" }}>
                      About: {r.flagTitle.toLowerCase()}
                    </span>
                  </span>
                  {r.followUpStatus === "open" && <span className="badge badge-warn">Follow-up planned</span>}
                  {r.followUpStatus === "done" && <span className="badge badge-ok">Done</span>}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
