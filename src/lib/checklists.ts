// Project activity checklist templates. Adding a template here makes it
// available in every project's Checklists panel.

export type ChecklistItem = {
  key: string;
  label: string;
  done: boolean;
  by: string | null; // name of whoever ticked it
  at: string | null; // ISO timestamp
};

export const CHECKLIST_TEMPLATES: { key: string; title: string; items: string[] }[] = [
  {
    key: "inverter_installation",
    title: "Inverter Installation",
    items: [
      "Installation location matches the approved plan — ventilated, protected from rain and direct sun",
      "Clearances around the inverter per the manufacturer's manual (sides, top, front)",
      "Mounting surface solid; bracket level and securely anchored",
      "Inverter hung upright and locked onto the bracket",
      "DC isolator / breaker installed and correctly rated",
      "AC breaker rated per design; upstream protection at the tie-in panel verified",
      "String polarity verified with meter BEFORE termination (Voc of each string recorded)",
      "String open-circuit voltages within the inverter's MPPT window",
      "DC connectors (MC4) fully seated; DC terminals torqued to spec",
      "AC cables terminated and torqued to spec; conductor sizing per IFC drawings",
      "Battery cables correct polarity, fused/protected, torqued (hybrid)",
      "Earthing conductor connected; continuity to earth bar verified",
      "Surge protection devices (DC and AC) installed",
      "Cable entries sealed with glands; enclosure ingress protection kept",
      "Danger / rapid shutdown / labels and signage installed",
      "Work area cleaned, packaging removed, installation photos uploaded to the project",
    ],
  },
  {
    key: "hybrid_precommissioning",
    title: "Pre-Energization, Testing & Commissioning — Hybrid Inverter",
    items: [
      "All breakers and isolators OFF before starting checks",
      "Visual inspection passed — no damaged cables, loose terminals, or missing torque marks",
      "Insulation resistance test on DC strings passed and recorded",
      "String Voc and polarity re-verified and recorded on the test sheet",
      "Battery voltage and polarity verified; BMS communication cable connected",
      "Grid voltage and frequency measured at the inverter AC terminals — within limits (220 V 3Ф 3W)",
      "Earth continuity verified; earth resistance test passed",
      "AC phase sequence checked and correct",
      "Energization sequence followed per manual: battery → PV → grid",
      "Inverter configured: grid standard, voltage/frequency limits, battery type and charge profile",
      "Anti-islanding verified — inverter trips when the grid is disconnected",
      "Backup / EPS changeover tested with the backed-up loads",
      "Battery charge and discharge cycle tested",
      "Monitoring / Wi-Fi configured; live data visible on the portal",
      "Load test passed — no abnormal noise or heating; output vs irradiance recorded",
      "Client orientation done; handover documents and commissioning photos uploaded",
    ],
  },
];

export function newChecklistItems(templateKey: string): ChecklistItem[] | null {
  const t = CHECKLIST_TEMPLATES.find((x) => x.key === templateKey);
  if (!t) return null;
  return t.items.map((label, i) => ({
    key: `${templateKey}_${i + 1}`,
    label,
    done: false,
    by: null,
    at: null,
  }));
}
