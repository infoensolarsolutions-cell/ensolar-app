"use client";

import { useState } from "react";

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
  { brand: "Solis", model: "S6-EH1P3.6K-L-PLUS", kw: 3.6, maxPvW: 5760, phase: "1φ" },
  { brand: "Solis", model: "S6-EH1P5K-L-PLUS", kw: 5, maxPvW: 8000, phase: "1φ" },
  { brand: "Solis", model: "S6-EH1P6K-L-PLUS", kw: 6, maxPvW: 9600, phase: "1φ" },
  { brand: "Solis", model: "S6-EH1P8K-L-PLUS", kw: 8, maxPvW: 12800, phase: "1φ" },
  { brand: "SRNE", model: "HYP4850S100-H (5 kW)", kw: 5, maxPvW: 6000, phase: "1φ" },
  { brand: "SRNE", model: "HESP48100U200-H (10 kW)", kw: 10, maxPvW: 12000, phase: "1φ" },
];

const BRANDS = ["Deye", "Solis", "SRNE"] as const;

function num(v: string): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

const fmt = (n: number, digits = 2) =>
  n.toLocaleString("en-PH", { maximumFractionDigits: digits });

export function SizingCalculator() {
  const [mode, setMode] = useState<"kwh" | "bill">("bill");
  const [monthlyKwhIn, setMonthlyKwhIn] = useState("");
  const [bill, setBill] = useState("");
  const [rate, setRate] = useState("13");
  const [psh, setPsh] = useState("4");
  const [factor, setFactor] = useState("1.2");
  const [panelW, setPanelW] = useState("585");

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
                      Array exceeds the largest {brand} unit here ({largest.model},{" "}
                      max PV {fmt(largest.maxPvW, 0)} W) — consider two units in
                      parallel or a bigger three-phase model.
                    </p>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-gray-500">
              Max PV figures are from the manufacturers&apos; datasheets (Deye
              ≈130% of rated AC, Solis S6 ≈160%, SRNE ≈120%). Verify against
              the datasheet of the exact unit on hand, and check string
              voltage (Voc at low temperature) and MPPT current limits before
              final design.
            </p>
          </div>

          <p className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5 text-xs text-blue-900">
            <span className="font-semibold">Next step:</span> use this result
            to build the customer&apos;s quotation — create a lead, then a
            quotation with {panels} × {fmt(panelWN, 0)} W panels and the
            suggested inverter, or start from a package template.
          </p>
        </>
      )}
    </div>
  );
}
