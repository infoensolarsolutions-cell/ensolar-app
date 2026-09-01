import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { todayManila, TIMEZONE } from "@/lib/format";

// Weekly and monthly KPI reviews for the owner.
// Weekly: cash flow, revenue, sales conversion — the fast pulse.
// Monthly: net profit margin, employee turnover, customer satisfaction —
// the slow health signals.

export type WeekRow = {
  label: string; // "Jul 28 – Aug 3"
  start: string;
  revenue: number; // payments + POS (cash in)
  cashOut: number; // expenses + project costs
  net: number;
  quotesSent: number;
  quotesWon: number;
  quotesDecided: number;
  conversion: number | null;
};

export type MonthRow = {
  label: string; // "Mar 2026"
  revenue: number;
  cashOut: number;
  netMargin: number | null;
  headcount: number;
  separations: number;
  turnover: number | null;
  csatAvg: number | null;
  csatCount: number;
};

export type Reviews = {
  weekly: WeekRow[];
  monthly: MonthRow[];
  csatMissing: boolean;
};

const dayMs = 86400000;

function addDays(date: string, days: number): string {
  const t = new Date(`${date}T12:00:00Z`);
  t.setUTCDate(t.getUTCDate() + days);
  return t.toISOString().slice(0, 10);
}

export async function computeReviews(supabase: SupabaseClient): Promise<Reviews> {
  const today = todayManila();

  // 8 weeks, Monday-start, current week last.
  const dow = (new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7; // 0 = Monday
  const thisWeekStart = addDays(today, -dow);
  const weekStarts: string[] = [];
  for (let i = 7; i >= 0; i--) weekStarts.push(addDays(thisWeekStart, -7 * i));
  const since = weekStarts[0];

  // 6 months, current last.
  const monthKeys: string[] = [];
  for (let i = 5; i >= 0; i--) {
    let y = Number(today.slice(0, 4));
    let m = Number(today.slice(5, 7)) - i;
    while (m < 1) { m += 12; y -= 1; }
    monthKeys.push(`${y}-${String(m).padStart(2, "0")}`);
  }
  const monthSince = `${monthKeys[0]}-01`;
  const earliest = monthSince < since ? monthSince : since;

  const tsDayFmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit",
  });
  const tsDay = (iso: string) => tsDayFmt.format(new Date(iso));

  const [payRes, posRes, expRes, costRes, stockInRes, quoteRes, empRes, csatRes] = await Promise.all([
    supabase.from("payments").select("amount, received_at").gte("received_at", earliest).limit(5000),
    supabase.from("pos_sales").select("total, sold_at").gte("sold_at", earliest).limit(5000),
    supabase.from("expenses").select("amount, date").gte("date", earliest).limit(5000),
    supabase.from("project_costs").select("amount, date, inventory_txn_id").gte("date", earliest).limit(5000),
    supabase.from("inventory_txns").select("qty, unit_cost, date").eq("type", "in").gte("date", earliest).limit(5000),
    supabase
      .from("quotations")
      .select("status, created_at")
      .is("deleted_at", null)
      .neq("status", "draft")
      .gte("created_at", earliest)
      .limit(2000),
    supabase.from("employees").select("hired_at, resigned_at, active").limit(500),
    supabase.from("csat_ratings").select("rating, created_at").gte("created_at", monthSince).limit(2000),
  ]);

  // In/out amounts keyed by local day, so weeks and months slice one dataset.
  // cashOut = purchase timing (stock buys count, stock issues do not);
  // costOut = issue timing, used for the monthly net-margin column.
  const inByDay = new Map<string, number>();
  const cashOutByDay = new Map<string, number>();
  const costOutByDay = new Map<string, number>();
  const bump = (map: Map<string, number>, key: string, amt: number) =>
    map.set(key, (map.get(key) ?? 0) + amt);
  for (const p of payRes.data ?? []) bump(inByDay, tsDay(p.received_at as string), Number(p.amount));
  for (const s of posRes.data ?? []) bump(inByDay, tsDay(s.sold_at as string), Number(s.total));
  for (const e of expRes.data ?? []) {
    bump(cashOutByDay, e.date as string, Number(e.amount));
    bump(costOutByDay, e.date as string, Number(e.amount));
  }
  for (const c of costRes.data ?? []) {
    bump(costOutByDay, c.date as string, Number(c.amount));
    if (!c.inventory_txn_id) bump(cashOutByDay, c.date as string, Number(c.amount));
  }
  for (const t of stockInRes.data ?? []) {
    bump(cashOutByDay, t.date as string, Number(t.qty) * Number(t.unit_cost));
  }

  const sumRange = (map: Map<string, number>, from: string, toExclusive: string) => {
    let s = 0;
    for (const [day, amt] of map) if (day >= from && day < toExclusive) s += amt;
    return s;
  };

  const weekLabel = (start: string) => {
    const fmt = (d: string) =>
      new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", timeZone: "UTC" })
        .format(new Date(`${d}T12:00:00Z`));
    return `${fmt(start)} – ${fmt(addDays(start, 6))}`;
  };

  const quotes = (quoteRes.data ?? []).map((q) => ({
    status: q.status as string,
    day: tsDay(q.created_at as string),
  }));

  const weekly: WeekRow[] = weekStarts.map((start) => {
    const end = addDays(start, 7);
    const revenue = sumRange(inByDay, start, end);
    const cashOut = sumRange(cashOutByDay, start, end);
    const wq = quotes.filter((q) => q.day >= start && q.day < end);
    const won = wq.filter((q) => q.status === "accepted").length;
    const decided = wq.filter((q) => ["accepted", "rejected", "expired"].includes(q.status)).length;
    return {
      label: weekLabel(start),
      start,
      revenue,
      cashOut,
      net: revenue - cashOut,
      quotesSent: wq.length,
      quotesWon: won,
      quotesDecided: decided,
      conversion: decided ? won / decided : null,
    };
  });

  const employees = empRes.data ?? [];
  const ratings = (csatRes.data ?? []).map((r) => ({
    rating: Number(r.rating),
    month: tsDay(r.created_at as string).slice(0, 7),
  }));

  const monthly: MonthRow[] = monthKeys.map((key) => {
    const from = `${key}-01`;
    const toEx = addDays(`${key}-28`, 7).slice(0, 7) + "-01";
    const revenue = sumRange(inByDay, from, toEx);
    const cashOut = sumRange(costOutByDay, from, toEx);
    const monthEnd = addDays(toEx, -1);

    // Headcount during the month: hired by month end and not resigned
    // before the month started (no hire date recorded = long-time staff).
    const headcount = employees.filter(
      (e) =>
        (!e.hired_at || (e.hired_at as string) <= monthEnd) &&
        (!e.resigned_at || (e.resigned_at as string) >= from),
    ).length;
    const separations = employees.filter(
      (e) => e.resigned_at && (e.resigned_at as string) >= from && (e.resigned_at as string) <= monthEnd,
    ).length;

    const monthRatings = ratings.filter((r) => r.month === key);
    return {
      label: new Intl.DateTimeFormat("en-PH", { month: "short", year: "numeric", timeZone: "UTC" })
        .format(new Date(`${key}-15T12:00:00Z`)),
      revenue,
      cashOut,
      netMargin: revenue > 0 ? (revenue - cashOut) / revenue : null,
      headcount,
      separations,
      turnover: headcount > 0 ? separations / headcount : null,
      csatAvg: monthRatings.length
        ? monthRatings.reduce((s, r) => s + r.rating, 0) / monthRatings.length
        : null,
      csatCount: monthRatings.length,
    };
  });

  return { weekly, monthly, csatMissing: csatRes.error !== null };
}
