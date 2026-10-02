"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getWriteBranchId } from "@/lib/branch";

const EQUIPMENT_TYPES = ["inverter", "battery", "solar_panel", "other"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type ActionState = { error?: string; saved?: boolean } | null;

function readFields(formData: FormData) {
  const equipment_type = String(formData.get("equipment_type") ?? "");
  const brand = String(formData.get("brand") ?? "").trim().slice(0, 100) || null;
  const model = String(formData.get("model") ?? "").trim().slice(0, 150) || null;
  const serial_no = String(formData.get("serial_no") ?? "").trim().slice(0, 150);
  const supplier = String(formData.get("supplier") ?? "").trim().slice(0, 200) || null;
  const supplier_contact = String(formData.get("supplier_contact") ?? "").trim().slice(0, 200) || null;
  const purchase_date = String(formData.get("purchase_date") ?? "");
  const project_id = String(formData.get("project_id") ?? "") || null;
  const issued_date = String(formData.get("issued_date") ?? "");
  const notes = String(formData.get("notes") ?? "").trim().slice(0, 500) || null;

  if (!EQUIPMENT_TYPES.includes(equipment_type)) return { error: "Choose an equipment type." as const };
  if (!serial_no) return { error: "Serial number is required." as const };
  if (purchase_date && !DATE_RE.test(purchase_date)) return { error: "Invalid purchase date." as const };
  if (issued_date && !DATE_RE.test(issued_date)) return { error: "Invalid issued date." as const };
  if (project_id && !issued_date) {
    return { error: "Set the issued date when assigning the unit to a project." as const };
  }

  return {
    values: {
      equipment_type,
      brand,
      model,
      serial_no,
      supplier,
      supplier_contact,
      purchase_date: purchase_date || null,
      project_id,
      issued_date: project_id ? issued_date : null,
      notes,
    },
  };
}

async function serialTaken(
  supabase: Awaited<ReturnType<typeof createClient>>,
  serial: string,
  excludeId?: string,
): Promise<boolean> {
  let q = supabase
    .from("equipment_units")
    .select("id")
    .ilike("serial_no", serial)
    .limit(1);
  if (excludeId) q = q.neq("id", excludeId);
  const { data } = await q;
  return !!data?.length;
}

export async function addEquipment(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireRole("owner", "office_staff");
  const parsed = readFields(formData);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = await createClient();
  if (await serialTaken(supabase, parsed.values.serial_no)) {
    return { error: `Serial ${parsed.values.serial_no} is already registered — search for it in the list.` };
  }
  const branchId = await getWriteBranchId(supabase, profile.branch_id);
  const { error } = await supabase.from("equipment_units").insert({
    ...parsed.values,
    branch_id: branchId,
    created_by: profile.id,
  });
  if (error) return { error: `Could not save: ${error.message}` };

  revalidatePath("/equipment");
  if (parsed.values.project_id) revalidatePath(`/projects/${parsed.values.project_id}`);
  return { saved: true };
}

export async function updateEquipment(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("owner", "office_staff");
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing unit reference." };
  const parsed = readFields(formData);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = await createClient();
  if (await serialTaken(supabase, parsed.values.serial_no, id)) {
    return { error: `Serial ${parsed.values.serial_no} is already registered on another unit.` };
  }
  const { error } = await supabase
    .from("equipment_units")
    .update(parsed.values)
    .eq("id", id);
  if (error) return { error: `Could not save: ${error.message}` };

  revalidatePath("/equipment");
  if (parsed.values.project_id) revalidatePath(`/projects/${parsed.values.project_id}`);
  return { saved: true };
}

export async function deleteEquipment(id: string): Promise<{ error?: string }> {
  await requireRole("owner");
  const supabase = await createClient();
  const { error } = await supabase.from("equipment_units").delete().eq("id", id);
  if (error) return { error: `Could not delete: ${error.message}` };
  revalidatePath("/equipment");
  return {};
}
