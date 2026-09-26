import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// GET /api/public/job/[id]
//
// Single published AskShree posting, by posting id (talent_job_postings.id
// -- the same id /api/public/jobs and /jobs/[id] use as the public job id).
// Used by the candidate hub to show "apply to this specific role" when
// landing via /candidate?job=<id>. Public/unauthenticated, same exposure
// rules as /api/public/jobs: never org_id, created_by, or emails.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = createAdminClient();

  try {
    const { data: posting } = await admin
      .from("talent_job_postings")
      .select(
        `
        id,
        hide_company_name,
        talent_requisitions (
          id,
          title,
          department,
          location,
          employment_type,
          eligibility_criteria,
          org_id
        )
        `
      )
      .eq("id", id)
      .eq("board", "askshree")
      .eq("status", "published")
      .maybeSingle();

    if (posting) {
      const req = Array.isArray(posting.talent_requisitions)
        ? posting.talent_requisitions[0]
        : posting.talent_requisitions;

      if (req) {
        let orgName: string | null = null;
        if (req.org_id) {
          const { data: org } = await admin
            .from("organizations")
            .select("name")
            .eq("id", req.org_id)
            .maybeSingle();
          orgName = (org as { name: string } | null)?.name ?? null;
        }

        const ec = (req.eligibility_criteria ?? {}) as {
          must_have_skills?: string[];
        };

        return NextResponse.json({
          job: {
            id: posting.id,
            title: req.title ?? "",
            department: req.department ?? "",
            location: req.location ?? "",
            type: req.employment_type ?? "Full-Time",
            company: posting.hide_company_name ? "Confidential" : orgName ?? "AskShree",
            must_have_skills: Array.isArray(ec.must_have_skills) ? ec.must_have_skills : [],
          },
        });
      }
    }

    // Legacy fallback -- id may be a legacy job_postings row.
    const { data: legacy } = await admin
      .from("job_postings")
      .select("id, title, company, location, employment_type, must_have_skills")
      .eq("id", id)
      .maybeSingle();

    if (legacy) {
      return NextResponse.json({
        job: {
          id: legacy.id,
          title: legacy.title ?? "",
          department: "",
          location: legacy.location ?? "",
          type: legacy.employment_type ?? "Full-Time",
          company: legacy.company ?? "AskShree",
          must_have_skills: legacy.must_have_skills ?? [],
        },
      });
    }

    return NextResponse.json({ job: null, error: "Job not found." }, { status: 404 });
  } catch (err) {
    return NextResponse.json(
      { job: null, error: err instanceof Error ? err.message : "Failed to load job." },
      { status: 500 }
    );
  }
}
