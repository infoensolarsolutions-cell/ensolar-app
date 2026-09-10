import type { Metadata } from "next";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BranchForm } from "./branch-form";

export const metadata: Metadata = { title: "Branches" };

export type Branch = {
  id: string;
  code: string;
  name: string;
  address: string | null;
  phone: string | null;
  active: boolean;
};

export default async function BranchesPage() {
  await requireRole("owner");
  const supabase = await createClient();
  const { data: branches } = await supabase
    .from("branches")
    .select("id, code, name, address, phone, active")
    .order("created_at")
    .overrideTypes<Branch[]>();

  const counts = new Map<string, number>();
  const { data: projCounts } = await supabase.from("projects").select("branch_id");
  for (const p of projCounts ?? []) {
    if (p.branch_id) counts.set(p.branch_id, (counts.get(p.branch_id) ?? 0) + 1);
  }

  return (
    <>
      <TopBar title="Branches" backHref="/more" />
      <div className="space-y-3 p-4">
        <div className="rounded-xl bg-gray-100 px-4 py-3 text-xs text-gray-600">
          <p className="font-semibold text-gray-800">🏢 Branch locations</p>
          <p className="mt-1 leading-relaxed">
            Add a branch here the day it becomes real. With two or more active
            branches, a branch switcher appears at the top of the app, new
            records are stamped with the branch they were created in, and your
            dashboard gains a per-branch overview. Everything recorded so far
            belongs to Dumaguete (Main).
          </p>
        </div>

        {branches?.map((b) => (
          <div key={b.id} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-gray-900">
                  {b.name}{" "}
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-600">
                    {b.code}
                  </span>
                </p>
                {b.address && <p className="text-xs text-gray-500">📍 {b.address}</p>}
                {b.phone && <p className="text-xs text-gray-500">📞 {b.phone}</p>}
                <p className="mt-0.5 text-[11px] text-gray-400">
                  {counts.get(b.id) ?? 0} project{(counts.get(b.id) ?? 0) === 1 ? "" : "s"}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  b.active ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-500"
                }`}
              >
                {b.active ? "Active" : "Inactive"}
              </span>
            </div>
            <BranchForm branch={b} />
          </div>
        ))}

        <BranchForm />
      </div>
    </>
  );
}
