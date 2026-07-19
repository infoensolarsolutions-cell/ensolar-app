"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { tomorrowManila } from "@/lib/crm";

const MAX = 300;

export async function submitInquiry(
  _prevState: { error?: string; done?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; done?: boolean }> {
  // Honeypot: real visitors never see or fill this field.
  if (String(formData.get("website") ?? "") !== "") {
    return { done: true };
  }

  const name = String(formData.get("name") ?? "").trim().slice(0, MAX);
  const phone = String(formData.get("phone") ?? "").trim().slice(0, 40);
  const email = String(formData.get("email") ?? "").trim().slice(0, MAX);
  const barangay = String(formData.get("barangay") ?? "").trim().slice(0, MAX);
  const serviceType = String(formData.get("service_type") ?? "");
  const source = String(formData.get("source") ?? "facebook");
  const referredBy = String(formData.get("referred_by") ?? "").trim().slice(0, MAX);
  const message = String(formData.get("message") ?? "").trim().slice(0, 1000);

  if (!name || !phone) {
    return { error: "Please enter your name and contact number." };
  }
  if (!serviceType) {
    return { error: "Please choose the service you are interested in." };
  }

  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    return {
      error:
        "The inquiry form is temporarily unavailable. Please call us at (035) 531-6455.",
    };
  }

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .insert({
      name,
      phone,
      email: email || null,
      barangay: barangay || null,
      source,
      referred_by: source === "referral" && referredBy ? referredBy : null,
    })
    .select("id")
    .single();

  if (customerError || !customer) {
    return {
      error:
        "Something went wrong sending your inquiry. Please try again or call (035) 531-6455.",
    };
  }

  const { data: lead } = await supabase
    .from("leads")
    .insert({
      customer_id: customer.id,
      service_type: serviceType,
      next_followup_at: tomorrowManila(),
      notes: message ? `From public inquiry form: ${message}` : "From public inquiry form",
    })
    .select("id")
    .single();

  if (lead) {
    await supabase.from("lead_events").insert({
      lead_id: lead.id,
      event: "created",
      detail: { via: "public_form" },
    });
  }

  return { done: true };
}
