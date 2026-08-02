import type { Metadata } from "next";
import Link from "next/link";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SERVICE_TYPES, type ServiceType } from "@/lib/crm";
import { formatDate, formatPeso } from "@/lib/format";
import { AddPastProjectForm } from "./add-past-project";

export const metadata: Metadata = { title: "Completed Projects" };

// Archive categories → service types they cover.
const CATEGORIES: { key: string; label: string; types: ServiceType[] }[] = [
  { key: "solar", label: "☀️ Solar", types: ["solar", "solar_pump"] },
  { key: "cctv", label: "📹 CCTV", types: ["cctv"] },
  { key: "electrical", label: "⚡ Electrical", types: ["electrical"] },
  { key: "fdas", label: "🔥 FDAS", types: ["fdas"] },
];

type Row = {
  id: string;
  project_no: string;
  status: string;
  service_type: ServiceType | null;
  completed_date: string | null;
  created_at: string;
  contract_amount: number;
  customers: { name: string } | null;
};

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const profile = await requireRole("owner", "office_staff");
  const { type } = await searchParams;
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from("projects")
    .select(
      "id, project_no, status, service_type, completed_date, created_at, contract_amount, customers (name)",
    )
    .in("status", ["completed", "closed"])
    .order("completed_date", { ascending: false, nullsFirst: false })
    .limit(1000)
    .overrideTypes<Row[]>();

  const all = projects ?? [];
  const categoryOf = (t: ServiceType | null): string =>
    CATEGORIES.find((c) => t !== null && c.types.includes(t))?.key ?? "other";
  const active = CATEGORIES.some((c) => c.key === type) ? type! : "all";
  const filtered = active === "all" ? all : all.filter((p) => categoryOf(p.service_type) === active);

  // Group by completion year (fallback: creation year). Future years simply
  // appear on top as they arrive.
  const byYear = new Map<string, Row[]>();
  for (const p of filtered) {
    const year = (p.completed_date ?? p.created_at).slice(0, 4);
    byYear.set(year, [...(byYear.get(year) ?? []), p]);
  }
  const years = [...byYear.keys()].sort((a, b) => (a < b ? 1 : -1));

  const counts = new Map<string, number>();
  for (const p of all) {
    const k = categoryOf(p.service_type);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }

  const chip = (key: string, label: string, count?: number) => (
    <Link
      key={key}
      href={key === "all" ? "/projects/archive" : `/projects/archive?type=${key}`}
      className={`rounded-full px-3.5 py-2 text-sm font-semibold ${
        active === key
          ? "bg-brand-green text-white"
          : "border border-gray-300 bg-white text-gray-700"
      }`}
    >
      {label}
      {count !== undefined && count > 0 && <span className="ml-1 opacity-70">({count})</span>}
    </Link>
  );

  return (
    <>
      <TopBar title="Completed Projects" backHref="/projects" />
      <div className="space-y-4 p-4">
        <div className="flex flex-wrap gap-2">
          {chip("all", "All", all.length)}
          {CATEGORIES.map((c) => chip(c.key, c.label, counts.get(c.key) ?? 0))}
        </div>

        {profile.role === "owner" && <AddPastProjectForm />}

        {filtered.length === 0 && (
          <p className="pt-6 text-center text-sm text-gray-500">
            No completed projects in this category yet.
          </p>
        )}

        {years.map((year) => {
          const rows = byYear.get(year)!;
          const total = rows.reduce((s, p) => s + Number(p.contract_amount), 0);
          return (
            <div key={year}>
              <div className="mb-2 flex items-baseline justify-between">
                <h2 className="text-lg font-extrabold text-gray-900">{year}</h2>
                <p className="text-xs text-gray-500">
                  {rows.length} project{rows.length === 1 ? "" : "s"}
                  {total > 0 && ` · ${formatPeso(total)}`}
                </p>
              </div>
              <div className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-2 lg:space-y-0 xl:grid-cols-3">
                {rows.map((p) => (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}`}
                    className="block rounded-xl border border-gray-200 bg-white p-3.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-gray-900">
                          {p.customers?.name ?? "—"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {p.project_no}
                          {p.service_type && ` · ${SERVICE_TYPES[p.service_type]}`}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-gray-400">
                        {p.completed_date ? formatDate(p.completed_date) : "—"}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
