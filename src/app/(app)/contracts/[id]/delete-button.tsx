"use client";

import { useState, useTransition } from "react";
import { deleteContract } from "../actions";

export function DeleteContractButton({
  contractId,
  contractNo,
}: {
  contractId: string;
  contractNo: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const noun = contractNo.startsWith("COC-") ? "certificate" : "contract";

  return (
    <div className="mt-6 border-t border-gray-100 pt-4">
      <button
        disabled={pending}
        onClick={() => {
          if (
            !confirm(
              `Delete ${noun} ${contractNo}?\n\nUse this to remove drafts and duplicates so only the final copy stays on the project. The deletion is noted on the project timeline. This cannot be undone.`,
            )
          )
            return;
          setError(null);
          startTransition(async () => {
            const res = await deleteContract(contractId);
            if (res?.error) setError(res.error);
          });
        }}
        className="w-full rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-600 active:bg-red-50 disabled:opacity-60"
      >
        {pending ? "Deleting…" : `🗑 Delete this ${noun}`}
      </button>
      {error && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>
      )}
    </div>
  );
}
