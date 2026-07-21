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
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(addExpense, null);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-brand-green px-4 py-2.5 text-sm font-semibold text-white active:bg-brand-green-dark"
      >
        + New Expense
      </button>
    );
  }

  return (
    <form action={formAction} className="w-full space-y-2 rounded-xl border border-gray-200 bg-white p-4 lg:max-w-md">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-gray-900">Add expense</p>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-gray-400 underline">
          close
        </button>
      </div>
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

function DeleteButton({ id, onError }: { id: string; onError: (m: string) => void }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await deleteExpense(id);
          if (res.error) onError(res.error);
        })
      }
      className="text-xs text-gray-400 underline"
    >
      remove
    </button>
  );
}

// Desktop table presentation; phones use ExpenseItem cards.
export function ExpenseTable({
  expenses,
}: {
  expenses: {
    id: string;
    category: string;
    description: string | null;
    amount: number;
    date: string;
    payroll_run_id: string | null;
  }[];
}) {
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      {error && (
        <p className="border-b border-red-100 bg-red-50 px-4 py-2 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-[11px] uppercase tracking-wider text-gray-400">
            <th className="px-4 py-3 font-semibold">Date</th>
            <th className="px-4 py-3 font-semibold">Category</th>
            <th className="px-4 py-3 font-semibold">Description</th>
            <th className="px-4 py-3 text-right font-semibold">Amount</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {expenses.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                No expenses recorded this month.
              </td>
            </tr>
          )}
          {expenses.map((e) => (
            <tr key={e.id} className="hover:bg-gray-50">
              <td className="px-4 py-2.5 text-gray-600">{formatDate(e.date)}</td>
              <td className="px-4 py-2.5 font-medium text-gray-800">
                {e.category}
                {e.payroll_run_id && (
                  <span className="ml-1.5 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                    from payroll
                  </span>
                )}
              </td>
              <td className="px-4 py-2.5 text-gray-500">{e.description || "—"}</td>
              <td className="px-4 py-2.5 text-right font-bold text-red-600">
                {formatPeso(e.amount)}
              </td>
              <td className="px-4 py-2.5 text-right">
                {!e.payroll_run_id && <DeleteButton id={e.id} onError={setError} />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
