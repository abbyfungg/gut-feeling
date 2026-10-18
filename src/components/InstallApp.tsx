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
    <section className="card row" style={{ gap: "var(--s-3)" }} aria-label="Install the app">
      <span className="item-icon" style={{ background: "var(--butter)", color: "var(--butter-ink)" }}>
        <Icon name="phone" size={18} />
      </span>
      <div className="grow" style={{ minWidth: 0 }}>
        <div className="item-title">Add to your home screen</div>
        <div className="item-sub">
          {evt ? "Opens like an app. No app store needed." : ios ? "In Safari, tap Share, then \u201cAdd to Home Screen\u201d." : "Use your browser menu: \u201cInstall app\u201d or \u201cAdd to Home Screen\u201d."}
        </div>
      </div>
      {evt && (
        <button
          type="button"
          className="btn btn-tonal btn-sm"
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
