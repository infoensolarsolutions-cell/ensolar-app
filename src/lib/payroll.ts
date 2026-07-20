import "server-only";

// Weekly payroll math (Mon–Sat cutoffs). Government contributions are
// deducted at 1/4 of the monthly amount per weekly cutoff; the tax table is
// stored as weekly brackets. All rates come from contribution_settings.

export type Settings = {
  sss: { employee_percent: number; min_monthly: number; max_monthly: number };
  philhealth: {
    total_percent: number;
    employee_share_percent: number;
    min_monthly: number;
    max_monthly: number;
  };
  pagibig: { employee_percent: number; max_monthly_compensation: number };
  tax: { brackets: { over: number; base: number; percent: number }[] };
};

const WEEKS_PER_MONTH = 4;
export const DAILY_TO_MONTHLY_DAYS = 26; // standard PH divisor
const round2 = (n: number) => Math.round(n * 100) / 100;
const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);

export function monthlyBase(rateType: "daily" | "monthly", rate: number): number {
  return rateType === "monthly" ? rate : rate * DAILY_TO_MONTHLY_DAYS;
}

export function weeklyContributions(base: number, s: Settings) {
  const sss = round2(
    (clamp(base, s.sss.min_monthly, s.sss.max_monthly) * s.sss.employee_percent) /
      100 /
      WEEKS_PER_MONTH,
  );
  const philhealth = round2(
    (clamp(base, s.philhealth.min_monthly, s.philhealth.max_monthly) *
      s.philhealth.total_percent *
      s.philhealth.employee_share_percent) /
      10000 /
      WEEKS_PER_MONTH,
  );
  const pagibig = round2(
    (Math.min(base, s.pagibig.max_monthly_compensation) *
      s.pagibig.employee_percent) /
      100 /
      WEEKS_PER_MONTH,
  );
  return { sss, philhealth, pagibig };
}

export function weeklyTax(taxable: number, s: Settings): number {
  if (taxable <= 0) return 0;
  const brackets = [...s.tax.brackets].sort((a, b) => a.over - b.over);
  let hit = brackets[0];
  for (const b of brackets) if (taxable > b.over) hit = b;
  return round2(hit.base + ((taxable - hit.over) * hit.percent) / 100);
}

// Monday of the most recent complete Mon–Sat week (Manila).
export function lastCompleteWeekStart(): string {
  const now = new Date(Date.now() + 8 * 3600000); // shift to Manila wall clock
  const dow = now.getUTCDay(); // 0 Sun … 6 Sat
  const daysSinceMonday = (dow + 6) % 7;
  const thisMonday = new Date(now);
  thisMonday.setUTCDate(now.getUTCDate() - daysSinceMonday);
  thisMonday.setUTCDate(thisMonday.getUTCDate() - 7);
  return thisMonday.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// ── Overtime ─────────────────────────────────────────────────────────────────

export type WorkRules = {
  regular_hours_per_day: number;
  unpaid_break_hours: number;
  overtime_multiplier_percent: number;
  // Official office hours (hour of day, decimals allowed: 8.5 = 8:30).
  // Time before work_start_hour never counts; overtime is strictly time
  // worked after work_end_hour.
  work_start_hour: number;
  work_end_hour: number;
};

export const WORK_DEFAULTS: WorkRules = {
  regular_hours_per_day: 8,
  unpaid_break_hours: 1,
  overtime_multiplier_percent: 125,
  work_start_hour: 8,
  work_end_hour: 17,
};

// One attendance entry split against the official office hours (Manila):
// regular = payable time inside the 8–5 window (break deducted on full
// days), ot = time worked strictly after the official end. Early arrival
// before the official start never counts.
export function entryHours(
  clockIn: string,
  clockOut: string | null,
  rules: WorkRules,
): { regular: number; ot: number } {
  if (!clockOut) return { regular: 0, ot: 0 };
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(clockIn));
  const at = (hour: number) => {
    const hh = String(Math.floor(hour)).padStart(2, "0");
    const mm = String(Math.round((hour % 1) * 60)).padStart(2, "0");
    return new Date(`${day}T${hh}:${mm}:00+08:00`).getTime();
  };
  const officialStart = at(Number.isFinite(rules.work_start_hour) ? rules.work_start_hour : 8);
  const officialEnd = at(Number.isFinite(rules.work_end_hour) ? rules.work_end_hour : 17);
  const inMs = new Date(clockIn).getTime();
  const outMs = new Date(clockOut).getTime();

  const windowSpan = Math.max(
    0,
    (Math.min(outMs, officialEnd) - Math.max(inMs, officialStart)) / 3600000,
  );
  const regular = payableHours(windowSpan, rules);
  const ot = Math.max(0, (outMs - Math.max(inMs, officialEnd)) / 3600000);
  return {
    regular: Math.round(regular * 100) / 100,
    ot: Math.round(ot * 100) / 100,
  };
}

// Total span minus the unpaid break (break only deducted on days long
// enough to plausibly include one).
export function payableHours(rawHours: number, rules: WorkRules): number {
  if (rawHours <= 0) return 0;
  const payable =
    rawHours > rules.regular_hours_per_day / 2 + rules.unpaid_break_hours
      ? rawHours - rules.unpaid_break_hours
      : rawHours;
  return Math.round(payable * 100) / 100;
}

export function otHours(payable: number, rules: WorkRules): number {
  return Math.max(0, Math.round((payable - rules.regular_hours_per_day) * 100) / 100);
}

export function hourlyRate(
  rateType: "daily" | "monthly",
  rate: number,
  rules: WorkRules,
): number {
  const daily = rateType === "daily" ? rate : rate / DAILY_TO_MONTHLY_DAYS;
  return daily / rules.regular_hours_per_day;
}
