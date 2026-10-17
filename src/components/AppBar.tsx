import Link from "next/link";
import { Icon } from "./Icon";

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

/** Sticky, translucent top bar for patient screens. */
export function AppBar({ title, eyebrow, back, right }: { title: string; eyebrow?: string; back?: string; right?: React.ReactNode }) {
  return (
    <header className="appbar">
      {back && (
        <Link href={back} className="icon-btn" aria-label="Back">
          <Icon name="back" />
        </Link>
      )}
      <div className="grow" style={{ minWidth: 0 }}>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
      </div>
      {right}
    </header>
  );
}
