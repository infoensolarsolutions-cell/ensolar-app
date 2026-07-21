import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/(public)/login/actions";
import {
  PROJECT_STATUSES,
  SERVICE_TYPES,
  type ProjectStatus,
  type ServiceType,
} from "@/lib/crm";
import { formatDate, formatPeso } from "@/lib/format";
import { ProgressBar } from "@/components/charts";
import { RequestServiceForm } from "./request-service-form";
import { PayButton } from "./pay-button";

export const metadata: Metadata = { title: "My Projects" };

const STATUS_BADGE: Record<ProjectStatus, string> = {
  pending: "bg-gray-100 text-gray-700",
  ongoing: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-800",
  closed: "bg-gray-200 text-gray-600",
};

export default async function PortalPage({
  searchParams,
}: {
  searchParams: Promise<{ paid?: string }>;
}) {
  const { paid: paidParam } = await searchParams;
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "customer") redirect("/");

  const supabase = await createClient();

  const { data: announcements } = await supabase
    .from("announcements")
    .select("id, title, body")
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(5);

  // RLS limits every query below to this customer's own records.
  const { data: projects } = await supabase
    .from("projects")
    .select(
      "id, project_no, status, service_type, site_address, contract_amount, start_date, target_date, completed_date",
    )
    .order("created_at", { ascending: false });

  const projectIds = (projects ?? []).map((p) => p.id);

  const [{ data: milestones }, { data: payments }, { data: photos }, { data: tickets }] =
    projectIds.length
      ? await Promise.all([
          supabase
            .from("payment_milestones")
            .select("id, project_id, label, amount, due_date, sort_order")
            .in("project_id", projectIds)
            .order("sort_order"),
          supabase
            .from("payments")
            .select("id, project_id, milestone_id, or_no, amount, received_at")
            .in("project_id", projectIds)
            .order("received_at", { ascending: false }),
          supabase
            .from("project_photos")
            .select("id, project_id, storage_path, phase, caption")
            .in("project_id", projectIds)
            .order("created_at", { ascending: false })
            .limit(30),
          supabase
            .from("service_tickets")
            .select("id, project_id, ticket_no, problem, status, reported_at")
            .in("project_id", projectIds)
            .order("reported_at", { ascending: false }),
        ])
      : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }];

  const signedPhotos = photos?.length
    ? await supabase.storage
        .from("project-photos")
        .createSignedUrls(photos.map((p) => p.storage_path), 3600)
    : { data: [] };
  const urlByPath = new Map((signedPhotos.data ?? []).map((s) => [s.path, s.signedUrl]));

  return (
    <div className="min-h-dvh bg-brand-yellow/5">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <Image src="/branding/logo.svg" alt="Ensolar" width={30} height={30} />
            <div>
              <p className="text-sm font-bold leading-tight text-gray-900">Ensolar Solutions</p>
              <p className="text-[10px] leading-tight text-gray-500">Customer Portal</p>
            </div>
          </div>
          <form action={signOut}>
            <button className="text-sm font-medium text-gray-500">Sign out</button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-4 p-4 pb-16">
        <p className="text-sm text-gray-700">
          Welcome, <span className="font-semibold">{profile.name || "Customer"}</span>
        </p>

        {announcements?.map((a) => (
          <div key={a.id} className="rounded-xl border border-brand-yellow bg-brand-yellow/15 px-4 py-3">
            <p className="text-sm font-bold text-gray-900">📣 {a.title}</p>
            {a.body && <p className="mt-0.5 text-sm text-gray-700">{a.body}</p>}
          </div>
        ))}

        {paidParam === "1" && (
          <p className="rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
            ✓ Payment received — thank you! Your balance has been updated and
            the receipt is in your payment history below.
          </p>
        )}
        {paidParam === "pending" && (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            Your payment is being confirmed. If the balance does not update in
            a few minutes, please call (035) 531-6455.
          </p>
        )}
        {paidParam === "0" && (
          <p className="rounded-xl bg-gray-100 px-4 py-3 text-sm text-gray-600">
            Payment was cancelled. You can try again anytime.
          </p>
        )}

        {!projects?.length && (
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-600">
              No projects yet. For inquiries, call us at (035) 531-6455.
            </p>
          </div>
        )}

        {projects?.map((project) => {
          const projMilestones = (milestones ?? []).filter((m) => m.project_id === project.id);
          const projPayments = (payments ?? []).filter((p) => p.project_id === project.id);
          const projPhotos = (photos ?? []).filter((p) => p.project_id === project.id);
          const projTickets = (tickets ?? []).filter((t) => t.project_id === project.id);
          const paid = projPayments.reduce((s, p) => s + Number(p.amount), 0);
          const balance = Number(project.contract_amount) - paid;

          return (
            <div key={project.id} className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-gray-900">{project.project_no}</p>
                  {project.service_type && (
                    <p className="text-sm text-gray-600">
                      {SERVICE_TYPES[project.service_type as ServiceType]}
                    </p>
                  )}
                  {project.site_address && (
                    <p className="text-xs text-gray-500">📍 {project.site_address}</p>
                  )}
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${STATUS_BADGE[project.status as ProjectStatus]}`}>
                  {PROJECT_STATUSES[project.status as ProjectStatus]}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 rounded-xl bg-gray-50 p-3 text-center">
                <div>
                  <p className="text-[11px] text-gray-500">Contract</p>
                  <p className="text-sm font-bold">{formatPeso(project.contract_amount)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500">Paid</p>
                  <p className="text-sm font-bold text-brand-green-dark">{formatPeso(paid)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500">Balance</p>
                  <p className={`text-sm font-bold ${balance > 0 ? "text-red-600" : "text-gray-900"}`}>
                    {formatPeso(balance)}
                  </p>
                </div>
              </div>

              {Number(project.contract_amount) > 0 && (
                <ProgressBar value={paid} max={Number(project.contract_amount)} />
              )}

              {projMilestones.length > 0 && (
                <div>
                  <p className="mb-1 text-sm font-semibold text-gray-800">Payment schedule</p>
                  <ul className="divide-y divide-gray-100">
                    {projMilestones.map((m) => {
                      const mPaid = projPayments
                        .filter((p) => p.milestone_id === m.id)
                        .reduce((s, p) => s + Number(p.amount), 0);
                      const settled = mPaid >= Number(m.amount) - 0.005;
                      return (
                        <li key={m.id} className="flex items-center justify-between py-2 text-sm">
                          <div>
                            <p className="text-gray-800">{m.label}</p>
                            {m.due_date && (
                              <p className="text-xs text-gray-500">Due {formatDate(m.due_date)}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{formatPeso(m.amount)}</span>
                            {settled ? (
                              <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-800">Paid</span>
                            ) : (
                              <PayButton milestoneId={m.id} />
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  {balance > 0 && (
                    <p className="mt-1 rounded-lg bg-brand-yellow/20 px-3 py-2 text-xs text-gray-700">
                      Pay online with GCash, Maya, or card using the Pay Now
                      buttons — or visit our office / call (035) 531-6455.
                    </p>
                  )}
                </div>
              )}

              {projPayments.length > 0 && (
                <div>
                  <p className="mb-1 text-sm font-semibold text-gray-800">Payment history</p>
                  <ul className="divide-y divide-gray-100">
                    {projPayments.map((p) => (
                      <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                        <span className="text-gray-700">
                          {p.or_no}
                          <span className="ml-2 text-xs text-gray-500">{formatDate(p.received_at)}</span>
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="font-semibold">{formatPeso(p.amount)}</span>
                          <a
                            href={`/api/payments/${p.id}/pdf`}
                            target="_blank"
                            className="rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600"
                          >
                            Receipt
                          </a>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {projPhotos.length > 0 && (
                <div>
                  <p className="mb-1 text-sm font-semibold text-gray-800">Installation photos</p>
                  <div className="grid grid-cols-3 gap-2">
                    {projPhotos.map((p) => {
                      const url = urlByPath.get(p.storage_path);
                      if (!url) return null;
                      return (
                        <a key={p.id} href={url} target="_blank">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt={p.caption ?? p.phase}
                            className="aspect-square w-full rounded-lg object-cover"
                            loading="lazy"
                          />
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              {projTickets.length > 0 && (
                <div>
                  <p className="mb-1 text-sm font-semibold text-gray-800">Service requests</p>
                  <ul className="divide-y divide-gray-100">
                    {projTickets.map((t) => (
                      <li key={t.id} className="py-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-800">{t.ticket_no}</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              t.status === "resolved"
                                ? "bg-green-100 text-green-800"
                                : t.status === "in_progress"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-red-100 text-red-700"
                            }`}
                          >
                            {t.status === "resolved" ? "Resolved" : t.status === "in_progress" ? "In Progress" : "Open"}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-gray-500">
                          {formatDate(t.reported_at)} · {t.problem}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <RequestServiceForm projectId={project.id} />
            </div>
          );
        })}

        <p className="text-center text-xs text-gray-400">
          Ensolar Solutions Installation Services · 19 Espina Road, Taclobo,
          Dumaguete City · (035) 531-6455
        </p>
      </main>
    </div>
  );
}
