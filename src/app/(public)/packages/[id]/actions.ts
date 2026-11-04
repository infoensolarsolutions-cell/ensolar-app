"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createCheckoutSession, paymongoEnabled } from "@/lib/paymongo";
import { tomorrowManila } from "@/lib/crm";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ensolar-app.vercel.app";

type State = { error?: string; reserved?: boolean; orderNo?: string } | null;

export async function startReservation(_prev: State, formData: FormData): Promise<State> {
  // Honeypot: bots fill every field.
  if (String(formData.get("website") ?? "") !== "") return { reserved: true, orderNo: "—" };

  const offerId = String(formData.get("offer_id") ?? "");
  const campaignIdRaw = String(formData.get("campaign_id") ?? "");
  const name = String(formData.get("name") ?? "").trim().slice(0, 200);
  const phone = String(formData.get("phone") ?? "").trim().slice(0, 40);
  const email = String(formData.get("email") ?? "").trim().slice(0, 200);
  const address = String(formData.get("address") ?? "").trim().slice(0, 300);

  if (!/^[0-9a-f-]{36}$/i.test(offerId)) return { error: "Invalid package." };
  if (!name || !phone) return { error: "Please enter your name and mobile number." };

  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    return { error: "Reservations are temporarily unavailable. Please call (035) 531-6455." };
  }

  const { data: offer } = await supabase
    .from("package_offers")
    .select("id, name, price, reservation_fee, active")
    .eq("id", offerId)
    .single();
  if (!offer?.active) return { error: "This package is no longer available." };
  const amount = Number(offer.reservation_fee);
  if (!(amount > 0)) return { error: "This package cannot be reserved online yet — please inquire instead." };

  // CRM: a reservation attempt is a hot lead either way.
  const { data: customer } = await supabase
    .from("customers")
    .insert({
      name,
      phone,
      email: email || null,
      barangay: address || null,
      source: "facebook",
    })
    .select("id")
    .single();

  let campaignId: string | null = null;
  if (/^[0-9a-f-]{36}$/i.test(campaignIdRaw)) {
    const { data: campaign } = await supabase
      .from("campaigns").select("id").eq("id", campaignIdRaw).maybeSingle();
    campaignId = campaign?.id ?? null;
  }

  let leadId: string | null = null;
  if (customer) {
    const { data: lead } = await supabase
      .from("leads")
      .insert({
        customer_id: customer.id,
        service_type: "solar",
        next_followup_at: tomorrowManila(),
        campaign_id: campaignId,
        notes: `Online package reservation: ${offer.name} (fee ₱${amount.toLocaleString()})${address ? ` · ${address}` : ""}`,
      })
      .select("id")
      .single();
    leadId = lead?.id ?? null;
    if (leadId) {
      await supabase.from("lead_events").insert({
        lead_id: leadId,
        event: "created",
        detail: { via: "package_store", offer: offer.name },
      });
    }
  }

  const { data: orderNoData } = await supabase.rpc("next_doc_no", { p_doc_type: "ORD" });
  const orderNo = (orderNoData as string | null) ?? `ORD-${Date.now()}`;

  const { data: order, error: orderErr } = await supabase
    .from("online_orders")
    .insert({
      order_no: orderNo,
      offer_id: offer.id,
      offer_name: offer.name,
      package_price: Number(offer.price) || null,
      amount,
      customer_name: name,
      phone,
      email: email || null,
      address: address || null,
      status: "pending",
      lead_id: leadId,
      campaign_id: campaignId,
    })
    .select("id")
    .single();
  if (orderErr || !order) {
    return { error: "Could not start your reservation. Please try again or call (035) 531-6455." };
  }

  if (!paymongoEnabled()) {
    await supabase.from("online_orders").update({ status: "reserved" }).eq("id", order.id);
    return { reserved: true, orderNo };
  }

  let session: { id: string; url: string };
  try {
    session = await createCheckoutSession({
      amountCentavos: Math.round(amount * 100),
      description: `${offer.name} — Reservation fee (${orderNo})`,
      referenceNumber: orderNo,
      successUrl: `${SITE}/packages/thank-you?order=${order.id}`,
      cancelUrl: `${SITE}/packages/${offer.id}`,
      metadata: { order_id: order.id },
    });
  } catch {
    // Gateway hiccup — keep the reservation so the team can follow up.
    await supabase.from("online_orders").update({ status: "reserved" }).eq("id", order.id);
    return { reserved: true, orderNo };
  }

  await supabase
    .from("online_orders")
    .update({ provider: "paymongo", provider_session_id: session.id })
    .eq("id", order.id);

  redirect(session.url);
}
