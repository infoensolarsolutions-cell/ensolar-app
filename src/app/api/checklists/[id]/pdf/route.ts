import { createElement } from "react";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { normalizeItems, type ChecklistItem, type Equipment } from "@/lib/checklists";
import { ChecklistPdf, type ChecklistPdfData } from "@/lib/pdf/checklist-doc";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const profile = await getProfile();
  if (!profile || !["owner", "office_staff", "technician"].includes(profile.role)) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const { id } = await params;
  const supabase = await createClient();
  // RLS scopes this: technicians can only load checklists of assigned projects.
  const { data: checklist } = await supabase
    .from("project_checklists")
    .select(
      "id, title, items, equipment, remarks, completed_at, projects (project_no, site_address, customers (name))",
    )
    .eq("id", id)
    .single();
  if (!checklist) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const project = Array.isArray(checklist.projects)
    ? checklist.projects[0]
    : checklist.projects;
  const customer = project
    ? Array.isArray(project.customers)
      ? project.customers[0]
      : project.customers
    : null;

  const data: ChecklistPdfData = {
    title: checklist.title,
    project_no: project?.project_no ?? "",
    customer_name: customer?.name ?? "",
    site_address: project?.site_address ?? null,
    equipment: (checklist.equipment as Equipment | null) ?? null,
    items: normalizeItems(checklist.items as ChecklistItem[]),
    remarks: checklist.remarks,
    completed_at: checklist.completed_at,
  };

  const doc = createElement(ChecklistPdf, { data }) as Parameters<
    typeof renderToBuffer
  >[0];
  const buffer = await renderToBuffer(doc);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${data.project_no}-checklist.pdf"`,
    },
  });
}
