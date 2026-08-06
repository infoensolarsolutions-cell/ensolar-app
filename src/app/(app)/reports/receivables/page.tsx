import type { Metadata } from "next";
import Link from "next/link";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatPeso, todayManila } from "@/lib/format";

export const metadata: Metadata = { title: "Receivables Aging" };

const BUCKETS = [
  { key: "d90plus", label: "Over 90 days overdue" },
  { key: "d90", label: "61–90 days overdue" },
  { key: "d60", label: "31–60 days overdue" },
  { key: "d30", label: "1–30 days overdue" },
  { key: "current", label: "Not yet due" },
  { key: "nosched", label: "No payment schedule yet" },
] as const;

type MilestoneRow = {
  id: string;
  label: string;
  amount: number;
  due_date: string | null;
  sort_order: number;
};
type PaymentRow = { amount: number; milestone_id: string | null };

export default async function ReceivablesPage() {
  await requireRole("owner");
  const supabase = await createClient();
  const today = todayManila();

  const { data: projects } = await supabase
    .from("projects")
    .select(
      "id, project_no, status, contract_amount, customers (name), payment_milestones (id, label, amount, due_date, sort_order), payments (amount, milestone_id)",
    )
    .neq("status", "closed")
    .limit(1000);

  type Item = {
    id: string; label: string; due_date: string | null; remaining: number;
    project_id: string; project_no: string; customer: string; bucket: string;
  };

  const dayMs = 86400000;
  const bucketFor = (dueDate: string | null): string => {
    if (!dueDate || dueDate >= today) return "current";
    const days = Math.round(
      (new Date(today).getTime() - new Date(dueDate).getTime()) / dayMs,
    );
    return days <= 30 ? "d30" : days <= 60 ? "d60" : days <= 90 ? "d90" : "d90plus";
  };

  const items: Item[] = [];
  for (const project of projects ?? []) {
    const rawCustomer = project.customers;
    const customer = Array.isArray(rawCustomer) ? rawCustomer[0] : rawCustomer;
    const payments: PaymentRow[] = project.payments ?? [];
    const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);
    const outstanding = Number(project.contract_amount) - totalPaid;
    if (outstanding <= 0.005) continue;

    const base = {
      project_id: project.id,
      project_no: project.project_no,
      customer: customer?.name ?? "Unknown",
    };

    const milestones: MilestoneRow[] = [...(project.payment_milestones ?? [])].sort(
      (a, b) => a.sort_order - b.sort_order,
    );

    if (!milestones.length) {
      // No schedule: the balance is contract amount minus payment history.
      // Completed projects without a schedule are the historical archive
      // (amounts recorded, payments never tracked) — not real receivables.
      if (project.status === "completed") continue;
      items.push({
        ...base,
        id: project.id,
        label: "Contract balance",
        due_date: null,
        remaining: outstanding,
        bucket: "nosched",
      });
      continue;
    }

    // Payments not linked to a milestone (and any overpayment on one) are
    // allocated to the earliest unpaid milestones first, so recording a
    // payment without picking its milestone still settles the schedule.
    let pool = payments
      .filter((p) => !p.milestone_id)
      .reduce((s, p) => s + Number(p.amount), 0);
    let scheduledRemaining = 0;

    for (const m of milestones) {
      const linkedPaid = payments
        .filter((p) => p.milestone_id === m.id)
        .reduce((s, p) => s + Number(p.amount), 0);
      pool += Math.max(0, linkedPaid - Number(m.amount));
      let need = Math.max(0, Number(m.amount) - linkedPaid);
      const take = Math.min(need, pool);
      pool -= take;
      need -= take;
      if (need > 0.005) {
        scheduledRemaining += need;
        items.push({
          ...base,
          id: m.id,
          label: m.label,
          due_date: m.due_date,
          remaining: need,
          bucket: bucketFor(m.due_date),
        });
      }
    }

    // Contract value the schedule doesn't cover yet (e.g. milestones add up
    // to less than the contract amount).
    const unscheduled = outstanding - scheduledRemaining;
    if (unscheduled > 0.005) {
      items.push({
        ...base,
        id: `${project.id}-unscheduled`,
        label: "Balance not in the schedule",
        due_date: null,
        remaining: unscheduled,
        bucket: "nosched",
      });
    }
  }

  const total = items.reduce((s, i) => s + i.remaining, 0);
  const overdue = items
    .filter((i) => !["current", "nosched"].includes(i.bucket))
    .reduce((s, i) => s + i.remaining, 0);

  return (
    <>
      <TopBar title="Receivables Aging" backHref="/more" />
      <div className="space-y-4 p-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <p className="text-2xl font-extrabold text-gray-900">{formatPeso(total)}</p>
          <p className="text-xs text-gray-500">Total outstanding receivables</p>
          {overdue > 0.005 && (
            <p className="mt-1 text-xs font-semibold text-red-700">
              {formatPeso(overdue)} overdue
            </p>
          )}
          <p className="mt-2 text-[11px] leading-relaxed text-gray-400">
            Contract amount minus payments received, for every pending, ongoing
            or completed project — aged by the payment schedule&rsquo;s due dates.
            Closed projects and archived past projects are excluded.
          </p>
        </div>

        {BUCKETS.map((bucket) => {
          const inBucket = items.filter((i) => i.bucket === bucket.key);
          if (!inBucket.length) return null;
          const subtotal = inBucket.reduce((s, i) => s + i.remaining, 0);
          const late = !["current", "nosched"].includes(bucket.key);
          return (
            <div key={bucket.key} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className={`font-semibold ${late ? "text-red-700" : "text-gray-900"}`}>
                  {bucket.label}
                </p>
                <p className={`font-bold ${late ? "text-red-700" : "text-gray-900"}`}>
                  {formatPeso(subtotal)}
                </p>
              </div>
              <ul className="divide-y divide-gray-100">
                {inBucket.map((i) => (
                  <li key={i.id}>
                    <Link href={`/projects/${i.project_id}`} className="flex justify-between py-2 text-sm">
                      <span>
                        <span className="font-medium text-gray-800">{i.customer}</span>
                        <span className="block text-xs text-gray-500">
                          {i.project_no} · {i.label}
                          {i.due_date && ` · due ${formatDate(i.due_date)}`}
                        </span>
                      </span>
                      <span className="shrink-0 font-semibold">{formatPeso(i.remaining)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}

        {items.length === 0 && (
          <p className="pt-4 text-center text-sm text-gray-500">
            🎉 No outstanding receivables.
          </p>
        )}
      </div>
    </>
  );
}
