import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fillPlaceholders } from "@/lib/contract";
import { techDocData } from "@/lib/tech-doc";
import { ContractEditor } from "@/app/(app)/contracts/contract-editor";

export const metadata: Metadata = { title: "Test & Commissioning Data" };

export default async function NewCommissioningPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("owner", "office_staff", "technician");
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: template }, data] = await Promise.all([
    supabase
      .from("doc_templates")
      .select("body")
      .eq("key", "commissioning_report")
      .single(),
    techDocData(supabase, id),
  ]);
  if (!data) notFound();
  if (!template) {
    return (
      <>
        <TopBar title="Test & Commissioning" backHref={`/projects/${id}`} />
        <p className="p-4 text-sm text-red-600">
          Template not found — run the latest database migration (0055) first.
        </p>
      </>
    );
  }

  const body = fillPlaceholders(template.body, data.map);

  return (
    <>
      <TopBar
        title={`Commissioning — ${data.projectNo}`}
        backHref={`/projects/${id}`}
      />
      <ContractEditor projectId={id} initialBody={body} docType="commissioning" />
    </>
  );
}
