import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isGuestTrialEnabled } from "@/lib/platformSettings";

// Protects /admin/** — the owner's approval console. Everything else
// (the public console, tool pages) stays open; auth is layered in only
// where it actually matters.
export async function middleware(request: NextRequest) {
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
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  let {
    data: { user },
  } = await supabase.auth.getUser();

  // Everything under /admin and /tools is owner-only for now — there's no
  // public-facing flow yet (Apply.ai, the candidate side, is deferred).
  // Protected tools & portals (widgets-ai is public for guests)
  const isProtectedRoute =
    request.nextUrl.pathname.startsWith("/admin") ||
    request.nextUrl.pathname.startsWith("/recruiter") ||
    request.nextUrl.pathname.startsWith("/org") ||
    request.nextUrl.pathname.startsWith("/chat") ||
    request.nextUrl.pathname.startsWith("/gauri") ||
    request.nextUrl.pathname.startsWith("/agent") ||
    (request.nextUrl.pathname.startsWith("/tools") && !request.nextUrl.pathname.startsWith("/tools/widgets-ai"));
  const isLoginRoute = request.nextUrl.pathname === "/login";

  // JD Studio.ai is now recruiter-exclusive, so guest auto-trial is removed.
  const GUEST_ACCESSIBLE_PATHS: string[] = [];
  const isGuestAccessiblePath = GUEST_ACCESSIBLE_PATHS.some((p) =>
    request.nextUrl.pathname.startsWith(p)
  );

  if (!user && isGuestAccessiblePath) {
    const guestTrialEnabled = await isGuestTrialEnabled(supabase);
    if (guestTrialEnabled) {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (!error) user = data.user;
    }
  }

  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // If authenticated user is pending approval, redirect away from protected tools to waiting room
  if (user && isProtectedRoute && !request.nextUrl.pathname.startsWith("/admin")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("status, is_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.is_admin && profile?.status === "pending_approval") {
      const url = request.nextUrl.clone();
      url.pathname = "/waiting-room";
      return NextResponse.redirect(url);
    }
  }

  if (isLoginRoute && user) {
    // Previously this always sent signed-in visitors to /admin, which
    // meant any non-owner who landed on /login (e.g. via the "Forgot
    // password?" round trip, or just re-visiting the URL) got redirected
    // into the owner's approval console. Send them home instead --
    // /login's own submit handler is what knows to route the actual
    // platform owner to /admin.
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.delete("next");
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/tools/:path*",
    "/org/:path*",
    "/chat/:path*",
    "/recruiter/:path*",
    "/recruiter",
    "/agent/:path*",
    "/agent",
    "/login",
  ],
};

