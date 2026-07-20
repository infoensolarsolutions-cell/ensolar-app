"use client";

import { useActionState } from "react";
import { saveTemplate } from "@/app/(app)/contracts/actions";

export function TemplateEditor({ initialBody }: { initialBody: string }) {
  const [state, formAction, pending] = useActionState(saveTemplate, null);

  return (
    <form action={formAction} className="space-y-3">
      <textarea
        name="body"
        defaultValue={initialBody}
        rows={30}
        className="w-full rounded-xl border border-gray-300 p-3 font-mono text-[13px] leading-relaxed focus:border-brand-green focus:outline-none"
      />
      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{state.error}</p>
      )}
      {state?.saved && !state.error && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700">Saved.</p>
      )}
      <button
        disabled={pending}
        className="w-full rounded-xl bg-brand-green px-4 py-3.5 text-base font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save template"}
      </button>
    </form>
  );
}
