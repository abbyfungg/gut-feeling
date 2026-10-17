"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { BRISTOL, CONTEXT_TAGS, SYMPTOMS, bristolInfo, type BloodReport, type ContextId, type SymptomId } from "@/lib/domain";
import { BristolArt } from "./BristolArt";
import { Icon } from "./Icon";
import { Mascot } from "./Mascot";

type AiState =
  | { kind: "idle" }
  | { kind: "busy" }
  | { kind: "result"; status: "ok" | "unclassifiable"; analysisId: string | null; estimatedType: number | null; confidence: string; observations: string[]; limitations: string; message?: string; colorAttention: boolean }
  | { kind: "error"; message: string };

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

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
  const [step, setStep] = useState(0);
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
    setQualityTip(lum == null ? null : lum < 45 ? "This photo looks quite dark. Turning on a light or the flash usually helps." : lum > 235 ? "This photo looks very bright or washed out. Try without the flash." : null);
    setAi({ kind: "busy" });
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
    setPeek(false);
    const fd = new FormData();
    fd.append("photo", file);
    const res = await fetch("/api/analyze", { method: "POST", body: fd }).catch(() => null);
    const body = res ? await res.json().catch(() => ({})) : {};
    if (!res) return setAi({ kind: "error", message: "Couldn't reach the server. Pick the type that looks closest." });
    if (!res.ok || (body.status !== "ok" && body.status !== "unclassifiable")) {
      return setAi({ kind: "error", message: body.message ?? body.error ?? "Photo help didn't work this time. Pick the type that looks closest." });
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
      router.push("/me?saved=1");
      router.refresh();
      return;
    }
    if (res?.status === 400 && aiRef && /analysis has expired/.test(body.error ?? "")) {
      clearPhoto();
      setError("That photo suggestion expired, so we've removed it. Everything else you picked is still here; tap Save again.");
    } else setError(body.error ?? "We couldn't save that. Check your connection and try again.");
    setSaving(false);
  }

  const aiType = ai.kind === "result" ? ai.estimatedType : null;
  const STEPS = 4;
  const last = step === STEPS - 1;
  const answered = [true, blood !== null, symptoms !== null, true][step];
  const go = (n: number) => {
    setStep(Math.max(0, Math.min(STEPS - 1, n)));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (last) save();
        else go(step + 1);
      }}
      className="stack-lg"
      style={{ paddingTop: 14 }}
    >
      <div className="wizard-top">
        <Link href="/me" className="icon-btn" aria-label="Close without saving">
          <Icon name="x" />
        </Link>
        <div className="progress" role="progressbar" aria-label="Progress" aria-valuemin={1} aria-valuemax={STEPS} aria-valuenow={step + 1}>
          <span style={{ width: `${((step + 1) / STEPS) * 100}%` }} />
        </div>
        <span className="small bold muted" style={{ minWidth: 34, textAlign: "right" }}>
          {step + 1}/{STEPS}
        </span>
      </div>

      {step === 0 && (
        <div className="screen stack" key="s0">
          <div>
            <h1 className="step-title">What did it look like?</h1>
            <p className="muted small" style={{ margin: "6px 0 0" }}>
              Pick the closest shape. Not sure is fine too.
            </p>
          </div>

          {aiEnabled ? (
            <div className="stack-sm">
              <label className="photo-cta">
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="Your photo (blurred for privacy)" className={`photo-thumb${peek ? " peek" : ""}`} />
                ) : (
                  <span className="cta-icon">
                    <Icon name="camera" size={24} />
                  </span>
                )}
                <span className="grow">
                  <span className="bold" style={{ display: "block" }}>
                    {preview ? "Use a different photo" : "Snap a photo"}
                  </span>
                  <span className="tiny" style={{ opacity: 0.75 }}>
                    Gemini suggests a shape. Photo is never stored.
                  </span>
                </span>
                <Icon name="chevron" size={18} />
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic"
                  capture="environment"
                  className="visually-hidden"
                  aria-label="Take or choose a photo"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) analyze(f);
                  }}
                />
              </label>
              {preview && (
                <div className="row" style={{ gap: 6 }}>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPeek((p) => !p)}>
                    {peek ? "Blur it again" : "Peek at photo"}
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={clearPhoto}>
                    Remove photo
                  </button>
                </div>
              )}
              <div aria-live="polite" className="stack-sm">
                {qualityTip && <p className="notice notice-med" style={{ margin: 0 }}>{qualityTip}</p>}
                {ai.kind === "busy" && (
                  <div className="ai-card row" style={{ gap: 10 }}>
                    <span className="spinner" aria-hidden /> Taking a careful look…
                  </div>
                )}
                {ai.kind === "error" && <p className="notice notice-info" style={{ margin: 0 }}>{ai.message}</p>}
                {ai.kind === "result" && (
                  <div className="ai-card stack-sm">
                    <div className="row" style={{ gap: 8 }}>
                      <Icon name="sparkle" size={18} />
                      {ai.status === "ok" && ai.estimatedType ? (
                        <strong>
                          Looks like type {ai.estimatedType}: {bristolInfo(ai.estimatedType)?.nickname}
                        </strong>
                      ) : (
                        <strong>{ai.message}</strong>
                      )}
                    </div>
                    {ai.status === "ok" && ai.estimatedType && (
                      <div className="row wrap" style={{ gap: 6 }}>
                        <span className="pill pill-lav">{ai.confidence} confidence</span>
                        <span className="tiny">Selected below. Change it if it&apos;s off.</span>
                      </div>
                    )}
                    {ai.observations.length > 0 && (
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {ai.observations.map((o, i) => (
                          <li key={i}>{o}</li>
                        ))}
                      </ul>
                    )}
                    <p className="tiny" style={{ margin: 0, opacity: 0.85 }}>
                      AI estimate, not a diagnosis. {ai.limitations}
                    </p>
                    {ai.colorAttention && (
                      <p className="tiny" style={{ margin: 0 }}>
                        Colours are hard to judge in photos. If you noticed red or black yourself, say so on the next step.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="tiny muted row" style={{ margin: 0, gap: 6 }}>
              <Icon name="info" size={14} /> Photo help isn&apos;t switched on for this server. Picking a shape works just as well.
            </p>
          )}

          <fieldset>
            <legend className="visually-hidden">Which looks closest?</legend>
            <div className="shape-grid">
              {BRISTOL.map((b) => (
                <label key={b.type} className="shape" data-group={b.group}>
                  <input type="radio" name="bristol" value={b.type} checked={type === b.type} onChange={() => setType(b.type)} />
                  {aiType === b.type && <span className="pill pill-lav ai-badge">AI pick</span>}
                  <span className="shape-art">
                    <BristolArt type={b.type} size={64} />
                  </span>
                  <span className="shape-num">Type {b.type}</span>
                  <span className="shape-name">{b.nickname}</span>
                  <span className="shape-desc">{b.description}</span>
                </label>
              ))}
              <label className="shape" data-group="skip">
                <input type="radio" name="bristol" value="" checked={type === null} onChange={() => setType(null)} />
                <span className="shape-art">
                  <span aria-hidden style={{ fontSize: 30, fontFamily: "var(--font-display)", fontWeight: 800, color: "var(--ink-3)" }}>
                    ?
                  </span>
                </span>
                <span className="shape-num">Skip</span>
                <span className="shape-name">Not sure</span>
                <span className="shape-desc">Log it without a type</span>
              </label>
            </div>
          </fieldset>
        </div>
      )}

      {step === 1 && (
        <div className="screen stack" key="s1">
          <div>
            <h1 className="step-title">Any red or black colour?</h1>
            <p className="muted small" style={{ margin: "6px 0 0" }}>
              Beets, iron and some medicines can change colour too.
            </p>
          </div>
          <div className="option-list" role="group" aria-label="Red or black colour">
            {(
              [
                ["no", "No", "check", "tint-sage"],
                ["yes", "Yes", "drop", "tint-blush"],
                ["unsure", "Not sure", "info", "tint-butter"],
              ] as const
            ).map(([v, label, icon, tint]) => (
              <button key={v} type="button" className="option" aria-pressed={blood === v} onClick={() => setBlood(blood === v ? null : v)}>
                <span className={`opt-icon ${tint}`}>
                  <Icon name={icon} />
                </span>
                {label}
              </button>
            ))}
          </div>
          {blood === "yes" && (
            <p className="notice notice-high" style={{ margin: 0 }}>
              Thanks for telling us. Please contact a healthcare provider soon. If there&apos;s a lot of blood or you feel faint or dizzy, get urgent care.
            </p>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="screen stack" key="s2">
          <div>
            <h1 className="step-title">How did you feel?</h1>
            <p className="muted small" style={{ margin: "6px 0 0" }}>
              Pick any, or skip. Skipping means &ldquo;didn&apos;t say&rdquo;.
            </p>
          </div>
          <div className="chips">
            <button type="button" className="chip positive" aria-pressed={symptoms !== null && symptoms.length === 0} onClick={() => setSymptoms(symptoms && symptoms.length === 0 ? null : [])}>
              <Icon name="smile" size={16} /> Felt fine
            </button>
            {SYMPTOMS.map((s) => (
              <button key={s.id} type="button" className="chip" aria-pressed={!!symptoms?.includes(s.id)} onClick={() => setSymptoms(toggle(symptoms, s.id))}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="screen stack-lg" key="s3">
          <div>
            <h1 className="step-title">Anything else?</h1>
            <p className="muted small" style={{ margin: "6px 0 0" }}>
              All optional. Context helps spot patterns.
            </p>
          </div>
          <fieldset className="stack-sm">
            <legend className="label">When</legend>
            <div className="segmented" role="group" aria-label="When did it happen">
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
          </fieldset>
          <fieldset className="stack-sm">
            <legend className="label">Going on lately</legend>
            <div className="chips">
              {CONTEXT_TAGS.map((c) => (
                <button key={c.id} type="button" className="chip" aria-pressed={!!context?.includes(c.id)} onClick={() => setContext(toggle(context, c.id))}>
                  {c.label}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="field">
            <label htmlFor="notes" className="label">
              Notes <span className="hint">(visible to anyone you share with)</span>
            </label>
            <textarea id="notes" maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. tummy grumbled after lunch" />
          </div>
          <div className="card flat tint-butter row" style={{ gap: 12, border: 0 }}>
            {type ? <BristolArt type={type} size={44} /> : <Mascot mood="think" size={40} bob={false} />}
            <div className="small">
              <div className="bold">{type ? `Type ${type}: ${bristolInfo(type)?.nickname}` : "No type picked (that's okay)"}</div>
              <div className="muted tiny">
                {[blood === "yes" ? "Red/black colour" : blood === "unsure" ? "Colour unsure" : blood === "no" ? "No red/black" : null, symptoms === null ? null : symptoms.length ? `${symptoms.length} symptom${symptoms.length > 1 ? "s" : ""}` : "Felt fine"]
                  .filter(Boolean)
                  .join(" · ") || "Nothing else added"}
              </div>
            </div>
          </div>
          {error && (
            <p className="form-error" role="alert" style={{ margin: 0 }}>
              {error}
            </p>
          )}
        </div>
      )}

      <div className="wizard-bar">
        {step > 0 && (
          <button type="button" className="btn btn-secondary btn-lg" onClick={() => go(step - 1)} aria-label="Previous step">
            <Icon name="back" />
          </button>
        )}
        {last ? (
          <button type="submit" className="btn btn-primary btn-lg grow" disabled={saving || ai.kind === "busy"}>
            {saving && <span className="spinner" aria-hidden />}
            Save to my diary
          </button>
        ) : (
          <button type="submit" className="btn btn-primary btn-lg grow" disabled={ai.kind === "busy" && step === 0}>
            {answered ? "Next" : "Skip"} <Icon name="arrow" />
          </button>
        )}
      </div>
    </form>
  );
}
