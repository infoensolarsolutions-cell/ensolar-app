"use client";

// Stacked generation & usage chart in the DeyeCloud style: production,
// battery discharge, and grid purchases stack above zero; battery charge,
// grid feed-in, and consumption stack below. Colors follow DeyeCloud's
// legend so the two apps read the same.

export type EnergyBar = {
  label: string;
  production: number;
  discharge: number;
  purchased: number;
  charge: number;
  feedIn: number;
  consumption: number;
};

const POS: { key: "production" | "discharge" | "purchased"; label: string; color: string }[] = [
  { key: "production", label: "Production", color: "#34a853" },
  { key: "discharge", label: "Discharge", color: "#6fc3f7" },
  { key: "purchased", label: "Purchased", color: "#8b7ce8" },
];
const NEG: { key: "charge" | "feedIn" | "consumption"; label: string; color: string }[] = [
  { key: "charge", label: "Charge", color: "#3567d6" },
  { key: "feedIn", label: "Grid Feed-in", color: "#f2917f" },
  { key: "consumption", label: "Consumption", color: "#f0b429" },
];

export function DeyeEnergyChart({ data }: { data: EnergyBar[] }) {
  const n = data.length;
  if (n === 0) return null;

  const step = 22;
  const barW = 14;
  const W = Math.max(360, n * step + 40);
  const plotH = 220;
  const padTop = 16;
  const padBottom = 24;

  const maxPos = Math.max(
    0.1,
    ...data.map((d) => d.production + d.discharge + d.purchased),
  );
  const maxNeg = Math.max(
    0.1,
    ...data.map((d) => d.charge + d.feedIn + d.consumption),
  );
  const k = plotH / (maxPos + maxNeg); // px per kWh, shared scale
  const zeroY = padTop + maxPos * k;
  const H = padTop + plotH + padBottom;
  const labelEvery = Math.ceil(n / 8);
  const r1 = (v: number) => Math.round(v * 10) / 10;

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1">
        {[...POS, ...NEG].map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      <div className="overflow-x-auto">
        <svg width={W} height={H} role="img" aria-label="Generation and usage history">
          {/* zero line + scale hints */}
          <line x1={34} x2={W} y1={zeroY} y2={zeroY} stroke="#d1d5db" strokeWidth={1} />
          <text x={0} y={padTop + 4} fontSize={9} fill="#9ca3af">{r1(maxPos)}</text>
          <text x={0} y={zeroY + 3} fontSize={9} fill="#9ca3af">0</text>
          <text x={0} y={padTop + plotH} fontSize={9} fill="#9ca3af">-{r1(maxNeg)}</text>

          {data.map((d, i) => {
            const x = 36 + i * step;
            let yUp = zeroY;
            let yDown = zeroY;
            const segs: { y: number; h: number; color: string; name: string; v: number }[] = [];
            for (const s of POS) {
              const v = d[s.key];
              if (v > 0) {
                const h = v * k;
                yUp -= h;
                segs.push({ y: yUp, h, color: s.color, name: s.label, v });
              }
            }
            for (const s of NEG) {
              const v = d[s.key];
              if (v > 0) {
                const h = v * k;
                segs.push({ y: yDown, h, color: s.color, name: s.label, v });
                yDown += h;
              }
            }
            return (
              <g key={d.label}>
                {segs.map((seg, j) => (
                  <rect
                    key={j}
                    x={x}
                    y={seg.y}
                    width={barW}
                    height={Math.max(seg.h - 1, 0.5)}
                    rx={1.5}
                    fill={seg.color}
                  >
                    <title>{`${d.label} — ${seg.name}: ${seg.v} kWh`}</title>
                  </rect>
                ))}
                {i % labelEvery === 0 && (
                  <text
                    x={x + barW / 2}
                    y={H - 6}
                    fontSize={9}
                    fill="#9ca3af"
                    textAnchor="middle"
                  >
                    {d.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <p className="mt-1 text-xs text-gray-400">
        Above zero: energy produced and drawn in · below zero: energy stored,
        exported, and consumed. Tap a bar segment for the exact kWh.
      </p>
    </div>
  );
}
