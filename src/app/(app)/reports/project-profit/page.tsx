import type { Metadata } from "next";
import Link from "next/link";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatPeso } from "@/lib/format";
import { PROJECT_STATUSES, type ProjectStatus } from "@/lib/crm";
import {
  overheadRate,
  PROJECT_MARGIN_DANGER,
  PROJECT_MARGIN_HEALTHY,
} from "@/lib/overhead";

export const metadata: Metadata = { title: "Project Profitability" };

type ProjectRow = {
  id: string;
  project_no: string;
  status: ProjectStatus;
  contract_amount: number;
  completed_date: string | null;
  customers: { name: string } | { name: string }[] | null;
  project_costs: { amount: number }[];
};

export default async function ProjectProfitPage() {
  await requireRole("owner");
  const supabase = await createClient();

  const [{ data: projects }, overhead] = await Promise.all([
    supabase
      .from("projects")
      .select(
        "id, project_no, status, contract_amount, completed_date, customers (name), project_costs (amount)",
      )
      .limit(1000)
      .overrideTypes<ProjectRow[]>(),
    overheadRate(supabase),
  ]);

  const rows = (projects ?? [])
    .map((p) => {
      const customer = Array.isArray(p.customers) ? p.customers[0] : p.customers;
      const contract = Number(p.contract_amount);
      const directCosts = (p.project_costs ?? []).reduce(
        (s, c) => s + Number(c.amount),
        0,
      );
      const gross = contract - directCosts;
      const overheadShare = contract * overhead.rate;
      const net = gross - overheadShare;
      const netMargin = contract > 0 ? net / contract : 0;
      return {
        id: p.id,
        project_no: p.project_no,
        status: p.status,
        customer: customer?.name ?? "—",
        contract,
        directCosts,
        gross,
        overheadShare,
        net,
        netMargin,
      };
    })
    .filter((r) => r.contract > 0)
    // Worst margins first — those are the ones to learn from.
    .sort((a, b) => a.netMargin - b.netMargin);

  const totalNet = rows.reduce((s, r) => s + r.net, 0);
  const healthy = rows.filter((r) => r.netMargin >= PROJECT_MARGIN_HEALTHY).length;
  const thin = rows.filter(
    (r) => r.netMargin >= PROJECT_MARGIN_DANGER && r.netMargin < PROJECT_MARGIN_HEALTHY,
  ).length;
  const poor = rows.filter((r) => r.netMargin < PROJECT_MARGIN_DANGER).length;

  return (
    <>
      <TopBar title="Project Profitability" backHref="/more" />
      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-white p-3">
            <p className="text-xs text-gray-500">Net profit — all projects</p>
            <p className={`text-lg font-extrabold ${totalNet >= 0 ? "text-green-800" : "text-red-700"}`}>
              {formatPeso(totalNet)}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-3">
            <p className="text-xs text-gray-500">✅ Healthy (≥20%)</p>
            <p className="text-lg font-extrabold text-green-800">{healthy}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-3">
            <p className="text-xs text-gray-500">⚠️ Thin (5–20%)</p>
            <p className="text-lg font-extrabold text-amber-700">{thin}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-3">
            <p className="text-xs text-gray-500">🚨 Poor (&lt;5%)</p>
            <p className="text-lg font-extrabold text-red-700">{poor}</p>
          </div>
        </div>

        <p className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5 text-xs text-blue-900">
          <span className="font-semibold">How net profit is computed:</span>{" "}
          Contract − direct project costs = gross profit. Then each project is
          charged its share of company overhead (salaries, rent, fuel,
          utilities…) at {(overhead.rate * 100).toFixed(1)}% of its contract —
          the company&apos;s actual overhead rate over the last 12 months
          (expenses {formatPeso(overhead.opex)} ÷ revenue{" "}
          {formatPeso(overhead.revenue)}). Worst margins are listed first so
          you can spot which quotes were priced too low.
        </p>

        {rows.length === 0 && (
          <p className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500">
            No projects with a contract amount yet.
          </p>
        )}

        <ul className="space-y-2">
          {rows.map((r) => {
            const tone =
              r.netMargin >= PROJECT_MARGIN_HEALTHY
                ? { border: "border-green-200", text: "text-green-800", chip: "bg-green-100 text-green-800" }
                : r.netMargin >= PROJECT_MARGIN_DANGER
                  ? { border: "border-amber-200", text: "text-amber-800", chip: "bg-amber-100 text-amber-800" }
                  : { border: "border-red-200", text: "text-red-700", chip: "bg-red-100 text-red-700" };
            return (
              <li key={r.id}>
                <Link
                  href={`/projects/${r.id}`}
                  className={`block rounded-xl border ${tone.border} bg-white p-3`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{r.project_no}</p>
                      <p className="text-xs text-gray-600">{r.customer}</p>
                      <p className="text-[11px] text-gray-400">
                        {PROJECT_STATUSES[r.status]}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-base font-extrabold ${tone.text}`}>
                        {formatPeso(r.net)}
                      </p>
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${tone.chip}`}>
                        {(r.netMargin * 100).toFixed(1)}% net
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-4 gap-1 border-t border-gray-100 pt-2 text-center">
                    <div>
                      <p className="text-[10px] text-gray-400">Contract</p>
                      <p className="text-xs font-semibold">{formatPeso(r.contract)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400">Direct costs</p>
                      <p className="text-xs font-semibold">{formatPeso(r.directCosts)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400">Gross</p>
                      <p className="text-xs font-semibold">{formatPeso(r.gross)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400">Overhead</p>
                      <p className="text-xs font-semibold">− {formatPeso(r.overheadShare)}</p>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
