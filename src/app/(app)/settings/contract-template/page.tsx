import type { Metadata } from "next";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TemplateEditor } from "./template-editor";

export const metadata: Metadata = { title: "Contract Template" };

export default async function ContractTemplatePage() {
  await requireRole("owner");
  const supabase = await createClient();
  const { data: template } = await supabase
    .from("doc_templates")
    .select("body")
    .eq("key", "solar_contract")
    .single();

  return (
    <>
      <TopBar title="Contract Template" backHref="/more" />
      <div className="space-y-3 p-4">
        <div className="rounded-xl bg-gray-100 px-4 py-3 text-xs text-gray-600">
          <p className="font-semibold text-gray-800">Placeholders filled automatically:</p>
          <p className="mt-1 font-mono leading-relaxed">
            {"{{DATE_LONG}} {{CUSTOMER_NAME}} {{CUSTOMER_ADDRESS}} {{SYSTEM_DESCRIPTION}} {{SYSTEM_SHORT}} {{EQUIPMENT_LIST}} {{QUOTE_NO}} {{QUOTE_DATE}} {{TOTAL_WORDS}} {{TOTAL_FIGURES}} {{PAYMENT_SCHEDULE}} {{SIGNING_PLACE}}"}
          </p>
          <p className="mt-1">
            Changes affect future contracts only. Have your lawyer review the wording.
          </p>
        </div>
        {template ? (
          <TemplateEditor initialBody={template.body} />
        ) : (
          <p className="text-sm text-red-600">
            Template not found — run the latest database migration first.
          </p>
        )}
      </div>
    </>
  );
}
