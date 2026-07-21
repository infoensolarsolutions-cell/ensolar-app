import Link from "next/link";
import { LEAD_SOURCES, type LeadSource } from "@/lib/crm";
import { formatDate, formatPeso } from "@/lib/format";
import { BarRows, MonthlyBars } from "@/components/charts";
import { MaintenanceItem } from "./maintenance-item";

// Compact peso for chart labels: ₱1.2M / ₱850k / ₱950.
function pesoShort(v: number): string {
  if (v >= 1_000_000) return `₱${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `₱${Math.round(v / 1_000)}k`;
  return `₱${Math.round(v)}`;
}

export type DashboardData = {
  overdue: {
    id: string;
    customer_name: string;
    assignee_name: string | null;
    next_followup_at: string;
    days_overdue: number;
  }[];
  receivables: {
    milestone_id: string;
    project_id: string;
    project_no: string;
    customer_name: string;
    label: string;
    remaining: number;
    due_date: string;
  }[];
  openTickets: {
    id: string;
    ticket_no: string;
    project_no: string;
    customer_name: string;
    status: "open" | "in_progress";
    reported_at: string;
  }[];
  maintenance: {
    id: string;
    project_id: string;
    project_no: string;
    customer_name: string;
    due_date: string;
    note: string | null;
    overdue: boolean;
  }[];
  lowStock: {
    id: string;
    name: string;
    sku: string;
    unit: string;
    on_hand: number;
    reorder_level: number;
  }[];
  marketingIdle: boolean;
  monthLabel: string;
  bySource: { source: LeadSource; count: number }[];
  counts: { newInquiries: number; quotationsSent: number; won: number };
  pipeline: { label: string; value: number }[];
  projectsByStatus: { label: string; value: number }[];
  // Owner only — null hides the money panels.
  money: { collections: number; posSales: number } | null;
  revenueByMonth: { label: string; value: number }[] | null;
  ongoingProfit:
    | {
        project_id: string;
        project_no: string;
        customer_name: string;
        contract: number;
        costs: number;
      }[]
    | null;
};

export function DashboardView({ data }: { data: DashboardData }) {
  const maxSource = Math.max(1, ...data.bySource.map((s) => s.count));

  return (
    <div className="space-y-4 p-4 lg:grid lg:grid-cols-3 lg:items-start lg:gap-3 lg:space-y-0 xl:grid-cols-4">
      <div className="grid grid-cols-3 gap-3 lg:col-span-2">
        <StatCard label="New inquiries" value={data.counts.newInquiries} />
        <StatCard label="Quotes sent" value={data.counts.quotationsSent} sub={data.monthLabel} />
        <StatCard label="Won" value={data.counts.won} sub={data.monthLabel} />
      </div>

      {data.money && (
        <div className="grid grid-cols-2 gap-3 lg:contents">
          <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
            <p className="text-lg font-extrabold text-brand-green-dark">
              {formatPeso(data.money.collections)}
            </p>
            <p className="text-xs font-medium text-gray-600">Collections</p>
            <p className="text-[10px] text-gray-400">{data.monthLabel}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
            <p className="text-lg font-extrabold text-brand-green-dark">
              {formatPeso(data.money.posSales)}
            </p>
            <p className="text-xs font-medium text-gray-600">POS sales</p>
            <p className="text-[10px] text-gray-400">{data.monthLabel}</p>
          </div>
        </div>
      )}

      {data.revenueByMonth && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 lg:p-3">
          <p className="mb-1 font-semibold text-gray-900">Money received per month</p>
          <p className="mb-2 text-xs text-gray-500">
            Project payments + POS sales, last 6 months
          </p>
          <MonthlyBars data={data.revenueByMonth} format={pesoShort} />
        </div>
      )}

      <div className="grid gap-4 lg:contents">
        <div className="rounded-xl border border-gray-200 bg-white p-4 lg:p-3">
          <p className="mb-3 font-semibold text-gray-900">Sales pipeline</p>
          {data.pipeline.every((s) => s.value === 0) ? (
            <p className="text-sm text-gray-500">No leads yet.</p>
          ) : (
            <BarRows data={data.pipeline} />
          )}
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 lg:p-3">
          <p className="mb-3 font-semibold text-gray-900">Projects by status</p>
          {data.projectsByStatus.every((s) => s.value === 0) ? (
            <p className="text-sm text-gray-500">No projects yet.</p>
          ) : (
            <BarRows data={data.projectsByStatus} />
          )}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 lg:p-3">
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

      <div className="rounded-xl border border-gray-200 bg-white p-4 lg:p-3 lg:max-h-80 lg:overflow-y-auto">
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

      <div className="rounded-xl border border-gray-200 bg-white p-4 lg:p-3 lg:max-h-80 lg:overflow-y-auto">
        <div className="mb-2 flex items-center justify-between">
          <p className="font-semibold text-gray-900">Overdue receivables</p>
          {data.receivables.length > 0 && (
            <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700">
              {data.receivables.length}
            </span>
          )}
        </div>
        {data.receivables.length === 0 ? (
          <p className="text-sm text-gray-500">No overdue collections. 👍</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {data.receivables.map((r) => (
              <li key={r.milestone_id}>
                <Link
                  href={`/projects/${r.project_id}`}
                  className="flex items-center justify-between gap-2 py-2.5"
                >
                  <div>
                    <p className="text-sm font-semibold text-red-700">
                      {r.customer_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {r.project_no} · {r.label} · due {formatDate(r.due_date)}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-red-700">
                    {formatPeso(r.remaining)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {data.openTickets.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 lg:p-3 lg:max-h-80 lg:overflow-y-auto">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-semibold text-gray-900">Open service tickets</p>
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
              {data.openTickets.length}
            </span>
          </div>
          <ul className="divide-y divide-gray-100">
            {data.openTickets.map((t) => (
              <li key={t.id}>
                <Link href={`/tickets/${t.id}`} className="flex items-center justify-between gap-2 py-2.5">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{t.customer_name}</p>
                    <p className="text-xs text-gray-500">
                      {t.ticket_no} · {t.project_no} · {formatDate(t.reported_at)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      t.status === "open" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {t.status === "open" ? "Open" : "In Progress"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.maintenance.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 lg:p-3 lg:max-h-80 lg:overflow-y-auto">
          <p className="mb-2 font-semibold text-gray-900">Maintenance due</p>
          <ul className="divide-y divide-gray-100">
            {data.maintenance.map((m) => (
              <MaintenanceItem key={m.id} reminder={m} />
            ))}
          </ul>
        </div>
      )}

      {data.ongoingProfit && data.ongoingProfit.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 lg:p-3 lg:max-h-80 lg:overflow-y-auto">
          <p className="mb-2 font-semibold text-gray-900">
            Gross profit — ongoing projects
          </p>
          <ul className="divide-y divide-gray-100">
            {data.ongoingProfit.map((p) => {
              const profit = p.contract - p.costs;
              const pct = p.contract > 0 ? (profit / p.contract) * 100 : 0;
              return (
                <li key={p.project_id}>
                  <Link
                    href={`/projects/${p.project_id}`}
                    className="flex items-center justify-between gap-2 py-2.5"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        {p.customer_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {p.project_no} · costs {formatPeso(p.costs)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-sm font-bold lg:text-xs ${
                        profit >= 0 ? "text-green-700" : "text-red-600"
                      }`}
                    >
                      {formatPeso(profit)}
                      <span className="ml-1 text-xs lg:text-[10px]">({pct.toFixed(0)}%)</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {data.marketingIdle && (
        <Link
          href="/campaigns"
          className="block rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 lg:col-span-3 xl:col-span-4"
        >
          <p className="text-sm font-semibold text-purple-900">
            📣 No marketing campaign has been active for 30+ days
          </p>
          <p className="mt-0.5 text-xs text-purple-700">
            Tap to start one — leads from its shared link are tracked
            automatically.
          </p>
        </Link>
      )}

      {data.lowStock.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 lg:p-3 lg:max-h-80 lg:overflow-y-auto">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-semibold text-gray-900">Low stock</p>
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
              {data.lowStock.length}
            </span>
          </div>
          <ul className="divide-y divide-gray-100">
            {data.lowStock.map((p) => (
              <li key={p.id}>
                <Link href={`/products/${p.id}`} className="flex items-center justify-between gap-2 py-2.5">
                  <div>
                    <p className="text-sm font-semibold text-amber-800">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.sku} · reorder at {p.reorder_level}</p>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-amber-700">
                    {p.on_hand} {p.unit}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

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
