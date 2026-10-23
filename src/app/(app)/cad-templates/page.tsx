import type { Metadata } from "next";
import Image from "next/image";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "CAD Templates" };

// Standard single-line-diagram templates (DXF — opens in AutoCAD), one per
// hybrid package size. Files live in public/cad.
const TEMPLATES = [
  { file: "SLD-3.6kW-hybrid-template.dxf", kw: "3.6 kW", inverter: "Deye SUN-3.6K-SG03LP1", panels: "7 × 585 W (1 string)", batteries: "1 × 314 Ah" },
  { file: "SLD-5kW-hybrid-template.dxf", kw: "5 kW", inverter: "Deye SUN-5K-SG03LP1", panels: "9 × 585 W (5+4)", batteries: "1 × 314 Ah" },
  { file: "SLD-6kW-hybrid-template.dxf", kw: "6 kW", inverter: "Deye SUN-6K-SG03LP1", panels: "11 × 585 W (6+5)", batteries: "1 × 314 Ah" },
  { file: "SLD-8kW-hybrid-template.dxf", kw: "8 kW", inverter: "Deye SUN-8K-SG01LP1", panels: "14 × 585 W (7+7)", batteries: "2 × 314 Ah" },
  { file: "SLD-12kW-hybrid-template.dxf", kw: "12 kW", inverter: "Deye SUN-12K-SG06LP1-AM3-P", panels: "21 × 585 W (7+7+7)", batteries: "2 × 314 Ah" },
  { file: "SLD-16kW-hybrid-template.dxf", kw: "16 kW", inverter: "Deye SUN-16K-SG06LP1-AM3-P", panels: "28 × 585 W (10+9+9)", batteries: "3 × 314 Ah" },
  { file: "SLD-18kW-hybrid-template.dxf", kw: "18 kW", inverter: "Deye SUN-18K-SG06LP1-AM3-P", panels: "31 × 585 W (8+8+8+7)", batteries: "3 × 314 Ah" },
];

export default async function CadTemplatesPage() {
  await requireRole("owner", "office_staff", "technician");

  return (
    <>
      <TopBar title="CAD Templates" />
      <div className="space-y-3 p-4">
        <p className="rounded-xl bg-blue-50 px-4 py-3 text-xs text-blue-900">
          📐 Standard single-line diagrams in the Ensolar permit-drawing style
          (A3, DXF format — opens directly in AutoCAD; Save As .dwg after
          editing). Each sheet has the Legend &amp; Symbols, Hybrid Inverter
          and Solar Panel specification blocks, voltage-drop, string and
          battery load computations, PV string arrays with TW grounding
          notes, DC isolator switch, PV combiner box, hybrid inverter with
          separate AC IN / AC OUT breakers, LiFePO4 battery bank with DC
          breaker, net meter, ATS (N/R), existing panel board, Electrical
          Load Schedule, and the Ensolar multi-column title block. Wire
          sizes, breaker ratings and string Voc/Isc are left blank for the
          engineer to fill per final design.
        </p>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <Image
            src="/cad/sld-preview.png"
            alt="Single line diagram preview"
            width={1200}
            height={840}
            className="w-full"
          />
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          {TEMPLATES.map((t, i) => (
            <a
              key={t.file}
              href={`/cad/${t.file}`}
              download
              className={`flex items-center justify-between gap-2 px-4 py-3.5 ${i > 0 ? "border-t border-gray-100" : ""}`}
            >
              <span>
                <span className="block text-sm font-bold text-gray-900">
                  {t.kw} Hybrid — {t.inverter}
                </span>
                <span className="block text-xs text-gray-500">
                  {t.panels} · {t.batteries} LiFePO4 51.2 V
                </span>
              </span>
              <span className="shrink-0 rounded-lg border border-brand-green px-3 py-1.5 text-xs font-semibold text-brand-green-dark">
                ⬇ DXF
              </span>
            </a>
          ))}
        </div>
      </div>
    </>
  );
}
