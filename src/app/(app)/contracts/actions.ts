"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function createContract(
  _prev: { error?: string; saved?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; saved?: boolean }> {
  const profile = await requireRole("owner", "office_staff");
  const projectId = String(formData.get("project_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!projectId || body.length < 100) {
    return { error: "The contract text looks empty." };
  }

  const supabase = await createClient();
  const { data: contractNo, error: noError } = await supabase.rpc("next_doc_no", {
    p_doc_type: "IA",
  });
  if (noError || !contractNo) return { error: "Could not generate a contract number." };

  const { data: created, error } = await supabase
    .from("contracts")
    .insert({
      contract_no: contractNo,
      project_id: projectId,
      body,
      created_by: profile.id,
    })
    .select("id")
    .single();
  if (error || !created) return { error: `Could not save: ${error?.message ?? "unknown"}` };

  await supabase.from("project_events").insert({
    project_id: projectId,
    user_id: profile.id,
    event: "contract_created",
    detail: { contract_no: contractNo },
  });

  revalidatePath(`/projects/${projectId}`);
  redirect(`/contracts/${created.id}`);
}

export async function updateContract(
  _prev: { error?: string; saved?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; saved?: boolean }> {
  await requireRole("owner", "office_staff");
  const contractId = String(formData.get("contract_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!contractId || body.length < 100) return { error: "The contract text looks empty." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("contracts")
    .update({ body })
    .eq("id", contractId);
  if (error) return { error: `Could not save: ${error.message}` };

  revalidatePath(`/contracts/${contractId}`);
  return { saved: true };
}

export async function saveTemplate(
  _prev: { error?: string; saved?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; saved?: boolean }> {
  const profile = await requireRole("owner");
  const body = String(formData.get("body") ?? "").trim();
  if (body.length < 100) return { error: "The template looks empty." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("doc_templates")
    .update({ body, updated_at: new Date().toISOString(), updated_by: profile.id })
    .eq("key", "solar_contract");
  if (error) return { error: `Could not save: ${error.message}` };

  revalidatePath("/settings/contract-template");
  return { saved: true };
}
