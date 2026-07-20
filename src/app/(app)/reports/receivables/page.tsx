import type { Metadata } from "next";
import Link from "next/link";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatPeso, todayManila } from "@/lib/format";

export const metadata: Metadata = { title: "Receivables Aging" };

const BUCKETS = [
  { key: "current", label: "Not yet due" },
  { key: "d30", label: "1–30 days overdue" },
  { key: "d60", label: "31–60 days overdue" },
  { key: "d90", label: "61–90 days overdue" },
  { key: "d90plus", label: "Over 90 days overdue" },
] as const;

export default async function ReceivablesPage() {
  await requireRole("owner");
  const supabase = await createClient();
  const today = todayManila();

  const { data: milestones } = await supabase
    .from("payment_milestones")
    .select(
      "id, label, amount, due_date, projects (id, project_no, status, customers (name)), payments (amount)",
    )
    .limit(500);

  type Item = {
    id: string; label: string; due_date: string | null; remaining: number;
    project_id: string; project_no: string; customer: string; bucket: string;
  };

  const dayMs = 86400000;
  const items: Item[] = [];
  for (const m of milestones ?? []) {
    const project = Array.isArray(m.projects) ? m.projects[0] : m.projects;
    if (!project || project.status === "closed") continue;
    const paid = (m.payments ?? []).reduce((s: number, p: { amount: number }) => s + Number(p.amount), 0);
    const remaining = Number(m.amount) - paid;
    if (remaining <= 0.005) continue;
    const customer = Array.isArray(project.customers) ? project.customers[0] : project.customers;

    let bucket = "current";
    if (m.due_date && m.due_date < today) {
      const days = Math.round(
        (new Date(today).getTime() - new Date(m.due_date).getTime()) / dayMs,
      );
      bucket = days <= 30 ? "d30" : days <= 60 ? "d60" : days <= 90 ? "d90" : "d90plus";
    }
    items.push({
      id: m.id,
      label: m.label,
      due_date: m.due_date,
      remaining,
      project_id: project.id,
      project_no: project.project_no,
      customer: customer?.name ?? "Unknown",
      bucket,
    });
  }

  const total = items.reduce((s, i) => s + i.remaining, 0);

  return (
    <>
      <TopBar title="Receivables Aging" backHref="/more" />
      <div className="space-y-4 p-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <p className="text-2xl font-extrabold text-gray-900">{formatPeso(total)}</p>
          <p className="text-xs text-gray-500">Total outstanding receivables</p>
        </div>

        {BUCKETS.map((bucket) => {
          const inBucket = items.filter((i) => i.bucket === bucket.key);
          if (!inBucket.length) return null;
          const subtotal = inBucket.reduce((s, i) => s + i.remaining, 0);
          const late = bucket.key !== "current";
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
