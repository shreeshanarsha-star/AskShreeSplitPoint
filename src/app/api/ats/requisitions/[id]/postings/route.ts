import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrgContext } from "@/lib/org";
import { getUserRoles, logAudit, type TalentRole } from "@/lib/talentRoles";

export const dynamic = "force-dynamic";

// Boards that may be set to published via this API.
// Others exist for future connectors but return 501 today.
const PUBLISHABLE_BOARDS = new Set(["askshree", "google"]);

// All valid board values.
const VALID_BOARDS = new Set(["askshree", "google", "indeed", "linkedin", "naukri"]);

// Roles that may create/publish postings.
const POSTER_ROLES: TalentRole[] = ["recruiter", "lead_recruiter", "ta_head", "admin"];

// ---------------------------------------------------------------------------
// GET /api/ats/requisitions/[id]/postings
// ---------------------------------------------------------------------------
export async function GET(
  _request: Request,
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

  // Basic talent access check.
  const hasTalentAccess =
    ctx.isPlatformOwner ||
    ctx.orgRole === "org_admin" ||
    roles.length > 0;

  if (!hasTalentAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Verify the requisition belongs to the caller's org.
  const { data: req } = await admin
    .from("talent_requisitions")
    .select("id, org_id")
    .eq("id", reqId)
    .maybeSingle();

  if (!req) {
    return NextResponse.json({ error: "Requisition not found." }, { status: 404 });
  }

  if (!ctx.isPlatformOwner && req.org_id !== ctx.orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: postings, error } = await admin
    .from("talent_job_postings")
    .select("id, board, status, hide_company_name, content, valid_through, created_at, updated_at")
    .eq("requisition_id", reqId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ postings: postings ?? [] });
}

// ---------------------------------------------------------------------------
// POST /api/ats/requisitions/[id]/postings — create a posting.
// ---------------------------------------------------------------------------
export interface PostingInput {
  board: string;
  hide_company_name?: boolean;
  content?: Record<string, unknown>;
  valid_through?: string | null;
  status?: "draft" | "published";
}

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

  const canPost =
    ctx.isPlatformOwner ||
    ctx.orgRole === "org_admin" ||
    roles.some((r) => POSTER_ROLES.includes(r));

  if (!canPost) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Verify the requisition and org.
  const { data: req } = await admin
    .from("talent_requisitions")
    .select("id, org_id, status")
    .eq("id", reqId)
    .maybeSingle();

  if (!req) {
    return NextResponse.json({ error: "Requisition not found." }, { status: 404 });
  }

  if (!ctx.isPlatformOwner && req.org_id !== ctx.orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: PostingInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body?.board || !VALID_BOARDS.has(body.board)) {
    return NextResponse.json(
      { error: `board must be one of: ${[...VALID_BOARDS].join(", ")}.` },
      { status: 400 }
    );
  }

  // Boards other than askshree and google are not yet connected.
  if (!PUBLISHABLE_BOARDS.has(body.board)) {
    return NextResponse.json(
      { error: `${body.board} is not connected. Only AskShree and Google are supported today.` },
      { status: 501 }
    );
  }

  const wantsPublish = body.status === "published";

  // Google is blocked when hide_company_name is on.
  if (body.board === "google" && body.hide_company_name) {
    return NextResponse.json(
      { error: "Google Jobs does not allow confidential postings. Disable Hide Company Name or choose a different board." },
      { status: 422 }
    );
  }

  // Status: only recruiter / lead_recruiter / org_admin / platform_owner may publish.
  const canPublish =
    ctx.isPlatformOwner ||
    ctx.orgRole === "org_admin" ||
    roles.some((r) => (["recruiter", "lead_recruiter", "ta_head", "admin"] as TalentRole[]).includes(r));

  const resolvedStatus = wantsPublish && canPublish ? "published" : "draft";

  const { data: posting, error: insertErr } = await admin
    .from("talent_job_postings")
    .insert({
      requisition_id: reqId,
      org_id: ctx.orgId ?? null,
      board: body.board,
      status: resolvedStatus,
      hide_company_name: body.hide_company_name ?? false,
      content: body.content ?? {},
      valid_through: body.valid_through ?? null,
      created_by: user.id,
    })
    .select("id, board, status, hide_company_name, valid_through, created_at")
    .single();

  if (insertErr) {
    // Catch the unique constraint violation cleanly.
    if (insertErr.code === "23505") {
      return NextResponse.json(
        { error: `A posting for board '${body.board}' already exists for this requisition. Use PATCH to update it.` },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  await logAudit({
    entityType: "talent_job_postings",
    entityId: posting!.id,
    actorId: user.id,
    action: "created",
    detail: { board: body.board, status: resolvedStatus },
    orgId: ctx.orgId,
  });

  return NextResponse.json({
    ok: true,
    posting,
    message:
      resolvedStatus === "published"
        ? `Posting created and published to ${body.board}.`
        : `Posting created as draft for ${body.board}.`,
  });
}