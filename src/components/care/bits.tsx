import { Icon } from "@/components/Icon";
import { Womby } from "@/components/Womby";
import type { FlagStatus } from "@/lib/records";

export function Severity({ level }: { level: "high" | "medium" }) {
  return (
    <span className={`sev sev-${level}`}>
      <span className="dot" aria-hidden />
      {level === "high" ? "High" : "Medium"}
    </span>
  );
}

export function FlagStatusText({ status }: { status: FlagStatus }) {
  if (status === "new_info")
    return (
      <span className="status-text new-info">
        <Icon name="info" size={14} />
        New info since review
      </span>
    );
  if (status === "reviewed")
    return (
      <span className="status-text">
        <Icon name="check" size={14} />
        Reviewed
      </span>
    );
  return <span className="status-text">Needs review</span>;
}

/** Provenance badges. One consistent vocabulary across the workspace. */
export function SourceBadge({ kind, children }: { kind: "patient" | "ai" | "ai-demo" | "clinician" | "rule"; children?: React.ReactNode }) {
  switch (kind) {
    case "patient":
      return (
        <span className="badge badge-patient">
          <Icon name="user" /> {children ?? "Patient-reported"}
        </span>
      );
    case "ai":
      return (
        <span className="badge badge-ai">
          <Icon name="sparkle" /> {children ?? "AI estimate"}
        </span>
      );
    case "ai-demo":
      return (
        <span className="badge badge-ai">
          <Icon name="sparkle" /> {children ?? "Simulated AI (demo)"}
        </span>
      );
    case "clinician":
      return (
        <span className="badge badge-clinician">
          <Icon name="check" /> {children ?? "Clinician-reviewed"}
        </span>
      );
    case "rule":
      return (
        <span className="badge badge-rule">
          <Icon name="flag" /> {children ?? "Rule-based"}
        </span>
      );
  }
}

export function ProvenanceKey() {
  return (
    <div className="provenance-key" aria-label="Source key">
      <span>Sources:</span>
      <SourceBadge kind="patient" />
      <SourceBadge kind="ai" />
      <SourceBadge kind="rule" />
      <SourceBadge kind="clinician" />
    </div>
  );
}

export function CareEmpty({ title, children, pose = "happy" }: { title: string; children?: React.ReactNode; pose?: "happy" | "sleepy" | "celebrate" | "curious" }) {
  return (
    <div className="empty care-empty">
      <Womby pose={pose} size={56} />
      <h2>{title}</h2>
      {children && <p>{children}</p>}
    </div>
  );
}

/** Sticky page header with title and the patient search. */
export function CareTopbar({ title, eyebrow, crumbs, q, heading = true }: { title: string; eyebrow?: React.ReactNode; crumbs?: React.ReactNode; q?: string; heading?: boolean }) {
  return (
    <div className="care-top">
      <div className="care-top-title">
        {crumbs && <nav className="care-crumbs" aria-label="Breadcrumb">{crumbs}</nav>}
        {eyebrow && !crumbs && <span className="care-crumbs">{eyebrow}</span>}
        {heading ? <h1>{title}</h1> : <span className="care-top-name">{title}</span>}
      </div>
      <form className="care-search" role="search" action="/care" method="get">
        <input type="hidden" name="view" value="patients" />
        <Icon name="search" size={16} />
        <label htmlFor="care-q" className="visually-hidden">
          Search patients by name
        </label>
        <input id="care-q" type="search" name="q" placeholder="Search patients" defaultValue={q ?? ""} autoComplete="off" />
      </form>
    </div>
  );
}
