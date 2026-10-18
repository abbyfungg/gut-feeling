import type { Entry } from "../domain";
import { contextLabel, symptomLabel } from "../domain";
import { addDays, dayRange, DAY, formatDateTime, formatDayLabel, localDay } from "../time";
import { DEFAULT_RULE_CONFIG, type RuleConfig } from "./config";
import type { ContextNote, DataNotice, Flag, FluidDay, RuleResult } from "./types";

/**
 * Deterministic review rules. Pure function of the stored entries, the current time and config:
 * no AI is involved in deciding whether something is flagged.
 */
export function evaluateRules(
  allEntries: Entry[],
  now: Date,
  timeZone: string,
  config: RuleConfig = DEFAULT_RULE_CONFIG,
  fluids: FluidDay[] = [],
): RuleResult {
  const cutoff = now.getTime() - config.lookbackDays * DAY;
  const entries = allEntries
    .filter((e) => {
      const t = new Date(e.occurredAt).getTime();
      return t >= cutoff && t <= now.getTime() + 5 * 60_000;
    })
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  const movements = entries.filter((e) => e.kind === "movement");
  const fmt = (iso: string) => formatDateTime(iso, timeZone);

  const flags: Flag[] = [];

  const contextFor = (start: string, end: string): ContextNote[] => {
    const from = new Date(start).getTime() - config.contextLookbackDays * DAY;
    const to = new Date(end).getTime();
    const latest = new Map<string, ContextNote>();
    for (const e of entries) {
      const t = new Date(e.occurredAt).getTime();
      if (t < from || t > to || !e.context) continue;
      for (const tag of e.context) latest.set(tag, { entryId: e.id, occurredAt: e.occurredAt, tag });
    }
    return [...latest.values()].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  };

  // 1. Clusters of loose stools inside a rolling window
  if (config.looseStools.enabled) {
    const loose = movements.filter((e) => (e.bristolType ?? 0) >= config.looseStools.minType);
    for (const cluster of windowClusters(loose, config.looseStools.windowHours * 3_600_000, config.looseStools.minCount)) {
      const first = cluster[0];
      const last = cluster[cluster.length - 1];
      const hours = Math.max(1, Math.round((new Date(last.occurredAt).getTime() - new Date(first.occurredAt).getTime()) / 3_600_000));
      flags.push({
        key: `loose_stools:${first.id}`,
        rule: "loose_stools",
        severity: "high",
        title: "Repeated loose stools",
        patientTitle: "Lots of loose ones lately",
        whatChanged: `${cluster.length} entries of Bristol type ${config.looseStools.minType}–7 within ${hours} h, from ${fmt(first.occurredAt)} to ${fmt(last.occurredAt)}.`,
        windowStart: first.occurredAt,
        windowEnd: last.occurredAt,
        evidenceIds: cluster.map((e) => e.id),
        context: contextFor(first.occurredAt, last.occurredAt),
        patientMessage:
          "You've logged several loose movements close together. Keep sipping fluids. If you have a fever, blood, severe pain, or can't keep fluids down, contact a healthcare provider today.",
        suggestedFollowUp:
          "Contact the patient to check hydration, fever and other symptoms. Consider whether infection-control precautions apply under your local protocol.",
        caveat: "Based on self-reported stool type. Does not identify a cause.",
        ruleDescription: `≥ ${config.looseStools.minCount} movements of type ${config.looseStools.minType} or higher within any ${config.looseStools.windowHours} h window.`,
      });
    }
  }

  // 2. Hard stools across several days
  if (config.hardStools.enabled) {
    const hard = movements.filter((e) => e.bristolType != null && e.bristolType <= config.hardStools.maxType);
    for (const cluster of windowClusters(hard, config.hardStools.windowDays * DAY, config.hardStools.minCount)) {
      const first = cluster[0];
      const last = cluster[cluster.length - 1];
      const strained = cluster.filter((e) => e.symptoms?.includes("straining")).length;
      flags.push({
        key: `hard_stools:${first.id}`,
        rule: "hard_stools",
        severity: "medium",
        title: "Repeated hard stools",
        patientTitle: "Things have been hard going",
        whatChanged: `${cluster.length} entries of Bristol type 1–${config.hardStools.maxType} between ${fmt(first.occurredAt)} and ${fmt(last.occurredAt)}${strained ? `; straining reported in ${strained}` : ""}.`,
        windowStart: first.occurredAt,
        windowEnd: last.occurredAt,
        evidenceIds: cluster.map((e) => e.id),
        context: contextFor(first.occurredAt, last.occurredAt),
        patientMessage:
          "Things have been on the firm side lately. Water, fibre and movement can help. If it's uncomfortable or keeps going, it's worth mentioning to your care team.",
        suggestedFollowUp: "Review fluids, diet, mobility and current medications with the patient. Follow your bowel-care protocol if one applies.",
        caveat: "Based on self-reported stool type. Not a diagnosis of constipation.",
        ruleDescription: `≥ ${config.hardStools.minCount} movements of type ${config.hardStools.maxType} or lower within ${config.hardStools.windowDays} days.`,
      });
    }
  }

  // 3. Consecutive days explicitly confirmed as "no movement" (missing days do NOT count)
  if (config.noMovement.enabled) {
    const byDay = new Map<string, { movement: boolean; checkins: Entry[] }>();
    for (const e of entries) {
      const d = localDay(e.occurredAt, timeZone);
      const slot = byDay.get(d) ?? { movement: false, checkins: [] };
      if (e.kind === "movement") slot.movement = true;
      else slot.checkins.push(e);
      byDay.set(d, slot);
    }
    const days = [...byDay.keys()].sort();
    let run: string[] = [];
    const flushRun = () => {
      if (run.length >= config.noMovement.minConsecutiveDays) {
        const evidence = run.flatMap((d) => byDay.get(d)!.checkins);
        const first = evidence[0];
        const last = evidence[evidence.length - 1];
        const lastMovement = [...movements].reverse().find((m) => m.occurredAt < first.occurredAt);
        flags.push({
          key: `no_movement:${first.id}`,
          rule: "no_movement",
          severity: "medium",
          title: "No bowel movement on consecutive confirmed days",
          patientTitle: "A few days without going",
          whatChanged: `"No movement" confirmed on ${run.length} consecutive days (${formatDayLabel(run[0])} to ${formatDayLabel(run[run.length - 1])}).${lastMovement ? ` Last logged movement: ${fmt(lastMovement.occurredAt)}.` : ""}`,
          windowStart: first.occurredAt,
          windowEnd: last.occurredAt,
          evidenceIds: evidence.map((e) => e.id),
          context: contextFor(first.occurredAt, last.occurredAt),
          patientMessage:
            "It's been a few days without a movement. That happens, but if you feel bloated, sore, sick, or this is unusual for you, let your care team know.",
          suggestedFollowUp: "Check in with the patient about abdominal discomfort, appetite and fluids. Follow your bowel-care protocol if one applies.",
          caveat: "Counts only days the person actively confirmed. Days with no log are treated as unknown, not as no movement.",
          ruleDescription: `"No movement" confirmed on ≥ ${config.noMovement.minConsecutiveDays} consecutive days with no movement logged on those days.`,
        });
      }
      run = [];
    };
    for (const d of days) {
      const slot = byDay.get(d)!;
      const qualifies = !slot.movement && slot.checkins.length > 0;
      if (qualifies && (run.length === 0 || addDays(run[run.length - 1], 1) === d)) run.push(d);
      else {
        flushRun();
        if (qualifies) run.push(d);
      }
    }
    flushRun();
  }

  // 4. Person reported possible blood or black stool (never inferred from a photo)
  if (config.reportedBlood.enabled) {
    for (const e of entries) {
      if (e.bloodReport !== "yes" && e.bloodReport !== "unsure") continue;
      const sure = e.bloodReport === "yes";
      flags.push({
        key: `reported_blood:${e.id}`,
        rule: "reported_blood",
        severity: sure ? "high" : "medium",
        title: sure ? "Patient-reported possible blood or black stool" : "Patient unsure about red or black colour",
        patientTitle: sure ? "You noticed red or black colour" : "You weren't sure about the colour",
        whatChanged: `On ${fmt(e.occurredAt)} the person answered "${sure ? "yes" : "not sure"}" to noticing red or black colour.`,
        windowStart: e.occurredAt,
        windowEnd: e.occurredAt,
        evidenceIds: [e.id],
        context: contextFor(e.occurredAt, e.occurredAt),
        patientMessage: sure
          ? "You mentioned possible blood or very dark stool. Please contact a healthcare provider soon to talk it through. If there's a lot of blood, or you feel faint or dizzy, get urgent care."
          : "You weren't sure about the colour. Foods and iron can change colour too, but if you see red or black again, please contact a healthcare provider.",
        suggestedFollowUp: sure
          ? "Contact the patient promptly to clarify the observation and assess per protocol (amount, dizziness, anticoagulant or iron use)."
          : "Ask the patient about the observation at next contact; clarify foods, iron supplements and any repeat.",
        caveat: "Self-reported. Colour can be affected by food, supplements and lighting. AI never confirms blood.",
        ruleDescription: 'Any entry where the person answered "yes" or "not sure" to red or black colour.',
      });
    }
  }

  // 5. Severe symptoms the person reported
  if (config.severeSymptoms.enabled) {
    for (const e of entries) {
      const hits = (e.symptoms ?? []).filter((s) => config.severeSymptoms.symptoms.includes(s));
      if (hits.length === 0) continue;
      flags.push({
        key: `severe_symptoms:${e.id}`,
        rule: "severe_symptoms",
        severity: "medium",
        title: `Patient-reported ${hits.map((h) => symptomLabel(h).toLowerCase()).join(" and ")}`,
        patientTitle: "You felt quite unwell",
        whatChanged: `${hits.map((h) => symptomLabel(h)).join(" and ")} reported on ${fmt(e.occurredAt)}.`,
        windowStart: e.occurredAt,
        windowEnd: e.occurredAt,
        evidenceIds: [e.id],
        context: contextFor(e.occurredAt, e.occurredAt),
        patientMessage: "You noted feeling quite unwell. If it's getting worse or you're worried, please contact a healthcare provider.",
        suggestedFollowUp: "Contact the patient to assess the reported symptom per protocol.",
        caveat: "Self-reported symptom; severity not measured.",
        ruleDescription: `Any entry reporting: ${config.severeSymptoms.symptoms.map(symptomLabel).join(", ")}.`,
      });
    }
  }

  // 6. Sustained change from this person's own baseline
  const notices: DataNotice[] = [];
  const today = localDay(now, timeZone);
  if (config.baselineShift.enabled) {
    const b = config.baselineShift;
    const recentStart = addDays(today, -(b.recentDays - 1));
    const baselineStart = addDays(recentStart, -b.baselineDays);
    const typed = movements.filter((m) => m.bristolType != null);
    const recent = typed.filter((m) => localDay(m.occurredAt, timeZone) >= recentStart);
    const baseline = typed.filter((m) => {
      const d = localDay(m.occurredAt, timeZone);
      return d >= baselineStart && d < recentStart;
    });
    if (recent.length >= b.minRecentEntries && baseline.length >= b.minBaselineEntries) {
      const recentMean = mean(recent.map((m) => m.bristolType!));
      const baseMean = mean(baseline.map((m) => m.bristolType!));
      const diff = recentMean - baseMean;
      if (Math.abs(diff) >= b.minMeanDifference) {
        const looser = diff > 0;
        flags.push({
          key: `baseline_shift:${looser ? "looser" : "firmer"}:${recent[0].id}`,
          rule: "baseline_shift",
          severity: "medium",
          title: `Sustained shift ${looser ? "looser" : "firmer"} than personal baseline`,
          patientTitle: looser ? "Looser than your usual" : "Firmer than your usual",
          whatChanged: `Average stool type ${recentMean.toFixed(1)} over the last ${b.recentDays} days (${recent.length} entries) vs ${baseMean.toFixed(1)} over the previous ${b.baselineDays} days (${baseline.length} entries).`,
          windowStart: recent[0].occurredAt,
          windowEnd: recent[recent.length - 1].occurredAt,
          evidenceIds: recent.map((m) => m.id),
          context: contextFor(recent[0].occurredAt, recent[recent.length - 1].occurredAt),
          patientMessage: looser
            ? "Things have been looser than your usual lately. Worth keeping an eye on, and worth mentioning if it continues."
            : "Things have been firmer than your usual lately. Worth keeping an eye on, and worth mentioning if it continues.",
          suggestedFollowUp: "Review the trend with the patient at next contact; ask about diet, medications and other symptoms.",
          caveat: "Compares the person to their own logged history only. Fewer logs make the average less reliable.",
          ruleDescription: `Mean type over the last ${b.recentDays} days differs from the prior ${b.baselineDays}-day mean by ≥ ${b.minMeanDifference} (needs ≥ ${b.minRecentEntries} recent and ≥ ${b.minBaselineEntries} baseline entries).`,
        });
      }
    }
  }

  // 7. Hard stools on several days even though the person was drinking well. Water alone may not
  //    explain it, so it's worth a clinician look (medicines, fibre, activity, other causes).
  if (config.hardDespiteFluids.enabled && fluids.length) {
    const c = config.hardDespiteFluids;
    const windowStart = addDays(today, -(c.windowDays - 1));
    const ml = new Map(fluids.map((f) => [f.day, f]));
    // Fluids that day or the day before count (stool reflects the previous day's intake too).
    const wellHydrated = (day: string) => Math.max(ml.get(day)?.ml ?? 0, ml.get(addDays(day, -1))?.ml ?? 0) >= c.minMlPerDay;
    const hard = movements.filter((m) => m.bristolType != null && m.bristolType <= c.maxType && localDay(m.occurredAt, timeZone) >= windowStart);
    const qualifying = hard.filter((m) => wellHydrated(localDay(m.occurredAt, timeZone)));
    const days = [...new Set(qualifying.map((m) => localDay(m.occurredAt, timeZone)))];
    if (days.length >= c.minHardDays) {
      const first = qualifying[0];
      const last = qualifying[qualifying.length - 1];
      const intakeDays = fluids.filter((f) => f.day >= windowStart && f.day <= today && f.ml > 0);
      const avg = intakeDays.length ? intakeDays.reduce((a, f) => a + f.ml, 0) / intakeDays.length : 0;
      const estimated = intakeDays.some((f) => f.estimated);
      const simulated = intakeDays.some((f) => f.simulated);
      const source = simulated ? "simulated bottle data" : estimated ? "water-bottle estimate" : "patient-logged";
      flags.push({
        key: `hard_despite_fluids:${first.id}`,
        rule: "hard_despite_fluids",
        severity: "medium",
        title: "Hard stools despite adequate fluid intake",
        patientTitle: "Still hard, even though you're drinking well",
        whatChanged: `Bristol type 1–2 on ${days.length} days (${formatDayLabel(days[0])} to ${formatDayLabel(days[days.length - 1])}) while logged fluids averaged ${(avg / 1000).toFixed(1)} L/day over ${intakeDays.length} days (${source}).`,
        windowStart: first.occurredAt,
        windowEnd: last.occurredAt,
        evidenceIds: qualifying.map((m) => m.id),
        context: contextFor(first.occurredAt, last.occurredAt),
        patientMessage:
          "You've been drinking plenty, but your stools are still hard. When water isn't the reason, something else can be, like a medicine, not much fibre, or moving less. It's worth mentioning to your care team.",
        suggestedFollowUp:
          "Review recent medications and supplements (for example opioids, iron, calcium, anticholinergics), fibre intake and activity. Consider whether further assessment is needed under your local protocol.",
        caveat: `Fluid amounts are ${estimated ? "estimated from sip counts and can be off" : "self-reported"}${simulated ? "; this demo uses simulated bottle data" : ""}. Not a diagnosis.`,
        ruleDescription: `≥ ${c.minHardDays} days with type ${c.maxType} or lower in ${c.windowDays} days, each with ≥ ${(c.minMlPerDay / 1000).toFixed(1)} L of logged fluids that day or the day before.`,
      });
    }
  }

  // Data-quality notices (never flags)
  const loggedDays = new Set(entries.map((e) => localDay(e.occurredAt, timeZone)));
  if (entries.length > 0) {
    const windowStart = addDays(today, -13);
    const firstDay = localDay(entries[0].occurredAt, timeZone);
    const start = firstDay > windowStart ? firstDay : windowStart;
    const yesterday = addDays(today, -1);
    let gap: string[] = [];
    const gaps: string[][] = [];
    for (const d of dayRange(start, yesterday)) {
      if (loggedDays.has(d)) {
        if (gap.length) gaps.push(gap);
        gap = [];
      } else gap.push(d);
    }
    if (gap.length) gaps.push(gap);
    for (const g of gaps) {
      if (g.length < config.loggingGap.minDays) continue;
      const ongoing = g[g.length - 1] === yesterday && !loggedDays.has(today);
      notices.push({
        kind: "logging_gap",
        start: g[0],
        end: g[g.length - 1],
        message: ongoing
          ? `No entries of any kind since ${formatDayLabel(addDays(g[0], -1))} (${g.length}+ days). This is missing data, not evidence of no bowel movements.`
          : `No entries from ${formatDayLabel(g[0])} to ${formatDayLabel(g[g.length - 1])} (${g.length} days). Treated as unknown, not as no bowel movements.`,
      });
    }
  }
  if (movements.length < 5) {
    notices.push({
      kind: "not_enough_data",
      message: "Fewer than 5 movements logged in the last 30 days, so baseline comparisons aren't available yet.",
    });
  }

  // Times formatted like "4:07 a.m." already end in a period.
  for (const f of flags) f.whatChanged = f.whatChanged.replace(/\.\./g, ".");

  flags.sort((a, b) => (a.severity === b.severity ? b.windowEnd.localeCompare(a.windowEnd) : a.severity === "high" ? -1 : 1));
  return { flags, notices };
}

