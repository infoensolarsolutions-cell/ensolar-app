"use client";

import { useState, useTransition } from "react";
import { inviteCustomerToPortal } from "../invite-actions";

export function InviteButton({
  customerId,
  projectId,
  hasEmail,
  slot = "primary",
}: {
  customerId: string;
  projectId: string;
  hasEmail: boolean;
  slot?: "primary" | "secondary";
}) {
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  if (!hasEmail) {
    return (
      <p className="text-xs text-gray-400">
        {slot === "primary"
          ? "Add an email to the customer record to invite them to the portal."
          : "Add a second email on the lead's contact details to invite another person."}
      </p>
    );
  }

  return (
    <div>
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await inviteCustomerToPortal(customerId, projectId, slot);
            setMsg(
              res.error
                ? { text: res.error, ok: false }
                : { text: "Invite email sent! They set their password from the email link.", ok: true },
            );
          })
        }
        className="rounded-lg border border-brand-green px-4 py-2 text-sm font-semibold text-brand-green-dark active:bg-brand-green/5 disabled:opacity-60"
      >
        {pending
          ? "Sending…"
          : slot === "primary"
            ? "Invite customer to portal"
            : "Invite 2nd contact to portal"}
      </button>
      {msg && (
        <p className={`mt-1.5 text-xs font-medium ${msg.ok ? "text-green-700" : "text-red-600"}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
