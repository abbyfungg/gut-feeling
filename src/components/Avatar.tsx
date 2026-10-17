const TINTS: [string, string][] = [
  ["var(--peach)", "var(--cocoa-deep)"],
  ["var(--lavender)", "var(--lavender-strong)"],
  ["var(--sage)", "var(--ok-ink)"],
  ["var(--sky)", "var(--sky-strong)"],
  ["var(--butter)", "var(--med-ink)"],
  ["var(--blush)", "var(--high-ink)"],
];

export function initials(name: string): string {
  const parts = name
    .replace(/^(Dr|Nurse|Mr|Mrs|Ms)\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

function tintFor(name: string): [string, string] {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TINTS[h % TINTS.length];
}

/** Decorative initials avatar. Hidden from assistive tech: the name is always written next to it. */
export function Avatar({ name, size }: { name: string; size?: "sm" | "lg" }) {
  const [bg, fg] = tintFor(name);
  return (
    <span className={`avatar${size ? ` ${size}` : ""}`} style={{ background: bg, color: fg }} aria-hidden>
      {initials(name)}
    </span>
  );
}
