import type { Metadata } from "next";
import Link from "next/link";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  LEAD_STATUSES,
  SERVICE_TYPES,
  type LeadStatus,
  type ServiceType,
} from "@/lib/crm";
import { formatDate, todayManila } from "@/lib/format";

export const metadata: Metadata = { title: "Leads" };

type LeadRow = {
  id: string;
  status: LeadStatus;
  service_type: ServiceType;
  next_followup_at: string | null;
  created_at: string;
  customers: { name: string; phone: string | null } | null;
  profiles: { name: string } | null;
};

export default async function LeadsPage() {
  await requireRole("owner", "office_staff");
  const supabase = await createClient();

  const { data: leads } = await supabase
    .from("leads")
    .select(
      "id, status, service_type, next_followup_at, created_at, customers (name, phone), profiles:assigned_to (name)",
    )
    .order("created_at", { ascending: false })
    .limit(100)
    .overrideTypes<LeadRow[]>();

  const today = todayManila();

  return (
    <>
      <TopBar title="Leads" />
      <div className="space-y-3 p-4">
        <Link
          href="/leads/new"
          className="block w-full rounded-xl bg-brand-green px-4 py-3.5 text-center text-base font-semibold text-white active:bg-brand-green-dark"
        >
          + Add Lead
        </Link>

        {!leads?.length && (
          <p className="pt-8 text-center text-sm text-gray-500">
            No leads yet. Tap “Add Lead” or share the public inquiry link.
          </p>
        )}

        {leads?.map((lead) => {
          const overdue =
            lead.next_followup_at !== null &&
            lead.next_followup_at < today &&
            lead.status !== "won" &&
            lead.status !== "lost";
          return (
            <div
              key={lead.id}
              className={`rounded-xl border bg-white p-4 ${
                overdue ? "border-red-300 ring-1 ring-red-200" : "border-gray-200"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900">
                    {lead.customers?.name ?? "Unknown"}
                  </p>
                  <p className="text-sm text-gray-600">
                    {SERVICE_TYPES[lead.service_type]}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                  {LEAD_STATUSES[lead.status]}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  {lead.profiles?.name
                    ? `Assigned: ${lead.profiles.name}`
                    : "Unassigned"}
                </span>
                {lead.next_followup_at && (
                  <span
                    className={
                      overdue ? "font-semibold text-red-600" : "text-gray-500"
                    }
                  >
                    {overdue ? "Overdue: " : "Follow up: "}
                    {formatDate(lead.next_followup_at)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
