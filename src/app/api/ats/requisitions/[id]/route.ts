import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrgContext } from "@/lib/org";
import { getUserRoles, logAudit, type TalentRole } from "@/lib/talentRoles";

export const dynamic = "force-dynamic";

// Roles permitted to edit a requisition.
const EDITOR_ROLES: TalentRole[] = [
  "recruiter",
  "lead_recruiter",
  "ta_head",
  "admin",
];

// Fields that may be patched. hiring_manager, status, org_id, created_by etc.
// are intentionally excluded -- status changes go through approve/reject.
const EDITABLE_FIELDS = new Set([
  "title",
  "department",
  "location",
  "work_mode",
  "employment_type",
  "headcount",
  "priority",
  "hiring_manager",
  "description",
  "job_level",
  "comp_min",
  "comp_max",
  "target_hire_date",
  "eligibility_criteria",
  "comments",
]);

// PATCH /api/ats/requisitions/[id]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: reqId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const ctx = await getOrgContext(admin, user.id);
  const roles = await getUserRoles(admin, user.id);

  // Must hold an editor role (or be org_admin / platform owner).
  const isOrgAdmin = ctx.orgRole === "org_admin";
  const canEdit =
    ctx.isPlatformOwner ||
    isOrgAdmin ||
    roles.some((r) => EDITOR_ROLES.includes(r));

  if (!canEdit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch the requisition to verify org ownership.
  const { data: existing, error: fetchErr } = await admin
    .from("talent_requisitions")
    .select("id, org_id, created_by, status")
    .eq("id", reqId)
    .maybeSingle();

  if (fetchErr || !existing) {
    return NextResponse.json({ error: "Requisition not found." }, { status: 404 });
  }

  // Org scoping: non-platform-owners must belong to the same org.
  // SECURITY: null !== null is false in JS, so two individual (no-org) users
  // would pass a plain org_id equality check. When ctx.orgId is null we must
  // also require the record's created_by to match the caller.
  if (!ctx.isPlatformOwner) {
    if (existing.org_id !== ctx.orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    // Individual licence (orgId === null): caller must own the record.
    if (ctx.orgId === null && existing.created_by !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    // Hiring managers may only edit their own requisitions.
    if (
      roles.includes("hiring_manager") &&
      !roles.some((r) => EDITOR_ROLES.includes(r)) &&
      existing.created_by !== user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // Whitelist allowed fields -- reject any attempt to patch org_id, status, etc.
  const patch: Record<string, unknown> = {};
  for (const key of Object.keys(body)) {
    if (EDITABLE_FIELDS.has(key)) {
      patch[key] = body[key];
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No editable fields provided." }, { status: 400 });
  }

  patch.updated_at = new Date().toISOString();

  const { data: updated, error: updateErr } = await admin
    .from("talent_requisitions")
    .update(patch)
    .eq("id", reqId)
    .select("id, req_no, title, status, updated_at")
    .single();

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  await logAudit({
    entityType: "talent_requisitions",
    entityId: reqId,
    actorId: user.id,
    action: "edited",
    detail: { fields: Object.keys(patch) },
    orgId: ctx.orgId,
  });

  return NextResponse.json({ ok: true, requisition: updated });
}