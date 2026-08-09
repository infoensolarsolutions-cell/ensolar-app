import type { Metadata } from "next";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { KnowledgeView, type KbRow } from "./knowledge-view";

export const metadata: Metadata = { title: "Troubleshooting" };

export default async function KnowledgePage() {
  const profile = await requireRole("owner", "office_staff", "technician");
  const isStaff = ["owner", "office_staff"].includes(profile.role);
  const supabase = await createClient();

  const { data: entries } = await supabase
    .from("kb_issues")
    .select("id, category, brand, model, problem, solution, source, created_at")
    .order("created_at", { ascending: false })
    .limit(500)
    .overrideTypes<KbRow[]>();

  return (
    <>
      <TopBar title="Troubleshooting" />
      <KnowledgeView
        entries={entries ?? []}
        isStaff={isStaff}
        isOwner={profile.role === "owner"}
      />
    </>
  );
}
