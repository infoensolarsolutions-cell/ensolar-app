"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type QuotationItemInput = {
  product_id: string | null;
  description: string;
  qty: number;
  unit_price: number;
};

function parseItems(raw: string): QuotationItemInput[] | null {
  try {
    const arr = JSON.parse(raw) as QuotationItemInput[];
    if (!Array.isArray(arr) || arr.length === 0) return null;
    const items = arr
      .map((item) => ({
        product_id: item.product_id || null,
        description: String(item.description ?? "").trim().slice(0, 500),
        qty: Number(item.qty),
        unit_price: Number(item.unit_price),
      }))
      .filter((i) => i.description && i.qty > 0 && i.unit_price >= 0);
    return items.length ? items : null;
  } catch {
    return null;
  }
}

export async function saveQuotation(
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const profile = await requireRole("owner", "office_staff");

  const quotationId = String(formData.get("quotation_id") ?? "");
  const leadId = String(formData.get("lead_id") ?? "");
  const validUntil = String(formData.get("valid_until") ?? "");
  const terms = String(formData.get("terms") ?? "").trim().slice(0, 2000);
  const discount = Math.max(0, Number(formData.get("discount") ?? 0) || 0);
  const items = parseItems(String(formData.get("items") ?? ""));

  if (!items) return { error: "Add at least one line item." };

  const subtotal = items.reduce((sum, i) => sum + i.qty * i.unit_price, 0);
  const total = Math.max(0, subtotal - discount);

  const supabase = await createClient();
  let id = quotationId;

  if (quotationId) {
    // Edit an existing draft only.
    const { data: existing } = await supabase
      .from("quotations")
      .select("status")
      .eq("id", quotationId)
      .single();
    if (!existing) return { error: "Quotation not found." };
    if (existing.status !== "draft") {
      return { error: "Only draft quotations can be edited." };
    }

    const { error } = await supabase
      .from("quotations")
      .update({ valid_until: validUntil || null, terms, discount, subtotal, total })
      .eq("id", quotationId);
    if (error) return { error: "Could not save. Please try again." };

    await supabase.from("quotation_items").delete().eq("quotation_id", quotationId);
  } else {
    if (!leadId) return { error: "Missing lead." };
    const { data: lead } = await supabase
      .from("leads")
      .select("id, customer_id")
      .eq("id", leadId)
      .single();
    if (!lead) return { error: "Lead not found." };

    const { data: quoteNo, error: noError } = await supabase.rpc("next_doc_no", {
      p_doc_type: "Q",
    });
    if (noError || !quoteNo) return { error: "Could not generate a quotation number." };

    const { data: created, error } = await supabase
      .from("quotations")
      .insert({
        quote_no: quoteNo,
        lead_id: lead.id,
        customer_id: lead.customer_id,
        valid_until: validUntil || null,
        terms,
        discount,
        subtotal,
        total,
        created_by: profile.id,
      })
      .select("id")
      .single();
    if (error || !created) return { error: "Could not create the quotation." };
    id = created.id;

    await supabase.from("lead_events").insert({
      lead_id: lead.id,
      user_id: profile.id,
      event: "quotation_created",
      detail: { quote_no: quoteNo },
    });
  }

  const { error: itemsError } = await supabase.from("quotation_items").insert(
    items.map((item, idx) => ({
      quotation_id: id,
      product_id: item.product_id,
      description: item.description,
      qty: item.qty,
      unit_price: item.unit_price,
      line_total: item.qty * item.unit_price,
      sort_order: idx,
    })),
  );
  if (itemsError) return { error: "Could not save the line items." };

  revalidatePath("/quotations");
  redirect(`/quotations/${id}`);
}

export async function setQuotationStatus(
  quotationId: string,
  action: "sent" | "rejected",
): Promise<{ error?: string }> {
  const profile = await requireRole("owner", "office_staff");
  const supabase = await createClient();

  const { data: quotation } = await supabase
    .from("quotations")
    .select("id, status, lead_id, quote_no")
    .eq("id", quotationId)
    .single();
  if (!quotation) return { error: "Quotation not found." };

  const allowed =
    (action === "sent" && quotation.status === "draft") ||
    (action === "rejected" && ["draft", "sent"].includes(quotation.status));
  if (!allowed) return { error: `Cannot mark ${quotation.status} → ${action}.` };

  const { error } = await supabase
    .from("quotations")
    .update({ status: action })
    .eq("id", quotationId);
  if (error) return { error: "Could not update the status." };

  if (quotation.lead_id) {
    if (action === "sent") {
      await supabase
        .from("leads")
        .update({ status: "quotation_sent" })
        .eq("id", quotation.lead_id)
        .in("status", ["new_inquiry", "contacted", "site_visit_scheduled"]);
    }
    await supabase.from("lead_events").insert({
      lead_id: quotation.lead_id,
      user_id: profile.id,
      event: `quotation_${action}`,
      detail: { quote_no: quotation.quote_no },
    });
  }

  revalidatePath(`/quotations/${quotationId}`);
  revalidatePath("/quotations");
  revalidatePath("/leads");
  return {};
}

