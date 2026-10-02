import type { Metadata } from "next";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TemplateEditor } from "../contract-template/template-editor";

export const metadata: Metadata = { title: "Commissioning Template" };

export default async function CommissioningTemplatePage() {
  await requireRole("owner");
  const supabase = await createClient();
  const { data: template } = await supabase
    .from("doc_templates")
    .select("body")
    .eq("key", "commissioning_report")
    .single();

  return (
    <>
      <TopBar title="Commissioning Template" backHref="/more" />
      <div className="space-y-3 p-4">
        <div className="rounded-xl bg-gray-100 px-4 py-3 text-xs text-gray-600">
          <p className="font-semibold text-gray-800">Placeholders filled automatically:</p>
          <p className="mt-1 font-mono leading-relaxed">
            {"{{PROJECT_NO}} {{DATE_LONG}} {{CUSTOMER_NAME}} {{SITE_ADDRESS}} {{SYSTEM_DESCRIPTION}} {{PANEL_BRAND}} {{PANEL_TYPE}} {{PANEL_W}} {{PANEL_QTY}} {{INVERTER_BRAND}} {{INVERTER_MODEL}} {{INVERTER_SERIALS}} {{BATTERY_BRAND}} {{BATTERY_TYPE}} {{BATTERY_SPEC}} {{BATTERY_QTY}} {{BATTERY_SERIALS}}"}
          </p>
          <p className="mt-1">
            Used by &ldquo;Generate Test &amp; Commissioning Data&rdquo; on each
            project. Serial numbers come from the Equipment Registry. Changes
            affect future documents only.
          </p>
        </div>
        {template ? (
          <TemplateEditor initialBody={template.body} templateKey="commissioning_report" />
        ) : (
          <p className="text-sm text-red-600">
            Template not found — run the latest database migration (0055) first.
          </p>
        )}
      </div>
    </>
  );
}
