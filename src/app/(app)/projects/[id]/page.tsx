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
import { PaymentsPanel } from "./payments-panel";
import { CostsPanel, type CostRow } from "./costs-panel";
import { PhotosPanel, type PhotoRow } from "./photos-panel";
import { TicketsPanel, type TicketRow } from "./tickets-panel";
import { InviteButton } from "./invite-button";
import { IssueForm, type IssueProduct } from "./issue-form";
import { AssignForm } from "./assign-form";
import { NoteForm } from "./note-form";
import { DatesForm } from "./dates-form";
import { SiteAddressForm } from "./site-address-form";

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
  customer_id: string;
  customers: {
    name: string;
    phone: string | null;
    email: string | null;
    profile_id: string | null;
  } | null;
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
      "id, project_no, status, service_type, site_address, contract_amount, start_date, target_date, completed_date, created_at, customer_id, customers (name, phone, email, profile_id), quotations (id, quote_no), project_assignments (user_id, profiles (name))",
    )
    .eq("id", id)
    .single()
    .overrideTypes<ProjectDetail>();

  if (!project) notFound();

  const [
    { data: technicians },
    { data: events },
    { data: payments },
    { data: milestones },
    { data: costs },
    { data: photos },
    { data: tickets },
    { data: contracts },
  ] = await Promise.all([
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
      supabase
        .from("payments")
        .select("id, or_no, amount, method, received_at, milestone_id, payment_milestones (label)")
        .eq("project_id", id)
        .order("received_at", { ascending: false }),
      supabase
        .from("payment_milestones")
        .select("id, label, amount, due_date, sort_order")
        .eq("project_id", id)
        .order("sort_order"),
      supabase
        .from("project_costs")
        .select("id, type, description, amount, date, inventory_txn_id")
        .eq("project_id", id)
        .order("date", { ascending: false }),
      supabase
        .from("project_photos")
        .select("id, storage_path, caption, phase, created_at, profiles:uploaded_by (name)")
        .eq("project_id", id)
        .order("created_at", { ascending: false })
        .limit(60),
      supabase
        .from("service_tickets")
        .select("id, ticket_no, problem, status, warranty, reported_at, profiles:assigned_to (name)")
        .eq("project_id", id)
        .order("reported_at", { ascending: false }),
      supabase
        .from("contracts")
        .select("id, contract_no, created_at")
        .eq("project_id", id)
        .order("created_at", { ascending: false }),
    ]);

  const paid = (payments ?? []).reduce((s, p) => s + Number(p.amount), 0);
  const balance = Number(project.contract_amount) - paid;

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());

  const milestoneRows = (milestones ?? []).map((m) => {
    const paidForMilestone = (payments ?? [])
      .filter((p) => p.milestone_id === m.id)
      .reduce((s, p) => s + Number(p.amount), 0);
    return {
      id: m.id,
      label: m.label,
      amount: Number(m.amount),
      due_date: m.due_date,
      paid: paidForMilestone,
      overdue:
        m.due_date !== null &&
        m.due_date < today &&
        paidForMilestone < Number(m.amount) - 0.005,
    };
  });

  const costRows: CostRow[] = (costs ?? []).map((c) => ({
    id: c.id,
    type: c.type,
    description: c.description,
    amount: Number(c.amount),
    date: c.date,
    from_inventory: c.inventory_txn_id !== null,
  }));

  // Private bucket → short-lived signed URLs rendered server-side.
  const signed = photos?.length
    ? await supabase.storage
        .from("project-photos")
        .createSignedUrls(photos.map((p) => p.storage_path), 3600)
    : { data: [] };
  const urlByPath = new Map(
    (signed.data ?? []).map((s) => [s.path, s.signedUrl]),
  );
  const photoRows: PhotoRow[] = (photos ?? [])
    .map((p) => {
      const uploader = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
      return {
        id: p.id,
        url: urlByPath.get(p.storage_path) ?? "",
        caption: p.caption,
        phase: p.phase as PhotoRow["phase"],
        created_at: p.created_at,
        uploader_name: uploader?.name ?? null,
      };
    })
    .filter((p) => p.url);

  let issueProducts: IssueProduct[] = [];
  if (isStaff) {
    const { data: stockProducts } = await supabase
      .from("products_with_stock")
      .select("id, sku, name, unit, cost_price, on_hand")
      .eq("active", true)
      .gt("on_hand", 0)
      .order("name");
    issueProducts = (stockProducts ?? []) as IssueProduct[];
  }

  const ticketRows: TicketRow[] = (tickets ?? []).map((t) => {
    const assignee = Array.isArray(t.profiles) ? t.profiles[0] : t.profiles;
    return {
      id: t.id,
      ticket_no: t.ticket_no,
      problem: t.problem,
      status: t.status,
      warranty: t.warranty,
      reported_at: t.reported_at,
      assignee_name: assignee?.name ?? null,
    };
  });

  const paymentRows = (payments ?? []).map((p) => {
    const milestone = Array.isArray(p.payment_milestones)
      ? p.payment_milestones[0]
      : p.payment_milestones;
    return {
      id: p.id,
      or_no: p.or_no,
      amount: Number(p.amount),
      method: p.method,
      received_at: p.received_at,
      milestone_label: milestone?.label ?? null,
    };
  });

  return (
    <>
      <TopBar title={project.project_no} backHref="/projects" />
      <div className="space-y-4 p-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-4 lg:space-y-0">
        <Link href="/projects" className="text-sm font-medium text-brand-green-dark lg:col-span-full">
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
            {isStaff ? (
              <SiteAddressForm projectId={project.id} siteAddress={project.site_address} />
            ) : (
              project.site_address && <p>📍 {project.site_address}</p>
            )}
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
          {isStaff && (
            <div className="mt-3 border-t border-gray-100 pt-3">
              {project.customers?.profile_id ? (
                <p className="text-xs font-medium text-green-700">
                  ✓ Customer has portal access
                </p>
              ) : (
                <InviteButton
                  customerId={project.customer_id}
                  projectId={project.id}
                  hasEmail={!!project.customers?.email}
                />
              )}
            </div>
          )}
          {isStaff && (
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
          )}
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

        {isStaff && (
          <PaymentsPanel
            projectId={project.id}
            isStaff={isStaff}
            milestones={milestoneRows}
            payments={paymentRows}
          />
        )}

        {isStaff && (
          <>
            <CostsPanel
              projectId={project.id}
              costs={costRows}
              contractAmount={Number(project.contract_amount)}
              isOwner={profile.role === "owner"}
              isStaff={isStaff}
            />
            <IssueForm projectId={project.id} products={issueProducts} />
          </>
        )}

        <PhotosPanel
          projectId={project.id}
          photos={photoRows}
          canUpload={isStaff || profile.role === "technician"}
          isStaff={isStaff}
        />

        {isStaff && (
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="mb-2 font-semibold text-gray-900">Installation Agreement</p>
            {!contracts?.length && (
              <p className="mb-2 text-sm text-gray-500">No contract generated yet.</p>
            )}
            <ul className="divide-y divide-gray-100">
              {contracts?.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <Link href={`/contracts/${c.id}`} className="font-medium text-brand-green-dark underline">
                    {c.contract_no}
                  </Link>
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{formatDate(c.created_at)}</span>
                    <a
                      href={`/api/contracts/${c.id}/pdf`}
                      target="_blank"
                      className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-semibold text-gray-700"
                    >
                      PDF
                    </a>
                  </span>
                </li>
              ))}
            </ul>
            <Link
              href={`/projects/${project.id}/contract`}
              className="mt-2 block w-full rounded-lg border border-brand-green px-4 py-2.5 text-center text-sm font-semibold text-brand-green-dark active:bg-brand-green/5"
            >
              + Generate contract
            </Link>
          </div>
        )}

        <TicketsPanel
          projectId={project.id}
          tickets={ticketRows}
          technicians={technicians ?? []}
          isStaff={isStaff}
        />

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
