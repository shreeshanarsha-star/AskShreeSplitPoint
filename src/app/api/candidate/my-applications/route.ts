import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// GET /api/candidate/my-applications
//
// Real applications for the SIGNED-IN candidate, driving the "My
// Applications" tab of /candidate. Auth via the visitor's own session
// cookie (createClient) -- we only ever look up rows for that user's own
// email, then use the admin client to actually read talent_candidates
// (RLS on that table is written for recruiter/org access, not candidates).
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const email = user.email.toLowerCase().trim();
  const admin = createAdminClient();

  try {
    const { data: candidates, error } = await admin
      .from("talent_candidates")
      .select(
        `
        id,
        stage,
        created_at,
        resume_file_name,
        match_score,
        met_must_have_skills,
        missing_must_have_skills,
        requisition_id,
        talent_requisitions (
          id,
          req_no,
          title,
          department,
          location,
          org_id
        )
        `
      )
      .ilike("email", email)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ applications: [] });
    }

    // Batch-fetch org names for any requisitions that have one.
    const orgIds = Array.from(
      new Set(
        (candidates ?? [])
          .map((c) => {
            const req = Array.isArray(c.talent_requisitions) ? c.talent_requisitions[0] : c.talent_requisitions;
            return req?.org_id ?? null;
          })
          .filter((v): v is string => Boolean(v))
      )
    );

    let orgNames: Record<string, string> = {};
    if (orgIds.length > 0) {
      const { data: orgs } = await admin.from("organizations").select("id, name").in("id", orgIds);
      orgNames = Object.fromEntries((orgs ?? []).map((o) => [o.id, o.name]));
    }

    const applications = (candidates ?? [])
      .map((c) => {
        const req = Array.isArray(c.talent_requisitions) ? c.talent_requisitions[0] : c.talent_requisitions;
        if (!req) return null;

        return {
          id: c.id,
          reqNo: req.req_no || `R-${c.id.slice(0, 8).toUpperCase()}`,
          role: req.title ?? "Role",
          department: req.department ?? "",
          location: req.location ?? "",
          company: req.org_id ? orgNames[req.org_id] ?? "AskShree" : "AskShree",
          stage: c.stage ?? "applied",
          submittedAt: c.created_at,
          cvFileName: c.resume_file_name ?? null,
          matchScore: c.match_score ?? null,
          matchedSkills: c.met_must_have_skills ?? [],
          missingSkills: c.missing_must_have_skills ?? [],
        };
      })
      .filter(Boolean);

    return NextResponse.json({ applications });
  } catch (err) {
    return NextResponse.json(
      { applications: [], error: err instanceof Error ? err.message : "Failed to load applications." },
      { status: 500 }
    );
  }
}
