import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrgContext } from "@/lib/org";
import { getUserRoles, type TalentRole } from "@/lib/talentRoles";

export const dynamic = "force-dynamic";

// Roles that may view applications.
const READER_ROLES: TalentRole[] = [
  "recruiter",
  "lead_recruiter",
  "hiring_manager",
  "hr_ops",
  "hr_head",
  "ta_head",
  "admin",
];

// GET /api/ats/applications
//
// Returns talent_candidates joined to talent_people and talent_requisitions.
// Org-scoped; individual licence = only the caller's own requisitions' candidates.
// Filterable by ?requisition_id=<uuid> and ?stage=<stage>.
// Returns only safe fields -- no recruiter emails, no internal ids beyond what
// the frontend needs to display and stage-move candidates.
export async function GET(request: Request) {
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

  const hasAccess =
    ctx.isPlatformOwner ||
    ctx.orgRole === "org_admin" ||
    roles.some((r) => READER_ROLES.includes(r));

  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const filterReqId = url.searchParams.get("requisition_id");
  const filterStage = url.searchParams.get("stage");

  // Build the query: join talent_candidates -> talent_people (person profile)
  // and talent_requisitions (title, org_id).
  // Service-role client only; all talent_* tables have RLS with no policies.
  let query = admin
    .from("talent_candidates")
    .select(
      `
      id,
      stage,
      rating,
      source,
      match_score,
      match_score_note,
      created_at,
      updated_at,
      name,
      email,
      phone,
      resume_file_name,
      current_company,
      current_location,
      experience_years,
      notice_period,
      current_ctc,
      expected_ctc,
      qualification,
      rejection_reason,
      met_must_have_skills,
      missing_must_have_skills,
      requisition_id,
      talent_requisitions!inner (
        id,
        title,
        req_no,
        org_id,
        created_by
      )
      `
    )
    .order("created_at", { ascending: false })
    .limit(200);

  // Org scoping -- never trust org_id from the request body.
  if (!ctx.isPlatformOwner) {
    if (ctx.orgId) {
      // Org users: only their org's requisitions' candidates.
      // Filter via the joined table: talent_requisitions.org_id = ctx.orgId.
      query = query.eq("talent_requisitions.org_id", ctx.orgId);
      // Role scoping: hiring managers see only their own requisitions.
      const isOrgAdmin = ctx.orgRole === "org_admin";
      const isLeadOrAbove =
        isOrgAdmin ||
        roles.some((r) =>
          (["lead_recruiter", "ta_head", "hr_head", "admin"] as TalentRole[]).includes(r)
        );
      if (!isLeadOrAbove && roles.includes("hiring_manager") && !roles.includes("recruiter")) {
        query = query.eq("talent_requisitions.created_by", user.id);
      }
    } else {
      // Individual licence: only candidates linked to the caller's own requisitions.
      query = query.eq("talent_requisitions.created_by", user.id);
    }
  }

  if (filterReqId) {
    query = query.eq("requisition_id", filterReqId);
  }

  if (filterStage) {
    query = query.eq("stage", filterStage);
  }

  const { data, error } = await query;

  if (error) {
    // If talent_candidates table has no matching data or the join fails,
    // return an empty list rather than a 500 so the UI stays functional.
    return NextResponse.json({ applications: [], error: error.message });
  }

  // Strip any fields that must not be exposed; flatten the joined requisition.
  const safe = (data ?? []).map((c) => {
    const req = Array.isArray(c.talent_requisitions)
      ? c.talent_requisitions[0]
      : c.talent_requisitions;

    return {
      id: c.id,
      stage: c.stage,
      rating: c.rating,
      source: c.source,
      match_score: c.match_score,
      match_score_note: c.match_score_note,
      created_at: c.created_at,
      updated_at: c.updated_at,
      // Candidate safe fields -- email included so recruiter can contact.
      // Recruiter-facing only: the public route never calls this endpoint.
      name: c.name,
      email: c.email,
      phone: c.phone,
      resume_file_name: c.resume_file_name,
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
      // Requisition context (no created_by or org_id exposed).
      requisition_id: c.requisition_id,
      requisition_title: req?.title ?? null,
      requisition_req_no: req?.req_no ?? null,
    };
  });

  return NextResponse.json({ applications: safe, total: safe.length });
}