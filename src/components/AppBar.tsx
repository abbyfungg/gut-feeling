import Link from "next/link";
import { Icon } from "./Icon";

export function initials(name: string) {
  return name
    .replace(/^Dr\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

/** Top bar for secondary patient screens: optional back link, title, optional action. */
export function AppBar({ title, back, right, large = false }: { title: string; back?: string; right?: React.ReactNode; large?: boolean }) {
  return (
    <header className="p-top">
      {back && (
        <Link href={back} className="icon-btn" aria-label="Back" style={{ marginLeft: -10 }}>
          <Icon name="back" size={22} />
        </Link>
      )}
      {large ? <h1 className="p-title grow">{title}</h1> : <h1 className="grow">{title}</h1>}
      {right}
    </header>
  );
}
