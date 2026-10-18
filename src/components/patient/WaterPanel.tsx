"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/Icon";

type Source = "bottle" | "manual" | "simulated";
type Day = { day: string; ml: number; estimated: boolean; simulated: boolean };
type Today = { ml: number; sips: number; lastAt: string | null; sources: Source[]; week: Day[] };
type Pairing = { paired: boolean; pairedAt: string | null; lastSeenAt: string | null };
type NewToken = { token: string; host: string; secure: boolean };

const WELL = 1500; // the level the "hard despite fluids" rule treats as drinking well

function weekday(day: string) {
  return new Intl.DateTimeFormat("en-CA", { weekday: "short", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`)).slice(0, 3);
}

export function SourceBadges({ sources }: { sources: Source[] }) {
  return (
    <span className="row wrap" style={{ gap: 6 }}>
      {sources.includes("bottle") && <span className="badge badge-ok">From your bottle · estimate</span>}
      {sources.includes("simulated") && <span className="badge badge-demo">Simulated · not device data</span>}
      {sources.includes("manual") && <span className="badge badge-patient">Added by you</span>}
    </span>
  );
}

export function WeekBars({ week, today }: { week: Day[]; today: string }) {
  const days: Day[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(`${today}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push(week.find((w) => w.day === key) ?? { day: key, ml: 0, estimated: false, simulated: false });
  }
  const max = Math.max(2500, ...days.map((d) => d.ml));
  return (
    <div className="water-week" role="img" aria-label={days.map((d) => `${weekday(d.day)}: ${(d.ml / 1000).toFixed(1)} litres`).join(", ")}>
      <span className="water-well" style={{ bottom: `calc(18px + ${(WELL / max) * 100}px)` }}>
        <span>1.5 L</span>
      </span>
      {days.map((d) => (
        <div key={d.day} className="water-col">
          <span className="water-val">{d.ml ? (d.ml / 1000).toFixed(1) : ""}</span>
          <i style={{ height: `${Math.max(2, (d.ml / max) * 100)}px` }} className={d.simulated ? "sim" : ""} />
          <span className="water-day">{d.day === today ? "Today" : weekday(d.day)}</span>
        </div>
      ))}
    </div>
  );
}

export function WaterPanel({ initial, initialPairing, today }: { initial: Today; initialPairing: Pairing; today: string }) {
  const [t, setT] = useState(initial);
  const [pairing, setPairing] = useState(initialPairing);
  const [newToken, setNewToken] = useState<NewToken | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const poll = useCallback(async () => {
    const res = await fetch("/api/hydration", { cache: "no-store" }).catch(() => null);
    if (!res?.ok) return;
    const b = await res.json();
    setT(b.today);
    setPairing(b.pairing);
    setNow(Date.now());
  }, []);
  useEffect(() => {
    const id = setInterval(() => document.visibilityState === "visible" && poll(), 3000);
    return () => clearInterval(id);
  }, [poll]);

  async function add(source: "manual" | "simulated", ml: number, sips: number) {
    setBusy(true);
    const res = await fetch("/api/hydration", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ source, ml, sips }) }).catch(() => null);
    if (res?.ok) setT((await res.json()).today);
    setBusy(false);
  }
  async function pair() {
    setBusy(true);
    const res = await fetch("/api/device/token", { method: "POST" }).catch(() => null);
    if (res?.ok) setNewToken(await res.json());
    await poll();
    setBusy(false);
  }
  async function unpair() {
    setBusy(true);
    await fetch("/api/device/token", { method: "DELETE" }).catch(() => null);
    setNewToken(null);
    await poll();
    setBusy(false);
  }

  const online = pairing.lastSeenAt && now - new Date(pairing.lastSeenAt).getTime() < 10 * 60_000;
  const [hostName, hostPort] = (newToken?.host ?? "").split(":");

  return (
    <div className="stack-6">
      <section className="card stack-3" aria-labelledby="water-today">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div className="stack-1" style={{ flexShrink: 0 }}>
            <h2 id="water-today" className="eyebrow">
              Water today
            </h2>
            <div className="effort-big">
              {(t.ml / 1000).toFixed(1)}
              <small> L</small>
            </div>
            <span className="small muted" suppressHydrationWarning>
              {t.sips ? `${t.sips} ${t.sips === 1 ? "sip" : "sips"}` : "No sips yet"}
              {t.lastAt ? ` · last at ${new Date(t.lastAt).toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit" })}` : ""}
            </span>
          </div>
          <SourceBadges sources={t.sources} />
        </div>
        <WeekBars week={t.week} today={today} />
        <button type="button" className="btn btn-secondary" onClick={() => add("manual", 250, 0)} disabled={busy}>
          <Icon name="plus" /> Add a glass (250 ml)
        </button>
        <p className="tiny muted">Bottle amounts are estimates: each sip counts as about 30 ml. A glass you add yourself counts as 250 ml.</p>
      </section>

      <section className="card stack-3" aria-labelledby="sim-h">
        <div className="row" style={{ justifyContent: "space-between", gap: 8 }}>
          <h2 id="sim-h" style={{ fontSize: "var(--fs-18)" }}>
            No bottle handy? Try the simulator
          </h2>
          <span className="badge badge-demo">Simulated</span>
        </div>
        <p className="small muted">Each tap is one 30 ml sip, saved like the bottle would but marked as simulated.</p>
        <button type="button" className="squeeze-btn" onClick={() => add("simulated", 30, 1)} disabled={busy}>
          <span className="stack-1" style={{ alignItems: "center" }}>
            <Icon name="water" size={28} />
            Take a sip
          </span>
        </button>
      </section>

      <section className="card stack-3" aria-labelledby="pair-h">
        <div className="row" style={{ justifyContent: "space-between", gap: 8 }}>
          <h2 id="pair-h" style={{ fontSize: "var(--fs-18)" }}>
            Your water bottle
          </h2>
          <span className={`badge ${online ? "badge-ok" : ""}`}>{pairing.paired ? (online ? "Online" : "Paired") : "Not paired"}</span>
        </div>
        <p className="small muted">
          An Arduino with a motion sensor taped to the bottle counts sips and sends them over Wi-Fi with its own pairing code, which can only add water to your diary.
        </p>
        {newToken && (
          <div className="notice notice-warn stack-2" role="status">
            <strong>Copy these into water_bottle.ino now (and set SEND_TO_APP to 1). The code is shown only once.</strong>
            <pre className="pair-code">{`#define SERVER_HOST  "${hostName}"\n#define SERVER_PORT  ${hostPort || (newToken.secure ? 443 : 80)}\n#define USE_TLS      ${newToken.secure ? 1 : 0}\n#define DEVICE_TOKEN "${newToken.token}"`}</pre>
          </div>
        )}
        <div className="row wrap" style={{ gap: 8 }}>
          <button type="button" className="btn btn-primary" onClick={pair} disabled={busy}>
            {pairing.paired ? "Make a new pairing code" : "Pair a bottle"}
          </button>
          {pairing.paired && (
            <button type="button" className="btn btn-danger-ghost" onClick={unpair} disabled={busy}>
              Unpair
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
