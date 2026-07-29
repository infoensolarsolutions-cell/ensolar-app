// KPI criteria and scoring shared by server actions and client UI.
// Weights sum to 100; a rating of 1–5 contributes weight × rating / 5.

export type KpiScore = {
  key: string;
  criterion: string;
  weight: number;
  sup: number | null;
  mgr: number | null;
};

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
    key: c.key, criterion: c.name, weight: c.weight, sup: null, mgr: null,
  }));
}

export function totalFor(scores: KpiScore[], field: "sup" | "mgr"): number {
  let total = 0;
  for (const s of scores) total += (s.weight * (s[field] ?? 0)) / 5;
  return Math.round(total * 10) / 10;
}

export function isComplete(scores: KpiScore[], field: "sup" | "mgr"): boolean {
  return scores.every((s) => s[field] !== null && s[field]! >= 1 && s[field]! <= 5);
}

export function band(total: number): string {
  if (total >= 90) return "Outstanding";
  if (total >= 80) return "Very Good";
  if (total >= 70) return "Satisfactory";
  if (total >= 60) return "Needs Improvement";
  return "Unsatisfactory";
}

export const RATING_LABELS: Record<number, string> = {
  5: "5 — Outstanding",
  4: "4 — Very Good",
  3: "3 — Meets expectations",
  2: "2 — Needs improvement",
  1: "1 — Unsatisfactory",
};
