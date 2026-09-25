"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import {
  addPayable,
  addPayablePayment,
  deletePayable,
  deletePayablePayment,
  setPayableSettled,
  updatePayable,
} from "./actions";
import { PAYABLE_CATEGORIES, type PayableCategory } from "./categories";
import { formatDate, formatPeso } from "@/lib/format";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none";

export type PayablePaymentRow = {
  id: string;
  amount: number;
  paid_at: string;
  note: string | null;
};

export type PayableRow = {
  id: string;
  category: PayableCategory;
  creditor: string;
  description: string | null;
  original_amount: number;
  incurred_date: string;
  due_date: string | null;
  monthly_amount: number | null;
  interest_note: string | null;
  settled_at: string | null;
  payments: PayablePaymentRow[];
};

// ── Add form ─────────────────────────────────────────────────────────────

export function AddPayableForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(addPayable, null);

  useEffect(() => {
    if (state?.saved) setOpen(false);
  }, [state]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border-2 border-dashed border-gray-300 px-4 py-3 text-sm font-semibold text-gray-600 active:bg-gray-50"
      >
        + Add a payable (loan, supplier credit, obligation…)
      </button>
    );
  }
  return (
    <form action={formAction} className="space-y-2 rounded-xl border border-gray-200 bg-white p-3">
      <p className="text-sm font-semibold text-gray-700">New payable</p>
      <PayableFields />
      {state?.error && <p className="text-xs font-medium text-red-600">{state.error}</p>}
      <div className="flex gap-2">
        <button disabled={pending} className="flex-1 rounded-lg bg-brand-green px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {pending ? "Saving…" : "Save payable"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm text-gray-500">
          Cancel
        </button>
      </div>
    </form>
  );
}

