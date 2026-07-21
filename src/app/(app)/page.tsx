import Link from "next/link";
import { TopBar } from "@/components/top-bar";
import { getProfile, type Profile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  LEAD_SOURCES,
  LEAD_STATUSES,
  PROJECT_STATUSES,
  SERVICE_TYPES,
  type LeadSource,
  type LeadStatus,
  type ProjectStatus,
  type ServiceType,
} from "@/lib/crm";
import { todayManila, TIMEZONE } from "@/lib/format";
import { BarRows } from "@/components/charts";
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

  // Technicians get a work-focused dashboard: their projects, tickets,
  // and clocked hours this week.
  if (profile.role === "technician") {
    return <TechnicianDashboard profile={profile} />;
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
    campaignsRes,
    leadStatusRes,
    projStatusRes,
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
      supabase
        .from("campaigns")
        .select("end_date")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase.from("leads").select("status").limit(2000),
      supabase.from("projects").select("status").limit(2000),
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

  const statusCount = <K extends string>(
    rows: { status: string }[] | null,
    labels: Record<K, string>,
  ) =>
    (Object.keys(labels) as K[]).map((key) => ({
      label: labels[key],
      value: (rows ?? []).filter((r) => r.status === key).length,
    }));

  const pipeline = statusCount(leadStatusRes.data, LEAD_STATUSES);
  const projectsByStatus = statusCount(projStatusRes.data, PROJECT_STATUSES);

  // Owner-only money panels (financial reports are owner territory, Spec §3).
  let money: DashboardData["money"] = null;
  let ongoingProfit: DashboardData["ongoingProfit"] = null;
  let revenueByMonth: DashboardData["revenueByMonth"] = null;
  if (profile.role === "owner") {
    const monthStartUtc = new Date(`${monthStart}T00:00:00+08:00`).toISOString();
    // First day of the month five months back → six month buckets incl. this one.
    const sixMonthsBack = new Date(Date.UTC(Number(monthStart.slice(0, 4)), Number(monthStart.slice(5, 7)) - 6, 1));
    const sixMonthsBackIso = new Date(
      `${sixMonthsBack.toISOString().slice(0, 10)}T00:00:00+08:00`,
    ).toISOString();
    const [collectionsRes, posRes, ongoingRes, payHistRes, posHistRes] = await Promise.all([
      supabase.from("payments").select("amount").gte("received_at", monthStartUtc),
      supabase.from("pos_sales").select("total").gte("sold_at", monthStartUtc),
      supabase
        .from("projects")
        .select("id, project_no, contract_amount, customers (name), project_costs (amount)")
        .eq("status", "ongoing")
        .limit(20),
      supabase
        .from("payments")
        .select("amount, received_at")
        .gte("received_at", sixMonthsBackIso)
        .limit(5000),
      supabase
        .from("pos_sales")
        .select("total, sold_at")
        .gte("sold_at", sixMonthsBackIso)
        .limit(5000),
    ]);
    money = {
      collections: (collectionsRes.data ?? []).reduce((s, p) => s + Number(p.amount), 0),
      posSales: (posRes.data ?? []).reduce((s, p) => s + Number(p.total), 0),
    };

    const monthFmt = new Intl.DateTimeFormat("en-PH", { month: "short", timeZone: TIMEZONE });
    const keyFmt = new Intl.DateTimeFormat("en-CA", {
      year: "numeric", month: "2-digit", timeZone: TIMEZONE,
    });
    const buckets: { key: string; label: string; value: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(Date.UTC(Number(monthStart.slice(0, 4)), Number(monthStart.slice(5, 7)) - 1 - i, 15));
      buckets.push({ key: keyFmt.format(d), label: monthFmt.format(d), value: 0 });
    }
    const addTo = (iso: string, amount: number) => {
      const key = keyFmt.format(new Date(iso));
      const bucket = buckets.find((b) => b.key === key);
      if (bucket) bucket.value += amount;
    };
    for (const p of payHistRes.data ?? []) addTo(p.received_at, Number(p.amount));
    for (const s of posHistRes.data ?? []) addTo(s.sold_at, Number(s.total));
    revenueByMonth = buckets.map(({ label, value }) => ({ label, value }));
    ongoingProfit = (ongoingRes.data ?? []).map((p) => {
      const customer = Array.isArray(p.customers) ? p.customers[0] : p.customers;
      return {
        project_id: p.id,
        project_no: p.project_no,
        customer_name: customer?.name ?? "Unknown",
        contract: Number(p.contract_amount),
        costs: (p.project_costs ?? []).reduce(
          (s: number, c: { amount: number }) => s + Number(c.amount),
          0,
        ),
      };
    });
  }

  const lowStock = ((lowStockRes.data ?? []) as {
    id: string; name: string; sku: string; unit: string;
    on_hand: number; reorder_level: number;
  }[])
    .filter((p) => Number(p.on_hand) <= Number(p.reorder_level))
    .slice(0, 15);

  // "Marketing left open" (Spec §6.3): alert when nothing has been active
  // in the last 30 days.
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const campaignRows = campaignsRes.data ?? [];
  const marketingIdle = !campaignRows.some(
    (c) => c.end_date === null || c.end_date >= thirtyDaysAgo,
  );

  const data: DashboardData = {
    overdue,
    receivables,
    openTickets,
    maintenance,
    lowStock,
    marketingIdle,
    money,
    ongoingProfit,
    revenueByMonth,
    pipeline,
    projectsByStatus,
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

async function TechnicianDashboard({ profile }: { profile: Profile }) {
  const supabase = await createClient();
  const today = todayManila();

  // Monday of the current week, Manila time.
  const [y, m, d] = today.split("-").map(Number);
  const todayUtcNoon = new Date(Date.UTC(y, m - 1, d, 12));
  const dow = (todayUtcNoon.getUTCDay() + 6) % 7; // 0 = Monday
  const monday = new Date(todayUtcNoon.getTime() - dow * 86400000);
  const mondayStr = monday.toISOString().slice(0, 10);
  const weekStartIso = new Date(`${mondayStr}T00:00:00+08:00`).toISOString();

  const [{ data: projects }, { data: tickets }, { data: employee }] =
    await Promise.all([
      supabase
        .from("projects")
        .select("id, project_no, status, service_type, site_address")
        .neq("status", "closed")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("service_tickets")
        .select("id, ticket_no, problem, status, reported_at")
        .eq("assigned_to", profile.id)
        .in("status", ["open", "in_progress"])
        .order("reported_at", { ascending: true })
        .limit(15),
      supabase
        .from("employees")
        .select("id")
        .eq("profile_id", profile.id)
        .maybeSingle(),
    ]);

  let hoursByDay: { label: string; value: number }[] | null = null;
  let clockedIn = false;
  if (employee) {
    const { data: entries } = await supabase
      .from("attendance")
      .select("clock_in, clock_out")
      .eq("employee_id", employee.id)
      .gte("clock_in", weekStartIso)
      .order("clock_in");
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const totals = new Array(6).fill(0);
    const dayFmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit",
    });
    for (const e of entries ?? []) {
      if (!e.clock_out) {
        clockedIn = true;
        continue;
      }
      const entryDay = dayFmt.format(new Date(e.clock_in));
      const idx = Math.round(
        (new Date(`${entryDay}T12:00:00Z`).getTime() -
          new Date(`${mondayStr}T12:00:00Z`).getTime()) /
          86400000,
      );
      if (idx >= 0 && idx < 6) {
        totals[idx] +=
          (new Date(e.clock_out).getTime() - new Date(e.clock_in).getTime()) /
          3600000;
      }
    }
    hoursByDay = days.map((label, i) => ({
      label,
      value: Math.round(totals[i] * 10) / 10,
    }));
  }

  return (
    <>
      <TopBar title="Ensolar" />
      <div className="space-y-4 p-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="font-semibold text-gray-900">
            Welcome, {profile.name || "Technician"} 👷
          </p>
          <Link
            href="/attendance"
            className={`mt-3 block w-full rounded-lg px-4 py-3 text-center text-sm font-semibold ${
              clockedIn
                ? "bg-amber-100 text-amber-900"
                : "bg-brand-green text-white active:bg-brand-green-dark"
            }`}
          >
            {clockedIn ? "⏱ You are clocked in — tap to clock out" : "🕐 Clock in / out"}
          </Link>
        </div>

        {hoursByDay && (
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="mb-3 font-semibold text-gray-900">
              Clocked hours this week
            </p>
            <BarRows data={hoursByDay} format={(v) => `${v} h`} />
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-2 font-semibold text-gray-900">My projects</p>
          {!projects?.length && (
            <p className="text-sm text-gray-500">
              No assigned projects yet. The office assigns you from the
              project page.
            </p>
          )}
          <ul className="divide-y divide-gray-100">
            {projects?.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/projects/${p.id}`}
                  className="flex items-center justify-between gap-2 py-2.5"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{p.project_no}</p>
                    <p className="text-xs text-gray-500">
                      {[
                        p.service_type
                          ? SERVICE_TYPES[p.service_type as ServiceType]
                          : null,
                        p.site_address,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                    {PROJECT_STATUSES[p.status as ProjectStatus]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {(tickets?.length ?? 0) > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="mb-2 font-semibold text-gray-900">My service tickets</p>
            <ul className="divide-y divide-gray-100">
              {tickets!.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/tickets/${t.id}`}
                    className="flex items-center justify-between gap-2 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{t.ticket_no}</p>
                      <p className="truncate text-xs text-gray-500">{t.problem}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        t.status === "open"
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-800"
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
      </div>
    </>
  );
}
