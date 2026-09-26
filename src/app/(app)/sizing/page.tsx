import type { Metadata } from "next";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { SizingCalculator } from "./calculator";

export const metadata: Metadata = { title: "Solar Sizing" };

// Walk-in sizing tool: staff enter the customer's monthly bill or kWh and
// get panel count + hybrid inverter suggestions on the spot.
export default async function SizingPage() {
  await requireRole("owner", "office_staff", "technician");
  return (
    <>
      <TopBar title="Solar PV Sizing" backHref="/" />
      <div className="p-4">
        <SizingCalculator />
      </div>
    </>
  );
}
