import type { Metadata } from "next";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { LeadForm } from "./lead-form";

export const metadata: Metadata = { title: "Add Lead" };

export default async function NewLeadPage() {
  await requireRole("owner", "office_staff");
  return (
    <>
      <TopBar title="Add Lead" />
      <LeadForm />
    </>
  );
}
