import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { toUtc, addDays } from "@/lib/pnl";

// Company overhead rate: operating expenses (rent, salaries, utilities,
// fuel — everything in Expenses) as a share of total revenue over the
// trailing 12 months. Projects only carry their direct costs, so to see a
// project's NET profit we charge each project this same share of its
// contract amount as its slice of the overhead. Shared by the project page
// and the Project Profitability report so both always agree.

export type Overhead = {
  rate: number; // opex ÷ revenue, e.g. 0.14 = 14 centavos of overhead per peso of revenue
  opex: number;
  revenue: number;
  from: string; // first day of the trailing window (Manila date)
};

export async function overheadRate(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<Overhead> {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
  const from = addDays(today, -365);
  const toExclusive = addDays(today, 1);

  const [payments, pos, expenses] = await Promise.all([
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
  ]);

  const revenue =
    (payments.data ?? []).reduce((s, p) => s + Number(p.amount), 0) +
    (pos.data ?? []).reduce((s, p) => s + Number(p.total), 0);
  const opex = (expenses.data ?? []).reduce((s, e) => s + Number(e.amount), 0);

  return { rate: revenue > 0 ? opex / revenue : 0, opex, revenue, from };
}

// Same traffic-light bands as the Business KPI net-margin signal.
export const PROJECT_MARGIN_HEALTHY = 0.2;
export const PROJECT_MARGIN_DANGER = 0.05;
