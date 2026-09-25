"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getWriteBranchId } from "@/lib/branch";
import { todayManila } from "@/lib/format";

// "use server" files may only export async functions, so the path stays a
// plain constant.
const PAYABLE_PATH = "/payables";

type ActionState = { error?: string; saved?: boolean } | null;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Next month, same day, clamped to the month's length (Jan 31 → Feb 28).
function plusOneMonth(date: string): string {
  const [y, m, day] = date.split("-").map(Number);
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  const lastDay = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  return `${ny}-${String(nm).padStart(2, "0")}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
}

function readPayableForm(formData: FormData) {
  const category = String(formData.get("category") ?? "").trim();
  const creditor = String(formData.get("creditor") ?? "").trim().slice(0, 150);
  const description = String(formData.get("description") ?? "").trim().slice(0, 400);
  const original_amount = Number(formData.get("original_amount") ?? 0);
  const incurred_date = String(formData.get("incurred_date") ?? "");
  const due_date = String(formData.get("due_date") ?? "");
  const monthlyRaw = String(formData.get("monthly_amount") ?? "").trim();
  const monthly_amount = monthlyRaw ? Number(monthlyRaw) : null;
  const interest_note = String(formData.get("interest_note") ?? "").trim().slice(0, 200);

  if (!category) return { error: "Pick a category." as const };
  if (!creditor) return { error: "Who is the money owed to?" as const };
  if (!(original_amount > 0)) return { error: "Enter the total amount owed." as const };
  if (incurred_date && !DATE_RE.test(incurred_date)) return { error: "Invalid date incurred." as const };
  if (due_date && !DATE_RE.test(due_date)) return { error: "Invalid due date." as const };
  if (monthly_amount !== null && !(monthly_amount > 0)) {
    return { error: "Monthly payment must be more than zero (or leave it blank)." as const };
  }
  return {
    values: {
      category,
      creditor,
      description: description || null,
      original_amount,
      incurred_date: incurred_date || todayManila(),
      due_date: due_date || null,
      monthly_amount,
      interest_note: interest_note || null,
    },
  };
}

export async function addPayable(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireRole("owner");
  const parsed = readPayableForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = await createClient();
  const branchId = await getWriteBranchId(supabase, profile.branch_id);
  const { error } = await supabase.from("payables").insert({
    ...parsed.values,
    branch_id: branchId,
    created_by: profile.id,
  });
  if (error) return { error: `Could not save: ${error.message}` };

  revalidatePath(PAYABLE_PATH);
  return { saved: true };
}

export async function updatePayable(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("owner");
  const payableId = String(formData.get("payable_id") ?? "");
  if (!payableId) return { error: "Missing payable reference." };
  const parsed = readPayableForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("payables")
    .update(parsed.values)
    .eq("id", payableId);
  if (error) return { error: `Could not save: ${error.message}` };

  revalidatePath(PAYABLE_PATH);
  return { saved: true };
}

export async function deletePayable(payableId: string): Promise<{ error?: string }> {
  await requireRole("owner");
  const supabase = await createClient();
  const { error } = await supabase.from("payables").delete().eq("id", payableId);
  if (error) return { error: `Could not delete: ${error.message}` };
  revalidatePath(PAYABLE_PATH);
  return {};
}

export async function setPayableSettled(
  payableId: string,
  settled: boolean,
): Promise<{ error?: string }> {
  await requireRole("owner");
  const supabase = await createClient();
  const { error } = await supabase
    .from("payables")
    .update({ settled_at: settled ? todayManila() : null })
    .eq("id", payableId);
  if (error) return { error: `Could not save: ${error.message}` };
  revalidatePath(PAYABLE_PATH);
  return {};
}

// After a payment: fully paid → settle automatically; a monthly obligation
// → roll the next due date one month forward.
async function refreshAfterPayment(
  supabase: Awaited<ReturnType<typeof createClient>>,
  payableId: string,
  advanceDueDate: boolean,
) {
  const { data: p } = await supabase
    .from("payables")
    .select("original_amount, due_date, monthly_amount, settled_at, payable_payments (amount)")
    .eq("id", payableId)
    .single();
  if (!p) return;
  const paid = ((p.payable_payments ?? []) as { amount: number }[]).reduce(
    (s, x) => s + Number(x.amount),
    0,
  );
  const balance = Number(p.original_amount) - paid;
  const patch: Record<string, unknown> = {};
  if (balance <= 0.005 && !p.settled_at) patch.settled_at = todayManila();
  if (balance > 0.005 && p.settled_at) patch.settled_at = null;
  if (
    advanceDueDate &&
    balance > 0.005 &&
    p.monthly_amount !== null &&
    p.due_date
  ) {
    patch.due_date = plusOneMonth(p.due_date as string);
  }
  if (Object.keys(patch).length) {
    await supabase.from("payables").update(patch).eq("id", payableId);
  }
}

export async function addPayablePayment(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireRole("owner");
  const payableId = String(formData.get("payable_id") ?? "");
  const amount = Number(formData.get("amount") ?? 0);
  const paid_at = String(formData.get("paid_at") ?? "");
  const note = String(formData.get("note") ?? "").trim().slice(0, 300);

  if (!payableId) return { error: "Missing payable reference." };
  if (!(amount > 0)) return { error: "Enter the amount paid." };
  if (paid_at && !DATE_RE.test(paid_at)) return { error: "Invalid payment date." };

  const supabase = await createClient();
  const { error } = await supabase.from("payable_payments").insert({
    payable_id: payableId,
    amount,
    paid_at: paid_at || todayManila(),
    note: note || null,
    created_by: profile.id,
  });
  if (error) return { error: `Could not save: ${error.message}` };

  await refreshAfterPayment(supabase, payableId, true);
  revalidatePath(PAYABLE_PATH);
  return { saved: true };
}

export async function deletePayablePayment(
  paymentId: string,
  payableId: string,
): Promise<{ error?: string }> {
  await requireRole("owner");
  const supabase = await createClient();
  const { error } = await supabase
    .from("payable_payments")
    .delete()
    .eq("id", paymentId);
  if (error) return { error: `Could not delete: ${error.message}` };
  // Removing a payment can reopen a settled payable; never move due dates.
  await refreshAfterPayment(supabase, payableId, false);
  revalidatePath(PAYABLE_PATH);
  return {};
}
