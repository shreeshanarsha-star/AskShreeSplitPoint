import type { SupabaseClient } from "@supabase/supabase-js";
import { computeAccessContext } from "@/lib/accessContext";

// -----------------------------------------------------------------------
// Where does this account land after signing in?
//
// One login for everyone (the owner additionally has his own unlisted
// sign-in page). The destination is decided ONLY from real, server-side
// access facts -- never from profiles.persona, which is "candidate" for
// almost every account (recruiters, hiring managers and org admins
// included) and so sent all of them to /candidate.
//
//   owner (profiles.is_admin)                      -> /admin
//   pending owner approval                         -> /waiting-room
//   org admin of a team org (non-individual plan)  -> /org/settings
//   any recruiter-side role (incl. standalone
//     recruiters, whose org is plan=individual)    -> /recruiter
//   everyone else -- every account is a candidate  -> /candidate
//
// Suspended accounts get no destination; callers must refuse sign-in.
// -----------------------------------------------------------------------

export type HomeRoute =
  | { suspended: true; route: null }
  | { suspended: false; route: string };

const TEAM_PLANS = new Set(["enterprise", "organization", "bulk"]);

export async function resolveHomeRoute(
  admin: SupabaseClient,
  userId: string,
  email: string | null
): Promise<HomeRoute> {
  const ctx = await computeAccessContext(admin, userId, email);

  if (ctx.status === "suspended") return { suspended: true, route: null };
  if (ctx.isPlatformOwner) return { suspended: false, route: "/admin" };
  if (ctx.status === "pending_approval") return { suspended: false, route: "/waiting-room" };

  if (ctx.isOrgAdmin && ctx.orgId) {
    const { data: org } = await admin
      .from("organizations")
      .select("plan")
      .eq("id", ctx.orgId)
      .maybeSingle();
    if (org?.plan && TEAM_PLANS.has(org.plan as string)) {
      return { suspended: false, route: "/org/settings" };
    }
  }

  if (ctx.hasRecruiterAccess) return { suspended: false, route: "/recruiter" };
  return { suspended: false, route: "/candidate" };
}
