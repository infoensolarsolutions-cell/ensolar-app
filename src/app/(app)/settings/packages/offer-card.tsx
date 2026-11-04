"use client";

import { useActionState, useEffect, useState } from "react";
import { saveOffer } from "./actions";
import { formatPeso } from "@/lib/format";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none";

export type OfferRow = {
  id: string;
  name: string;
  kw: number | null;
  headline: string | null;
  details: string | null;
  price: number;
  reservation_fee: number;
  active: boolean;
  sort: number;
};

export function OfferCard({ offer }: { offer: OfferRow }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(saveOffer, null);

  useEffect(() => {
    if (state?.saved) setEditing(false);
  }, [state]);

  if (!editing) {
    return (
      <div className={`rounded-xl border bg-white p-4 ${offer.active ? "border-brand-green" : "border-gray-200 opacity-70"}`}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-bold text-gray-900">{offer.name}</p>
            {offer.headline && <p className="text-xs text-gray-500">{offer.headline}</p>}
            <p className="mt-1 text-xs text-gray-600">
              Price:{" "}
              <span className="font-bold">
                {Number(offer.price) > 0 ? formatPeso(Number(offer.price)) : "— not set —"}
              </span>{" "}
              · Reservation: <span className="font-bold">{formatPeso(Number(offer.reservation_fee))}</span>
            </p>
          </div>
          <div className="shrink-0 text-right">
            <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${offer.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"}`}>
              {offer.active ? "● Live on /packages" : "○ Hidden"}
            </span>
            <button onClick={() => setEditing(true)} className="mt-2 block w-full text-xs font-medium text-brand-green-dark underline">
              edit
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-2 rounded-xl border border-gray-300 bg-white p-4">
      <input type="hidden" name="id" value={offer.id} />
      <input name="name" defaultValue={offer.name} required placeholder="Package name" className={inputClass} />
      <input name="headline" defaultValue={offer.headline ?? ""} placeholder="Short selling line" className={inputClass} />
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-xs text-gray-500">kW</label>
          <input name="kw" type="number" step="any" defaultValue={offer.kw ?? ""} className={inputClass} />
        </div>
        <div>
          <label className="text-xs text-gray-500">Package price (₱)</label>
          <input name="price" type="number" step="any" min="0" defaultValue={offer.price} className={inputClass} />
        </div>
        <div>
          <label className="text-xs text-gray-500">Reservation fee (₱)</label>
          <input name="reservation_fee" type="number" step="any" min="1" defaultValue={offer.reservation_fee} className={inputClass} />
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-500">Inclusions (one per line)</label>
        <textarea name="details" rows={5} defaultValue={offer.details ?? ""} className={inputClass} />
      </div>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" name="active" defaultChecked={offer.active} className="h-4 w-4 accent-brand-green" />
          Active (visible on /packages)
        </label>
        <div className="ml-auto flex items-center gap-2">
          <label className="text-xs text-gray-500">Order</label>
          <input name="sort" type="number" defaultValue={offer.sort} className="w-16 rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
        </div>
      </div>
      {state?.error && <p className="text-xs font-medium text-red-600">{state.error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setEditing(false)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600">
          Cancel
        </button>
        <button disabled={pending} className="rounded-lg bg-brand-green px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
