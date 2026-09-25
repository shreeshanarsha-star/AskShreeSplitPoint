import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseResumeToCandidate, scoreCandidateFit } from "@/lib/talentAI";
import { evaluateCandidateWithShree } from "@/lib/agent/shreeOrchestrator";

// POST /api/public/quick-apply
//
// Phase 4 update: accepts a POSTING id (talent_job_postings.id) instead of
// a requisition id directly. Resolves posting -> requisition, enforces that
// the posting is published + askshree board. Also accepts a legacy
// requisitionId for backward compatibility with old callers.
//
// Writes to talent_people + talent_candidates at stage "applied".
// Duplicate protection: same email + same requisition = 409 with friendly msg.
// No fake match_score fallback — null until AI scoring runs.
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const {
    postingId,        // Phase 4: posting UUID (from home page selectedJob.id)
    requisitionId,    // Legacy / direct: requisition UUID
    name,
    email,
    phone,
    expectedSalary,
    resumeText,
    resumeBase64,
    resumeFileName,
  } = body as {
    postingId?: string;
    requisitionId?: string;
    name?: string;
    email?: string;
    phone?: string;
    expectedSalary?: string;
    resumeText?: string;
    resumeBase64?: string;
    resumeFileName?: string;
  };

  if (!name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
  }

  const admin = createAdminClient();

  // -------------------------------------------------------------------------
  // 1. Resolve requisition from posting id OR direct requisitionId.
  // -------------------------------------------------------------------------
  let resolvedRequisitionId: string | null = null;

  // Applications are only accepted for requisitions that currently have a
  // PUBLISHED AskShree posting. Never accept applications straight against a
  // draft, pending-approval, closed or confidential-internal requisition.
  {
    let q = admin
      .from("talent_job_postings")
      .select("id, requisition_id, status, board")
      .eq("board", "askshree")
      .eq("status", "published");
    if (postingId) q = q.eq("id", postingId);
    else if (requisitionId) q = q.eq("requisition_id", requisitionId);
    else {
      return NextResponse.json({ error: "Missing postingId or requisitionId." }, { status: 400 });
    }
    const { data: p, error: pErr } = await q.limit(1).maybeSingle();
    if (pErr || !p) {
      return NextResponse.json(
        { error: "This job posting is no longer accepting applications." },
        { status: 410 }
      );
    }
    resolvedRequisitionId = (p as unknown as { requisition_id: string }).requisition_id;
  }

  // -------------------------------------------------------------------------
  // 2. Fetch the requisition.
  // -------------------------------------------------------------------------
  const { data: requisition } = await admin
    .from("talent_requisitions")
    .select("id, org_id, title, description, eligibility_criteria, created_by")
    .eq("id", resolvedRequisitionId)
    .maybeSingle();

  if (!requisition) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  const orgId: string | null = (requisition as unknown as { org_id: string | null }).org_id;
  const createdBy: string | null = (requisition as unknown as { created_by: string | null }).created_by;

  // -------------------------------------------------------------------------
  // 3. Duplicate protection: same email + same requisition.
  // -------------------------------------------------------------------------
  const { data: existing } = await admin
    .from("talent_candidates")
    .select("id")
    .eq("requisition_id", resolvedRequisitionId)
    .ilike("email", email.trim())
    .limit(1)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      {
        ok: false,
        duplicate: true,
        message:
          "You've already applied to this role. Our team will review your application and be in touch.",
      },
      { status: 409 }
    );
  }

  // -------------------------------------------------------------------------
  // 4. Parse resume + AI scoring (null on failure — no fake fallback).
  // -------------------------------------------------------------------------
  let currentCompany: string | null = null;
  let currentDesignation: string | null = null;
  let keySkills: string[] = [];
  let matchScore: number | null = null; // null = "Not scored yet"; no fallback 82

  if (resumeText) {
    try {
      const parsed = await parseResumeToCandidate(
        resumeText,
        (requisition as unknown as { description: string | null }).description ?? undefined
      );
      currentCompany = parsed.current_company;
      currentDesignation = parsed.current_designation;
      keySkills = parsed.key_skills || [];

      if ((requisition as unknown as { description: string | null }).description) {
        const fit = await scoreCandidateFit(
          resumeText,
          (requisition as unknown as { description: string }).description
        );
        matchScore = fit.score ?? null;
      }
    } catch (err) {
      console.warn("Resume parsing / scoring skipped:", err);
      // matchScore stays null — shown as "Not scored yet" in the UI.
    }
  }

  const interviewToken = `int-${Math.random().toString(36).substring(2, 10)}`;

  // -------------------------------------------------------------------------
  // 4b. Store the actual resume file (if the candidate uploaded one) so
  // recruiters can view/download it later. Non-blocking — a failure here
  // must never block the application itself.
  // -------------------------------------------------------------------------
  let resumeFilePath: string | null = null;
  let resumeFileNameSafe: string | null = null;
  if (resumeBase64) {
    try {
      const buffer = Buffer.from(resumeBase64, "base64");
      const ext = resumeFileName?.split(".").pop()?.toLowerCase() || "pdf";
      resumeFilePath = `resumes/${Date.now()}-${email.trim().replace(/[^a-zA-Z0-9]/g, "_")}.${ext}`;
      const { error: uploadErr } = await admin.storage
        .from("resumes")
        .upload(resumeFilePath, buffer, { upsert: true });
      if (uploadErr) {
        console.warn("Resume upload warning:", uploadErr.message);
        resumeFilePath = null;
      } else {
        resumeFileNameSafe = resumeFileName || null;
      }
    } catch (err) {
      console.warn("Resume upload skipped:", err);
      resumeFilePath = null;
    }
  }

  // -------------------------------------------------------------------------
  // 5. Find or create person identity in talent_people.
  // -------------------------------------------------------------------------
  let personId: string | null = null;
  const normalizedEmail = email.trim().toLowerCase();

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
          name: name.trim(),
          email: normalizedEmail,
          phone: phone?.trim() || null,
          resume_text: resumeText || null,
          source: "Quick Apply",
          current_company: currentCompany,
          created_by: createdBy,
        })
        .select("id")
        .single();
      if (newPerson) personId = (newPerson as unknown as { id: string }).id;
    } catch (pErr) {
      console.warn("talent_people insert warning:", pErr);
    }
  }

  // -------------------------------------------------------------------------
  // 6. Insert into talent_candidates.
  // -------------------------------------------------------------------------
  const { data: candidate, error: candError } = await admin
    .from("talent_candidates")
    .insert({
      requisition_id: resolvedRequisitionId,
      person_id: personId || null,
      name: name.trim(),
      email: normalizedEmail,
      phone: phone?.trim() || null,
      stage: "applied",
      current_company: currentCompany,
      resume_text: resumeText || null,
      resume_file_path: resumeFilePath,
      resume_file_name: resumeFileNameSafe,
      source: "Quick Apply",
      tags: keySkills.length ? keySkills : (currentDesignation ? [currentDesignation] : []),
      match_score: matchScore, // null = not scored yet; no fake 82 fallback
      expected_ctc: expectedSalary
        ? Number(expectedSalary.replace(/[^0-9]/g, "")) || null
        : null,
      created_by: createdBy,
    })
    .select()
    .single();

  if (candError) {
    console.error("Failed to insert candidate:", candError);
    return NextResponse.json({ error: candError.message }, { status: 500 });
  }

  // -------------------------------------------------------------------------
  // 7. Consent record (best effort, non-blocking).
  // -------------------------------------------------------------------------
  try {
    await admin.from("consent_records").insert({
      candidate_id: (candidate as unknown as { id: string }).id,
      email: normalizedEmail,
      scope: "ai_screening",
      granted: true,
      legal_text_hash: "sha256-consent-bipa-gdpr-2026",
    });
  } catch (consentErr) {
    console.warn("Consent record warning:", consentErr);
  }

  // -------------------------------------------------------------------------
  // 8. Trigger Shree evaluation (async, non-blocking).
  // -------------------------------------------------------------------------
  if (resumeText) {
    try {
      await evaluateCandidateWithShree({
        candidateId: (candidate as unknown as { id: string }).id,
        requisitionId: resolvedRequisitionId,
        orgId: orgId || "",
        resumeText,
        requisitionTitle: (requisition as unknown as { title: string }).title,
        requisitionContext: (requisition as unknown as { description: string | null }).description || "",
        eligibilityCriteria: (requisition as unknown as { eligibility_criteria: Record<string, unknown> }).eligibility_criteria as Record<string, unknown>,
      });
    } catch (evalErr) {
      console.error("Shree evaluation trigger error:", evalErr);
    }
  }

  return NextResponse.json({
    ok: true,
    candidateId: (candidate as unknown as { id: string }).id,
    interviewToken,
    // match_score is null until async scoring completes; UI shows "Not scored yet".
  });
}