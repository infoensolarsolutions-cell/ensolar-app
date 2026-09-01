import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { QuotationBuilder, type ProductOption } from "../../builder";

export const metadata: Metadata = { title: "Edit Quotation" };

export default async function EditQuotationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireRole("owner", "office_staff");
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: q }, { data: products }] = await Promise.all([
    supabase
      .from("quotations")
      .select(
        "id, quote_no, status, valid_until, terms, discount, project_name, site_location, revision_no, revision_date, quotation_items (product_id, description, qty, unit, unit_price, sort_order)",
      )
      .eq("id", id)
      .single(),
    supabase
      .from("products")
      .select("id, sku, name, unit, selling_price")
      .eq("active", true)
      .order("name")
      .overrideTypes<ProductOption[]>(),
  ]);

  if (!q) notFound();
  // Sent quotations stay editable (saving bumps the revision); accepted
  // ones are owner-only since saving updates the project contract amount.
  const editable =
    ["draft", "sent"].includes(q.status) ||
    (q.status === "accepted" && profile.role === "owner");
  if (!editable) redirect(`/quotations/${id}`);

  const items = [...q.quotation_items]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(({ product_id, description, qty, unit, unit_price }) => ({
      product_id,
      description,
      qty,
      unit,
      unit_price,
    }));

  return (
    <>
      <TopBar title={`Edit ${q.quote_no}`} backHref={`/quotations/${id}`} />
      <QuotationBuilder
        products={products ?? []}
        isRevision={q.status !== "draft"}
        quotation={{
          id: q.id,
          valid_until: q.valid_until,
          terms: q.terms,
          discount: q.discount,
          project_name: q.project_name,
          site_location: q.site_location,
          revision_no: q.revision_no,
          revision_date: q.revision_date,
          items,
        }}
      />
    </>
  );
}
