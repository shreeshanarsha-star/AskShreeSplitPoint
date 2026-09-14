import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/talentRoles";

type IngestPayload = {
  requisitionId?: string | null;
  candidate: {
    name: string;
    headline?: string | null;
    company?: string | null;
    location?: string | null;
    profileUrl?: string | null;
    email?: string | null;
    phone?: string | null;
    skills?: string[] | null;
    experienceYears?: number | null;
    summary?: string | null;
  };
  source?: string | null;
  triggerAiEvaluation?: boolean;
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-AskShree-Source",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function POST(request: Request) {
  try {
    const admin = createAdminClient();
    const body = (await request.json().catch(() => null)) as IngestPayload | null;

    if (!body || !body.candidate || !body.candidate.name?.trim()) {
      return NextResponse.json(
        { ok: false, error: "Candidate name is required." },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const { candidate } = body;
    const rawSource = (body.source || "").trim();
    // Default source attribution
    const source = rawSource || "LinkedIn Extension";

    // 1. Resolve Auth / Actor Identity
    let actorId: string | null = null;
    let callerOrgId: string | null = null;

    // Check Supabase Auth Bearer Header if present
    const authHeader = request.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "").trim();
      const { data: { user } } = await admin.auth.getUser(token);
      if (user) {
        actorId = user.id;
        const { data: profile } = await admin
          .from("profiles")
          .select("org_id")
          .eq("id", user.id)
          .maybeSingle();
        callerOrgId = profile?.org_id || null;
      }
    }

    // Check active web session if Bearer wasn't provided
    if (!actorId) {
      try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          actorId = user.id;
          const { data: profile } = await admin
            .from("profiles")
            .select("org_id")
            .eq("id", user.id)
            .maybeSingle();
          callerOrgId = profile?.org_id || null;
        }
      } catch {
        // Continue with fallback resolution
      }
    }

    // 2. Resolve Requisition
    let requisitionId = body.requisitionId;
    let targetRequisition: { id: string; req_no: string; title: string; org_id: string | null; created_by: string } | null = null;

    if (requisitionId) {
      const { data: req } = await admin
        .from("talent_requisitions")
        .select("id, req_no, title, org_id, created_by")
        .eq("id", requisitionId)
        .maybeSingle();
      if (req) {
        targetRequisition = req;
      }
    }

    // Fallback: If no requisition was passed or not found, pick the latest open requisition
    if (!targetRequisition) {
      let query = admin
        .from("talent_requisitions")
        .select("id, req_no, title, org_id, created_by")
        .in("status", ["open", "approved", "active", "published"])
        .order("created_at", { ascending: false })
        .limit(1);

      if (callerOrgId) {
        query = query.eq("org_id", callerOrgId);
      }

      const { data: fallbackReqs } = await query;
      if (fallbackReqs && fallbackReqs.length > 0) {
        targetRequisition = fallbackReqs[0];
        requisitionId = targetRequisition.id;
      }
    }

    if (!targetRequisition || !requisitionId) {
      return NextResponse.json(
        { ok: false, error: "No active requisition found to file candidate into. Please select a valid requisition." },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Determine safe created_by UUID (Mandatory NOT NULL column in talent_candidates & talent_people)
    let createdBy = actorId || targetRequisition.created_by;
    if (!createdBy) {
      const { data: adminProfile } = await admin.from("profiles").select("id").limit(1).maybeSingle();
      createdBy = adminProfile?.id || null;
    }

    if (!createdBy) {
      return NextResponse.json(
        { ok: false, error: "Unable to establish valid creator context for candidate record." },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    const orgId = callerOrgId || targetRequisition.org_id;

    // 3. Resolve / Deduplicate Person in talent_people
    let personId: string | null = null;
    const profileUrl = candidate.profileUrl?.trim() || null;
    const candidateEmail = candidate.email?.trim() || null;

    if (profileUrl) {
      const { data: existingPersonByUrl } = await admin
        .from("talent_people")
        .select("id")
        .eq("linkedin_url", profileUrl)
        .limit(1)
        .maybeSingle();
      if (existingPersonByUrl) {
        personId = existingPersonByUrl.id;
      }
    }

    if (!personId && candidateEmail) {
      const { data: existingPersonByEmail } = await admin
        .from("talent_people")
        .select("id")
        .ilike("email", candidateEmail)
        .limit(1)
        .maybeSingle();
      if (existingPersonByEmail) {
        personId = existingPersonByEmail.id;
      }
    }

    if (!personId) {
      try {
        const { data: newPerson, error: personErr } = await admin
          .from("talent_people")
          .insert({
            org_id: orgId,
            name: candidate.name.trim(),
            email: candidateEmail,
            phone: candidate.phone?.trim() || null,
            current_company: candidate.company?.trim() || null,
            current_location: candidate.location?.trim() || null,
            linkedin_url: profileUrl,
            experience_years: candidate.experienceYears || null,
            source,
            created_by: createdBy,
          })
          .select("id")
          .single();

        if (newPerson) personId = newPerson.id;
        if (personErr) console.warn("talent_people insert warning:", personErr.message);
      } catch (err) {
        console.warn("talent_people exception:", err);
      }
    }

    // 4. Duplicate Check in talent_candidates for this Requisition
    let existingCandidateQuery = admin
      .from("talent_candidates")
      .select("id, name, stage, match_score")
      .eq("requisition_id", requisitionId);

    if (personId) {
      existingCandidateQuery = existingCandidateQuery.eq("person_id", personId);
    } else if (profileUrl) {
      existingCandidateQuery = existingCandidateQuery.eq("linkedin_url", profileUrl);
    } else if (candidateEmail) {
      existingCandidateQuery = existingCandidateQuery.ilike("email", candidateEmail);
    }

    const { data: existingCandidate } = await existingCandidateQuery.limit(1).maybeSingle();

    if (existingCandidate) {
      return NextResponse.json(
        {
          ok: true,
          data: {
            candidateId: existingCandidate.id,
            personId,
            requisitionId,
            status: existingCandidate.stage,
            source,
            matchScore: existingCandidate.match_score,
            isDuplicate: true,
            message: `${candidate.name} is already in the pipeline for ${targetRequisition.title} (${existingCandidate.stage}).`,
          },
        },
        { status: 200, headers: CORS_HEADERS }
      );
    }

    // 5. Intelligent Match Scoring
    const skillsList = Array.isArray(candidate.skills) ? candidate.skills : [];
    let matchScore = 85; // Baseline high fit for targeted sourcing
    const reqTitleLower = targetRequisition.title.toLowerCase();
    const headlineLower = (candidate.headline || "").toLowerCase();

    // Bonus points for direct domain keyword match in headline
    const domainKeywords = reqTitleLower.split(/[\s,/]+/).filter((w) => w.length > 2);
    let matchedKeywords = 0;
    for (const kw of domainKeywords) {
      if (headlineLower.includes(kw) || skillsList.some((s) => s.toLowerCase().includes(kw))) {
        matchedKeywords++;
      }
    }
    if (matchedKeywords >= 2) matchScore = Math.min(96, 85 + matchedKeywords * 4);
    else if (matchedKeywords === 0) matchScore = 78;

    // 6. Build Candidate Resume Text & Tags
    const resumeParts = [
      candidate.headline ? `Headline: ${candidate.headline}` : "",
      candidate.company ? `Current Company: ${candidate.company}` : "",
      candidate.location ? `Location: ${candidate.location}` : "",
      candidate.summary ? `Summary:\n${candidate.summary}` : "",
      skillsList.length ? `Skills: ${skillsList.join(", ")}` : "",
      profileUrl ? `Profile: ${profileUrl}` : "",
    ].filter(Boolean);
    const resumeText = resumeParts.join("\n\n");

    const tags = skillsList.length ? skillsList.slice(0, 10) : candidate.headline ? [candidate.headline.slice(0, 40)] : [];

    // 7. Insert Candidate into talent_candidates
    // STRICT RULE: stage is "sourced" (Only "applied" when candidate clicks link & confirms)
    const { data: newCandidate, error: candError } = await admin
      .from("talent_candidates")
      .insert({
        requisition_id: requisitionId,
        person_id: personId,
        name: candidate.name.trim(),
        email: candidateEmail,
        phone: candidate.phone?.trim() || null,
        current_company: candidate.company?.trim() || null,
        current_location: candidate.location?.trim() || null,
        linkedin_url: profileUrl,
        experience_years: candidate.experienceYears || null,
        resume_text: resumeText || null,
        tags,
        source,
        stage: "sourced", // STRICT REQUIREMENT
        match_score: matchScore,
        created_by: createdBy,
      })
      .select("id, name, stage, match_score, created_at")
      .single();

    if (candError || !newCandidate) {
      return NextResponse.json(
        { ok: false, error: candError?.message || "Failed to insert candidate." },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    // 8. Log Audit Event
    await logAudit({
      entityType: "talent_candidate",
      entityId: newCandidate.id,
      actorId: actorId || createdBy,
      action: "candidate_sourced_external",
      detail: {
        source,
        requisitionId,
        reqNo: targetRequisition.req_no,
        profileUrl,
        matchScore,
      },
      orgId,
    });

    return NextResponse.json(
      {
        ok: true,
        data: {
          candidateId: newCandidate.id,
          personId,
          requisitionId,
          status: "sourced",
          source,
          matchScore: newCandidate.match_score,
          isDuplicate: false,
          message: `Successfully sourced ${candidate.name} into ${targetRequisition.title} under Sourced stage.`,
        },
      },
      { status: 201, headers: CORS_HEADERS }
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
