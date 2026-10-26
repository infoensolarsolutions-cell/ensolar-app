import type { Metadata } from "next";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { KnowledgeView, type KbRow } from "./knowledge-view";

export const metadata: Metadata = { title: "Troubleshooting" };

export default async function KnowledgePage() {
  const profile = await requireRole("owner", "office_staff", "technician");
  const isStaff = ["owner", "office_staff"].includes(profile.role);
  const supabase = await createClient();

  // Team names via the admin client so technicians also see who attended
  // each entry (profiles RLS hides other rows from them). Names only.
  const admin = createAdminClient();
  const [{ data: rawEntries }, { data: team }] = await Promise.all([
    supabase
      .from("kb_issues")
      .select("id, category, brand, model, problem, solution, source, created_by, assigned_to, created_at")
      .order("created_at", { ascending: false })
      .limit(500),
    admin
      .from("profiles")
      .select("id, name, role, active")
      .in("role", ["owner", "office_staff", "technician"])
      .order("name"),
  ]);

  const nameOf = new Map((team ?? []).map((t) => [t.id as string, t.name as string]));
  const entries: KbRow[] = (rawEntries ?? []).map((e) => ({
    ...(e as Omit<KbRow, "assigned_name">),
    assigned_name: e.assigned_to ? nameOf.get(e.assigned_to) ?? null : null,
  }));
  const technicians = (team ?? [])
    .filter((t) => t.role === "technician" && t.active)
    .map((t) => ({ id: t.id as string, name: t.name as string }));

  return (
    <>
      <TopBar title="Troubleshooting" />
      <KnowledgeView
        entries={entries}
        technicians={technicians}
        isStaff={isStaff}
        isOwner={profile.role === "owner"}
        meId={profile.id}
      />
    </>
  );
}
