import { NextResponse } from "next/server";
import { requireFeatureAccess } from "@/lib/supabase/requireAdmin";
import { resolveShreeDecision } from "@/lib/agent/shreeOrchestrator";

const FEATURE_KEY = "Talent.ai";

export async function GET(req: Request) {
  let supabase, orgId, isAdmin;
  try {
    ({ supabase, orgId, isAdmin } = await requireFeatureAccess(FEATURE_KEY));
  } catch (res) {
    return res as Response;
  }

  const { searchParams } = new URL(req.url);
  const requisitionId = searchParams.get("requisitionId");
  const status = searchParams.get("status") || "pending"; // 'pending' | 'resolved' | 'all'

  let query = supabase
    .from("shree_decisions")
    .select(`
      id,
      org_id,
      requisition_id,
      candidate_id,
      action_type,
      target_stage,
      shree_reasoning,
      citations,
      shree_confidence,
      human_decision,
      human_feedback,
      graduated_at_execution,
      created_at,
      resolved_at,
      talent_candidates (
        id,
        name,
        stage,
        match_score,
        current_designation,
        current_company,
        current_location,
        anonymized_id
      ),
      talent_requisitions (
        id,
        req_no,
        title
      )
    `)
    .order("created_at", { ascending: false });

  if (requisitionId) {
    query = query.eq("requisition_id", requisitionId);
  }
  if (!isAdmin && orgId) {
    query = query.eq("org_id", orgId);
  }
  if (status !== "all") {
    if (status === "pending") {
      query = query.eq("human_decision", "pending");
    } else {
      query = query.neq("human_decision", "pending");
    }
  }

  const { data: decisions, error } = await query.limit(50);
  if (error) {
    console.warn("[shree/decisions] query error (using fallback):", error.message);
    return NextResponse.json({ decisions: [] });
  }

  return NextResponse.json({ decisions: decisions || [] });
}

export async function POST(req: Request) {
  try {
    await requireFeatureAccess(FEATURE_KEY);
  } catch (res) {
    return res as Response;
  }

  const body = await req.json();
  const { decisionId, humanOutcome, humanFeedback, appliedStage } = body;

  if (!decisionId || !humanOutcome) {
    return NextResponse.json(
      { error: "decisionId and humanOutcome ('approved_as_is' | 'edited' | 'rejected') are required." },
      { status: 400 }
    );
  }

  const result = await resolveShreeDecision({
    decisionId,
    humanOutcome,
    humanFeedback,
    appliedStage,
  });

  return NextResponse.json(result);
}
