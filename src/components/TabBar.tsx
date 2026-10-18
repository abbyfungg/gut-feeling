"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";

const TABS = [
  { href: "/me", label: "Home", icon: "home", match: (p: string) => p === "/me" || p.startsWith("/me/saved") },
  { href: "/me/log", label: "Log", icon: "plus", log: true, match: (p: string) => p.startsWith("/me/log") },
  { href: "/me/trends", label: "Trends", icon: "chart", match: (p: string) => p.startsWith("/me/trends") },
  { href: "/me/entries", label: "Entries", icon: "entries", match: (p: string) => p.startsWith("/me/entries") || p.startsWith("/me/diary") },
  { href: "/me/settings", label: "More", icon: "more", match: (p: string) => p.startsWith("/me/settings") || p.startsWith("/me/sharing") || p.startsWith("/me/visit") },
];

/** Bottom navigation, shared by every patient screen. */
export function TabBar() {
  const path = usePathname();
  // Logging is a focused flow with its own back button and save bar, so the tabs step aside.
  if (path.startsWith("/me/log")) return null;
  return (
    <nav className="tabbar no-print" aria-label="Main">
      <div className="tabbar-inner">
        {TABS.map((t) => {
          const active = t.match(path);
          return (
            <Link key={t.href} href={t.href} aria-current={active ? "page" : undefined} className={t.log ? "tab-log" : undefined} aria-label={t.log ? "Log a bathroom trip" : undefined}>
              {t.log ? (
                <span className="tab-log-icon">
                  <Icon name="plus" size={20} strokeWidth={2.25} />
                </span>
              ) : (
                <Icon name={t.icon} size={22} strokeWidth={active ? 2 : 1.75} />
              )}
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
