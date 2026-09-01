import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { TopBar } from "@/components/top-bar";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/format";
import { band, totalFor, type KpiScore } from "@/lib/kpi";
import { NewEvaluationForm } from "./new-form";

export const metadata: Metadata = { title: "KPI Evaluations" };

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "bg-gray-100 text-gray-600" },
  supervisor_done: { label: "Awaiting manager", cls: "bg-amber-100 text-amber-800" },
  final: { label: "Final", cls: "bg-green-100 text-green-800" },
};

type EvalRow = {
  id: string;
  employee_name: string;
  employee_position: string | null;
  period: string;
  supervisor_name: string | null;
  supervisor_employee_id: string | null;
  supervisor2_employee_id: string | null;
  status: string;
  scores: KpiScore[];
  created_at: string;
};

export default async function KpiListPage() {
  const profile = await getProfile();
  if (!profile || profile.role === "customer") redirect("/login");
  const isStaff = ["owner", "office_staff"].includes(profile.role);
  const supabase = await createClient();

  // Which employee records belong to this login (to flag "you rate this").
  const admin = createAdminClient();
  const { data: myEmployees } = await admin
    .from("employees")
    .select("id")
    .eq("profile_id", profile.id);
  const myIds = new Set((myEmployees ?? []).map((e) => e.id));

  const [{ data: evaluations }, { data: employees }] = await Promise.all([
    supabase
      .from("kpi_evaluations")
      .select("id, employee_name, employee_position, period, supervisor_name, supervisor_employee_id, supervisor2_employee_id, status, scores, created_at")
      .order("created_at", { ascending: false })
      .limit(200)
      .overrideTypes<EvalRow[]>(),
    supabase.rpc("employee_directory"),
  ]);

  return (
    <>
      <TopBar title={isStaff ? "KPI Evaluations" : "My KPI Evaluations"} backHref="/more" />
      <div className="space-y-4 p-4">
        {isStaff && (
          <NewEvaluationForm
            employees={(employees ?? []) as { id: string; name: string; employee_position: string | null }[]}
          />
        )}

        {!evaluations?.length && (
          <p className="pt-6 text-center text-sm text-gray-500">
            {isStaff
              ? "No evaluations yet. Start one above."
              : "Nothing here yet — your own evaluations and the ones you rate as supervisor will appear."}
          </p>
        )}

        <div className="space-y-3 lg:grid lg:grid-cols-2 lg:items-start lg:gap-3 lg:space-y-0 xl:grid-cols-3">
          {evaluations?.map((ev) => {
            const status = STATUS_LABELS[ev.status] ?? STATUS_LABELS.draft;
            const mgrTotal = totalFor(ev.scores, "mgr");
            const iRate =
              (!!ev.supervisor_employee_id && myIds.has(ev.supervisor_employee_id)) ||
              (!!ev.supervisor2_employee_id && myIds.has(ev.supervisor2_employee_id));
            return (
              <Link
                key={ev.id}
                href={`/kpi/${ev.id}`}
                className="block rounded-xl border border-gray-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900">{ev.employee_name}</p>
                    <p className="text-xs text-gray-500">
                      {ev.employee_position ?? "—"} · {ev.period}
                    </p>
                  </div>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status.cls}`}>
                      {status.label}
                    </span>
                    {iRate && ev.status === "draft" && (
                      <span className="rounded-full bg-brand-green/10 px-2.5 py-0.5 text-[10px] font-bold text-brand-green-dark">
                        ⭐ you rate this
                      </span>
                    )}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                  <span>
                    {ev.supervisor_name ? `Supervisor: ${ev.supervisor_name}` : formatDate(ev.created_at)}
                  </span>
                  {ev.status === "final" && (
                    <span className="font-bold text-brand-green-dark">
                      {mgrTotal} · {band(mgrTotal)}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
