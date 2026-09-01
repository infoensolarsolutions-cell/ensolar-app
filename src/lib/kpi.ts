// KPI criteria and scoring shared by server actions and client UI.
// Weights sum to 100; a rating of 1–5 contributes weight × rating / 5,
// so a fully rated scorecard totals up to 100.

export type KpiScore = {
  key: string;
  criterion: string;
  weight: number;
  self: number | null;
  sup: number | null;
  sup2?: number | null; // second supervisor (optional; older rows lack it)
  mgr: number | null;
};

export type ScoreField = "self" | "sup" | "sup2" | "mgr";

export const RATING_MIN = 1;
export const RATING_MAX = 5;
export const RATING_WORDS: Record<number, string> = {
  1: "Poor",
  2: "Below average",
  3: "Average",
  4: "Satisfactory",
  5: "Excellent",
};
export const SCALE_NOTE =
  "1 Poor · 2 Below average · 3 Average · 4 Satisfactory · 5 Excellent";

export const KPI_CRITERIA: { key: string; name: string; desc: string; weight: number }[] = [
  { key: "attendance", name: "Attendance & punctuality", weight: 10,
    desc: "Clock-in/out record vs the 8:00–17:00 schedule; unexcused absences" },
  { key: "quality", name: "Quality of workmanship", weight: 15,
    desc: "Installations per drawings and PEC; torque, waterproofing, wiring neatness; rework rate" },
  { key: "safety", name: "Safety compliance", weight: 15,
    desc: "PPE use, work-at-height discipline, toolbox talks, incident/near-miss record" },
  { key: "productivity", name: "Productivity & timeliness", weight: 15,
    desc: "Output vs assigned scope and schedule; meets milestones without follow-up" },
  { key: "technical", name: "Technical skill & knowledge", weight: 10,
    desc: "Competence in PV, electrical, and troubleshooting tasks for the position level" },
  { key: "teamwork", name: "Teamwork & cooperation", weight: 10,
    desc: "Works well with crew and office; supports co-workers; accepts assignments" },
  { key: "communication", name: "Communication & customer relations", weight: 10,
    desc: "Courtesy on site, clear reporting, proper handling of customer concerns" },
  { key: "initiative", name: "Initiative & problem-solving", weight: 5,
    desc: "Acts on issues without being told; suggests improvements" },
  { key: "tools", name: "Care of tools, materials & vehicles", weight: 5,
    desc: "Accountability for issued tools and stock; equipment kept in good condition" },
  { key: "values", name: "Company policies & values", weight: 5,
    desc: "Follows house rules, honesty, proper conduct as Ensolar's representative" },
];

export function emptyScores(): KpiScore[] {
  return KPI_CRITERIA.map((c) => ({
    key: c.key, criterion: c.name, weight: c.weight, self: null, sup: null, sup2: null, mgr: null,
  }));
}

export function totalFor(scores: KpiScore[], field: ScoreField): number {
  let total = 0;
  for (const s of scores) total += (s.weight * (s[field] ?? 0)) / RATING_MAX;
  return Math.round(total * 10) / 10;
}

export function isComplete(scores: KpiScore[], field: ScoreField): boolean {
  return scores.every((s) => {
    const v = s[field] ?? null;
    return v !== null && v >= RATING_MIN && v <= RATING_MAX;
  });
}

export function band(total: number): string {
  if (total >= 90) return "Outstanding";
  if (total >= 80) return "Very Good";
  if (total >= 70) return "Satisfactory";
  if (total >= 60) return "Needs Improvement";
  return "Unsatisfactory";
}
