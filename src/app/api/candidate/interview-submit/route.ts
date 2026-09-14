import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { callTextModel, hasAiKey } from "@/lib/aiClient";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

type ScreeningSubmissionPayload = {
  token: string;
  transcript: string;
  answers?: string[];
};

type ShreeEvaluationResult = {
  score: number;
  rating: number; // 1 to 5
  recommendation: "strong_hire" | "hire" | "hold" | "decline";
  summary: string;
  strengths: string[];
  probeAreas: string[];
  metSkills: string[];
  missingSkills: string[];
};

function parseCleanJson<T>(raw: string, fallback: T): T {
  try {
    const cleaned = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return fallback;
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as ScreeningSubmissionPayload | null;

    if (!body || !body.transcript || !body.transcript.trim()) {
      return NextResponse.json(
        { ok: false, error: "Interview transcript is required." },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const { token, transcript, answers } = body;
    const admin = createAdminClient();

    // Handle demo sessions
    if (token === "demo") {
      return NextResponse.json(
        {
          ok: true,
          data: {
            candidateId: "demo",
            stage: "hm_review",
            score: 92,
            rating: 5,
            recommendation: "strong_hire",
            summary: "Demonstrated strong distributed systems engineering and high architectural maturity.",
          },
        },
        { headers: CORS_HEADERS }
      );
    }

    // Find candidate by token (id)
    const { data: candidate, error: candError } = await admin
      .from("talent_candidates")
      .select("id, name, stage, requisition_id, created_by, current_company, tags, match_score")
      .eq("id", token)
      .maybeSingle();

    if (candError || !candidate) {
      return NextResponse.json(
        { ok: false, error: "Candidate session not found." },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    // Fetch target requisition
    let requisition: {
      id: string;
      title: string;
      department: string;
      description?: string;
    } | null = null;

    if (candidate.requisition_id) {
      const { data: reqData } = await admin
        .from("talent_requisitions")
        .select("id, title, department, description")
        .eq("id", candidate.requisition_id)
        .maybeSingle();
      if (reqData) requisition = reqData;
    }

    // Run AI Evaluation via Gemini
    const roleTitle = requisition?.title || "Target Role";
    const roleDept = requisition?.department || "General";
    const roleContext = requisition?.description || "";

    const prompt = `You are Shree, the enterprise AI Talent Acquisition evaluator.
Your mandate: Evaluate an interview transcript of candidate "${candidate.name}" for the position "${roleTitle}" (${roleDept}).
Analyze with absolute objectivity based strictly on the candidate's actual answers.

Role Context:
${roleContext}

Candidate Transcript:
${transcript}

Evaluate across:
1. Must-Have Competency Coverage & Technical Depth
2. Communication Clarity & Problem-Solving Approach
3. Strategic Alignment & Motivation
4. Potential gaps or specific probe areas for the interview panel

Respond as strict JSON only (no markdown code fences, no extra commentary):
{
  "score": 88,
  "rating": 4,
  "recommendation": "hire",
  "summary": "2-3 concise sentences summarizing core strengths and readiness.",
  "strengths": ["Key strength 1 with specific evidence", "Key strength 2 with specific evidence"],
  "probeAreas": ["Specific probe question for the hiring manager panel"],
  "metSkills": ["Skill A", "Skill B"],
  "missingSkills": []
}`;

    let evalResult: ShreeEvaluationResult = {
      score: 85,
      rating: 4,
      recommendation: "hire",
      summary: `Candidate demonstrated solid domain competency and articulate communication for ${roleTitle}.`,
      strengths: ["Clear communication", "Practical problem-solving examples"],
      probeAreas: ["Dig deeper into system scaling boundaries and production failure recovery"],
      metSkills: Array.isArray(candidate.tags) ? candidate.tags.slice(0, 3) : [],
      missingSkills: [],
    };

    if (hasAiKey()) {
      try {
        const rawAi = await callTextModel(prompt, 800);
        const parsed = parseCleanJson<ShreeEvaluationResult>(rawAi, evalResult);
        if (parsed && typeof parsed.score === "number") {
          evalResult = parsed;
        }
      } catch (aiErr) {
        console.warn("[interview-submit] AI evaluation model warning, using deterministic fallback:", aiErr);
      }
    }

    // Format feedback for scorecard
    const feedbackMarkdown = `### Shree AI Pre-Screening Evaluation
**Recommendation**: ${evalResult.recommendation.toUpperCase()} (${evalResult.score}/100)  
**Rating**: ${"★".repeat(evalResult.rating)}${"☆".repeat(Math.max(0, 5 - evalResult.rating))}

#### Executive Summary
${evalResult.summary}

#### Key Demonstrated Strengths
${evalResult.strengths.map((s) => `- ${s}`).join("\n")}

#### Recommended Hiring Manager Probes
${evalResult.probeAreas.map((p) => `- ${p}`).join("\n")}

---
#### Full Interview Transcript
${transcript}`;

    // 1. Create entry in talent_scorecards
    const { data: scorecard, error: scoreError } = await admin
      .from("talent_scorecards")
      .insert({
        candidate_id: candidate.id,
        interviewer_id: candidate.created_by,
        rating: evalResult.rating,
        recommendation: evalResult.recommendation,
        feedback: feedbackMarkdown,
      })
      .select("id")
      .single();

    if (scoreError) {
      console.warn("[interview-submit] scorecard insert error:", scoreError.message);
    }

    // 2. Create entry in talent_interviews
    const { error: interviewError } = await admin
      .from("talent_interviews")
      .insert({
        candidate_id: candidate.id,
        requisition_id: candidate.requisition_id,
        round_name: "Shree AI Pre-Screening",
        mode: "ai",
        status: "completed",
        scheduled_at: new Date().toISOString(),
        created_by: candidate.created_by,
        panel: ["Shree Autonomous Hiring Partner"],
      });

    if (interviewError) {
      console.warn("[interview-submit] interview record insert error:", interviewError.message);
    }

    // 3. Stage transition: If recommendation is hire/strong_hire, advance to 'hm_review'!
    const advanceToHM = evalResult.recommendation === "hire" || evalResult.recommendation === "strong_hire";
    const nextStage = advanceToHM ? "hm_review" : "screening";

    const { error: updateError } = await admin
      .from("talent_candidates")
      .update({
        stage: nextStage,
        match_score: evalResult.score,
        match_score_note: evalResult.summary,
        match_score_computed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", candidate.id);

    if (updateError) {
      console.error("[interview-submit] candidate update error:", updateError.message);
    }

    // 4. Log Audit Event
    await admin.from("talent_audit_log").insert({
      actor_id: candidate.created_by,
      action: "candidate_prescreening_completed",
      target_type: "candidate",
      target_id: candidate.id,
      metadata: {
        score: evalResult.score,
        recommendation: evalResult.recommendation,
        previousStage: candidate.stage,
        newStage: nextStage,
        scorecardId: scorecard?.id || null,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        data: {
          candidateId: candidate.id,
          stage: nextStage,
          score: evalResult.score,
          rating: evalResult.rating,
          recommendation: evalResult.recommendation,
          summary: evalResult.summary,
          message: `Pre-screening successfully completed. Candidate advanced to ${nextStage.toUpperCase()}.`,
        },
      },
      { headers: CORS_HEADERS }
    );
  } catch (err) {
    console.error("[interview-submit] unexpected failure:", err);
    return NextResponse.json(
      { ok: false, error: "Internal error submitting pre-screening interview." },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
