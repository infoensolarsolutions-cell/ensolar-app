"use client";

import { useState, useTransition } from "react";
import { finalizeRun, deleteRun, recomputeRun, reopenRun, setAdvanceDeduction } from "../actions";
import { formatPeso } from "@/lib/format";

export function SlipRow({
  slip,
  runId,
  draft,
}: {
  slip: {
    id: string;
    name: string;
    position: string | null;
    days_worked: number;
    gross: number;
    sss: number;
    philhealth: number;
    pagibig: number;
    tax: number;
    advance_deduction: number;
    net: number;
  };
  runId: string;
  draft: boolean;
}) {
  const [ca, setCa] = useState(String(slip.advance_deduction || ""));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-900">{slip.name}</p>
          <p className="text-xs text-gray-500">
            {slip.position && `${slip.position} · `}
            {slip.days_worked} day{slip.days_worked === 1 ? "" : "s"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-extrabold text-brand-green-dark">{formatPeso(slip.net)}</p>
          <a
            href={`/api/payslips/${slip.id}/pdf`}
            target="_blank"
            className="text-xs font-medium text-brand-green-dark underline"
          >
            Payslip PDF
          </a>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-x-3 gap-y-1 text-xs text-gray-600">
        <span>Gross: <b>{formatPeso(slip.gross)}</b></span>
        <span>SSS: {formatPeso(slip.sss)}</span>
        <span>PhilHealth: {formatPeso(slip.philhealth)}</span>
        <span>Pag-IBIG: {formatPeso(slip.pagibig)}</span>
        <span>Tax: {formatPeso(slip.tax)}</span>
        <span>CA: {formatPeso(slip.advance_deduction)}</span>
      </div>
      {draft && (
        <div className="mt-2 flex items-center gap-2">
          <label className="text-xs text-gray-500">Cash advance deduction ₱</label>
          <input
            type="number" min="0" step="any" inputMode="decimal"
            value={ca}
            onChange={(e) => setCa(e.target.value)}
            className="w-28 rounded-lg border border-gray-300 px-2.5 py-1.5 text-right text-sm"
          />
          <button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const res = await setAdvanceDeduction(slip.id, runId, Number(ca) || 0);
                if (res.error) setError(res.error);
              })
            }
            className="rounded-lg border border-brand-green px-3 py-1.5 text-xs font-semibold text-brand-green-dark disabled:opacity-60"
          >
            Apply
          </button>
        </div>
      )}
      {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}

export function RunControls({ runId, status }: { runId: string; status: string }) {
  const [confirm, setConfirm] = useState(false);
  const [confirmReopen, setConfirmReopen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (status !== "draft") {
    return (
      <div className="space-y-2">
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>
        )}
        {!confirmReopen ? (
          <button
            onClick={() => setConfirmReopen(true)}
            className="w-full rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800"
          >
            Reopen run (undo finalize)
          </button>
        ) : (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3">
            <p className="mb-2 text-sm text-gray-800">
              Reopening returns this run to draft and reverses the cash-advance
              repayments it recorded. You can then recompute, adjust, and
              finalize again — or delete the draft. Continue?
            </p>
            <div className="flex gap-2">
              <button
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    setError(null);
                    const res = await reopenRun(runId);
                    if (res.error) setError(res.error);
                    setConfirmReopen(false);
                  })
                }
                className="flex-1 rounded-lg bg-amber-600 px-3 py-2.5 text-sm font-bold text-white disabled:opacity-60"
              >
                {pending ? "Reopening…" : "Yes, reopen"}
              </button>
              <button onClick={() => setConfirmReopen(false)} className="rounded-lg px-3 py-2.5 text-sm text-gray-600">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>
      )}
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const res = await recomputeRun(runId);
            if (res?.error) setError(res.error);
          })
        }
        className="w-full rounded-xl border border-blue-300 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800 disabled:opacity-60"
      >
        {pending ? "Working…" : "↻ Recompute from latest attendance"}
      </button>
      <p className="-mt-1 text-center text-xs text-gray-400">
        Use after adding or correcting attendance. Cash-advance deductions reset.
      </p>
      {!confirm ? (
        <button
          onClick={() => setConfirm(true)}
          className="w-full rounded-xl bg-brand-green px-4 py-3.5 text-base font-bold text-white"
        >
          Finalize payroll run
        </button>
      ) : (
        <div className="rounded-xl border border-brand-green bg-brand-green/5 p-3">
          <p className="mb-2 text-sm text-gray-800">
            Finalizing locks all amounts and records the cash-advance
            repayments. Continue?
          </p>
          <div className="flex gap-2">
            <button
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  setError(null);
                  const res = await finalizeRun(runId);
                  if (res.error) setError(res.error);
                  setConfirm(false);
                })
              }
              className="flex-1 rounded-lg bg-brand-green px-3 py-2.5 text-sm font-bold text-white disabled:opacity-60"
            >
              {pending ? "Finalizing…" : "Yes, finalize"}
            </button>
            <button onClick={() => setConfirm(false)} className="rounded-lg px-3 py-2.5 text-sm text-gray-600">
              Cancel
            </button>
          </div>
        </div>
      )}
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await deleteRun(runId);
            if (res?.error) setError(res.error);
          })
        }
        className="w-full rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-600"
      >
        Delete draft
      </button>
    </div>
  );
}
