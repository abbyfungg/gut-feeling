"use client";
import { useEffect, useState } from "react";
import { Icon } from "./Icon";

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** "Add to home screen" card. Uses the browser install prompt where available, otherwise shows the iPhone steps. */
export function InstallApp() {
  const [evt, setEvt] = useState<PromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as PromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    // Reading browser-only facts after mount keeps server and client markup identical.
    const t = setTimeout(() => {
      setInstalled(standalone);
      setIos(isIos);
    }, 0);
    return () => {
      clearTimeout(t);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;
  return (
    <section className="card tint-ink row" style={{ gap: 14, border: 0 }} aria-label="Install the app">
      <span className="stat-icon" style={{ margin: 0, width: 44, height: 44, borderRadius: 14, background: "linear-gradient(140deg, var(--butter-strong), var(--tangerine))", color: "var(--ink)" }}>
        <Icon name="phone" />
      </span>
      <div className="grow">
        <div className="bold">Get the app</div>
        <div className="tiny" style={{ opacity: 0.75 }}>
          {evt ? "Install it on your home screen. No app store needed." : ios ? "Tap Share, then “Add to Home Screen”." : "Use your browser menu: “Install app” or “Add to Home Screen”."}
        </div>
      </div>
      {evt && (
        <button
          className="btn btn-sm"
          style={{ background: "var(--butter-strong)", color: "var(--ink)" }}
          onClick={async () => {
            await evt.prompt();
            const choice = await evt.userChoice.catch(() => null);
            if (choice?.outcome === "accepted") setInstalled(true);
            setEvt(null);
          }}
        >
          <Icon name="download" size={16} /> Install
        </button>
      )}
    </section>
  );
}
