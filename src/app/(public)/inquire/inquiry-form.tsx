"use client";

import { useActionState, useState } from "react";
import { submitInquiry } from "./actions";
import { ChipRadio } from "@/components/chip-radio";
import { SERVICE_TYPES } from "@/lib/crm";

const PUBLIC_SOURCES = {
  facebook: "Facebook",
  internet_search: "Internet search",
  referral: "Referred by someone",
};

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30";

export function InquiryForm() {
  const [state, formAction, pending] = useActionState(submitInquiry, null);
  const [source, setSource] = useState<string>("");

  if (state?.done) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
        <p className="text-lg font-bold text-brand-green-dark">
          Thank you! We received your inquiry.
        </p>
        <p className="mt-2 text-sm text-gray-600">
          Our team will contact you within 1 working day. For urgent concerns,
          call (035) 531-6455 or 0961-885-6986.
        </p>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
    >
      {/* Honeypot — hidden from real visitors */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
          Your name *
        </label>
        <input id="name" name="name" required className={inputClass} />
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

      <div>
        <label htmlFor="barangay" className="mb-1 block text-sm font-medium text-gray-700">
          Barangay / City
        </label>
        <input id="barangay" name="barangay" className={inputClass} />
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-gray-700">
          Service you are interested in *
        </p>
        <ChipRadio name="service_type" options={SERVICE_TYPES} required />
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-gray-700">How did you find us?</p>
        <ChipRadio name="source" options={PUBLIC_SOURCES} onChange={setSource} />
      </div>

      {source === "referral" && (
        <div>
          <label htmlFor="referred_by" className="mb-1 block text-sm font-medium text-gray-700">
            Who referred you?
          </label>
          <input id="referred_by" name="referred_by" className={inputClass} />
        </div>
      )}

      <div>
        <label htmlFor="message" className="mb-1 block text-sm font-medium text-gray-700">
          Message (optional)
        </label>
        <textarea
          id="message"
          name="message"
          rows={3}
          placeholder="Tell us about your project…"
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
        {pending ? "Sending…" : "Send inquiry"}
      </button>
    </form>
  );
}
