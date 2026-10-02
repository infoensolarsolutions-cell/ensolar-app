// Which products are serialized equipment: every physical unit carries a
// serial number that must be registered (inverters, batteries, panels).
// Matched by product name so no extra catalog field is needed.
export function serializedEquipmentType(
  productName: string,
): "inverter" | "battery" | "solar_panel" | null {
  const n = productName.toLowerCase();
  if (n.includes("inverter")) return "inverter";
  if (n.includes("battery") || n.includes("lifepo") || n.includes("batt ")) return "battery";
  if (n.includes("panel") || n.includes("module")) return "solar_panel";
  return null;
}

export function parseSerials(raw: string): string[] {
  return raw
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 200);
}