/**
 * Groups time-sorted entries into clusters where some window of `windowMs` holds at least `minCount`.
 * Qualifying entries less than two windows apart are kept together so one continuing episode
 * produces one flag instead of several.
 */
export function windowClusters(sorted: Entry[], windowMs: number, minCount: number): Entry[][] {
  const t = sorted.map((e) => new Date(e.occurredAt).getTime());
  const inQualifying = new Array(sorted.length).fill(false);
  let j = 0;
  for (let i = 0; i < sorted.length; i++) {
    if (j < i) j = i;
    while (j + 1 < sorted.length && t[j + 1] - t[i] <= windowMs) j++;
    if (j - i + 1 >= minCount) for (let k = i; k <= j; k++) inQualifying[k] = true;
  }
  const clusters: Entry[][] = [];
  let cur: Entry[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (!inQualifying[i]) {
      if (cur.length) clusters.push(cur);
      cur = [];
      continue;
    }
    if (cur.length && t[i] - new Date(cur[cur.length - 1].occurredAt).getTime() > 2 * windowMs) {
      clusters.push(cur);
      cur = [];
    }
    cur.push(sorted[i]);
  }
  if (cur.length) clusters.push(cur);
  return clusters;
}

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** Human sentence for context notes: timing only, never cause. */
export function describeContext(notes: ContextNote[], timeZone: string): string | null {
  if (notes.length === 0) return null;
  const parts = notes.map((n) => `"${contextLabel(n.tag)}" (${formatDateTime(n.occurredAt, timeZone)})`);
  return `Noted around this time: ${parts.join(", ")}. Timing only; this does not show cause.`;
}
