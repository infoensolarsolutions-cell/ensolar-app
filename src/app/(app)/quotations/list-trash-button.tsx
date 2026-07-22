"use client";

import { useTransition } from "react";
import { trashQuotation } from "./actions";

export function ListTrashButton({
  quotationId,
  quoteNo,
}: {
  quotationId: string;
  quoteNo: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      disabled={pending}
      title="Move to Recycle Bin"
      aria-label={`Move ${quoteNo} to Recycle Bin`}
      onClick={() => {
        if (!confirm(`Move ${quoteNo} to the Recycle Bin?`)) return;
        startTransition(async () => {
          const res = await trashQuotation(quotationId);
          if (res?.error) alert(res.error);
        });
      }}
      className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
    >
      {pending ? "…" : "🗑"}
    </button>
  );
}
