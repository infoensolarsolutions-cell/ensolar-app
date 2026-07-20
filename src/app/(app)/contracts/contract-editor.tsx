"use client";

import { useActionState } from "react";
import { createContract, updateContract } from "./actions";

export function ContractEditor({
  projectId,
  contractId,
  initialBody,
}: {
  projectId?: string;
  contractId?: string;
  initialBody: string;
}) {
  const [state, formAction, pending] = useActionState(
    contractId ? updateContract : createContract,
    null,
  );

  return (
    <form action={formAction} className="space-y-3 p-4">
      {projectId && <input type="hidden" name="project_id" value={projectId} />}
      {contractId && <input type="hidden" name="contract_id" value={contractId} />}

      <p className="text-xs text-gray-500">
        Review and edit freely — names, package details, amounts and payment
        scheme were filled in from the project. Nothing is final until you
        save.
      </p>

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
        {pending ? "Saving…" : contractId ? "Save changes" : "Save contract"}
      </button>
    </form>
  );
}
