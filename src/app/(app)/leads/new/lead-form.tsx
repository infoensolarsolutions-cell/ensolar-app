"use client";

import { useActionState, useState } from "react";
import { createLead } from "./actions";
import { ChipRadio } from "@/components/chip-radio";
import { SERVICE_TYPES, LEAD_SOURCES, tomorrowManila } from "@/lib/crm";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30";

export function LeadForm() {
  const [state, formAction, pending] = useActionState(createLead, null);
  const [source, setSource] = useState<string>("");

  return (
    <form action={formAction} className="space-y-5 p-4">
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
          Customer name *
        </label>
        <input id="name" name="name" required autoFocus className={inputClass} />
      </div>

      <div>
        <label htmlFor="phone" className="mb-1 block text-sm font-medium text-gray-700">
          Contact number *
        </label>
        <input id="phone" name="phone" type="tel" required className={inputClass} />
      </div>

      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
          Email (optional)
        </label>
        <input id="email" name="email" type="email" className={inputClass} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="address" className="mb-1 block text-sm font-medium text-gray-700">
            Address
          </label>
          <input id="address" name="address" className={inputClass} />
        </div>
        <div>
          <label htmlFor="barangay" className="mb-1 block text-sm font-medium text-gray-700">
            Barangay
          </label>
          <input id="barangay" name="barangay" className={inputClass} />
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-gray-700">Service interested in *</p>
        <ChipRadio name="service_type" options={SERVICE_TYPES} required />
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-gray-700">How did they reach us? *</p>
        <ChipRadio name="source" options={LEAD_SOURCES} required onChange={setSource} />
      </div>

      {source === "referral" && (
        <div>
          <label htmlFor="referred_by" className="mb-1 block text-sm font-medium text-gray-700">
            Referred by *
          </label>
          <input id="referred_by" name="referred_by" className={inputClass} />
        </div>
      )}

      <div>
        <label htmlFor="next_followup_at" className="mb-1 block text-sm font-medium text-gray-700">
          Next follow-up
        </label>
        <input
          id="next_followup_at"
          name="next_followup_at"
          type="date"
          defaultValue={tomorrowManila()}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="notes" className="mb-1 block text-sm font-medium text-gray-700">
          Notes
        </label>
        <textarea id="notes" name="notes" rows={2} className={inputClass} />
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
        {pending ? "Saving…" : "Save lead"}
      </button>
    </form>
  );
}
