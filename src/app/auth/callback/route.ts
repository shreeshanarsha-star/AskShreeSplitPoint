import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getClientIp, getClientLocation } from "@/lib/clientTelemetry";
import { resolveHomeRoute } from "@/lib/homeRoute";
import { safeNextPath } from "@/lib/safeNext";

// OAuth (Google) redirects here with a ?code= after the provider screen.
//
// Every account is a candidate by default. The only thing a sign-up can
// ask for is recruiter access (?persona=recruiter, from the "I'm hiring"
// box on /signup) -- and only for a brand-new account, which then waits
// for the owner's approval. Work roles are never self-assigned here;
// the owner (or an approved org admin) grants them.
const NEW_ACCOUNT_WINDOW_MS = 10 * 60 * 1000;

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));
  const wantsRecruiter = searchParams.get("persona") === "recruiter";

  if (code) {
    const supabase = await createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      const admin = createAdminClient();
      const userMeta = data.user.user_metadata || {};
      const createdAt = data.user.created_at ? new Date(data.user.created_at).getTime() : 0;
      const isNewAccount = Date.now() - createdAt < NEW_ACCOUNT_WINDOW_MS;

      const { data: profile } = await admin
        .from("profiles")
        .select("full_name, avatar_url, auth_provider, is_admin")
        .eq("id", data.user.id)
        .maybeSingle();

      // Fill telemetry/profile basics only where still empty.
      const patch: Record<string, unknown> = {};
      if (!profile?.full_name && (userMeta.full_name || userMeta.name)) patch.full_name = userMeta.full_name || userMeta.name;
      if (!profile?.avatar_url && (userMeta.avatar_url || userMeta.picture)) patch.avatar_url = userMeta.avatar_url || userMeta.picture;
      if (!profile?.auth_provider) patch.auth_provider = "google";
      if (isNewAccount) {
        patch.signup_ip = getClientIp(request.headers);
        patch.signup_location = getClientLocation(request.headers);
        if (wantsRecruiter && !profile?.is_admin) {
          patch.persona = "recruiter";
          patch.status = "pending_approval";
        }
      }
      if (Object.keys(patch).length > 0) {
        await admin.from("profiles").update(patch).eq("id", data.user.id);
      }

      const home = await resolveHomeRoute(admin, data.user.id, data.user.email ?? null);
      if (home.suspended) {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/login?error=suspended`);
      }
      // A pending account always waits, whatever ?next= says.
      if (home.route === "/waiting-room") return NextResponse.redirect(`${origin}/waiting-room`);
      return NextResponse.redirect(`${origin}${next || home.route}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
}
