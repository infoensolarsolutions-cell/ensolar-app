import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dateLongManila, fillPlaceholders } from "@/lib/contract";
import { ContractEditor } from "@/app/(app)/contracts/contract-editor";

export const metadata: Metadata = { title: "Site Inspection Certificate" };

const BLANK = "__________________________________________";

// Pre-sale Certificate of Site Inspection & Technical Assessment (CSI-),
// generated from the LEAD — the inspection happens before any project
// exists, in support of the customer's solar PV loan application.
export default async function NewLeadInspectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("owner", "office_staff");
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: lead }, { data: template }] = await Promise.all([
    supabase
      .from("leads")
      .select("id, customers (name, address, barangay)")
      .eq("id", id)
      .single(),
    supabase
      .from("doc_templates")
      .select("body")
      .eq("key", "site_inspection_certificate")
      .single(),
  ]);
  if (!lead) notFound();
  if (!template) {
    return (
      <>
        <TopBar title="Site Inspection Certificate" backHref={`/leads/${id}`} />
        <p className="p-4 text-sm text-red-600">
          Template not found — run the latest database migration (0059) first.
        </p>
      </>
    );
  }

  const customer = Array.isArray(lead.customers) ? lead.customers[0] : lead.customers;
  const address =
    [customer?.address, customer?.barangay].filter(Boolean).join(", ") || BLANK;

  const body = fillPlaceholders(template.body, {
    DATE_LONG: dateLongManila(),
    CUSTOMER_NAME: customer?.name ?? BLANK,
    CUSTOMER_ADDRESS: address,
    BANK_NAME: "Dumaguete Cathedral Credit Cooperative (DCCCO)",
  });

  return (
    <>
      <TopBar
        title={`Site Inspection — ${customer?.name ?? "Lead"}`}
        backHref={`/leads/${id}`}
      />
      <ContractEditor leadId={lead.id} initialBody={body} docType="inspection" />
    </>
  );
}
