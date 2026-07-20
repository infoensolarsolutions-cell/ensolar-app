import type { Metadata } from "next";
import Link from "next/link";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { lastCompleteWeekStart } from "@/lib/payroll";
import { formatDate, formatPeso } from "@/lib/format";
import { NewRunForm } from "./new-run-form";

export const metadata: Metadata = { title: "Payroll" };

export default async function PayrollPage() {
  await requireRole("owner");
  const supabase = await createClient();

  const { data: runs } = await supabase
    .from("payroll_runs")
    .select("id, period_start, period_end, status, payslips (net)")
    .order("period_start", { ascending: false })
    .limit(30);

  return (
    <>
      <TopBar title="Payroll (Weekly)" backHref="/more" />
      <div className="space-y-4 p-4">
        <NewRunForm defaultStart={lastCompleteWeekStart()} />

        {!runs?.length && (
          <p className="pt-4 text-center text-sm text-gray-500">No payroll runs yet.</p>
        )}
        {runs?.map((r) => {
          const total = (r.payslips ?? []).reduce(
            (s: number, p: { net: number }) => s + Number(p.net), 0,
          );
          return (
            <Link
              key={r.id}
              href={`/payroll/${r.id}`}
              className="block rounded-xl border border-gray-200 bg-white p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">
                    {formatDate(r.period_start)} – {formatDate(r.period_end)}
                  </p>
                  <p className="text-xs text-gray-500">{r.payslips?.length ?? 0} employees</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{formatPeso(total)}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      r.status === "finalized"
                        ? "bg-green-100 text-green-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {r.status === "finalized" ? "FINALIZED" : "DRAFT"}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
