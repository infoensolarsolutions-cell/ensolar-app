import type { Metadata } from "next";
import Link from "next/link";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SERVICE_TYPES, LEAD_STATUSES, type LeadStatus, type ServiceType } from "@/lib/crm";
import { QuotationBuilder, type ProductOption, type QuotationTemplate } from "../builder";

export const metadata: Metadata = { title: "New Quotation" };

type PickerLead = {
  id: string;
  status: LeadStatus;
  service_type: ServiceType;
  customers: { name: string } | null;
};

export default async function NewQuotationPage({
  searchParams,
}: {
  searchParams: Promise<{ lead?: string }>;
}) {
  await requireRole("owner", "office_staff");
  const { lead: leadId } = await searchParams;
  const supabase = await createClient();

  if (!leadId) {
    // Pick which lead this quotation is for.
    const { data: leads } = await supabase
      .from("leads")
      .select("id, status, service_type, customers (name)")
      .not("status", "in", "(won,lost)")
      .order("updated_at", { ascending: false })
      .limit(50)
      .overrideTypes<PickerLead[]>();

    return (
      <>
        <TopBar title="New Quotation" backHref="/quotations" />
        <div className="space-y-3 p-4">
          <p className="text-sm text-gray-600">
            Which lead is this quotation for?
          </p>
          {!leads?.length && (
            <p className="pt-4 text-center text-sm text-gray-500">
              No active leads.{" "}
              <Link href="/leads/new" className="font-medium text-brand-green-dark underline">
                Add a lead first
              </Link>
              .
            </p>
          )}
          {leads?.map((lead) => (
            <Link
              key={lead.id}
              href={`/quotations/new?lead=${lead.id}`}
              className="block rounded-xl border border-gray-200 bg-white p-4"
            >
              <p className="font-semibold text-gray-900">{lead.customers?.name}</p>
              <p className="text-sm text-gray-600">
                {SERVICE_TYPES[lead.service_type]} · {LEAD_STATUSES[lead.status]}
              </p>
            </Link>
          ))}
        </div>
      </>
    );
  }

  const [{ data: lead }, { data: products }, { data: templates }] = await Promise.all([
    supabase
      .from("leads")
      .select("id, service_type, customers (name)")
      .eq("id", leadId)
      .single()
      .overrideTypes<PickerLead>(),
    supabase
      .from("products")
      .select("id, sku, name, unit, selling_price")
      .eq("active", true)
      .order("name")
      .overrideTypes<ProductOption[]>(),
    supabase
      .from("quotation_templates")
      .select("id, name, items, terms")
      .order("name")
      .overrideTypes<QuotationTemplate[]>(),
  ]);

  if (!lead) {
    return (
      <>
        <TopBar title="New Quotation" backHref="/quotations" />
        <p className="p-4 text-sm text-red-600">Lead not found.</p>
      </>
    );
  }

  return (
    <>
      <TopBar title="New Quotation" backHref="/quotations" />
      <div className="border-b border-gray-100 bg-white px-4 py-3">
        <p className="font-semibold text-gray-900">{lead.customers?.name}</p>
        <p className="text-sm text-gray-600">{SERVICE_TYPES[lead.service_type]}</p>
      </div>
      <QuotationBuilder
        products={products ?? []}
        leadId={lead.id}
        templates={templates ?? []}
      />
    </>
  );
}
