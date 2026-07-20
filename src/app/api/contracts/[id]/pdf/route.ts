import { createElement } from "react";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ContractPdf } from "@/lib/pdf/contract-doc";

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
  const { data: contract } = await supabase
    .from("contracts")
    .select("contract_no, body")
    .eq("id", id)
    .single();
  if (!contract) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const doc = createElement(ContractPdf, {
    contractNo: contract.contract_no,
    body: contract.body,
  }) as Parameters<typeof renderToBuffer>[0];
  const buffer = await renderToBuffer(doc);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${contract.contract_no}.pdf"`,
    },
  });
}
