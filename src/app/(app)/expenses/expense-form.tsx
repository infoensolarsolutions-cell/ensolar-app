"use client";

import { useActionState, useState, useTransition } from "react";
import { addExpense, deleteExpense } from "./actions";
import { formatDate, formatPeso } from "@/lib/format";

const CATEGORIES = [
  "Rent", "Utilities", "Salaries", "Marketing", "Fuel",
  "Office Supplies", "Tools & Equipment", "Internet/Phone",
  "Government Fees", "Other",
];

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none";

export function ExpenseForm() {
  const [state, formAction, pending] = useActionState(addExpense, null);
  return (
    <form action={formAction} className="space-y-2 rounded-xl border border-gray-200 bg-white p-4">
      <p className="font-semibold text-gray-900">Add expense</p>
      <input name="category" list="expense-categories" placeholder="Category *" required className={inputClass} />
      <datalist id="expense-categories">
        {CATEGORIES.map((c) => <option key={c} value={c} />)}
      </datalist>
      <input name="description" placeholder="Description (optional)" className={inputClass} />
      <div className="grid grid-cols-2 gap-2">
        <input name="amount" type="number" min="0.01" step="any" inputMode="decimal" placeholder="Amount ₱ *" required className={inputClass} />
        <input name="date" type="date" className={inputClass} />
      </div>
      {state?.error && <p className="text-xs font-medium text-red-600">{state.error}</p>}
      <button disabled={pending} className="w-full rounded-lg bg-brand-green px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
        {pending ? "Saving…" : "Save expense"}
      </button>
    </form>
  );
}

export function ExpenseItem({
  expense,
}: {
  expense: {
    id: string;
    category: string;
    description: string | null;
    amount: number;
    date: string;
    payroll_run_id: string | null;
  };
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <li className="flex items-center justify-between gap-2 py-2.5 text-sm">
      <div>
        <p className="font-medium text-gray-800">
          {expense.category}
          {expense.payroll_run_id && (
            <span className="ml-1.5 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
              from payroll
            </span>
          )}
        </p>
        <p className="text-xs text-gray-500">
          {formatDate(expense.date)}
          {expense.description && ` · ${expense.description}`}
        </p>
        {error && <p className="text-xs font-medium text-red-600">{error}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="font-bold">{formatPeso(expense.amount)}</span>
        {!expense.payroll_run_id && (
          <button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await deleteExpense(expense.id);
                if (res.error) setError(res.error);
              })
            }
            className="text-xs text-gray-400 underline"
          >
            remove
          </button>
        )}
      </div>
    </li>
  );
}
