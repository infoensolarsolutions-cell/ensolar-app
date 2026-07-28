"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { addExpense, deleteExpense, updateExpense } from "./actions";
import { formatDate, formatPeso } from "@/lib/format";

type Expense = {
  id: string;
  category: string;
  description: string | null;
  amount: number;
  date: string;
  payroll_run_id: string | null;
};

// Shared inline editor used by both the mobile list and the desktop table.
function EditExpenseFields({
  expense,
  onClose,
}: {
  expense: Expense;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(updateExpense, null);

  useEffect(() => {
    if (state?.saved && !state.error) onClose();
  }, [state, onClose]);

  return (
    <form action={formAction} className="w-full space-y-2 py-2">
      <input type="hidden" name="expense_id" value={expense.id} />
      <div className="grid grid-cols-2 gap-2">
        <input name="date" type="date" defaultValue={expense.date}
          className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-brand-green focus:outline-none" />
        <input name="category" defaultValue={expense.category} required placeholder="Category *"
          className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-brand-green focus:outline-none" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input name="description" defaultValue={expense.description ?? ""} placeholder="Description"
          className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-brand-green focus:outline-none" />
        <input name="amount" type="number" min="0.01" step="any" inputMode="decimal"
          defaultValue={expense.amount} required placeholder="Amount ₱ *"
          className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-brand-green focus:outline-none" />
      </div>
      {state?.error && <p className="text-xs font-medium text-red-600">{state.error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 active:bg-gray-50">
          Cancel
        </button>
        <button disabled={pending}
          className="rounded-lg bg-brand-green px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}

const CATEGORIES = [
  "Rent", "Utilities", "Salaries", "Marketing", "Fuel",
  "Office Supplies", "Tools & Equipment", "Internet/Phone",
  "Government Fees", "Other",
];

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none";

function todayManilaClient(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

export function ExpenseForm() {
  const [open, setOpen] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState(addExpense, null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // The page shows one month at a time. After a save, close the form and —
  // when the expense is dated in another month — jump the view to that month
  // so the new entry is always visible.
  useEffect(() => {
    if (!state?.saved) return;
    setOpen(false);
    const viewed = searchParams.get("month") ?? todayManilaClient().slice(0, 7);
    if (state.month && state.month !== viewed) {
      setSavedMsg(`Expense saved — showing ${state.month}, the month it is dated in.`);
      router.push(`/expenses?month=${state.month}`);
    } else {
      setSavedMsg("Expense saved.");
    }
  }, [state, router, searchParams]);

  if (!open) {
    return (
      <div className="flex items-center gap-3">
        {savedMsg && <p className="text-xs font-medium text-green-700">✓ {savedMsg}</p>}
        <button
          onClick={() => { setSavedMsg(null); setOpen(true); }}
          className="rounded-lg bg-brand-green px-4 py-2.5 text-sm font-semibold text-white active:bg-brand-green-dark"
        >
          + New Expense
        </button>
      </div>
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
        <input name="date" type="date" defaultValue={todayManilaClient()} className={inputClass} />
      </div>
      <p className="text-[11px] text-gray-400">
        The date decides which month the expense appears under.
      </p>
      {state?.error && <p className="text-xs font-medium text-red-600">{state.error}</p>}
      <button disabled={pending} className="w-full rounded-lg bg-brand-green px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
        {pending ? "Saving…" : "Save expense"}
      </button>
    </form>
  );
}

export function ExpenseItem({ expense }: { expense: Expense }) {
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  if (editing) {
    return (
      <li>
        <EditExpenseFields expense={expense} onClose={() => setEditing(false)} />
      </li>
    );
  }

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
          <>
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-brand-green-dark underline"
            >
              edit
            </button>
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
          </>
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

function ExpenseTableRow({
  expense,
  onError,
}: {
  expense: Expense;
  onError: (m: string) => void;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <tr>
        <td colSpan={5} className="px-4">
          <EditExpenseFields expense={expense} onClose={() => setEditing(false)} />
        </td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-2.5 text-gray-600">{formatDate(expense.date)}</td>
      <td className="px-4 py-2.5 font-medium text-gray-800">
        {expense.category}
        {expense.payroll_run_id && (
          <span className="ml-1.5 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
            from payroll
          </span>
        )}
      </td>
      <td className="px-4 py-2.5 text-gray-500">{expense.description || "—"}</td>
      <td className="px-4 py-2.5 text-right font-bold text-red-600">
        {formatPeso(expense.amount)}
      </td>
      <td className="px-4 py-2.5 text-right">
        {!expense.payroll_run_id && (
          <span className="flex items-center justify-end gap-2">
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-brand-green-dark underline"
            >
              edit
            </button>
            <DeleteButton id={expense.id} onError={onError} />
          </span>
        )}
      </td>
    </tr>
  );
}

// Desktop table presentation; phones use ExpenseItem cards.
export function ExpenseTable({ expenses }: { expenses: Expense[] }) {
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
            <ExpenseTableRow key={e.id} expense={e} onError={setError} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
