import { NextResponse, type NextRequest } from "next/server";
import { retrieveCheckoutSession } from "@/lib/paymongo";
import { recordOnlinePayment } from "@/lib/paymongo-record";
import { getProfile } from "@/lib/auth";

// Return trip from PayMongo checkout: verify the session server-side and
// record the payment (idempotent with the webhook).
export async function GET(request: NextRequest) {
  const redirectTo = request.nextUrl.clone();
  redirectTo.pathname = "/portal";
  redirectTo.search = "";

  const profile = await getProfile();
  const sessionId = request.cookies.get("pm_cs")?.value;

  let paid = false;
  if (profile && sessionId) {
    try {
      const session = await retrieveCheckoutSession(sessionId);
      if (session) {
        const res = await recordOnlinePayment(session);
        paid = res.recorded;
      }
    } catch {
      // Webhook remains the safety net.
    }
  }

  redirectTo.searchParams.set("paid", paid ? "1" : "pending");
  const response = NextResponse.redirect(redirectTo);
  response.cookies.delete("pm_cs");
  return response;
}
