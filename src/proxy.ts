import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy-client";

// Next.js 16: "proxy" is the new name for middleware. Optimistic auth check
// only — authoritative role checks live in src/lib/auth.ts per request.
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|icons/|branding/|manifest.webmanifest|sw.js|icon.png|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
