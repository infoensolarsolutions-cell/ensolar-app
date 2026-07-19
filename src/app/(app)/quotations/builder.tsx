"use client";

import { useActionState, useMemo, useState } from "react";
import { saveQuotation } from "./actions";
import { formatPeso } from "@/lib/format";

export type ProductOption = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  selling_price: number;
};

type Row = {
  key: number;
  product_id: string | null;
  description: string;
  qty: string;
  unit_price: string;
};

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30";

const DEFAULT_TERMS =
  "Payment terms: 50% downpayment upon acceptance, 40% upon delivery of materials, 10% upon completion.\nPrices are valid until the date indicated above.";

function plus30(): string {
  const d = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(d);
}

let nextKey = 1;

export function QuotationBuilder({
  products,
  leadId,
  quotation,
}: {
  products: ProductOption[];
  leadId?: string;
  quotation?: {
    id: string;
    valid_until: string | null;
    terms: string | null;
    discount: number;
    items: { product_id: string | null; description: string; qty: number; unit_price: number }[];
  };
}) {
  const [state, formAction, pending] = useActionState(saveQuotation, null);
  const [rows, setRows] = useState<Row[]>(
    quotation?.items.length
      ? quotation.items.map((i) => ({
          key: nextKey++,
          product_id: i.product_id,
          description: i.description,
          qty: String(i.qty),
          unit_price: String(i.unit_price),
        }))
      : [{ key: nextKey++, product_id: null, description: "", qty: "1", unit_price: "" }],
  );
  const [discount, setDiscount] = useState<string>(
    quotation ? String(quotation.discount || "") : "",
  );

  const subtotal = useMemo(
    () =>
      rows.reduce(
        (sum, r) => sum + (Number(r.qty) || 0) * (Number(r.unit_price) || 0),
        0,
      ),
    [rows],
  );
  const total = Math.max(0, subtotal - (Number(discount) || 0));

  function update(key: number, patch: Partial<Row>) {
    setRows((cur) => cur.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function pickProduct(key: number, productId: string) {
    const p = products.find((x) => x.id === productId);
    if (!p) {
      update(key, { product_id: null });
      return;
    }
    update(key, {
      product_id: p.id,
      description: `${p.name} (${p.sku})`,
      unit_price: String(p.selling_price),
    });
  }

  const itemsJson = JSON.stringify(
    rows.map((r) => ({
      product_id: r.product_id,
      description: r.description,
      qty: Number(r.qty) || 0,
      unit_price: Number(r.unit_price) || 0,
    })),
  );

  return (
    <form action={formAction} className="space-y-4 p-4">
      {quotation && <input type="hidden" name="quotation_id" value={quotation.id} />}
      {leadId && <input type="hidden" name="lead_id" value={leadId} />}
      <input type="hidden" name="items" value={itemsJson} />

      <div className="space-y-3">
        {rows.map((row, idx) => (
          <div key={row.key} className="rounded-xl border border-gray-200 bg-white p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700">Item {idx + 1}</p>
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => setRows((cur) => cur.filter((r) => r.key !== row.key))}
                  className="text-sm font-medium text-red-600"
                >
                  Remove
                </button>
              )}
            </div>

            {products.length > 0 && (
              <select
                value={row.product_id ?? ""}
                onChange={(e) => pickProduct(row.key, e.target.value)}
                className={`${inputClass} mb-2`}
              >
                <option value="">Free-text item (or pick a product…)</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {formatPeso(p.selling_price)}
                  </option>
                ))}
              </select>
            )}

            <input
              placeholder="Description"
              value={row.description}
              onChange={(e) => update(row.key, { description: e.target.value })}
              className={`${inputClass} mb-2`}
            />
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-gray-500">Qty</label>
                <input
                  type="number" min="0" step="any" inputMode="decimal"
                  value={row.qty}
                  onChange={(e) => update(row.key, { qty: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Unit price</label>
                <input
                  type="number" min="0" step="any" inputMode="decimal"
                  value={row.unit_price}
                  onChange={(e) => update(row.key, { unit_price: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Line total</label>
                <p className="px-1 py-3 text-right font-semibold">
                  {formatPeso((Number(row.qty) || 0) * (Number(row.unit_price) || 0))}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() =>
          setRows((cur) => [
            ...cur,
            { key: nextKey++, product_id: null, description: "", qty: "1", unit_price: "" },
          ])
        }
        className="w-full rounded-xl border-2 border-dashed border-gray-300 px-4 py-3 text-sm font-semibold text-gray-600 active:bg-gray-50"
      >
        + Add line item
      </button>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Subtotal</span>
          <span className="font-semibold">{formatPeso(subtotal)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3">
          <label htmlFor="discount" className="text-sm text-gray-600">
            Discount (₱)
          </label>
          <input
            id="discount" name="discount" type="number" min="0" step="any" inputMode="decimal"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-right text-base"
          />
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
          <span className="font-bold text-gray-900">TOTAL</span>
          <span className="text-lg font-bold text-brand-green-dark">{formatPeso(total)}</span>
        </div>
      </div>

      <div>
        <label htmlFor="valid_until" className="mb-1 block text-sm font-medium text-gray-700">
          Valid until
        </label>
        <input
          id="valid_until" name="valid_until" type="date"
          defaultValue={quotation?.valid_until ?? plus30()}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="terms" className="mb-1 block text-sm font-medium text-gray-700">
          Payment terms
        </label>
        <textarea
          id="terms" name="terms" rows={3}
          defaultValue={quotation?.terms ?? DEFAULT_TERMS}
          className={inputClass}
        />
      </div>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-brand-green px-4 py-3.5 text-base font-semibold text-white active:bg-brand-green-dark disabled:opacity-60"
      >
        {pending ? "Saving…" : quotation ? "Save changes" : "Save quotation (draft)"}
      </button>
    </form>
  );
}
