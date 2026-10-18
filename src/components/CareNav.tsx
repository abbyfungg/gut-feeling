"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Icon } from "./Icon";

const ITEMS = [
  { view: "queue", label: "Review queue", icon: "inbox", href: "/care" },
  { view: "patients", label: "Patients", icon: "users", href: "/care?view=patients" },
  { view: "followups", label: "Follow-ups", icon: "task", href: "/care?view=followups" },
  { view: "done", label: "Reviewed", icon: "checkCircle", href: "/care?view=done" },
] as const;

/** Workspace navigation. Views live in ?view=, so the active state reads the query string as well as the path. */
export function CareNav({ variant, counts }: { variant: "side" | "tabs"; counts: { queue: number; followups: number } }) {
  const path = usePathname();
  const params = useSearchParams();
  const current = path.startsWith("/care/patients") ? "patients" : path === "/care" ? (params.get("view") ?? "queue") : null;
  const countFor = (view: string) => (view === "queue" ? counts.queue : view === "followups" ? counts.followups : 0);

  if (variant === "tabs")
    return (
      <nav className="care-mnav" aria-label="Sections">
        {ITEMS.map((i) => (
          <Link key={i.view} href={i.href} aria-current={current === i.view ? "page" : undefined}>
            {i.label}
            {countFor(i.view) > 0 && (
              <span className="care-count">
                {countFor(i.view)}
                <span className="visually-hidden"> open</span>
              </span>
            )}
          </Link>
        ))}
      </nav>
    );

  return (
    <nav className="care-nav" aria-label="Workspace">
      <span className="care-nav-label">Workspace</span>
      {ITEMS.map((i) => (
        <Link key={i.view} href={i.href} aria-current={current === i.view ? "page" : undefined}>
          <Icon name={i.icon} size={18} />
          {i.label}
          {countFor(i.view) > 0 && (
            <span className="care-count">
              {countFor(i.view)}
              <span className="visually-hidden"> open</span>
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}
