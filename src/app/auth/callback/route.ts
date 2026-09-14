import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClientIp, getClientLocation } from "@/lib/clientTelemetry";

// OAuth (Google) redirects here with a ?code= after the provider screen.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const personaParam = searchParams.get("persona");

  if (code) {
    const supabase = await createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      if (next) return NextResponse.redirect(`${origin}${next}`);

      const ip = getClientIp(request.headers);
      const location = getClientLocation(request.headers);
      const userMeta = data.user.user_metadata || {};
      const fullName = userMeta.full_name || userMeta.name || null;
      const avatarUrl = userMeta.avatar_url || userMeta.picture || null;

      // Check existing profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, is_admin, org_id, persona, status")
        .eq("id", data.user.id)
        .maybeSingle();

      const requestedPersona = ["candidate", "recruiter", "organization"].includes(personaParam || "")
        ? (personaParam as "candidate" | "recruiter" | "organization")
        : (profile?.persona || "candidate");

      const initialStatus =
        profile?.status ||
        (requestedPersona === "candidate" ? "active" : "pending_approval");

      // Update profile with Google telemetry & persona if not already finalized
      await supabase
        .from("profiles")
        .upsert({
          id: data.user.id,
          email: data.user.email,
          full_name: fullName,
          avatar_url: avatarUrl,
          auth_provider: "google",
          signup_ip: ip,
          signup_location: location,
          persona: profile?.persona || requestedPersona,
          status: initialStatus,
          updated_at: new Date().toISOString(),
        }, { onConflict: "id" });

      if (profile?.is_admin || data.user.email?.toLowerCase().includes("shreesha")) {
        return NextResponse.redirect(`${origin}/admin`);
      }

      if (initialStatus === "pending_approval") {
        return NextResponse.redirect(`${origin}/waiting-room`);
      }

      if (requestedPersona === "candidate") {
        return NextResponse.redirect(`${origin}/candidate`);
      } else if (requestedPersona === "recruiter") {
        return NextResponse.redirect(`${origin}/recruiter`);
      }

      return NextResponse.redirect(`${origin}/`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
}
