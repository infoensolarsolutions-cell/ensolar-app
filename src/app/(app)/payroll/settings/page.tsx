import type { Metadata } from "next";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ParamsForm, TaxForm } from "./settings-forms";

export const metadata: Metadata = { title: "Payroll Settings" };

export default async function PayrollSettingsPage() {
  await requireRole("owner");
  const supabase = await createClient();

  const { data: settings } = await supabase
    .from("contribution_settings")
    .select("key, label, config")
    .order("key");

  const byKey = new Map((settings ?? []).map((s) => [s.key, s]));
  const sss = byKey.get("sss");
  const philhealth = byKey.get("philhealth");
  const pagibig = byKey.get("pagibig");
  const tax = byKey.get("tax");

  return (
    <>
      <TopBar title="Payroll Settings" backHref="/more" />
      <div className="space-y-4 p-4">
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800">
          ⚠️ These rates came pre-filled as approximations. Government
          schedules change — please verify each value with your accountant
          before running payroll. Changes affect future payroll runs only.
        </p>
        {sss && <ParamsForm settingKey="sss" label={sss.label} config={sss.config} />}
        {philhealth && (
          <ParamsForm settingKey="philhealth" label={philhealth.label} config={philhealth.config} />
        )}
        {pagibig && (
          <ParamsForm settingKey="pagibig" label={pagibig.label} config={pagibig.config} />
        )}
        {tax && <TaxForm brackets={tax.config.brackets ?? []} />}
      </div>
    </>
  );
}
