import { createElement } from "react";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PosReceiptPdf, type PosReceiptData } from "@/lib/pdf/pos-receipt-doc";

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
  const { data: sale } = await supabase
    .from("pos_sales")
    .select("sale_no, lines, subtotal, discount, total, payment_method, provider_ref, sold_at, profiles:sold_by (name)")
    .eq("id", id)
    .single();
  if (!sale) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const seller = Array.isArray(sale.profiles) ? sale.profiles[0] : sale.profiles;
  const data: PosReceiptData = {
    sale_no: sale.sale_no,
    sold_at: sale.sold_at,
    lines: sale.lines,
    subtotal: Number(sale.subtotal),
    discount: Number(sale.discount),
    total: Number(sale.total),
    payment_method: sale.payment_method,
    provider_ref: sale.provider_ref,
    sold_by: seller?.name ?? "Ensolar Solutions",
  };

  const doc = createElement(PosReceiptPdf, { data }) as Parameters<typeof renderToBuffer>[0];
  const buffer = await renderToBuffer(doc);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${sale.sale_no}.pdf"`,
    },
  });
}
