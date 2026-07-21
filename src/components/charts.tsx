// Server-renderable chart primitives — plain SVG/CSS, no chart library.
// Single-series charts use brand green; all text stays in gray ink.

const BAR_COLOR = "var(--brand-green)";

// Vertical bar chart for change-over-time (e.g. revenue per month).
// Direct labels only on the max and latest bars; every bar carries a
// native <title> tooltip with the exact value.
export function MonthlyBars({
  data,
  format = (v) => String(v),
}: {
  data: { label: string; value: number }[];
  format?: (v: number) => string;
}) {
  if (!data.length) return null;
  // Wider viewBox for dense (e.g. daily) data so bars stay readable.
  const W = Math.max(360, data.length * 24);
  const H = 150;
  const top = 18;
  const bottom = 18;
  const plotH = H - top - bottom;
  const max = Math.max(1, ...data.map((d) => d.value));
  const slot = W / data.length;
  const barW = Math.min(36, slot * 0.62);
  const maxIdx = data.findIndex((d) => d.value === Math.max(...data.map((x) => x.value)));
  // With many bars, label only every Nth tick to avoid collisions.
  const labelEvery = Math.ceil(data.length / 8);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Bar chart">
      {data.map((d, i) => {
        const h = Math.round((d.value / max) * plotH);
        const x = i * slot + (slot - barW) / 2;
        const y = top + plotH - h;
        const r = Math.min(4, h);
        const labeled = d.value > 0 && (i === maxIdx || i === data.length - 1);
        return (
          <g key={d.label}>
            {h > 0 && (
              <path
                d={`M${x},${y + r} a${r},${r} 0 0 1 ${r},-${r} h${barW - 2 * r} a${r},${r} 0 0 1 ${r},${r} v${h - r} h${-barW} Z`}
                fill={BAR_COLOR}
              >
                <title>{`${d.label}: ${format(d.value)}`}</title>
              </path>
            )}
            {labeled && (
              <text
                x={x + barW / 2}
                y={y - 5}
                textAnchor="middle"
                className="fill-gray-500"
                fontSize="10"
                fontWeight="600"
              >
                {format(d.value)}
              </text>
            )}
            {i % labelEvery === 0 && (
              <text
                x={i * slot + slot / 2}
                y={H - 4}
                textAnchor="middle"
                className="fill-gray-400"
                fontSize="10"
              >
                {d.label}
              </text>
            )}
          </g>
        );
      })}
      <line
        x1="0"
        y1={top + plotH}
        x2={W}
        y2={top + plotH}
        className="stroke-gray-200"
        strokeWidth="1"
      />
    </svg>
  );
}

// Horizontal label + bar + value rows for categorical counts. Values are
// always visible as text, so the chart doubles as its own table view.
export function BarRows({
  data,
  format = (v) => String(v),
}: {
  data: { label: string; value: number }[];
  format?: (v: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className="space-y-2.5 lg:space-y-1.5">
      {data.map((d) => (
        <li key={d.label}>
          <div className="mb-0.5 flex justify-between text-sm lg:text-xs">
            <span className="text-gray-700">{d.label}</span>
            <span className="font-semibold text-gray-900">{format(d.value)}</span>
          </div>
          <div className="h-2.5 rounded-full bg-gray-100 lg:h-2">
            <div
              className="h-2.5 rounded-full bg-brand-green lg:h-2"
              style={{ width: `${(d.value / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

// Simple progress bar (e.g. % of contract paid).
export function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div>
      <div className="h-3 rounded-full bg-gray-100">
        <div
          className="h-3 rounded-full bg-brand-green"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-right text-xs font-medium text-gray-500">
        {pct.toFixed(0)}% paid
      </p>
    </div>
  );
}
