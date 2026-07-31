// Project activity checklist templates, parameterized by the equipment being
// installed. Requirements are generated from the entered specs (kW, voltage,
// phase) so each item states the concrete minimum to comply with.

export type ItemStatus = "pass" | "fail" | "na" | null;

export type ChecklistItem = {
  key: string;
  label: string;
  requirement: string;
  status: ItemStatus;
  by: string | null; // who marked it
  at: string | null; // ISO timestamp
  comment: string | null;
  done?: boolean; // legacy tick-style items (pre-equipment checklists)
};

export type Equipment = {
  brand: string;
  model: string;
  kw: number;
  voltage: number;
  phases: 1 | 3;
};

const r1 = (n: number) => Math.round(n * 10) / 10;

export function fullLoadAmps(eq: Equipment): number {
  const w = eq.kw * 1000;
  return r1(eq.phases === 3 ? w / (Math.sqrt(3) * eq.voltage) : w / eq.voltage);
}

function phaseLabel(eq: Equipment): string {
  return eq.phases === 3 ? "three-phase" : "single-phase";
}

type ItemSpec = { label: string; req: (eq: Equipment) => string };

const INSTALL_ITEMS: ItemSpec[] = [
  { label: "Installation location and environment",
    req: (eq) => `Sheltered from rain and direct sun, ventilated, ambient within the ${eq.brand} ${eq.model} operating range per datasheet (typically ≤ 45°C without derating)` },
  { label: "Clearances around the inverter",
    req: (eq) => `Per the ${eq.brand} ${eq.model} manual — as a minimum 300 mm on the sides and 500 mm above and below; no stacking of heat sources` },
  { label: "Mounting bracket and orientation",
    req: (eq) => `Bracket anchored to a solid structure able to carry at least twice the unit weight; inverter upright and locked; level within manual tolerance (${eq.kw} kW unit)` },
  { label: "DC isolator / breaker rating",
    req: (eq) => `Rated ≥ maximum system Voc and ≥ 1.25 × string Isc, per the ${eq.brand} ${eq.model} datasheet limits` },
  { label: "AC breaker rating",
    req: (eq) => `≥ ${r1(fullLoadAmps(eq) * 1.25)} A (125% of full-load ≈ ${fullLoadAmps(eq)} A at ${eq.kw} kW, ${eq.voltage} V ${phaseLabel(eq)}); breaking capacity per panel fault level` },
  { label: "AC cable sizing",
    req: (eq) => `Ampacity ≥ ${r1(fullLoadAmps(eq) * 1.25)} A after conduit-fill derating; voltage drop/rise ≤ 3% over the full run at ${fullLoadAmps(eq)} A` },
  { label: "String voltage and polarity before termination",
    req: (eq) => `Every string's Voc measured and recorded; polarity correct; Voc within the ${eq.brand} ${eq.model} MPPT window and below its max DC input voltage` },
  { label: "DC terminations",
    req: () => "MC4 connectors fully engaged (click test); DC terminals torqued per the manual's Nm table; no copper strands exposed" },
  { label: "AC terminations",
    req: (eq) => `Terminals torqued per manual; conductor markings correct; ${eq.phases === 3 ? "phase sequence L1-L2-L3 verified" : "line and neutral correctly landed"}` },
  { label: "Battery connection (hybrid)",
    req: () => "Correct polarity confirmed with meter before landing; battery fuse/breaker per the battery manual; cables torqued; BMS comm cable routed away from power cables" },
  { label: "Earthing and bonding",
    req: () => "Inverter frame, array frames, and mounting structure bonded to the earth bar; earth electrode resistance ≤ 5 Ω recommended (≤ 25 Ω maximum per PEC)" },
  { label: "Surge protection",
    req: () => "Type II SPDs on both DC and AC sides, installed per manual and connected to earth with short leads" },
  { label: "Enclosure ingress protection",
    req: () => "All cable entries glanded and sealed; unused knockouts plugged; enclosure IP rating preserved" },
  { label: "Labels and signage",
    req: () => "DC danger, dual-supply warning, and shutdown procedure posted at the inverter and tie-in panel" },
  { label: "Housekeeping and documentation",
    req: () => "Work area cleared, packaging removed, installation photos uploaded to the project" },
];

