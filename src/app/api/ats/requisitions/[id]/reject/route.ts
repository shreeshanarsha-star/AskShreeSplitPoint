import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrgContext } from "@/lib/org";
import { getUserRoles, logAudit, notifyUser, type TalentRole } from "@/lib/talentRoles";

export const dynamic = "force-dynamic";

const APPROVER_ROLES: TalentRole[] = ["reporting_manager", "hr_approver", "hr_head", "admin"];

// POST /api/ats/requisitions/[id]/reject
export async function POST(
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

  // Fetch requisition.
  const { data: req, error: reqErr } = await admin
    .from("talent_requisitions")
    .select("id, org_id, status, created_by, req_no")
    .eq("id", reqId)
    .maybeSingle();

  if (reqErr || !req) {
    return NextResponse.json({ error: "Requisition not found." }, { status: 404 });
  }

  // Org scoping.
  if (!ctx.isPlatformOwner && req.org_id !== ctx.orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (req.status !== "pending_approval") {
    return NextResponse.json(
      { error: `Requisition is not pending approval (current status: ${req.status}).` },
      { status: 409 }
    );
  }

  const isOrgAdmin = ctx.orgRole === "org_admin";
  const canReject =
    ctx.isPlatformOwner ||
    isOrgAdmin ||
    roles.some((r) => APPROVER_ROLES.includes(r));

  if (!canReject) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Find the first pending step.
  const { data: steps } = await admin
    .from("talent_approval_steps")
    .select("id, step_order, approver_role, approver_user_id, status")
    .eq("requisition_id", reqId)
    .order("step_order", { ascending: true });

  const pendingStep = (steps ?? []).find((s) => s.status === "pending");

  if (!pendingStep) {
    return NextResponse.json({ error: "No pending approval step found." }, { status: 409 });
  }

  const isNamedApprover =
    pendingStep.approver_user_id && pendingStep.approver_user_id === user.id;
  const isRoleApprover =
    !pendingStep.approver_user_id &&
    roles.some((r) => r === (pendingStep.approver_role as TalentRole));

  if (!ctx.isPlatformOwner && !isOrgAdmin && !isNamedApprover && !isRoleApprover) {
    return NextResponse.json(
      { error: "You are not the assigned approver for the current step." },
      { status: 403 }
    );
  }

  let body: { comment?: string } = {};
  try {
    body = await request.json();
  } catch {
    // comment is optional
  }

  // Mark the step rejected.
  await admin
    .from("talent_approval_steps")
    .update({
      status: "rejected",
      comment: body.comment ?? null,
      decided_by: user.id,
      decided_at: new Date().toISOString(),
    })
    .eq("id", pendingStep.id);

  // Set requisition to rejected.
  await admin
    .from("talent_requisitions")
    .update({ status: "rejected", updated_at: new Date().toISOString() })
    .eq("id", reqId);

  // Status history.
  await admin.from("talent_requisition_status_history").insert({
    requisition_id: reqId,
    from_status: "pending_approval",
    to_status: "rejected",
    changed_by: user.id,
    note: body.comment
      ? `Rejected at step ${pendingStep.step_order}: ${body.comment}`
      : `Rejected at step ${pendingStep.step_order}.`,
  });

  await logAudit({
    entityType: "talent_requisitions",
    entityId: reqId,
    actorId: user.id,
    action: `rejected_step_${pendingStep.step_order}`,
    detail: { step_order: pendingStep.step_order, comment: body.comment },
    orgId: ctx.orgId,
  });

  // Notify the creator.
  if (req.created_by) {
    await notifyUser({
      userId: req.created_by,
      title: `Requisition ${req.req_no} rejected`,
      body: body.comment
        ? `Rejected at step ${pendingStep.step_order}: ${body.comment}`
        : `Rejected at approval step ${pendingStep.step_order}.`,
      link: `/recruiter`,
    });
  }

  return NextResponse.json({
    ok: true,
    status: "rejected",
    message: "Requisition rejected.",
  });
}