const paths: Record<string, React.ReactNode> = {
  home: <path d="M3 11.5 12 4l9 7.5M5.5 9.5V20h13V9.5" />,
  plus: <path d="M12 5v14M5 12h14" />,
  book: <path d="M5 4h10a4 4 0 0 1 4 4v12H8a3 3 0 0 1-3-3V4Zm0 13a3 3 0 0 1 3-3h11" />,
  chart: <path d="M4 20V4m0 16h16M8 16l4-5 3 3 5-7" />,
  shield: <path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Zm-3 9 2 2 4-4" />,
  users: <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-6 9a6 6 0 0 1 12 0m1-9a3 3 0 1 0 0-6m2 15h3a5 5 0 0 0-4-5" />,
  check: <path d="m5 12 5 5 9-10" />,
  out: <path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" />,
  camera: <path d="M4 8h3l2-3h6l2 3h3v11H4V8Zm8 9a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />,
  trash: <path d="M5 7h14M10 7V4h4v3m-7 0 1 13h8l1-13" />,
  clipboard: <path d="M9 4h6v3H9V4ZM7 5H5v16h14V5h-2M9 12h6m-6 4h4" />,
  sparkle: <path d="M12 3v4m0 10v4M3 12h4m10 0h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />,
  info: <path d="M12 8h.01M11 12h1v5h1M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />,
  printer: <path d="M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7v-7Z" />,
  arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  back: <path d="M19 12H5m6-6-6 6 6 6" />,
};

export function Icon({ name, size = 20, label }: { name: keyof typeof paths | string; size?: number; label?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {paths[name]}
    </svg>
  );
}
