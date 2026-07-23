"use client";

import { useActionState } from "react";
import { saveProduct } from "./actions";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none";

const CATEGORIES = [
  "Panels", "Inverters", "Batteries", "Cables", "Breakers",
  "CCTV", "FDAS", "Pumps", "Safety Device", "Accessories",
];

export function ProductForm({
  product,
}: {
  product?: {
    id: string;
    sku: string;
    name: string;
    category: string | null;
    unit: string;
    cost_price: number;
    selling_price: number;
    reorder_level: number;
    active: boolean;
    available_in_pos: boolean;
  };
}) {
  const [state, formAction, pending] = useActionState(saveProduct, null);

  return (
    <form action={formAction} className="space-y-3 p-4">
      {product && <input type="hidden" name="product_id" value={product.id} />}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500">SKU *</label>
          <input name="sku" required defaultValue={product?.sku ?? ""} className={inputClass} />
        </div>
        <div>
          <label className="text-xs text-gray-500">Unit</label>
          <input name="unit" defaultValue={product?.unit ?? "pc"} className={inputClass} />
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-500">Product name *</label>
        <input name="name" required defaultValue={product?.name ?? ""} className={inputClass} />
      </div>

      <div>
        <label className="text-xs text-gray-500">Category</label>
        <input name="category" list="categories" defaultValue={product?.category ?? ""} className={inputClass} />
        <datalist id="categories">
          {CATEGORIES.map((c) => <option key={c} value={c} />)}
        </datalist>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-gray-500">Cost price ₱</label>
          <input name="cost_price" type="number" min="0" step="any" inputMode="decimal" defaultValue={product?.cost_price ?? ""} className={inputClass} />
        </div>
        <div>
          <label className="text-xs text-gray-500">Selling price ₱</label>
          <input name="selling_price" type="number" min="0" step="any" inputMode="decimal" defaultValue={product?.selling_price ?? ""} className={inputClass} />
        </div>
        <div>
          <label className="text-xs text-gray-500">Reorder level</label>
          <input
            name="reorder_level"
            type="number"
            min="0"
            step="any"
            inputMode="decimal"
            placeholder="Blank = no restocking"
            defaultValue={
              product ? (Number(product.reorder_level) > 0 ? product.reorder_level : "") : ""
            }
            className={inputClass}
          />
        </div>
      </div>

      {product && (
        <div>
          <label className="text-xs text-gray-500">Status</label>
          <select name="active" defaultValue={String(product.active)} className={inputClass}>
            <option value="true">Active</option>
            <option value="false">Inactive (hidden from quotes and POS)</option>
          </select>
        </div>
      )}

      <label className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2.5">
        <span>
          <span className="block text-sm font-medium text-gray-800">Sell in POS</span>
          <span className="block text-xs text-gray-500">
            Off = project material only; still tracked in inventory
          </span>
        </span>
        <input
          type="checkbox"
          name="available_in_pos"
          defaultChecked={product?.available_in_pos ?? true}
          className="h-5 w-5 accent-[--brand-green]"
        />
      </label>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{state.error}</p>
      )}

      <button
        disabled={pending}
        className="w-full rounded-lg bg-brand-green px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Saving…" : product ? "Save changes" : "Create product"}
      </button>
    </form>
  );
}
