import type { Metadata } from "next";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatPeso, todayManila } from "@/lib/format";
import { ExpenseForm, ExpenseItem } from "./expense-form";

export const metadata: Metadata = { title: "Expenses" };

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  await requireRole("owner");
  const { month } = await searchParams;
  const m = /^\d{4}-\d{2}$/.test(month ?? "") ? month! : todayManila().slice(0, 7);
  const monthStart = `${m}-01`;
  const nextMonth = new Date(`${monthStart}T00:00:00Z`);
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
  const monthEnd = nextMonth.toISOString().slice(0, 10);

  const supabase = await createClient();
  const { data: expenses } = await supabase
    .from("expenses")
    .select("id, category, description, amount, date, payroll_run_id")
    .gte("date", monthStart)
    .lt("date", monthEnd)
    .order("date", { ascending: false });

  const total = (expenses ?? []).reduce((s, e) => s + Number(e.amount), 0);
  const byCategory = new Map<string, number>();
  for (const e of expenses ?? []) {
    byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + Number(e.amount));
  }

  return (
    <>
      <TopBar title="Expenses" backHref="/more" />
      <div className="space-y-4 p-4">
        <form action="/expenses" className="flex gap-2">
          <input name="month" type="month" defaultValue={m}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
          <button className="rounded-lg bg-gray-800 px-4 py-2.5 text-sm font-semibold text-white">View</button>
        </form>

        <ExpenseForm />

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-semibold text-gray-900">This month by category</p>
            <p className="font-bold">{formatPeso(total)}</p>
          </div>
          {byCategory.size === 0 && (
            <p className="text-sm text-gray-500">No expenses recorded this month.</p>
          )}
          <ul className="space-y-1 text-sm">
            {[...byCategory.entries()].sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
              <li key={cat} className="flex justify-between">
                <span className="text-gray-600">{cat}</span>
                <span className="font-semibold">{formatPeso(amt)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-1 font-semibold text-gray-900">Entries</p>
          <ul className="divide-y divide-gray-100">
            {(expenses ?? []).map((e) => (
              <ExpenseItem
                key={e.id}
                expense={{ ...e, amount: Number(e.amount) }}
              />
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
