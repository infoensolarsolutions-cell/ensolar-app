"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LEAD_STATUSES, LOST_REASONS } from "@/lib/crm";

export async function moveLead(
  leadId: string,
  status: string,
  lostReason?: string,
): Promise<{ error?: string }> {
  const profile = await requireRole("owner", "office_staff");

  if (!(status in LEAD_STATUSES)) return { error: "Unknown stage." };
  if (status === "lost" && !(lostReason && lostReason in LOST_REASONS)) {
    return { error: "A lost reason is required to mark a lead as Lost." };
  }

  const supabase = await createClient();
  const { data: before } = await supabase
    .from("leads")
    .select("status")
    .eq("id", leadId)
    .single();
  if (!before) return { error: "Lead not found." };
  if (before.status === status) return {};

  const { error } = await supabase
    .from("leads")
    .update({
      status,
      lost_reason: status === "lost" ? lostReason : null,
    })
    .eq("id", leadId);

  if (error) return { error: "Could not move the lead. Please try again." };

  await supabase.from("lead_events").insert({
    lead_id: leadId,
    user_id: profile.id,
    event: "status_changed",
    detail: {
      from: before.status,
      to: status,
      ...(status === "lost" ? { lost_reason: lostReason } : {}),
    },
  });

  revalidatePath("/leads");
  return {};
}

export async function updateLead(
  _prevState: { error?: string; saved?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; saved?: boolean }> {
  const profile = await requireRole("owner", "office_staff");

  const leadId = String(formData.get("lead_id") ?? "");
  const status = String(formData.get("status") ?? "");
  const lostReason = String(formData.get("lost_reason") ?? "");
  const assignedTo = String(formData.get("assigned_to") ?? "");
  const followupAt = String(formData.get("next_followup_at") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();

  if (!leadId || !(status in LEAD_STATUSES)) return { error: "Invalid input." };

  // Spec §5.1: every active lead must have an assignee and a follow-up date.
  const active = status !== "won" && status !== "lost";
  if (active && !assignedTo) {
    return { error: "Please assign a staff member." };
  }
  if (active && !followupAt) {
    return { error: "Please set the next follow-up date." };
  }
  if (status === "lost" && !(lostReason in LOST_REASONS)) {
    return { error: "Please choose a lost reason." };
  }

  const supabase = await createClient();
  const { data: before } = await supabase
    .from("leads")
    .select("status")
    .eq("id", leadId)
    .single();
  if (!before) return { error: "Lead not found." };

  const { error } = await supabase
    .from("leads")
    .update({
      status,
      lost_reason: status === "lost" ? lostReason : null,
      assigned_to: assignedTo || null,
      next_followup_at: followupAt || null,
      notes: notes || null,
    })
    .eq("id", leadId);

  if (error) return { error: "Could not save. Please try again." };

  if (before.status !== status) {
    await supabase.from("lead_events").insert({
      lead_id: leadId,
      user_id: profile.id,
      event: "status_changed",
      detail: {
        from: before.status,
        to: status,
        ...(status === "lost" ? { lost_reason: lostReason } : {}),
      },
    });
  }

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  return { saved: true };
}
