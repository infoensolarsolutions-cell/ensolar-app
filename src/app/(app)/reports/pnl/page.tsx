import type { Metadata } from "next";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatPeso, todayManila, TIMEZONE } from "@/lib/format";
import { BarRows, MonthlyBars } from "@/components/charts";

export const metadata: Metadata = { title: "Reports & P&L" };

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  gcash: "GCash",
  maya: "Maya",
  bank_transfer: "Bank Transfer",
  check: "Check",
  card: "Card",
  online: "Online",
};

function isDate(s: string | undefined): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function toUtc(date: string): string {
  return new Date(`${date}T00:00:00+08:00`).toISOString();
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function pesoShort(v: number): string {
  if (v >= 1_000_000) return `₱${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `₱${Math.round(v / 1_000)}k`;
  return `₱${Math.round(v)}`;
}

type Figures = {
  revenue: number;
  cogs: number;
  opex: number;
  collections: number;
  posSales: number;
  opexByCategory: Map<string, number>;
  byDay: Map<string, number>;
  byMethod: Map<string, number>;
};

async function figuresFor(
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
      .select("amount")
      .eq("type", "materials")
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

  return {
    revenue: collections + posSales,
    cogs: (materials.data ?? []).reduce((s, c) => s + Number(c.amount), 0),
    opex: (expenses.data ?? []).reduce((s, e) => s + Number(e.amount), 0),
    collections,
    posSales,
    opexByCategory,
    byDay,
    byMethod,
  };
}

function Kpi({ label, value, tone }: { label: string; value: number; tone: "green" | "red" | "auto" }) {
  const color =
    tone === "green"
      ? "text-brand-green-dark"
      : tone === "red"
        ? "text-red-600"
        : value >= 0
          ? "text-brand-green-dark"
          : "text-red-600";
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <p className={`mt-1 text-xl font-extrabold ${color}`}>{formatPeso(value)}</p>
    </div>
  );
}

function Row({ label, value, bold, negative }: { label: string; value: number; bold?: boolean; negative?: boolean }) {
  return (
    <div className={`flex justify-between py-1 text-sm ${bold ? "font-bold" : ""}`}>
      <span className={bold ? "text-gray-900" : "text-gray-600"}>{label}</span>
      <span className={negative ? "text-red-600" : "text-gray-900"}>
        {negative && value > 0 ? "−" : ""}{formatPeso(value)}
      </span>
    </div>
  );
}

export default async function PnlPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; month?: string }>;
}) {
  await requireRole("owner");
  const params = await searchParams;
  const today = todayManila();

  // Default range: current month to date. Old ?month= links keep working.
  let from = isDate(params.from) ? params.from : `${today.slice(0, 8)}01`;
  let to = isDate(params.to) ? params.to : today;
  if (/^\d{4}-\d{2}$/.test(params.month ?? "")) {
    from = `${params.month}-01`;
    to = addDays(addDays(from, 32).slice(0, 8) + "01", -1);
  }
  if (to < from) [from, to] = [to, from];

  const supabase = await createClient();
  const rangeDays =
    Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000) + 1;
  const toExclusive = addDays(to, 1);
  const prevFrom = addDays(from, -rangeDays);

  const [cur, prev] = await Promise.all([
    figuresFor(supabase, from, toExclusive),
    figuresFor(supabase, prevFrom, from),
  ]);

  const grossProfit = cur.revenue - cur.cogs;
  const net = grossProfit - cur.opex;
  const prevNet = prev.revenue - prev.cogs - prev.opex;
  const delta = net - prevNet;

  // One bar per day across the range (up to 92 days).
  const days = Math.min(rangeDays, 92);
  const dailyRevenue = Array.from({ length: days }, (_, i) => {
    const date = addDays(from, i);
    return { label: date.slice(5).replace("-", "/"), value: cur.byDay.get(date) ?? 0 };
  });

  const methodMix = Object.entries(METHOD_LABELS)
    .map(([key, label]) => ({ label, value: cur.byMethod.get(key) ?? 0 }))
    .filter((m) => m.value > 0)
    .sort((a, b) => b.value - a.value);

  const expenseRows = [...cur.opexByCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value }));

  return (
    <>
      <TopBar title="Reports & P&L" backHref="/more" />
      <div className="space-y-4 p-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-4 lg:space-y-0">
        <form
          action="/reports/pnl"
          className="flex flex-wrap items-center gap-2 lg:col-span-full"
        >
          <input name="from" type="date" defaultValue={from}
            className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none" />
          <span className="text-sm text-gray-400">to</span>
          <input name="to" type="date" defaultValue={to}
            className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none" />
          <button className="rounded-lg bg-gray-800 px-4 py-2.5 text-sm font-semibold text-white">
            View
          </button>
          <span className="text-xs text-gray-400">
            Cash basis: money actually received and spent in this range.
          </span>
        </form>

        <div className="grid grid-cols-2 gap-3 lg:col-span-full lg:grid-cols-4">
          <Kpi label="Revenue" value={cur.revenue} tone="green" />
          <Kpi label="COGS (materials)" value={cur.cogs} tone="red" />
          <Kpi label="Expenses" value={cur.opex} tone="red" />
          <Kpi label="Net Income" value={net} tone="auto" />
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 lg:col-span-full">
          <p className="mb-1 font-semibold text-gray-900">Daily revenue</p>
          <p className="mb-2 text-xs text-gray-500">
            Project collections + POS sales per day
          </p>
          {cur.revenue === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">
              No money received in this range.
            </p>
          ) : (
            <MonthlyBars data={dailyRevenue} format={pesoShort} />
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-3 font-semibold text-gray-900">Payment method mix</p>
          {methodMix.length === 0 ? (
            <p className="text-sm text-gray-400">No payments in this range.</p>
          ) : (
            <BarRows data={methodMix} format={formatPeso} />
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-3 font-semibold text-gray-900">Expenses by category</p>
          {expenseRows.length === 0 ? (
            <p className="text-sm text-gray-400">No expenses recorded in this range.</p>
          ) : (
            <BarRows data={expenseRows} format={formatPeso} />
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 lg:col-span-full">
          <p className="mb-2 font-bold text-gray-900">Profit & Loss statement</p>

          <p className="mt-1 text-xs font-bold uppercase text-gray-400">Revenue</p>
          <Row label="Project collections" value={cur.collections} />
          <Row label="POS sales" value={cur.posSales} />
          <Row label="Total revenue" value={cur.revenue} bold />

          <p className="mt-3 text-xs font-bold uppercase text-gray-400">Cost of goods</p>
          <Row label="Materials issued to projects" value={cur.cogs} negative />
          <Row label="Gross profit" value={grossProfit} bold />

          <p className="mt-3 text-xs font-bold uppercase text-gray-400">Operating expenses</p>
          {expenseRows.map((e) => (
            <Row key={e.label} label={e.label} value={e.value} negative />
          ))}
          {expenseRows.length === 0 && (
            <p className="py-1 text-sm text-gray-400">No expenses recorded.</p>
          )}
          <Row label="Total expenses" value={cur.opex} bold negative />

          <div className={`mt-3 rounded-lg p-3 ${net >= 0 ? "bg-green-50" : "bg-red-50"}`}>
            <div className="flex justify-between">
              <span className="font-bold text-gray-900">NET PROFIT</span>
              <span className={`text-lg font-extrabold ${net >= 0 ? "text-green-800" : "text-red-700"}`}>
                {formatPeso(net)}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-gray-500">
              vs previous {rangeDays} days: {formatPeso(prevNet)}{" "}
              <span className={delta >= 0 ? "font-semibold text-green-700" : "font-semibold text-red-600"}>
                ({delta >= 0 ? "+" : ""}{formatPeso(delta)})
              </span>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
