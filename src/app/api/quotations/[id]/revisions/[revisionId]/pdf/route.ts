import { createElement } from "react";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { QuotationPdf, type QuotationPdfData } from "@/lib/pdf/quotation-doc";
import { getSignature } from "@/lib/signature";

// PDF of an ARCHIVED quotation revision, rendered from the snapshot taken
// when the revision was superseded — same layout as the live quotation PDF.

type SnapshotItem = {
  description: string;
  qty: number;
  unit: string | null;
  unit_price: number;
  line_total: number;
};

type Snapshot = {
  quote_no: string;
  project_name: string | null;
  site_location: string | null;
  valid_until: string | null;
  terms: string | null;
  discount: number;
  subtotal: number;
  total: number;
  items: SnapshotItem[];
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; revisionId: string }> },
) {
  const profile = await getProfile();
  if (!profile || !["owner", "office_staff"].includes(profile.role)) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const { id, revisionId } = await params;
  const supabase = await createClient();

  const [{ data: rev }, { data: q }] = await Promise.all([
    supabase
      .from("quotation_revisions")
      .select("revision_no, revision_date, snapshot")
      .eq("id", revisionId)
      .eq("quotation_id", id)
      .single(),
    supabase
      .from("quotations")
      .select("quote_no, created_at, created_by, customers (name, phone, address, barangay), profiles:created_by (name)")
      .eq("id", id)
      .single(),
  ]);

  if (!rev || !q) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const snap = rev.snapshot as Snapshot;
  const customer = Array.isArray(q.customers) ? q.customers[0] : q.customers;
  const preparedBy = Array.isArray(q.profiles) ? q.profiles[0] : q.profiles;

  const data: QuotationPdfData = {
    quote_no: snap.quote_no ?? q.quote_no,
    created_at: q.created_at,
    valid_until: snap.valid_until,
    project_name: snap.project_name,
    site_location: snap.site_location,
    revision_no: rev.revision_no,
    revision_date: rev.revision_date,
    customer: {
      name: customer?.name ?? "",
      phone: customer?.phone,
      address: [customer?.address, customer?.barangay].filter(Boolean).join(", "),
    },
    items: (snap.items ?? []).map(
      ({ description, qty, unit, unit_price, line_total }) => ({
        description, qty, unit, unit_price, line_total,
      }),
    ),
    subtotal: snap.subtotal,
    discount: snap.discount,
    total: snap.total,
    terms: snap.terms,
    prepared_by: preparedBy?.name ?? "Ensolar Solutions",
    signature: await getSignature(q.created_by),
  };

  const doc = createElement(QuotationPdf, { data }) as Parameters<
    typeof renderToBuffer
  >[0];
  const buffer = await renderToBuffer(doc);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${q.quote_no}-Rev${rev.revision_no}.pdf"`,
    },
  });
}
