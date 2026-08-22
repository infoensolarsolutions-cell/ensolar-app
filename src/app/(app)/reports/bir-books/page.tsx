import type { Metadata } from "next";
import Link from "next/link";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, todayManila } from "@/lib/format";
import { computeBirBooks } from "@/lib/bir";

export const metadata: Metadata = { title: "BIR Books" };

const BOOKS = {
  sales: "📗 Sales Book",
  purchases: "📕 Purchase Book",
  ledger: "📒 General Ledger",
} as const;
type Book = keyof typeof BOOKS;

const money = (n: number): string =>
  n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default async function BirBooksPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; book?: string }>;
}) {
  await requireRole("owner");
  const currentYear = Number(todayManila().slice(0, 4));
  const { year: yearParam, book: bookParam } = await searchParams;
  const raw = Number(yearParam);
  const year = Number.isInteger(raw) && raw >= 2018 && raw <= currentYear ? raw : currentYear;
  const book: Book = (Object.keys(BOOKS) as Book[]).includes(bookParam as Book)
    ? (bookParam as Book)
    : "sales";

  const supabase = await createClient();
  const { sales, purchases, ledger } = await computeBirBooks(supabase, year);

  const years: number[] = [];
  for (let y = currentYear; y >= 2018; y--) years.push(y);

  // Group entry books by month for subtotals.
  const monthOf = (d: string) => Number(d.slice(5, 7));
  const entryRows = book === "sales" ? sales : purchases;
  const monthsPresent = [...new Set(entryRows.map((r) => monthOf(r.date)))].sort((a, b) => a - b);

  return (
    <>
      <TopBar title="BIR Books" backHref="/more" />
      <div className="space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(BOOKS) as Book[]).map((b) => (
              <Link
                key={b}
                href={`/reports/bir-books?book=${b}&year=${year}`}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  b === book ? "bg-brand-green text-white" : "border border-gray-300 text-gray-600"
                }`}
              >
                {BOOKS[b]}
              </Link>
            ))}
          </div>
          <div className="flex gap-2">
            <form action="/reports/bir-books" className="flex gap-2">
              <input type="hidden" name="book" value={book} />
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
            <a
              href={`/api/export/bir-${book}?year=${year}`}
              className="rounded-lg bg-brand-green px-3 py-2 text-sm font-semibold text-white"
            >
              ⬇ Excel
            </a>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="font-semibold text-gray-900">
            {BOOKS[book]} — {year}
          </p>
          <p className="mb-3 text-xs text-gray-500">
            Ensolar Solutions Installation Services · cash basis · generated
            from recorded {book === "sales" ? "payments and POS sales" : book === "purchases" ? "expenses and project costs" : "transactions"}
          </p>

          {book !== "ledger" && (
            <div className="overflow-x-auto">
              <table className="w-full whitespace-nowrap text-xs">
                <thead>
                  <tr className="border-b-2 border-gray-800 text-left">
                    <th className="py-1.5 pr-3 font-semibold">Date</th>
                    {book === "sales" ? (
                      <>
                        <th className="py-1.5 pr-3 font-semibold">OR / Ref No.</th>
                        <th className="py-1.5 pr-3 font-semibold">Customer</th>
                        <th className="py-1.5 pr-3 font-semibold">TIN</th>
                        <th className="py-1.5 pr-3 font-semibold">Address</th>
                      </>
                    ) : (
                      <>
                        <th className="py-1.5 pr-3 font-semibold">Particulars / Supplier</th>
                        <th className="py-1.5 pr-3 font-semibold">TIN</th>
                        <th className="py-1.5 pr-3 font-semibold">Account</th>
                      </>
                    )}
                    <th className="py-1.5 text-right font-semibold">Amount (₱)</th>
                  </tr>
                </thead>
                <tbody>
                  {entryRows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-gray-400">
                        No entries recorded in {year}.
                      </td>
                    </tr>
                  )}
                  {monthsPresent.map((m) => {
                    const rows = entryRows.filter((r) => monthOf(r.date) === m);
                    const subtotal = rows.reduce((s, r) => s + r.amount, 0);
                    return [
                      ...rows.map((r, i) => (
                        <tr key={`${m}-${i}`} className="border-b border-gray-50">
                          <td className="py-1.5 pr-3 text-gray-600">{formatDate(r.date)}</td>
                          {"reference" in r ? (
                            <>
                              <td className="py-1.5 pr-3">{r.reference}</td>
                              <td className="py-1.5 pr-3">{r.customer}</td>
                              <td className="py-1.5 pr-3 text-gray-300">—</td>
                              <td className="max-w-[220px] truncate py-1.5 pr-3 text-gray-500">{r.address}</td>
                            </>
                          ) : (
                            <>
                              <td className="max-w-[280px] truncate py-1.5 pr-3">{r.particulars}</td>
                              <td className="py-1.5 pr-3 text-gray-300">—</td>
                              <td className="py-1.5 pr-3 text-gray-500">{r.account}</td>
                            </>
                          )}
                          <td className="py-1.5 text-right">{money(r.amount)}</td>
                        </tr>
                      )),
                      <tr key={`sub-${m}`} className="border-b border-gray-200 bg-gray-50 font-semibold">
                        <td colSpan={book === "sales" ? 5 : 4} className="py-1.5 pr-3 text-right text-gray-600">
                          {MONTH_NAMES[m - 1]} subtotal
                        </td>
                        <td className="py-1.5 text-right">{money(subtotal)}</td>
                      </tr>,
                    ];
                  })}
                  {entryRows.length > 0 && (
                    <tr className="border-t-2 border-gray-800 bg-brand-green/5 font-bold">
                      <td colSpan={book === "sales" ? 5 : 4} className="py-2 pr-3 text-right">
                        TOTAL {year}
                      </td>
                      <td className="py-2 text-right">
                        {money(entryRows.reduce((s, r) => s + r.amount, 0))}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {book === "ledger" && (
            <div className="overflow-x-auto">
              <table className="w-full whitespace-nowrap text-xs">
                <thead>
                  <tr className="border-b-2 border-gray-800 text-right">
                    <th className="py-1.5 pr-3 text-left font-semibold">Account</th>
                    {MONTH_NAMES.map((m) => (
                      <th key={m} className="px-1.5 py-1.5 font-semibold">{m}</th>
                    ))}
                    <th className="px-1.5 py-1.5 font-bold">TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {(["Income", "Direct costs", "Operating expenses"] as const).map((group) => {
                    const rows = ledger.filter((l) => l.group === group);
                    if (!rows.length) return null;
                    const groupTotals = MONTH_NAMES.map((_, i) =>
                      rows.reduce((s, r) => s + r.values[i], 0),
                    );
                    return [
                      <tr key={group} className="bg-gray-100">
                        <td colSpan={14} className="py-1.5 pl-1 text-[11px] font-bold uppercase tracking-wide text-gray-600">
                          {group}
                        </td>
                      </tr>,
                      ...rows.map((r) => (
                        <tr key={r.account} className="border-b border-gray-50 text-right">
                          <td className="py-1.5 pl-4 pr-3 text-left text-gray-700">{r.account}</td>
                          {r.values.map((v, i) => (
                            <td key={i} className="px-1.5 py-1.5">{v ? money(v) : "–"}</td>
                          ))}
                          <td className="px-1.5 py-1.5 font-semibold">{money(r.total)}</td>
                        </tr>
                      )),
                      <tr key={`${group}-total`} className="border-b border-gray-300 text-right font-semibold">
                        <td className="py-1.5 pr-3 text-left">Total {group.toLowerCase()}</td>
                        {groupTotals.map((v, i) => (
                          <td key={i} className="px-1.5 py-1.5">{v ? money(v) : "–"}</td>
                        ))}
                        <td className="px-1.5 py-1.5">{money(groupTotals.reduce((s, v) => s + v, 0))}</td>
                      </tr>,
                    ];
                  })}
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-900">
            ⚠ These are computer-generated books for bookkeeping and tax
            preparation. How you may use them officially depends on your BIR
            registration: manual books must still be copied by hand into the
            registered bound books; printing these as loose-leaf books needs a
            BIR Permit to Use Loose-Leaf. Supplier TIN columns are blank — the
            system does not collect them — so complete those from receipts
            where required. Confirm with your accountant.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-4 text-sm">
          <Link href="/reports/income-statement" className="font-medium text-brand-green-dark underline">
            Income Statement
          </Link>
          <Link href="/reports/pnl" className="font-medium text-brand-green-dark underline">
            P&amp;L report
          </Link>
        </div>
      </div>
    </>
  );
}
