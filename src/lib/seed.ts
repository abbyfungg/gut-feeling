import "server-only";
import { getConfig } from "./config";
import { getDb, transaction } from "./db";
import { createUser, newId } from "./auth";
import type { ContextId, StoredAiAnalysis, SymptomId } from "./domain";
import { evaluateRules } from "./rules/engine";
import { addDays, localDay } from "./time";
import type { Entry } from "./domain";

/** Password for every synthetic demo account. Demo data only, never real people. */
export const DEMO_PASSWORD = "everybodypoops";

export const DEMO_ACCOUNTS = {
  patient: "maya@demo.gutfeeling.health",
  practitioner: "priya@demo.gutfeeling.health",
  otherPractitioner: "okafor@demo.gutfeeling.health",
  story: "walter@demo.gutfeeling.health",
} as const;

let seededChecked = false;

/** Seeds synthetic demo data when the database is empty (and seeding is enabled). */
export function ensureSeeded() {
  if (seededChecked) return;
  seededChecked = true;
  if (!getConfig().seedDemoData) return;
  const count = (getDb().prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number }).n;
  if (count === 0) seedDemoData(new Date());
}

export function resetSeedFlagForTests() {
  seededChecked = false;
}

/** Local wall-clock time in `tz` → ISO UTC. */
function zoned(day: string, hour: number, minute: number, tz: string): string {
  const guess = new Date(`${day}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00Z`);
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(guess);
  const g = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asLocal = Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"));
  const offset = asLocal - guess.getTime();
  return new Date(guess.getTime() - offset).toISOString();
}

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

interface SeedEntry {
  daysAgo: number;
  hour: number;
  minute?: number;
  kind?: "movement" | "no_movement";
  type?: number | null;
  symptoms?: SymptomId[] | null;
  context?: ContextId[] | null;
  blood?: "yes" | "no" | "unsure" | null;
  notes?: string | null;
  ai?: boolean;
}

