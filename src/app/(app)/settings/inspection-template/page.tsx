import type { Metadata } from "next";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TemplateEditor } from "../contract-template/template-editor";

export const metadata: Metadata = { title: "Site Inspection Template" };

export default async function InspectionTemplatePage() {
  await requireRole("owner");
  const supabase = await createClient();
  const { data: template } = await supabase
    .from("doc_templates")
    .select("body")
    .eq("key", "site_inspection_certificate")
    .single();

  return (
    <>
      <TopBar title="Site Inspection Template" backHref="/more" />
      <div className="space-y-3 p-4">
        <div className="rounded-xl bg-gray-100 px-4 py-3 text-xs text-gray-600">
          <p className="font-semibold text-gray-800">Placeholders filled automatically:</p>
          <p className="mt-1 font-mono leading-relaxed">
            {"{{DATE_LONG}} {{CUSTOMER_NAME}} {{CUSTOMER_ADDRESS}} {{BANK_NAME}}"}
          </p>
          <p className="mt-1">
            Used by &ldquo;Generate Site Inspection Certificate&rdquo; on each
            project — supports the customer&apos;s Solar PV Loan application
            (DCCCO is filled in by default; edit the generated document for
            other institutions). Changes affect future certificates only.
          </p>
        </div>
        {template ? (
          <TemplateEditor initialBody={template.body} templateKey="site_inspection_certificate" />
        ) : (
          <p className="text-sm text-red-600">
            Template not found — run the latest database migration (0059) first.
          </p>
        )}
      </div>
    </>
  );
}
