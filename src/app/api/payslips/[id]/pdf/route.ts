import { createElement } from "react";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PayslipPdf, type PayslipPdfData } from "@/lib/pdf/payslip-doc";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "Not allowed" }, { status: 403 });

  const { id } = await params;
  const supabase = await createClient();
  // RLS: owner sees all; employees only their own payslips.
  const { data: slip } = await supabase
    .from("payslips")
    .select(
      "days_worked, gross, sss, philhealth, pagibig, tax, advance_deduction, net, detail, employees (name, position), payroll_runs (period_start, period_end)",
    )
    .eq("id", id)
    .single();
  if (!slip) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const emp = Array.isArray(slip.employees) ? slip.employees[0] : slip.employees;
  const run = Array.isArray(slip.payroll_runs) ? slip.payroll_runs[0] : slip.payroll_runs;
  const detail = (slip.detail ?? {}) as { rate?: number; rate_type?: string };

  const data: PayslipPdfData = {
    employee_name: emp?.name ?? "",
    position: emp?.position ?? null,
    period_start: run?.period_start ?? "",
    period_end: run?.period_end ?? "",
    rate: Number(detail.rate ?? 0),
    rate_type: detail.rate_type ?? "daily",
    days_worked: Number(slip.days_worked),
    gross: Number(slip.gross),
    sss: Number(slip.sss),
    philhealth: Number(slip.philhealth),
    pagibig: Number(slip.pagibig),
    tax: Number(slip.tax),
    advance_deduction: Number(slip.advance_deduction),
    net: Number(slip.net),
  };

  const doc = createElement(PayslipPdf, { data }) as Parameters<typeof renderToBuffer>[0];
  const buffer = await renderToBuffer(doc);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="payslip-${data.employee_name.replaceAll(" ", "-")}.pdf"`,
    },
  });
}
