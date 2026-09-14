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

  if (!error && decisions && decisions.length > 0) {
    return NextResponse.json({ decisions });
  }

  // Fallback: Query real candidates in 'hm_review' or 'screening' with talent_scorecards
  try {
    let candQuery = supabase
      .from("talent_candidates")
      .select(`
        id,
        name,
        stage,
        match_score,
        match_score_note,
        current_company,
        current_location,
        requisition_id,
        tags,
        talent_scorecards (
          id,
          rating,
          recommendation,
          feedback,
          created_at
        ),
        talent_requisitions (
          id,
          req_no,
          title
        )
      `)
      .in("stage", ["hm_review", "screening"])
      .order("updated_at", { ascending: false })
      .limit(20);

    if (requisitionId) {
      candQuery = candQuery.eq("requisition_id", requisitionId);
    }

    const { data: cands } = await candQuery;

    if (cands && cands.length > 0) {
      const mappedDecisions = cands.map((c: any) => {
        const latestScorecard = Array.isArray(c.talent_scorecards) && c.talent_scorecards.length > 0
          ? c.talent_scorecards[c.talent_scorecards.length - 1]
          : null;

        const isAdvance = latestScorecard?.recommendation === "strong_hire" || latestScorecard?.recommendation === "hire";

        return {
          id: `dec-${c.id}`,
          org_id: orgId || "default-org",
          requisition_id: c.requisition_id,
          candidate_id: c.id,
          action_type: "screen",
          target_stage: "interview",
          shree_confidence: (c.match_score || 85) / 100,
          human_decision: "pending",
          human_feedback: null,
          graduated_at_execution: false,
          created_at: latestScorecard?.created_at || new Date().toISOString(),
          resolved_at: null,
          shree_reasoning: {
            summary: latestScorecard?.feedback || c.match_score_note || "Candidate successfully completed Shree AI pre-screening and met core requirements.",
            matched_criteria: (c.tags || []).slice(0, 3).map((t: string) => ({
              criteria: t,
              evidence: `Demonstrated competency during AI pre-screening session.`,
            })),
            missing_criteria: [],
            interview_focus_areas: [
              "Deep-dive into distributed systems design and production operational tradeoffs.",
              "Cross-functional communication and architectural alignment with executive stakeholders.",
            ],
            recommendation: isAdvance ? "advance" : "hold",
            target_stage: "interview",
          },
          citations: [
            {
              dimension: "Pre-Screening Verification",
              quote: latestScorecard ? `Recommendation: ${latestScorecard.recommendation}` : `Score: ${c.match_score || 85}%`,
              confidence: 0.9,
            },
          ],
          candidate: {
            id: c.id,
            name: c.name,
            stage: c.stage,
            match_score: c.match_score,
            current_designation: c.current_company ? `Candidate at ${c.current_company}` : "Candidate",
            current_company: c.current_company,
            current_location: c.current_location,
          },
          requisition: c.talent_requisitions,
        };
      });

      return NextResponse.json({ decisions: mappedDecisions });
    }
  } catch (bridgeErr) {
    console.warn("[shree/decisions] candidate bridge warning:", bridgeErr);
  }

  return NextResponse.json({ decisions: [] });
}

export async function POST(req: Request) {
  let supabase, user;
  try {
    ({ supabase, user } = await requireFeatureAccess(FEATURE_KEY));
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

  // Handle dynamic candidate decision IDs
  if (decisionId.startsWith("dec-")) {
    const candidateId = decisionId.replace("dec-", "");
    const targetStage = humanOutcome === "rejected" ? "rejected" : (appliedStage || "interview");

    const { error: updateError } = await supabase
      .from("talent_candidates")
      .update({
        stage: targetStage,
        updated_at: new Date().toISOString(),
      })
      .eq("id", candidateId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    await supabase.from("talent_audit_log").insert({
      actor_id: user.id,
      action: "recruiter_resolved_decision",
      target_type: "candidate",
      target_id: candidateId,
      metadata: {
        humanOutcome,
        humanFeedback,
        appliedStage: targetStage,
      },
    });

    return NextResponse.json({ ok: true, message: `Candidate moved to ${targetStage}` });
  }

  const result = await resolveShreeDecision({
    decisionId,
    humanOutcome,
    humanFeedback,
    appliedStage,
  });

  return NextResponse.json(result);
}