export async function acceptQuotation(
  quotationId: string,
): Promise<{ error?: string }> {
  const profile = await requireRole("owner", "office_staff");
  const supabase = await createClient();

  const { data: q } = await supabase
    .from("quotations")
    .select(
      "id, status, quote_no, total, customer_id, lead_id, leads (service_type), customers (address, barangay)",
    )
    .eq("id", quotationId)
    .single();
  if (!q) return { error: "Quotation not found." };
  if (q.status === "accepted") return {};
  if (!["draft", "sent"].includes(q.status)) {
    return { error: `A ${q.status} quotation cannot be accepted.` };
  }

  // Idempotency: projects.quotation_id is unique — a second accept can't duplicate.
  const { data: existingProject } = await supabase
    .from("projects")
    .select("id")
    .eq("quotation_id", quotationId)
    .maybeSingle();

  if (!existingProject) {
    const { data: projectNo, error: noError } = await supabase.rpc("next_doc_no", {
      p_doc_type: "P",
    });
    if (noError || !projectNo) return { error: "Could not generate a project number." };

    const lead = Array.isArray(q.leads) ? q.leads[0] : q.leads;
    const customer = Array.isArray(q.customers) ? q.customers[0] : q.customers;
    const { error: projectError } = await supabase.from("projects").insert({
      project_no: projectNo,
      customer_id: q.customer_id,
      quotation_id: q.id,
      service_type: lead?.service_type ?? null,
      site_address: [customer?.address, customer?.barangay]
        .filter(Boolean)
        .join(", ") || null,
      contract_amount: q.total,
    });
    if (projectError && !projectError.message.includes("duplicate")) {
      return { error: "Could not create the project." };
    }
  }

  await supabase.from("quotations").update({ status: "accepted" }).eq("id", q.id);

  if (q.lead_id) {
    await supabase.from("leads").update({ status: "won" }).eq("id", q.lead_id);
    await supabase.from("lead_events").insert({
      lead_id: q.lead_id,
      user_id: profile.id,
      event: "quotation_accepted",
      detail: { quote_no: q.quote_no },
    });
  }

  revalidatePath(`/quotations/${quotationId}`);
  revalidatePath("/quotations");
  revalidatePath("/leads");
  return {};
}

export async function trashQuotation(id: string): Promise<{ error?: string }> {
  await requireRole("owner", "office_staff");
  if (!id) return { error: "Missing quotation." };

  const supabase = await createClient();
  const { data: q } = await supabase
    .from("quotations")
    .select("id, status, projects (id)")
    .eq("id", id)
    .single();
  if (!q) return { error: "Quotation not found." };
  if (q.status === "accepted" || (q.projects && (Array.isArray(q.projects) ? q.projects.length : 1))) {
    return { error: "This quotation was accepted and has a project — it cannot be moved to the Recycle Bin." };
  }

  const { error } = await supabase
    .from("quotations")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: `Could not move to Recycle Bin: ${error.message}` };

  revalidatePath("/quotations");
  redirect("/quotations");
}

export async function restoreQuotation(id: string): Promise<{ error?: string }> {
  await requireRole("owner", "office_staff");
  const supabase = await createClient();
  const { error } = await supabase
    .from("quotations")
    .update({ deleted_at: null })
    .eq("id", id);
  if (error) return { error: `Could not restore: ${error.message}` };
  revalidatePath("/quotations");
  revalidatePath("/quotations/trash");
  return {};
}

export async function destroyQuotation(id: string): Promise<{ error?: string }> {
  await requireRole("owner");
  const supabase = await createClient();
  const { error } = await supabase.from("quotations").delete().eq("id", id);
  if (error) {
    return { error: `Could not delete permanently: ${error.message}` };
  }
  revalidatePath("/quotations");
  revalidatePath("/quotations/trash");
  return {};
}

export async function saveQuotationTemplate(
  name: string,
  itemsJson: string,
  terms: string,
): Promise<{ error?: string }> {
  const profile = await requireRole("owner", "office_staff");
  const cleanName = String(name ?? "").trim().slice(0, 120);
  if (!cleanName) return { error: "Template name is required." };

  let items: unknown;
  try {
    items = JSON.parse(itemsJson);
  } catch {
    return { error: "Invalid items." };
  }
  if (!Array.isArray(items) || items.length === 0) {
    return { error: "Add at least one line item first." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("quotation_templates").insert({
    name: cleanName,
    items,
    terms: String(terms ?? "").trim() || null,
    created_by: profile.id,
  });
  if (error) return { error: `Could not save template: ${error.message}` };

  revalidatePath("/quotations/new");
  return {};
}

export async function renameQuotationTemplate(
  id: string,
  name: string,
): Promise<{ error?: string }> {
  await requireRole("owner", "office_staff");
  const cleanName = String(name ?? "").trim().slice(0, 120);
  if (!id || !cleanName) return { error: "Template name is required." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("quotation_templates")
    .update({ name: cleanName })
    .eq("id", id);
  if (error) return { error: `Could not rename: ${error.message}` };

  revalidatePath("/settings/quotation-templates");
  revalidatePath("/quotations/new");
  return {};
}

export async function deleteQuotationTemplate(
  id: string,
): Promise<{ error?: string }> {
  await requireRole("owner", "office_staff");
  if (!id) return { error: "Missing template." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("quotation_templates")
    .delete()
    .eq("id", id);
  if (error) return { error: `Could not delete: ${error.message}` };

  revalidatePath("/settings/quotation-templates");
  revalidatePath("/quotations/new");
  return {};
}
