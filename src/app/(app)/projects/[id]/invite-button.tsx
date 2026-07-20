"use client";

import { useState, useTransition } from "react";
import { inviteCustomerToPortal } from "../invite-actions";

export function InviteButton({
  customerId,
  projectId,
  hasEmail,
}: {
  customerId: string;
  projectId: string;
  hasEmail: boolean;
}) {
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  if (!hasEmail) {
    return (
      <p className="text-xs text-gray-400">
        Add an email to the customer record to invite them to the portal.
      </p>
    );
  }

  return (
    <div>
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await inviteCustomerToPortal(customerId, projectId);
            setMsg(
              res.error
                ? { text: res.error, ok: false }
                : { text: "Invite email sent! The customer sets their password from the email link.", ok: true },
            );
          })
        }
        className="rounded-lg border border-brand-green px-4 py-2 text-sm font-semibold text-brand-green-dark active:bg-brand-green/5 disabled:opacity-60"
      >
        {pending ? "Sending…" : "Invite customer to portal"}
      </button>
      {msg && (
        <p className={`mt-1.5 text-xs font-medium ${msg.ok ? "text-green-700" : "text-red-600"}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
