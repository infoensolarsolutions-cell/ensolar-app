import type { Metadata } from "next";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PROJECT_STATUSES, type ProjectStatus } from "@/lib/crm";
import {
  EquipmentView,
  type EquipmentRow,
  type ProjectOption,
} from "./equipment-view";

export const metadata: Metadata = { title: "Equipment Registry" };

type UnitRecord = Omit<EquipmentRow, "project_no" | "customer_name"> & {
  projects: { project_no: string; customers: { name: string } | { name: string }[] | null } | null;
};

// Serial-number registry: who supplied each unit (for tech support) and
// which project it went to. Staff manage; technicians read in the field.
export default async function EquipmentPage() {
  const profile = await requireRole("owner", "office_staff", "technician");
  const isStaff = ["owner", "office_staff"].includes(profile.role);
  const supabase = await createClient();

  const [{ data: units }, { data: projects }] = await Promise.all([
    supabase
      .from("equipment_units")
      .select(
        "id, equipment_type, brand, model, serial_no, supplier, supplier_contact, purchase_date, project_id, issued_date, notes, projects (project_no, customers (name))",
      )
      .order("created_at", { ascending: false })
      .limit(1000)
      .overrideTypes<UnitRecord[]>(),
    isStaff
      ? supabase
          .from("projects")
          .select("id, project_no, status, customers (name)")
          .order("created_at", { ascending: false })
          .limit(300)
      : Promise.resolve({ data: [] }),
  ]);

  const rows: EquipmentRow[] = (units ?? []).map((u) => {
    const project = Array.isArray(u.projects) ? u.projects[0] : u.projects;
    const customer = project
      ? Array.isArray(project.customers)
        ? project.customers[0]
        : project.customers
      : null;
    return {
      id: u.id,
      equipment_type: u.equipment_type,
      brand: u.brand,
      model: u.model,
      serial_no: u.serial_no,
      supplier: u.supplier,
      supplier_contact: u.supplier_contact,
      purchase_date: u.purchase_date,
      project_id: u.project_id,
      issued_date: u.issued_date,
      notes: u.notes,
      project_no: project?.project_no ?? null,
      customer_name: customer?.name ?? null,
    };
  });

  const projectOptions: ProjectOption[] = ((projects ?? []) as {
    id: string;
    project_no: string;
    status: string;
    customers: { name: string } | { name: string }[] | null;
  }[]).map((p) => {
    const customer = Array.isArray(p.customers) ? p.customers[0] : p.customers;
    return {
      id: p.id,
      label: `${p.project_no} — ${customer?.name ?? "?"} (${PROJECT_STATUSES[p.status as ProjectStatus] ?? p.status})`,
    };
  });

  return (
    <>
      <TopBar title="Equipment Registry" />
      <EquipmentView
        rows={rows}
        projects={projectOptions}
        isStaff={isStaff}
        isOwner={profile.role === "owner"}
      />
    </>
  );
}
