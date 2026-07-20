import type { Metadata } from "next";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EmployeeForm } from "../employee-form";

export const metadata: Metadata = { title: "Add Employee" };

export default async function NewEmployeePage() {
  await requireRole("owner");
  const supabase = await createClient();

  const [{ data: profiles }, { data: linked }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, name, role")
      .in("role", ["owner", "office_staff", "technician"])
      .eq("active", true)
      .order("name"),
    supabase.from("employees").select("profile_id").not("profile_id", "is", null),
  ]);
  const taken = new Set((linked ?? []).map((l) => l.profile_id));
  const linkable = (profiles ?? []).filter((p) => !taken.has(p.id));

  return (
    <>
      <TopBar title="Add Employee" backHref="/employees" />
      <EmployeeForm linkableProfiles={linkable} />
    </>
  );
}
