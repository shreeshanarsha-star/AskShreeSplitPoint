import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrgContext } from "@/lib/org";
import { getUserRoles, logAudit, type TalentRole } from "@/lib/talentRoles";

export const dynamic = "force-dynamic";

const PUBLISHABLE_BOARDS = new Set(["askshree", "google"]);

const POSTER_ROLES: TalentRole[] = ["recruiter", "lead_recruiter", "ta_head", "admin"];

const EDITABLE_POSTING_FIELDS = new Set([
  "hide_company_name",
  "content",
  "valid_through",
  "status",
]);

// PATCH /api/ats/postings/[id]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postingId } = await params;

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

  const canEdit =
    ctx.isPlatformOwner ||
    ctx.orgRole === "org_admin" ||
    roles.some((r) => POSTER_ROLES.includes(r));

  if (!canEdit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch existing posting to verify org ownership.
  // Also select created_by for individual-licence isolation.
  const { data: existing, error: fetchErr } = await admin
    .from("talent_job_postings")
    .select("id, org_id, board, status, hide_company_name, created_by, requisition_id")
    .eq("id", postingId)
    .maybeSingle();

  if (fetchErr || !existing) {
    return NextResponse.json({ error: "Posting not found." }, { status: 404 });
  }

  if (!ctx.isPlatformOwner) {
    if (existing.org_id !== ctx.orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    // SECURITY: null === null passes; individual users must own the record.
    if (ctx.orgId === null && existing.created_by !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  for (const key of Object.keys(body)) {
    if (EDITABLE_POSTING_FIELDS.has(key)) {
      patch[key] = body[key];
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No editable fields provided." }, { status: 400 });
  }

  // Validate status transition.
  if (patch.status !== undefined) {
    const newStatus = patch.status as string;
    if (!["draft", "published", "closed"].includes(newStatus)) {
      return NextResponse.json(
        { error: "status must be draft, published, or closed." },
        { status: 400 }
      );
    }

    if (newStatus === "published") {
      // The parent requisition must be approved/open.
      const { data: parentReq } = await admin
        .from("talent_requisitions")
        .select("status")
        .eq("id", (existing as unknown as { requisition_id: string }).requisition_id)
        .maybeSingle();
      if (!parentReq || !["open", "approved"].includes(parentReq.status as string)) {
        return NextResponse.json(
          { error: "The requisition is not approved yet, so this posting cannot be published." },
          { status: 409 }
        );
      }

      // Only askshree and google can be published.
      if (!PUBLISHABLE_BOARDS.has(existing.board)) {
        return NextResponse.json(
          { error: `${existing.board} is not connected. Only AskShree and Google are supported today.` },
          { status: 501 }
        );
      }

      // Google cannot have hide_company_name.
      const willHide =
        patch.hide_company_name !== undefined
          ? !!patch.hide_company_name
          : existing.hide_company_name;

      if (existing.board === "google" && willHide) {
        return NextResponse.json(
          { error: "Google Jobs does not allow confidential postings. Disable Hide Company Name." },
          { status: 422 }
        );
      }
    }
  }

  patch.updated_at = new Date().toISOString();

  const { data: updated, error: updateErr } = await admin
    .from("talent_job_postings")
    .update(patch)
    .eq("id", postingId)
    .select("id, board, status, hide_company_name, valid_through, updated_at")
    .single();

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  await logAudit({
    entityType: "talent_job_postings",
    entityId: postingId,
    actorId: user.id,
    action: "updated",
    detail: { fields: Object.keys(patch), new_status: updated?.status },
    orgId: ctx.orgId,
  });

  return NextResponse.json({ ok: true, posting: updated });
}