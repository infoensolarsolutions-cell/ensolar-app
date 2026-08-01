import type { Metadata } from "next";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { todayManila } from "@/lib/format";
import {
  LEAD_SOURCES,
  LEAD_STATUSES,
  type LeadSource,
  type LeadStatus,
} from "@/lib/crm";
import { BarRows } from "@/components/charts";

export const metadata: Metadata = { title: "CRM Report" };

type LeadRow = {
  id: string;
  status: LeadStatus;
  created_at: string;
  customers: { source: LeadSource | null } | null;
  lead_events: { created_at: string }[];
};

function fmtHours(h: number): string {
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 48) return `${Math.round(h * 10) / 10} h`;
  return `${Math.round((h / 24) * 10) / 10} days`;
}

export default async function CrmReportPage() {
  await requireRole("owner");
  const supabase = await createClient();
  const today = todayManila();

  // Last 90 days of leads with their event timestamps (for response time).
  const from = new Date(`${today}T00:00:00+08:00`);
  from.setUTCDate(from.getUTCDate() - 90);
  const fromIso = from.toISOString();

  const [{ data: leads }, { count: dueCount }] = await Promise.all([
    supabase
      .from("leads")
      .select("id, status, created_at, customers (source), lead_events (created_at)")
      .gte("created_at", fromIso)
      .limit(1000)
      .overrideTypes<LeadRow[]>(),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .lte("next_followup_at", today)
      .not("status", "in", "(won,lost)"),
  ]);

  const all = leads ?? [];
  const total = all.length;
  const won = all.filter((l) => l.status === "won").length;
  const lost = all.filter((l) => l.status === "lost").length;
  const decided = won + lost;
  const winRate = decided ? Math.round((won / decided) * 100) : 0;

  // Response time: lead creation → first logged activity by staff.
  const responseHours: number[] = [];
  for (const l of all) {
    const first = l.lead_events
      .map((e) => new Date(e.created_at).getTime())
      .sort((a, b) => a - b)[0];
    if (first) {
      const h = (first - new Date(l.created_at).getTime()) / 3600000;
      if (h >= 0) responseHours.push(h);
    }
  }
  responseHours.sort((a, b) => a - b);
  const median = responseHours.length
    ? responseHours[Math.floor(responseHours.length / 2)]
    : null;
  const noTouch = all.filter(
    (l) => l.lead_events.length === 0 && l.status === "new_inquiry",
  ).length;

  // Pipeline funnel: how many leads reached at least each stage. A lead's
  // current stage implies it passed the earlier ones (won counts everywhere).
  const stageOrder: LeadStatus[] = [
    "new_inquiry", "contacted", "site_visit_scheduled", "quotation_sent", "negotiation", "won",
  ];
  const reached = stageOrder.map((stage, idx) => ({
    label: LEAD_STATUSES[stage],
    value: all.filter((l) => {
      if (l.status === "lost") return idx === 0; // lost leads at least inquired
      return stageOrder.indexOf(l.status) >= idx;
    }).length,
  }));

  // Source effectiveness.
  const sources = (Object.keys(LEAD_SOURCES) as LeadSource[]).map((s) => {
    const rows = all.filter((l) => l.customers?.source === s);
    const w = rows.filter((l) => l.status === "won").length;
    const d = w + rows.filter((l) => l.status === "lost").length;
    return {
      source: LEAD_SOURCES[s],
      leads: rows.length,
      won: w,
      rate: d ? Math.round((w / d) * 100) : null,
    };
  }).sort((a, b) => b.leads - a.leads);

  return (
    <>
      <TopBar title="CRM Report" backHref="/more" />
      <div className="space-y-4 p-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-4 lg:space-y-0">
        <p className="text-xs text-gray-400 lg:col-span-full">
          Last 90 days of leads ({total} total).
        </p>

        <div className="grid grid-cols-2 gap-3 lg:col-span-full lg:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Win rate</p>
            <p className="mt-1 text-xl font-extrabold text-brand-green-dark">{winRate}%</p>
            <p className="text-xs text-gray-500">{won} won · {lost} lost</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">First response</p>
            <p className="mt-1 text-xl font-extrabold text-gray-900">
              {median !== null ? fmtHours(median) : "—"}
            </p>
            <p className="text-xs text-gray-500">median, inquiry → first action</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Untouched</p>
            <p className={`mt-1 text-xl font-extrabold ${noTouch > 0 ? "text-red-600" : "text-gray-900"}`}>
              {noTouch}
            </p>
            <p className="text-xs text-gray-500">new inquiries with no action yet</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Follow-ups due</p>
            <p className={`mt-1 text-xl font-extrabold ${(dueCount ?? 0) > 0 ? "text-amber-600" : "text-gray-900"}`}>
              {dueCount ?? 0}
            </p>
            <p className="text-xs text-gray-500">today or overdue</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-1 font-semibold text-gray-900">Pipeline funnel</p>
          <p className="mb-3 text-xs text-gray-500">
            How many leads reached at least each stage
          </p>
          {total === 0 ? (
            <p className="text-sm text-gray-400">No leads in this period.</p>
          ) : (
            <BarRows data={reached} format={(v) => String(v)} />
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-1 font-semibold text-gray-900">Sources that win</p>
          <p className="mb-3 text-xs text-gray-500">
            Where inquiries come from — and which actually convert
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-[11px] uppercase tracking-wider text-gray-400">
                <th className="py-2 font-semibold">Source</th>
                <th className="py-2 text-right font-semibold">Leads</th>
                <th className="py-2 text-right font-semibold">Won</th>
                <th className="py-2 text-right font-semibold">Win rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sources.map((s) => (
                <tr key={s.source}>
                  <td className="py-2 font-medium text-gray-800">{s.source}</td>
                  <td className="py-2 text-right text-gray-600">{s.leads}</td>
                  <td className="py-2 text-right text-gray-600">{s.won}</td>
                  <td className="py-2 text-right font-bold text-gray-900">
                    {s.rate === null ? "—" : `${s.rate}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-gray-400">
            Win rate counts only decided leads (won or lost) — leads still in
            the pipeline don&rsquo;t drag it down.
          </p>
        </div>
      </div>
    </>
  );
}
