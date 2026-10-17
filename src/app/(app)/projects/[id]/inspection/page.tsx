import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dateLongManila, fillPlaceholders } from "@/lib/contract";
import { ContractEditor } from "@/app/(app)/contracts/contract-editor";

export const metadata: Metadata = { title: "Site Inspection Certificate" };

const BLANK = "__________________________________________";

// Certificate of Site Inspection & Technical Assessment (CSI-): supports
// the customer's solar PV loan application (DCCCO by default — editable).
export default async function NewInspectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("owner", "office_staff");
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: project }, { data: template }] = await Promise.all([
    supabase
      .from("projects")
      .select("id, project_no, site_address, customers (name, address, barangay)")
      .eq("id", id)
      .single(),
    supabase
      .from("doc_templates")
      .select("body")
      .eq("key", "site_inspection_certificate")
      .single(),
  ]);
  if (!project) notFound();
  if (!template) {
    return (
      <>
        <TopBar title="Site Inspection Certificate" backHref={`/projects/${id}`} />
        <p className="p-4 text-sm text-red-600">
          Template not found — run the latest database migration (0059) first.
        </p>
      </>
    );
  }

  const customer = Array.isArray(project.customers) ? project.customers[0] : project.customers;
  const address =
    project.site_address ||
    [customer?.address, customer?.barangay].filter(Boolean).join(", ") ||
    BLANK;

  const body = fillPlaceholders(template.body, {
    DATE_LONG: dateLongManila(),
    CUSTOMER_NAME: customer?.name ?? BLANK,
    CUSTOMER_ADDRESS: address,
    BANK_NAME: "Dumaguete Cathedral Credit Cooperative (DCCCO)",
  });

  return (
    <>
      <TopBar
        title={`Site Inspection — ${project.project_no}`}
        backHref={`/projects/${id}`}
      />
      <ContractEditor projectId={project.id} initialBody={body} docType="inspection" />
    </>
  );
}
