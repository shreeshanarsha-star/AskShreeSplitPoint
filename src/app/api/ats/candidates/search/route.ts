import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrgContext } from "@/lib/org";
import { getUserRoles, type TalentRole } from "@/lib/talentRoles";
import { searchTalentCandidates } from "@/lib/talentCandidateSearch";

export const dynamic = "force-dynamic";

const READER_ROLES: TalentRole[] = [
  "recruiter",
  "lead_recruiter",
  "hiring_manager",
  "hr_approver",
  "hr_ops",
  "hr_head",
  "ta_head",
  "admin",
];

// GET /api/ats/candidates/search?q=keyword+another
// Free-text search across the recruiter's own candidate database --
// scoped to their org (or, for an individual/standalone recruiter, to
// candidates on requisitions they created).
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

  if (!ctx.isPlatformOwner && !roles.some((r) => READER_ROLES.includes(r))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim();
  if (!q) {
    return NextResponse.json({ candidates: [] });
  }

  const keywords = q.split(/\s+/).filter(Boolean).slice(0, 12);

  try {
    const results = await searchTalentCandidates(
      admin,
      keywords,
      ctx.isPlatformOwner ? undefined : { orgId: ctx.orgId, createdBy: user.id }
    );

    // Trim to what a recruiter needs in a results list -- never leak the
    // full resume text or every internal field.
    const safe = results.slice(0, 50).map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      current_company: c.current_company,
      current_location: c.current_location,
      qualification: c.qualification,
      requisition: c.talent_requisitions,
      matchedKeywords: c._matchedKeywords,
      resumeSnippet: c._resumeSnippet,
      score: c._score,
      hasResume: !!c.resume_file_path,
      otherApplicationsCount: c._otherApplicationsCount,
    }));

    return NextResponse.json({ candidates: safe });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Search failed." },
      { status: 500 }
    );
  }
}