export function seedDemoData(now: Date) {
  const tz = getConfig().timezone;
  const today = localDay(now, tz);
  const db = getDb();

  transaction(() => {
    const priya = createUser({
      email: DEMO_ACCOUNTS.practitioner,
      name: "Priya Raman",
      role: "practitioner",
      title: "RN, Home Care Nurse",
      organization: "Maple Grove Home Care (fictional)",
      about: "Visits clients at home across the east end. Reviews shared gut logs each morning.",
      password: DEMO_PASSWORD,
      isSynthetic: true,
    });
    const okafor = createUser({
      email: DEMO_ACCOUNTS.otherPractitioner,
      name: "Dr. Sam Okafor",
      role: "practitioner",
      title: "Gastroenterologist",
      organization: "Riverside Digestive Health (fictional)",
      about: "Follows people living with IBD between clinic visits.",
      password: DEMO_PASSWORD,
      isSynthetic: true,
    });

    const patient = (email: string, name: string, about: string) =>
      createUser({ email, name, role: "patient", about, password: DEMO_PASSWORD, isSynthetic: true });

    const maya = patient(DEMO_ACCOUNTS.patient, "Maya Chen", "28 · self-reported Crohn's disease · tracking between GI visits");
    const peggy = patient("peggy@demo.gutfeeling.health", "Margaret Kowalski", "81 · lives at home, daughter helps log · home-care client");
    const daniel = patient("daniel@demo.gutfeeling.health", "Daniel Reyes", "67 · recovering from a chest infection · home-care client");
    const ruth = patient("ruth@demo.gutfeeling.health", "Ruth Adeyemi", "74 · home-care client · logs most days");
    const tom = patient("tom@demo.gutfeeling.health", "Tom Becker", "45 · tracking after a diet change");
    const walter = patient(DEMO_ACCOUNTS.story, "Walter Brooks", "79 · home-care client, son helps log · caught-early demo story");
    const linh = patient("linh@demo.gutfeeling.health", "Linh Tran", "34 · shares with her GI specialist only");
    const omar = patient("omar@demo.gutfeeling.health", "Omar Haddad", "52 · stopped sharing with Maple Grove");

    const link = (p: string, pr: string, daysAgo: number, revokedDaysAgo?: number) =>
      db
        .prepare("INSERT INTO care_links (id, patient_id, practitioner_id, status, granted_at, revoked_at) VALUES (?, ?, ?, ?, ?, ?)")
        .run(
          newId("cl"),
          p,
          pr,
          revokedDaysAgo != null ? "revoked" : "active",
          zoned(addDays(today, -daysAgo), 10, 0, tz),
          revokedDaysAgo != null ? zoned(addDays(today, -revokedDaysAgo), 10, 0, tz) : null,
        );
    for (const p of [maya, peggy, daniel, ruth, tom, walter]) link(p.id, priya.id, 40);
    link(maya.id, okafor.id, 60);
    link(linh.id, okafor.id, 30);
    link(omar.id, priya.id, 40, 2);

    const insert = (patientId: string, list: SeedEntry[]) => {
      const ids: string[] = [];
      for (const e of list) {
        let at = zoned(addDays(today, -e.daysAgo), e.hour, e.minute ?? 0, tz);
        if (new Date(at) > now) at = new Date(now.getTime() - 15 * 60_000).toISOString();
        const kind = e.kind ?? "movement";
        const ai: StoredAiAnalysis | null =
          e.ai && e.type
            ? {
                simulated: true,
                model: "simulated (demo seed data)",
                analyzedAt: at,
                usable: true,
                estimatedType: e.type,
                confidence: "medium",
                colorObservation: "brown",
                observations: ["Simulated result for the demo; not produced by a live model."],
                limitations: "Seeded demo data.",
              }
            : null;
        const id = newId("en");
        ids.push(id);
        db.prepare(
          `INSERT INTO entries (id, patient_id, kind, occurred_at, bristol_type, bristol_source, symptoms, context, blood_report, notes, ai_analysis, is_synthetic, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        ).run(
          id,
          patientId,
          kind,
          at,
          kind === "movement" ? (e.type ?? null) : null,
          kind === "movement" && e.type ? (ai ? "ai_accepted" : "user") : null,
          e.symptoms ? JSON.stringify(e.symptoms) : null,
          e.context ? JSON.stringify(e.context) : null,
          e.blood ?? null,
          e.notes ?? null,
          ai ? JSON.stringify(ai) : null,
          at,
        );
      }
      return ids;
    };

    // Steady background history for a range of days
    const steady = (seed: number, fromDaysAgo: number, toDaysAgo: number, types: number[], perDay = [1, 1, 2]): SeedEntry[] => {
      const r = rng(seed);
      const out: SeedEntry[] = [];
      for (let d = fromDaysAgo; d >= toDaysAgo; d--) {
        const n = perDay[Math.floor(r() * perDay.length)];
        for (let i = 0; i < n; i++) {
          out.push({
            daysAgo: d,
            hour: i === 0 ? 7 + Math.floor(r() * 3) : 15 + Math.floor(r() * 5),
            minute: Math.floor(r() * 60),
            type: types[Math.floor(r() * types.length)],
            symptoms: r() < 0.5 ? [] : null,
            ai: r() < 0.25,
          });
        }
      }
      return out;
    };

    // Maya: drifting looser than her own baseline, plus a self-reported possible blood observation.
    insert(maya.id, [
      ...steady(11, 20, 4, [4, 4, 3, 4, 5, 3]),
      { daysAgo: 3, hour: 8, minute: 10, type: 6, symptoms: ["urgency", "cramping"] },
      { daysAgo: 3, hour: 19, minute: 40, type: 6, symptoms: ["urgency"], context: ["stress"], notes: "Big deadline week." },
      { daysAgo: 2, hour: 7, minute: 55, type: 6, symptoms: ["cramping", "urgency"], blood: "yes", notes: "Saw some red streaks. Haven't had beets." },
      { daysAgo: 1, hour: 9, minute: 20, type: 6, symptoms: ["cramping"], ai: true },
      { daysAgo: 1, hour: 18, minute: 5, type: 6, symptoms: ["urgency", "bloating"] },
      { daysAgo: 0, hour: 7, minute: 30, type: 6, symptoms: ["cramping"], blood: "no" },
    ]);

    // Peggy: firmer stools after a medication change, then three days confirmed with no movement.
    insert(peggy.id, [
      ...steady(22, 20, 7, [3, 4, 4, 3], [1]),
      { daysAgo: 6, hour: 10, type: 2, symptoms: ["straining"], context: ["medication_change"], notes: "Started a new pain medication this week (logged by daughter)." },
      { daysAgo: 5, hour: 11, type: 1, symptoms: ["straining", "discomfort"], context: ["low_fluids"] },
      { daysAgo: 4, hour: 9, minute: 30, type: 2, symptoms: ["straining", "bloating"] },
      { daysAgo: 3, hour: 20, kind: "no_movement" },
      { daysAgo: 2, hour: 20, kind: "no_movement", notes: "Says her tummy feels full." },
      { daysAgo: 1, hour: 20, kind: "no_movement" },
    ]);

    // Daniel: several loose stools in under a day after starting a new medication; fever reported once.
    const danielIds = insert(daniel.id, [
      ...steady(33, 20, 3, [4, 4, 3, 5]),
      { daysAgo: 4, hour: 12, type: 4, context: ["medication_change", "recent_illness"], notes: "Started antibiotics for chest infection." },
      { daysAgo: 1, hour: 14, minute: 15, type: 6, symptoms: ["urgency", "cramping"] },
      { daysAgo: 1, hour: 18, minute: 40, type: 7, symptoms: ["urgency"] },
      { daysAgo: 1, hour: 23, minute: 10, type: 7, symptoms: ["urgency", "fever"], notes: "Felt hot, 38.1 on the thermometer." },
      { daysAgo: 0, hour: 6, minute: 50, type: 7, symptoms: ["urgency", "nausea"] },
    ]);

    // Ruth: regular history, then nothing logged for days. Missing data, not a symptom.
    insert(ruth.id, [...steady(44, 20, 6, [3, 4, 4, 5], [1])]);

    // Walter: the "caught early" story. A new pain medicine, then firmer stools and three days with
    // nothing. The rules flagged it, the nurse called the same morning, and things settled within days.
    insert(walter.id, [
      ...steady(88, 29, 14, [4, 4, 3, 4], [1]),
      { daysAgo: 13, hour: 9, type: 3, context: ["medication_change"], notes: "Started a new pain medicine after his hip appointment (logged by son)." },
      { daysAgo: 12, hour: 10, type: 2, symptoms: ["straining"] },
      { daysAgo: 11, hour: 9, minute: 40, type: 2, symptoms: ["straining", "discomfort"], context: ["low_fluids"], notes: "Not drinking much, says he isn't thirsty." },
      { daysAgo: 10, hour: 11, type: 1, symptoms: ["straining", "discomfort", "bloating"] },
      { daysAgo: 9, hour: 20, kind: "no_movement" },
      { daysAgo: 8, hour: 20, kind: "no_movement", notes: "Says his belly feels hard and full." },
      { daysAgo: 7, hour: 20, kind: "no_movement" },
      { daysAgo: 6, hour: 15, type: 3, symptoms: ["discomfort"], notes: "Saw the GP this morning and the plan was adjusted. Drinking more water and walking after lunch." },
      { daysAgo: 5, hour: 9, type: 3, symptoms: [] },
      { daysAgo: 4, hour: 8, minute: 30, type: 4, symptoms: [] },
      { daysAgo: 3, hour: 9, type: 3, symptoms: [] },
      { daysAgo: 2, hour: 8, minute: 15, type: 4, symptoms: [] },
      { daysAgo: 1, hour: 9, minute: 5, type: 4, symptoms: [] },
      { daysAgo: 0, hour: 8, minute: 20, type: 4, symptoms: [] },
    ]);

    // Tom: steady and unremarkable.
    insert(tom.id, [...steady(55, 20, 0, [3, 4, 4, 5, 4])]);

    // Linh: only shared with Dr. Okafor, so the Maple Grove nurse must not see her.
    insert(linh.id, [...steady(66, 14, 2, [5, 6, 5]), { daysAgo: 1, hour: 8, type: 7 }, { daysAgo: 1, hour: 12, type: 7 }, { daysAgo: 1, hour: 16, type: 6 }]);

    // Omar: has data, but revoked sharing.
    insert(omar.id, [...steady(77, 14, 1, [4, 5])]);

    // A completed review on Daniel's fever report to show the review history.
    const entriesOf = (patientId: string) => (db.prepare("SELECT * FROM entries WHERE patient_id = ?").all(patientId) as Record<string, unknown>[]).map(
      (r) =>
        ({
          id: r.id,
          patientId: r.patient_id,
          kind: r.kind,
          occurredAt: r.occurred_at,
          bristolType: r.bristol_type,
          bristolSource: r.bristol_source,
          symptoms: r.symptoms ? JSON.parse(r.symptoms as string) : null,
          context: r.context ? JSON.parse(r.context as string) : null,
          bloodReport: r.blood_report,
          notes: r.notes,
          ai: null,
          isSynthetic: true,
          createdAt: r.created_at,
        }) as Entry,
    );
    const danielEntries = entriesOf(daniel.id);
    const fever = evaluateRules(danielEntries, now, tz).flags.find((f) => f.rule === "severe_symptoms");
    if (fever && danielIds.length) {
      const reviewedAt = new Date(Math.min(now.getTime() - 60_000, new Date(fever.windowEnd).getTime() + 9 * 3_600_000)).toISOString();
      db.prepare(
        `INSERT INTO reviews (id, patient_id, practitioner_id, flag_key, flag_rule, flag_title, evidence_ids, decision, note, follow_up, follow_up_status, suggestion_source, created_at, completed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'contact_patient', ?, ?, 'done', 'rule_template', ?, ?)`,
      ).run(
        newId("rv"),
        daniel.id,
        priya.id,
        fever.key,
        fever.rule,
        fever.title,
        JSON.stringify(fever.evidenceIds),
        "Called Daniel's wife. Temp 37.9 this morning, drinking fluids. GP's office informed. (Synthetic demo record.)",
        "Phone check-in on fluids and temperature tomorrow morning.",
        reviewedAt,
        reviewedAt,
      );
    }

    // Walter's episode was reviewed the morning after the third quiet day, and the follow-up closed.
    const walterFlags = evaluateRules(entriesOf(walter.id), now, tz).flags.filter((f) => f.rule === "no_movement" || f.rule === "hard_stools" || f.rule === "baseline_shift");
    const reviewedAt = zoned(addDays(today, -6), 9, 10, tz);
    const doneAt = zoned(addDays(today, -5), 11, 0, tz);
    for (const f of walterFlags) {
      const main = f.rule === "no_movement";
      db.prepare(
        `INSERT INTO reviews (id, patient_id, practitioner_id, flag_key, flag_rule, flag_title, evidence_ids, decision, note, follow_up, follow_up_status, suggestion_source, created_at, completed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'contact_patient', ?, ?, 'done', 'rule_template', ?, ?)`,
      ).run(
        newId("rv"),
        walter.id,
        priya.id,
        f.key,
        f.rule,
        f.title,
        JSON.stringify(f.evidenceIds),
        main
          ? "Called his son at 9 a.m. New pain medicine started a week ago, drinking little, belly feels full. Arranged a same-day GP review instead of waiting for next week's visit. (Synthetic demo record.)"
          : "Firmer stools began right after the new pain medicine. Raised with the GP alongside the three quiet days. (Synthetic demo record.)",
        main ? "GP review today. Phone check-in tomorrow on bowels, fluids and comfort." : "Watch types over the next week.",
        reviewedAt,
        doneAt,
      );
    }
  });
}
