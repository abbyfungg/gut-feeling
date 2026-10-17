"use client";
import { useRouter } from "next/navigation";
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

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      style={{ marginTop: 18 }}
    >
      <section className="card log-section">
        <fieldset>
          <legend>When?</legend>
          <div className="segmented" role="group" aria-label="When did it happen">
            <button type="button" aria-pressed={when === "now"} onClick={() => setWhen("now")}>
              Just now
            </button>
            <button type="button" aria-pressed={when === "earlier"} onClick={() => setWhen("earlier")}>
              Earlier
            </button>
          </div>
          {when === "earlier" && (
            <div className="field" style={{ marginTop: 12, maxWidth: 320 }}>
              <label htmlFor="when">Date and time</label>
              <input id="when" type="datetime-local" value={earlier} max={nowInput} onChange={(e) => setEarlier(e.target.value)} required />
            </div>
          )}
        </fieldset>
      </section>

      <section className="card log-section">
        <h2 style={{ fontSize: "1.15rem" }}>Photo help (optional)</h2>
        {aiEnabled ? (
          <>
            <p className="hint">
              Snap a photo and Gemini will suggest the closest type. You always get the final say. The photo is sent for analysis, then thrown away;
              we never store it.
            </p>
            <div className="photo-drop">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Your photo (blurred for privacy)" className={`photo-preview${peek ? " peek" : ""}`} />
              ) : (
                <Mascot mood="think" size={72} bob={false} />
              )}
              <div className="stack" style={{ flex: 1, minWidth: 200 }}>
                <label className="btn btn-soft" style={{ width: "fit-content", marginBottom: 0 }}>
                  <Icon name="camera" /> {preview ? "Use a different photo" : "Take or choose a photo"}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic"
                    capture="environment"
                    className="visually-hidden"
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
              </div>
            </div>
            <div aria-live="polite" style={{ marginTop: 12 }}>
              {qualityTip && <p className="notice notice-med" style={{ marginBottom: 10 }}>{qualityTip}</p>}
              {ai.kind === "busy" && (
                <p className="row" style={{ gap: 8 }}>
                  <span className="spinner" aria-hidden /> Taking a careful look…
                </p>
              )}
              {ai.kind === "error" && <p className="notice notice-info">{ai.message}</p>}
              {ai.kind === "result" && (
                <div className="ai-result">
                  {ai.status === "ok" && ai.estimatedType ? (
                    <p style={{ fontWeight: 700 }}>
                      Looks closest to type {ai.estimatedType}: {bristolInfo(ai.estimatedType)?.nickname} ({ai.confidence} confidence). We&apos;ve
                      selected it below; change it if it&apos;s not right.
                    </p>
                  ) : (
                    <p style={{ fontWeight: 700 }}>{ai.message}</p>
                  )}
                  {ai.observations.length > 0 && (
                    <ul style={{ margin: "0 0 8px", paddingLeft: 18 }}>
                      {ai.observations.map((o, i) => (
                        <li key={i}>{o}</li>
                      ))}
                    </ul>
                  )}
                  <p className="hint" style={{ margin: 0 }}>
                    AI estimate, not a diagnosis. {ai.limitations}
                  </p>
                  {ai.colorAttention && (
                    <p className="hint" style={{ margin: "8px 0 0" }}>
                      The colours in this photo are hard to judge, and lighting or food can change them. If you noticed any red or black colour
                      yourself, please say so below.
                    </p>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <p className="hint" style={{ margin: 0 }}>
            Photo help isn&apos;t switched on for this server, so there&apos;s nothing to upload. Just pick the shape that looks closest below; it works
            just as well.
          </p>
        )}
      </section>

      <section className="card log-section">
        <fieldset>
          <legend>Which looks closest?</legend>
          <p className="hint">The Bristol Stool Form Scale, minus the awkwardness. Types 3–5 are the comfy middle.</p>
          <div className="bristol-grid">
            {BRISTOL.map((b) => (
              <label key={b.type} className="bristol-option" data-group={b.group}>
                <input type="radio" name="bristol" value={b.type} checked={type === b.type} onChange={() => setType(b.type)} />
                {aiType === b.type && <span className="pill pill-lav ai-badge">AI pick</span>}
                <span className="b-art">
                  <BristolArt type={b.type} size={70} />
                </span>
                <span className="b-type">Type {b.type}</span>
                <span className="b-name">{b.nickname}</span>
                <span className="b-desc">{b.description}</span>
              </label>
            ))}
            <label className="bristol-option skip">
              <input type="radio" name="bristol" value="" checked={type === null} onChange={() => setType(null)} />
              <span className="b-art">
                <span aria-hidden style={{ fontSize: 28, fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--cocoa-deep)" }}>
                  ?
                </span>
              </span>
              <span className="b-type">Skip</span>
              <span className="b-name">Not sure</span>
              <span className="b-desc">Log it without a type</span>
            </label>
          </div>
        </fieldset>
      </section>

      <section className="card log-section">
        <fieldset>
          <legend>Did you notice any red or black colour?</legend>
          <p className="hint">Beets, iron and some medicines can change colour too. Your answer helps your care team know what to ask.</p>
          <div className="segmented" role="group" aria-label="Red or black colour">
            {(
              [
                [null, "Skip"],
                ["no", "No"],
                ["yes", "Yes"],
                ["unsure", "Not sure"],
              ] as const
            ).map(([v, label]) => (
              <button key={label} type="button" aria-pressed={blood === v} onClick={() => setBlood(v)}>
                {label}
              </button>
            ))}
          </div>
          {blood === "yes" && (
            <p className="notice notice-high" style={{ marginTop: 12 }}>
              Thanks for telling us. Please contact a healthcare provider soon to talk it through. If there&apos;s a lot of blood or you feel faint or
              dizzy, get urgent care.
            </p>
          )}
        </fieldset>
      </section>

      <section className="card log-section">
        <fieldset>
          <legend>How did you feel?</legend>
          <p className="hint">Pick any that apply, or skip. Skipping means &ldquo;didn&apos;t say&rdquo;, not &ldquo;felt fine&rdquo;.</p>
          <div className="chips">
            <button type="button" className="chip none" aria-pressed={symptoms !== null && symptoms.length === 0} onClick={() => setSymptoms(symptoms && symptoms.length === 0 ? null : [])}>
              Felt fine
            </button>
            {SYMPTOMS.map((s) => (
              <button key={s.id} type="button" className="chip" aria-pressed={!!symptoms?.includes(s.id)} onClick={() => setSymptoms(toggle(symptoms, s.id))}>
                {s.label}
              </button>
            ))}
          </div>
        </fieldset>
      </section>

      <section className="card log-section">
        <fieldset>
          <legend>Anything else going on?</legend>
          <p className="hint">Context helps spot patterns. It doesn&apos;t mean one thing caused another.</p>
          <div className="chips">
            {CONTEXT_TAGS.map((c) => (
              <button key={c.id} type="button" className="chip" aria-pressed={!!context?.includes(c.id)} onClick={() => setContext(toggle(context, c.id))}>
                {c.label}
              </button>
            ))}
          </div>
          <div className="field" style={{ marginTop: 14 }}>
            <label htmlFor="notes">
              Notes <span className="hint">(optional, visible to anyone you share with)</span>
            </label>
            <textarea id="notes" maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. tummy grumbled after lunch" />
          </div>
        </fieldset>
      </section>

      <div className="card butter log-section" style={{ position: "sticky", bottom: 12, zIndex: 5 }}>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="row between">
          <span className="hint" style={{ color: "var(--ink)" }}>
            {type ? `Type ${type}: ${bristolInfo(type)?.nickname}` : "No type picked (that's okay)"}
          </span>
          <button type="submit" className="btn btn-primary btn-big" disabled={saving || ai.kind === "busy"}>
            {saving && <span className="spinner" aria-hidden />}
            Save to my diary
          </button>
        </div>
      </div>
    </form>
  );
}
