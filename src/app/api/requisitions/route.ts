import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export interface RequisitionInput {
  title: string;
  department?: string;
  location?: string;
  employment_type?: string;
  headcount?: number;
  priority?: string;
  hiring_manager?: string;
  must_have_skills?: string[];
  good_to_have_skills?: string[];
  qualification?: string;
  min_years_experience?: number | null;
  industry?: string;
  ctc_budget?: string;
  description?: string;
  raw_jd_text?: string;
}

// GET: Fetch requisitions for the current user's organization or user
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const admin = createAdminClient();

    // Fetch user profile to know org and role
    let orgId: string | null = null;
    let isAdmin = false;
    let orgRole = "member";

    if (user) {
      const { data: profile } = await admin
        .from("profiles")
        .select("org_id, is_admin, org_role")
        .eq("id", user.id)
        .maybeSingle();

      if (profile) {
        orgId = profile.org_id || null;
        isAdmin = !!profile.is_admin;
        orgRole = profile.org_role || "member";
      }
    }

    // Query job_postings with applicant counts
    let query = admin
      .from("job_postings")
      .select("*, job_applications(*)")
      .order("created_at", { ascending: false });

    // If part of an org and not super admin, filter by org or creator
    if (orgId && !isAdmin) {
      query = query.or(`org_id.eq.${orgId},created_by.eq.${user?.id}`);
    }

    const { data: rawRequisitions, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Format requisitions with candidate metrics
    const requisitions = (rawRequisitions || []).map((req) => {
      const applications = Array.isArray(req.job_applications) ? req.job_applications : [];
      const totalApplications = applications.length;
      const hmReviewCandidates = applications.filter(
        (a: { status?: string }) => a.status === "hm_review" || a.status === "approved"
      );

      return {
        id: req.id,
        req_no: `R-${req.id.substring(0, 7).toUpperCase()}`,
        title: req.title,
        department: req.department || "General",
        location: req.location || "Remote",
        employment_type: req.employment_type || "full-time",
        headcount: 1,
        status: req.status === "published" ? "active" : req.status,
        raw_status: req.status,
        priority: "high",
        hiring_manager: req.company || "Hiring Lead",
        must_have_skills: req.must_have_skills || [],
        good_to_have_skills: req.good_to_have_skills || [],
        qualification: req.qualification,
        min_years_experience: req.min_years_experience,
        ctc_budget: req.ctc_budget,
        description: req.description,
        created_at: req.created_at,
        org_id: req.org_id,
        totalApplications,
        hmReviewCount: hmReviewCandidates.length,
        // Include full applications for recruiters
        applications: applications,
      };
    });

    return NextResponse.json({
      requisitions,
      userRole: isAdmin ? "platform_admin" : orgRole,
      orgId,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load requisitions." },
      { status: 500 }
    );
  }
}

// POST: Create a new requisition with License-aware routing
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const body: RequisitionInput = await request.json().catch(() => null);
    if (!body || !body.title?.trim()) {
      return NextResponse.json({ error: "Job title is required." }, { status: 400 });
    }

    const admin = createAdminClient();

    // 1. Determine user's license & organization tier
    let licenseType: "individual" | "organization" = "individual";
    let orgId: string | null = null;
    let companyName = body.department ? `${body.department} Team` : "AskShree Partner";

    if (user) {
      const { data: profile } = await admin
        .from("profiles")
        .select("org_id, company_name, is_admin")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.org_id) {
        orgId = profile.org_id;
        const { data: org } = await admin
          .from("organizations")
          .select("name, plan, status")
          .eq("id", profile.org_id)
          .maybeSingle();

        if (org) {
          companyName = org.name || companyName;
          // If org exists and plan is not explicitly solo individual, treat as organization license
          if (org.plan === "enterprise" || org.plan === "bulk" || org.plan === "organization") {
            licenseType = "organization";
          }
        }
      }
      if (profile?.company_name) {
        companyName = profile.company_name;
      }
    }

    // 2. License Routing Rule:
    // Individual Recruiter License -> 'published' (auto-publishes live to Guest Hub /jobs)
    // Organization License -> 'pending_approval' (flows to Org Admin approval queue)
    const initialStatus = licenseType === "individual" ? "published" : "pending_approval";

    const title = body.title.trim();
    const description = body.description?.trim() || body.raw_jd_text?.trim() || `${title} position.`;

    const { data: newPosting, error } = await admin
      .from("job_postings")
      .insert({
        title,
        department: body.department?.trim() || "Engineering",
        location: body.location?.trim() || "Remote",
        employment_type: body.employment_type || "full-time",
        company: companyName,
        must_have_skills: Array.isArray(body.must_have_skills) ? body.must_have_skills.slice(0, 5) : [],
        good_to_have_skills: Array.isArray(body.good_to_have_skills) ? body.good_to_have_skills.slice(0, 5) : [],
        qualification: body.qualification?.trim() || null,
        min_years_experience: typeof body.min_years_experience === "number" ? body.min_years_experience : null,
        industry: body.industry?.trim() || null,
        ctc_budget: body.ctc_budget?.trim() || null,
        description,
        raw_jd_text: body.raw_jd_text?.trim() || null,
        status: initialStatus,
        source: "recruiter_console",
        created_by: user?.id ?? null,
        org_id: orgId,
        terms_accepted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      requisition: newPosting,
      licenseType,
      status: initialStatus,
      message:
        licenseType === "individual"
          ? "Requisition created & auto-published to Guest Hub under Individual Recruiter License."
          : "Requisition created and queued for approval under Organization License.",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create requisition." },
      { status: 500 }
    );
  }
}
