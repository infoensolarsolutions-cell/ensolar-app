"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "@/app/(public)/login/actions";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, null);

  if (state?.done) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-5 text-center shadow-sm">
        <p className="font-semibold text-gray-900">Check your email</p>
        <p className="mt-1 text-sm text-gray-600">
          If an account exists for that address, a password reset link is on
          its way. The link is valid for one hour.
        </p>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
    >
      <div>
        <label
          htmlFor="email"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30"
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
        {pending ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
