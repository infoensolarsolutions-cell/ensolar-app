import type { Metadata } from "next";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getActiveBranch, getBranches } from "@/lib/branch";
import type { ProjectStatus, ServiceType } from "@/lib/crm";
import { ProjectsList, type ProjectListRow } from "./projects-list";

export const metadata: Metadata = { title: "Projects" };

type ProjectRow = {
  id: string;
  project_no: string;
  status: ProjectStatus;
  service_type: ServiceType | null;
  site_address: string | null;
  contract_amount: number;
  customers: { name: string } | null;
};

export default async function ProjectsPage() {
  // RLS scopes technicians to their assigned projects automatically.
  const profile = await requireRole("owner", "office_staff", "technician");
  const isStaff = ["owner", "office_staff"].includes(profile.role);
  const supabase = await createClient();

  const activeBranch = await getActiveBranch(await getBranches(supabase));
  let projectsQuery = supabase
    .from("projects")
    .select("id, project_no, status, service_type, site_address, contract_amount, customers (name)")
    .order("created_at", { ascending: false })
    .limit(500);
  if (activeBranch !== "all") projectsQuery = projectsQuery.eq("branch_id", activeBranch);
  const { data: projects } = await projectsQuery.overrideTypes<ProjectRow[]>();

  const rows: ProjectListRow[] = (projects ?? []).map((p) => ({
    id: p.id,
    project_no: p.project_no,
    status: p.status,
    service_type: p.service_type,
    site_address: p.site_address,
    contract_amount: Number(p.contract_amount),
    customer_name: p.customers?.name ?? null,
  }));

  return (
    <>
      <TopBar title="Projects" />
      <ProjectsList projects={rows} isStaff={isStaff} />
    </>
  );
}
