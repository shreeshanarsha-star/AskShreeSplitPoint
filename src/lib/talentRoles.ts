import { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

// Talent.ai role tags. Independent of profiles.is_admin -- a person can
// hold several of these at once (e.g. TA Head who also recruits).
export type TalentRole =
  | "hiring_manager"
  | "reporting_manager"
  | "hr_approver"
  | "l2_approver"
  | "ta_head"
  | "lead_recruiter"
  | "recruiter"
  | "hr_ops"
  | "hr_head"
  | "chro"
  | "ceo"
  | "cfo"
  | "bu_head"
  | "admin";

export const TALENT_ROLES: TalentRole[] = [
  "hiring_manager",
  "reporting_manager",
  "hr_approver",
  "l2_approver",
  "ta_head",
  "lead_recruiter",
  "recruiter",
  "hr_ops",
  "hr_head",
  "chro",
  "ceo",
  "cfo",
  "bu_head",
  "admin",
];

// Human-readable labels for the owner-facing "create user" access-level
// picker (admin/create-user) and anywhere else a role needs to be shown to
// a person instead of used in a permission check. hr_approver is labeled
// "L1 Approver" here -- it's the same role buildApprovalChain's fixed
// two-step chain already checks for step 2, just given the name the owner
// actually uses. l2_approver, chro, ceo, cfo, and bu_head are recognized
// role tags and grantable from the owner's create-user tool, but are not
// (yet) wired into buildApprovalChain's approval logic -- that's still a
// fixed reporting_manager -> hr_approver chain. Extend buildApprovalChain
// separately if a real multi-tier approval flow is wanted later.
export const TALENT_ROLE_LABELS: Record<TalentRole, string> = {
  admin: "Admin",
  recruiter: "Recruiter",
  lead_recruiter: "Lead Recruiter",
  ta_head: "TA Head",
  hiring_manager: "Hiring Manager (HM)",
  reporting_manager: "Reporting Manager",
  hr_ops: "HR Ops",
  hr_approver: "L1 Approver (HR Approver)",
  l2_approver: "L2 Approver",
  hr_head: "HR Head",
  chro: "CHRO",
  ceo: "CEO",
  cfo: "CFO",
  bu_head: "BU Head",
};

// Which of the above belong to the "recruiter team" bucket vs the
// "organization" bucket in the owner's create-user tool -- purely a UI
// grouping (also used to derive profiles.persona for the created account),
// not a permission list. hr_approver/l2_approver/hr_head/chro etc. sit on
// the organization side because they approve/oversee hiring rather than
// run the recruiting desk day to day.
export const RECRUITER_TEAM_ROLES: TalentRole[] = [
  "recruiter",
  "lead_recruiter",
  "ta_head",
  "hiring_manager",
  "reporting_manager",
];
export const ORGANIZATION_TEAM_ROLES: TalentRole[] = [
  "admin",
  "hr_ops",
  "hr_approver",
  "l2_approver",
  "hr_head",
  "chro",
  "ceo",
  "cfo",
  "bu_head",
];

// lead_recruiter and hr_head are real, distinct labels in the UI, but
// every actual permission check in this codebase (approvals, assignment,
// the recruiter-eligibility list, etc.) is keyed off the base 7 roles.
// Rather than touch every one of those call sites, assigning one of these
// two also assigns its base-role equivalent underneath -- lead_recruiter
// gets full recruiter access (plus the distinct label), hr_head gets
// hr_approver access (so they can actually approve, not just be labeled
// senior). Kept explicit here rather than silently inferred, so it's easy
// to find and revisit once "sees whole TA team" becomes a real, separately
// enforced data-access rule instead of "= recruiter, for now."
export const ROLE_IMPLIES: Partial<Record<TalentRole, TalentRole>> = {
  lead_recruiter: "recruiter",
  hr_head: "hr_approver",
};

// Roles that may see recruiter-side data: list/read requisitions,
// applications, and generate candidate outreach. This is the single
// definition -- every route or shared lib that needs "can this account
// act like a recruiter" imports it from here instead of keeping its own
// copy, so a role added or removed here takes effect everywhere at once.
// (This exact array used to be hand-duplicated in /api/ats/requisitions
// and again in TopbarStatus.tsx -- precisely the kind of drift that once
// let a stale client-side copy show a "Recruiter Cockpit" link to an
// account that had no real access to it.)
export const RECRUITER_READER_ROLES: TalentRole[] = [
  "recruiter",
  "lead_recruiter",
  "hiring_manager",
  "hr_approver",
  "hr_ops",
  "hr_head",
  "ta_head",
  "admin",
];

// Requisition number: R-DDMMYYNN -- 2-digit day, 2-digit month, 2-digit year,
// then a 2-digit sequence that resets every calendar day, scoped per org so
// two organizations creating requisitions the same day don't collide.
// Computed from the current max for that org+day rather than a DB sequence
// (no per-org-per-day sequence object exists), with a short retry loop
// against the unique (org_id, req_no) index to absorb the rare race between
// two requisitions created in the same org at nearly the same instant.
export async function generateReqNo(admin: SupabaseClient, orgId: string | null): Promise<string> {
  const now = new Date();
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const yy = String(now.getUTCFullYear()).slice(-2);
  const datePrefix = `R-${dd}${mm}${yy}`;

  let query = admin
    .from("talent_requisitions")
    .select("req_no")
    .like("req_no", `${datePrefix}%`)
    .order("req_no", { ascending: false })
    .limit(1);
  query = orgId ? query.eq("org_id", orgId) : query.is("org_id", null);
  const { data } = await query;

  const lastSeq = data && data[0]?.req_no ? parseInt(data[0].req_no.slice(-2), 10) || 0 : 0;
  return `${datePrefix}${String(lastSeq + 1).padStart(2, "0")}`;
}

export type ApprovalStepRole = "reporting_manager" | "hr_approver";

// Fixed two-step chain: reporting manager (named, from profiles.manager_id)
// then HR approver (role pool -- no single named HR head required today).
// Kept as a function rather than a database rules table so it's easy to
// extend with department/level/comp conditions later without a migration.
export async function buildApprovalChain(
  admin: SupabaseClient,
  requesterId: string
): Promise<{ step_order: number; approver_role: ApprovalStepRole; approver_user_id: string | null }[]> {
  const { data: profile } = await admin
    .from("profiles")
    .select("manager_id")
    .eq("id", requesterId)
    .maybeSingle();

  return [
    { step_order: 1, approver_role: "reporting_manager", approver_user_id: profile?.manager_id ?? null },
    { step_order: 2, approver_role: "hr_approver", approver_user_id: null },
  ];
}

// Org admins act as every Talent.ai role inside their own org --
// oversight/support capability for a real customer org, and also means one
// admin account can exercise the whole workflow (recruiter, hiring manager,
// reporting manager, HR approver, TA head) without needing a separate login
// per role.
//
// The platform owner (profiles.is_admin) is deliberately NOT included here.
// Shree (the platform owner) manages orgs/approvals/grants at the platform
// level -- he is not a recruiter, hiring manager, or approver inside any
// customer's Talent.ai workflow. Platform-owner support/oversight access is
// handled separately (isPlatformOwner-style checks in individual API
// routes), not by silently holding every operational role here.
export async function getUserRoles(admin: SupabaseClient, userId: string): Promise<TalentRole[]> {
  const { data: profile } = await admin.from("profiles").select("org_role").eq("id", userId).maybeSingle();
  if (profile?.org_role === "org_admin") {
    return [...TALENT_ROLES];
  }
  const { data } = await admin.from("talent_user_roles").select("role").eq("user_id", userId);
  return (data || []).map((r) => r.role as TalentRole);
}

export async function hasTalentRole(
  admin: SupabaseClient,
  userId: string,
  role: TalentRole
): Promise<boolean> {
  const { data: profile } = await admin.from("profiles").select("org_role").eq("id", userId).maybeSingle();
  if (profile?.org_role === "org_admin") return true;
  const { data } = await admin
    .from("talent_user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", role)
    .maybeSingle();
  return !!data;
}

// Append-only audit trail. Fire-and-forget is fine here -- an audit log
// failure should never block the underlying action, but we do await it so
// ordering in the log matches the order actions actually happened.
export async function logAudit(params: {
  entityType: string;
  entityId: string;
  actorId: string | null;
  action: string;
  detail?: Record<string, unknown>;
  orgId?: string | null;
}) {
  try {
    const admin = createAdminClient();
    await admin.from("talent_audit_log").insert({
      entity_type: params.entityType,
      entity_id: params.entityId,
      actor_id: params.actorId,
      action: params.action,
      detail: params.detail ?? null,
      org_id: params.orgId ?? null,
    });
  } catch {
    // Never let audit logging break the caller.
  }
}

export async function notifyUser(params: {
  userId: string;
  title: string;
  body?: string | null;
  link?: string | null;
}) {
  try {
    const admin = createAdminClient();
    await admin.from("notifications").insert({
      user_id: params.userId,
      feature_key: "Talent.ai",
      title: params.title,
      body: params.body ?? null,
      link: params.link ?? null,
      channel: "in_app",
    });
  } catch {
    // Best-effort -- never block the action that triggered the notification.
  }
}
