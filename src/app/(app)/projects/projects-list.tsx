"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PROJECT_STATUSES, SERVICE_TYPES, type ProjectStatus, type ServiceType } from "@/lib/crm";
import { formatPeso } from "@/lib/format";

const BADGE: Record<ProjectStatus, string> = {
  pending: "bg-gray-100 text-gray-700",
  ongoing: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-800",
  closed: "bg-gray-200 text-gray-500",
};

export type ProjectListRow = {
  id: string;
  project_no: string;
  status: ProjectStatus;
  service_type: ServiceType | null;
  site_address: string | null;
  contract_amount: number;
  customer_name: string | null;
};

export function ProjectsList({
  projects,
  isStaff,
}: {
  projects: ProjectListRow[];
  isStaff: boolean;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) =>
      [
        p.project_no,
        p.customer_name ?? "",
        p.site_address ?? "",
        p.service_type ? SERVICE_TYPES[p.service_type] : "",
        PROJECT_STATUSES[p.status],
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [projects, query]);

  return (
    <>
      <div className="px-4 pt-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="🔍 Search by project no., customer, address, type…"
          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30"
        />
        {query && (
          <p className="mt-1 text-xs text-gray-500">
            {filtered.length} of {projects.length} projects match &ldquo;{query}&rdquo;
          </p>
        )}
      </div>

      <div className="space-y-3 p-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-3 lg:space-y-0 xl:grid-cols-3">
        {isStaff && !query && (
          <Link
            href="/projects/archive"
            className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 lg:col-span-full"
          >
            <span className="text-sm font-semibold text-gray-700">
              📁 Completed Projects Archive — by year & category
            </span>
            <span className="text-gray-400">›</span>
          </Link>
        )}
        {!projects.length && (
          <p className="pt-8 text-center text-sm text-gray-500 lg:col-span-full">
            No projects yet. Projects are created when a quotation is accepted.
          </p>
        )}
        {projects.length > 0 && !filtered.length && (
          <p className="pt-8 text-center text-sm text-gray-500 lg:col-span-full">
            No projects match &ldquo;{query}&rdquo;.
          </p>
        )}
        {filtered.map((p) => (
          <Link
            key={p.id}
            href={`/projects/${p.id}`}
            className="block rounded-xl border border-gray-200 bg-white p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-gray-900">{p.project_no}</p>
                <p className="text-sm text-gray-600">{p.customer_name}</p>
                {p.service_type && (
                  <p className="text-xs text-gray-500">{SERVICE_TYPES[p.service_type]}</p>
                )}
              </div>
              <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${BADGE[p.status]}`}>
                {PROJECT_STATUSES[p.status]}
              </span>
            </div>
            {isStaff && (
              <p className="mt-2 text-right text-sm font-bold text-gray-900">
                {formatPeso(p.contract_amount)}
              </p>
            )}
          </Link>
        ))}
      </div>
    </>
  );
}
