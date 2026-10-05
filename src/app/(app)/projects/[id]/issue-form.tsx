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

export type StockUnit = {
  id: string;
  serial_no: string;
  product_id: string | null;
  model: string | null;
};

export function IssueForm({
  projectId,
  products,
  stockUnits = [],
}: {
  projectId: string;
  products: IssueProduct[];
  // Registered, not-yet-issued units — serials were typed once at delivery
  // and are only PICKED here, never re-typed.
  stockUnits?: StockUnit[];
}) {
  const [show, setShow] = useState(false);
  const [productId, setProductId] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [showTypeBox, setShowTypeBox] = useState(false);
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

  const product = products.find((p) => p.id === productId);
  const availableUnits = product
    ? stockUnits.filter(
        (u) =>
          u.product_id === product.id ||
          (!u.product_id && (u.model ?? "").includes(`(${product.sku})`)),
      )
    : [];

  const togglePicked = (id: string) =>
    setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  return (
    <form action={formAction} className="space-y-2 rounded-xl border border-blue-200 bg-white p-3">
      <p className="text-sm font-semibold text-gray-800">Issue materials to this project</p>
      <input type="hidden" name="project_id" value={projectId} />
      <input type="hidden" name="unit_ids" value={JSON.stringify(picked)} />
      <select
        name="product_id"
        required
        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
        value={productId}
        onChange={(e) => {
          setProductId(e.target.value);
          setPicked([]);
        }}
      >
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

      {availableUnits.length > 0 && (
        <div className="rounded-lg border border-gray-200 p-2">
          <p className="mb-1 text-xs font-semibold text-gray-600">
            Tap the serial numbers being taken ({picked.length} selected)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {availableUnits.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => togglePicked(u.id)}
                className={`rounded-full px-2.5 py-1.5 font-mono text-xs font-semibold ${
                  picked.includes(u.id)
                    ? "bg-brand-green text-white"
                    : "border border-gray-300 text-gray-700"
                }`}
              >
                {u.serial_no}
              </button>
            ))}
          </div>
        </div>
      )}

      {!showTypeBox ? (
        <button
          type="button"
          onClick={() => setShowTypeBox(true)}
          className="text-xs text-gray-500 underline"
        >
          Serial not in the list? Type it instead
        </button>
      ) : (
        <textarea
          name="serials"
          rows={2}
          placeholder="Unregistered serial numbers — one per line (will be registered to this project)"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
        />
      )}

      <p className="text-xs text-gray-500">
        Stock goes down and the cost is added to this project automatically.
        Picked serials are assigned to this project in the Equipment Registry.
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
