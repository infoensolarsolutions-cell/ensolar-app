"use client";

import { useActionState, useState } from "react";
import { stockIn, adjustStock } from "../actions";
import { serializedEquipmentType } from "@/lib/equipment";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none";

export function StockForms({
  productId,
  productName = "",
}: {
  productId: string;
  productName?: string;
}) {
  const [mode, setMode] = useState<"none" | "in" | "adjust">("none");
  const [inState, inAction, inPending] = useActionState(stockIn, null);
  const [adjState, adjAction, adjPending] = useActionState(adjustStock, null);
  // Inverters, batteries and panels are serialized: each delivered unit's
  // serial number and the supplier are required at stock-in.
  const serialized = serializedEquipmentType(productName) !== null;

  if (mode === "none") {
    return (
      <div className="flex gap-2">
        <button
          onClick={() => setMode("in")}
          className="flex-1 rounded-lg bg-brand-green px-4 py-2.5 text-sm font-semibold text-white"
        >
          + Stock in (delivery)
        </button>
        <button
          onClick={() => setMode("adjust")}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700"
        >
          Adjustment
        </button>
      </div>
    );
  }

  if (mode === "in") {
    return (
      <form action={inAction} className="space-y-2 rounded-lg border border-gray-200 p-3">
        <p className="text-sm font-semibold text-gray-800">Stock in — delivery/purchase</p>
        <input type="hidden" name="product_id" value={productId} />
        <div className="grid grid-cols-2 gap-2">
          <input name="qty" type="number" min="0.01" step="any" inputMode="decimal" placeholder="Quantity *" required className={inputClass} />
          <input name="unit_cost" type="number" min="0" step="any" inputMode="decimal" placeholder="Unit cost ₱" className={inputClass} />
        </div>
        <input
          name="supplier"
          placeholder={serialized ? "Supplier / distributor *" : "Supplier"}
          required={serialized}
          className={inputClass}
        />
        {serialized && (
          <input name="supplier_contact" placeholder="Supplier support contact (phone / email)" className={inputClass} />
        )}
        <div className="grid grid-cols-2 gap-2">
          <input name="reference_no" placeholder="DR / invoice no." className={inputClass} />
          <input name="date" type="date" className={inputClass} />
        </div>
        {serialized && (
          <>
            <textarea
              name="serials"
              rows={3}
              required
              placeholder="Serial numbers — one per line, one for EACH unit received *"
              className={inputClass}
            />
            <p className="text-xs text-blue-800">
              🔢 Serialized equipment: each unit is registered in the Equipment
              Registry with this supplier, so warranty support and
              project-issue tracing work automatically.
            </p>
          </>
        )}
        {inState?.error && <p className="text-xs font-medium text-red-600">{inState.error}</p>}
        <div className="flex gap-2">
          <button disabled={inPending} className="flex-1 rounded-lg bg-brand-green px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
            {inPending ? "Saving…" : "Record delivery"}
          </button>
          <button type="button" onClick={() => setMode("none")} className="rounded-lg px-3 py-2.5 text-sm text-gray-500">Cancel</button>
        </div>
      </form>
    );
  }

  return (
    <form action={adjAction} className="space-y-2 rounded-lg border border-gray-200 p-3">
      <p className="text-sm font-semibold text-gray-800">Stock adjustment</p>
      <input type="hidden" name="product_id" value={productId} />
      <div className="grid grid-cols-2 gap-2">
        <input name="qty" type="number" step="any" inputMode="decimal" placeholder="Quantity (+add / −remove) *" required className={inputClass} />
        <input name="date" type="date" className={inputClass} />
      </div>
      <input name="reason" placeholder="Reason (required — e.g. damaged, count correction)" required className={inputClass} />
      {adjState?.error && <p className="text-xs font-medium text-red-600">{adjState.error}</p>}
      <div className="flex gap-2">
        <button disabled={adjPending} className="flex-1 rounded-lg bg-gray-800 px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {adjPending ? "Saving…" : "Record adjustment"}
        </button>
        <button type="button" onClick={() => setMode("none")} className="rounded-lg px-3 py-2.5 text-sm text-gray-500">Cancel</button>
      </div>
    </form>
  );
}
