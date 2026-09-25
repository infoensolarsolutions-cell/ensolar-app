import type { Metadata } from "next";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatPeso, todayManila } from "@/lib/format";
import { PAYABLE_CATEGORIES, type PayableCategory } from "./categories";
import {
  AddPayableForm,
  PayableCard,
  type PayableRow,
} from "./payables-client";

export const metadata: Metadata = { title: "Payables" };

export default async function PayablesPage() {
  await requireRole("owner");
  const supabase = await createClient();
  const today = todayManila();

  const { data } = await supabase
    .from("payables")
    .select(
      "id, category, creditor, description, original_amount, incurred_date, due_date, monthly_amount, interest_note, settled_at, payable_payments (id, amount, paid_at, note)",
    )
    .order("created_at", { ascending: false })
    .limit(500);

  const rows: PayableRow[] = (data ?? []).map((p) => ({
    id: p.id,
    category: p.category as PayableCategory,
    creditor: p.creditor,
    description: p.description,
    original_amount: Number(p.original_amount),
    incurred_date: p.incurred_date,
    due_date: p.due_date,
    monthly_amount: p.monthly_amount === null ? null : Number(p.monthly_amount),
    interest_note: p.interest_note,
    settled_at: p.settled_at,
    payments: ((p.payable_payments ?? []) as PayableRow["payments"])
      .map((x) => ({ ...x, amount: Number(x.amount) }))
      .sort((a, b) => (a.paid_at < b.paid_at ? 1 : -1)),
  }));

  const open = rows.filter((r) => !r.settled_at);
  const balanceOf = (r: PayableRow) =>
    Math.max(0, r.original_amount - r.payments.reduce((s, x) => s + x.amount, 0));
  // The amount actually due next: the monthly installment if there is one,
  // otherwise the whole remaining balance.
  const nextDueAmount = (r: PayableRow) =>
    Math.min(r.monthly_amount ?? balanceOf(r), balanceOf(r));

  const totalOutstanding = open.reduce((s, r) => s + balanceOf(r), 0);
  const in30 = addDays(today, 30);
  const overdueAmt = open
    .filter((r) => r.due_date && r.due_date < today)
    .reduce((s, r) => s + nextDueAmount(r), 0);
  const dueSoonAmt = open
    .filter((r) => r.due_date && r.due_date >= today && r.due_date <= in30)
    .reduce((s, r) => s + nextDueAmount(r), 0);

  // Open payables first (soonest due on top), settled history at the bottom.
  const categories = Object.keys(PAYABLE_CATEGORIES) as PayableCategory[];
  const byCategory = categories
    .map((cat) => ({
      cat,
      items: rows
        .filter((r) => r.category === cat)
        .sort((a, b) => {
          if (!!a.settled_at !== !!b.settled_at) return a.settled_at ? 1 : -1;
          return (a.due_date ?? "9999") < (b.due_date ?? "9999") ? -1 : 1;
        }),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <>
      <TopBar title="Payables" backHref="/more" />
      <div className="space-y-4 p-4">
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-gray-200 bg-white p-3">
            <p className="text-xs text-gray-500">Total owed</p>
            <p className="text-base font-extrabold text-gray-900">
              {formatPeso(totalOutstanding)}
            </p>
          </div>
          <div className={`rounded-xl border p-3 ${dueSoonAmt > 0 ? "border-amber-200 bg-amber-50" : "border-gray-200 bg-white"}`}>
            <p className="text-xs text-gray-500">Due ≤ 30 days</p>
            <p className={`text-base font-extrabold ${dueSoonAmt > 0 ? "text-amber-800" : "text-gray-900"}`}>
              {formatPeso(dueSoonAmt)}
            </p>
          </div>
          <div className={`rounded-xl border p-3 ${overdueAmt > 0 ? "border-red-200 bg-red-50" : "border-gray-200 bg-white"}`}>
            <p className="text-xs text-gray-500">Overdue</p>
            <p className={`text-base font-extrabold ${overdueAmt > 0 ? "text-red-700" : "text-gray-900"}`}>
              {formatPeso(overdueAmt)}
            </p>
          </div>
        </div>

        <AddPayableForm />

        {rows.length === 0 && (
          <p className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500">
            Nothing recorded yet. Add company loans, supplier credit
            (deliveries not yet paid), government remittances due, rent, and
            the owner&apos;s business obligations — then record payments
            against each one as you pay.
          </p>
        )}

        {byCategory.map(({ cat, items }) => (
          <div key={cat} className="space-y-2">
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-semibold text-gray-700">
                {PAYABLE_CATEGORIES[cat]}
              </p>
              <p className="text-xs font-semibold text-gray-500">
                {formatPeso(
                  items.filter((r) => !r.settled_at).reduce((s, r) => s + balanceOf(r), 0),
                )}
              </p>
            </div>
            {items.map((r) => (
              <PayableCard key={r.id} payable={r} today={today} />
            ))}
          </div>
        ))}

        <p className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5 text-xs text-blue-900">
          <span className="font-semibold">Good to know:</span> this tracker
          plans your cash — payments recorded here do{" "}
          <span className="font-semibold">not</span> appear in Expenses or the
          P&amp;L (paying off a loan&apos;s principal isn&apos;t an expense).
          Loan <span className="font-semibold">interest</span> and other true
          operating costs should still be recorded in Expenses as you pay
          them. Payables due and overdue also show as a warning signal on your
          Business KPI board.
        </p>
      </div>
    </>
  );
}

function addDays(iso: string, days: number): string {
  const t = new Date(`${iso}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + days);
  return t.toISOString().slice(0, 10);
}
