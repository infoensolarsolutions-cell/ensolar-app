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
  await requireRole("owner", "office_staff");
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: q }, { data: products }] = await Promise.all([
    supabase
      .from("quotations")
      .select(
        "id, quote_no, status, valid_until, terms, discount, quotation_items (product_id, description, qty, unit_price, sort_order)",
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
  if (q.status !== "draft") redirect(`/quotations/${id}`);

  const items = [...q.quotation_items]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(({ product_id, description, qty, unit_price }) => ({
      product_id,
      description,
      qty,
      unit_price,
    }));

  return (
    <>
      <TopBar title={`Edit ${q.quote_no}`} />
      <QuotationBuilder
        products={products ?? []}
        quotation={{
          id: q.id,
          valid_until: q.valid_until,
          terms: q.terms,
          discount: q.discount,
          items,
        }}
      />
    </>
  );
}
