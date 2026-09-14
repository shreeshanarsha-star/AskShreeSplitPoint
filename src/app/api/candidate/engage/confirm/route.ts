import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/talentRoles";

export async function POST(request: Request) {
  try {
    const admin = createAdminClient();
    const body = await request.json().catch(() => null);

    const token = body?.token || body?.candidateId;
    if (!token) {
      return NextResponse.json({ ok: false, error: "Missing engagement token or candidate ID." }, { status: 400 });
    }

    const candidateId = token.startsWith("eng-") ? token.replace("eng-", "") : token;

    // 1. Fetch Candidate
    const { data: candidate, error: candError } = await admin
      .from("talent_candidates")
      .select("id, name, stage, requisition_id, created_by")
      .eq("id", candidateId)
      .maybeSingle();

    if (candError || !candidate) {
      return NextResponse.json({ ok: false, error: "Candidate not found." }, { status: 404 });
    }

    // 2. Transition Stage to Applied (If not already advanced)
    let newStage = candidate.stage;
    if (candidate.stage === "sourced") {
      newStage = "applied";
      const { error: updateErr } = await admin
        .from("talent_candidates")
        .update({
          stage: "applied",
          updated_at: new Date().toISOString(),
        })
        .eq("id", candidate.id);

      if (updateErr) {
        return NextResponse.json({ ok: false, error: updateErr.message }, { status: 500 });
      }

      // 3. Log Audit Trail
      await logAudit({
        entityType: "talent_candidate",
        entityId: candidate.id,
        actorId: candidate.created_by,
        action: "candidate_outreach_confirmed",
        detail: {
          previousStage: "sourced",
          newStage: "applied",
          source: "outreach_link",
        },
      });
    }

    return NextResponse.json({
      ok: true,
      data: {
        candidateId: candidate.id,
        candidateName: candidate.name,
        stage: newStage,
        message: "Application confirmed! Your profile is now actively in review by the hiring team.",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
