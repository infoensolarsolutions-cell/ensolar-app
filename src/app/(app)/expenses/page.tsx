import type { Metadata } from "next";
import Link from "next/link";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatPeso, todayManila } from "@/lib/format";
import { ExpenseForm, ExpenseItem, ExpenseTable } from "./expense-form";

export const metadata: Metadata = { title: "Expenses" };

const isDate = (s: string | undefined): s is string => /^\d{4}-\d{2}-\d{2}$/.test(s ?? "");

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; from?: string; to?: string; category?: string }>;
}) {
  await requireRole("owner");
  const { month, from, to, category } = await searchParams;

  // Date window: an explicit from/to range wins; otherwise the month picker.
  const m = /^\d{4}-\d{2}$/.test(month ?? "") ? month! : todayManila().slice(0, 7);
  const rangeMode = isDate(from) || isDate(to);
  let start: string;
  let endExclusive: string;
  let periodLabel: string;
  if (rangeMode) {
    start = isDate(from) ? from : "2018-01-01";
    const endInclusive = isDate(to) ? to : todayManila();
    const e = new Date(`${endInclusive}T00:00:00Z`);
    e.setUTCDate(e.getUTCDate() + 1);
    endExclusive = e.toISOString().slice(0, 10);
    periodLabel = `${formatDate(start)} – ${formatDate(endInclusive)}`;
  } else {
    start = `${m}-01`;
    const n = new Date(`${start}T00:00:00Z`);
    n.setUTCMonth(n.getUTCMonth() + 1);
    endExclusive = n.toISOString().slice(0, 10);
    periodLabel = new Intl.DateTimeFormat("en-PH", {
      month: "long", year: "numeric", timeZone: "Asia/Manila",
    }).format(new Date(`${start}T00:00:00Z`));
  }

  const supabase = await createClient();

  let query = supabase
    .from("expenses")
    .select("id, category, description, amount, date, payroll_run_id")
    .gte("date", start)
    .lt("date", endExclusive)
    .order("date", { ascending: false });
  if (category) query = query.eq("category", category);

  const [{ data: expenses }, { data: allCats }] = await Promise.all([
    query,
    supabase.from("expenses").select("category").limit(3000),
  ]);

  const categories = [...new Set((allCats ?? []).map((c) => c.category))].sort((a, b) =>
    a.localeCompare(b),
  );

  const total = (expenses ?? []).reduce((s, e) => s + Number(e.amount), 0);
  const byCategory = new Map<string, number>();
  for (const e of expenses ?? []) {
    byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + Number(e.amount));
  }

  // Category links keep the active period in the URL.
  const periodParams = rangeMode
    ? `${isDate(from) ? `from=${from}&` : ""}${isDate(to) ? `to=${to}&` : ""}`
    : `month=${m}&`;

  return (
    <>
      <TopBar title="Expenses" backHref="/more" />
      <div className="space-y-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <form action="/expenses" className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <input name="month" type="month" defaultValue={rangeMode ? "" : m}
                className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none" />
              <select
                name="category"
                defaultValue={category ?? ""}
                className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none"
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <button className="rounded-lg bg-gray-800 px-4 py-2.5 text-sm font-semibold text-white">
                View
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <span>or date range:</span>
              <input name="from" type="date" defaultValue={isDate(from) ? from : ""}
                className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:border-brand-green focus:outline-none" />
              <span>to</span>
              <input name="to" type="date" defaultValue={isDate(to) ? to : ""}
                className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:border-brand-green focus:outline-none" />
              <span className="text-gray-400">(overrides the month)</span>
            </div>
          </form>
          <ExpenseForm />
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 lg:max-w-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            {periodLabel}
            {category ? ` · ${category}` : ""}
          </p>
          <p className="mt-1 text-2xl font-extrabold text-red-600">{formatPeso(total)}</p>
          {(category || rangeMode) && (
            <Link href="/expenses" className="mt-1 inline-block text-xs font-medium text-brand-green-dark underline">
              ✕ clear filters
            </Link>
          )}
        </div>

        <div className="space-y-4 lg:grid lg:grid-cols-3 lg:items-start lg:gap-4 lg:space-y-0">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="mb-2 font-semibold text-gray-900">By category</p>
            {byCategory.size === 0 && (
              <p className="text-sm text-gray-500">No expenses in this period.</p>
            )}
            <ul className="space-y-1 text-sm">
              {[...byCategory.entries()].sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
                <li key={cat}>
                  <Link
                    href={`/expenses?${periodParams}category=${encodeURIComponent(cat)}`}
                    className={`flex justify-between rounded px-1 py-0.5 ${
                      cat === category ? "bg-brand-green/10 font-semibold" : "hover:bg-gray-50"
                    }`}
                  >
                    <span className="text-gray-600">{cat}</span>
                    <span className="font-semibold">{formatPeso(amt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
            {category && (
              <Link
                href={`/expenses?${periodParams.slice(0, -1)}`}
                className="mt-2 inline-block text-xs font-medium text-brand-green-dark underline"
              >
                show all categories
              </Link>
            )}
          </div>

          <div className="lg:col-span-2">
            {/* Phones: compact list */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 lg:hidden">
              <p className="mb-1 font-semibold text-gray-900">Entries ({(expenses ?? []).length})</p>
              <ul className="divide-y divide-gray-100">
                {(expenses ?? []).map((e) => (
                  <ExpenseItem
                    key={e.id}
                    expense={{ ...e, amount: Number(e.amount) }}
                  />
                ))}
              </ul>
            </div>
            {/* Desktop: table */}
            <div className="hidden lg:block">
              <ExpenseTable
                expenses={(expenses ?? []).map((e) => ({ ...e, amount: Number(e.amount) }))}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
