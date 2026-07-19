import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/top-bar";
import { getProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  PROJECT_STATUSES,
  SERVICE_TYPES,
  type ProjectStatus,
  type ServiceType,
} from "@/lib/crm";
import { formatDate, formatPeso } from "@/lib/format";
import { StatusActions } from "./status-actions";
import { AssignForm } from "./assign-form";
import { NoteForm } from "./note-form";
import { DatesForm } from "./dates-form";

export const metadata: Metadata = { title: "Project" };

type ProjectDetail = {
  id: string;
  project_no: string;
  status: ProjectStatus;
  service_type: ServiceType | null;
  site_address: string | null;
  contract_amount: number;
  start_date: string | null;
  target_date: string | null;
  completed_date: string | null;
  created_at: string;
  customers: { name: string; phone: string | null } | null;
  quotations: { id: string; quote_no: string } | null;
  project_assignments: { user_id: string; profiles: { name: string } | null }[];
};

type EventRow = {
  id: string;
  event: string;
  detail: Record<string, string> | null;
  created_at: string;
  profiles: { name: string } | null;
};

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await getProfile();
  if (!profile || profile.role === "customer") redirect("/login");
  const isStaff = ["owner", "office_staff"].includes(profile.role);

  const { id } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select(
      "id, project_no, status, service_type, site_address, contract_amount, start_date, target_date, completed_date, created_at, customers (name, phone), quotations (id, quote_no), project_assignments (user_id, profiles (name))",
    )
    .eq("id", id)
    .single()
    .overrideTypes<ProjectDetail>();

  if (!project) notFound();

  const [{ data: technicians }, { data: events }, { data: payments }] =
    await Promise.all([
      isStaff
        ? supabase
            .from("profiles")
            .select("id, name")
            .eq("role", "technician")
            .eq("active", true)
            .order("name")
        : Promise.resolve({ data: [] as { id: string; name: string }[] }),
      supabase
        .from("project_events")
        .select("id, event, detail, created_at, profiles:user_id (name)")
        .eq("project_id", id)
        .order("created_at", { ascending: false })
        .limit(30)
        .overrideTypes<EventRow[]>(),
      supabase.from("payments").select("amount").eq("project_id", id),
    ]);

  const paid = (payments ?? []).reduce((s, p) => s + Number(p.amount), 0);
  const balance = Number(project.contract_amount) - paid;

  return (
    <>
      <TopBar title={project.project_no} />
      <div className="space-y-4 p-4">
        <Link href="/projects" className="text-sm font-medium text-brand-green-dark">
          ← All projects
        </Link>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-lg font-bold text-gray-900">{project.project_no}</p>
              <p className="text-sm text-gray-600">{project.customers?.name}</p>
              {project.service_type && (
                <p className="text-xs text-gray-500">{SERVICE_TYPES[project.service_type]}</p>
              )}
            </div>
            <span className="shrink-0 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
              {PROJECT_STATUSES[project.status]}
            </span>
          </div>
          <div className="mt-3 space-y-1 text-sm text-gray-700">
            {project.site_address && <p>📍 {project.site_address}</p>}
            {project.customers?.phone && (
              <p>
                📞{" "}
                <a href={`tel:${project.customers.phone}`} className="font-medium text-brand-green-dark underline">
                  {project.customers.phone}
                </a>
              </p>
            )}
            {project.quotations && (
              <p>
                From quotation{" "}
                <Link href={`/quotations/${project.quotations.id}`} className="font-medium text-brand-green-dark underline">
                  {project.quotations.quote_no}
                </Link>
              </p>
            )}
            {project.start_date && <p>Started: {formatDate(project.start_date)}</p>}
            {project.target_date && <p>Target: {formatDate(project.target_date)}</p>}
            {project.completed_date && <p>Completed: {formatDate(project.completed_date)}</p>}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 border-t border-gray-100 pt-3 text-center">
            <div>
              <p className="text-xs text-gray-500">Contract</p>
              <p className="text-sm font-bold">{formatPeso(project.contract_amount)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Paid</p>
              <p className="text-sm font-bold text-brand-green-dark">{formatPeso(paid)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Balance</p>
              <p className={`text-sm font-bold ${balance > 0 ? "text-red-600" : "text-gray-900"}`}>
                {formatPeso(balance)}
              </p>
            </div>
          </div>
        </div>

        <StatusActions projectId={project.id} status={project.status} isStaff={isStaff} />

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-2 font-semibold text-gray-900">Technicians</p>
          {project.project_assignments.length === 0 && (
            <p className="mb-2 text-sm text-gray-500">No technicians assigned yet.</p>
          )}
          {project.project_assignments.length > 0 && (
            <p className="mb-2 text-sm text-gray-700">
              {project.project_assignments.map((a) => a.profiles?.name).filter(Boolean).join(", ")}
            </p>
          )}
          {isStaff && (
            <AssignForm
              projectId={project.id}
              technicians={technicians ?? []}
              assigned={project.project_assignments.map((a) => a.user_id)}
            />
          )}
        </div>

        {isStaff && (
          <DatesForm
            projectId={project.id}
            startDate={project.start_date}
            targetDate={project.target_date}
          />
        )}

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-2 font-semibold text-gray-900">
            Payments · Costs · Photos · Tickets
          </p>
          <p className="text-sm text-gray-500">
            Payment schedules, cost tracking, site photos and after-sales
            tickets arrive in the next build steps (B2–B4).
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-2 font-semibold text-gray-900">Timeline</p>
          <NoteForm projectId={project.id} />
          {!events?.length && <p className="mt-2 text-sm text-gray-500">No activity yet.</p>}
          <ul className="mt-3 space-y-2">
            {events?.map((ev) => (
              <li key={ev.id} className="text-sm text-gray-700">
                <span className="text-xs text-gray-400">{formatDate(ev.created_at)}</span>{" "}
                {describeEvent(ev)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}

function describeEvent(ev: EventRow): string {
  const who = ev.profiles?.name ?? "System";
  if (ev.event === "status_changed") {
    const from = ev.detail?.from as ProjectStatus | undefined;
    const to = ev.detail?.to as ProjectStatus | undefined;
    return `${who} moved ${from ? PROJECT_STATUSES[from] : "?"} → ${to ? PROJECT_STATUSES[to] : "?"}`;
  }
  if (ev.event === "technicians_assigned") return `${who} updated technician assignments`;
  if (ev.event === "note") return `${who}: ${ev.detail?.text ?? ""}`;
  return `${who}: ${ev.event}`;
}
