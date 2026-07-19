import type { Metadata } from "next";
import { TopBar } from "@/components/top-bar";

export const metadata: Metadata = { title: "Quotations" };

export default function QuotationsPage() {
  return (
    <>
      <TopBar title="Quotations" />
      <div className="p-4">
        <p className="text-sm text-gray-600">
          Quotation list and builder will appear here in Step 6.
        </p>
      </div>
    </>
  );
}
