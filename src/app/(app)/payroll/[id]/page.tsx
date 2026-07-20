import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatPeso, todayManila } from "@/lib/format";
import { RunControls, SlipRow } from "./run-view";

export const metadata: Metadata = { title: "Payroll Run" };

export default async function PayrollRunPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("owner");
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: run }, { data: slips }] = await Promise.all([
    supabase
      .from("payroll_runs")
      .select("id, period_start, period_end, status")
      .eq("id", id)
      .single(),
    supabase
      .from("payslips")
      .select("id, days_worked, gross, ot_hours, ot_pay, sss, philhealth, pagibig, tax, advance_deduction, net, employees (id, name, position)")
      .eq("run_id", id),
  ]);
  if (!run) notFound();

  const rows = (slips ?? [])
    .map((s) => {
      const emp = Array.isArray(s.employees) ? s.employees[0] : s.employees;
      return {
        id: s.id,
        name: emp?.name ?? "?",
        position: emp?.position ?? null,
        days_worked: Number(s.days_worked),
        gross: Number(s.gross),
        ot_hours: Number(s.ot_hours ?? 0),
        ot_pay: Number(s.ot_pay ?? 0),
        sss: Number(s.sss),
        philhealth: Number(s.philhealth),
        pagibig: Number(s.pagibig),
        tax: Number(s.tax),
        advance_deduction: Number(s.advance_deduction),
        net: Number(s.net),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const totals = rows.reduce(
    (t, r) => ({
      gross: t.gross + r.gross,
      deductions: t.deductions + r.sss + r.philhealth + r.pagibig + r.tax + r.advance_deduction,
      net: t.net + r.net,
    }),
    { gross: 0, deductions: 0, net: 0 },
  );

  return (
    <>
      <TopBar title="Payroll Run" backHref="/payroll" />
      <div className="space-y-4 p-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <p className="font-bold text-gray-900">
              {formatDate(run.period_start)} – {formatDate(run.period_end)}
            </p>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                run.status === "finalized"
                  ? "bg-green-100 text-green-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {run.status === "finalized" ? "FINALIZED" : "DRAFT"}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
            <div>
              <p className="text-xs text-gray-500">Gross</p>
              <p className="font-bold">{formatPeso(totals.gross)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Deductions</p>
              <p className="font-bold text-red-600">{formatPeso(totals.deductions)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Net payout</p>
              <p className="font-bold text-brand-green-dark">{formatPeso(totals.net)}</p>
            </div>
          </div>
        </div>

        {run.status === "draft" && (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800">
            Draft — review each row, set cash-advance deductions if any, then
            finalize. Finalizing locks the run and records advance repayments.
            If you add or correct attendance after computing, tap “Recompute”
            below to refresh the figures.
          </p>
        )}
        {run.status === "draft" && run.period_end >= todayManila() && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
            ⚠️ This week is not finished yet — attendance may still come in.
            Recompute before finalizing.
          </p>
        )}

        <div className="space-y-3">
          {rows.map((r) => (
            <SlipRow key={r.id} slip={r} runId={run.id} draft={run.status === "draft"} />
          ))}
        </div>

        <RunControls runId={run.id} status={run.status} />
      </div>
    </>
  );
}
