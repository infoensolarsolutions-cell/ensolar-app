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
  const monthAhead = new Date(Date.now() + 30 * 86400000)
    .toISOString()
    .slice(0, 10);

  const [
    overdueRes,
    sourceRes,
    newInqRes,
    quotesRes,
    wonRes,
    milestonesRes,
    ticketsRes,
    maintenanceRes,
    lowStockRes,
  ] = await Promise.all([
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
      supabase
        .from("payment_milestones")
        .select(
          "id, label, amount, due_date, projects (id, project_no, status, customers (name)), payments (amount)",
        )
        .lt("due_date", today)
        .order("due_date", { ascending: true })
        .limit(50),
      supabase
        .from("service_tickets")
        .select("id, ticket_no, status, reported_at, projects (project_no, customers (name))")
        .in("status", ["open", "in_progress"])
        .order("reported_at", { ascending: true })
        .limit(15),
      supabase
        .from("maintenance_reminders")
        .select("id, due_date, note, projects (id, project_no, customers (name))")
        .eq("status", "pending")
        .lte("due_date", monthAhead)
        .order("due_date", { ascending: true })
        .limit(15),
      supabase
        .from("products_with_stock")
        .select("id, name, sku, unit, on_hand, reorder_level")
        .eq("active", true)
        .gt("reorder_level", 0)
        .limit(100),
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

  type MilestoneJoin = {
    id: string;
    label: string;
    amount: number;
    due_date: string;
    projects:
      | { id: string; project_no: string; status: string; customers: { name: string } | { name: string }[] | null }
      | null;
    payments: { amount: number }[];
  };

  const receivables = ((milestonesRes.data ?? []) as unknown as MilestoneJoin[])
    .filter((m) => m.projects && m.projects.status !== "closed")
    .map((m) => {
      const paid = (m.payments ?? []).reduce((s, p) => s + Number(p.amount), 0);
      const customer = Array.isArray(m.projects!.customers)
        ? m.projects!.customers[0]
        : m.projects!.customers;
      return {
        milestone_id: m.id,
        project_id: m.projects!.id,
        project_no: m.projects!.project_no,
        customer_name: customer?.name ?? "Unknown",
        label: m.label,
        remaining: Number(m.amount) - paid,
        due_date: m.due_date,
      };
    })
    .filter((r) => r.remaining > 0.005)
    .slice(0, 15);

  type NameJoin = { name: string } | { name: string }[] | null;
  const firstName = (j: NameJoin) => (Array.isArray(j) ? j[0]?.name : j?.name) ?? "Unknown";

  type TicketJoin = {
    id: string; ticket_no: string; status: "open" | "in_progress"; reported_at: string;
    projects: { project_no: string; customers: NameJoin } | { project_no: string; customers: NameJoin }[] | null;
  };
  const openTickets = ((ticketsRes.data ?? []) as unknown as TicketJoin[]).map((t) => {
    const project = Array.isArray(t.projects) ? t.projects[0] : t.projects;
    return {
      id: t.id,
      ticket_no: t.ticket_no,
      project_no: project?.project_no ?? "",
      customer_name: firstName(project?.customers ?? null),
      status: t.status,
      reported_at: t.reported_at,
    };
  });

  type ReminderJoin = {
    id: string; due_date: string; note: string | null;
    projects: { id: string; project_no: string; customers: NameJoin } | { id: string; project_no: string; customers: NameJoin }[] | null;
  };
  const maintenance = ((maintenanceRes.data ?? []) as unknown as ReminderJoin[])
    .map((m) => {
      const project = Array.isArray(m.projects) ? m.projects[0] : m.projects;
      return {
        id: m.id,
        project_id: project?.id ?? "",
        project_no: project?.project_no ?? "",
        customer_name: firstName(project?.customers ?? null),
        due_date: m.due_date,
        note: m.note,
        overdue: m.due_date < today,
      };
    })
    .filter((m) => m.project_id);

  const lowStock = ((lowStockRes.data ?? []) as {
    id: string; name: string; sku: string; unit: string;
    on_hand: number; reorder_level: number;
  }[])
    .filter((p) => Number(p.on_hand) <= Number(p.reorder_level))
    .slice(0, 15);

  const data: DashboardData = {
    overdue,
    receivables,
    openTickets,
    maintenance,
    lowStock,
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
