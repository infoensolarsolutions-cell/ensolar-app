import type { Metadata } from "next";
import Link from "next/link";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatPeso } from "@/lib/format";

export const metadata: Metadata = { title: "Employees" };

export default async function EmployeesPage() {
  await requireRole("owner");
  const supabase = await createClient();

  const { data: employees } = await supabase
    .from("employees")
    .select("id, name, position, rate_type, rate, active, profile_id")
    .order("name");

  return (
    <>
      <TopBar title="Employees" backHref="/more" />
      <div className="space-y-3 p-4">
        <Link
          href="/employees/new"
          className="block w-full rounded-xl bg-brand-green px-4 py-3.5 text-center text-base font-semibold text-white"
        >
          + Add Employee
        </Link>
        {!employees?.length && (
          <p className="pt-6 text-center text-sm text-gray-500">No employees yet.</p>
        )}
        {employees?.map((e) => (
          <Link
            key={e.id}
            href={`/employees/${e.id}`}
            className={`block rounded-xl border border-gray-200 bg-white p-4 ${e.active ? "" : "opacity-50"}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-gray-900">{e.name}</p>
                <p className="text-xs text-gray-500">
                  {e.position ?? "—"}
                  {!e.profile_id && " · no app login"}
                  {!e.active && " · inactive"}
                </p>
              </div>
              <p className="shrink-0 text-sm font-bold text-gray-800">
                {formatPeso(e.rate)}
                <span className="text-xs font-medium text-gray-500">
                  /{e.rate_type === "daily" ? "day" : "mo"}
                </span>
              </p>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
