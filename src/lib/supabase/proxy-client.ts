import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Paths reachable without a session. Everything else redirects to /login.
const PUBLIC_PATHS = [
  "/login",
  "/inquire",
  "/welcome",
  "/forgot-password",
  "/reset-password",
  "/auth",
  "/api/webhooks",
];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refreshes the session cookie if expired. Do not run other logic between
  // client creation and getUser() — see Supabase SSR docs.
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // A revoked/rotated refresh token would otherwise be re-sent forever,
  // failing every request. Drop the dead auth cookies so the next login
  // starts clean.
  const staleAuthCookies =
    !user && error && (error as { code?: string }).code === "refresh_token_not_found"
      ? request.cookies.getAll().filter((c) => c.name.startsWith("sb-"))
      : [];
  const clearStale = (res: NextResponse) => {
    for (const c of staleAuthCookies) {
      res.cookies.set(c.name, "", { maxAge: 0, path: "/" });
    }
    return res;
  };

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    // Visitors hitting the app root see the public landing page;
    // deep links to internal pages still go to login.
    url.pathname = pathname === "/" ? "/welcome" : "/login";
    url.search = "";
    return clearStale(NextResponse.redirect(url));
  }

  if (staleAuthCookies.length) clearStale(response);

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
