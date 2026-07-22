import type { Metadata } from "next";
import Link from "next/link";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatPeso } from "@/lib/format";
import { TemplateRowActions } from "./template-row";

export const metadata: Metadata = { title: "Quotation Templates" };

type TemplateRow = {
  id: string;
  name: string;
  items: { description: string; qty: number; unit_price: number }[];
  terms: string | null;
  created_at: string;
};

export default async function QuotationTemplatesPage() {
  await requireRole("owner", "office_staff");
  const supabase = await createClient();

  const { data: templates } = await supabase
    .from("quotation_templates")
    .select("id, name, items, terms, created_at")
    .order("name")
    .overrideTypes<TemplateRow[]>();

  return (
    <>
      <TopBar title="Quotation Templates" backHref="/more" />
      <div className="space-y-3 p-4 lg:max-w-4xl">
        <p className="rounded-xl bg-gray-100 px-4 py-2.5 text-xs text-gray-600">
          Templates prefill new quotations via &ldquo;📋 Start from a
          template&rdquo;. Create new ones from any quotation you are building
          with &ldquo;💾 Save these items as a template&rdquo;. Deleting a
          template never affects quotations already made from it.
        </p>

        {!templates?.length && (
          <p className="pt-8 text-center text-sm text-gray-500">
            No templates yet — run the latest database migration, or save one
            from the{" "}
            <Link href="/quotations/new" className="font-medium text-brand-green-dark underline">
              quotation builder
            </Link>
            .
          </p>
        )}

        {templates?.map((t) => {
          let total = 0;
          for (const i of t.items ?? []) {
            total += (Number(i.qty) || 0) * (Number(i.unit_price) || 0);
          }
          return (
            <div key={t.id} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-500">
                    {t.items?.length ?? 0} items · {formatPeso(total)} · added{" "}
                    {formatDate(t.created_at)}
                  </p>
                </div>
                <TemplateRowActions templateId={t.id} currentName={t.name} />
              </div>
              <details className="mt-2">
                <summary className="cursor-pointer text-xs font-medium text-brand-green-dark">
                  View items & terms
                </summary>
                <ul className="mt-2 divide-y divide-gray-100">
                  {t.items?.map((i, idx) => (
                    <li key={idx} className="flex items-start justify-between gap-3 py-1.5 text-sm">
                      <span className="text-gray-700">
                        {i.description}
                        <span className="text-xs text-gray-400"> × {i.qty}</span>
                      </span>
                      <span className="shrink-0 font-semibold text-gray-900">
                        {formatPeso((Number(i.qty) || 0) * (Number(i.unit_price) || 0))}
                      </span>
                    </li>
                  ))}
                </ul>
                {t.terms && (
                  <p className="mt-2 whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
                    {t.terms}
                  </p>
                )}
              </details>
            </div>
          );
        })}
      </div>
    </>
  );
}
