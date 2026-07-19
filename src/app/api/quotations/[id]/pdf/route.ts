import { createElement } from "react";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { QuotationPdf, type QuotationPdfData } from "@/lib/pdf/quotation-doc";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const profile = await getProfile();
  if (!profile || !["owner", "office_staff"].includes(profile.role)) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const { id } = await params;
  const supabase = await createClient();
  const { data: q } = await supabase
    .from("quotations")
    .select(
      "quote_no, created_at, valid_until, subtotal, discount, total, terms, customers (name, phone, address, barangay), quotation_items (description, qty, unit_price, line_total, sort_order), profiles:created_by (name)",
    )
    .eq("id", id)
    .single();

  if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const customer = Array.isArray(q.customers) ? q.customers[0] : q.customers;
  const preparedBy = Array.isArray(q.profiles) ? q.profiles[0] : q.profiles;

  const data: QuotationPdfData = {
    quote_no: q.quote_no,
    created_at: q.created_at,
    valid_until: q.valid_until,
    customer: {
      name: customer?.name ?? "",
      phone: customer?.phone,
      address: [customer?.address, customer?.barangay].filter(Boolean).join(", "),
    },
    items: [...q.quotation_items]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(({ description, qty, unit_price, line_total }) => ({
        description, qty, unit_price, line_total,
      })),
    subtotal: q.subtotal,
    discount: q.discount,
    total: q.total,
    terms: q.terms,
    prepared_by: preparedBy?.name ?? "Ensolar Solutions",
  };

  const doc = createElement(QuotationPdf, { data }) as Parameters<
    typeof renderToBuffer
  >[0];
  const buffer = await renderToBuffer(doc);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${q.quote_no}.pdf"`,
    },
  });
}
