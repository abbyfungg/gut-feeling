/**
 * One consistent line-icon set: 24px grid, 1.75px stroke, round caps and joins.
 * Decorative by default; pass `label` when the icon carries meaning on its own.
 */
const paths: Record<string, React.ReactNode> = {
  home: (
    <>
      <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1v-8.5Z" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  book: (
    <>
      <path d="M6 4h11a1 1 0 0 1 1 1v15H7a2 2 0 0 1-2-2V5a1 1 0 0 1 1-1Z" />
      <path d="M5 18a2 2 0 0 1 2-2h11M9 8h5" />
    </>
  ),
  entries: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M8 9h8M8 12.5h8M8 16h5" />
    </>
  ),
  list: <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />,
  chart: (
    <>
      <path d="M4 20h16" />
      <path d="M7 16v-4M12 16V8M17 16v-6" />
    </>
  ),
  trend: <path d="M4 17l5-5 4 3 7-7M15 8h5v5" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13.5a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V20a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H4a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H10a1.6 1.6 0 0 0 1-1.5V4a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V10a1.6 1.6 0 0 0 1.5 1H20a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z" />
    </>
  ),
  more: (
    <>
      <circle cx="6" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="18" cy="12" r="1" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8.5" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 5.2a3.5 3.5 0 0 1 0 6.6M18 14.3A6.5 6.5 0 0 1 21.5 20" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3.5 5 6v5.5c0 4.4 3 7.6 7 9 4-1.4 7-4.6 7-9V6l-7-2.5Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  checkCircle: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.5 12.2 2.4 2.4 4.6-4.8" />
    </>
  ),
  x: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  chevron: <path d="m9.5 6 6 6-6 6" />,
  chevronDown: <path d="m6 9.5 6 6 6-6" />,
  chevronUp: <path d="m6 14.5 6-6 6 6" />,
  back: <path d="M14.5 6l-6 6 6 6" />,
  arrow: <path d="M5 12h14m-5.5-5.5L19 12l-5.5 5.5" />,
  camera: (
    <>
      <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.5-2h6l1.5 2h2A1.5 1.5 0 0 1 20 8.5V18a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18V8.5Z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  trash: <path d="M5 7h14M10 7V4.5h4V7m-7.5 0 .8 12a1.5 1.5 0 0 0 1.5 1.5h6.4a1.5 1.5 0 0 0 1.5-1.5l.8-12M10 11v6M14 11v6" />,
  clipboard: (
    <>
      <rect x="5.5" y="5" width="13" height="15.5" rx="2" />
      <path d="M9 5V4h6v1M9 11h6M9 15h4" />
    </>
  ),
  sparkle: <path d="M12 3.5 13.8 9.2 19.5 11 13.8 12.8 12 18.5 10.2 12.8 4.5 11 10.2 9.2 12 3.5Z" />,
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5M12 7.8v.2" />
    </>
  ),
  alert: (
    <>
      <path d="M10.3 4.3 2.9 17.5A2 2 0 0 0 4.6 20.5h14.8a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9.5v4.5M12 17v.2" />
    </>
  ),
  flag: <path d="M5.5 21V4.5M5.5 4.5h11l-2 4 2 4h-11" />,
  printer: (
    <>
      <path d="M7 9V4h10v5M7 17H5a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2" />
      <rect x="7" y="14" width="10" height="6.5" rx="1" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5.5" width="16" height="14.5" rx="2" />
      <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  bell: <path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 1.5h-15L6 16.5ZM10 20.5a2 2 0 0 0 4 0" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </>
  ),
  filter: <path d="M4 6h16M7 12h10M10 18h4" />,
  sort: <path d="M8 5v14m0 0-3-3m3 3 3-3M16 19V5m0 0-3 3m3-3 3 3" />,
  sortUp: <path d="M12 19V5m0 0-4 4m4-4 4 4" />,
  sortDown: <path d="M12 5v14m0 0-4-4m4 4 4-4" />,
  drop: <path d="M12 3.5s6 6.4 6 10.9a6 6 0 0 1-12 0c0-4.5 6-10.9 6-10.9Z" />,
  moon: <path d="M19.5 14.5A7.5 7.5 0 1 1 9.5 4.5a6 6 0 0 0 10 10Z" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" />
    </>
  ),
  palette: (
    <>
      <path d="M12 3.5a8.5 8.5 0 0 0 0 17c1.1 0 1.7-.8 1.7-1.6 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-.9.8-1.7 1.7-1.7h2A4.1 4.1 0 0 0 20.5 11 7.9 7.9 0 0 0 12 3.5Z" />
      <circle cx="7.5" cy="11" r="1" />
      <circle cx="10.5" cy="7.5" r="1" />
      <circle cx="15" cy="7.5" r="1" />
    </>
  ),
  heart: <path d="M12 19.5s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.5c0 5.4-7.5 10-7.5 10Z" />,
  smile: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 14a4.5 4.5 0 0 0 7 0M9 9.8v.2M15 9.8v.2" />
    </>
  ),
  phone: (
    <>
      <rect x="7" y="3" width="10" height="18" rx="2.5" />
      <path d="M11 18h2" />
    </>
  ),
  download: <path d="M12 4v11m-4.5-4.5L12 15l4.5-4.5M5 20h14" />,
  edit: <path d="M4.5 19.5h4l10-10a2.1 2.1 0 0 0-3-3l-10 10v3ZM13.5 8.5l2.5 2.5" />,
  note: (
    <>
      <path d="M6 4h9l4 4v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
      <path d="M14.5 4v4.5H19M8.5 13h7M8.5 16.5h5" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.7 9.5a2.4 2.4 0 0 1 4.6.9c0 1.6-2.3 2.1-2.3 3.6M12 16.8v.2" />
    </>
  ),
  out: <path d="M14.5 4.5H18a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5h-3.5M10 8l-4 4 4 4M6 12h10" />,
  inbox: (
    <>
      <path d="M4 13.5 6.5 5h11L20 13.5V18a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18v-4.5Z" />
      <path d="M4 13.5h4.5l1 2h5l1-2H20" />
    </>
  ),
  task: (
    <>
      <rect x="4.5" y="4.5" width="15" height="15" rx="3" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </>
  ),
  timeline: (
    <>
      <path d="M7 4v16" />
      <circle cx="7" cy="7" r="1.6" />
      <circle cx="7" cy="12" r="1.6" />
      <circle cx="7" cy="17" r="1.6" />
      <path d="M11 7h8M11 12h6M11 17h7" />
    </>
  ),
  wind: <path d="M3.5 9h11a2.5 2.5 0 1 0-2.5-2.5M3.5 13h15a2.5 2.5 0 1 1-2.5 2.5M3.5 17h7" />,
  zap: <path d="M13 3.5 5.5 13.5H12l-1 7 7.5-10H12l1-7Z" />,
  timer: (
    <>
      <circle cx="12" cy="13.5" r="7" />
      <path d="M12 10v3.5l2 1.5M10 3h4M18.5 6.5l1.2-1.2" />
    </>
  ),
  activity: <path d="M3.5 12h4l2.5-6 4 12 2.5-6h4" />,
  thermometer: <path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a3.5 3.5 0 1 0 4 0ZM12 10v6" />,
  circleDot: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  minusCircle: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 12h7" />
    </>
  ),
  frown: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 16a4.5 4.5 0 0 1 7 0M9 9.8v.2M15 9.8v.2" />
    </>
  ),
  pill: (
    <>
      <rect x="3.5" y="8.5" width="17" height="7" rx="3.5" transform="rotate(-35 12 12)" />
      <path d="m9.6 8.6 4.8 6.8" />
    </>
  ),
  plane: <path d="M10.5 13.5 4 11l1.5-1.5 7 1 3.5-4a1.8 1.8 0 0 1 2.5 2.5l-4 3.5 1 7L14 21l-2.5-6.5-3 2.5.5 2-1 1-1.5-3-3-1.5 1-1 2 .5 2.5-3Z" />,
  glass: <path d="M7 4h10l-1.5 15.5a1 1 0 0 1-1 .9h-5a1 1 0 0 1-1-.9L7 4ZM7.6 9.5h8.8" />,
  leaf: <path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14H5Zm0 0 7-7" />,
  water: <path d="M4 15c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5M4 19c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5M12 3.5s4 4.2 4 7a4 4 0 0 1-8 0c0-2.8 4-7 4-7Z" />,
  brain: <path d="M9 4.5a3 3 0 0 0-3 3 3 3 0 0 0-1.5 5.5A3 3 0 0 0 7 18a2.5 2.5 0 0 0 5 .5V6a1.5 1.5 0 0 0-3-1.5ZM15 4.5a3 3 0 0 1 3 3 3 3 0 0 1 1.5 5.5A3 3 0 0 1 17 18a2.5 2.5 0 0 1-5 .5" />,
  wifiOff: <path d="M3 3l18 18M8.5 16a5 5 0 0 1 7 0M5 12.5a10 10 0 0 1 4-2.3M12.5 9.6A10 10 0 0 1 19 12.5M2 9a15 15 0 0 1 4-2.5M10 5.1A15 15 0 0 1 22 9M12 19.5v.2" />,
  arrowUpRight: <path d="M7 17 17 7M9 7h8v8" />,
};

export type IconName = keyof typeof paths;

export function Icon({ name, size = 20, label, strokeWidth = 1.75, className }: { name: IconName | string; size?: number; label?: string; strokeWidth?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={className}
    >
      {paths[name] ?? paths.circleDot}
    </svg>
  );
}
