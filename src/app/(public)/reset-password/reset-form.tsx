"use client";

import { useActionState } from "react";
import { updatePassword } from "@/app/(public)/login/actions";

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(updatePassword, null);

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
    >
      <div>
        <label
          htmlFor="password"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30"
        />
      </div>
      <div>
        <label
          htmlFor="confirm"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Repeat new password
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
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
        {pending ? "Saving…" : "Save password"}
      </button>
    </form>
  );
}
