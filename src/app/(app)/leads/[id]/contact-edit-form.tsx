"use client";

import { useActionState, useState } from "react";
import { updateLeadContact } from "../actions";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none";

export function ContactEditForm({
  leadId,
  customerId,
  contact,
}: {
  leadId: string;
  customerId: string;
  contact: {
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    barangay: string | null;
    referred_by: string | null;
  };
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(updateLeadContact, null);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-3 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 active:bg-gray-50"
      >
        ✏️ Edit contact details
      </button>
    );
  }

  return (
    <form action={formAction} className="mt-3 space-y-3 border-t border-gray-100 pt-3">
      <input type="hidden" name="lead_id" value={leadId} />
      <input type="hidden" name="customer_id" value={customerId} />
      <div>
        <label className="text-xs text-gray-500">Name *</label>
        <input name="name" required defaultValue={contact.name} className={inputClass} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500">Phone</label>
          <input name="phone" type="tel" defaultValue={contact.phone ?? ""} className={inputClass} />
        </div>
        <div>
          <label className="text-xs text-gray-500">Email</label>
          <input name="email" type="email" defaultValue={contact.email ?? ""} className={inputClass} />
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-500">Address</label>
        <input name="address" defaultValue={contact.address ?? ""} className={inputClass} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500">Barangay / City</label>
          <input name="barangay" defaultValue={contact.barangay ?? ""} className={inputClass} />
        </div>
        <div>
          <label className="text-xs text-gray-500">Referred by</label>
          <input name="referred_by" defaultValue={contact.referred_by ?? ""} className={inputClass} />
        </div>
      </div>
      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{state.error}</p>
      )}
      {state?.saved && !state.error && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700">Saved.</p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 active:bg-gray-50"
        >
          Close
        </button>
        <button
          disabled={pending}
          className="flex-1 rounded-lg bg-brand-green px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