const TC_ITEMS: ItemSpec[] = [
  { label: "Isolation before checks",
    req: () => "All PV, battery, and AC isolators/breakers OFF; lockout-tagout applied at the tie-in panel" },
  { label: "Visual inspection",
    req: () => "No damaged insulation, loose terminations, or missing torque marks; glands sealed; signage in place" },
  { label: "Insulation resistance (DC strings)",
    req: () => "≥ 1 MΩ per string at 500/1000 V DC test voltage (array dry); results recorded" },
  { label: "String Voc and polarity (re-check)",
    req: (eq) => `Voc of every string re-measured at the inverter end, within the ${eq.brand} ${eq.model} MPPT window and below max DC input; polarity correct; recorded` },
  { label: "Battery pre-checks (hybrid)",
    req: () => "Battery voltage within the battery datasheet range; polarity correct; BMS communication cable connected and battery recognized" },
  { label: "Grid voltage and frequency at inverter terminals",
    req: (eq) => `${eq.voltage} V ${phaseLabel(eq)} within ±10% (${r1(eq.voltage * 0.9)}–${r1(eq.voltage * 1.1)} V); frequency 60 Hz ± 1 Hz; measured and recorded` },
  { label: "Earth continuity and electrode",
    req: () => "Continuity < 1 Ω from inverter earth terminal to earth bar; electrode ≤ 5 Ω recommended (≤ 25 Ω maximum per PEC)" },
  { label: "Phase sequence",
    req: (eq) => eq.phases === 3
      ? "Rotation L1-L2-L3 verified with a phase-sequence meter"
      : "Not applicable for single-phase — mark N/A" },
  { label: "Energization sequence",
    req: (eq) => `Per the ${eq.brand} ${eq.model} manual — typically battery first, then PV, then grid; each step verified before the next` },
  { label: "Inverter configuration",
    req: (eq) => `Grid standard and limits set for the Philippines (60 Hz, ${eq.voltage} V); battery type and charge profile per battery brand; export limit per design/NORECO II approval` },
  { label: "Anti-islanding protection",
    req: () => "Inverter disconnects within 2 seconds when the grid supply is switched off; reconnects only after the required observation delay" },
  { label: "Backup / EPS changeover (hybrid)",
    req: () => "Transfer to backup supply within the datasheet transfer time; backed-up loads run normally; return to grid verified" },
  { label: "Battery charge/discharge test",
    req: () => "Battery charges from PV and discharges to loads at the expected power; no BMS alarms" },
  { label: "Monitoring commissioning",
    req: () => "Wi-Fi/datalogger online; plant visible on the monitoring portal with correct site name; owner access added" },
  { label: "Performance / load test",
    req: (eq) => `Output consistent with irradiance for a ${eq.kw} kW system; no derating, abnormal noise, or overheating; snapshot of output recorded` },
  { label: "Client orientation and handover",
    req: () => "Owner briefed on operation, shutdown, and monitoring; commissioning photos and documents uploaded to the project" },
];

export const CHECKLIST_TEMPLATES: {
  key: string;
  title: string;
  items: ItemSpec[];
}[] = [
  { key: "inverter_installation", title: "Inverter Installation", items: INSTALL_ITEMS },
  { key: "hybrid_precommissioning", title: "Pre-Energization, Testing & Commissioning — Hybrid Inverter", items: TC_ITEMS },
];

export function newChecklistItems(
  templateKey: string,
  eq: Equipment,
): ChecklistItem[] | null {
  const t = CHECKLIST_TEMPLATES.find((x) => x.key === templateKey);
  if (!t) return null;
  return t.items.map((item, i) => ({
    key: `${templateKey}_${i + 1}`,
    label: item.label,
    requirement: item.req(eq),
    status: null,
    by: null,
    at: null,
    comment: null,
  }));
}

// Older checklists were plain ticks without requirements — normalize on read.
export function normalizeItems(items: ChecklistItem[]): ChecklistItem[] {
  return items.map((i) => ({
    ...i,
    requirement: i.requirement ?? "",
    status: i.status ?? (i.done ? "pass" : null),
    comment: i.comment ?? null,
  }));
}
