"use client";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { BRISTOL, CONTEXT_TAGS, SYMPTOMS, bristolInfo, type BloodReport, type ContextId, type SymptomId } from "@/lib/domain";
import { BristolArt } from "./BristolArt";
import { Icon } from "./Icon";
import { Womby } from "./Womby";
import { CONTEXT_ICON, SYMPTOM_ICON } from "./patient/meta";

type AiState =
  | { kind: "idle" }
  | { kind: "busy" }
  | { kind: "result"; status: "ok" | "unclassifiable"; analysisId: string | null; estimatedType: number | null; confidence: string; observations: string[]; limitations: string; message?: string; colorAttention: boolean }
  | { kind: "error"; message: string };

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** One calm, guided form. Only the shape matters; everything else is optional and "skipped" stays "unknown". */
export function LogForm({ aiEnabled }: { aiEnabled: boolean }) {
  const router = useRouter();
  const [when, setWhen] = useState<"now" | "earlier">("now");
  const nowInput = useMemo(() => toLocalInput(new Date()), []);
  const [earlier, setEarlier] = useState(nowInput);
  const [type, setType] = useState<number | null>(null);
  const [symptoms, setSymptoms] = useState<SymptomId[] | null>(null);
  const [context, setContext] = useState<ContextId[] | null>(null);
  const [blood, setBlood] = useState<BloodReport | null>(null);
  const [notes, setNotes] = useState("");
  const [ai, setAi] = useState<AiState>({ kind: "idle" });
  const [preview, setPreview] = useState<string | null>(null);
  const [peek, setPeek] = useState(false);
  const [qualityTip, setQualityTip] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const toggle = <T extends string>(list: T[] | null, id: T): T[] | null => {
    const cur = list ?? [];
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    return next.length ? next : null;
  };

  /** Quick on-device check so very dark or washed-out photos get a retake tip before anything is uploaded. */
  async function brightness(file: File): Promise<number | null> {
    try {
      const bmp = await createImageBitmap(file);
      const c = document.createElement("canvas");
      c.width = 48;
      c.height = 48;
      const ctx = c.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(bmp, 0, 0, 48, 48);
      const d = ctx.getImageData(0, 0, 48, 48).data;
      let sum = 0;
      for (let i = 0; i < d.length; i += 4) sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      return sum / (d.length / 4);
    } catch {
      return null; // e.g. HEIC on browsers that can't decode it; let the server decide
    }
  }

  async function analyze(file: File) {
    const lum = await brightness(file);
    setQualityTip(lum == null ? null : lum < 45 ? "This photo looks quite dark. Turning on a light usually helps." : lum > 235 ? "This photo looks washed out. Try without the flash." : null);
    setAi({ kind: "busy" });
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
    setPeek(false);
    const fd = new FormData();
    fd.append("photo", file);
    const res = await fetch("/api/analyze", { method: "POST", body: fd }).catch(() => null);
    const body = res ? await res.json().catch(() => ({})) : {};
    if (!res) return setAi({ kind: "error", message: "You seem to be offline, so the photo wasn't sent. Pick the closest type above instead." });
    if (!res.ok || (body.status !== "ok" && body.status !== "unclassifiable")) {
      return setAi({ kind: "error", message: body.message ?? body.error ?? "Photo analysis didn't work this time. Pick the closest type above; your entry will save normally." });
    }
    const r = body.result;
    setAi({
      kind: "result",
      status: body.status,
      analysisId: body.analysisId ?? null,
      estimatedType: r.estimatedType,
      confidence: r.confidence,
      observations: r.observations ?? [],
      limitations: r.limitations,
      message: body.message,
      colorAttention: !!body.colorAttention,
    });
    if (body.status === "ok" && r.estimatedType) setType(r.estimatedType);
  }

  function clearPhoto() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setQualityTip(null);
    setAi({ kind: "idle" });
    if (fileRef.current) fileRef.current.value = "";
  }

  async function save() {
    setSaving(true);
    setError(null);
    const occurredAt = when === "now" ? new Date().toISOString() : new Date(earlier).toISOString();
    const aiRef = ai.kind === "result" && ai.analysisId && ai.estimatedType != null ? { analysisId: ai.analysisId } : null;
    const res = await fetch("/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "movement",
        occurredAt,
        bristolType: type,
        bristolSource: type == null ? null : "user",
        symptoms,
        context,
        bloodReport: blood,
        notes: notes.trim() || null,
        ai: aiRef,
      }),
    }).catch(() => null);
    const body = res ? await res.json().catch(() => ({})) : {};
    if (res?.ok) {
      clearPhoto();
      router.push(`/me/saved?id=${encodeURIComponent(body.entry?.id ?? "")}`);
      router.refresh();
      return;
    }
    if (res?.status === 400 && aiRef && /analysis has expired/.test(body.error ?? "")) {
      clearPhoto();
      setError("The photo suggestion expired, so we removed it. Everything else is still here. Tap Save again.");
    } else if (!res) setError("You seem to be offline. Your answers are still here; try again when you're connected.");
    else setError(body.error ?? "We couldn't save that. Please try again.");
    setSaving(false);
  }

  const aiType = ai.kind === "result" ? ai.estimatedType : null;
  const chosen = bristolInfo(type);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      aria-label="Log a bathroom trip"
    >
      <section className="log-section" aria-labelledby="sec-when">
        <header>
          <h2 id="sec-when">When</h2>
        </header>
        <div className="segmented" role="group" aria-label="When did it happen" style={{ width: "100%" }}>
          <button type="button" aria-pressed={when === "now"} onClick={() => setWhen("now")}>
            Just now
          </button>
          <button type="button" aria-pressed={when === "earlier"} onClick={() => setWhen("earlier")}>
            Earlier
          </button>
        </div>
        {when === "earlier" && (
          <div className="field">
            <label htmlFor="when">Date and time</label>
            <input id="when" type="datetime-local" value={earlier} max={nowInput} onChange={(e) => setEarlier(e.target.value)} required />
          </div>
        )}
      </section>

      <section className="log-section" aria-labelledby="sec-type">
        <header>
          <h2 id="sec-type">Stool type</h2>
          <span className="optional">Bristol scale</span>
        </header>
        <fieldset>
          <legend className="sr-only">Which looks closest?</legend>
          <div className="bristol">
            {BRISTOL.map((b) => (
              <label key={b.type} className="bristol-opt" title={`${b.nickname}: ${b.description}`}>
                <input type="radio" name="bristol" value={b.type} checked={type === b.type} onChange={() => setType(b.type)} aria-label={`Type ${b.type}, ${b.nickname}`} />
                {aiType === b.type && <span className="bristol-ai">AI</span>}
                <BristolArt type={b.type} size={36} />
                <span className="bristol-num">{b.type}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="bristol-detail" aria-live="polite">
          {chosen ? (
            <>
              <span className={`entry-art ${chosen.group}`}>
                <BristolArt type={chosen.type} size={36} />
              </span>
              <span className="grow">
                <span className="strong" style={{ display: "block" }}>
                  Type {chosen.type} · {chosen.nickname}
                </span>
                <span className="small muted">{chosen.description}</span>
              </span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setType(null)}>
                Clear
              </button>
            </>
          ) : (
            <>
              <Womby pose="curious" size={42} />
              <span className="small muted">Pick the closest shape. Not sure? Leave it blank or try a photo.</span>
            </>
          )}
        </div>
      </section>

      <section className="log-section" aria-labelledby="sec-photo">
        <header>
          <h2 id="sec-photo">Photo analysis</h2>
          <span className="optional">Optional · AI</span>
        </header>
        {aiEnabled ? (
          <>
            {preview ? (
              <div className="row">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Your photo, blurred for privacy" className={`photo-thumb${peek ? " peek" : ""}`} />
                <div className="stack-1 grow">
                  <span className="small muted">Kept only on this screen. Never stored.</span>
                  <div className="row-2 wrap">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPeek((p) => !p)}>
                      {peek ? "Blur" : "Peek"}
                    </button>
                    <label className="btn btn-ghost btn-sm" style={{ cursor: "pointer" }}>
                      Retake
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/heic"
                        capture="environment"
                        className="sr-only"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) analyze(f);
                        }}
                      />
                    </label>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={clearPhoto}>
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <label className="photo-drop">
                <Icon name="camera" size={26} />
                <span className="strong" style={{ color: "var(--text)" }}>
                  Tap to add or take a photo
                </span>
                <span className="small">AI suggests a type. You decide. The photo is never stored.</span>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic"
                  capture="environment"
                  className="sr-only"
                  aria-label="Take or choose a photo"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) analyze(f);
                  }}
                />
              </label>
            )}
            <div aria-live="polite" className="stack-2">
              {qualityTip && (
                <p className="notice notice-warn">
                  <Icon name="sun" size={16} /> {qualityTip}
                </p>
              )}
              {ai.kind === "busy" && (
                <div className="ai-panel">
                  <div className="row">
                    <Womby pose="thinking" size={42} />
                    <div className="stack-1">
                      <span className="strong">Taking a careful look…</span>
                      <span className="small muted">This usually takes a few seconds.</span>
                    </div>
                  </div>
                </div>
              )}
              {ai.kind === "error" && (
                <p className="notice notice-info" role="status">
                  <Icon name="info" size={16} /> {ai.message}
                </p>
              )}
              {ai.kind === "result" && (
                <div className="ai-panel">
                  <div className="ai-title">
                    <Icon name="sparkle" size={16} /> AI estimate · not a diagnosis
                  </div>
                  {ai.status === "ok" && ai.estimatedType ? (
                    <p>
                      <strong>Looks closest to type {ai.estimatedType}</strong> ({bristolInfo(ai.estimatedType)?.nickname}), {ai.confidence} confidence. We&apos;ve selected it
                      above. Change it if it doesn&apos;t look right.
                    </p>
                  ) : (
                    <p>
                      <strong>{ai.message ?? "Couldn't tell from this photo."}</strong>
                    </p>
                  )}
                  {ai.observations.length > 0 && (
                    <ul style={{ paddingLeft: 18 }} className="small">
                      {ai.observations.map((o, i) => (
                        <li key={i}>{o}</li>
                      ))}
                    </ul>
                  )}
                  <p className="tiny muted">{ai.limitations}</p>
                  {ai.colorAttention && <p className="tiny">Colours are hard to judge in photos. If you noticed red or black yourself, say so below.</p>}
                </div>
              )}
            </div>
          </>
        ) : (
          <p className="notice">
            <Icon name="info" size={16} />
            <span>Photo analysis isn&apos;t set up on this server yet, so nothing is uploaded. Picking a type works just as well.</span>
          </p>
        )}
      </section>

      <section className="log-section" aria-labelledby="sec-colour">
        <header>
          <h2 id="sec-colour">Any red or black colour?</h2>
          <span className="optional">Optional</span>
        </header>
        <div className="segmented" role="group" aria-label="Red or black colour" style={{ width: "100%" }}>
          {(
            [
              ["no", "No"],
              ["yes", "Yes"],
              ["unsure", "Not sure"],
            ] as const
          ).map(([v, label]) => (
            <button key={v} type="button" aria-pressed={blood === v} onClick={() => setBlood(blood === v ? null : v)}>
              {label}
            </button>
          ))}
        </div>
        {blood === "yes" ? (
          <p className="notice notice-alert">
            <Icon name="alert" size={16} />
            <span>Thanks for noting it. Please contact a healthcare provider soon. If there&apos;s a lot of blood, or you feel faint or dizzy, get urgent care.</span>
          </p>
        ) : (
          <p className="help">Beets, iron and some medicines can change colour too.</p>
        )}
      </section>

      <section className="log-section" aria-labelledby="sec-symptoms">
        <header>
          <h2 id="sec-symptoms">Symptoms</h2>
          <span className="optional">Optional</span>
        </header>
        <div className="symptoms">
          <button type="button" className="symptom" aria-pressed={symptoms !== null && symptoms.length === 0} onClick={() => setSymptoms(symptoms && symptoms.length === 0 ? null : [])}>
            <span className="symptom-icon">
              <Icon name="smile" size={18} />
            </span>
            Felt fine
          </button>
          {SYMPTOMS.map((s) => (
            <button key={s.id} type="button" className="symptom" aria-pressed={!!symptoms?.includes(s.id)} onClick={() => setSymptoms(toggle(symptoms, s.id))}>
              <span className="symptom-icon">
                <Icon name={SYMPTOM_ICON[s.id]} size={18} />
              </span>
              {s.label}
            </button>
          ))}
        </div>
        <p className="help">Skipping means &ldquo;didn&apos;t say&rdquo;, not &ldquo;felt fine&rdquo;.</p>
      </section>

      <section className="log-section" aria-labelledby="sec-context">
        <header>
          <h2 id="sec-context">Anything going on lately?</h2>
          <span className="optional">Optional</span>
        </header>
        <div className="chips">
          {CONTEXT_TAGS.map((c) => (
            <button key={c.id} type="button" className="chip" aria-pressed={!!context?.includes(c.id)} onClick={() => setContext(toggle(context, c.id))}>
              <Icon name={CONTEXT_ICON[c.id]} size={16} />
              {c.label}
            </button>
          ))}
        </div>
      </section>

      <section className="log-section" aria-labelledby="sec-notes">
        <header>
          <h2 id="sec-notes">
            <label htmlFor="notes">Notes</label>
          </h2>
          <span className="optional">Optional · visible to anyone you share with</span>
        </header>
        <textarea id="notes" maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. tummy grumbled after lunch" />
      </section>

      <div className="save-bar stack-2">
        {error && (
          <p className="form-error" role="alert">
            <Icon name="alert" size={16} /> {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={saving || ai.kind === "busy"}>
          {saving && <span className="spinner" aria-hidden />}
          Save entry
        </button>
      </div>
    </form>
  );
}
