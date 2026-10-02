import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { dateLongManila } from "@/lib/contract";
import { formatDate } from "@/lib/format";

// Placeholder data for the technical documents (Electrical Test &
// Commissioning, Equipment Specifications): project + system specs +
// serial numbers from the Equipment Registry, with blanks where data is
// missing so the editor shows what still needs filling.

const BLANK = "________";

type Specs = {
  package?: string;
  inverter?: { brand?: string; total_kw?: number; kw?: number; qty?: number };
  panels?: { brand?: string; type?: string; watts?: number; qty?: number; kwp?: number };
  battery?: { brand?: string; type?: string; ah?: number; v?: number; qty?: number };
} | null;

export async function techDocData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
): Promise<{ projectNo: string; map: Record<string, string> } | null> {
  const [{ data: project }, { data: units }] = await Promise.all([
    supabase
      .from("projects")
      .select(
        "id, project_no, site_address, contract_amount, completed_date, system_kwp, system_specs, customers (name, address, barangay)",
      )
      .eq("id", projectId)
      .single(),
    supabase
      .from("equipment_units")
      .select("equipment_type, serial_no, model")
      .eq("project_id", projectId),
  ]);
  if (!project) return null;

  const customer = Array.isArray(project.customers) ? project.customers[0] : project.customers;
  const specs = project.system_specs as Specs;

  const serialsOf = (type: string) =>
    (units ?? [])
      .filter((u) => u.equipment_type === type)
      .map((u) => u.serial_no)
      .join(", ") || BLANK;
  const modelsOf = (type: string) => {
    const models = [...new Set(
      (units ?? [])
        .filter((u) => u.equipment_type === type && u.model)
        .map((u) => u.model as string),
    )];
    return models.join(", ");
  };

  const kwp = project.system_kwp ?? specs?.panels?.kwp;
  const inverterKw = specs?.inverter?.total_kw ?? specs?.inverter?.kw;

  const map: Record<string, string> = {
    PROJECT_NO: project.project_no,
    DATE_LONG: dateLongManila(),
    CUSTOMER_NAME: customer?.name ?? BLANK,
    SITE_ADDRESS:
      project.site_address ||
      [customer?.address, customer?.barangay].filter(Boolean).join(", ") ||
      BLANK,
    SYSTEM_DESCRIPTION: `${kwp ?? BLANK} kWp ${specs?.package ?? "Solar Power"} System`,
    PANEL_BRAND: specs?.panels?.brand ?? BLANK,
    PANEL_TYPE: specs?.panels?.type ?? BLANK,
    PANEL_W: specs?.panels?.watts ? String(specs.panels.watts) : BLANK,
    PANEL_QTY: specs?.panels?.qty ? String(specs.panels.qty) : BLANK,
    INVERTER_BRAND: specs?.inverter?.brand ?? BLANK,
    INVERTER_MODEL: modelsOf("inverter") || BLANK,
    INVERTER_W: inverterKw ? (inverterKw * 1000).toLocaleString("en-PH") : BLANK,
    INVERTER_SERIALS: serialsOf("inverter"),
    BATTERY_BRAND: specs?.battery?.brand ?? BLANK,
    BATTERY_TYPE: specs?.battery?.type ?? BLANK,
    BATTERY_SPEC:
      specs?.battery?.ah || specs?.battery?.v
        ? [specs.battery?.ah && `${specs.battery.ah}Ah`, specs.battery?.v && `${specs.battery.v}V`]
            .filter(Boolean)
            .join(", ")
        : BLANK,
    BATTERY_QTY: specs?.battery?.qty ? String(specs.battery.qty) : BLANK,
    BATTERY_SERIALS: serialsOf("battery"),
    CONTRACT_AMOUNT: Number(project.contract_amount) > 0
      ? Number(project.contract_amount).toLocaleString("en-PH", {
          minimumFractionDigits: 2, maximumFractionDigits: 2,
        })
      : BLANK,
    INSTALL_DATE: project.completed_date ? formatDate(project.completed_date) : BLANK,
  };

  return { projectNo: project.project_no, map };
}
