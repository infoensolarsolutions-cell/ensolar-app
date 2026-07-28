import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { TIMEZONE } from "@/lib/format";

// Cash-basis P&L figures for a date range — shared by the Reports & P&L page
// and the CSV export so both always agree.

export function toUtc(date: string): string {
  return new Date(`${date}T00:00:00+08:00`).toISOString();
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export type Figures = {
  revenue: number;
  cogs: number;
  cogsMaterials: number;
  cogsOther: number;
  opex: number;
  collections: number;
  posSales: number;
  opexByCategory: Map<string, number>;
  byDay: Map<string, number>;
  byMethod: Map<string, number>;
};

export async function figuresFor(
  supabase: Awaited<ReturnType<typeof createClient>>,
  from: string,
  toExclusive: string,
): Promise<Figures> {
  const [payments, pos, materials, expenses] = await Promise.all([
    supabase
      .from("payments")
      .select("amount, received_at, method")
      .gte("received_at", toUtc(from))
      .lt("received_at", toUtc(toExclusive))
      .limit(5000),
    supabase
      .from("pos_sales")
      .select("total, sold_at, payment_method")
      .gte("sold_at", toUtc(from))
      .lt("sold_at", toUtc(toExclusive))
      .limit(5000),
    supabase
      .from("project_costs")
      .select("amount, type")
      .gte("date", from)
      .lt("date", toExclusive),
    supabase
      .from("expenses")
      .select("category, amount")
      .gte("date", from)
      .lt("date", toExclusive),
  ]);

  const dayFmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit",
  });
  const byDay = new Map<string, number>();
  const byMethod = new Map<string, number>();
  let collections = 0;
  let posSales = 0;

  for (const p of payments.data ?? []) {
    const amt = Number(p.amount);
    collections += amt;
    const day = dayFmt.format(new Date(p.received_at));
    byDay.set(day, (byDay.get(day) ?? 0) + amt);
    byMethod.set(p.method, (byMethod.get(p.method) ?? 0) + amt);
  }
  for (const s of pos.data ?? []) {
    const amt = Number(s.total);
    posSales += amt;
    const day = dayFmt.format(new Date(s.sold_at));
    byDay.set(day, (byDay.get(day) ?? 0) + amt);
    byMethod.set(s.payment_method, (byMethod.get(s.payment_method) ?? 0) + amt);
  }

  const opexByCategory = new Map<string, number>();
  for (const e of expenses.data ?? []) {
    opexByCategory.set(e.category, (opexByCategory.get(e.category) ?? 0) + Number(e.amount));
  }

  let cogsMaterials = 0;
  let cogsOther = 0;
  for (const c of materials.data ?? []) {
    if (c.type === "materials") cogsMaterials += Number(c.amount);
    else cogsOther += Number(c.amount);
  }

  return {
    revenue: collections + posSales,
    cogs: cogsMaterials + cogsOther,
    cogsMaterials,
    cogsOther,
    opex: (expenses.data ?? []).reduce((s, e) => s + Number(e.amount), 0),
    collections,
    posSales,
    opexByCategory,
    byDay,
    byMethod,
  };
}
