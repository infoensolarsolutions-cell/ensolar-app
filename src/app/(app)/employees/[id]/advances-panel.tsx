"use client";

import { useActionState, useState, useTransition } from "react";
import { addCashAdvance, deleteCashAdvance } from "@/app/(app)/payroll/settings/actions";
import { formatDate, formatPeso } from "@/lib/format";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none";

export type AdvanceRow = {
  id: string;
  amount: number;
  repaid: number;
  date: string;
  note: string | null;
};

export function AdvancesPanel({
  employeeId,
  advances,
}: {
  employeeId: string;
  advances: AdvanceRow[];
}) {
  const [adding, setAdding] = useState(false);
  const [state, formAction, pending] = useActionState(addCashAdvance, null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const outstanding = advances.reduce((s, a) => s + (a.amount - a.repaid), 0);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-semibold text-gray-900">
          Cash advances
          {outstanding > 0 && (
            <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-700">
              {formatPeso(outstanding)} outstanding
            </span>
          )}
        </p>
        <button
          onClick={() => setAdding((v) => !v)}
          className="text-sm font-medium text-brand-green-dark underline"
        >
          {adding ? "Cancel" : "+ Advance"}
        </button>
      </div>

      {adding && (
        <form action={formAction} className="mb-3 space-y-2 rounded-lg border border-gray-200 p-3">
          <input type="hidden" name="employee_id" value={employeeId} />
          <div className="grid grid-cols-2 gap-2">
            <input name="amount" type="number" min="0.01" step="any" inputMode="decimal" placeholder="Amount ₱ *" required className={inputClass} />
            <input name="date" type="date" className={inputClass} />
          </div>
          <input name="note" placeholder="Note (optional)" className={inputClass} />
          {state?.error && <p className="text-xs font-medium text-red-600">{state.error}</p>}
          <button disabled={pending} className="w-full rounded-lg bg-brand-green px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
            {pending ? "Saving…" : "Record advance"}
          </button>
        </form>
      )}

      {!advances.length && <p className="text-sm text-gray-500">No cash advances.</p>}
      <ul className="divide-y divide-gray-100">
        {advances.map((a) => {
          const remaining = a.amount - a.repaid;
          return (
            <li key={a.id} className="flex items-center justify-between gap-2 py-2 text-sm">
              <div>
                <p className="font-medium text-gray-800">
                  {formatPeso(a.amount)}
                  {remaining <= 0.005 ? (
                    <span className="ml-1.5 rounded bg-green-50 px-1.5 py-0.5 text-[10px] font-bold text-green-700">repaid</span>
                  ) : a.repaid > 0 ? (
                    <span className="ml-1.5 text-xs text-gray-500">({formatPeso(remaining)} left)</span>
                  ) : null}
                </p>
                <p className="text-xs text-gray-500">
                  {formatDate(a.date)}
                  {a.note && ` · ${a.note}`}
                </p>
              </div>
              {a.repaid === 0 && (
                <button
                  onClick={() =>
                    startTransition(async () => {
                      const res = await deleteCashAdvance(a.id, employeeId);
                      if (res.error) setError(res.error);
                    })
                  }
                  className="text-xs text-gray-400 underline"
                >
                  remove
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
