import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fillPlaceholders } from "@/lib/contract";
import { techDocData } from "@/lib/tech-doc";
import { ContractEditor } from "@/app/(app)/contracts/contract-editor";

export const metadata: Metadata = { title: "Equipment Specifications" };

export default async function NewSpecsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("owner", "office_staff");
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: template }, data] = await Promise.all([
    supabase
      .from("doc_templates")
      .select("body")
      .eq("key", "equipment_specs")
      .single(),
    techDocData(supabase, id),
  ]);
  if (!data) notFound();
  if (!template) {
    return (
      <>
        <TopBar title="Equipment Specs" backHref={`/projects/${id}`} />
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
        title={`Equipment Specs — ${data.projectNo}`}
        backHref={`/projects/${id}`}
      />
      <ContractEditor projectId={id} initialBody={body} docType="specs" />
    </>
  );
}
