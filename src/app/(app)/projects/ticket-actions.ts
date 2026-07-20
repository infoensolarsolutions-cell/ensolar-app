"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getProfile, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function createTicket(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const profile = await requireRole("owner", "office_staff");
  const projectId = String(formData.get("project_id") ?? "");
  const problem = String(formData.get("problem") ?? "").trim().slice(0, 1000);
  const assignedTo = String(formData.get("assigned_to") ?? "");
  const warranty = String(formData.get("warranty") ?? "true") === "true";

  if (!projectId || !problem) return { error: "Describe the reported problem." };

  const supabase = await createClient();
  const { data: ticketNo, error: noError } = await supabase.rpc("next_doc_no", {
    p_doc_type: "T",
  });
  if (noError || !ticketNo) return { error: "Could not generate a ticket number." };

  const { data: ticket, error } = await supabase
    .from("service_tickets")
    .insert({
      ticket_no: ticketNo,
      project_id: projectId,
      problem,
      assigned_to: assignedTo || null,
      warranty,
      created_by: profile.id,
    })
    .select("id")
    .single();
  if (error || !ticket) return { error: "Could not create the ticket." };

  await supabase.from("project_events").insert({
    project_id: projectId,
    user_id: profile.id,
    event: "ticket_created",
    detail: { ticket_no: ticketNo },
  });

  revalidatePath(`/projects/${projectId}`);
  redirect(`/tickets/${ticket.id}`);
}

export async function updateTicket(
  _prev: { error?: string; saved?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; saved?: boolean }> {
  const profile = await getProfile();
  if (!profile || profile.role === "customer") return { error: "Not allowed." };
  const isStaff = ["owner", "office_staff"].includes(profile.role);

  const ticketId = String(formData.get("ticket_id") ?? "");
  const status = String(formData.get("status") ?? "");
  const diagnosis = String(formData.get("diagnosis") ?? "").trim().slice(0, 2000);
  const actionTaken = String(formData.get("action_taken") ?? "").trim().slice(0, 2000);
  const assignedTo = String(formData.get("assigned_to") ?? "");
  const warranty = String(formData.get("warranty") ?? "true") === "true";

  if (!ticketId || !["open", "in_progress", "resolved"].includes(status)) {
    return { error: "Invalid input." };
  }
  if (status === "resolved" && !actionTaken) {
    return { error: "Describe the action taken before resolving." };
  }

  const supabase = await createClient();
  const { data: before } = await supabase
    .from("service_tickets")
    .select("status, project_id, ticket_no, resolved_at")
    .eq("id", ticketId)
    .single();
  if (!before) return { error: "Ticket not found." };

  const patch: Record<string, unknown> = {
    status,
    diagnosis: diagnosis || null,
    action_taken: actionTaken || null,
  };
  if (isStaff) {
    patch.assigned_to = assignedTo || null;
    patch.warranty = warranty;
  }
  if (status === "resolved" && !before.resolved_at) {
    patch.resolved_at = new Date().toISOString();
  }
  if (status !== "resolved") patch.resolved_at = null;

  const { error } = await supabase
    .from("service_tickets")
    .update(patch)
    .eq("id", ticketId);
  if (error) return { error: "Could not save the ticket." };

  if (before.status !== status) {
    await supabase.from("project_events").insert({
      project_id: before.project_id,
      user_id: profile.id,
      event: "ticket_status_changed",
      detail: { ticket_no: before.ticket_no, from: before.status, to: status },
    });
  }

  revalidatePath(`/tickets/${ticketId}`);
  revalidatePath(`/projects/${before.project_id}`);
  revalidatePath("/");
  return { saved: true };
}

export async function setReminderStatus(
  reminderId: string,
  status: "done" | "dismissed",
): Promise<{ error?: string }> {
  await requireRole("owner", "office_staff");
  const supabase = await createClient();
  const { error } = await supabase
    .from("maintenance_reminders")
    .update({ status })
    .eq("id", reminderId);
  if (error) return { error: "Could not update the reminder." };
  revalidatePath("/");
  return {};
}
