import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseResumeToCandidate, scoreCandidateFit } from "@/lib/talentAI";
import { evaluateCandidateWithShree } from "@/lib/agent/shreeOrchestrator";

export async function POST(req: Request) {
  const body = await req.json();
  const { requisitionId, name, email, phone, expectedSalary, resumeText } = body;

  if (!requisitionId || !name || !email) {
    return NextResponse.json({ error: "Missing required application fields." }, { status: 400 });
  }

  const admin = createAdminClient();

  // 1. Fetch requisition
  const { data: requisition } = await admin
    .from("talent_requisitions")
    .select("id, org_id, title, description, eligibility_criteria")
    .eq("id", requisitionId)
    .maybeSingle();

  const orgId = requisition?.org_id;

  // 2. Parse candidate resume if provided
  let currentCompany: string | null = null;
  let currentDesignation: string | null = null;
  let keySkills: string[] = [];
  let summary = "";
  let matchScore: number | null = null;

  if (resumeText) {
    try {
      const parsed = await parseResumeToCandidate(resumeText, requisition?.description);
      currentCompany = parsed.current_company;
      currentDesignation = parsed.current_designation;
      keySkills = parsed.key_skills || [];
      summary = parsed.summary || "";

      if (requisition?.description) {
        const fit = await scoreCandidateFit(resumeText, requisition.description);
        matchScore = fit.score;
      }
    } catch (err) {
      console.warn("Resume parsing skipped/failed:", err);
    }
  }

  const interviewToken = `int-${Math.random().toString(36).substring(2, 10)}`;

  // 3. Insert Candidate into talent_candidates
  // Notice: expected_ctc is stored; current_ctc is omitted per Pay Transparency rules!
  const { data: candidate, error: candError } = await admin
    .from("talent_candidates")
    .insert({
      org_id: orgId,
      requisition_id: requisitionId,
      name,
      email,
      phone: phone || null,
      stage: "applied",
      current_company: currentCompany,
      current_designation: currentDesignation,
      key_skills: keySkills,
      summary: summary || `Applicant for ${requisition?.title || "role"}.`,
      match_score: matchScore,
      expected_ctc: expectedSalary ? Number(expectedSalary.replace(/[^0-9]/g, "")) : null,
      interview_token: interviewToken,
    })
    .select()
    .single();

  if (candError) {
    console.error("Failed to insert candidate:", candError);
    return NextResponse.json({ error: candError.message }, { status: 500 });
  }

  // 4. Log standalone statutory consent
  await admin.from("consent_records").insert({
    candidate_id: candidate.id,
    email,
    scope: "ai_screening",
    granted: true,
    legal_text_hash: "sha256-consent-bipa-gdpr-2026",
  });

  // 5. Trigger Shree Blind Evaluation
  if (requisition && resumeText) {
    try {
      await evaluateCandidateWithShree({
        candidateId: candidate.id,
        requisitionId: requisition.id,
        orgId: orgId || "",
        resumeText,
        requisitionTitle: requisition.title,
        requisitionContext: requisition.description || "",
        eligibilityCriteria: requisition.eligibility_criteria as Record<string, unknown>,
      });
    } catch (evalErr) {
      console.error("Shree evaluation trigger error:", evalErr);
    }
  }

  return NextResponse.json({
    ok: true,
    candidateId: candidate.id,
    interviewToken,
  });
}
