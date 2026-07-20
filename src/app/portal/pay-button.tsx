"use client";

import { useState, useTransition } from "react";
import { payMilestone } from "./pay-actions";

export function PayButton({ milestoneId }: { milestoneId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await payMilestone(milestoneId);
            if (res?.error) setError(res.error);
          })
        }
        className="rounded-lg bg-brand-green px-3 py-1.5 text-xs font-bold text-white active:bg-brand-green-dark disabled:opacity-60"
      >
        {pending ? "Opening…" : "Pay Now"}
      </button>
      {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
    </>
  );
}
