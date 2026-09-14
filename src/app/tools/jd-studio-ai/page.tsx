import AppShell from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import JdStudioApp from "@/components/tools/JdStudioApp";
import { checkGuestGate, type GuestGateResult } from "@/lib/guestAccess";
import { isGuestTrialEnabled } from "@/lib/platformSettings";

const TOOL_KEY = "JD Studio.ai";

export default async function JdStudioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <AppShell title="JD Studio.ai">
        <div className="border border-dashed border-border rounded-md px-4 py-6 text-center text-[13px] text-ink-muted">
          Sign in first.
        </div>
      </AppShell>
    );
  }

  let profile: any = null;
  const { data: fullProfile, error: profileErr } = await supabase
    .from("profiles")
    .select("org_id, is_admin, is_anonymous, credits, guest_tool_usage, created_at, persona, status")
    .eq("id", user.id)
    .maybeSingle();

  if (!profileErr && fullProfile) {
    profile = fullProfile;
  } else {
    const { data: fallback } = await supabase
      .from("profiles")
      .select("org_id, is_admin, is_anonymous, credits, guest_tool_usage, created_at")
      .eq("id", user.id)
      .maybeSingle();
    if (fallback) {
      profile = {
        ...fallback,
        status: fallback.is_admin ? "approved" : "active",
        persona: fallback.is_admin ? "organization" : "recruiter",
      };
    }
  }

  // JD Studio is exclusive to verified Recruiters & Owner
  const isOwner = !!profile?.is_admin;
  const isApprovedRecruiter = profile?.persona === "recruiter" && (profile?.status === "active" || profile?.status === "approved");

  let userGrant: any = null;
  try {
    const { data } = await supabase
      .from("user_feature_access")
      .select("id")
      .eq("user_id", user.id)
      .eq("feature_key", TOOL_KEY)
      .maybeSingle();
    userGrant = data;
  } catch {
    // Best effort
  }

  if (!isOwner && !isApprovedRecruiter && !userGrant) {
    return (
      <AppShell title="JD Studio.ai">
        <div className="flex items-center justify-center p-8">
          <div className="max-w-md w-full border border-border rounded-xl p-6 bg-surface text-center shadow-soft">
            <div className="text-[28px] mb-2">💼</div>
            <h2 className="text-[17px] font-bold text-ink mb-1 font-display">Recruiter Exclusive Tool</h2>
            <p className="text-[12.5px] text-ink-muted mb-4 leading-relaxed">
              JD Studio.ai is an advanced job architecture studio exclusively available to verified Recruiters and Talent Acquisition Partners.
            </p>
            <div className="text-[11.5px] text-ink-muted bg-page/60 border border-border rounded-lg p-3">
              If you are a recruiter, please ensure your account has been approved by the platform owner or request access.
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  let guestStatus: GuestGateResult | null = null;
  if (profile) {
    const guestTrialEnabled = await isGuestTrialEnabled(supabase);
    guestStatus = checkGuestGate(
      {
        org_id: profile.org_id,
        is_admin: !!profile.is_admin,
        is_anonymous: profile.is_anonymous,
        credits: profile.credits,
        guest_tool_usage: profile.guest_tool_usage as Record<string, number> | null,
        created_at: profile.created_at,
      },
      TOOL_KEY,
      guestTrialEnabled
    );
  }

  return (
    <AppShell title="JD Studio.ai">
      <JdStudioApp guestStatus={guestStatus} />
    </AppShell>
  );
}
