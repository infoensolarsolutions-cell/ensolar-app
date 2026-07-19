"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { acceptQuotation, setQuotationStatus } from "../actions";

export function QuotationActions({
  quotationId,
  status,
  hasProject,
}: {
  quotationId: string;
  status: string;
  hasProject: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [confirmAccept, setConfirmAccept] = useState(false);
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<{ error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res.error) setError(res.error);
    });
  }

  const buttonClass =
    "w-full rounded-xl px-4 py-3.5 text-base font-semibold disabled:opacity-60";

  return (
    <div className="space-y-2">
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      {status === "draft" && (
        <>
          <Link
            href={`/quotations/${quotationId}/edit`}
            className={`${buttonClass} block border border-gray-300 bg-white text-center text-gray-800`}
          >
            Edit items
          </Link>
          <button
            disabled={pending}
            onClick={() => run(() => setQuotationStatus(quotationId, "sent"))}
            className={`${buttonClass} bg-blue-600 text-white active:bg-blue-700`}
          >
            Mark as Sent
          </button>
        </>
      )}

      {["draft", "sent"].includes(status) && !hasProject && (
        <>
          {!confirmAccept ? (
            <button
              disabled={pending}
              onClick={() => setConfirmAccept(true)}
              className={`${buttonClass} bg-brand-green text-white active:bg-brand-green-dark`}
            >
              Accepted → Create Project
            </button>
          ) : (
            <div className="rounded-xl border border-brand-green bg-brand-green/5 p-3">
              <p className="mb-2 text-sm font-medium text-gray-800">
                This marks the quotation Accepted, moves the lead to Won, and
                creates the project. Continue?
              </p>
              <div className="flex gap-2">
                <button
                  disabled={pending}
                  onClick={() => {
                    setConfirmAccept(false);
                    run(() => acceptQuotation(quotationId));
                  }}
                  className="flex-1 rounded-lg bg-brand-green px-3 py-2.5 text-sm font-semibold text-white"
                >
                  {pending ? "Working…" : "Yes, create project"}
                </button>
                <button
                  onClick={() => setConfirmAccept(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          <button
            disabled={pending}
            onClick={() => run(() => setQuotationStatus(quotationId, "rejected"))}
            className={`${buttonClass} border border-red-200 bg-white text-red-600 active:bg-red-50`}
          >
            Mark as Rejected
          </button>
        </>
      )}
    </div>
  );
}
