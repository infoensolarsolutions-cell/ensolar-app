import type { Metadata } from "next";
import { TopBar } from "@/components/top-bar";

export const metadata: Metadata = { title: "Leads" };

export default function LeadsPage() {
  return (
    <>
      <TopBar title="Leads" />
      <div className="p-4">
        <p className="text-sm text-gray-600">
          The sales pipeline (Kanban board) will appear here in Step 5.
        </p>
      </div>
    </>
  );
}
