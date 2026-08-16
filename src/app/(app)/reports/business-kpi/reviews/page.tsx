import type { Metadata } from "next";
import Link from "next/link";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { computeReviews } from "@/lib/reviews";
import { formatPeso } from "@/lib/format";

export const metadata: Metadata = { title: "KPI Reviews" };

const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);

export default async function KpiReviewsPage() {
  await requireRole("owner");
  const supabase = await createClient();
  const { weekly, monthly, csatMissing } = await computeReviews(supabase);

  return (
    <>
      <TopBar title="KPI Reviews" backHref="/reports/business-kpi" />
      <div className="space-y-4 p-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="font-semibold text-gray-900">📅 Weekly review — last 8 weeks</p>
          <p className="mb-2 text-xs text-gray-500">
            Cash flow, revenue, and sales conversion (quotations submitted that
            week and how they ended). Current week last.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full whitespace-nowrap text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="py-1.5 pr-3 font-semibold">Week</th>
                  <th className="py-1.5 pr-3 text-right font-semibold">Revenue in</th>
                  <th className="py-1.5 pr-3 text-right font-semibold">Cash out</th>
                  <th className="py-1.5 pr-3 text-right font-semibold">Net cash</th>
                  <th className="py-1.5 pr-3 text-right font-semibold">Quotes</th>
                  <th className="py-1.5 text-right font-semibold">Conversion</th>
                </tr>
              </thead>
              <tbody>
                {weekly.map((w, i) => (
                  <tr key={w.start} className={`border-b border-gray-50 ${i === weekly.length - 1 ? "font-semibold" : ""}`}>
                    <td className="py-1.5 pr-3 text-gray-700">
                      {w.label}
                      {i === weekly.length - 1 && (
                        <span className="ml-1 text-[10px] font-normal text-gray-400">(now)</span>
                      )}
                    </td>
                    <td className="py-1.5 pr-3 text-right">{formatPeso(w.revenue)}</td>
                    <td className="py-1.5 pr-3 text-right">{formatPeso(w.cashOut)}</td>
                    <td className={`py-1.5 pr-3 text-right font-semibold ${w.net < 0 ? "text-red-600" : "text-brand-green-dark"}`}>
                      {formatPeso(w.net)}
                    </td>
                    <td className="py-1.5 pr-3 text-right text-gray-700">
                      {w.quotesWon}/{w.quotesSent}
                    </td>
                    <td className="py-1.5 text-right">
                      {w.conversion === null ? (
                        <span className="text-gray-400">—</span>
                      ) : (
                        <span className={w.conversion < 0.2 ? "font-semibold text-red-600" : ""}>
                          {pct(w.conversion)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-gray-400">
            Quotes = won / submitted that week. Conversion counts only decided
            quotations (won ÷ won+rejected+expired); — means none decided yet.
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="font-semibold text-gray-900">🗓️ Monthly review — last 6 months</p>
          <p className="mb-2 text-xs text-gray-500">
            Net profit margin (healthy ≥15%, amber below that, red below 5%),
            employee turnover, and customer satisfaction.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full whitespace-nowrap text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="py-1.5 pr-3 font-semibold">Month</th>
                  <th className="py-1.5 pr-3 text-right font-semibold">Net margin</th>
                  <th className="py-1.5 pr-3 text-right font-semibold">Turnover</th>
                  <th className="py-1.5 text-right font-semibold">Satisfaction</th>
                </tr>
              </thead>
              <tbody>
                {monthly.map((m, i) => (
                  <tr key={m.label} className={`border-b border-gray-50 ${i === monthly.length - 1 ? "font-semibold" : ""}`}>
                    <td className="py-1.5 pr-3 text-gray-700">
                      {m.label}
                      {i === monthly.length - 1 && (
                        <span className="ml-1 text-[10px] font-normal text-gray-400">(to date)</span>
                      )}
                    </td>
                    <td className="py-1.5 pr-3 text-right">
                      {m.netMargin === null ? (
                        <span className="text-gray-400">no revenue</span>
                      ) : (
                        <span className={m.netMargin < 0.05 ? "font-semibold text-red-600" : m.netMargin < 0.15 ? "text-amber-600" : "text-brand-green-dark"}>
                          {pct(m.netMargin)}
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 pr-3 text-right">
                      {m.turnover === null ? (
                        <span className="text-gray-400">—</span>
                      ) : (
                        <span className={m.separations > 0 ? "font-semibold text-amber-600" : "text-gray-700"}>
                          {pct(m.turnover)}
                          <span className="ml-1 text-[10px] text-gray-400">({m.separations}/{m.headcount})</span>
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 text-right">
                      {m.csatAvg === null ? (
                        <span className="text-gray-400">no ratings</span>
                      ) : (
                        <span className={m.csatAvg < 3.5 ? "font-semibold text-red-600" : m.csatAvg < 4.2 ? "text-amber-600" : "text-brand-green-dark"}>
                          ⭐ {m.csatAvg.toFixed(1)}
                          <span className="ml-1 text-[10px] text-gray-400">({m.csatCount})</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-gray-400">
            Turnover = resignations ÷ headcount that month (from employee
            records&rsquo; resignation dates). Satisfaction = average of 1–5 star
            ratings customers give in their portal after project completion.
          </p>
          {csatMissing && (
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
              ⚠ Satisfaction ratings need the csat_ratings migration (0042) —
              run the SQL I gave you, then customers with completed projects
              will see the star-rating prompt in their portal.
            </p>
          )}
        </div>

        <Link
          href="/reports/business-kpi"
          className="block text-center text-sm font-medium text-brand-green-dark underline"
        >
          ← Back to Business KPI
        </Link>
      </div>
    </>
  );
}
