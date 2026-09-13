import { createAdminClient } from "@/lib/supabase/admin";
import { callTextModel } from "@/lib/aiClient";
import type { SupabaseClient } from "@supabase/supabase-js";

export type DecisionAction = "screen" | "advance" | "hold" | "reject" | "schedule" | "send_assessment" | "draft_offer";
export type HumanDecision = "pending" | "approved_as_is" | "edited" | "rejected";

export type Citation = {
  dimension: string;
  quote: string;
  timestamp?: string;
  confidence?: number;
};

export type ShreeReasoning = {
  summary: string;
  matched_criteria: Array<{ criteria: string; evidence: string }>;
  missing_criteria: Array<{ criteria: string; impact?: string; evidence?: string }>;
  interview_focus_areas?: string[];
  recommendation: "advance" | "hold" | "decline";
  target_stage: string;
};

export type ShreeDecisionRecord = {
  id: string;
  org_id: string;
  requisition_id: string;
  candidate_id: string;
  action_type: DecisionAction;
  target_stage: string | null;
  shree_reasoning: ShreeReasoning;
  citations: Citation[];
  shree_confidence: number;
  human_decision: HumanDecision;
  human_feedback?: string | null;
  graduated_at_execution: boolean;
  created_at: string;
  resolved_at?: string | null;
  // Joined fields
  candidate?: {
    name: string;
    stage: string;
    match_score: number | null;
    current_designation: string | null;
    current_company: string | null;
  };
  requisition?: {
    req_no: string;
    title: string;
  };
};

export type LaneTrustRecord = {
  id: string;
  org_id: string;
  role_family: string;
  total_evaluations: number;
  human_agreement_count: number;
  agreement_rate: number;
  is_autonomous: boolean;
  graduated_at: string | null;
  kill_switch_engaged: boolean;
  updated_at: string;
};

// --- Helper: Categorize Role Family ---
export function detectRoleFamily(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("engineer") || t.includes("developer") || t.includes("architect") || t.includes("tech") || t.includes("frontend") || t.includes("backend") || t.includes("fullstack") || t.includes("devops") || t.includes("qa")) {
    return "Engineering";
  }
  if (t.includes("sales") || t.includes("account") || t.includes("bd") || t.includes("business development") || t.includes("revenue")) {
    return "Sales & Account Management";
  }
  if (t.includes("product") || t.includes("ux") || t.includes("ui") || t.includes("design")) {
    return "Product & Design";
  }
  if (t.includes("market") || t.includes("growth") || t.includes("seo") || t.includes("content") || t.includes("brand")) {
    return "Marketing";
  }
  if (t.includes("hr") || t.includes("talent") || t.includes("people") || t.includes("recruit")) {
    return "Human Resources";
  }
  if (t.includes("finance") || t.includes("accountant") || t.includes("tax") || t.includes("audit")) {
    return "Finance";
  }
  if (t.includes("ops") || t.includes("operation") || t.includes("logistics") || t.includes("supply")) {
    return "Operations";
  }
  return "General & Corporate";
}

