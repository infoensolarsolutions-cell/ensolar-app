import type { Metadata } from "next";
import Link from "next/link";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { computeBusinessKpis, type KpiStatus } from "@/lib/bizkpi";
import { formatPeso } from "@/lib/format";

export const metadata: Metadata = { title: "Business KPI" };

const STATUS_STYLE: Record<KpiStatus, { dot: string; chip: string; label: string }> = {
  good: { dot: "bg-green-500", chip: "bg-green-100 text-green-800", label: "OK" },
  warn: { dot: "bg-amber-500", chip: "bg-amber-100 text-amber-800", label: "Watch" },
  bad: { dot: "bg-red-500", chip: "bg-red-100 text-red-700", label: "Act now" },
};

const GROUP_LINKS: Record<string, { href: string; label: string }> = {
  Money: { href: "/reports/receivables", label: "Receivables report →" },
  Sales: { href: "/reports/crm", label: "CRM report →" },
  Projects: { href: "/projects", label: "Projects →" },
  "After-sales & stock": { href: "/products", label: "Products & stock →" },
};

export default async function BusinessKpiPage() {
  await requireRole("owner");
  const supabase = await createClient();
  const { kpis, cashflow, bad, warn } = await computeBusinessKpis(supabase);

  const groups = [...new Set(kpis.map((k) => k.group))];

  return (
    <>
      <TopBar title="Business KPI" backHref="/more" />
      <div className="space-y-4 p-4">
        <div
          className={`rounded-xl border p-4 ${
            bad > 0
              ? "border-red-200 bg-red-50"
              : warn > 0
                ? "border-amber-200 bg-amber-50"
                : "border-green-200 bg-green-50"
          }`}
        >
          <p className="text-lg font-bold text-gray-900">
            {bad > 0
              ? `🚨 ${bad} number${bad === 1 ? "" : "s"} need${bad === 1 ? "s" : ""} action now`
              : warn > 0
                ? `⚠️ Nothing critical — ${warn} to keep an eye on`
                : "✅ All business numbers look healthy"}
          </p>
          <p className="mt-0.5 text-sm text-gray-600">
            {bad > 0 && warn > 0 && `Plus ${warn} on watch. `}
            Computed live from your projects, payments, leads, quotations,
            expenses, tickets and stock.
          </p>
        </div>

        {groups.map((group) => (
          <div key={group} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-semibold text-gray-900">{group}</p>
              {GROUP_LINKS[group] && (
                <Link
                  href={GROUP_LINKS[group].href}
                  className="text-xs font-medium text-brand-green-dark underline"
                >
                  {GROUP_LINKS[group].label}
                </Link>
              )}
            </div>
            <ul className="divide-y divide-gray-100">
              {kpis
                .filter((k) => k.group === group)
                .map((k) => {
                  const s = STATUS_STYLE[k.status];
                  return (
                    <li key={k.label} className="py-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm text-gray-600">{k.label}</p>
                          <p className="text-base font-bold text-gray-900">{k.value}</p>
                          {k.sub && <p className="text-xs text-gray-500">{k.sub}</p>}
                        </div>
                        <span
                          className={`mt-0.5 flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${s.chip}`}
                        >
                          <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                          {s.label}
                        </span>
                      </div>
                      {k.status !== "good" && k.advice && (
                        <p className="mt-1 rounded-lg bg-gray-50 px-3 py-1.5 text-xs text-gray-600">
                          💡 {k.advice}
                        </p>
                      )}
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-semibold text-gray-900">💵 Cash flow — last 6 months</p>
            <Link href="/reports/pnl" className="text-xs font-medium text-brand-green-dark underline">
              Profit &amp; Loss →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="py-1.5 pr-2 font-semibold">Month</th>
                  <th className="py-1.5 pr-2 text-right font-semibold">Cash in</th>
                  <th className="py-1.5 pr-2 text-right font-semibold">Cash out</th>
                  <th className="py-1.5 text-right font-semibold">Net</th>
                </tr>
              </thead>
              <tbody>
                {cashflow.map((m, i) => (
                  <tr key={m.label} className={`border-b border-gray-50 ${i === cashflow.length - 1 ? "font-semibold" : ""}`}>
                    <td className="py-1.5 pr-2 text-gray-700">
                      {m.label}
                      {i === cashflow.length - 1 && (
                        <span className="ml-1 text-[10px] font-normal text-gray-400">(to date)</span>
                      )}
                    </td>
                    <td className="py-1.5 pr-2 text-right text-gray-800">{formatPeso(m.cashIn)}</td>
                    <td className="py-1.5 pr-2 text-right text-gray-800">{formatPeso(m.cashOut)}</td>
                    <td className={`py-1.5 text-right font-semibold ${m.net < 0 ? "text-red-600" : "text-brand-green-dark"}`}>
                      {formatPeso(m.net)}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className="pt-2 text-xs font-bold uppercase tracking-wide text-gray-500">6-month total</td>
                  <td className="pt-2 pr-2 text-right font-bold">{formatPeso(cashflow.reduce((s, m) => s + m.cashIn, 0))}</td>
                  <td className="pt-2 pr-2 text-right font-bold">{formatPeso(cashflow.reduce((s, m) => s + m.cashOut, 0))}</td>
                  <td className={`pt-2 text-right font-bold ${cashflow.reduce((s, m) => s + m.net, 0) < 0 ? "text-red-600" : "text-brand-green-dark"}`}>
                    {formatPeso(cashflow.reduce((s, m) => s + m.net, 0))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-gray-400">
            Cash in = customer payments + POS sales. Cash out = expenses
            (including payroll) + project costs. Cash flow tells you if the
            bank balance is growing — profit tells you if the business model
            works. Watch both.
          </p>
        </div>

        <p className="text-center text-xs text-gray-400">
          Thresholds: red = act now, amber = watch. Recomputed every time you
          open this page — a red banner also appears on your dashboard.
        </p>
      </div>
    </>
  );
}
