import { NextResponse } from "next/server";
import { requireFeatureAccess } from "@/lib/supabase/requireAdmin";
import { evaluateCandidateWithShree } from "@/lib/agent/shreeOrchestrator";

const FEATURE_KEY = "Talent.ai";

export async function POST(req: Request) {
  let supabase, orgId;
  try {
    ({ supabase, orgId } = await requireFeatureAccess(FEATURE_KEY));
  } catch (res) {
    return res as Response;
  }

  const body = await req.json();
  const { candidateId } = body;

  if (!candidateId) {
    return NextResponse.json({ error: "candidateId is required." }, { status: 400 });
  }

  // Fetch candidate + requisition
  const { data: candidate, error: candErr } = await supabase
    .from("talent_candidates")
    .select("*, talent_requisitions(*)")
    .eq("id", candidateId)
    .single();

  if (candErr || !candidate) {
    return NextResponse.json({ error: "Candidate not found." }, { status: 404 });
  }

  const req_ = candidate.talent_requisitions as {
    id: string;
    org_id: string;
    title: string;
    description: string;
    eligibility_criteria?: Record<string, unknown>;
  } | null;

  if (!req_) {
    return NextResponse.json({ error: "Requisition not linked to candidate." }, { status: 400 });
  }

  // Use resume_text or summary as candidate text
  const resumeText = candidate.resume_text || candidate.summary || `Candidate: ${candidate.name}, ${candidate.current_designation || ""} at ${candidate.current_company || ""}. Key skills: ${(candidate.key_skills || []).join(", ")}. Experience: ${candidate.experience_years || 0} years.`;

  const result = await evaluateCandidateWithShree({
    candidateId: candidate.id,
    requisitionId: req_.id,
    orgId: orgId || req_.org_id,
    resumeText,
    requisitionTitle: req_.title,
    requisitionContext: req_.description || "",
    eligibilityCriteria: req_.eligibility_criteria,
  });

  return NextResponse.json(result);
}
