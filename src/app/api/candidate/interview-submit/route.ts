import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { evaluateCandidateWithShree } from "@/lib/agent/shreeOrchestrator";

export async function POST(req: Request) {
  const body = await req.json();
  const { token, transcript, answers } = body;

  if (!transcript) {
    return NextResponse.json({ error: "No transcript provided." }, { status: 400 });
  }

  const admin = createAdminClient();

  // Find candidate by token or fallback to most recent applied candidate
  let candidateQuery = admin
    .from("talent_candidates")
    .select("*, talent_requisitions(*)");

  if (token && token !== "demo") {
    candidateQuery = candidateQuery.eq("interview_token", token);
  } else {
    candidateQuery = candidateQuery.order("created_at", { ascending: false }).limit(1);
  }

  const { data: candidates, error: findErr } = await candidateQuery;
  const candidate = candidates?.[0];

  if (!candidate) {
    return NextResponse.json({ ok: true, note: "Demo session recorded." });
  }

  const req_ = candidate.talent_requisitions as {
    id: string;
    org_id: string;
    title: string;
    description: string;
    eligibility_criteria?: Record<string, unknown>;
  } | null;

  if (req_) {
    // Run Shree evaluation with the interview transcript as the primary source!
    await evaluateCandidateWithShree({
      candidateId: candidate.id,
      requisitionId: req_.id,
      orgId: req_.org_id,
      resumeText: `INTERVIEW TRANSCRIPT:\n${transcript}\n\nORIGINAL PROFILE SUMMARY:\n${candidate.summary || ""}`,
      requisitionTitle: req_.title,
      requisitionContext: req_.description || "",
      eligibilityCriteria: req_.eligibility_criteria,
    });
  }

  return NextResponse.json({ ok: true });
}
