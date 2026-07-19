import { TopBar } from "@/components/top-bar";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LEAD_SOURCES, type LeadSource, type LeadStatus } from "@/lib/crm";
import { todayManila, TIMEZONE } from "@/lib/format";
import { DashboardView, type DashboardData } from "./dashboard-view";

type OverdueRow = {
  id: string;
  next_followup_at: string;
  customers: { name: string } | null;
  profiles: { name: string } | null;
};

type SourceRow = {
  id: string;
  customers: { source: LeadSource | null } | null;
};

export default async function DashboardPage() {
  const profile = (await getProfile())!;

  // Technicians get their module in Phase 1 Module B (assigned projects).
  if (profile.role === "technician") {
    return (
      <>
        <TopBar title="Ensolar" />
        <div className="p-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="font-semibold text-gray-900">
              Welcome, {profile.name || "Technician"}
            </p>
            <p className="mt-1 text-sm text-gray-600">
              Your assigned projects and job updates arrive with the Projects
              module. For now, please coordinate with the office.
            </p>
          </div>
        </div>
      </>
    );
  }

  const supabase = await createClient();
  const today = todayManila();
  const monthStart = today.slice(0, 8) + "01";
  const monthLabel = new Intl.DateTimeFormat("en-PH", {
    month: "short",
    year: "numeric",
    timeZone: TIMEZONE,
  }).format(new Date());

  const [overdueRes, sourceRes, newInqRes, quotesRes, wonRes] =
    await Promise.all([
      supabase
        .from("leads")
        .select(
          "id, next_followup_at, customers (name), profiles:assigned_to (name)",
        )
        .lt("next_followup_at", today)
        .not("status", "in", "(won,lost)")
        .order("next_followup_at", { ascending: true })
        .limit(25)
        .overrideTypes<OverdueRow[]>(),
      supabase
        .from("leads")
        .select("id, customers (source)")
        .gte("created_at", monthStart)
        .overrideTypes<SourceRow[]>(),
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("status", "new_inquiry" satisfies LeadStatus),
      supabase
        .from("quotations")
        .select("id", { count: "exact", head: true })
        .neq("status", "draft")
        .gte("created_at", monthStart),
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("status", "won" satisfies LeadStatus)
        .gte("updated_at", monthStart),
    ]);

  const dayMs = 24 * 60 * 60 * 1000;
  const overdue = (overdueRes.data ?? []).map((lead) => ({
    id: lead.id,
    customer_name: lead.customers?.name ?? "Unknown",
    assignee_name: lead.profiles?.name || null,
    next_followup_at: lead.next_followup_at,
    days_overdue: Math.max(
      1,
      Math.round(
        (new Date(today).getTime() - new Date(lead.next_followup_at).getTime()) /
          dayMs,
      ),
    ),
  }));

  const sourceCounts = new Map<LeadSource, number>();
  for (const row of sourceRes.data ?? []) {
    const source = row.customers?.source;
    if (source) sourceCounts.set(source, (sourceCounts.get(source) ?? 0) + 1);
  }
  const bySource = (Object.keys(LEAD_SOURCES) as LeadSource[]).map(
    (source) => ({ source, count: sourceCounts.get(source) ?? 0 }),
  );

  const data: DashboardData = {
    overdue,
    monthLabel,
    bySource,
    counts: {
      newInquiries: newInqRes.count ?? 0,
      quotationsSent: quotesRes.count ?? 0,
      won: wonRes.count ?? 0,
    },
  };

  return (
    <>
      <TopBar title="Ensolar" />
      <DashboardView data={data} />
    </>
  );
}
