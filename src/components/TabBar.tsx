"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";

const TABS = [
  { href: "/me", label: "Home", icon: "home", match: (p: string) => p === "/me" },
  { href: "/me/diary", label: "Diary", icon: "book", match: (p: string) => p.startsWith("/me/diary") },
  { href: "/me/log", label: "Log a movement", icon: "plus", fab: true, match: (p: string) => p.startsWith("/me/log") },
  { href: "/me/trends", label: "Insights", icon: "chart", match: (p: string) => p.startsWith("/me/trends") },
  { href: "/me/sharing", label: "You", icon: "user", match: (p: string) => p.startsWith("/me/sharing") || p.startsWith("/me/visit") },
];

/** App-style bottom tab bar. Hidden on the logging flow, which has its own action bar. */
export function TabBar() {
  const path = usePathname();
  if (path.startsWith("/me/log")) return null;
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map((t) =>
        t.fab ? (
          <Link key={t.href} href={t.href} className="fab" aria-label={t.label} aria-current={t.match(path) ? "page" : undefined}>
            <Icon name={t.icon} size={26} />
          </Link>
        ) : (
          <Link key={t.href} href={t.href} aria-current={t.match(path) ? "page" : undefined}>
            <Icon name={t.icon} size={22} />
            {t.label}
          </Link>
        ),
      )}
    </nav>
  );
}
