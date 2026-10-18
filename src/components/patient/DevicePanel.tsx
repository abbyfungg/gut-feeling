"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { EffortSpark, formatDuration, SourceBadge } from "./Effort";

type Session = {
  id: string;
  source: "device" | "simulated";
  status: "live" | "ended" | "attached" | "dismissed";
  startedAt: string;
  lastReadingAt: string;
  durationMs: number;
  peakEffort: number;
  avgEffort: number;
  lastEffort: number;
  squeezes: number;
  samples: number[];
};
type Pairing = { paired: boolean; pairedAt: string | null; lastSeenAt: string | null };
type NewToken = { token: string; host: string; secure: boolean; path: string };

const CELLS = 12; // matches the 12 columns of the Arduino's LED matrix

/** 12-cell effort bar, the same picture the ball shows on its LED grid. */
function EffortBar({ value }: { value: number }) {
  const lit = Math.round((value / 100) * CELLS);
  return (
    <div className="effort-bar" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} aria-label="Squeeze effort">
      {Array.from({ length: CELLS }, (_, i) => (
        <span key={i} className={i < lit ? (i >= 9 ? "on hi" : i >= 5 ? "on mid" : "on") : ""} />
      ))}
    </div>
  );
}

function ago(iso: string | null, now: number): string {
  if (!iso) return "never";
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  return `${Math.round(s / 3600)} h ago`;
}

