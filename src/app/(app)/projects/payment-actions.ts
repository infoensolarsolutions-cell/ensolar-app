"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function addMilestone(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  await requireRole("owner", "office_staff");
  const projectId = String(formData.get("project_id") ?? "");
  const label = String(formData.get("label") ?? "").trim().slice(0, 200);
  const amount = Number(formData.get("amount") ?? 0);
  const dueDate = String(formData.get("due_date") ?? "");
  if (!projectId || !label) return { error: "Label is required." };
  if (!(amount > 0)) return { error: "Amount must be greater than zero." };

  const supabase = await createClient();
  const { count } = await supabase
    .from("payment_milestones")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  const { error } = await supabase.from("payment_milestones").insert({
    project_id: projectId,
    label,
    amount,
    due_date: dueDate || null,
    sort_order: count ?? 0,
  });
  if (error) return { error: "Could not add the milestone." };
  revalidatePath(`/projects/${projectId}`);
  return {};
}

// Standard PH schedule: 50% down, 40% delivery, 10% completion (Spec §5.2).
export async function addStandardSchedule(
  projectId: string,
): Promise<{ error?: string }> {
  await requireRole("owner", "office_staff");
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("contract_amount")
    .eq("id", projectId)
    .single();
  if (!project) return { error: "Project not found." };

  const { count } = await supabase
    .from("payment_milestones")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);
  if ((count ?? 0) > 0) return { error: "This project already has a schedule." };

  const total = Number(project.contract_amount);
  const down = Math.round(total * 0.5 * 100) / 100;
  const delivery = Math.round(total * 0.4 * 100) / 100;
  const completion = Math.round((total - down - delivery) * 100) / 100;

  const day = (offset: number) =>
    new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);

  const { error } = await supabase.from("payment_milestones").insert([
    { project_id: projectId, label: "50% Downpayment", amount: down, due_date: day(0), sort_order: 0 },
    { project_id: projectId, label: "40% Upon delivery of materials", amount: delivery, due_date: day(30), sort_order: 1 },
    { project_id: projectId, label: "10% Upon completion", amount: completion, due_date: day(60), sort_order: 2 },
  ]);
  if (error) return { error: "Could not create the schedule." };
  revalidatePath(`/projects/${projectId}`);
  return {};
}

export async function deleteMilestone(
  milestoneId: string,
  projectId: string,
): Promise<{ error?: string }> {
  await requireRole("owner", "office_staff");
  const supabase = await createClient();

  const { count } = await supabase
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("milestone_id", milestoneId);
  if ((count ?? 0) > 0) {
    return { error: "This milestone already has payments recorded against it." };
  }

  const { error } = await supabase
    .from("payment_milestones")
    .delete()
    .eq("id", milestoneId);
  if (error) return { error: "Could not delete the milestone." };
  revalidatePath(`/projects/${projectId}`);
  return {};
}

export async function recordPayment(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const profile = await requireRole("owner", "office_staff");
  const projectId = String(formData.get("project_id") ?? "");
  const milestoneId = String(formData.get("milestone_id") ?? "");
  const amount = Number(formData.get("amount") ?? 0);
  const method = String(formData.get("method") ?? "");
  const providerRef = String(formData.get("provider_ref") ?? "").trim().slice(0, 200);
  const notes = String(formData.get("notes") ?? "").trim().slice(0, 500);
  const photo = formData.get("receipt_photo") as File | null;

  if (!projectId) return { error: "Invalid project." };
  if (!(amount > 0)) return { error: "Enter the amount received." };
  if (!["cash", "gcash", "maya", "bank_transfer", "check", "card"].includes(method)) {
    return { error: "Choose a payment method." };
  }

  const supabase = await createClient();

  let receiptPath: string | null = null;
  if (photo && photo.size > 0) {
    if (photo.size > 10 * 1024 * 1024) return { error: "Photo too large (max 10 MB)." };
    const ext = (photo.name.split(".").pop() || "jpg").toLowerCase().slice(0, 5);
    receiptPath = `receipts/${projectId}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("project-photos")
      .upload(receiptPath, photo);
    if (uploadError) return { error: "Could not upload the receipt photo." };
  }

  const { data: orNo, error: noError } = await supabase.rpc("next_doc_no", {
    p_doc_type: "OR",
  });
  if (noError || !orNo) return { error: "Could not generate a receipt number." };

  const { error } = await supabase.from("payments").insert({
    or_no: orNo,
    project_id: projectId,
    milestone_id: milestoneId || null,
    amount,
    method,
    provider_ref: providerRef || null,
    receipt_photo: receiptPath,
    notes: notes || null,
    received_by: profile.id,
  });
  if (error) return { error: "Could not record the payment." };

  await supabase.from("project_events").insert({
    project_id: projectId,
    user_id: profile.id,
    event: "payment_recorded",
    detail: { or_no: orNo, amount, method },
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/");
  return {};
}
