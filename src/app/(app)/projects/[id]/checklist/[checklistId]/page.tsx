import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { TopBar } from "@/components/top-bar";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ChecklistItem } from "@/lib/checklists";
import { ChecklistView } from "./checklist-view";

export const metadata: Metadata = { title: "Checklist" };

export default async function ChecklistPage({
  params,
}: {
  params: Promise<{ id: string; checklistId: string }>;
}) {
  const profile = await getProfile();
  if (!profile || profile.role === "customer") redirect("/login");

  const { id: projectId, checklistId } = await params;
  const supabase = await createClient();

  const { data: checklist } = await supabase
    .from("project_checklists")
    .select("id, project_id, title, items, remarks, completed_at, projects (project_no)")
    .eq("id", checklistId)
    .single();
  if (!checklist || checklist.project_id !== projectId) notFound();

  const project = Array.isArray(checklist.projects)
    ? checklist.projects[0]
    : checklist.projects;

  return (
    <>
      <TopBar
        title={(project as { project_no?: string } | null)?.project_no ?? "Checklist"}
        backHref={`/projects/${projectId}`}
      />
      <ChecklistView
        checklist={{
          id: checklist.id,
          projectId,
          title: checklist.title,
          items: checklist.items as ChecklistItem[],
          remarks: checklist.remarks,
          completed_at: checklist.completed_at,
        }}
        isOwner={profile.role === "owner"}
      />
    </>
  );
}
