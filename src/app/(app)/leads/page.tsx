import type { Metadata } from "next";
import Link from "next/link";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { type LeadStatus, type ServiceType } from "@/lib/crm";
import { todayManila } from "@/lib/format";
import { type BoardLead } from "./board";
import { LeadsView, type QueueLead } from "./leads-view";

export const metadata: Metadata = { title: "Leads" };

type LeadRow = {
  id: string;
  status: LeadStatus;
  service_type: ServiceType;
  next_followup_at: string | null;
  customers: { name: string; phone: string | null } | null;
  profiles: { name: string } | null;
};

export default async function LeadsPage() {
  await requireRole("owner", "office_staff");
  const supabase = await createClient();

  const { data: leads } = await supabase
    .from("leads")
    .select(
      "id, status, service_type, next_followup_at, customers (name, phone), profiles:assigned_to (name)",
    )
    .order("next_followup_at", { ascending: true, nullsFirst: false })
    .limit(300)
    .overrideTypes<LeadRow[]>();

  const today = todayManila();
  const boardLeads: BoardLead[] = (leads ?? []).map((lead) => {
    const active = lead.status !== "won" && lead.status !== "lost";
    return {
      id: lead.id,
      status: lead.status,
      service_type: lead.service_type,
      next_followup_at: lead.next_followup_at,
      customer_name: lead.customers?.name ?? "Unknown",
      phone: lead.customers?.phone ?? null,
      assignee_name: lead.profiles?.name || null,
      overdue:
        lead.next_followup_at !== null &&
        lead.next_followup_at < today &&
        active,
      needsFollowup: active && lead.next_followup_at === null,
    };
  });

  // Work queue: everything due today or overdue, most overdue first.
  const queue: QueueLead[] = (leads ?? [])
    .filter(
      (l) =>
        l.next_followup_at !== null &&
        l.next_followup_at <= today &&
        l.status !== "won" &&
        l.status !== "lost",
    )
    .map((l) => ({
      id: l.id,
      customer_name: l.customers?.name ?? "Unknown",
      phone: l.customers?.phone ?? null,
      service_type: l.service_type,
      next_followup_at: l.next_followup_at!,
      daysOverdue: Math.round(
        (new Date(today).getTime() - new Date(l.next_followup_at!).getTime()) / 86400000,
      ),
    }))
    .sort((a, b) => b.daysOverdue - a.daysOverdue);

  return (
    <>
      <TopBar title="Leads" />
      <div className="py-4">
        <div className="px-4 pb-3">
          <Link
            href="/leads/new"
            className="block w-full rounded-xl bg-brand-green px-4 py-3.5 text-center text-base font-semibold text-white active:bg-brand-green-dark"
          >
            + Add Lead
          </Link>
        </div>
        <LeadsView boardLeads={boardLeads} queue={queue} />
        <p className="px-4 text-center text-xs text-gray-400">
          Drag a card to move stages, or tap it to open details.
        </p>
      </div>
    </>
  );
}
