import { NextResponse } from "next/server";
import { verifyWebhookSignature, type CheckoutSession } from "@/lib/paymongo";
import { recordOnlinePayment } from "@/lib/paymongo-record";

export async function POST(request: Request) {
  const rawBody = await request.text();

  if (!process.env.PAYMONGO_WEBHOOK_SECRET) {
    // Not configured yet — the /portal/confirm fallback records payments.
    return NextResponse.json({ ok: false, reason: "webhook not configured" }, { status: 503 });
  }
  if (!verifyWebhookSignature(rawBody, request.headers.get("paymongo-signature"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    const event = JSON.parse(rawBody);
    const type: string = event?.data?.attributes?.type ?? "";
    if (type === "checkout_session.payment.paid") {
      const resource = event.data.attributes.data;
      const session: CheckoutSession = {
        id: resource.id,
        checkout_url: "",
        payments: resource.attributes.payments ?? [],
        metadata: resource.attributes.metadata ?? null,
        payment_status: "",
      };
      await recordOnlinePayment(session);
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
