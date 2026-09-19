import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// GET /api/public/jobs
//
// Returns published AskShree postings joined to their requisition.
// This route is unauthenticated (public). It must never expose:
//   - org_id, created_by, recruiter identifiers, or any email address.
//   - Draft, closed, or non-AskShree postings.
// Response shape is intentionally identical to the previous implementation
// so the home-page Guest Hub renders unchanged.
//
// NOTE: talent_job_postings table does not exist yet (DRAFT migration pending).
// Until the migration is applied this will return { jobs: [] } -- an honest
// empty state. The home page handles an empty jobs array correctly.

export async function GET() {
  const admin = createAdminClient();

  try {
    // Join talent_job_postings (board=askshree, status=published)
    // to talent_requisitions for display fields.
    // All data access via service-role client only -- RLS bypassed server-side.
    const { data: postings, error } = await admin
      .from("talent_job_postings")
      .select(
        `
        id,
        hide_company_name,
        valid_through,
        content,
        talent_requisitions (
          id,
          title,
          department,
          location,
          employment_type,
          description,
          work_mode,
          org_id
        )
        `
      )
      .eq("board", "askshree")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      // Table may not exist yet (DRAFT migration pending).
      // Return empty jobs rather than a 500 so the home page stays functional.
      return NextResponse.json({ jobs: [] });
    }

    const jobs = (postings ?? [])
      .filter((p) => p.talent_requisitions) // skip orphaned postings
      .map((p) => {
        // talent_requisitions is a 1-to-1 join, Supabase returns object not array.
        const req = Array.isArray(p.talent_requisitions)
          ? p.talent_requisitions[0]
          : p.talent_requisitions;

        if (!req) return null;

        return {
          // Use posting id as the public job id so /jobs/[id] routes correctly.
          id: p.id,
          title: req.title ?? "",
          department: req.department ?? "",
          location: req.location ?? "",
          type: req.employment_type ?? "Full-Time",
          description: req.description ?? "",
          // Never expose: org_id, created_by, recruiter emails.
          // Company name: suppressed when hide_company_name is on.
          // The home page does not currently render a company name field,
          // but we include it as "Confidential" for forward compatibility.
          company: p.hide_company_name ? "Confidential" : undefined,
        };
      })
      .filter(Boolean);

    return NextResponse.json({ jobs });
  } catch {
    // Fail gracefully -- the home page must never crash due to ATS state.
    return NextResponse.json({ jobs: [] });
  }
}