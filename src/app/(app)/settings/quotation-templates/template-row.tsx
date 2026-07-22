"use client";

import { useState, useTransition } from "react";
import {
  renameQuotationTemplate,
  deleteQuotationTemplate,
} from "@/app/(app)/quotations/actions";

export function TemplateRowActions({
  templateId,
  currentName,
}: {
  templateId: string;
  currentName: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<{ error?: string }>) => {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res?.error) setError(res.error);
    });
  };

  return (
    <div className="shrink-0 text-right">
      <div className="flex items-center gap-2">
        <button
          disabled={pending}
          onClick={() => {
            const name = prompt("New template name:", currentName);
            if (!name?.trim() || name.trim() === currentName) return;
            run(() => renameQuotationTemplate(templateId, name.trim()));
          }}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 active:bg-gray-50 disabled:opacity-60"
        >
          Rename
        </button>
        <button
          disabled={pending}
          onClick={() => {
            if (!confirm(`Delete template "${currentName}"? Existing quotations are not affected.`)) return;
            run(() => deleteQuotationTemplate(templateId));
          }}
          className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 active:bg-red-50 disabled:opacity-60"
        >
          Delete
        </button>
      </div>
      {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
