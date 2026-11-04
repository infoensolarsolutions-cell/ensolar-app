"use client";

import { useActionState } from "react";
import { startReservation } from "./actions";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-base text-gray-900 focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30";

export function CheckoutForm({
  offerId,
  campaignId,
  online,
}: {
  offerId: string;
  campaignId: string | null;
  online: boolean;
}) {
  const [state, formAction, pending] = useActionState(startReservation, null);

  if (state?.reserved) {
    return (
      <div className="rounded-2xl bg-white p-6 text-center text-gray-900">
        <p className="text-lg font-bold text-brand-green-dark">
          ✅ Reservation received!
        </p>
        <p className="mt-2 text-sm text-gray-600">
          Your reservation no. is <span className="font-bold">{state.orderNo}</span>.
          Our team will contact you within 1 working day to arrange payment
          (GCash, Maya, bank transfer) and schedule your free site inspection.
        </p>
        <p className="mt-2 text-xs text-gray-500">
          Urgent? Call (035) 531-6455 or 0953-561-2557.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-3 rounded-2xl bg-white p-5 text-gray-900">
      <input type="hidden" name="offer_id" value={offerId} />
      {campaignId && <input type="hidden" name="campaign_id" value={campaignId} />}
      {/* Honeypot — humans never see it */}
      <input name="website" className="hidden" tabIndex={-1} autoComplete="off" />

      <p className="text-sm font-bold text-gray-800">Your details</p>
      <input name="name" required placeholder="Full name *" className={inputClass} />
      <input name="phone" required placeholder="Mobile number *" inputMode="tel" className={inputClass} />
      <input name="email" type="email" placeholder="Email (for your receipt)" className={inputClass} />
      <input name="address" placeholder="Installation address / barangay" className={inputClass} />

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{state.error}</p>
      )}

      <button
        disabled={pending}
        className="w-full rounded-xl bg-brand-green px-4 py-3.5 text-base font-bold text-white active:bg-brand-green-dark disabled:opacity-60"
      >
        {pending
          ? "Preparing…"
          : online
            ? "Continue to secure payment →"
            : "Reserve now — pay later"}
      </button>
      <p className="text-center text-[11px] text-gray-500">
        {online
          ? "You'll choose GCash, Maya, QR Ph, online banking or card on the next secure page."
          : "Online payment is being activated — reserve now and our team will send payment instructions."}
      </p>
    </form>
  );
}
