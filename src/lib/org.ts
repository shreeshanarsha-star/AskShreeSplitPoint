import { SupabaseClient } from "@supabase/supabase-js";

// Every authenticated user belongs to at most one organization. This is
// the one place that answers "who is this person, and which org (if any)
// are they acting on behalf of" -- every multi-tenant route builds on it.
export type OrgContext = {
  userId: string;
  isPlatformOwner: boolean; // profiles.is_admin -- Shree, cross-org override
  orgId: string | null;
  orgRole: "org_admin" | "member" | null;
};

export async function getOrgContext(
  admin: SupabaseClient,
  userId: string
): Promise<OrgContext> {
  const { data: profile } = await admin
    .from("profiles")
    .select("is_admin, org_id, org_role")
    .eq("id", userId)
    .maybeSingle();

  const orgId = (profile?.org_id as string | null) ?? null;
  let orgRole = (profile?.org_role as "org_admin" | "member" | null) ?? null;

  // Owner -> org admin -> users: an org admin's powers only exist inside an
  // org the platform owner has approved. Until then they act as a plain
  // member, so every route built on this context enforces it uniformly.
  if (orgRole === "org_admin") {
    const approved = orgId
      ? (await admin.from("organizations").select("status").eq("id", orgId).maybeSingle()).data?.status === "approved"
      : false;
    if (!approved) orgRole = "member";
  }

  return {
    userId,
    isPlatformOwner: !!profile?.is_admin,
    orgId,
    orgRole,
  };
}

// True if this person can manage the given organization's members, roles,
// and settings -- either they're that org's own admin, or they're the
// platform owner (who has override rights everywhere).
export function canManageOrg(ctx: OrgContext, targetOrgId: string): boolean {
  if (ctx.isPlatformOwner) return true;
  return ctx.orgRole === "org_admin" && ctx.orgId === targetOrgId;
}

// Seat cap the platform owner can set per org at creation time
// (organizations.seat_limit -- null means uncapped, the default for
// orgs created before this existed or left blank on purpose). Both
// places an org admin can grow their headcount -- creating a fresh
// login (/api/org/members/invite) and adding an existing unaffiliated
// account (/api/org/members POST) -- call this first so the cap can't
// be bypassed by picking whichever path doesn't check it.
export async function checkSeatAvailable(
  admin: SupabaseClient,
  orgId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: org } = await admin
    .from("organizations")
    .select("seat_limit")
    .eq("id", orgId)
    .maybeSingle();
  const seatLimit = (org?.seat_limit as number | null) ?? null;
  if (seatLimit == null) return { ok: true };

  const { count, error } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId);
  if (error) return { ok: true }; // fail open -- a broken count shouldn't block onboarding

  if ((count ?? 0) >= seatLimit) {
    return {
      ok: false,
      error: `Seat limit reached (${count}/${seatLimit} used). Ask the platform owner to raise your organization's seat limit before adding more people.`,
    };
  }
  return { ok: true };
}
