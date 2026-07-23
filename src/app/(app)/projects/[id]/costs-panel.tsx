"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { addCost, deleteCost, updateCost, returnInventoryCost } from "../cost-actions";
import { COST_TYPES, type CostType } from "@/lib/crm";
import { formatDate, formatPeso } from "@/lib/format";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none";

export type CostRow = {
  id: string;
  type: CostType;
  description: string | null;
  amount: number;
  date: string;
  from_inventory: boolean;
};

export function CostsPanel({
  projectId,
  costs,
  contractAmount,
  isOwner,
  isStaff,
}: {
  projectId: string;
  costs: CostRow[];
  contractAmount: number;
  isOwner: boolean;
  isStaff: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalCosts = costs.reduce((s, c) => s + c.amount, 0);
  const profit = contractAmount - totalCosts;
  const marginPct = contractAmount > 0 ? (profit / contractAmount) * 100 : 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="mb-2 font-semibold text-gray-900">Project costs</p>

      {costs.length === 0 && (
        <p className="text-sm text-gray-500">No costs recorded yet.</p>
      )}
      <ul className="divide-y divide-gray-100">
        {costs.map((c) => (
          <CostItem
            key={c.id}
            cost={c}
            projectId={projectId}
            isStaff={isStaff}
            onError={setError}
          />
        ))}
      </ul>

      {costs.length > 0 && (
        <div className="mt-2 flex justify-between border-t border-gray-100 pt-2 text-sm font-semibold">
          <span className="text-gray-600">Total costs</span>
          <span>{formatPeso(totalCosts)}</span>
        </div>
      )}

      {isOwner && (
        <div
          className={`mt-3 rounded-lg p-3 ${
            profit >= 0 ? "bg-green-50" : "bg-red-50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">Gross profit</span>
            <span
              className={`text-base font-extrabold ${
                profit >= 0 ? "text-green-800" : "text-red-700"
              }`}
            >
              {formatPeso(profit)}
              <span className="ml-1.5 text-xs font-bold">
                ({marginPct.toFixed(1)}%)
              </span>
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-gray-500">
            Contract {formatPeso(contractAmount)} − Costs {formatPeso(totalCosts)}
          </p>
        </div>
      )}

      {error && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>
      )}

      {isStaff && (
        <div className="mt-3">
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="w-full rounded-lg border border-brand-green px-4 py-2.5 text-sm font-semibold text-brand-green-dark active:bg-brand-green/5"
            >
              + Add cost
            </button>
          ) : (
            <CostForm projectId={projectId} onDone={() => setShowForm(false)} />
          )}
        </div>
      )}
    </div>
  );
}

function CostItem({
  cost: c,
  projectId,
  isStaff,
  onError,
}: {
  cost: CostRow;
  projectId: string;
  isStaff: boolean;
  onError: (m: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  if (editing) {
    return (
      <li className="py-2.5">
        <EditCostFields cost={c} projectId={projectId} onClose={() => setEditing(false)} />
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-2 py-2.5">
      <div>
        <p className="text-sm font-medium text-gray-800">
          {COST_TYPES[c.type]}
          {c.from_inventory && (
            <span className="ml-1.5 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
              from inventory
            </span>
          )}
        </p>
        <p className="text-xs text-gray-500">
          {formatDate(c.date)}
          {c.description && ` · ${c.description}`}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-sm font-semibold">{formatPeso(c.amount)}</span>
        {isStaff && !c.from_inventory && (
          <>
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-brand-green-dark underline"
            >
              edit
            </button>
            <button
              disabled={pending}
              onClick={() => {
                if (!confirm(`Remove this ${COST_TYPES[c.type]} cost of ${formatPeso(c.amount)}?`)) return;
                startTransition(async () => {
                  const res = await deleteCost(c.id, projectId);
                  if (res.error) onError(res.error);
                });
              }}
              className="text-xs text-gray-400 underline disabled:opacity-50"
            >
              {pending ? "…" : "remove"}
            </button>
          </>
        )}
        {isStaff && c.from_inventory && (
          <button
            disabled={pending}
            onClick={() => {
              if (
                !confirm(
                  "Return these materials to stock? The quantity goes back to inventory and this cost is removed from the project.",
                )
              )
                return;
              startTransition(async () => {
                const res = await returnInventoryCost(c.id, projectId);
                if (res.error) onError(res.error);
              });
            }}
            className="text-xs text-blue-700 underline disabled:opacity-50"
          >
            {pending ? "…" : "return to stock"}
          </button>
        )}
      </div>
    </li>
  );
}

function EditCostFields({
  cost,
  projectId,
  onClose,
}: {
  cost: CostRow;
  projectId: string;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(updateCost, null);

  useEffect(() => {
    if (state?.saved && !state.error) onClose();
  }, [state, onClose]);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="cost_id" value={cost.id} />
      <input type="hidden" name="project_id" value={projectId} />
      <div className="grid grid-cols-2 gap-2">
        <select name="type" defaultValue={cost.type} className={inputClass}>
          {Object.entries(COST_TYPES).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <input name="date" type="date" defaultValue={cost.date} className={inputClass} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input
          name="description"
          defaultValue={cost.description ?? ""}
          placeholder="Description"
          className={inputClass}
        />
        <input
          name="amount"
          type="number"
          min="0.01"
          step="any"
          inputMode="decimal"
          defaultValue={cost.amount}
          required
          className={inputClass}
        />
      </div>
      {state?.error && <p className="text-xs font-medium text-red-600">{state.error}</p>}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 active:bg-gray-50"
        >
          Cancel
        </button>
        <button
          disabled={pending}
          className="rounded-lg bg-brand-green px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}

function CostForm({ projectId, onDone }: { projectId: string; onDone: () => void }) {
  const [state, formAction, pending] = useActionState(addCost, null);

  return (
    <form
      action={async (fd) => {
        await formAction(fd);
      }}
      className="space-y-2 rounded-lg border border-gray-200 p-3"
    >
      <input type="hidden" name="project_id" value={projectId} />
      <select name="type" required defaultValue="materials" className={inputClass}>
        {Object.entries(COST_TYPES).map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
      <input name="description" placeholder="Description (optional)" className={inputClass} />
      <div className="grid grid-cols-2 gap-2">
        <input name="amount" type="number" min="0.01" step="any" inputMode="decimal" placeholder="Amount ₱" required className={inputClass} />
        <input name="date" type="date" className={inputClass} />
      </div>
      {state?.error && <p className="text-xs font-medium text-red-600">{state.error}</p>}
      <div className="flex gap-2">
        <button disabled={pending} className="flex-1 rounded-lg bg-brand-green px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {pending ? "Saving…" : "Save cost"}
        </button>
        <button type="button" onClick={onDone} className="rounded-lg px-3 py-2.5 text-sm text-gray-500">
          Cancel
        </button>
      </div>
    </form>
  );
}
