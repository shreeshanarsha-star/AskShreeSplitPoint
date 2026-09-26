import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    // Determine destination from the account's own stored role.
    let redirectUrl = "/";
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin, org_role, status, persona")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profile?.is_admin) {
      redirectUrl = "/admin";
    } else if (profile?.status === "pending_approval") {
      redirectUrl = "/waiting-room";
    } else if (profile?.status === "suspended") {
      return NextResponse.json(
        { error: "Your account is suspended. Please contact the platform owner." },
        { status: 403 }
      );
    } else if (profile?.persona === "candidate") {
      redirectUrl = "/candidate";
    } else if (profile?.persona === "recruiter") {
      redirectUrl = "/recruiter";
    } else {
      const { data: userRoles } = await supabase
        .from("talent_user_roles")
        .select("role")
        .eq("user_id", data.user.id);
      const roles = (userRoles || []).map((r: { role: string }) => r.role);
      if (roles.some((r) => ["recruiter", "ta_head", "lead_recruiter"].includes(r))) {
        redirectUrl = "/recruiter";
      } else if (roles.some((r) => ["hiring_manager", "reporting_manager"].includes(r))) {
        redirectUrl = "/hm";
      } else if (profile?.org_role === "org_admin") {
        redirectUrl = "/org/settings";
      }
    }

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
