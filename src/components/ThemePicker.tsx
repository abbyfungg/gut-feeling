"use client";
import { useEffect, useState } from "react";
import { ACCENTS, MODES, THEME_STORAGE, type AccentId, type ModeId } from "@/lib/theme";
import { PixelScene } from "./PixelScene";

function applyTheme(accent: AccentId, mode: ModeId) {
  const d = document.documentElement;
  d.dataset.accent = accent;
  d.dataset.mode = mode;
  d.dataset.scheme = mode === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : mode;
  try {
    localStorage.setItem(THEME_STORAGE.accent, accent);
    localStorage.setItem(THEME_STORAGE.mode, mode);
  } catch {
    /* private mode: the choice still applies for this visit */
  }
}

/** Appearance (auto / light / dark) and accent theme. Saved on this device only. */
export function ThemePicker() {
  const [accent, setAccent] = useState<AccentId>("forest");
  const [mode, setMode] = useState<ModeId>("system");
  useEffect(() => {
    const d = document.documentElement;
    const t = setTimeout(() => {
      setAccent((d.dataset.accent as AccentId) || "forest");
      setMode((d.dataset.mode as ModeId) || "system");
    }, 0);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="stack">
      <div className="segmented" role="group" aria-label="Appearance" style={{ width: "100%" }}>
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            aria-pressed={mode === m.id}
            onClick={() => {
              setMode(m.id);
              applyTheme(accent, m.id);
            }}
          >
            {m.name}
          </button>
        ))}
      </div>
      <div className="themes" role="group" aria-label="Theme">
        {ACCENTS.map((a) => (
          <button
            key={a.id}
            type="button"
            className="theme-opt"
            aria-pressed={accent === a.id}
            onClick={() => {
              setAccent(a.id);
              applyTheme(a.id, mode);
            }}
          >
            <div data-accent-preview={a.id} style={{ height: 44 }}>
              <PixelScene height={22} seed={3} flowers={false} />
            </div>
            <span>{a.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
