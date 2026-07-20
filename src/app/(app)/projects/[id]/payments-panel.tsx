"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import {
  addMilestone,
  addStandardSchedule,
  deleteMilestone,
  recordPayment,
} from "../payment-actions";
import { formatDate, formatPeso } from "@/lib/format";

const METHODS = {
  cash: "Cash",
  gcash: "GCash",
  maya: "Maya",
  bank_transfer: "Bank transfer",
  check: "Check",
  card: "Card",
};

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none";

export type MilestoneRow = {
  id: string;
  label: string;
  amount: number;
  due_date: string | null;
  paid: number;
  overdue: boolean;
};

export type PaymentRow = {
  id: string;
  or_no: string;
  amount: number;
  method: keyof typeof METHODS | "online";
  received_at: string;
  milestone_label: string | null;
};

export function PaymentsPanel({
  projectId,
  milestones,
  payments,
  isStaff,
}: {
  projectId: string;
  milestones: MilestoneRow[];
  payments: PaymentRow[];
  isStaff: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="mb-2 font-semibold text-gray-900">Payment schedule</p>

      {milestones.length === 0 ? (
        <div className="space-y-2">
          <p className="text-sm text-gray-500">No payment schedule yet.</p>
          {isStaff && (
            <button
              disabled={pending}
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  const res = await addStandardSchedule(projectId);
                  if (res.error) setError(res.error);
                });
              }}
              className="w-full rounded-lg border border-brand-green px-4 py-2.5 text-sm font-semibold text-brand-green-dark active:bg-brand-green/5"
            >
              Use standard 50% / 40% / 10% schedule
            </button>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {milestones.map((m) => {
            const settled = m.paid >= m.amount - 0.005;
            return (
              <li key={m.id} className="flex items-center justify-between gap-2 py-2.5">
                <div>
                  <p className={`text-sm font-medium ${m.overdue ? "text-red-700" : "text-gray-800"}`}>
                    {m.label}
                  </p>
                  <p className="text-xs text-gray-500">
                    {m.due_date ? `Due ${formatDate(m.due_date)}` : "No due date"}
                    {m.paid > 0 && !settled && ` · ${formatPeso(m.paid)} paid`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-sm font-semibold">{formatPeso(m.amount)}</span>
                  {settled ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-800">Paid</span>
                  ) : m.overdue ? (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">Overdue</span>
                  ) : (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">Unpaid</span>
                  )}
                  {isStaff && m.paid === 0 && (
                    <button
                      onClick={() =>
                        startTransition(async () => {
                          const res = await deleteMilestone(m.id, projectId);
                          if (res.error) setError(res.error);
                        })
                      }
                      className="text-xs text-gray-400 underline"
                    >
                      remove
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {isStaff && (
        <div className="mt-3 space-y-3">
          {!showMilestoneForm ? (
            <button
              onClick={() => setShowMilestoneForm(true)}
              className="text-sm font-medium text-brand-green-dark underline"
            >
              + Add milestone
            </button>
          ) : (
            <MilestoneForm projectId={projectId} onDone={() => setShowMilestoneForm(false)} />
          )}
        </div>
      )}

      <p className="mb-2 mt-5 font-semibold text-gray-900">Payments received</p>
      {payments.length === 0 && <p className="text-sm text-gray-500">No payments recorded yet.</p>}
      <ul className="divide-y divide-gray-100">
        {payments.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-2 py-2.5">
            <div>
              <p className="text-sm font-medium text-gray-800">
                {p.or_no}
                <span className="ml-2 text-xs text-gray-500">{METHODS[p.method as keyof typeof METHODS] ?? p.method}</span>
              </p>
              <p className="text-xs text-gray-500">
                {formatDate(p.received_at)}
                {p.milestone_label && ` · ${p.milestone_label}`}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-sm font-bold text-brand-green-dark">{formatPeso(p.amount)}</span>
              <a
                href={`/api/payments/${p.id}/pdf`}
                target="_blank"
                className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-semibold text-gray-700"
              >
                Receipt
              </a>
            </div>
          </li>
        ))}
      </ul>

      {isStaff && (
        <div className="mt-3">
          {!showPaymentForm ? (
            <button
              onClick={() => setShowPaymentForm(true)}
              className="w-full rounded-lg bg-brand-green px-4 py-3 text-sm font-semibold text-white active:bg-brand-green-dark"
            >
              + Record payment
            </button>
          ) : (
            <PaymentForm
              projectId={projectId}
              milestones={milestones}
              onDone={() => setShowPaymentForm(false)}
            />
          )}
        </div>
      )}

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>
      )}
    </div>
  );
}

function MilestoneForm({ projectId, onDone }: { projectId: string; onDone: () => void }) {
  const [state, formAction, pending] = useActionState(addMilestone, null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (fd) => {
        await formAction(fd);
        onDone();
      }}
      className="space-y-2 rounded-lg border border-gray-200 p-3"
    >
      <input type="hidden" name="project_id" value={projectId} />
      <input name="label" placeholder="Milestone label (e.g. 50% Downpayment)" required className={inputClass} />
      <div className="grid grid-cols-2 gap-2">
        <input name="amount" type="number" min="0.01" step="any" inputMode="decimal" placeholder="Amount ₱" required className={inputClass} />
        <input name="due_date" type="date" className={inputClass} />
      </div>
      {state?.error && <p className="text-xs font-medium text-red-600">{state.error}</p>}
      <div className="flex gap-2">
        <button disabled={pending} className="flex-1 rounded-lg bg-brand-green px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {pending ? "Adding…" : "Add milestone"}
        </button>
        <button type="button" onClick={onDone} className="rounded-lg px-3 py-2.5 text-sm text-gray-500">
          Cancel
        </button>
      </div>
    </form>
  );
}

function PaymentForm({
  projectId,
  milestones,
  onDone,
}: {
  projectId: string;
  milestones: MilestoneRow[];
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState(recordPayment, null);
  const unpaid = milestones.filter((m) => m.paid < m.amount - 0.005);

  return (
    <form
      action={async (fd) => {
        await formAction(fd);
      }}
      className="space-y-2 rounded-lg border border-gray-200 p-3"
    >
      <input type="hidden" name="project_id" value={projectId} />
      {unpaid.length > 0 && (
        <select name="milestone_id" defaultValue={unpaid[0]?.id ?? ""} className={inputClass}>
          <option value="">Not linked to a milestone</option>
          {unpaid.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label} — {formatPeso(m.amount - m.paid)} remaining
            </option>
          ))}
        </select>
      )}
      <div className="grid grid-cols-2 gap-2">
        <input name="amount" type="number" min="0.01" step="any" inputMode="decimal" placeholder="Amount ₱" required className={inputClass} />
        <select name="method" required className={inputClass} defaultValue="cash">
          {Object.entries(METHODS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>
      <input name="provider_ref" placeholder="Reference no. (bank/GCash, optional)" className={inputClass} />
      <input name="notes" placeholder="Notes (optional)" className={inputClass} />
      <div>
        <label className="text-xs text-gray-500">Receipt / deposit slip photo (optional)</label>
        <input name="receipt_photo" type="file" accept="image/*" capture="environment" className="w-full text-sm" />
      </div>
      {state?.error && <p className="text-xs font-medium text-red-600">{state.error}</p>}
      <div className="flex gap-2">
        <button disabled={pending} className="flex-1 rounded-lg bg-brand-green px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {pending ? "Saving…" : "Save payment"}
        </button>
        <button type="button" onClick={onDone} className="rounded-lg px-3 py-2.5 text-sm text-gray-500">
          Cancel
        </button>
      </div>
    </form>
  );
}
