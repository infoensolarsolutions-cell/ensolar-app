import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { todayManila, TIMEZONE } from "@/lib/format";

// Formal income statement (cash basis) with monthly columns and a year
// total. One computation shared by the report page and the PDF so the
// printed statement always matches the screen.

export type StmtRow = {
  label: string;
  kind: "header" | "line" | "subtotal" | "total" | "pct";
  values: number[]; // one per month; pct rows carry fractions (0.42 = 42%)
  total: number;
};

export type IncomeStatement = {
  year: number;
  monthLabels: string[];
  rows: StmtRow[];
};

export async function computeIncomeStatement(
  supabase: SupabaseClient,
  year: number,
): Promise<IncomeStatement> {
  const today = todayManila();
  const currentYear = Number(today.slice(0, 4));
  const monthsInYear =
    year < currentYear ? 12 : year > currentYear ? 0 : Number(today.slice(5, 7));
  const from = `${year}-01-01`;
  const toExclusive = `${year + 1}-01-01`;

  const [payRes, posRes, costRes, expRes] = await Promise.all([
    supabase.from("payments").select("amount, received_at").gte("received_at", from).lt("received_at", toExclusive).limit(10000),
    supabase.from("pos_sales").select("total, sold_at").gte("sold_at", from).lt("sold_at", toExclusive).limit(10000),
    supabase.from("project_costs").select("amount, type, date").gte("date", from).lt("date", toExclusive).limit(10000),
    supabase.from("expenses").select("amount, category, date").gte("date", from).lt("date", toExclusive).limit(10000),
  ]);

  const tsMonthFmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE, year: "numeric", month: "2-digit",
  });
  const monthIndex = (dateOrIso: string, isTimestamp: boolean): number => {
    const key = isTimestamp ? tsMonthFmt.format(new Date(dateOrIso)) : dateOrIso.slice(0, 7);
    return Number(key.slice(5, 7)) - 1;
  };

  const zeros = () => Array.from({ length: monthsInYear }, () => 0);
  const collections = zeros();
  const pos = zeros();
  const cogsMaterials = zeros();
  const cogsOther = zeros();
  const opexByCat = new Map<string, number[]>();

  const put = (arr: number[], i: number, amt: number) => {
    if (i >= 0 && i < arr.length) arr[i] += amt;
  };

  for (const p of payRes.data ?? []) put(collections, monthIndex(p.received_at as string, true), Number(p.amount));
  for (const s of posRes.data ?? []) put(pos, monthIndex(s.sold_at as string, true), Number(s.total));
  for (const c of costRes.data ?? []) {
    const i = monthIndex(c.date as string, false);
    if (c.type === "materials") put(cogsMaterials, i, Number(c.amount));
    else put(cogsOther, i, Number(c.amount));
  }
  for (const e of expRes.data ?? []) {
    const cat = (e.category as string) || "Uncategorized";
    if (!opexByCat.has(cat)) opexByCat.set(cat, zeros());
    put(opexByCat.get(cat)!, monthIndex(e.date as string, false), Number(e.amount));
  }

  const sum = (a: number[]) => a.reduce((s, v) => s + v, 0);
  const add = (a: number[], b: number[]) => a.map((v, i) => v + b[i]);
  const sub = (a: number[], b: number[]) => a.map((v, i) => v - b[i]);

  const revenue = add(collections, pos);
  const cogs = add(cogsMaterials, cogsOther);
  const grossProfit = sub(revenue, cogs);
  const opexTotal = [...opexByCat.values()].reduce((acc, v) => add(acc, v), zeros());
  const net = sub(grossProfit, opexTotal);

  const line = (label: string, kind: StmtRow["kind"], values: number[]): StmtRow => ({
    label, kind, values, total: sum(values),
  });
  const pctRow = (label: string, num: number[], den: number[]): StmtRow => ({
    label,
    kind: "pct",
    values: num.map((v, i) => (den[i] > 0 ? v / den[i] : NaN)),
    total: sum(den) > 0 ? sum(num) / sum(den) : NaN,
  });

  const rows: StmtRow[] = [
    line("REVENUE", "header", zeros()),
    line("Project collections", "line", collections),
    line("Store (POS) sales", "line", pos),
    line("Total revenue", "subtotal", revenue),
    line("DIRECT PROJECT COSTS", "header", zeros()),
    line("Materials issued to projects", "line", cogsMaterials),
    line("Labor, transport & other direct costs", "line", cogsOther),
    line("Total direct costs", "subtotal", cogs),
    line("GROSS PROFIT", "total", grossProfit),
    pctRow("Gross margin", grossProfit, revenue),
    line("OPERATING EXPENSES", "header", zeros()),
    ...[...opexByCat.entries()]
      .sort((a, b) => sum(b[1]) - sum(a[1]))
      .map(([cat, values]) => line(cat, "line", values)),
    line("Total operating expenses", "subtotal", opexTotal),
    line("NET INCOME", "total", net),
    pctRow("Net margin", net, revenue),
  ];

  const monthLabels = Array.from({ length: monthsInYear }, (_, i) =>
    new Intl.DateTimeFormat("en-PH", { month: "short", timeZone: "UTC" }).format(
      new Date(Date.UTC(year, i, 15)),
    ),
  );

  return { year, monthLabels, rows };
}
