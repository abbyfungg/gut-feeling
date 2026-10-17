"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Icon } from "./Icon";

const ITEMS = [
  { view: "queue", label: "Review queue", short: "Queue", icon: "bell", href: "/care" },
  { view: "patients", label: "Patients", short: "Patients", icon: "users", href: "/care?view=patients" },
  { view: "followups", label: "Follow-ups", short: "Follow-ups", icon: "clipboard", href: "/care?view=followups" },
  { view: "done", label: "Reviewed", short: "Reviewed", icon: "check", href: "/care?view=done" },
] as const;

/** Console navigation. Views live in ?view=, so the active state reads the query string as well as the path. */
export function CareNav({ variant, counts }: { variant: "side" | "tabs"; counts: { queue: number; followups: number } }) {
  const path = usePathname();
  const params = useSearchParams();
  const current = path.startsWith("/care/patients") ? "patients" : path === "/care" ? (params.get("view") ?? "queue") : null;
  const countFor = (view: string) => (view === "queue" ? counts.queue : view === "followups" ? counts.followups : 0);

  if (variant === "tabs")
    return (
      <nav className="mobile-tabs" aria-label="Sections">
        {ITEMS.map((i) => (
          <Link key={i.view} href={i.href} aria-current={current === i.view ? "page" : undefined}>
            {i.short}
            {countFor(i.view) > 0 && <span style={{ marginLeft: 6, opacity: 0.7 }}>{countFor(i.view)}</span>}
          </Link>
        ))}
      </nav>
    );

  return (
    <nav className="stack-sm" style={{ gap: 4 }} aria-label="Main">
      {ITEMS.map((i) => (
        <Link key={i.view} href={i.href} className="side-link" aria-current={current === i.view ? "page" : undefined}>
          <Icon name={i.icon} size={18} />
          {i.label}
          {countFor(i.view) > 0 && <span className="count">{countFor(i.view)}</span>}
        </Link>
      ))}
    </nav>
  );
}
