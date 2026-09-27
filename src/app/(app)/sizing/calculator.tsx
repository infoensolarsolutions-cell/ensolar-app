"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30";

// Hybrid inverter options with max PV input power taken from the
// manufacturers' datasheets (Deye ~130% of rated AC, Solis S6 ~160%,
// SRNE ~120%). Always verify against the datasheet of the exact unit on
// hand before final design — models get revised.
type Inverter = {
  brand: "Deye" | "Solis" | "SRNE";
  model: string;
  kw: number;
  maxPvW: number;
  phase: "1φ" | "3φ";
};

const INVERTERS: Inverter[] = [
  { brand: "Deye", model: "SUN-3.6K-SG03LP1", kw: 3.6, maxPvW: 4680, phase: "1φ" },
  { brand: "Deye", model: "SUN-5K-SG03LP1", kw: 5, maxPvW: 6500, phase: "1φ" },
  { brand: "Deye", model: "SUN-6K-SG03LP1", kw: 6, maxPvW: 7800, phase: "1φ" },
  { brand: "Deye", model: "SUN-8K-SG01LP1", kw: 8, maxPvW: 10400, phase: "1φ" },
  { brand: "Deye", model: "SUN-10K-SG04LP3", kw: 10, maxPvW: 13000, phase: "3φ" },
  { brand: "Deye", model: "SUN-12K-SG04LP3", kw: 12, maxPvW: 15600, phase: "3φ" },
  // SG01LP1-EU-AM3-P single-phase LV series: sized on the datasheet's
  // "Max. PV Input Power" (the usable limit, not the 200% access power);
  // battery range 40–60 V (LV).
  { brand: "Deye", model: "SUN-12K-SG01LP1-AM3-P", kw: 12, maxPvW: 19200, phase: "1φ" },
  { brand: "Deye", model: "SUN-14K-SG01LP1-AM3-P", kw: 14, maxPvW: 22400, phase: "1φ" },
  { brand: "Deye", model: "SUN-16K-SG01LP1-AM3-P", kw: 16, maxPvW: 25600, phase: "1φ" },
  { brand: "Deye", model: "SUN-18K-SG01LP1-AM3-P", kw: 18, maxPvW: 28800, phase: "1φ" },
  { brand: "Deye", model: "SUN-20K-SG01HP3 (HV)", kw: 20, maxPvW: 26000, phase: "3φ" },
  { brand: "Deye", model: "SUN-30K-SG01HP3 (HV)", kw: 30, maxPvW: 39000, phase: "3φ" },
  { brand: "Deye", model: "SUN-50K-SG01HP3 (HV)", kw: 50, maxPvW: 65000, phase: "3φ" },
  { brand: "Solis", model: "S6-EH1P3.6K-L-PLUS", kw: 3.6, maxPvW: 5760, phase: "1φ" },
  { brand: "Solis", model: "S6-EH1P5K-L-PLUS", kw: 5, maxPvW: 8000, phase: "1φ" },
  { brand: "Solis", model: "S6-EH1P6K-L-PLUS", kw: 6, maxPvW: 9600, phase: "1φ" },
  { brand: "Solis", model: "S6-EH1P8K-L-PLUS", kw: 8, maxPvW: 12800, phase: "1φ" },
  // S6-EH3P…-L three-phase LV series (battery 40–60 V): sized on the
  // datasheet's "Max. usable PV input power" (160% of rated AC).
  { brand: "Solis", model: "S6-EH3P8K-L", kw: 8, maxPvW: 12800, phase: "3φ" },
  { brand: "Solis", model: "S6-EH3P10K-L", kw: 10, maxPvW: 16000, phase: "3φ" },
  { brand: "Solis", model: "S6-EH3P12K-L", kw: 12, maxPvW: 19200, phase: "3φ" },
  { brand: "Solis", model: "S6-EH3P15K-L", kw: 15, maxPvW: 24000, phase: "3φ" },
  { brand: "Solis", model: "S6-EH3P18K-L", kw: 18, maxPvW: 28800, phase: "3φ" },
  { brand: "Solis", model: "S6-EH3P29.9K-H (HV)", kw: 29.9, maxPvW: 47840, phase: "3φ" },
  { brand: "Solis", model: "S6-EH3P50K-H (HV)", kw: 50, maxPvW: 80000, phase: "3φ" },
  // SRNE HESP 48 V single-phase hybrids, sized on the datasheets' "Max. PV
  // Input Power" (S200-H: two MPPTs summed; S300/S340/S380-H: three MPPTs).
  { brand: "SRNE", model: "HESP4880S200-H (8.8 kW)", kw: 8.8, maxPvW: 11000, phase: "1φ" },
  { brand: "SRNE", model: "HESP48100S200-H (10 kW)", kw: 10, maxPvW: 11000, phase: "1φ" },
  { brand: "SRNE", model: "HESP48120S200-H (12 kW)", kw: 12, maxPvW: 13200, phase: "1φ" },
  { brand: "SRNE", model: "HESP48140S300-H (14 kW)", kw: 14, maxPvW: 22400, phase: "1φ" },
  { brand: "SRNE", model: "HESP48160S340-H (16 kW)", kw: 16, maxPvW: 25600, phase: "1φ" },
  { brand: "SRNE", model: "HESP48180S380-H (18 kW)", kw: 18, maxPvW: 28800, phase: "1φ" },
];

