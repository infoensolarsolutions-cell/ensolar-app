"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { KB_CATEGORIES } from "@/lib/kb";

function readFields(formData: FormData) {
  return {
    category: String(formData.get("category") ?? ""),
    brand: String(formData.get("brand") ?? "").trim().slice(0, 100) || null,
    model: String(formData.get("model") ?? "").trim().slice(0, 100) || null,
    problem: String(formData.get("problem") ?? "").trim().slice(0, 2000),
    solution: String(formData.get("solution") ?? "").trim().slice(0, 4000),
    source: String(formData.get("source") ?? "").trim().slice(0, 200) || null,
  };
}

export async function addKbIssue(
  _prev: { error?: string; saved?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; saved?: boolean }> {
  const profile = await requireRole("owner", "office_staff");
  const fields = readFields(formData);
  if (!(fields.category in KB_CATEGORIES)) return { error: "Choose a category." };
  if (!fields.problem) return { error: "Describe the problem." };
  if (!fields.solution) return { error: "Describe the solution." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("kb_issues")
    .insert({ ...fields, created_by: profile.id });
  if (error) return { error: `Could not save: ${error.message}` };

  revalidatePath("/knowledge");
  return { saved: true };
}

export async function updateKbIssue(
  _prev: { error?: string; saved?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; saved?: boolean }> {
  await requireRole("owner", "office_staff");
  const id = String(formData.get("id") ?? "");
  const fields = readFields(formData);
  if (!id) return { error: "Missing entry reference." };
  if (!(fields.category in KB_CATEGORIES)) return { error: "Choose a category." };
  if (!fields.problem) return { error: "Describe the problem." };
  if (!fields.solution) return { error: "Describe the solution." };

  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("kb_issues")
    .update(fields)
    .eq("id", id)
    .select("id");
  if (error) return { error: `Could not save: ${error.message}` };
  if (!updated?.length) return { error: "Entry not found." };

  revalidatePath("/knowledge");
  return { saved: true };
}

// One-tap import: scan every project's resolved after-sales tickets and file
// each as a knowledge base entry under the best-guess category, with the
// brand read from the ticket text or the project's installed-system specs.
// Re-running skips tickets already imported (matched by ticket no. in source).

const BRAND_WORDS = [
  "Sunways", "Growatt", "Deye", "Solis", "Huawei", "GoodWe", "Sofar", "Solax",
  "Victron", "Megarevo", "Senergy", "Sungrow", "LVTOPSUN", "Canadian Solar",
  "Jinko", "Longi", "Trina", "JA Solar", "AE Solar", "Osda", "Eve", "CATL",
  "Pylontech", "Dyness", "Vestwoods", "Hinen", "Felicity",
];

type TicketSpecs = {
  package?: string;
  inverter?: { brand?: string };
  panels?: { brand?: string };
  battery?: { brand?: string };
} | null;

function categorize(text: string, specs: TicketSpecs): { category: string; brand: string | null } {
  const t = text.toLowerCase();
  const has = (...words: string[]) => words.some((w) => t.includes(w));

  let category = "other";
  if (has("battery", "batteries", "lifepo", "bms", "soc", "state of charge", "charging", "discharge")) {
    category = "battery";
  } else if (has("wifi", "wi-fi", "monitoring", "logger", "datalogger", "app ", "signal", "offline", "shinephone", "solarman", "deyecloud", "internet")) {
    category = "monitoring";
  } else if (has("inverter", "grid", "export", "anti-island", "ac output", "frequency", "voltage fault")) {
    const hybrid = has("hybrid", "battery", "backup", "off-grid");
    category = hybrid ? "hybrid_inverter" : "gridtie_inverter";
  } else if (has("panel", "module", "pv string", "hotspot", "hot spot", "mismatch", "shading")) {
    category = "solar_panel";
  } else if (has("breaker", "wire", "wiring", "cable", "trip", "ground", "earth", "spd", "surge", "loose", "terminal", "conduit")) {
    category = "wiring";
  }

  let brand =
    BRAND_WORDS.find((b) => t.includes(b.toLowerCase())) ?? null;
  if (!brand && specs) {
    if (category === "battery") brand = specs.battery?.brand ?? null;
    else if (category.endsWith("inverter") || category === "monitoring") brand = specs.inverter?.brand ?? null;
    else if (category === "solar_panel") brand = specs.panels?.brand ?? null;
  }
  return { category, brand };
}

export async function importResolvedTickets(): Promise<{
  error?: string;
  imported?: number;
  skipped?: number;
  noSolution?: number;
}> {
  const profile = await requireRole("owner");
  const supabase = await createClient();

  const [{ data: tickets, error: tErr }, { data: existing }] = await Promise.all([
    supabase
      .from("service_tickets")
      .select(
        "id, ticket_no, problem, diagnosis, action_taken, resolved_at, project_id, projects (project_no, system_specs)",
      )
      .eq("status", "resolved")
      .order("reported_at")
      .limit(1000),
    supabase.from("kb_issues").select("source").like("source", "Ticket %"),
  ]);
  if (tErr) return { error: `Could not read tickets: ${tErr.message}` };

  const imported = new Set(
    (existing ?? []).map((e) => (e.source ?? "").split(" · ")[0]),
  );

  let added = 0;
  let skipped = 0;
  let noSolution = 0;
  for (const t of tickets ?? []) {
    if (imported.has(`Ticket ${t.ticket_no}`)) {
      skipped++;
      continue;
    }
    const solution = [t.diagnosis, t.action_taken]
      .filter((s) => s && s.trim())
      .join("\n\n");
    if (!solution) {
      noSolution++;
      continue;
    }
    const project = Array.isArray(t.projects) ? t.projects[0] : t.projects;
    const { category, brand } = categorize(
      `${t.problem} ${solution}`,
      (project?.system_specs ?? null) as TicketSpecs,
    );

    const { error } = await supabase.from("kb_issues").insert({
      category,
      brand,
      problem: t.problem,
      solution,
      source: `Ticket ${t.ticket_no} · ${project?.project_no ?? "unknown project"}`,
      project_id: t.project_id,
      created_by: profile.id,
    });
    if (error) return { error: `Stopped at ${t.ticket_no}: ${error.message}`, imported: added, skipped, noSolution };
    added++;
  }

  revalidatePath("/knowledge");
  return { imported: added, skipped, noSolution };
}

export async function deleteKbIssue(id: string): Promise<{ error?: string }> {
  await requireRole("owner");
  const supabase = await createClient();
  const { error } = await supabase.from("kb_issues").delete().eq("id", id);
  if (error) return { error: `Could not delete: ${error.message}` };
  revalidatePath("/knowledge");
  return {};
}