export function DevicePanel({ initialPairing, initialSession }: { initialPairing: Pairing; initialSession: Session | null }) {
  const router = useRouter();
  const [pairing, setPairing] = useState(initialPairing);
  const [session, setSession] = useState<Session | null>(initialSession);
  const [newToken, setNewToken] = useState<NewToken | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // simulator state
  const [simEffort, setSimEffort] = useState(0);
  const [holding, setHolding] = useState(false);
  const holdRef = useRef(false);
  const effortRef = useRef(0);
  const simKey = useRef<string | null>(null);
  const simSqueezes = useRef(0);
  const buffer = useRef<number[]>([]);
  const lastActive = useRef(0);
  const [simActive, setSimActive] = useState(false);

  const poll = useCallback(async () => {
    const res = await fetch("/api/device/live", { cache: "no-store" }).catch(() => null);
    if (!res?.ok) return;
    const body = await res.json();
    setPairing(body.pairing);
    setSession(body.session);
    setNow(Date.now());
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") poll();
    }, 1000);
    return () => clearInterval(t);
  }, [poll]);

  const send = useCallback(
    async (done: boolean) => {
      const key = simKey.current;
      if (!key) return;
      const readings = buffer.current.splice(0, buffer.current.length);
      if (done) {
        // Stop the simulator first so no further batches go out for this session.
        simKey.current = null;
        holdRef.current = false;
        effortRef.current = 0;
        setHolding(false);
        setSimEffort(0);
        setSimActive(false);
      }
      const res = await fetch("/api/device/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session: key, readings, squeezes: simSqueezes.current, done }),
      }).catch(() => null);
      if (res?.ok) setSession((await res.json()).session);
    },
    [],
  );

  // Simulated physics: effort rises while held and relaxes when released. 10 updates a second.
  useEffect(() => {
    if (!simActive) return;
    let tick = 0;
    const t = setInterval(() => {
      tick++;
      const target = holdRef.current ? 72 + Math.sin(tick / 3) * 10 + Math.random() * 8 : 0;
      const next = Math.max(0, Math.min(100, effortRef.current + (target - effortRef.current) * (holdRef.current ? 0.3 : 0.45)));
      effortRef.current = next < 1 ? 0 : next;
      setSimEffort(Math.round(effortRef.current));
      if (tick % 2 === 0) buffer.current.push(Math.round(effortRef.current)); // 5 readings a second, like the ball
      if (tick % 8 === 0) send(false);
      if (holdRef.current || effortRef.current > 2) lastActive.current = Date.now();
      else if (Date.now() - lastActive.current > 15_000) send(true); // same 15 s idle rule as the ball
    }, 100);
    return () => clearInterval(t);
  }, [simActive, send]);

  function press() {
    if (!simKey.current) {
      simKey.current = `sim${Date.now().toString(36)}`;
      simSqueezes.current = 0;
      buffer.current = [];
      setSimActive(true);
    }
    simSqueezes.current++;
    lastActive.current = Date.now();
    holdRef.current = true;
    setHolding(true);
  }
  function release() {
    holdRef.current = false;
    setHolding(false);
  }

  async function pair() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/device/token", { method: "POST" }).catch(() => null);
    if (res?.ok) {
      setNewToken(await res.json());
      poll();
    } else setError("Couldn't create a pairing code. Please try again.");
    setBusy(false);
  }
  async function unpair() {
    setBusy(true);
    await fetch("/api/device/token", { method: "DELETE" }).catch(() => null);
    setNewToken(null);
    await poll();
    setBusy(false);
  }
  async function discard(id: string) {
    await fetch(`/api/device/sessions/${id}`, { method: "DELETE" }).catch(() => null);
    await poll();
    router.refresh();
  }

  const live = session?.status === "live" ? session : null;
  const ended = session?.status === "ended" ? session : null;
  const shown = simActive ? simEffort : (live?.lastEffort ?? 0);
  const deviceOnline = pairing.lastSeenAt && now - new Date(pairing.lastSeenAt).getTime() < 60_000;
  const [hostName, hostPort] = (newToken?.host ?? "").split(":");

  return (
    <div className="stack-6">
      <section className="card stack-4" aria-labelledby="live-h">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div className="stack-1" style={{ flexShrink: 0 }}>
            <h2 id="live-h" className="eyebrow">
              Live squeeze effort
            </h2>
            <div className="effort-big" aria-live="off">
              {shown}
              <small>/ 100</small>
            </div>
          </div>
          {simActive || live?.source === "simulated" ? (
            <SourceBadge source="simulated" />
          ) : live ? (
            <SourceBadge source="device" />
          ) : (
            <span className="badge">Waiting for a squeeze</span>
          )}
        </div>
        <EffortBar value={shown} />
        {live && (
          <div className="effort-stats">
            <div>
              <strong>{live.peakEffort}</strong>
              <span>peak</span>
            </div>
            <div>
              <strong>{formatDuration(live.durationMs)}</strong>
              <span>so far</span>
            </div>
            <div>
              <strong>{live.squeezes}</strong>
              <span>squeezes</span>
            </div>
          </div>
        )}
        {live && live.samples.length > 1 && <EffortSpark samples={live.samples} />}
      </section>

      {ended && (
        <section className="card card-sage stack-3" aria-labelledby="draft-h">
          <div className="row" style={{ gap: 8, justifyContent: "space-between" }}>
            <h2 id="draft-h" style={{ fontSize: "var(--fs-18)" }}>
              Session ready to log
            </h2>
            <SourceBadge source={ended.source} />
          </div>
          <p className="small">
            Peak effort {ended.peakEffort}, {formatDuration(ended.durationMs)}, {ended.squeezes} {ended.squeezes === 1 ? "squeeze" : "squeezes"}. We saved it as a draft. Add the
            details and it goes in your diary.
          </p>
          <div className="row" style={{ gap: 8 }}>
            <Link className="btn btn-primary" href={`/me/log?squeeze=${encodeURIComponent(ended.id)}`}>
              <Icon name="plus" /> Log this trip
            </Link>
            <button type="button" className="btn btn-ghost" onClick={() => discard(ended.id)}>
              Discard
            </button>
          </div>
        </section>
      )}

      <section className="card stack-3" aria-labelledby="sim-h">
        <div className="row" style={{ justifyContent: "space-between", gap: 8 }}>
          <h2 id="sim-h" style={{ fontSize: "var(--fs-18)" }}>
            No ball handy? Try the simulator
          </h2>
          <span className="badge badge-demo">Simulated</span>
        </div>
        <p className="small muted">Press and hold to squeeze, let go to relax. It sends readings through the same path as the real ball, marked as simulated.</p>
        <button
          type="button"
          className={`squeeze-btn${holding ? " held" : ""}`}
          style={{ ["--squeeze" as string]: simEffort / 100 }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            press();
          }}
          onPointerUp={release}
          onPointerCancel={release}
          onKeyDown={(e) => {
            if ((e.key === " " || e.key === "Enter") && !e.repeat) {
              e.preventDefault();
              press();
            }
          }}
          onKeyUp={(e) => {
            if (e.key === " " || e.key === "Enter") release();
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          {holding ? "Squeezing…" : "Hold to squeeze"}
        </button>
        {simActive && (
          <button type="button" className="btn btn-secondary btn-block" onClick={() => send(true)}>
            Finish session
          </button>
        )}
      </section>

      <section className="card stack-3" aria-labelledby="pair-h">
        <div className="row" style={{ justifyContent: "space-between", gap: 8 }}>
          <h2 id="pair-h" style={{ fontSize: "var(--fs-18)" }}>
            Your squeeze ball
          </h2>
          {pairing.paired ? (
            <span className={`badge ${deviceOnline ? "badge-ok" : ""}`}>{deviceOnline ? "Online" : `Paired · last heard ${ago(pairing.lastSeenAt, now)}`}</span>
          ) : (
            <span className="badge">Not paired</span>
          )}
        </div>
        <p className="small muted">
          The ball is an Arduino with a pressure sensor sealed in a bag with a stress ball. It sends squeeze readings over Wi-Fi with its own pairing code, which can only add
          squeeze readings to your diary. <a href="https://github.com/abbyfungg/gut-feeling/blob/main/docs/HARDWARE.md" target="_blank" rel="noreferrer">How to build one</a>
        </p>
        {newToken && (
          <div className="notice notice-warn stack-2" role="status">
            <strong>Copy these into the Arduino sketch now. The code is shown only once.</strong>
            <pre className="pair-code">
              {`#define SERVER_HOST  "${hostName}"\n#define SERVER_PORT  ${hostPort || (newToken.secure ? 443 : 80)}\n#define USE_TLS      ${newToken.secure ? 1 : 0}\n#define DEVICE_TOKEN "${newToken.token}"`}
            </pre>
            <button type="button" className="btn btn-sm btn-secondary" onClick={() => navigator.clipboard?.writeText(newToken.token)}>
              Copy pairing code
            </button>
          </div>
        )}
        {error && (
          <p className="notice notice-alert" role="alert">
            {error}
          </p>
        )}
        <div className="row wrap" style={{ gap: 8 }}>
          <button type="button" className="btn btn-primary" onClick={pair} disabled={busy}>
            {pairing.paired ? "Make a new pairing code" : "Pair a squeeze ball"}
          </button>
          {pairing.paired && (
            <button type="button" className="btn btn-danger-ghost" onClick={unpair} disabled={busy}>
              Unpair
            </button>
          )}
        </div>
      </section>

      <p className="tiny muted" style={{ padding: "0 4px" }}>
        Squeeze effort is how hard you squeezed the ball, from 0 to 100, compared with your own ball at rest. It can help you notice and talk about hard days. It is not a
        medical measurement of straining.
      </p>
    </div>
  );
}
