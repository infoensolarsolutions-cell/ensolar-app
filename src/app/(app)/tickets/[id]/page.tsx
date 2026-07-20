import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { TopBar } from "@/components/top-bar";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { TicketForm } from "./ticket-form";

export const metadata: Metadata = { title: "Service Ticket" };

type TicketDetail = {
  id: string;
  ticket_no: string;
  problem: string;
  diagnosis: string | null;
  action_taken: string | null;
  status: "open" | "in_progress" | "resolved";
  warranty: boolean;
  assigned_to: string | null;
  reported_at: string;
  resolved_at: string | null;
  projects: {
    id: string;
    project_no: string;
    customers: { name: string; phone: string | null } | null;
  } | null;
};

export default async function TicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await getProfile();
  if (!profile || profile.role === "customer") redirect("/login");
  const isStaff = ["owner", "office_staff"].includes(profile.role);

  const { id } = await params;
  const supabase = await createClient();

  const { data: ticket } = await supabase
    .from("service_tickets")
    .select(
      "id, ticket_no, problem, diagnosis, action_taken, status, warranty, assigned_to, reported_at, resolved_at, projects (id, project_no, customers (name, phone))",
    )
    .eq("id", id)
    .single()
    .overrideTypes<TicketDetail>();

  if (!ticket) notFound();

  const { data: technicians } = isStaff
    ? await supabase
        .from("profiles")
        .select("id, name")
        .in("role", ["technician", "office_staff", "owner"])
        .eq("active", true)
        .order("name")
    : { data: [] };

  const customer = ticket.projects?.customers;

  return (
    <>
      <TopBar title={ticket.ticket_no} />
      <div className="space-y-4 p-4">
        {ticket.projects && (
          <Link
            href={`/projects/${ticket.projects.id}`}
            className="text-sm font-medium text-brand-green-dark"
          >
            ← Project {ticket.projects.project_no}
          </Link>
        )}

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-lg font-bold text-gray-900">{ticket.ticket_no}</p>
          <p className="text-sm text-gray-600">{customer?.name}</p>
          {customer?.phone && (
            <p className="text-sm">
              📞{" "}
              <a href={`tel:${customer.phone}`} className="font-medium text-brand-green-dark underline">
                {customer.phone}
              </a>
            </p>
          )}
          <p className="mt-2 text-xs text-gray-400">
            Reported {formatDate(ticket.reported_at)}
            {ticket.resolved_at && ` · Resolved ${formatDate(ticket.resolved_at)}`}
          </p>
          <p className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-800">
            {ticket.problem}
          </p>
        </div>

        <TicketForm
          ticket={{
            id: ticket.id,
            status: ticket.status,
            diagnosis: ticket.diagnosis,
            action_taken: ticket.action_taken,
            assigned_to: ticket.assigned_to,
            warranty: ticket.warranty,
          }}
          technicians={technicians ?? []}
          isStaff={isStaff}
        />
      </div>
    </>
  );
}
