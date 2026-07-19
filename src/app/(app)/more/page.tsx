import type { Metadata } from "next";
import { TopBar } from "@/components/top-bar";

export const metadata: Metadata = { title: "More" };

export default function MorePage() {
  return (
    <>
      <TopBar title="More" />
      <div className="p-4">
        <p className="text-sm text-gray-600">
          Settings, customers, reports and logout will live here.
        </p>
      </div>
    </>
  );
}
