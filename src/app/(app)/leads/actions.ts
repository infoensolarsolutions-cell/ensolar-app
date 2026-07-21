"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

export async function updateLeadContact(
  _prev: { error?: string; saved?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; saved?: boolean }> {
  const profile = await requireRole("owner", "office_staff");
  const leadId = String(formData.get("lead_id") ?? "");
  const customerId = String(formData.get("customer_id") ?? "");
  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  if (!leadId || !customerId) return { error: "Missing lead reference." };
  if (!name) return { error: "The name cannot be empty." };

  const field = (k: string) => String(formData.get(k) ?? "").trim() || null;

  const supabase = await createClient();
  const { data: before } = await supabase
    .from("customers")
    .select("address, barangay")
    .eq("id", customerId)
    .single();

  const address = field("address");
  const barangay = field("barangay");
  const { error } = await supabase
    .from("customers")
    .update({
      name,
      phone: field("phone"),
      email: field("email"),
      address,
      barangay,
      referred_by: field("referred_by"),
    })
    .eq("id", customerId);
  if (error) return { error: `Could not save: ${error.message}` };

  // Projects snapshot the site address at creation. Keep snapshots that
  // still match the customer's old address in sync; a site address that
  // was changed on purpose (different installation site) is left alone.
  const oldSite = [before?.address, before?.barangay].filter(Boolean).join(", ");
  const newSite = [address, barangay].filter(Boolean).join(", ") || null;
  if (oldSite !== (newSite ?? "")) {
    const sync = supabase.from("projects").update({ site_address: newSite }).eq("customer_id", customerId);
    if (oldSite) {
      await sync.eq("site_address", oldSite);
    } else {
      await sync.is("site_address", null);
    }
  }

  await supabase.from("lead_events").insert({
    lead_id: leadId,
    user_id: profile.id,
    event: "contact_updated",
  });

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  return { saved: true };
}

export async function deleteLead(leadId: string): Promise<{ error?: string }> {
  await requireRole("owner");
  if (!leadId) return { error: "Missing lead reference." };

  const supabase = await createClient();
  const { data: lead } = await supabase
    .from("leads")
    .select("id, status, customer_id")
    .eq("id", leadId)
    .single();
  if (!lead) return { error: "Lead not found." };
  if (lead.status !== "new_inquiry") {
    return { error: "Only leads still in New Inquiry can be deleted. Move it to Lost instead." };
  }

  const { error } = await supabase.from("leads").delete().eq("id", leadId);
  if (error) {
    return { error: `Could not delete: ${error.message}` };
  }

  // Housekeeping: remove the customer record too if nothing else uses it.
  const [{ count: otherLeads }, { count: quotes }, { count: projects }] =
    await Promise.all([
      supabase.from("leads").select("id", { count: "exact", head: true }).eq("customer_id", lead.customer_id),
      supabase.from("quotations").select("id", { count: "exact", head: true }).eq("customer_id", lead.customer_id),
      supabase.from("projects").select("id", { count: "exact", head: true }).eq("customer_id", lead.customer_id),
    ]);
  if ((otherLeads ?? 0) === 0 && (quotes ?? 0) === 0 && (projects ?? 0) === 0) {
    await supabase.from("customers").delete().eq("id", lead.customer_id);
  }

  revalidatePath("/leads");
  redirect("/leads");
}
