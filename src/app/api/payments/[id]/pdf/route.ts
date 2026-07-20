import { createElement } from "react";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ReceiptPdf, type ReceiptPdfData } from "@/lib/pdf/receipt-doc";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "Not allowed" }, { status: 403 });

  const { id } = await params;
  const supabase = await createClient();
  // RLS scopes this: staff see all, customers only their own payments.
  const { data: p } = await supabase
    .from("payments")
    .select(
      "or_no, amount, method, provider_ref, received_at, projects (project_no, customers (name)), payment_milestones (label), profiles:received_by (name)",
    )
    .eq("id", id)
    .single();

  if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const project = Array.isArray(p.projects) ? p.projects[0] : p.projects;
  const customer = project
    ? Array.isArray(project.customers) ? project.customers[0] : project.customers
    : null;
  const milestone = Array.isArray(p.payment_milestones) ? p.payment_milestones[0] : p.payment_milestones;
  const receiver = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;

  const data: ReceiptPdfData = {
    or_no: p.or_no,
    received_at: p.received_at,
    customer_name: customer?.name ?? "",
    project_no: project?.project_no ?? null,
    milestone_label: milestone?.label ?? null,
    amount: Number(p.amount),
    method: p.method,
    provider_ref: p.provider_ref,
    received_by: receiver?.name ?? "Ensolar Solutions",
  };

  const doc = createElement(ReceiptPdf, { data }) as Parameters<typeof renderToBuffer>[0];
  const buffer = await renderToBuffer(doc);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${p.or_no}.pdf"`,
    },
  });
}
