import type { Metadata } from "next";
import Link from "next/link";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, todayManila } from "@/lib/format";

export const metadata: Metadata = { title: "Personnel Development" };

const TYPE_ICONS: Record<string, string> = {
  training: "🎓", seminar: "📖", certification: "📜", workshop: "🔧", other: "📌",
};

export default async function DevelopmentOverviewPage() {
  await requireRole("owner");
  const supabase = await createClient();
  const today = todayManila();
  const yearStart = `${today.slice(0, 4)}-01-01`;
  const twelveMonthsAgo = (() => {
    const d = new Date(`${today}T12:00:00Z`);
    d.setUTCFullYear(d.getUTCFullYear() - 1);
    return d.toISOString().slice(0, 10);
  })();

  const [{ data: employees }, { data: trainings }] = await Promise.all([
    supabase
      .from("employees")
      .select("id, name, position, active")
      .eq("active", true)
      .order("name"),
    supabase
      .from("employee_trainings")
      .select("employee_id, title, type, date_from, certificate")
      .order("date_from", { ascending: false })
      .limit(2000),
  ]);

  const byEmployee = new Map<string, NonNullable<typeof trainings>>();
  for (const t of trainings ?? []) {
    if (!byEmployee.has(t.employee_id)) byEmployee.set(t.employee_id, []);
    byEmployee.get(t.employee_id)!.push(t);
  }

  const rows = (employees ?? [])
    .map((e) => {
      const mine = byEmployee.get(e.id) ?? [];
      const last = mine[0] ?? null; // newest first from the query
      const status: "never" | "due" | "recent" = !last
        ? "never"
        : last.date_from < twelveMonthsAgo
          ? "due"
          : "recent";
      return {
        id: e.id,
        name: e.name,
        position: e.position as string | null,
        count: mine.length,
        certificates: mine.filter((t) => t.certificate).length,
        last,
        status,
      };
    })
    // Employees needing attention first: never trained, then overdue.
    .sort((a, b) => {
      const rank = { never: 0, due: 1, recent: 2 } as const;
      return (
        rank[a.status] - rank[b.status] ||
        (a.last?.date_from ?? "").localeCompare(b.last?.date_from ?? "")
      );
    });

  const activitiesThisYear = (trainings ?? []).filter((t) => t.date_from >= yearStart).length;
  const covered = rows.filter((r) => r.status === "recent").length;
  const due = rows.length - covered;

  const STATUS_CHIP = {
    never: { label: "Never recorded", cls: "bg-red-100 text-red-700" },
    due: { label: "Over a year ago", cls: "bg-amber-100 text-amber-800" },
    recent: { label: "Up to date", cls: "bg-green-100 text-green-800" },
  } as const;

  return (
    <>
      <TopBar title="Personnel Development" backHref="/employees" />
      <div className="space-y-4 p-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
            <p className="text-xl font-extrabold text-gray-900">{activitiesThisYear}</p>
            <p className="text-[11px] font-medium text-gray-500">activities this year</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
            <p className="text-xl font-extrabold text-brand-green-dark">{covered}</p>
            <p className="text-[11px] font-medium text-gray-500">trained within 12 months</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
            <p className={`text-xl font-extrabold ${due > 0 ? "text-amber-600" : "text-gray-900"}`}>{due}</p>
            <p className="text-[11px] font-medium text-gray-500">due for development</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-1 font-semibold text-gray-900">Team development status</p>
          <p className="mb-2 text-xs text-gray-500">
            Active employees, those needing attention first. Tap a name to
            record an activity on their 201 file.
          </p>
          <ul className="divide-y divide-gray-100">
            {rows.map((r) => {
              const chip = STATUS_CHIP[r.status];
              return (
                <li key={r.id}>
                  <Link href={`/employees/${r.id}`} className="flex items-start justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{r.name}</p>
                      <p className="text-xs text-gray-500">
                        {r.position ?? "—"}
                        {r.count > 0 &&
                          ` · ${r.count} activit${r.count === 1 ? "y" : "ies"} · ${r.certificates} certificate${r.certificates === 1 ? "" : "s"}`}
                      </p>
                      {r.last && (
                        <p className="mt-0.5 truncate text-xs text-gray-400">
                          {TYPE_ICONS[r.last.type] ?? "📌"} {r.last.title} — {formatDate(r.last.date_from)}
                        </p>
                      )}
                    </div>
                    <span className={`mt-0.5 shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${chip.cls}`}>
                      {chip.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {rows.length === 0 && (
            <p className="py-4 text-center text-sm text-gray-500">No active employees.</p>
          )}
        </div>

        <p className="text-center text-[11px] text-gray-400">
          &ldquo;Up to date&rdquo; = at least one recorded activity in the last 12
          months. Adjust the cadence anytime — tell Claude if you want a
          different rule (e.g. every 6 months for technicians).
        </p>
      </div>
    </>
  );
}
