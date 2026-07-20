"use client";

import { useActionState, useState } from "react";
import { issueToProject } from "../issue-actions";
import { formatPeso } from "@/lib/format";

export type IssueProduct = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  cost_price: number;
  on_hand: number;
};

export function IssueForm({
  projectId,
  products,
}: {
  projectId: string;
  products: IssueProduct[];
}) {
  const [show, setShow] = useState(false);
  const [state, formAction, pending] = useActionState(issueToProject, null);

  if (!products.length) return null;

  if (!show) {
    return (
      <button
        onClick={() => setShow(true)}
        className="w-full rounded-xl border border-blue-300 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800 active:bg-blue-100"
      >
        Issue materials from inventory
      </button>
    );
  }

  return (
    <form action={formAction} className="space-y-2 rounded-xl border border-blue-200 bg-white p-3">
      <p className="text-sm font-semibold text-gray-800">Issue materials to this project</p>
      <input type="hidden" name="project_id" value={projectId} />
      <select name="product_id" required className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" defaultValue="">
        <option value="" disabled>Choose a product…</option>
        {products.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} — {Number(p.on_hand)} {p.unit} in stock ({formatPeso(p.cost_price)} cost)
          </option>
        ))}
      </select>
      <input
        name="qty"
        type="number" min="0.01" step="any" inputMode="decimal"
        placeholder="Quantity"
        required
        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
      />
      <p className="text-xs text-gray-500">
        Stock goes down and the cost is added to this project automatically.
      </p>
      {state?.error && <p className="text-xs font-medium text-red-600">{state.error}</p>}
      <div className="flex gap-2">
        <button disabled={pending} className="flex-1 rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {pending ? "Issuing…" : "Issue stock"}
        </button>
        <button type="button" onClick={() => setShow(false)} className="rounded-lg px-3 py-2.5 text-sm text-gray-500">
          Cancel
        </button>
      </div>
    </form>
  );
}
