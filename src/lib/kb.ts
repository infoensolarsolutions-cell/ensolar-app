export const KB_CATEGORIES = {
  battery: "🔋 Battery",
  gridtie_inverter: "⚡ Grid-tie Inverter",
  hybrid_inverter: "🔌 Hybrid Inverter",
  solar_panel: "☀️ Solar Panel",
  monitoring: "📶 Monitoring / Wi-Fi",
  wiring: "🔧 Wiring / Electrical",
  other: "📋 Other",
} as const;

export type KbCategory = keyof typeof KB_CATEGORIES;
