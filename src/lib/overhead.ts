import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { toUtc, addDays } from "@/lib/pnl";

// Company overhead (rent, salaries, utilities, fuel — everything in
// Expenses) allocated to projects two ways, both over the trailing 12
// months, so a project's NET profit is visible:
//   - by contract size: rate = opex ÷ revenue, share = contract × rate
//   - by duration: perDay = opex ÷ combined project-days running in the
//     window, share = the project's own days × perDay (a slow project
//     carries more overhead than a quick one of the same price)
// Shared by the project page and the Project Profitability report so all
// views always agree.

export type Overhead = {
  rate: number; // opex ÷ revenue, e.g. 0.14 = 14 centavos of overhead per peso of revenue
  perDay: number; // opex ÷ combined project-days in the window
  totalProjectDays: number;
  opex: number;
  revenue: number;
  from: string; // first day of the trailing window (Manila date)
  today: string;
};

// A project's active span: start date (or the day it was created) until
// completion (or today while still running). Minimum 1 day.
export function projectDuration(
  p: { start_date: string | null; created_at: string; completed_date: string | null },
  today: string,
): { from: string; to: string; days: number } {
  const from = p.start_date ?? p.created_at.slice(0, 10);
  let to = p.completed_date ?? today;
  if (to < from) to = from;
  return { from, to, days: spanDays(from, to) };
}

function spanDays(from: string, to: string): number {
  return Math.max(1, Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1);
}

export async function overheadRate(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<Overhead> {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
  const from = addDays(today, -365);
  const toExclusive = addDays(today, 1);

  const [payments, pos, expenses, projects] = await Promise.all([
    supabase
      .from("payments")
      .select("amount")
      .gte("received_at", toUtc(from))
      .lt("received_at", toUtc(toExclusive))
      .limit(5000),
    supabase
      .from("pos_sales")
      .select("total")
      .gte("sold_at", toUtc(from))
      .lt("sold_at", toUtc(toExclusive))
      .limit(5000),
    supabase
      .from("expenses")
      .select("amount")
      .gte("date", from)
      .lt("date", toExclusive)
      .limit(5000),
    supabase
      .from("projects")
      .select("start_date, created_at, completed_date")
      .limit(2000),
  ]);

  const revenue =
    (payments.data ?? []).reduce((s, p) => s + Number(p.amount), 0) +
    (pos.data ?? []).reduce((s, p) => s + Number(p.total), 0);
  const opex = (expenses.data ?? []).reduce((s, e) => s + Number(e.amount), 0);

  // Combined project-days inside the window: every day a project was
  // running counts, so overlapping projects split each day's overhead.
  let totalProjectDays = 0;
  for (const p of projects.data ?? []) {
    const d = projectDuration(p, today);
    const clipFrom = d.from > from ? d.from : from;
    const clipTo = d.to < today ? d.to : today;
    if (clipTo >= clipFrom) totalProjectDays += spanDays(clipFrom, clipTo);
  }

  return {
    rate: revenue > 0 ? opex / revenue : 0,
    perDay: totalProjectDays > 0 ? opex / totalProjectDays : 0,
    totalProjectDays,
    opex,
    revenue,
    from,
    today,
  };
}

// Same traffic-light bands as the Business KPI net-margin signal.
export const PROJECT_MARGIN_HEALTHY = 0.2;
export const PROJECT_MARGIN_DANGER = 0.05;
