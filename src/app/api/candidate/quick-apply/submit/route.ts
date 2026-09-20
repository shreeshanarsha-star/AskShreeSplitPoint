import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { screenCandidate } from "@/lib/jobPostings/screen";

export const maxDuration = 60;

// POST /api/candidate/quick-apply/submit
//
// Phase 4: resolves postingId -> requisitionId (or accepts direct requisitionId).
// Writes to talent_people + talent_candidates at stage "applied".
// Duplicate protection: same email + same requisition = 409.
// No fake match_score = 82 fallback; null until scoring runs.
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid application payload." }, { status: 400 });
    }

    const {
      jobPostingId, // May be a talent_job_postings.id (Phase 4) or legacy job_postings.id
      fullName,
      email,
      phone,
      location,
      presentSalary,
      noticePeriod,
      qualification,
      currentOrganization,
      switchingReason,
      resumeText,
      resumeBase64,
      fileName,
    } = body as {
      jobPostingId?: string;
      fullName?: string;
      email?: string;
      phone?: string;
      location?: string;
      presentSalary?: string;
      noticePeriod?: string;
      qualification?: string;
      currentOrganization?: string;
      switchingReason?: string;
      resumeText?: string;
      resumeBase64?: string;
      fileName?: string;
    };

    if (!jobPostingId) {
      return NextResponse.json({ error: "Posting or requisition ID is required." }, { status: 400 });
    }
    if (!fullName?.trim() || !email?.trim()) {
      return NextResponse.json({ error: "Full name and email are required." }, { status: 400 });
    }

    const admin = createAdminClient();
    const normalizedEmail = email.trim().toLowerCase();

    // -----------------------------------------------------------------------
    // 1. Resolve to a talent_requisitions row.
    // Try talent_job_postings first, then talent_requisitions direct, then
    // fall back to legacy job_postings for backward compatibility.
    // -----------------------------------------------------------------------
    let resolvedRequisitionId: string | null = null;
    let resolvedPostingId: string | null = null;
    let requisitionTitle = "";
    let requisitionMustHaveSkills: string[] = [];
    let requisitionGoodToHaveSkills: string[] = [];
    let requisitionQualification: string | null = null;
    let requisitionMinExp: number | null = null;
    let orgId: string | null = null;
    let createdBy: string | null = null;

    // Try ATS posting
    try {
      const { data: p } = await admin
        .from("talent_job_postings")
        .select("id, requisition_id, status, board")
        .eq("id", jobPostingId)
        .maybeSingle();

      if (p) {
        const pt = p as unknown as { id: string; requisition_id: string; status: string; board: string };
        if (pt.status !== "published" || pt.board !== "askshree") {
          return NextResponse.json({ error: "This posting is no longer accepting applications." }, { status: 410 });
        }
        resolvedRequisitionId = pt.requisition_id;
        resolvedPostingId = pt.id;
      }
    } catch { /* table not yet created */ }

    // Try direct talent_requisitions
    if (!resolvedRequisitionId) {
      const { data: req } = await admin
        .from("talent_requisitions")
        .select("id, title, org_id, eligibility_criteria, created_by")
        .eq("id", jobPostingId)
        .maybeSingle();

      if (req) {
        const rt = req as unknown as {
          id: string; title: string; org_id: string | null;
          eligibility_criteria: { must_have_skills?: string[]; good_to_have_skills?: string[] } | null;
          created_by: string | null;
        };
        resolvedRequisitionId = rt.id;
        requisitionTitle = rt.title;
        orgId = rt.org_id;
        createdBy = rt.created_by;
        requisitionMustHaveSkills = rt.eligibility_criteria?.must_have_skills ?? [];
        requisitionGoodToHaveSkills = rt.eligibility_criteria?.good_to_have_skills ?? [];
      }
    }

    // Fetch full requisition details if resolved via posting
    if (resolvedRequisitionId && !requisitionTitle) {
      const { data: req } = await admin
        .from("talent_requisitions")
        .select("id, title, org_id, eligibility_criteria, created_by")
        .eq("id", resolvedRequisitionId)
        .maybeSingle();

      if (req) {
        const rt = req as unknown as {
          id: string; title: string; org_id: string | null;
          eligibility_criteria: { must_have_skills?: string[]; good_to_have_skills?: string[] } | null;
          created_by: string | null;
        };
        requisitionTitle = rt.title;
        orgId = rt.org_id;
        createdBy = rt.created_by;
        requisitionMustHaveSkills = rt.eligibility_criteria?.must_have_skills ?? [];
        requisitionGoodToHaveSkills = rt.eligibility_criteria?.good_to_have_skills ?? [];
      }
    }

    // Legacy job_postings fallback (write to job_applications, not talent_candidates)
    if (!resolvedRequisitionId) {
      const { data: legacyJob } = await admin
        .from("job_postings")
        .select("id, title, company, must_have_skills, good_to_have_skills, qualification, min_years_experience")
        .eq("id", jobPostingId)
        .maybeSingle();

      if (!legacyJob) {
        return NextResponse.json({ error: "Job not found." }, { status: 404 });
      }

      // Legacy path: write to job_applications (old table, not retired yet).
      const lj = legacyJob as unknown as {
        id: string; title: string; company: string | null;
        must_have_skills: string[] | null; good_to_have_skills: string[] | null;
        qualification: string | null; min_years_experience: number | null;
      };
      const fullCvText = resumeText?.trim() || `Candidate: ${fullName}\nEmail: ${email}`;

      let matchResult = {
        match_score: null as number | null, // No fake 82 fallback
        matched_skills: [] as string[],
        missing_skills: [] as string[],
        evidence: "",
        cover_note: "",
      };

      try {
        matchResult = await screenCandidate(
          {
            title: lj.title,
            company: lj.company ?? null,
            must_have_skills: lj.must_have_skills ?? [],
            good_to_have_skills: lj.good_to_have_skills ?? [],
            qualification: lj.qualification ?? null,
            min_years_experience: lj.min_years_experience ?? null,
          },
          fullCvText
        );
      } catch (err) {
        console.warn("AI screening fallback — null score:", err);
      }

      let resumePath = `quick-apply/${Date.now()}-${(fullName || "resume").replace(/[^a-zA-Z0-9]/g, "_")}.txt`;
      if (resumeBase64) {
        try {
          const buffer = Buffer.from(resumeBase64, "base64");
          const ext = fileName?.split(".").pop() || "pdf";
          resumePath = `resumes/${Date.now()}-${(fullName || "cand").replace(/[^a-zA-Z0-9]/g, "_")}.${ext}`;
          await admin.storage.from("resumes").upload(resumePath, buffer, { upsert: true });
        } catch { /* non-blocking */ }
      }

      const { data: application, error: appError } = await admin
        .from("job_applications")
        .insert({
          job_posting_id: jobPostingId,
          candidate_name: fullName.trim(),
          candidate_email: normalizedEmail,
          candidate_phone: phone?.trim() || null,
          cover_note: switchingReason?.trim() || null,
          resume_path: resumePath,
          status: "pending_approval",
          match_score: matchResult.match_score, // null = not scored yet
          matched_skills: matchResult.matched_skills,
          missing_skills: matchResult.missing_skills,
          ai_evidence: JSON.stringify({ fullName, phone, email, location, presentSalary, noticePeriod, qualification, currentOrganization, switchingReason }),
          ai_cover_note: matchResult.cover_note,
          applied_via: "quick_apply",
        })
        .select()
        .single();

      if (appError) {
        return NextResponse.json({ error: appError.message }, { status: 500 });
      }

      // Upsert apply_candidates (legacy candidate tracker)
      try {
        await admin.from("apply_candidates").upsert(
          { name: fullName.trim(), email: normalizedEmail, phone: phone?.trim() || null, location: location?.trim() || null, resume_text: fullCvText.slice(0, 10000), source: "quick_apply", terms_accepted_at: new Date().toISOString() },
          { onConflict: "email" }
        );
      } catch { /* non-blocking */ }

      return NextResponse.json({
        ok: true,
        applicationId: (application as unknown as { id: string }).id,
        matchScore: matchResult.match_score,
        matchedSkills: matchResult.matched_skills,
        missingSkills: matchResult.missing_skills,
        message: "Application submitted successfully!",
      });
    }

    // -----------------------------------------------------------------------
    // 2. ATS path: write to talent_people + talent_candidates.
    // -----------------------------------------------------------------------

    // Duplicate protection
    const { data: dupCheck } = await admin
      .from("talent_candidates")
      .select("id")
      .eq("requisition_id", resolvedRequisitionId)
      .ilike("email", normalizedEmail)
      .limit(1)
      .maybeSingle();

    if (dupCheck) {
      return NextResponse.json(
        {
          ok: false,
          duplicate: true,
          message: "You've already applied to this role. Our team will be in touch.",
        },
        { status: 409 }
      );
    }

    // AI screening — null on failure, NO fake 82 fallback.
    const fullCvText = resumeText?.trim() ||
      `Candidate: ${fullName}\nEmail: ${email}\nOrg: ${currentOrganization || ""}\nQualification: ${qualification || ""}`;

    let matchScore: number | null = null;
    let matchedSkills: string[] = [];
    let missingSkills: string[] = [];

    try {
      const result = await screenCandidate(
        {
          title: requisitionTitle,
          company: null,
          must_have_skills: requisitionMustHaveSkills,
          good_to_have_skills: requisitionGoodToHaveSkills,
          qualification: requisitionQualification,
          min_years_experience: requisitionMinExp,
        },
        fullCvText
      );
      matchScore = result.match_score ?? null;
      matchedSkills = result.matched_skills || [];
      missingSkills = result.missing_skills || [];
    } catch (err) {
      console.warn("AI screening null — no fallback score:", err);
    }

    // Resume upload
    let resumePath: string | null = null;
    if (resumeBase64) {
      try {
        const buffer = Buffer.from(resumeBase64, "base64");
        const ext = fileName?.split(".").pop() || "pdf";
        resumePath = `resumes/${Date.now()}-${(fullName || "cand").replace(/[^a-zA-Z0-9]/g, "_")}.${ext}`;
        await admin.storage.from("resumes").upload(resumePath, buffer, { upsert: true });
      } catch { /* non-blocking */ }
    }

    // Find or create talent_people record
    let personId: string | null = null;
    const { data: existingPerson } = await admin
      .from("talent_people")
      .select("id")
      .ilike("email", normalizedEmail)
      .limit(1)
      .maybeSingle();

    if (existingPerson) {
      personId = (existingPerson as unknown as { id: string }).id;
    } else {
      try {
        const { data: newPerson } = await admin
          .from("talent_people")
          .insert({
            org_id: orgId,
            name: fullName.trim(),
            email: normalizedEmail,
            phone: phone?.trim() || null,
            resume_text: resumeText || null,
            source: "Quick Apply",
            current_company: currentOrganization || null,
            created_by: createdBy,
          })
          .select("id")
          .single();
        if (newPerson) personId = (newPerson as unknown as { id: string }).id;
      } catch (pErr) {
        console.warn("talent_people insert warning:", pErr);
      }
    }

    // Insert talent_candidates
    const { data: candidate, error: candError } = await admin
      .from("talent_candidates")
      .insert({
        requisition_id: resolvedRequisitionId,
        person_id: personId || null,
        name: fullName.trim(),
        email: normalizedEmail,
        phone: phone?.trim() || null,
        stage: "applied",
        current_company: currentOrganization || null,
        current_location: location || null,
        notice_period: noticePeriod || null,
        qualification: qualification || null,
        resume_text: resumeText || null,
        resume_file_name: fileName || null,
        source: "Quick Apply",
        match_score: matchScore,
        met_must_have_skills: matchedSkills,
        missing_must_have_skills: missingSkills,
        expected_ctc: presentSalary
          ? Number(presentSalary.replace(/[^0-9]/g, "")) || null
          : null,
        created_by: createdBy,
      })
      .select()
      .single();

    if (candError) {
      return NextResponse.json({ error: candError.message }, { status: 500 });
    }

    const candidateId = (candidate as unknown as { id: string }).id;

    // Consent record
    try {
      await admin.from("consent_records").insert({
        candidate_id: candidateId,
        email: normalizedEmail,
        scope: "ai_screening",
        granted: true,
        legal_text_hash: "sha256-consent-bipa-gdpr-2026",
      });
    } catch { /* non-blocking */ }

    // Legacy upsert for apply_candidates tracker
    try {
      await admin.from("apply_candidates").upsert(
        { name: fullName.trim(), email: normalizedEmail, phone: phone?.trim() || null, location: location?.trim() || null, resume_text: fullCvText.slice(0, 10000), source: "quick_apply", terms_accepted_at: new Date().toISOString() },
        { onConflict: "email" }
      );
    } catch { /* non-blocking */ }

    return NextResponse.json({
      ok: true,
      applicationId: candidateId,
      matchScore: matchScore, // null = "Not scored yet"
      matchedSkills,
      missingSkills,
      message: "Application submitted successfully! Our team will review and be in touch.",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to submit application." },
      { status: 500 }
    );
  }
}