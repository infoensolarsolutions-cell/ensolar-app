import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

const API = "https://api.paymongo.com/v1";

function authHeader(): string {
  const key = process.env.PAYMONGO_SECRET_KEY;
  if (!key) throw new Error("PAYMONGO_SECRET_KEY is not set");
  return "Basic " + Buffer.from(`${key}:`).toString("base64");
}

export type CheckoutSession = {
  id: string;
  checkout_url: string;
  payments: { id: string; attributes: { amount: number; status: string } }[];
  metadata: Record<string, string> | null;
  payment_status: string;
};

export async function createCheckoutSession(params: {
  amountCentavos: number;
  description: string;
  referenceNumber: string;
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, string>;
}): Promise<{ id: string; url: string }> {
  const res = await fetch(`${API}/checkout_sessions`, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({
      data: {
        attributes: {
          line_items: [
            {
              name: params.description.slice(0, 100),
              amount: params.amountCentavos,
              currency: "PHP",
              quantity: 1,
            },
          ],
          payment_method_types: ["gcash", "paymaya", "card"],
          reference_number: params.referenceNumber,
          description: params.description.slice(0, 250),
          success_url: params.successUrl,
          cancel_url: params.cancelUrl,
          metadata: params.metadata,
        },
      },
    }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`PayMongo error ${res.status}: ${JSON.stringify(json.errors ?? json)}`);
  }
  return { id: json.data.id, url: json.data.attributes.checkout_url };
}

export async function retrieveCheckoutSession(id: string): Promise<CheckoutSession | null> {
  const res = await fetch(`${API}/checkout_sessions/${encodeURIComponent(id)}`, {
    headers: { Authorization: authHeader() },
  });
  if (!res.ok) return null;
  const json = await res.json();
  const a = json.data.attributes;
  return {
    id: json.data.id,
    checkout_url: a.checkout_url,
    payments: a.payments ?? [],
    metadata: a.metadata ?? null,
    payment_status: a.payment_intent?.attributes?.status ?? "",
  };
}

// Paymongo-Signature: t=<ts>,te=<test sig>,li=<live sig>
export function verifyWebhookSignature(rawBody: string, header: string | null): boolean {
  const secret = process.env.PAYMONGO_WEBHOOK_SECRET;
  if (!secret || !header) return false;

  const parts = Object.fromEntries(
    header.split(",").map((p) => p.split("=").map((s) => s.trim()) as [string, string]),
  );
  const t = parts.t;
  const sig = parts.li || parts.te;
  if (!t || !sig) return false;

  const expected = createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(sig, "hex"));
  } catch {
    return false;
  }
}
