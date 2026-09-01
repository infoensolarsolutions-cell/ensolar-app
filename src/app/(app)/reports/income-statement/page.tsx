import type { Metadata } from "next";
import Link from "next/link";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { todayManila } from "@/lib/format";
import {
  computeIncomeStatement,
  PERIOD_LABELS,
  type StmtPeriod,
  type StmtRow,
} from "@/lib/income-statement";

export const metadata: Metadata = { title: "Income Statement" };

const money = (n: number): string =>
  n === 0
    ? "–"
    : n < 0
      ? `(${Math.abs(n).toLocaleString("en-PH", { maximumFractionDigits: 0 })})`
      : n.toLocaleString("en-PH", { maximumFractionDigits: 0 });

const pct = (v: number): string => (Number.isNaN(v) ? "–" : `${Math.round(v * 100)}%`);

const cellText = (row: StmtRow, v: number): string =>
  row.kind === "pct" ? pct(v) : money(v);

export default async function IncomeStatementPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; period?: string }>;
}) {
  await requireRole("owner");
  const currentYear = Number(todayManila().slice(0, 4));
  const { year: yearParam, period: periodParam } = await searchParams;
  const raw = Number(yearParam);
  const year =
    Number.isInteger(raw) && raw >= 2018 && raw <= currentYear ? raw : currentYear;
  const period: StmtPeriod = (Object.keys(PERIOD_LABELS) as StmtPeriod[]).includes(
    periodParam as StmtPeriod,
  )
    ? (periodParam as StmtPeriod)
    : "monthly";

  const supabase = await createClient();
  const { title, columnLabels, rows } = await computeIncomeStatement(supabase, year, period);

  const years: number[] = [];
  for (let y = currentYear; y >= 2018; y--) years.push(y);

  return (
    <>
      <TopBar title="Income Statement" backHref="/more" />
      <div className="space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(PERIOD_LABELS) as StmtPeriod[]).map((p) => (
              <Link
                key={p}
                href={`/reports/income-statement?period=${p}&year=${year}`}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  p === period
                    ? "bg-brand-green text-white"
                    : "border border-gray-300 text-gray-600"
                }`}
              >
                {PERIOD_LABELS[p]}
              </Link>
            ))}
          </div>
          <div className="flex gap-2">
            {period !== "annual" && (
              <form action="/reports/income-statement" className="flex gap-2">
                <input type="hidden" name="period" value={period} />
                <select
                  name="year"
                  defaultValue={String(year)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <button className="rounded-lg bg-gray-800 px-3 py-2 text-sm font-semibold text-white">
                  View
                </button>
              </form>
            )}
            <a
              href={`/api/income-statement/pdf?year=${year}&period=${period}`}
              target="_blank"
              className="rounded-lg bg-brand-green px-3 py-2 text-sm font-semibold text-white"
            >
              Download PDF
            </a>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="font-semibold text-gray-900">{title}</p>
          <p className="mb-3 text-xs text-gray-500">
            Cash basis · amounts in ₱ · ( ) negative
            {columnLabels.length > 4 ? " · scroll sideways for all columns" : ""}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full whitespace-nowrap text-xs">
              <thead>
                <tr className="border-b-2 border-gray-800 text-right">
                  <th className="py-1.5 pr-3 text-left font-semibold"> </th>
                  {columnLabels.map((m) => (
                    <th key={m} className="px-2 py-1.5 font-semibold">{m}</th>
                  ))}
                  <th className="px-2 py-1.5 font-bold">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  if (row.kind === "header") {
                    return (
                      <tr key={i} className="bg-gray-100">
                        <td colSpan={columnLabels.length + 2} className="py-1.5 pl-1 pr-3 text-[11px] font-bold uppercase tracking-wide text-gray-600">
                          {row.label}
                        </td>
                      </tr>
                    );
                  }
                  const rowClass =
                    row.kind === "total"
                      ? "bg-brand-green/5 font-bold border-t border-gray-800"
                      : row.kind === "subtotal"
                        ? "font-semibold border-t border-gray-200"
                        : row.kind === "pct"
                          ? "text-gray-500 italic"
                          : "";
                  return (
                    <tr key={i} className={`border-b border-gray-50 text-right ${rowClass}`}>
                      <td className={`py-1.5 pr-3 text-left ${row.kind === "line" ? "pl-4 text-gray-700" : ""}`}>
                        {row.label}
                      </td>
                      {row.values.map((v, j) => (
                        <td key={j} className="px-2 py-1.5">{cellText(row, v)}</td>
                      ))}
                      <td className="px-2 py-1.5 font-semibold">{cellText(row, row.total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-gray-400">
            Revenue = customer payments received + POS sales. Direct costs =
            costs recorded on projects, counted when materials are issued —
            bulk stock purchases are NOT an expense here; until issued, that
            value sits as inventory in Products &amp; Stock (an asset, shown on
            the Business KPI as &ldquo;Cash tied up in stock&rdquo;). Operating
            expenses = the Expenses ledger (including payroll).
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-4 text-sm">
          <Link href="/reports/pnl" className="font-medium text-brand-green-dark underline">
            P&amp;L report
          </Link>
          <Link href="/reports/business-kpi" className="font-medium text-brand-green-dark underline">
            Business KPI
          </Link>
          <Link href="/reports/bir-books" className="font-medium text-brand-green-dark underline">
            BIR Books
          </Link>
        </div>
      </div>
    </>
  );
}
