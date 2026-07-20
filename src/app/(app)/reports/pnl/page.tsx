import type { Metadata } from "next";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatPeso, todayManila } from "@/lib/format";

export const metadata: Metadata = { title: "P&L Report" };

type MonthFigures = {
  collections: number;
  posSales: number;
  cogs: number;
  opex: number;
  opexByCategory: Map<string, number>;
};

function monthBounds(m: string) {
  const start = `${m}-01`;
  const next = new Date(`${start}T00:00:00Z`);
  next.setUTCMonth(next.getUTCMonth() + 1);
  const end = next.toISOString().slice(0, 10);
  return {
    start,
    end,
    startUtc: new Date(`${start}T00:00:00+08:00`).toISOString(),
    endUtc: new Date(`${end}T00:00:00+08:00`).toISOString(),
  };
}

function prevMonth(m: string): string {
  const d = new Date(`${m}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() - 1);
  return d.toISOString().slice(0, 7);
}

async function figuresFor(
  supabase: Awaited<ReturnType<typeof createClient>>,
  m: string,
): Promise<MonthFigures> {
  const b = monthBounds(m);
  const [payments, pos, materials, expenses] = await Promise.all([
    supabase.from("payments").select("amount").gte("received_at", b.startUtc).lt("received_at", b.endUtc),
    supabase.from("pos_sales").select("total").gte("sold_at", b.startUtc).lt("sold_at", b.endUtc),
    supabase.from("project_costs").select("amount").eq("type", "materials").gte("date", b.start).lt("date", b.end),
    supabase.from("expenses").select("category, amount").gte("date", b.start).lt("date", b.end),
  ]);
  const opexByCategory = new Map<string, number>();
  for (const e of expenses.data ?? []) {
    opexByCategory.set(e.category, (opexByCategory.get(e.category) ?? 0) + Number(e.amount));
  }
  return {
    collections: (payments.data ?? []).reduce((s, p) => s + Number(p.amount), 0),
    posSales: (pos.data ?? []).reduce((s, p) => s + Number(p.total), 0),
    cogs: (materials.data ?? []).reduce((s, c) => s + Number(c.amount), 0),
    opex: (expenses.data ?? []).reduce((s, e) => s + Number(e.amount), 0),
    opexByCategory,
  };
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
  searchParams: Promise<{ month?: string }>;
}) {
  await requireRole("owner");
  const { month } = await searchParams;
  const m = /^\d{4}-\d{2}$/.test(month ?? "") ? month! : todayManila().slice(0, 7);
  const supabase = await createClient();

  const [cur, prev] = await Promise.all([
    figuresFor(supabase, m),
    figuresFor(supabase, prevMonth(m)),
  ]);

  const revenue = cur.collections + cur.posSales;
  const grossProfit = revenue - cur.cogs;
  const net = grossProfit - cur.opex;
  const prevNet = prev.collections + prev.posSales - prev.cogs - prev.opex;
  const delta = net - prevNet;

  const label = new Intl.DateTimeFormat("en-PH", {
    month: "long", year: "numeric", timeZone: "Asia/Manila",
  }).format(new Date(`${m}-15T00:00:00+08:00`));

  return (
    <>
      <TopBar title="Profit & Loss" backHref="/more" />
      <div className="space-y-4 p-4">
        <form action="/reports/pnl" className="flex gap-2">
          <input name="month" type="month" defaultValue={m}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
          <button className="rounded-lg bg-gray-800 px-4 py-2.5 text-sm font-semibold text-white">View</button>
        </form>

        <p className="rounded-xl bg-gray-100 px-4 py-2.5 text-xs text-gray-600">
          Cash-basis report: money actually received and spent in {label}.
        </p>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-2 font-bold text-gray-900">{label}</p>

          <p className="mt-1 text-xs font-bold uppercase text-gray-400">Revenue</p>
          <Row label="Project collections" value={cur.collections} />
          <Row label="POS sales" value={cur.posSales} />
          <Row label="Total revenue" value={revenue} bold />

          <p className="mt-3 text-xs font-bold uppercase text-gray-400">Cost of goods</p>
          <Row label="Materials issued to projects" value={cur.cogs} negative />
          <Row label="Gross profit" value={grossProfit} bold />

          <p className="mt-3 text-xs font-bold uppercase text-gray-400">Operating expenses</p>
          {[...cur.opexByCategory.entries()].sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
            <Row key={cat} label={cat} value={amt} negative />
          ))}
          {cur.opexByCategory.size === 0 && (
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
              vs last month: {formatPeso(prevNet)}{" "}
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
