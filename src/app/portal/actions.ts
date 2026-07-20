"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function requestService(
  _prev: { error?: string; done?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; done?: boolean }> {
  const profile = await getProfile();
  if (!profile || profile.role !== "customer") return { error: "Not allowed." };

  const projectId = String(formData.get("project_id") ?? "");
  const problem = String(formData.get("problem") ?? "").trim().slice(0, 1000);
  if (!projectId || !problem) return { error: "Please describe the problem." };

  // RLS proves ownership: the customer's client can only see their projects.
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .single();
  if (!project) return { error: "Project not found." };

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { error: "Service requests are temporarily unavailable. Please call (035) 531-6455." };
  }

  const { data: ticketNo, error: noError } = await supabase.rpc("next_doc_no", {
    p_doc_type: "T",
  });
  if (noError || !ticketNo) return { error: "Could not create the request. Please call us." };

  const { error } = await admin.from("service_tickets").insert({
    ticket_no: ticketNo,
    project_id: projectId,
    problem,
    created_by: profile.id,
  });
  if (error) return { error: "Could not create the request. Please call us." };

  await admin.from("project_events").insert({
    project_id: projectId,
    user_id: profile.id,
    event: "ticket_created",
    detail: { ticket_no: ticketNo, via: "portal" },
  });

  revalidatePath("/portal");
  return { done: true };
}
