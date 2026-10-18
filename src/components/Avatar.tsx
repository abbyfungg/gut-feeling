const TINTS: [string, string][] = [
  ["var(--sky)", "var(--sky-ink)"],
  ["var(--lavender)", "var(--lavender-ink)"],
  ["var(--primary-soft)", "var(--primary-ink)"],
  ["var(--peach)", "var(--peach-ink)"],
  ["var(--butter)", "var(--butter-ink)"],
  ["var(--pink)", "var(--pink-ink)"],
];

const SIZES = { sm: 24, md: 32, lg: 48 } as const;

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

/** Decorative initials avatar. Hidden from assistive tech: the name is always written next to it. Self-styled so it works on any page. */
export function Avatar({ name, size }: { name: string; size?: "sm" | "lg" }) {
  const [bg, fg] = tintFor(name);
  const px = SIZES[size ?? "md"];
  return (
    <span
      className={`avatar${size ? ` ${size}` : ""}`}
      style={{
        background: bg,
        color: fg,
        width: px,
        height: px,
        flex: "none",
        display: "inline-grid",
        placeItems: "center",
        borderRadius: "50%",
        fontSize: Math.round(px * 0.38),
        fontWeight: 600,
        letterSpacing: "0.02em",
        lineHeight: 1,
      }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
