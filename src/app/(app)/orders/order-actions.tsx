"use client";

import { useState, useTransition } from "react";
import { setOrderStatus } from "./actions";

// Owner corrections: mark a reserved order paid once the money arrives by
// GCash/bank transfer outside the gateway, or cancel a dead reservation.
export function OrderActions({ orderId, status }: { orderId: string; status: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const act = (next: "paid" | "cancelled") => {
    if (next === "cancelled" && !confirm("Cancel this order?")) return;
    setError(null);
    startTransition(async () => {
      const res = await setOrderStatus(orderId, next);
      if (res.error) setError(res.error);
    });
  };

  return (
    <span className="flex items-center gap-3">
      {error && <span className="font-medium text-red-600">{error}</span>}
      {(status === "reserved" || status === "pending") && (
        <>
          <button
            disabled={pending}
            onClick={() => act("paid")}
            className="font-medium text-brand-green-dark underline disabled:opacity-50"
          >
            mark paid
          </button>
          <button
            disabled={pending}
            onClick={() => act("cancelled")}
            className="font-medium text-gray-500 underline disabled:opacity-50"
          >
            cancel
          </button>
        </>
      )}
    </span>
  );
}