function PayableFields({ payable }: { payable?: PayableRow }) {
  return (
    <>
      <select name="category" defaultValue={payable?.category ?? "loan"} className={inputClass}>
        {Object.entries(PAYABLE_CATEGORIES).map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
      <input
        name="creditor"
        placeholder="Owed to (bank, supplier, agency, person…)"
        defaultValue={payable?.creditor ?? ""}
        required
        className={inputClass}
      />
      <input
        name="description"
        placeholder="What is it for? (optional)"
        defaultValue={payable?.description ?? ""}
        className={inputClass}
      />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500">Total amount owed (₱)</label>
          <input
            name="original_amount" type="number" min="0.01" step="any" inputMode="decimal"
            defaultValue={payable?.original_amount ?? ""} required className={inputClass}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">Date incurred</label>
          <input name="incurred_date" type="date" defaultValue={payable?.incurred_date ?? ""} className={inputClass} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500">Next payment due</label>
          <input name="due_date" type="date" defaultValue={payable?.due_date ?? ""} className={inputClass} />
        </div>
        <div>
          <label className="text-xs text-gray-500">Monthly payment (₱, optional)</label>
          <input
            name="monthly_amount" type="number" min="0.01" step="any" inputMode="decimal"
            defaultValue={payable?.monthly_amount ?? ""} className={inputClass}
          />
        </div>
      </div>
      <input
        name="interest_note"
        placeholder="Interest / terms note, e.g. 1.5%/mo, 24 months (optional)"
        defaultValue={payable?.interest_note ?? ""}
        className={inputClass}
      />
      <p className="text-[11px] text-gray-400">
        With a monthly payment set, the due date rolls forward one month
        automatically every time you record a payment.
      </p>
    </>
  );
}

// ── Card ─────────────────────────────────────────────────────────────────

export function PayableCard({ payable, today }: { payable: PayableRow; today: string }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const paid = payable.payments.reduce((s, p) => s + p.amount, 0);
  const balance = Math.max(0, payable.original_amount - paid);
  const paidPct = payable.original_amount > 0 ? Math.min(100, (paid / payable.original_amount) * 100) : 0;
  const settled = !!payable.settled_at;

  const overdue = !settled && payable.due_date !== null && payable.due_date < today;
  const dueSoon =
    !settled && !overdue && payable.due_date !== null && payable.due_date <= addDaysIso(today, 7);

  if (editing) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-3">
        <EditPayableForm payable={payable} onClose={() => setEditing(false)} />
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border bg-white p-3 ${
        settled ? "border-gray-200 opacity-70" : overdue ? "border-red-300" : dueSoon ? "border-amber-300" : "border-gray-200"
      }`}
    >
      <button type="button" onClick={() => setExpanded((e) => !e)} className="block w-full text-left">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-bold text-gray-900">{payable.creditor}</p>
            {payable.description && (
              <p className="text-xs text-gray-600">{payable.description}</p>
            )}
            <p className="mt-0.5 text-[11px] text-gray-400">
              since {formatDate(payable.incurred_date)}
              {payable.interest_note && ` · ${payable.interest_note}`}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className={`text-base font-extrabold ${settled ? "text-gray-500" : "text-gray-900"}`}>
              {formatPeso(balance)}
            </p>
            {settled ? (
              <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-bold text-green-800">
                ✓ Settled
              </span>
            ) : overdue ? (
              <span className="inline-block rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700">
                Overdue {formatDate(payable.due_date!)}
              </span>
            ) : payable.due_date ? (
              <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${dueSoon ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-600"}`}>
                Due {formatDate(payable.due_date)}
              </span>
            ) : null}
          </div>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
          <div className="h-full rounded-full bg-brand-green" style={{ width: `${paidPct}%` }} />
        </div>
        <p className="mt-1 text-[11px] text-gray-500">
          Paid {formatPeso(paid)} of {formatPeso(payable.original_amount)}
          {payable.monthly_amount !== null && !settled && (
            <> · {formatPeso(payable.monthly_amount)}/month</>
          )}
          <span className="float-right text-gray-400">{expanded ? "▲ close" : "▼ details"}</span>
        </p>
      </button>

      {expanded && (
        <div className="mt-3 border-t border-gray-100 pt-2">
          {payable.payments.length > 0 && (
            <ul className="divide-y divide-gray-50">
              {payable.payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                  <span className="text-gray-600">
                    {formatDate(p.paid_at)}
                    {p.note && <span className="text-xs text-gray-400"> · {p.note}</span>}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="font-semibold">{formatPeso(p.amount)}</span>
                    <button
                      disabled={pending}
                      onClick={() => {
                        if (!confirm(`Remove this payment of ${formatPeso(p.amount)}?`)) return;
                        setError(null);
                        startTransition(async () => {
                          const res = await deletePayablePayment(p.id, payable.id);
                          if (res.error) setError(res.error);
                        });
                      }}
                      className="text-xs text-gray-400 underline disabled:opacity-50"
                    >
                      remove
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}

          {!settled && <RecordPaymentForm payable={payable} balance={balance} />}

          {error && (
            <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{error}</p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-2 text-xs">
            <button onClick={() => setEditing(true)} className="font-medium text-brand-green-dark underline">
              edit
            </button>
            <button
              disabled={pending}
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  const res = await setPayableSettled(payable.id, !settled);
                  if (res.error) setError(res.error);
                });
              }}
              className="font-medium text-gray-600 underline disabled:opacity-50"
            >
              {settled ? "re-open" : "mark settled"}
            </button>
            <button
              disabled={pending}
              onClick={() => {
                if (
                  !confirm(
                    `Delete "${payable.creditor}" and its payment history?\n\nOnly do this for entries made by mistake — settled payables are worth keeping as records.`,
                  )
                )
                  return;
                setError(null);
                startTransition(async () => {
                  const res = await deletePayable(payable.id);
                  if (res.error) setError(res.error);
                });
              }}
              className="font-medium text-red-500 underline disabled:opacity-50"
            >
              delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function RecordPaymentForm({ payable, balance }: { payable: PayableRow; balance: number }) {
  const [state, formAction, pending] = useActionState(addPayablePayment, null);
  return (
    <form action={formAction} className="mt-2 space-y-2 rounded-lg border border-gray-200 p-2.5">
      <input type="hidden" name="payable_id" value={payable.id} />
      <div className="grid grid-cols-2 gap-2">
        <input
          name="amount" type="number" min="0.01" step="any" inputMode="decimal"
          placeholder={`Amount ₱ (balance ${formatPeso(balance)})`}
          defaultValue={payable.monthly_amount ?? ""}
          required className={inputClass}
        />
        <input name="paid_at" type="date" className={inputClass} />
      </div>
      <input name="note" placeholder="Note, e.g. OR / reference no. (optional)" className={inputClass} />
      {state?.error && <p className="text-xs font-medium text-red-600">{state.error}</p>}
      <button disabled={pending} className="w-full rounded-lg bg-brand-green px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">
        {pending ? "Saving…" : "✓ Record payment"}
      </button>
    </form>
  );
}

function EditPayableForm({ payable, onClose }: { payable: PayableRow; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(updatePayable, null);

  useEffect(() => {
    if (state?.saved && !state.error) onClose();
  }, [state, onClose]);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="payable_id" value={payable.id} />
      <PayableFields payable={payable} />
      {state?.error && <p className="text-xs font-medium text-red-600">{state.error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 active:bg-gray-50">
          Cancel
        </button>
        <button disabled={pending} className="rounded-lg bg-brand-green px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}

function addDaysIso(iso: string, days: number): string {
  const t = new Date(`${iso}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + days);
  return t.toISOString().slice(0, 10);
}
