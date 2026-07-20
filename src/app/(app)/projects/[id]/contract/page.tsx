import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fillTemplate, type ContractData } from "@/lib/contract";
import { formatDate, pesoInWords } from "@/lib/format";
import { SERVICE_TYPES, type ServiceType } from "@/lib/crm";
import { ContractEditor } from "@/app/(app)/contracts/contract-editor";

export const metadata: Metadata = { title: "New Contract" };

export default async function NewContractPage({
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
      .select(
        "id, project_no, service_type, site_address, contract_amount, customers (name, address, barangay), quotations (quote_no, created_at, quotation_items (description, qty, sort_order)), payment_milestones (label, amount, sort_order)",
      )
      .eq("id", id)
      .single(),
    supabase.from("doc_templates").select("body").eq("key", "solar_contract").single(),
  ]);

  if (!project) notFound();
  if (!template) {
    return (
      <>
        <TopBar title="New Contract" backHref={`/projects/${id}`} />
        <p className="p-4 text-sm text-red-600">
          Contract template not found — run the latest database migration first.
        </p>
      </>
    );
  }

  const customer = Array.isArray(project.customers) ? project.customers[0] : project.customers;
  const quotation = Array.isArray(project.quotations) ? project.quotations[0] : project.quotations;

  const address =
    project.site_address ||
    [customer?.address, customer?.barangay].filter(Boolean).join(", ") ||
    "________________";

  const equipment = (quotation?.quotation_items ?? [])
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((i) => `${i.description}\nQuantity: ${Number(i.qty)}`)
    .join("\n\n") || "(describe the equipment here)";

  const schedule = (project.payment_milestones ?? [])
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((m) => {
      const words = pesoInWords(Number(m.amount)).toUpperCase();
      const figures = Number(m.amount).toLocaleString("en-PH", {
        minimumFractionDigits: 2, maximumFractionDigits: 2,
      });
      return `The Second Party agreed to pay the ${m.label} in the amount of ${words} (Php ${figures}).`;
    })
    .join("\n\n") || "(define the payment scheme here)";

  const serviceLabel = project.service_type
    ? SERVICE_TYPES[project.service_type as ServiceType]
    : "Solar PV System";

  const data: ContractData = {
    customer_name: customer?.name ?? "________________",
    customer_address: address,
    system_description: `${serviceLabel} Package per Quotation ${quotation?.quote_no ?? ""}`,
    system_short: serviceLabel,
    equipment_list: equipment,
    quote_no: quotation?.quote_no ?? "________",
    quote_date: quotation?.created_at ? formatDate(quotation.created_at) : "________",
    total: Number(project.contract_amount),
    payment_schedule: schedule,
    signing_place: address,
  };

  const body = fillTemplate(template.body, data);

  return (
    <>
      <TopBar title={`Contract — ${project.project_no}`} backHref={`/projects/${id}`} />
      <ContractEditor projectId={project.id} initialBody={body} />
    </>
  );
}