const BRANDS = ["Deye", "Solis", "SRNE"] as const;

// 51.2 V LiFePO4 battery options (kWh = 51.2 V × Ah ÷ 1000). LV Topsun is
// the house brand; the Ah choices cover the common LV sizes.
const BATTERY_OPTIONS = [
  { ah: 100, kwh: 5.12 },
  { ah: 200, kwh: 10.24 },
  { ah: 280, kwh: 14.34 },
  { ah: 314, kwh: 16.08 },
] as const;

function num(v: string): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

const fmt = (n: number, digits = 2) =>
  n.toLocaleString("en-PH", { maximumFractionDigits: digits });

const r2 = (n: number) => Math.round(n * 100) / 100;

export type SizingProduct = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  selling_price: number;
};

export function SizingCalculator({
  products = [],
  canQuote = false,
}: {
  products?: SizingProduct[];
  canQuote?: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"kwh" | "bill">("bill");
  const [monthlyKwhIn, setMonthlyKwhIn] = useState("");
  const [bill, setBill] = useState("");
  const [rate, setRate] = useState("13");
  const [psh, setPsh] = useState("4");
  const [factor, setFactor] = useState("1.2");
  const [panelW, setPanelW] = useState("585");
  const [nightPct, setNightPct] = useState("50");
  const [batteryAh, setBatteryAh] = useState("314");

  // ── Pricing (for the auto-quotation) ────────────────────────────────────
  const [panelDesc, setPanelDesc] = useState("");
  const [panelPrice, setPanelPrice] = useState("");
  const [inverterDesc, setInverterDesc] = useState("");
  const [inverterPrice, setInverterPrice] = useState("");
  const [batteryDesc, setBatteryDesc] = useState("");
  const [batteryPrice, setBatteryPrice] = useState("");
  const [railPrice, setRailPrice] = useState("");
  const [endPrice, setEndPrice] = useState("");
  const [midPrice, setMidPrice] = useState("");
  const [lfootPrice, setLfootPrice] = useState("");
  const [bosPct, setBosPct] = useState("30");
  const [itcPct, setItcPct] = useState("25");
  const [loadedPrices, setLoadedPrices] = useState(false);

  // Remember typed prices on this device so staff enter them once.
  useEffect(() => {
    try {
      const raw = localStorage.getItem("sizing-prices");
      if (raw) {
        const p = JSON.parse(raw) as Record<string, string>;
        if (p.panelPrice) setPanelPrice(p.panelPrice);
        if (p.inverterPrice) setInverterPrice(p.inverterPrice);
        if (p.batteryPrice) setBatteryPrice(p.batteryPrice);
        if (p.railPrice) setRailPrice(p.railPrice);
        if (p.endPrice) setEndPrice(p.endPrice);
        if (p.midPrice) setMidPrice(p.midPrice);
        if (p.lfootPrice) setLfootPrice(p.lfootPrice);
      }
    } catch {
      // Blocked storage — start blank.
    }
    setLoadedPrices(true);
  }, []);
  useEffect(() => {
    if (!loadedPrices) return;
    try {
      localStorage.setItem(
        "sizing-prices",
        JSON.stringify({ panelPrice, inverterPrice, batteryPrice, railPrice, endPrice, midPrice, lfootPrice }),
      );
    } catch {
      // Nothing to do — prices just won't be remembered.
    }
  }, [loadedPrices, panelPrice, inverterPrice, batteryPrice, railPrice, endPrice, midPrice, lfootPrice]);

  // ── The sizing worksheet, exactly as specified ─────────────────────────
  const monthlyKwh =
    mode === "kwh" ? num(monthlyKwhIn) : num(rate) > 0 ? num(bill) / num(rate) : 0;
  const kwhPerDay = monthlyKwh / 30;
  const pshN = num(psh) || 4;
  const rawKw = pshN > 0 ? kwhPerDay / pshN : 0;
  const safeKw = rawKw * (num(factor) || 1.2);
  const watts = safeKw * 1000;
  const panelWN = num(panelW);
  const panels = panelWN > 0 ? Math.ceil(watts / panelWN) : 0;
  const arrayW = panels * panelWN;
  const monthlyProduction = (arrayW * pshN * 30) / 1000; // kWh the array can make

  const ready = monthlyKwh > 0 && panelWN > 0;

  // ── Battery: cover the night share of daily use at 80% usable depth ────
  const nightFrac = Math.min(100, Math.max(0, num(nightPct))) / 100;
  const requiredBatteryKwh = (kwhPerDay * nightFrac) / 0.8;
  const battery =
    BATTERY_OPTIONS.find((b) => b.ah === Number(batteryAh)) ?? BATTERY_OPTIONS[3];
  const batteryQty =
    requiredBatteryKwh > 0 ? Math.max(1, Math.ceil(requiredBatteryKwh / battery.kwh)) : 0;

  // ── Mounting materials, per the company's counting rules ───────────────
  const rails = panels; // 2.4 m aluminum rails = number of panels
  const endClamps = arrayW > 0 ? Math.ceil(arrayW / 2000) * 4 : 0; // 4 pcs per 2 kW
  const midClamps = Math.max(0, (panels - 2) * 2);
  const lFeet = panels * 3;

  // ── Costing: panels + inverter + battery + mounting, then BOS % on the
  // sub-total, then Installation/Testing/Commissioning % on the second
  // sub-total — the company's standard quotation build-up.
  const panelsCost = panels * num(panelPrice);
  const inverterCost = num(inverterPrice);
  const batteryCost = batteryQty * num(batteryPrice);
  const mountingCost =
    rails * num(railPrice) +
    endClamps * num(endPrice) +
    midClamps * num(midPrice) +
    lFeet * num(lfootPrice);
  const sub1 = panelsCost + inverterCost + batteryCost + mountingCost;
  const bosCost = r2(sub1 * ((num(bosPct) || 0) / 100));
  const sub2 = sub1 + bosCost;
  const itcCost = r2(sub2 * ((num(itcPct) || 0) / 100));
  const totalProject = sub2 + itcCost;
  const pricingReady = sub1 > 0;

  function createQuotation() {
    const deyeFit = suggestions.find((s) => s.brand === "Deye")?.fit;
    const items = [
      {
        description:
          panelDesc.trim() || `Solar PV Module, ${fmt(panelWN, 0)}W, N-type Bifacial`,
        qty: panels,
        unit: "pcs",
        unit_price: num(panelPrice),
      },
      {
        description:
          inverterDesc.trim() ||
          `Hybrid Inverter${deyeFit ? `, ${fmt(deyeFit.kw)}kW (${deyeFit.model})` : ""}`,
        qty: 1,
        unit: "pc",
        unit_price: num(inverterPrice),
      },
      ...(batteryQty > 0 && num(batteryPrice) > 0
        ? [{
            description:
              batteryDesc.trim() ||
              `Battery, LiFePO4, ${battery.ah}AH, 51.2V, LV Topsun`,
            qty: batteryQty,
            unit: "pcs",
            unit_price: num(batteryPrice),
          }]
        : []),
      {
        description: `Mounting materials — aluminum rails 2.4m (${rails} pcs), end clamps (${endClamps} pcs), mid clamps (${midClamps} pcs), L-foot (${lFeet} pcs)`,
        qty: 1,
        unit: "lot",
        unit_price: r2(mountingCost),
      },
      {
        description:
          "Balance of System (BOS) — DC & AC protection, wiring materials, conduits & fittings, grounding materials",
        qty: 1,
        unit: "lot",
        unit_price: bosCost,
      },
      {
        description: "Installation, Testing & Commissioning",
        qty: 1,
        unit: "lot",
        unit_price: itcCost,
      },
    ].filter((i) => i.qty > 0);
    try {
      sessionStorage.setItem(
        "sizing-quotation",
        JSON.stringify({ items, project_name: `${fmt(arrayW / 1000)} kWp Hybrid Solar PV System` }),
      );
    } catch {
      alert("Could not hand the items to the quotation builder — please copy them manually.");
      return;
    }
    router.push("/quotations/new");
  }

  // Per brand: the smallest inverter whose datasheet max PV fits the array.
  const suggestions = BRANDS.map((brand) => {
    const options = INVERTERS.filter((i) => i.brand === brand).sort(
      (a, b) => a.maxPvW - b.maxPvW,
    );
    const fit = options.find((i) => i.maxPvW >= arrayW) ?? null;
    return { brand, fit, largest: options[options.length - 1] };
  });

  return (
    <div className="space-y-4">
      {/* ── Inputs ── */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <p className="mb-2 font-semibold text-gray-900">Customer&apos;s usage</p>
        <div className="mb-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode("bill")}
            className={`rounded-lg px-3 py-2.5 text-sm font-semibold ${mode === "bill" ? "bg-brand-green text-white" : "border border-gray-300 text-gray-700"}`}
          >
            ₱ Monthly bill
          </button>
          <button
            type="button"
            onClick={() => setMode("kwh")}
            className={`rounded-lg px-3 py-2.5 text-sm font-semibold ${mode === "kwh" ? "bg-brand-green text-white" : "border border-gray-300 text-gray-700"}`}
          >
            ⚡ Monthly kWh
          </button>
        </div>

        {mode === "bill" ? (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500">Monthly electric bill (₱)</label>
              <input
                type="number" min="0" step="any" inputMode="decimal"
                value={bill} onChange={(e) => setBill(e.target.value)}
                placeholder="e.g. 5000" className={inputClass} autoFocus
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Electricity rate (₱/kWh)</label>
              <input
                type="number" min="0" step="any" inputMode="decimal"
                value={rate} onChange={(e) => setRate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        ) : (
          <div>
            <label className="text-xs text-gray-500">Monthly consumption (kWh, from the bill)</label>
            <input
              type="number" min="0" step="any" inputMode="decimal"
              value={monthlyKwhIn} onChange={(e) => setMonthlyKwhIn(e.target.value)}
              placeholder="e.g. 400" className={inputClass} autoFocus
            />
          </div>
        )}

        <div className="mt-2 grid grid-cols-3 gap-2">
          <div>
            <label className="text-xs text-gray-500">Peak sun hours</label>
            <input
              type="number" min="1" step="any" inputMode="decimal"
              value={psh} onChange={(e) => setPsh(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Safety factor</label>
            <input
              type="number" min="1" step="any" inputMode="decimal"
              value={factor} onChange={(e) => setFactor(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Panel watts (W)</label>
            <input
              type="number" min="0" step="any" inputMode="numeric"
              value={panelW} onChange={(e) => setPanelW(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* ── Worksheet ── */}
      {ready && (
        <>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="mb-2 font-semibold text-gray-900">Sizing worksheet</p>
            <ol className="space-y-1.5 text-sm text-gray-700">
              {mode === "bill" && (
                <li>
                  1. ₱{fmt(num(bill))} ÷ ₱{fmt(num(rate))}/kWh ={" "}
                  <b>{fmt(monthlyKwh)} kWh/month</b>
                </li>
              )}
              <li>
                {mode === "bill" ? "2" : "1"}. {fmt(monthlyKwh)} kWh ÷ 30 days ={" "}
                <b>{fmt(kwhPerDay)} kWh/day</b>
              </li>
              <li>
                {mode === "bill" ? "3" : "2"}. {fmt(kwhPerDay)} kWh/day ÷ {fmt(pshN)} peak sun
                hours = <b>{fmt(rawKw)} kW</b>
              </li>
              <li>
                {mode === "bill" ? "4" : "3"}. {fmt(rawKw)} kW × {fmt(num(factor) || 1.2)} safety
                margin = <b>{fmt(safeKw)} kW</b>
              </li>
              <li>
                {mode === "bill" ? "5" : "4"}. {fmt(safeKw)} kW × 1000 ={" "}
                <b>{fmt(watts, 0)} W</b>
              </li>
              <li>
                {mode === "bill" ? "6" : "5"}. {fmt(watts, 0)} W ÷ {fmt(panelWN, 0)} W per panel
                = {fmt(watts / panelWN)} → round up
              </li>
            </ol>
            <div className="mt-3 rounded-lg bg-brand-green/10 p-3 text-center">
              <p className="text-3xl font-extrabold text-brand-green-dark">
                {panels} × {fmt(panelWN, 0)} W panels
              </p>
              <p className="mt-0.5 text-sm font-semibold text-gray-700">
                = {fmt(arrayW / 1000)} kWp array · about {fmt(monthlyProduction, 0)}{" "}
                kWh/month production
              </p>
            </div>
          </div>

          {/* ── Inverter suggestions ── */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="mb-2 font-semibold text-gray-900">
              Suggested hybrid inverter ({fmt(arrayW / 1000)} kWp array)
            </p>
            <div className="space-y-2">
              {suggestions.map(({ brand, fit, largest }) => (
                <div key={brand} className="rounded-lg border border-gray-200 p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-400">{brand}</p>
                  {fit ? (
                    <>
                      <p className="text-sm font-bold text-gray-900">
                        {fit.model} — {fmt(fit.kw)} kW {fit.phase}
                      </p>
                      <p className="text-xs text-gray-500">
                        Max PV input {fmt(fit.maxPvW, 0)} W → up to{" "}
                        <b>{Math.floor(fit.maxPvW / panelWN)} panels</b> of {fmt(panelWN, 0)} W
                        {panels > 0 && Math.floor(fit.maxPvW / panelWN) - panels > 0 && (
                          <> (room for {Math.floor(fit.maxPvW / panelWN) - panels} more later)</>
                        )}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-700">
                      The array is beyond even the largest {brand} hybrid
                      listed here ({largest.model}, max PV{" "}
                      {fmt(largest.maxPvW, 0)} W) — a system this size needs a
                      commercial-scale design by the engineer.
                    </p>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-gray-500">
              Max PV figures use each datasheet&apos;s Max. PV Input Power
              (Deye SG03/SG04 ≈130% of rated AC; Deye SG01LP1 AM3-P, Solis S6
              and SRNE HESP from their datasheets). Models marked (HV) use
              high-voltage battery stacks instead of the 51.2 V LV units
              below. Verify against the datasheet of the exact unit on hand,
              and check string voltage (Voc at low temperature) and MPPT
              current limits before final design.
            </p>
          </div>

          {/* ── Battery suggestion ── */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="mb-2 font-semibold text-gray-900">Battery (LiFePO4, 51.2 V)</p>
            <div className="mb-2 grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500">Night-time use (% of daily)</label>
                <input
                  type="number" min="0" max="100" step="any" inputMode="numeric"
                  value={nightPct} onChange={(e) => setNightPct(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Battery size</label>
                <select
                  value={batteryAh}
                  onChange={(e) => setBatteryAh(e.target.value)}
                  className={inputClass}
                >
                  {BATTERY_OPTIONS.map((b) => (
                    <option key={b.ah} value={b.ah}>
                      {b.ah} Ah · {fmt(b.kwh)} kWh
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-sm text-gray-700">
              {fmt(kwhPerDay)} kWh/day × {fmt(nightFrac * 100, 0)}% night use ÷ 80%
              usable depth = <b>{fmt(requiredBatteryKwh)} kWh needed</b>
            </p>
            <div className="mt-2 rounded-lg bg-brand-green/10 p-3 text-center">
              <p className="text-2xl font-extrabold text-brand-green-dark">
                {batteryQty} × LV Topsun 51.2 V {battery.ah} Ah
              </p>
              <p className="mt-0.5 text-sm font-semibold text-gray-700">
                = {fmt(batteryQty * battery.kwh)} kWh storage ({fmt(battery.kwh)} kWh each)
              </p>
            </div>
            <p className="mt-2 text-[11px] text-gray-500">
              51.2 V LV batteries match the 48 V-class hybrid inverters above.
              Check the inverter&apos;s battery charge/discharge current limit
              and the battery brand&apos;s parallel limit when using several
              units. Adjust the night-use % for customers who run aircon at
              night (higher) or mostly daytime loads (lower).
            </p>
          </div>

          {/* ── Mounting materials ── */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="mb-2 font-semibold text-gray-900">
              Mounting materials ({panels} panels · {fmt(arrayW / 1000)} kW)
            </p>
            <ul className="divide-y divide-gray-100 text-sm">
              <li className="flex items-center justify-between py-2">
                <span className="text-gray-700">
                  Aluminum rail, 2.4 m
                  <span className="block text-xs text-gray-400">1 per panel</span>
                </span>
                <span className="text-base font-extrabold text-gray-900">{rails} pcs</span>
              </li>
              <li className="flex items-center justify-between py-2">
                <span className="text-gray-700">
                  End clamps
                  <span className="block text-xs text-gray-400">
                    4 pcs per 2 kW → {Math.ceil(arrayW / 2000)} × 4
                  </span>
                </span>
                <span className="text-base font-extrabold text-gray-900">{endClamps} pcs</span>
              </li>
              <li className="flex items-center justify-between py-2">
                <span className="text-gray-700">
                  Mid clamps
                  <span className="block text-xs text-gray-400">
                    ({panels} − 2) × 2
                  </span>
                </span>
                <span className="text-base font-extrabold text-gray-900">{midClamps} pcs</span>
              </li>
              <li className="flex items-center justify-between py-2">
                <span className="text-gray-700">
                  L-foot
                  <span className="block text-xs text-gray-400">{panels} × 3</span>
                </span>
                <span className="text-base font-extrabold text-gray-900">{lFeet} pcs</span>
              </li>
            </ul>
          </div>

          {/* ── Pricing → quotation ── */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="mb-1 font-semibold text-gray-900">💰 Pricing → Quotation</p>
            <p className="mb-3 text-xs text-gray-500">
              Pick from Products (price auto-fills) or type prices. Prices are
              remembered on this device.
            </p>

            <PricedComponent
              label={`Solar panels — ${panels} pcs`}
              products={products}
              desc={panelDesc} setDesc={setPanelDesc}
              price={panelPrice} setPrice={setPanelPrice}
              placeholder={`Solar PV Module, ${fmt(panelWN, 0)}W`}
            />
            <PricedComponent
              label="Hybrid inverter — 1 pc"
              products={products}
              desc={inverterDesc} setDesc={setInverterDesc}
              price={inverterPrice} setPrice={setInverterPrice}
              placeholder="Hybrid Inverter (see suggestion above)"
            />
            <PricedComponent
              label={`Battery — ${batteryQty} pcs`}
              products={products}
              desc={batteryDesc} setDesc={setBatteryDesc}
              price={batteryPrice} setPrice={setBatteryPrice}
              placeholder={`Battery, LiFePO4, ${battery.ah}AH, 51.2V`}
            />

            <p className="mb-1 mt-3 text-xs font-semibold text-gray-600">
              Mounting piece prices (₱ each)
            </p>
            <div className="grid grid-cols-4 gap-2">
              {[
                { l: `Rail ×${rails}`, v: railPrice, s: setRailPrice },
                { l: `End ×${endClamps}`, v: endPrice, s: setEndPrice },
                { l: `Mid ×${midClamps}`, v: midPrice, s: setMidPrice },
                { l: `L-foot ×${lFeet}`, v: lfootPrice, s: setLfootPrice },
              ].map((f) => (
                <div key={f.l}>
                  <label className="text-[10px] text-gray-500">{f.l}</label>
                  <input
                    type="number" min="0" step="any" inputMode="decimal"
                    value={f.v} onChange={(e) => f.s(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-2 py-2.5 text-sm focus:border-brand-green focus:outline-none"
                  />
                </div>
              ))}
            </div>

            <div className="mt-3 space-y-1 border-t border-gray-100 pt-2 text-sm">
              <CostRow label={`Solar panels (${panels} × ₱${fmt(num(panelPrice))})`} value={panelsCost} />
              <CostRow label="Hybrid inverter" value={inverterCost} />
              <CostRow label={`Battery (${batteryQty} × ₱${fmt(num(batteryPrice))})`} value={batteryCost} />
              <CostRow label="Mounting materials (summed)" value={mountingCost} />
              <CostRow label="Sub-total 1" value={sub1} bold />
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1 text-gray-600">
                  BOS at
                  <input
                    type="number" min="0" step="any" inputMode="decimal"
                    value={bosPct} onChange={(e) => setBosPct(e.target.value)}
                    className="w-14 rounded border border-gray-300 px-1 py-0.5 text-center text-xs"
                  />
                  %
                </span>
                <span className="font-medium">₱{fmt(bosCost)}</span>
              </div>
              <CostRow label="Sub-total 2" value={sub2} bold />
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1 text-gray-600">
                  Installation, Testing &amp; Commissioning at
                  <input
                    type="number" min="0" step="any" inputMode="decimal"
                    value={itcPct} onChange={(e) => setItcPct(e.target.value)}
                    className="w-14 rounded border border-gray-300 px-1 py-0.5 text-center text-xs"
                  />
                  %
                </span>
                <span className="font-medium">₱{fmt(itcCost)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between border-t border-gray-200 pt-2">
                <span className="text-base font-bold text-gray-900">TOTAL PROJECT COST</span>
                <span className="text-lg font-extrabold text-brand-green-dark">₱{fmt(totalProject)}</span>
              </div>
              <p className="text-[11px] text-gray-400">
                Discount is left for the owner to decide — set it in the
                quotation builder.
              </p>
            </div>

            {canQuote && (
              <button
                type="button"
                disabled={!pricingReady}
                onClick={createQuotation}
                className="mt-3 w-full rounded-xl bg-brand-green px-4 py-3.5 text-base font-semibold text-white active:bg-brand-green-dark disabled:opacity-50"
              >
                📄 Create quotation from these results
              </button>
            )}
          </div>

          <p className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5 text-xs text-blue-900">
            <span className="font-semibold">Next step:</span> use this result
            to build the customer&apos;s quotation — create a lead, then a
            quotation with {panels} × {fmt(panelWN, 0)} W panels, the
            suggested inverter and battery, and the mounting list above, or
            start from a package template.
          </p>
        </>
      )}
    </div>
  );
}

function CostRow({ label, value, bold = false }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${bold ? "border-t border-gray-100 pt-1 font-bold text-gray-900" : "text-gray-600"}`}>
      <span>{label}</span>
      <span className={bold ? "" : "font-medium"}>₱{fmt(value)}</span>
    </div>
  );
}

// One priced component (panel/inverter/battery): optional pick from the
// Products list (auto-fills description + selling price, still editable),
// or free-text description with a typed price.
function PricedComponent({
  label,
  products,
  desc,
  setDesc,
  price,
  setPrice,
  placeholder,
}: {
  label: string;
  products: SizingProduct[];
  desc: string;
  setDesc: (v: string) => void;
  price: string;
  setPrice: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="mb-2">
      <p className="text-xs font-semibold text-gray-600">{label}</p>
      {products.length > 0 && (
        <select
          value=""
          onChange={(e) => {
            const p = products.find((x) => x.id === e.target.value);
            if (!p) return;
            setDesc(`${p.name} (${p.sku})`);
            setPrice(String(p.selling_price));
            e.target.value = "";
          }}
          className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-2 text-xs text-gray-600 focus:border-brand-green focus:outline-none"
        >
          <option value="">📦 Pick from Products (auto-fills price)…</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — ₱{p.selling_price.toLocaleString("en-PH")}
            </option>
          ))}
        </select>
      )}
      <div className="mt-1 grid grid-cols-3 gap-2">
        <input
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder={placeholder}
          className="col-span-2 w-full rounded-lg border border-gray-300 px-2 py-2.5 text-sm focus:border-brand-green focus:outline-none"
        />
        <input
          type="number" min="0" step="any" inputMode="decimal"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="₱ each"
          className="w-full rounded-lg border border-gray-300 px-2 py-2.5 text-sm focus:border-brand-green focus:outline-none"
        />
      </div>
    </div>
  );
}
