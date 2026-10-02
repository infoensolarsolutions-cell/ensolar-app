"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function createContract(
  _prev: { error?: string; saved?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; saved?: boolean }> {
  const profile = await requireRole("owner", "office_staff", "technician");
  const projectId = String(formData.get("project_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const docTypeRaw = String(formData.get("doc_type") ?? "contract");
  const docType = ["certificate", "completion", "commissioning", "specs"].includes(docTypeRaw)
    ? docTypeRaw
    : "contract";
  // Technicians only handle the two field documents (RLS enforces this too).
  if (profile.role === "technician" && !["commissioning", "specs"].includes(docType)) {
    return { error: "Technicians can create Test & Commissioning and Equipment Specification documents only." };
  }
  if (!projectId || body.length < 100) {
    return { error: "The document text looks empty." };
  }

  const supabase = await createClient();
  // All non-contract documents store doc_type 'certificate'; the number
  // prefix (COC/COMP/ETC/SPEC) tells them apart everywhere they are listed.
  const prefixByType: Record<string, string> = {
    contract: "IA",
    certificate: "COC",
    completion: "COMP",
    commissioning: "ETC",
    specs: "SPEC",
  };
  const { data: contractNo, error: noError } = await supabase.rpc("next_doc_no", {
    p_doc_type: prefixByType[docType],
  });
  if (noError || !contractNo) return { error: "Could not generate a document number." };

  const { data: created, error } = await supabase
    .from("contracts")
    .insert({
      contract_no: contractNo,
      project_id: projectId,
      body,
      created_by: profile.id,
      // Only sent for certificates so contract generation keeps working
      // until the 0039 migration adds the column (default 'contract').
      ...(docType !== "contract" ? { doc_type: "certificate" } : {}),
    })
    .select("id")
    .single();
  if (error || !created) {
    return {
      error:
        docType !== "contract" && error?.message.includes("doc_type")
          ? "Run the certificate database migration (0039) first."
          : `Could not save: ${error?.message ?? "unknown"}`,
    };
  }

  await supabase.from("project_events").insert({
    project_id: projectId,
    user_id: profile.id,
    event: docType === "contract" ? "contract_created" : "certificate_created",
    detail: { contract_no: contractNo },
  });

  revalidatePath(`/projects/${projectId}`);
  redirect(`/contracts/${created.id}`);
}

export async function updateContract(
  _prev: { error?: string; saved?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; saved?: boolean }> {
  // Technicians can save only ETC-/SPEC- documents — enforced by RLS, which
  // updates zero rows for anything else.
  await requireRole("owner", "office_staff", "technician");
  const contractId = String(formData.get("contract_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!contractId || body.length < 100) return { error: "The contract text looks empty." };

  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("contracts")
    .update({ body })
    .eq("id", contractId)
    .select("id");
  if (error) return { error: `Could not save: ${error.message}` };
  if (!updated?.length) return { error: "Document not found (or not yours to edit)." };

  revalidatePath(`/contracts/${contractId}`);
  return { saved: true };
}

// Owner-only removal of unwanted generated documents — draft revisions,
// duplicates, test runs — so only the final copy stays on the project.
export async function deleteContract(
  contractId: string,
): Promise<{ error?: string }> {
  const profile = await requireRole("owner");
  const supabase = await createClient();

  const { data: contract } = await supabase
    .from("contracts")
    .select("id, contract_no, project_id")
    .eq("id", contractId)
    .single();
  if (!contract) return { error: "Document not found." };

  const { error } = await supabase.from("contracts").delete().eq("id", contractId);
  if (error) return { error: `Could not delete: ${error.message}` };

  if (contract.project_id) {
    await supabase.from("project_events").insert({
      project_id: contract.project_id,
      user_id: profile.id,
      event: "note",
      detail: {
        text: `deleted ${contract.contract_no.startsWith("COC-") ? "certificate" : "contract"} ${contract.contract_no}`,
      },
    });
    revalidatePath(`/projects/${contract.project_id}`);
  }
  redirect(contract.project_id ? `/projects/${contract.project_id}` : "/projects");
}

const TEMPLATE_KEYS: Record<string, string> = {
  solar_contract: "/settings/contract-template",
  compliance_certificate: "/settings/certificate-template",
  completion_certificate: "/settings/completion-template",
  commissioning_report: "/settings/commissioning-template",
  equipment_specs: "/settings/specs-template",
};

export async function saveTemplate(
  _prev: { error?: string; saved?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; saved?: boolean }> {
  const profile = await requireRole("owner");
  const key = String(formData.get("template_key") ?? "solar_contract");
  const body = String(formData.get("body") ?? "").trim();
  if (!(key in TEMPLATE_KEYS)) return { error: "Unknown template." };
  if (body.length < 100) return { error: "The template looks empty." };

  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("doc_templates")
    .update({ body, updated_at: new Date().toISOString(), updated_by: profile.id })
    .eq("key", key)
    .select("key");
  if (error) return { error: `Could not save: ${error.message}` };
  if (!updated?.length) {
    return { error: "Template not found — run the latest database migration first." };
  }

  revalidatePath(TEMPLATE_KEYS[key]);
  return { saved: true };
}
