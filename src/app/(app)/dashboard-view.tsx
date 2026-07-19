import Link from "next/link";
import { LEAD_SOURCES, type LeadSource } from "@/lib/crm";
import { formatDate } from "@/lib/format";

export type DashboardData = {
  overdue: {
    id: string;
    customer_name: string;
    assignee_name: string | null;
    next_followup_at: string;
    days_overdue: number;
  }[];
  monthLabel: string;
  bySource: { source: LeadSource; count: number }[];
  counts: { newInquiries: number; quotationsSent: number; won: number };
};

export function DashboardView({ data }: { data: DashboardData }) {
  const maxSource = Math.max(1, ...data.bySource.map((s) => s.count));

  return (
    <div className="space-y-4 p-4">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="New inquiries" value={data.counts.newInquiries} />
        <StatCard label="Quotes sent" value={data.counts.quotationsSent} sub={data.monthLabel} />
        <StatCard label="Won" value={data.counts.won} sub={data.monthLabel} />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="font-semibold text-gray-900">Overdue follow-ups</p>
          {data.overdue.length > 0 && (
            <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700">
              {data.overdue.length}
            </span>
          )}
        </div>

        {data.overdue.length === 0 ? (
          <p className="text-sm text-gray-500">
            🎉 Nothing overdue. All inquiries are being attended to.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {data.overdue.map((lead) => (
              <li key={lead.id}>
                <Link href={`/leads/${lead.id}`} className="flex items-center justify-between gap-2 py-2.5">
                  <div>
                    <p className="text-sm font-semibold text-red-700">{lead.customer_name}</p>
                    <p className="text-xs text-gray-500">
                      {lead.assignee_name ?? "Unassigned"} · due {formatDate(lead.next_followup_at)}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">
                    {lead.days_overdue}d late
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <p className="mb-3 font-semibold text-gray-900">
          Leads by source · {data.monthLabel}
        </p>
        {data.bySource.every((s) => s.count === 0) ? (
          <p className="text-sm text-gray-500">No leads yet this month.</p>
        ) : (
          <ul className="space-y-2.5">
            {data.bySource.map((s) => (
              <li key={s.source}>
                <div className="mb-0.5 flex justify-between text-sm">
                  <span className="text-gray-700">{LEAD_SOURCES[s.source]}</span>
                  <span className="font-semibold text-gray-900">{s.count}</span>
                </div>
                <div className="h-2.5 rounded-full bg-gray-100">
                  <div
                    className="h-2.5 rounded-full bg-brand-green"
                    style={{ width: `${(s.count / maxSource) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
      <p className="text-2xl font-extrabold text-gray-900">{value}</p>
      <p className="text-xs font-medium text-gray-600">{label}</p>
      {sub && <p className="text-[10px] text-gray-400">{sub}</p>}
    </div>
  );
}
