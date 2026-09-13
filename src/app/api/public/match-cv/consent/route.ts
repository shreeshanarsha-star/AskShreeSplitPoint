import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
    }

    const { candidate, resumeText, fileName, fileBase64, consentGranted } = body;

    if (!consentGranted) {
      return NextResponse.json({
        ok: true,
        consentGranted: false,
        message: "Understood. Your CV has not been stored in our system.",
      });
    }

    const admin = createAdminClient();
    let resumePath: string | null = null;

    // Upload resume to Supabase storage if file is provided
    if (fileBase64) {
      try {
        const buffer = Buffer.from(fileBase64, "base64");
        const safeName = (fileName || "resume.pdf").replace(/[^a-zA-Z0-9.\-_]/g, "_");
        resumePath = `talent-pool/${Date.now()}-${safeName}`;
        await admin.storage
          .from("resumes")
          .upload(resumePath, buffer, {
            contentType: "application/pdf",
            upsert: false,
          });
      } catch (uploadErr) {
        console.warn("Could not upload resume to storage bucket:", uploadErr);
      }
    }

    // Deduplicate candidate by email or phone if available
    let candidateId: string | null = null;
    if (candidate?.email || candidate?.phone) {
      const orFilters: string[] = [];
      if (candidate.email) orFilters.push(`email.eq.${candidate.email}`);
      if (candidate.phone) orFilters.push(`phone.eq.${candidate.phone}`);
      const { data: existing } = await admin
        .from("apply_candidates")
        .select("id")
        .or(orFilters.join(","))
        .limit(1);

      if (existing && existing.length > 0) {
        candidateId = existing[0].id;
        await admin
          .from("apply_candidates")
          .update({
            resume_text: resumeText || undefined,
            resume_path: resumePath || undefined,
            skills: candidate.skills || [],
            years_experience: candidate.years_experience ?? undefined,
            source: "homepage_cv_drop_talent_pool",
            terms_accepted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", candidateId);
      }
    }

    if (!candidateId) {
      const { data: newCand, error: insertErr } = await admin
        .from("apply_candidates")
        .insert({
          name: candidate?.name || "Candidate",
          email: candidate?.email || null,
          phone: candidate?.phone || null,
          location: candidate?.location || null,
          years_experience: candidate?.years_experience || null,
          skills: candidate?.skills || [],
          resume_text: resumeText || "",
          resume_path: resumePath,
          source: "homepage_cv_drop_talent_pool",
          whatsapp_opt_in: false,
          terms_accepted_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (!insertErr && newCand) {
        candidateId = newCand.id;
      }
    }

    // Statutory audit logging for candidate consent
    if (candidateId) {
      try {
        await admin
          .from("consent_records")
          .insert({
            candidate_id: candidateId,
            email: candidate?.email || "talent_pool@askshree.com",
            scope: "talent_pool_future_openings",
            granted: true,
            legal_text_hash: "sha256-consent-talent-pool-2026",
          });
      } catch (err: unknown) {
        console.warn("Could not log consent record:", err);
      }
    }

    return NextResponse.json({
      ok: true,
      consentGranted: true,
      candidateId,
      message:
        "Consent recorded successfully! Your CV is securely registered in our talent pool. We will reach out when an aligned role opens.",
    });
  } catch (error: unknown) {
    console.error("Error in consent route:", error);
    const message = error instanceof Error ? error.message : "Failed to record consent.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
