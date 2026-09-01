import type { Metadata } from "next";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatPeso, todayManila } from "@/lib/format";
import { addDays, figuresFor } from "@/lib/pnl";
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

function pesoShort(v: number): string {
  if (v >= 1_000_000) return `₱${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `₱${Math.round(v / 1_000)}k`;
  return `₱${Math.round(v)}`;
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
          <a
            href={`/api/export/pnl?from=${from}&to=${to}`}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 active:bg-gray-50"
          >
            📥 Export CSV
          </a>
          <span className="text-xs text-gray-400">
            Revenue when received · materials when issued to a project (bulk
            stock buys sit in inventory until issued — see Business KPI cash
            flow for bank-account timing).
          </span>
        </form>

        <div className="grid grid-cols-2 gap-3 lg:col-span-full lg:grid-cols-4">
          <Kpi label="Revenue" value={cur.revenue} tone="green" />
          <Kpi label="Project costs" value={cur.cogs} tone="red" />
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

          <p className="mt-3 text-xs font-bold uppercase text-gray-400">Direct project costs</p>
          <Row label="Materials issued to projects" value={cur.cogsMaterials} negative />
          <Row
            label="Other project costs (labor, travel, fuel, meals, etc.)"
            value={cur.cogsOther}
            negative
          />
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