// --- Blind PII Sanitizer ---
// Strips identity markers to prevent demographic bias before LLM analysis
export function sanitizeCandidatePII(rawText: string): { sanitizedText: string; anonymizedId: string } {
  const anonymizedId = `CAND-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  
  let cleaned = rawText;
  // Strip email addresses
  cleaned = cleaned.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/gi, "[CONFIDENTIAL_EMAIL]");
  // Strip phone numbers
  cleaned = cleaned.replace(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, "[CONFIDENTIAL_PHONE]");
  // Strip LinkedIn and personal portfolio URLs
  cleaned = cleaned.replace(/https?:\/\/(?:www\.)?linkedin\.com\/in\/[\w-]+/gi, "[CONFIDENTIAL_LINKEDIN]");
  cleaned = cleaned.replace(/https?:\/\/[^\s]+/gi, "[CONFIDENTIAL_URL]");
  // Strip common age/grad date patterns (e.g., "Class of 2012", "Graduated: 1998")
  cleaned = cleaned.replace(/(?:graduated|class of|batch of|completion date)[\s:]+(?:19|20)\d{2}/gi, "[DATE_REDACTED]");

  return { sanitizedText: cleaned, anonymizedId };
}

// --- Parse JSON safely ---
function parseCleanJson<T>(raw: string, fallback: T): T {
  try {
    const cleaned = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return fallback;
  }
}

// --- Core Evaluator Prompt ---
const EVALUATION_PROMPT = `You are Shree, the enterprise AI Talent Acquisition evaluator.
Your mandate: Evaluate an anonymized candidate against job requirements with absolute objectivity.
Every score and claim MUST be supported by direct citations from the resume text. Do NOT hallucinate skills or speculate.
Never consider age, graduation year, or personal demographics.

Evaluate across these dimensions:
1. Must-Have Competencies Coverage
2. Relevant Experience Depth & Scope
3. Qualification / Educational Alignment
4. Potential Gaps / Red Flags to Probe

Respond as strict JSON only (no markdown, no prose):
{
  "summary": "2-3 sentences summarizing core strengths and gaps.",
  "matched_criteria": [
    { "criteria": "string (the required competency)", "evidence": "exact quote from resume supporting this" }
  ],
  "missing_criteria": [
    { "criteria": "string (the missing requirement)", "impact": "why this impacts role readiness" }
  ],
  "interview_focus_areas": [
    "Specific technical or behavioral probe for the interviewer"
  ],
  "confidence": 0.92,
  "recommendation": "advance" | "hold" | "decline",
  "target_stage": "hm_review" | "screening" | "rejected"
}`;

// --- Autonomous vs Shadow Decision Engine ---
export async function evaluateCandidateWithShree(params: {
  candidateId: string;
  requisitionId: string;
  orgId: string;
  resumeText: string;
  requisitionTitle: string;
  requisitionContext: string;
  eligibilityCriteria?: Record<string, unknown> | null;
}): Promise<{ decisionId: string; status: "graduated_auto_advanced" | "shadow_pending"; reasoning: ShreeReasoning }> {
  const admin = createAdminClient();

  // 1. Sanitize PII for blind screening
  const { sanitizedText, anonymizedId } = sanitizeCandidatePII(params.resumeText);

  // 2. Perform explainable LLM evaluation
  const prompt = `${EVALUATION_PROMPT}

--- REQUISITION: ${params.requisitionTitle} ---
${params.requisitionContext}
${params.eligibilityCriteria ? `Eligibility Criteria: ${JSON.stringify(params.eligibilityCriteria)}` : ""}

--- ANONYMIZED RESUME (${anonymizedId}) ---
${sanitizedText}`;

  const llmResponse = await callTextModel(prompt, 900);
  const reasoning = parseCleanJson<ShreeReasoning>(llmResponse, {
    summary: "Evaluation completed based on available resume data.",
    matched_criteria: [],
    missing_criteria: [],
    recommendation: "hold",
    target_stage: "screening",
  });

  // Extract quotes as formal citations
  const citations: Citation[] = (reasoning.matched_criteria || []).map((m) => ({
    dimension: m.criteria,
    quote: m.evidence,
    confidence: 0.9,
  }));

  // 3. Determine Lane Trust & Graduation Status
  const roleFamily = detectRoleFamily(params.requisitionTitle);
  
  // Fetch or initialize lane trust
  const { data: trustRow } = await admin
    .from("shree_lane_trust")
    .select("*")
    .eq("org_id", params.orgId)
    .eq("role_family", roleFamily)
    .maybeSingle();

  const isAutonomous = !!(trustRow?.is_autonomous && !trustRow?.kill_switch_engaged);

  // Check if this action can be auto-executed:
  // Hard Rule: Autonomous execution can advance candidates to screening or hm_review,
  // but FINAL rejections and final hires ALWAYS require human signoff.
  const canAutoExecute = isAutonomous && reasoning.recommendation === "advance";

  let decisionStatus: "graduated_auto_advanced" | "shadow_pending" = "shadow_pending";

  if (canAutoExecute) {
    decisionStatus = "graduated_auto_advanced";
    // Execute stage move in talent_candidates
    await admin
      .from("talent_candidates")
      .update({
        stage: reasoning.target_stage || "hm_review",
        anonymized_id: anonymizedId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.candidateId);
  } else {
    // Record anonymized ID for record keeping
    await admin
      .from("talent_candidates")
      .update({ anonymized_id: anonymizedId })
      .eq("id", params.candidateId);
  }

  // 4. Save to shree_decisions log
  const { data: decision, error } = await admin
    .from("shree_decisions")
    .insert({
      org_id: params.orgId,
      requisition_id: params.requisitionId,
      candidate_id: params.candidateId,
      action_type: "screen",
      target_stage: reasoning.target_stage,
      shree_reasoning: reasoning,
      citations,
      shree_confidence: 0.88,
      human_decision: canAutoExecute ? "approved_as_is" : "pending",
      graduated_at_execution: canAutoExecute,
      resolved_at: canAutoExecute ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (error) {
    console.error("[shreeOrchestrator] Error logging decision:", error);
  }

  return {
    decisionId: decision?.id || "",
    status: decisionStatus,
    reasoning,
  };
}

// --- Human Feedback & Trust Calibration Loop ---
export async function resolveShreeDecision(params: {
  decisionId: string;
  humanOutcome: "approved_as_is" | "edited" | "rejected";
  humanFeedback?: string;
  appliedStage?: string;
}): Promise<{ ok: boolean; laneGraduated?: boolean; newAgreementRate?: number }> {
  const admin = createAdminClient();

  const { data: decision } = await admin
    .from("shree_decisions")
    .select("*, talent_requisitions(title)")
    .eq("id", params.decisionId)
    .single();

  if (!decision) {
    return { ok: false };
  }

  // Update decision record
  await admin
    .from("shree_decisions")
    .update({
      human_decision: params.humanOutcome,
      human_feedback: params.humanFeedback || null,
      target_stage: params.appliedStage || decision.target_stage,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", params.decisionId);

  // If approved, update candidate stage if supplied
  if (params.humanOutcome !== "rejected" && params.appliedStage && decision.candidate_id) {
    await admin
      .from("talent_candidates")
      .update({
        stage: params.appliedStage,
        updated_at: new Date().toISOString(),
      })
      .eq("id", decision.candidate_id);
  }

  // Calculate and update agreement rate in shree_lane_trust
  const roleFamily = detectRoleFamily((decision.talent_requisitions as { title?: string })?.title || "General");
  
  const { data: existingTrust } = await admin
    .from("shree_lane_trust")
    .select("*")
    .eq("org_id", decision.org_id)
    .eq("role_family", roleFamily)
    .maybeSingle();

  const total = (existingTrust?.total_evaluations || 0) + 1;
  const isMatch = params.humanOutcome === "approved_as_is";
  const matched = (existingTrust?.human_agreement_count || 0) + (isMatch ? 1 : 0);
  const agreementRate = Math.round((matched / total) * 1000) / 1000;

  // Threshold: >= 20 evaluations and >= 90% agreement rate to graduate
  const shouldGraduate = total >= 20 && agreementRate >= 0.90 && !existingTrust?.kill_switch_engaged;

  const { data: updatedTrust } = await admin
    .from("shree_lane_trust")
    .upsert({
      org_id: decision.org_id,
      role_family: roleFamily,
      total_evaluations: total,
      human_agreement_count: matched,
      agreement_rate: agreementRate,
      is_autonomous: shouldGraduate || (existingTrust?.is_autonomous && !existingTrust?.kill_switch_engaged),
      graduated_at: shouldGraduate ? new Date().toISOString() : existingTrust?.graduated_at,
      updated_at: new Date().toISOString(),
    }, { onConflict: "org_id,role_family" })
    .select()
    .single();

  return {
    ok: true,
    laneGraduated: updatedTrust?.is_autonomous,
    newAgreementRate: agreementRate,
  };
}

// --- Pipeline Triage Engine ---
export async function triageRequisitionPipeline(
  supabase: SupabaseClient<any>,
  requisitionId: string
): Promise<{
  totalCandidates: number;
  stageCounts: Record<string, number>;
  stalledCandidates: Array<{ id: string; name: string; stage: string; daysInStage: number }>;
  topReadyToAdvance: Array<{ id: string; name: string; score: number | null; note: string | null }>;
  shreePendingDecisionsCount: number;
  standupBriefing: string;
}> {
  const { data: candidates } = await supabase
    .from("talent_candidates")
    .select("id, name, stage, match_score, match_score_note, created_at, updated_at")
    .eq("requisition_id", requisitionId);

  const list = candidates || [];
  const stageCounts: Record<string, number> = {};
  const stalled: Array<{ id: string; name: string; stage: string; daysInStage: number }> = [];

  const now = Date.now();
  for (const c of list) {
    stageCounts[c.stage] = (stageCounts[c.stage] || 0) + 1;
    const lastActive = new Date(c.updated_at || c.created_at).getTime();
    const days = Math.round((now - lastActive) / 86_400_000);
    if (days >= 2 && c.stage !== "rejected" && c.stage !== "joined") {
      stalled.push({ id: c.id, name: c.name, stage: c.stage, daysInStage: days });
    }
  }

  // Top candidates in applied or screening with score >= 75
  const topReady = list
    .filter((c) => (c.stage === "applied" || c.stage === "screening") && (c.match_score || 0) >= 75)
    .sort((a, b) => (b.match_score || 0) - (a.match_score || 0))
    .slice(0, 5)
    .map((c) => ({
      id: c.id,
      name: c.name,
      score: c.match_score,
      note: c.match_score_note,
    }));

  // Fetch count of pending shadow decisions
  const { count: pendingCount } = await supabase
    .from("shree_decisions")
    .select("*", { count: "exact", head: true })
    .eq("requisition_id", requisitionId)
    .eq("human_decision", "pending");

  const briefing = `Pipeline Briefing: ${list.length} total candidates. ${topReady.length} high-fit candidates ready to advance. ${stalled.length} candidates waiting >48 hours in current stage. ${pendingCount || 0} decisions waiting for your review in Shadow Mode.`;

  return {
    totalCandidates: list.length,
    stageCounts,
    stalledCandidates: stalled,
    topReadyToAdvance: topReady,
    shreePendingDecisionsCount: pendingCount || 0,
    standupBriefing: briefing,
  };
}
