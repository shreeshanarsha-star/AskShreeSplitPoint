import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveHomeRoute } from "@/lib/homeRoute";

export const dynamic = "force-dynamic";

// Real email + password sign-in only. There used to be a "persona"
// shortcut here (e.g. { persona: "owner" }) that signed anyone in as a
// fixed demo account with a hardcoded password and no credentials
// required from the caller -- that was fine for local demoing but is a
// live authentication bypass on a production site, so it has been
// removed entirely. This route now always requires a real email and
// password, and its only job beyond that is figuring out where to send
// the browser once you're signed in.
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    // Destination comes from the one shared resolver (real roles, never
    // profiles.persona). See src/lib/homeRoute.ts.
    const home = await resolveHomeRoute(createAdminClient(), data.user.id, data.user.email ?? null);
    if (home.suspended) {
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: "Your account is suspended. Please contact the platform owner." },
        { status: 403 }
      );
    }
    const redirectUrl = home.route;

    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
      },
      redirectUrl,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Authentication error occurred" },
      { status: 500 }
    );
  }
}
