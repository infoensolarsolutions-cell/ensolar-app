"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { tomorrowManila } from "@/lib/crm";

export async function createLead(
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const profile = await requireRole("owner", "office_staff");

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const barangay = String(formData.get("barangay") ?? "").trim();
  const serviceType = String(formData.get("service_type") ?? "");
  const source = String(formData.get("source") ?? "");
  const referredBy = String(formData.get("referred_by") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const followupAt =
    String(formData.get("next_followup_at") ?? "") || tomorrowManila();

  if (!name || !phone) {
    return { error: "Name and contact number are required." };
  }
  if (!serviceType) return { error: "Please choose a service." };
  if (!source) return { error: "Please choose where the inquiry came from." };
  if (source === "referral" && !referredBy) {
    return { error: "Please enter who referred this customer." };
  }

  const supabase = await createClient();

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .insert({
      name,
      phone,
      email: email || null,
      address: address || null,
      barangay: barangay || null,
      source,
      referred_by: source === "referral" ? referredBy : null,
    })
    .select("id")
    .single();

  if (customerError || !customer) {
    return { error: "Could not save the customer. Please try again." };
  }

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .insert({
      customer_id: customer.id,
      service_type: serviceType,
      assigned_to: profile.id,
      next_followup_at: followupAt,
      notes: notes || null,
    })
    .select("id")
    .single();

  if (leadError || !lead) {
    return { error: "Could not save the lead. Please try again." };
  }

  await supabase.from("lead_events").insert({
    lead_id: lead.id,
    user_id: profile.id,
    event: "created",
    detail: { via: "quick_add" },
  });

  redirect("/leads");
}
