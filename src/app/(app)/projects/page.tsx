import type { Metadata } from "next";
import Link from "next/link";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PROJECT_STATUSES, SERVICE_TYPES, type ProjectStatus, type ServiceType } from "@/lib/crm";
import { formatPeso } from "@/lib/format";

export const metadata: Metadata = { title: "Projects" };

const BADGE: Record<ProjectStatus, string> = {
  pending: "bg-gray-100 text-gray-700",
  ongoing: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-800",
  closed: "bg-gray-200 text-gray-500",
};

type ProjectRow = {
  id: string;
  project_no: string;
  status: ProjectStatus;
  service_type: ServiceType | null;
  contract_amount: number;
  customers: { name: string } | null;
};

export default async function ProjectsPage() {
  // RLS scopes technicians to their assigned projects automatically.
  await requireRole("owner", "office_staff", "technician");
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("id, project_no, status, service_type, contract_amount, customers (name)")
    .order("created_at", { ascending: false })
    .limit(100)
    .overrideTypes<ProjectRow[]>();

  return (
    <>
      <TopBar title="Projects" />
      <div className="space-y-3 p-4">
        {!projects?.length && (
          <p className="pt-8 text-center text-sm text-gray-500">
            No projects yet. Projects are created when a quotation is accepted.
          </p>
        )}
        {projects?.map((p) => (
          <Link
            key={p.id}
            href={`/projects/${p.id}`}
            className="block rounded-xl border border-gray-200 bg-white p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-gray-900">{p.project_no}</p>
                <p className="text-sm text-gray-600">{p.customers?.name}</p>
                {p.service_type && (
                  <p className="text-xs text-gray-500">{SERVICE_TYPES[p.service_type]}</p>
                )}
              </div>
              <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${BADGE[p.status]}`}>
                {PROJECT_STATUSES[p.status]}
              </span>
            </div>
            <p className="mt-2 text-right text-sm font-bold text-gray-900">
              {formatPeso(p.contract_amount)}
            </p>
          </Link>
        ))}
      </div>
    </>
  );
}
