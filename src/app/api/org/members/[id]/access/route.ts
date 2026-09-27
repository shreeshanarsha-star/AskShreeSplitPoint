import { NextResponse } from "next/server";
import { requireOrgAdmin } from "@/lib/supabase/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { TALENT_ROLES, TALENT_ROLE_LABELS, type TalentRole } from "@/lib/talentRoles";
import { getOrgGrantedTools, getBlockedTools } from "@/lib/orgTools";

export const dynamic = "force-dynamic";

// Roles an org admin may hand out inside their own org. "admin" is not in
// this list: org-admin status is the separate orgRole switch below.
const ASSIGNABLE_ROLES: TalentRole[] = TALENT_ROLES.filter((r) => r !== "admin");

type Ctx = { params: Promise<{ id: string }> };

async function loadTarget(ctxOrgId: string, targetId: string) {
  const admin = createAdminClient();
  const { data: target } = await admin
    .from("profiles")
    .select("id, org_id, org_role, email, full_name")
    .eq("id", targetId)
    .maybeSingle();
  if (!target || target.org_id !== ctxOrgId) return { admin, target: null };
  return { admin, target };
}

// What this member currently has, and what the org admin is allowed to give.
export async function GET(_req: Request, { params }: Ctx) {
  let orgId: string | null;
  try {
    ({ orgId } = await requireOrgAdmin());
  } catch (res) {
    return res as Response;
  }
  if (!orgId) return NextResponse.json({ error: "Use the owner console to manage accounts outside an org." }, { status: 403 });

  const { id } = await params;
  const { admin, target } = await loadTarget(orgId, id);
  if (!target) return NextResponse.json({ error: "That person isn't a member of your organization." }, { status: 404 });

  const { data: roleRows } = await admin
    .from("talent_user_roles")
    .select("role")
    .eq("user_id", id)
    .eq("org_id", orgId);

  const orgTools = await getOrgGrantedTools(admin, orgId);
  const blocked = await getBlockedTools(admin, orgId, id);

  return NextResponse.json({
    orgRole: target.org_role,
    roles: (roleRows || []).map((r: { role: string }) => r.role),
    assignableRoles: ASSIGNABLE_ROLES,
    roleLabels: TALENT_ROLE_LABELS,
    orgTools,
    enabledTools: orgTools.filter((t) => !blocked.includes(t)),
  });
}

// Replace this member's roles, org-admin status and enabled tools.
// Everything is validated against the caller's own org and the owner's
// grants to that org -- nothing here can exceed what the owner allowed.
export async function PUT(req: Request, { params }: Ctx) {
  let user, orgId: string | null;
  try {
    ({ user, orgId } = await requireOrgAdmin());
  } catch (res) {
    return res as Response;
  }
  if (!orgId) return NextResponse.json({ error: "Use the owner console to manage accounts outside an org." }, { status: 403 });

  const { id } = await params;
  const { admin, target } = await loadTarget(orgId, id);
  if (!target) return NextResponse.json({ error: "That person isn't a member of your organization." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const roles: TalentRole[] = Array.isArray(body?.roles)
    ? Array.from(new Set((body.roles as unknown[]).filter((r): r is TalentRole => ASSIGNABLE_ROLES.includes(r as TalentRole))))
    : [];
  const orgRole = body?.orgRole === "org_admin" ? "org_admin" : "member";
  const orgTools = await getOrgGrantedTools(admin, orgId);
  const enabled = new Set(
    Array.isArray(body?.enabledTools) ? (body.enabledTools as unknown[]).filter((t): t is string => typeof t === "string") : orgTools
  );

  if (id === user.id && orgRole !== "org_admin") {
    return NextResponse.json({ error: "You can't remove your own org-admin access." }, { status: 400 });
  }

  // 1. Org-admin switch.
  if (target.org_role !== orgRole) {
    const { error } = await admin.from("profiles").update({ org_role: orgRole }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 2. Roles inside this org only.
  const { data: current } = await admin.from("talent_user_roles").select("role").eq("user_id", id).eq("org_id", orgId);
  const have = new Set((current || []).map((r: { role: string }) => r.role));
  const toRemove = Array.from(have).filter((r) => !roles.includes(r as TalentRole));
  const toAdd = roles.filter((r) => !have.has(r));
  if (toRemove.length) {
    const { error } = await admin.from("talent_user_roles").delete().eq("user_id", id).eq("org_id", orgId).in("role", toRemove);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (toAdd.length) {
    const { error } = await admin
      .from("talent_user_roles")
      .insert(toAdd.map((role) => ({ user_id: id, role, org_id: orgId, created_by: user.id })));
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 3. Tools: a block for every owner-granted tool not ticked. Unknown tool
  //    names are ignored -- the owner's grant list is the ceiling.
  const wantBlocked = orgTools.filter((t) => !enabled.has(t));
  const nowBlocked = await getBlockedTools(admin, orgId, id);
  const unblock = nowBlocked.filter((t) => !wantBlocked.includes(t));
  const block = wantBlocked.filter((t) => !nowBlocked.includes(t));
  if (unblock.length) {
    await admin.from("org_member_tool_blocks").delete().eq("org_id", orgId).eq("user_id", id).in("feature_key", unblock);
  }
  if (block.length) {
    await admin
      .from("org_member_tool_blocks")
      .insert(block.map((feature_key) => ({ org_id: orgId, user_id: id, feature_key, created_by: user.id })));
  }

  // Who did it (the table triggers can't see the actor through the
  // service-role client, so record it explicitly).
  await admin.from("role_change_log").insert({
    actor_id: user.id,
    target_user_id: id,
    change_type: "org_admin_access_update",
    new_value: { org_id: orgId, orgRole, roles, disabledTools: wantBlocked },
  });

  return NextResponse.json({ ok: true });
}
