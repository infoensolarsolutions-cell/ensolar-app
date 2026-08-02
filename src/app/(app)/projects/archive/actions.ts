"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SERVICE_TYPES } from "@/lib/crm";

// Park a historical completed project (pre-app installations, 2018 onwards)
// straight into the archive: creates the customer and a completed project.
export async function addPastProject(
  _prev: { error?: string; saved?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; saved?: boolean }> {
  await requireRole("owner");

  const customerName = String(formData.get("customer_name") ?? "").trim().slice(0, 200);
  const serviceType = String(formData.get("service_type") ?? "");
  const completedDate = String(formData.get("completed_date") ?? "");
  const siteAddress = String(formData.get("site_address") ?? "").trim().slice(0, 300) || null;
  const amount = Number(formData.get("contract_amount") ?? 0) || 0;

  if (!customerName) return { error: "Customer / project name is required." };
  if (!(serviceType in SERVICE_TYPES)) return { error: "Pick a category." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(completedDate)) {
    return { error: "Completion date is required." };
  }

  const supabase = await createClient();
  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .insert({ name: customerName, source: "walk_in" })
    .select("id")
    .single();
  if (customerError || !customer) {
    return { error: `Could not save the customer: ${customerError?.message}` };
  }

  const { data: projectNo, error: noError } = await supabase.rpc("next_doc_no", {
    p_doc_type: "P",
  });
  if (noError || !projectNo) return { error: "Could not generate a project number." };

  const { error } = await supabase.from("projects").insert({
    project_no: projectNo,
    customer_id: customer.id,
    service_type: serviceType,
    site_address: siteAddress,
    contract_amount: amount,
    status: "completed",
    completed_date: completedDate,
  });
  if (error) return { error: `Could not save the project: ${error.message}` };

  revalidatePath("/projects/archive");
  revalidatePath("/projects");
  return { saved: true };
}
