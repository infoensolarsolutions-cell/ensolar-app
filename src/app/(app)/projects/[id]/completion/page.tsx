import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dateLongManila, fillPlaceholders } from "@/lib/contract";
import { ContractEditor } from "@/app/(app)/contracts/contract-editor";

export const metadata: Metadata = { title: "New Certificate of Completion" };

const BLANK = "_____________________________";

type Specs = {
  package?: string;
  inverter?: { brand?: string; total_kw?: number; kw?: number; qty?: number };
  panels?: { brand?: string; type?: string; watts?: number; qty?: number; kwp?: number };
  battery?: { brand?: string; type?: string; ah?: number; v?: number; qty?: number };
} | null;

const countWords: Record<number, string> = {
  1: "One", 2: "Two", 3: "Three", 4: "Four", 5: "Five",
  6: "Six", 7: "Seven", 8: "Eight", 9: "Nine", 10: "Ten",
};
const counted = (qty: number, unit: string) =>
  `${countWords[qty] ?? qty} (${qty}) ${unit}${qty === 1 ? "" : "s"}`;

export default async function NewCompletionCertificatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("owner", "office_staff");
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: project }, { data: template }] = await Promise.all([
    supabase
      .from("projects")
      .select(
        "id, project_no, site_address, system_kwp, system_specs, completed_date, customers (name, address, barangay), quotations (quote_no, quotation_items (description, qty, unit, sort_order))",
      )
      .eq("id", id)
      .single(),
    supabase
      .from("doc_templates")
      .select("body")
      .eq("key", "completion_certificate")
      .single(),
  ]);

  if (!project) notFound();
  if (!template) {
    return (
      <>
        <TopBar title="New Completion Certificate" backHref={`/projects/${id}`} />
        <p className="p-4 text-sm text-red-600">
          Certificate template not found — run the latest database migration
          (0043) first.
        </p>
      </>
    );
  }

  const customer = Array.isArray(project.customers) ? project.customers[0] : project.customers;
  const quotation = Array.isArray(project.quotations) ? project.quotations[0] : project.quotations;
  const specs = project.system_specs as Specs;

  const address =
    project.site_address ||
    [customer?.address, customer?.barangay].filter(Boolean).join(", ") ||
    BLANK;

  // System description: prefer the structured specs, fall back to blanks the
  // owner fills in while editing.
  const kwp = project.system_kwp ?? specs?.panels?.kwp;
  const sysDescription = `${kwp ?? "________"} kWp ${specs?.package ?? "____________________"} Solar Power System`;

  // Major components: structured system specs first, then quotation items,
  // then a blank skeleton matching the paper form.
  const specLines: string[] = [];
  if (specs?.panels?.qty) {
    specLines.push(
      `- ${counted(specs.panels.qty, "unit")} ${[
        specs.panels.watts && `${specs.panels.watts}W`,
        specs.panels.brand, specs.panels.type,
      ].filter(Boolean).join(" ")} Solar Panels`,
    );
  }
  if (specs?.inverter) {
    const q = specs.inverter.qty ?? 1;
    specLines.push(
      `- ${counted(q, "unit")} ${[
        specs.inverter.kw && `${specs.inverter.kw}kW`,
        specs.inverter.brand,
      ].filter(Boolean).join(" ")} Inverter`,
    );
  }
  if (specs?.battery?.qty) {
    specLines.push(
      `- ${counted(specs.battery.qty, "unit")} ${[
        specs.battery.ah && `${specs.battery.ah}Ah`,
        specs.battery.v && `${specs.battery.v}V`,
        specs.battery.brand, specs.battery.type,
      ].filter(Boolean).join(" ")} Batteries`,
    );
  }

  const quoteLines = (quotation?.quotation_items ?? [])
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((i) => `- ${counted(Number(i.qty), i.unit || "unit")} ${i.description}`);

  const equipment = [
    ...(specLines.length ? specLines : quoteLines),
    ...(specLines.length || quoteLines.length
      ? []
      : [
          "- ________ units ________ W ____________________ Solar Panels",
          "- ________ unit(s) ________ kW ____________________ Inverter",
          "- ________ unit(s) ________ Ah ________ V LiFePO4 Batteries (if applicable)",
        ]),
    "- Mounting structures, protection devices, disconnects, wiring systems, grounding materials, conduits, and all other required solar PV accessories and components necessary for proper and safe operation of the system",
  ].join("\n");

  const body = fillPlaceholders(template.body, {
    DATE_LONG: dateLongManila(),
    COMPLETION_DATE: project.completed_date
      ? dateLongManila(new Date(`${project.completed_date}T12:00:00+08:00`))
      : BLANK,
    CUSTOMER_NAME: customer?.name ?? BLANK,
    CUSTOMER_ADDRESS: address,
    SYSTEM_DESCRIPTION: sysDescription,
    EQUIPMENT_LIST: equipment,
    BANK_NAME: BLANK,
  });

  return (
    <>
      <TopBar
        title={`Completion — ${project.project_no}`}
        backHref={`/projects/${id}`}
      />
      <ContractEditor projectId={project.id} initialBody={body} docType="completion" />
    </>
  );
}
