import { SupabaseClient } from "@supabase/supabase-js";
import { DEPARTMENTS } from "@/lib/departments";
import { getUserRoles, RECRUITER_READER_ROLES, type TalentRole } from "@/lib/talentRoles";

// -----------------------------------------------------------------------
// Single source of truth for "what can this signed-in account see and do."
//
// Before this file existed, the same role/entitlement logic was hand
// re-implemented independently in three different client components
// (WaffleMenu.tsx, Sidebar.tsx, TopbarStatus.tsx), each querying
// `profiles` / `talent_user_roles` / `feature_access` directly and
// re-deriving its own answer. That's exactly how a real bug shipped: one
// copy (TopbarStatus.tsx) was never updated to check anything at all, so
// a signed-in candidate saw an unconditional dropdown of recruiter/admin
// destinations. Fixing "one copy" doesn't fix the bug class -- the next
// drift is always one edit away as long as there are three copies to keep
// in sync.
//
// computeAccessContext() is now the one place this is computed, on the
// server, from the caller's own session. /api/profile/access exposes it
// as JSON; every client component that needs to know "what can I show
// this user" fetches that endpoint instead of querying Supabase tables
// itself. Server-side routes that enforce access (not just decide what to
// render) should keep using getOrgContext()/getUserRoles() directly --
// this file is for "what to show", not a replacement for a route's own
// authorization check.
// -----------------------------------------------------------------------

export interface AccessContext {
  userId: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  isPlatformOwner: boolean; // profiles.is_admin
  orgId: string | null;
  orgRole: "org_admin" | "member" | null;
  isOrgAdmin: boolean;
  status: string | null; // profiles.status
  persona: string | null; // profiles.persona
  talentRoles: TalentRole[]; // Talent.ai role tags (org_admin implicitly holds all of them)
  hasRecruiterAccess: boolean; // mirrors /api/ats/requisitions' own gate
  settingsHref: "/admin" | "/org/settings" | null;
  licensedDeptIds: string[]; // mirrors requireFeatureAccess()'s grant logic, department-level
}

export async function computeAccessContext(
  admin: SupabaseClient,
  userId: string,
  email: string | null
): Promise<AccessContext> {
  const { data: profile } = await admin
    .from("profiles")
    .select("is_admin, org_id, org_role, full_name, avatar_url, status, persona")
    .eq("id", userId)
    .maybeSingle();

  const isPlatformOwner = !!profile?.is_admin;
  const orgId = (profile?.org_id as string | null) ?? null;
  const orgRole = (profile?.org_role as "org_admin" | "member" | null) ?? null;
  const isOrgAdmin = orgRole === "org_admin";

  // getUserRoles() already returns the full TALENT_ROLES set for an
  // org_admin, so hasRecruiterAccess below could rely on that alone -- but
  // isPlatformOwner and isOrgAdmin are checked explicitly too, matching
  // /api/ats/requisitions' own "isPlatformOwner short-circuits, otherwise
  // roles.some(...)" shape exactly, so this stays an obvious mirror of that
  // route rather than something a reader has to trust is equivalent.
  const talentRoles = await getUserRoles(admin, userId);
  const hasRecruiterAccess =
    isPlatformOwner || isOrgAdmin || talentRoles.some((r) => RECRUITER_READER_ROLES.includes(r));

  const settingsHref: AccessContext["settingsHref"] = isPlatformOwner
    ? "/admin"
    : isOrgAdmin
    ? "/org/settings"
    : null;

  const licensedDeptIds = await computeLicensedDeptIds(admin, userId, isPlatformOwner, orgId);

  return {
    userId,
    email,
    fullName: (profile?.full_name as string | null) ?? null,
    avatarUrl: (profile?.avatar_url as string | null) ?? null,
    isPlatformOwner,
    orgId,
    orgRole,
    isOrgAdmin,
    status: (profile?.status as string | null) ?? null,
    persona: (profile?.persona as string | null) ?? null,
    talentRoles,
    hasRecruiterAccess,
    settingsHref,
    licensedDeptIds,
  };
}

// Mirrors requireFeatureAccess()'s own grant rule (admin bypass -> bulk
// plan grants every live tool -> otherwise an explicit feature_access row
// per tool), so a department the sidebar shows is never one a click would
// then be denied for. Kept as its own function so the shape matches the
// logic it mirrors, rather than being inlined into computeAccessContext.
async function computeLicensedDeptIds(
  admin: SupabaseClient,
  userId: string,
  isPlatformOwner: boolean,
  orgId: string | null
): Promise<string[]> {
  if (isPlatformOwner) {
    return DEPARTMENTS.map((d) => d.id);
  }

  const { data: userGrants } = await admin
    .from("user_feature_access")
    .select("feature_key")
    .eq("user_id", userId);
  const userGrantedKeys = new Set((userGrants || []).map((g: { feature_key: string }) => g.feature_key));

  let orgGrantedKeys = new Set<string>();
  let hasBulk = false;

  if (orgId) {
    const { data: org } = await admin
      .from("organizations")
      .select("plan, status")
      .eq("id", orgId)
      .maybeSingle();

    if (org?.status === "approved") {
      if (org.plan === "bulk") {
        hasBulk = true;
      } else {
        const { data: grants } = await admin
          .from("feature_access")
          .select("feature_key")
          .eq("org_id", orgId);
        orgGrantedKeys = new Set((grants || []).map((g: { feature_key: string }) => g.feature_key));
      }
    }
  }

  if (hasBulk) {
    // Bulk gives every department except owner-exclusive ones (Gauri.ai).
    return DEPARTMENTS.filter((d) => d.id !== "support").map((d) => d.id);
  }

  const allGranted = new Set([...Array.from(userGrantedKeys), ...Array.from(orgGrantedKeys)]);
  return DEPARTMENTS.filter((d) =>
    d.tools.some((t) => (t.bundled && d.id !== "support") || allGranted.has(t.n))
  ).map((d) => d.id);
}
