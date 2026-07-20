"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  addDays,
  monthlyBase,
  weeklyContributions,
  weeklyTax,
  DAILY_TO_MONTHLY_DAYS,
  type Settings,
} from "@/lib/payroll";

async function loadSettings(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<Settings | null> {
  const { data } = await supabase.from("contribution_settings").select("key, config");
  if (!data || data.length < 4) return null;
  const byKey = Object.fromEntries(data.map((s) => [s.key, s.config]));
  return byKey as unknown as Settings;
}

export async function createRun(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const profile = await requireRole("owner");
  const periodStart = String(formData.get("period_start") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(periodStart)) return { error: "Pick the week's Monday." };
  if (new Date(`${periodStart}T00:00:00Z`).getUTCDay() !== 1) {
    return { error: "The period must start on a Monday." };
  }
  const periodEnd = addDays(periodStart, 5); // Monday → Saturday

  const supabase = await createClient();
  const settings = await loadSettings(supabase);
  if (!settings) return { error: "Payroll settings are missing — open Payroll Settings first." };

  const { data: employees } = await supabase
    .from("employees")
    .select("id, name, rate_type, rate")
    .eq("active", true);
  if (!employees?.length) return { error: "No active employees." };

  // Attendance days + paid leave days inside the Mon–Sat window.
  const startUtc = new Date(`${periodStart}T00:00:00+08:00`).toISOString();
  const endUtc = new Date(`${periodEnd}T23:59:59.999+08:00`).toISOString();
  const [{ data: attendance }, { data: leaves }] = await Promise.all([
    supabase
      .from("attendance")
      .select("employee_id, clock_in")
      .gte("clock_in", startUtc)
      .lte("clock_in", endUtc),
    supabase
      .from("leaves")
      .select("employee_id, date_from, date_to, paid")
      .lte("date_from", periodEnd)
      .gte("date_to", periodStart),
  ]);

  const dayFmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit",
  });
  const daysByEmployee = new Map<string, Set<string>>();
  for (const a of attendance ?? []) {
    const day = dayFmt.format(new Date(a.clock_in));
    if (!daysByEmployee.has(a.employee_id)) daysByEmployee.set(a.employee_id, new Set());
    daysByEmployee.get(a.employee_id)!.add(day);
  }

  function leaveDays(employeeId: string, paid: boolean): number {
    let count = 0;
    for (const l of leaves ?? []) {
      if (l.employee_id !== employeeId || l.paid !== paid) continue;
      let d = l.date_from < periodStart ? periodStart : l.date_from;
      const end = l.date_to > periodEnd ? periodEnd : l.date_to;
      while (d <= end) {
        count++;
        d = addDays(d, 1);
      }
    }
    return count;
  }

  const { data: run, error: runError } = await supabase
    .from("payroll_runs")
    .insert({ period_start: periodStart, period_end: periodEnd, created_by: profile.id })
    .select("id")
    .single();
  if (runError || !run) {
    return { error: runError?.message.includes("one_run_per_period")
      ? "A run for this week already exists."
      : `Could not create the run: ${runError?.message ?? "unknown"}` };
  }

  const round2 = (n: number) => Math.round(n * 100) / 100;
  const slips = employees.map((e) => {
    const worked = daysByEmployee.get(e.id)?.size ?? 0;
    const paidLeave = leaveDays(e.id, true);
    const unpaidLeave = leaveDays(e.id, false);
    const rate = Number(e.rate);

    let gross: number;
    if (e.rate_type === "daily") {
      gross = round2((worked + paidLeave) * rate);
    } else {
      const weekly = (rate * 12) / 52;
      const dailyEquiv = rate / DAILY_TO_MONTHLY_DAYS;
      gross = round2(Math.max(0, weekly - unpaidLeave * dailyEquiv));
    }

    const base = monthlyBase(e.rate_type, rate);
    const c = gross > 0 ? weeklyContributions(base, settings) : { sss: 0, philhealth: 0, pagibig: 0 };
    const taxable = gross - c.sss - c.philhealth - c.pagibig;
    const tax = gross > 0 ? weeklyTax(taxable, settings) : 0;
    const net = round2(gross - c.sss - c.philhealth - c.pagibig - tax);

    return {
      run_id: run.id,
      employee_id: e.id,
      days_worked: worked + paidLeave,
      gross,
      sss: c.sss,
      philhealth: c.philhealth,
      pagibig: c.pagibig,
      tax,
      advance_deduction: 0,
      net,
      detail: {
        rate,
        rate_type: e.rate_type,
        attendance_days: worked,
        paid_leave_days: paidLeave,
        unpaid_leave_days: unpaidLeave,
        monthly_base: base,
      },
    };
  });

  const { error: slipError } = await supabase.from("payslips").insert(slips);
  if (slipError) {
    await supabase.from("payroll_runs").delete().eq("id", run.id);
    return { error: `Could not compute payslips: ${slipError.message}` };
  }

  redirect(`/payroll/${run.id}`);
}

