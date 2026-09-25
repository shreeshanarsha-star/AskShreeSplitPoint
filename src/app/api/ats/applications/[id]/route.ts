import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrgContext } from "@/lib/org";
import { getUserRoles, logAudit, type TalentRole } from "@/lib/talentRoles";

export const dynamic = "force-dynamic";

const READER_ROLES: TalentRole[] = [
  "recruiter",
  "lead_recruiter",
  "hiring_manager",
  "hr_ops",
  "hr_head",
  "ta_head",
  "admin",
];

const EDITOR_ROLES: TalentRole[] = [
  "recruiter",
  "lead_recruiter",
  "ta_head",
  "admin",
];

// Fields the recruiter hub's inline-edit table (All Applications) may patch.
// Stage moves, rejection reasons etc. all funnel through this one whitelist.
const EDITABLE_FIELDS = new Set([
  "stage",
  "notice_period",
  "current_ctc",
  "expected_ctc",
  "qualification",
  "rating",
  "rejection_reason",
]);

async function loadCandidateWithOrg(admin: ReturnType<typeof createAdminClient>, id: string) {
  return admin
    .from("talent_candidates")
    .select(
      `
      id, stage, rating, source, match_score, match_score_note, created_at, updated_at,
      name, email, phone, resume_file_name, resume_file_path,
      current_company, current_location, experience_years, notice_period,
      current_ctc, expected_ctc, qualification, rejection_reason,
      met_must_have_skills, missing_must_have_skills, requisition_id,
      talent_requisitions!inner ( id, title, req_no, org_id, created_by )
      `
    )
    .eq("id", id)
    .maybeSingle();
}

// GET /api/ats/applications/[id]
// Single candidate, with a short-lived signed URL for the resume file (if one
// was captured). Mirrors the org/role scoping used by the list endpoint.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const ctx = await getOrgContext(admin, user.id);
  const roles = await getUserRoles(admin, user.id);
  const hasAccess = ctx.isPlatformOwner || ctx.orgRole === "org_admin" || roles.some((r) => READER_ROLES.includes(r));
  if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: c, error } = await loadCandidateWithOrg(admin, id);
  if (error || !c) return NextResponse.json({ error: "Application not found." }, { status: 404 });

  const req = Array.isArray(c.talent_requisitions) ? c.talent_requisitions[0] : c.talent_requisitions;

  if (!ctx.isPlatformOwner) {
    if (ctx.orgId) {
      if (req?.org_id !== ctx.orgId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    } else if (req?.created_by !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  let resumeUrl: string | null = null;
  if (c.resume_file_path) {
    const { data: signed } = await admin.storage.from("resumes").createSignedUrl(c.resume_file_path, 300);
    resumeUrl = signed?.signedUrl ?? null;
  }

  return NextResponse.json({
    application: {
      id: c.id,
      stage: c.stage,
      rating: c.rating,
      source: c.source,
      match_score: c.match_score,
      match_score_note: c.match_score_note,
      created_at: c.created_at,
      updated_at: c.updated_at,
      name: c.name,
      email: c.email,
      phone: c.phone,
      resume_file_name: c.resume_file_name,
      resumeUrl,
      current_company: c.current_company,
      current_location: c.current_location,
      experience_years: c.experience_years,
      notice_period: c.notice_period,
      current_ctc: c.current_ctc,
      expected_ctc: c.expected_ctc,
      qualification: c.qualification,
      rejection_reason: c.rejection_reason,
      met_must_have_skills: c.met_must_have_skills,
      missing_must_have_skills: c.missing_must_have_skills,
      requisition_id: c.requisition_id,
      requisition_title: req?.title ?? null,
      requisition_req_no: req?.req_no ?? null,
    },
  });
}

// PATCH /api/ats/applications/[id]
// Inline edits from the All Applications table -- stage, notice period,
// CTC figures, qualification, rating. Everything else is read-only here.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const ctx = await getOrgContext(admin, user.id);
  const roles = await getUserRoles(admin, user.id);
  const canEdit = ctx.isPlatformOwner || ctx.orgRole === "org_admin" || roles.some((r) => EDITOR_ROLES.includes(r));
  if (!canEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: existing, error: fetchErr } = await loadCandidateWithOrg(admin, id);
  if (fetchErr || !existing) return NextResponse.json({ error: "Application not found." }, { status: 404 });

  const req = Array.isArray(existing.talent_requisitions) ? existing.talent_requisitions[0] : existing.talent_requisitions;
  if (!ctx.isPlatformOwner) {
    if (ctx.orgId) {
      if (req?.org_id !== ctx.orgId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    } else if (req?.created_by !== user.id) {
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
    if (EDITABLE_FIELDS.has(key)) patch[key] = body[key];
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No editable fields provided." }, { status: 400 });
  }
  patch.updated_at = new Date().toISOString();

  const { data: updated, error: updateErr } = await admin
    .from("talent_candidates")
    .update(patch)
    .eq("id", id)
    .select("id, stage, notice_period, current_ctc, expected_ctc, qualification, rating, updated_at")
    .single();

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  await logAudit({
    entityType: "talent_candidates",
    entityId: id,
    actorId: user.id,
    action: "edited",
    detail: { fields: Object.keys(patch) },
    orgId: ctx.orgId,
  });

  return NextResponse.json({ ok: true, application: updated });
}
