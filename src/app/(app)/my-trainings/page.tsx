import type { Metadata } from "next";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MyTrainingsClient, type MyTrainingRow } from "./trainings-client";

export const metadata: Metadata = { title: "My Trainings" };

// Every member's own personnel-development record: seminars, trainings and
// certifications they attended, self-recorded (RLS keeps it to their own
// employee record; the owner sees everything on the employee pages).
export default async function MyTrainingsPage() {
  const profile = await requireRole("owner", "office_staff", "technician");
  const supabase = await createClient();

  const { data: employee } = await supabase
    .from("employees")
    .select("id")
    .eq("profile_id", profile.id)
    .maybeSingle();

  const { data: rows } = employee
    ? await supabase
        .from("employee_trainings")
        .select(
          "id, title, provider, type, date_from, date_to, venue, certificate, notes, created_by",
        )
        .eq("employee_id", employee.id)
        .order("date_from", { ascending: false })
        .overrideTypes<MyTrainingRow[]>()
    : { data: [] as MyTrainingRow[] };

  return (
    <>
      <TopBar title="My Trainings" />
      <div className="space-y-3 p-4">
        {!employee && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
            Your account is not linked to an employee record yet — ask the
            owner to link it under Employees, then you can record your
            trainings here.
          </p>
        )}
        <MyTrainingsClient rows={rows ?? []} meId={profile.id} />
      </div>
    </>
  );
}
