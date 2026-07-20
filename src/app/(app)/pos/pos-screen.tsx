"use client";

import { useActionState, useMemo, useState } from "react";
import { completeSale } from "./actions";
import { formatPeso } from "@/lib/format";

export type PosProduct = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  selling_price: number;
  on_hand: number;
};

const METHODS = { cash: "Cash", gcash: "GCash", maya: "Maya", card: "Card", bank_transfer: "Bank" };

export function PosScreen({ products }: { products: PosProduct[] }) {
  const [state, formAction, pending] = useActionState(completeSale, null);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<Map<string, number>>(new Map());
  const [discount, setDiscount] = useState("");
  const [method, setMethod] = useState("cash");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return products.slice(0, 30);
    return products
      .filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
      .slice(0, 30);
  }, [search, products]);

  const cartLines = [...cart.entries()]
    .map(([id, qty]) => {
      const p = products.find((x) => x.id === id);
      return p ? { p, qty } : null;
    })
    .filter(Boolean) as { p: PosProduct; qty: number }[];

  const subtotal = cartLines.reduce((s, l) => s + l.qty * l.p.selling_price, 0);
  const total = Math.max(0, subtotal - (Number(discount) || 0));

  function add(p: PosProduct) {
    setCart((cur) => {
      const next = new Map(cur);
      const qty = (next.get(p.id) ?? 0) + 1;
      if (qty <= p.on_hand) next.set(p.id, qty);
      return next;
    });
  }

  function setQty(id: string, qty: number, max: number) {
    setCart((cur) => {
      const next = new Map(cur);
      if (qty <= 0) next.delete(id);
      else next.set(id, Math.min(qty, max));
      return next;
    });
  }

  return (
    <div className="space-y-4 p-4">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="🔍 Search product or SKU…"
        className="w-full rounded-xl border border-gray-300 px-4 py-3.5 text-base focus:border-brand-green focus:outline-none"
      />

      <div className="grid grid-cols-2 gap-2">
        {filtered.map((p) => (
          <button
            key={p.id}
            onClick={() => add(p)}
            disabled={p.on_hand <= (cart.get(p.id) ?? 0)}
            className="rounded-xl border border-gray-200 bg-white p-3 text-left active:bg-brand-green/5 disabled:opacity-40"
          >
            <p className="line-clamp-2 text-sm font-semibold text-gray-900">{p.name}</p>
            <p className="mt-1 text-xs text-gray-500">
              {Number(p.on_hand)} {p.unit} left
            </p>
            <p className="text-sm font-bold text-brand-green-dark">
              {formatPeso(p.selling_price)}
            </p>
          </button>
        ))}
        {!filtered.length && (
          <p className="col-span-2 py-6 text-center text-sm text-gray-500">
            No matching products with stock.
          </p>
        )}
      </div>

      {cartLines.length > 0 && (
        <form
          action={formAction}
          className="sticky bottom-20 space-y-3 rounded-2xl border-2 border-brand-green bg-white p-4 shadow-lg"
        >
          <input
            type="hidden"
            name="items"
            value={JSON.stringify(cartLines.map((l) => ({ product_id: l.p.id, qty: l.qty })))}
          />
          <p className="font-bold text-gray-900">Cart</p>
          <ul className="divide-y divide-gray-100">
            {cartLines.map(({ p, qty }) => (
              <li key={p.id} className="flex items-center justify-between gap-2 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-800">{p.name}</p>
                  <p className="text-xs text-gray-500">{formatPeso(p.selling_price)} each</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button type="button" onClick={() => setQty(p.id, qty - 1, p.on_hand)}
                    className="h-9 w-9 rounded-lg border border-gray-300 text-lg font-bold text-gray-700">−</button>
                  <span className="w-8 text-center text-sm font-bold">{qty}</span>
                  <button type="button" onClick={() => setQty(p.id, qty + 1, p.on_hand)}
                    className="h-9 w-9 rounded-lg border border-gray-300 text-lg font-bold text-gray-700">+</button>
                </div>
                <span className="w-20 shrink-0 text-right text-sm font-semibold">
                  {formatPeso(qty * p.selling_price)}
                </span>
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-semibold">{formatPeso(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="discount" className="text-sm text-gray-600">Discount ₱</label>
            <input
              id="discount" name="discount" type="number" min="0" step="any" inputMode="decimal"
              value={discount} onChange={(e) => setDiscount(e.target.value)}
              className="w-28 rounded-lg border border-gray-300 px-3 py-2 text-right text-sm"
            />
          </div>
          <div className="flex items-center justify-between border-t border-gray-100 pt-2">
            <span className="font-bold">TOTAL</span>
            <span className="text-xl font-extrabold text-brand-green-dark">{formatPeso(total)}</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {Object.entries(METHODS).map(([v, l]) => (
              <label key={v} className="cursor-pointer">
                <input
                  type="radio" name="method" value={v}
                  checked={method === v} onChange={() => setMethod(v)}
                  className="peer sr-only"
                />
                <span className="inline-block rounded-full border border-gray-300 px-4 py-2 text-sm font-medium peer-checked:border-brand-green peer-checked:bg-brand-green peer-checked:text-white">
                  {l}
                </span>
              </label>
            ))}
          </div>
          {method !== "cash" && (
            <input
              name="provider_ref"
              placeholder="Reference no."
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
            />
          )}

          {state?.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{state.error}</p>
          )}

          <div className="flex gap-2">
            <button
              disabled={pending}
              className="flex-1 rounded-xl bg-brand-green px-4 py-3.5 text-base font-bold text-white active:bg-brand-green-dark disabled:opacity-60"
            >
              {pending ? "Saving…" : `Complete sale · ${formatPeso(total)}`}
            </button>
            <button
              type="button"
              onClick={() => setCart(new Map())}
              className="rounded-xl border border-gray-300 px-4 py-3.5 text-sm font-medium text-gray-600"
            >
              Clear
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
