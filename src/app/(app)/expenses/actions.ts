"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function addExpense(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const profile = await requireRole("owner");
  const category = String(formData.get("category") ?? "").trim().slice(0, 100);
  const description = String(formData.get("description") ?? "").trim().slice(0, 300);
  const amount = Number(formData.get("amount") ?? 0);
  const date = String(formData.get("date") ?? "");

  if (!category) return { error: "Category is required." };
  if (!(amount > 0)) return { error: "Enter the amount." };

  const supabase = await createClient();
  const { error } = await supabase.from("expenses").insert({
    category,
    description: description || null,
    amount,
    ...(date ? { date } : {}),
    created_by: profile.id,
  });
  if (error) return { error: `Could not save: ${error.message}` };

  revalidatePath("/expenses");
  return {};
}

export async function deleteExpense(expenseId: string): Promise<{ error?: string }> {
  await requireRole("owner");
  const supabase = await createClient();
  const { data: expense } = await supabase
    .from("expenses")
    .select("payroll_run_id")
    .eq("id", expenseId)
    .single();
  if (!expense) return { error: "Expense not found." };
  if (expense.payroll_run_id) {
    return { error: "This expense came from a payroll run — reopen that run instead." };
  }
  const { error } = await supabase.from("expenses").delete().eq("id", expenseId);
  if (error) return { error: `Could not delete: ${error.message}` };
  revalidatePath("/expenses");
  return {};
}

export async function updateExpense(
  _prev: { error?: string; saved?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; saved?: boolean }> {
  await requireRole("owner");
  const expenseId = String(formData.get("expense_id") ?? "");
  const category = String(formData.get("category") ?? "").trim().slice(0, 100);
  const description = String(formData.get("description") ?? "").trim().slice(0, 300);
  const amount = Number(formData.get("amount") ?? 0);
  const date = String(formData.get("date") ?? "");

  if (!expenseId) return { error: "Missing expense reference." };
  if (!category) return { error: "Category is required." };
  if (!(amount > 0)) return { error: "Enter the amount." };

  const supabase = await createClient();
  const { data: expense } = await supabase
    .from("expenses")
    .select("payroll_run_id")
    .eq("id", expenseId)
    .single();
  if (!expense) return { error: "Expense not found." };
  if (expense.payroll_run_id) {
    return { error: "This expense came from a payroll run — reopen that run instead." };
  }

  const { error } = await supabase
    .from("expenses")
    .update({
      category,
      description: description || null,
      amount,
      ...(date ? { date } : {}),
    })
    .eq("id", expenseId);
  if (error) return { error: `Could not save: ${error.message}` };

  revalidatePath("/expenses");
  return { saved: true };
}