export async function setAdvanceDeduction(
  payslipId: string,
  runId: string,
  amount: number,
): Promise<{ error?: string }> {
  await requireRole("owner");
  if (!(amount >= 0)) return { error: "Invalid amount." };

  const supabase = await createClient();
  const { data: run } = await supabase
    .from("payroll_runs")
    .select("status")
    .eq("id", runId)
    .single();
  if (run?.status !== "draft") return { error: "This run is already finalized." };

  const { data: slip } = await supabase
    .from("payslips")
    .select("gross, sss, philhealth, pagibig, tax, employee_id")
    .eq("id", payslipId)
    .single();
  if (!slip) return { error: "Payslip not found." };

  const { data: advances } = await supabase
    .from("cash_advances")
    .select("amount, repaid")
    .eq("employee_id", slip.employee_id);
  const outstanding = (advances ?? []).reduce(
    (s, a) => s + Number(a.amount) - Number(a.repaid), 0,
  );
  const beforeCa =
    Number(slip.gross) - Number(slip.sss) - Number(slip.philhealth) -
    Number(slip.pagibig) - Number(slip.tax);
  const capped = Math.min(amount, outstanding, Math.max(0, beforeCa));
  const net = Math.round((beforeCa - capped) * 100) / 100;

  const { error } = await supabase
    .from("payslips")
    .update({ advance_deduction: Math.round(capped * 100) / 100, net })
    .eq("id", payslipId);
  if (error) return { error: `Could not save: ${error.message}` };

  revalidatePath(`/payroll/${runId}`);
  return {};
}

export async function finalizeRun(runId: string): Promise<{ error?: string }> {
  await requireRole("owner");
  const supabase = await createClient();

  const { data: run } = await supabase
    .from("payroll_runs")
    .select("status")
    .eq("id", runId)
    .single();
  if (!run) return { error: "Run not found." };
  if (run.status !== "draft") return { error: "Already finalized." };

  const { data: slips } = await supabase
    .from("payslips")
    .select("employee_id, advance_deduction")
    .eq("run_id", runId)
    .gt("advance_deduction", 0);

  // Apply advance repayments oldest-first.
  for (const slip of slips ?? []) {
    let remaining = Number(slip.advance_deduction);
    const { data: advances } = await supabase
      .from("cash_advances")
      .select("id, amount, repaid")
      .eq("employee_id", slip.employee_id)
      .order("date");
    for (const adv of advances ?? []) {
      if (remaining <= 0) break;
      const open = Number(adv.amount) - Number(adv.repaid);
      if (open <= 0) continue;
      const pay = Math.min(open, remaining);
      await supabase
        .from("cash_advances")
        .update({ repaid: Math.round((Number(adv.repaid) + pay) * 100) / 100 })
        .eq("id", adv.id);
      remaining -= pay;
    }
  }

  const { error } = await supabase
    .from("payroll_runs")
    .update({ status: "finalized", finalized_at: new Date().toISOString() })
    .eq("id", runId);
  if (error) return { error: `Could not finalize: ${error.message}` };

  revalidatePath(`/payroll/${runId}`);
  revalidatePath("/payroll");
  return {};
}

export async function deleteRun(runId: string): Promise<{ error?: string }> {
  await requireRole("owner");
  const supabase = await createClient();
  const { data: run } = await supabase
    .from("payroll_runs")
    .select("status")
    .eq("id", runId)
    .single();
  if (!run) return { error: "Run not found." };
  if (run.status !== "draft") return { error: "Finalized runs cannot be deleted." };
  const { error } = await supabase.from("payroll_runs").delete().eq("id", runId);
  if (error) return { error: `Could not delete: ${error.message}` };
  revalidatePath("/payroll");
  redirect("/payroll");
}

// Re-read attendance/leaves and rebuild a draft run's payslips.
// Cash-advance deductions reset to 0 and must be re-entered.
export async function recomputeRun(runId: string): Promise<{ error?: string }> {
  await requireRole("owner");
  const supabase = await createClient();

  const { data: run } = await supabase
    .from("payroll_runs")
    .select("id, period_start, status")
    .eq("id", runId)
    .single();
  if (!run) return { error: "Run not found." };
  if (run.status !== "draft") return { error: "Finalized runs cannot be recomputed." };

  const { error: delError } = await supabase
    .from("payslips")
    .delete()
    .eq("run_id", runId);
  if (delError) return { error: `Could not reset: ${delError.message}` };
  const { error: delRunError } = await supabase
    .from("payroll_runs")
    .delete()
    .eq("id", runId);
  if (delRunError) return { error: `Could not reset: ${delRunError.message}` };

  const fd = new FormData();
  fd.set("period_start", run.period_start);
  return await createRun(null, fd); // redirects to the fresh run on success
}

// Unlock a finalized run back to draft, reversing the cash-advance
// repayments it recorded (newest advances first — the inverse of how
// finalize applied them oldest-first).
export async function reopenRun(runId: string): Promise<{ error?: string }> {
  await requireRole("owner");
  const supabase = await createClient();

  const { data: run } = await supabase
    .from("payroll_runs")
    .select("status")
    .eq("id", runId)
    .single();
  if (!run) return { error: "Run not found." };
  if (run.status !== "finalized") return { error: "This run is not finalized." };

  const { data: slips } = await supabase
    .from("payslips")
    .select("employee_id, advance_deduction")
    .eq("run_id", runId)
    .gt("advance_deduction", 0);

  for (const slip of slips ?? []) {
    let toReverse = Number(slip.advance_deduction);
    const { data: advances } = await supabase
      .from("cash_advances")
      .select("id, repaid")
      .eq("employee_id", slip.employee_id)
      .order("date", { ascending: false });
    for (const adv of advances ?? []) {
      if (toReverse <= 0) break;
      const repaid = Number(adv.repaid);
      if (repaid <= 0) continue;
      const undo = Math.min(repaid, toReverse);
      await supabase
        .from("cash_advances")
        .update({ repaid: Math.round((repaid - undo) * 100) / 100 })
        .eq("id", adv.id);
      toReverse -= undo;
    }
  }

  const { error } = await supabase
    .from("payroll_runs")
    .update({ status: "draft", finalized_at: null })
    .eq("id", runId);
  if (error) return { error: `Could not reopen: ${error.message}` };

  revalidatePath(`/payroll/${runId}`);
  revalidatePath("/payroll");
  return {};
}
