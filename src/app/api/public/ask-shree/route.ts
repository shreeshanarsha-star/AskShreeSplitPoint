import { NextResponse } from "next/server";
import { callTextModel } from "@/lib/aiClient";
import { findRelevantKnowledge, performAvatarWebSearch } from "@/lib/avatarKnowledge";

export const maxDuration = 30;

const SYSTEM_PROMPT = `You are Shree, the enterprise AI Talent Acquisition Partner at AskShree.
Your goal is to warmly, accurately, and objectively answer questions from prospective candidates and visitors.
You are grounded in three complementary sources of truth:
1. SITE DATA: Open requisitions, team roles, requirements, and compensation bands.
2. UPLOADED COMPANY DOCUMENTS: Verified company culture handbooks, interview stage rubrics, benefits summaries, and policies uploaded by administrators.
3. LIVE WEB INTELLIGENCE: Up-to-date industry compensation benchmarks and real-world tech market trends.

Rules:
- Be encouraging, articulate, and authoritative yet warm (executive recruiter tone).
- Ground your answers directly in the provided context excerpts whenever available.
- If referencing company policy, benefits, or interview stages, cite AskShree's verified guidelines naturally.
- If external market benchmarks are relevant, share them helpfully.
- Never promise an offer or guarantee an interview; focus on candidate alignment and next steps.
- Keep answers concise, high-signal, and easy to read (2-4 sentences max).`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { query, contextJob } = body;

    if (!query || typeof query !== "string" || !query.trim()) {
      return NextResponse.json({ reply: "Hello! What can I help you explore today?" });
    }

    const trimmedQuery = query.trim();

    // 1. Retrieve relevant excerpts from active admin-uploaded documents
    const docMatches = await findRelevantKnowledge(trimmedQuery, 3);

    // 2. Decide if web search grounding is helpful (for market benchmarks, salaries, comparisons)
    const isMarketQuery =
      /\b(market|industry|benchmark|compare|competitor|average|salary range|in india|in us|trend|external|google|meta)\b/i.test(
        trimmedQuery
      ) || docMatches.length === 0;

    let webSearchData: { results: Array<{ title: string; snippet: string }>; answerBox?: string } | null = null;
    if (isMarketQuery) {
      const searchRes = await performAvatarWebSearch(trimmedQuery);
      if (searchRes.success && (searchRes.results.length > 0 || searchRes.answerBox)) {
        webSearchData = searchRes;
      }
    }

    // 3. Assemble Site Data Context
    const siteContext = contextJob
      ? `Selected Open Requisition: "${contextJob.title}" | Department: ${contextJob.department || "Engineering"} | Location: ${contextJob.location || "Remote"} | Compensation: ${contextJob.salary_range || "Competitive"} | Overview: ${contextJob.description || ""}`
      : "AskShree: Currently hiring across Engineering, Product, Sales, and Operations.";

    // 4. Assemble Uploaded Documents Context
    const docContext =
      docMatches.length > 0
        ? docMatches
            .map(
              (m) =>
                `[Document: "${m.documentTitle}" (Category: ${m.category})]\n"${m.excerpt}"`
            )
            .join("\n\n")
        : "No specific uploaded document match found for this question.";

    // 5. Assemble Web Context
    const webContext = webSearchData
      ? [
          webSearchData.answerBox ? `Answer snippet: ${webSearchData.answerBox}` : "",
          ...webSearchData.results.map((r) => `- ${r.title}: ${r.snippet}`),
        ]
          .filter(Boolean)
          .join("\n")
      : "No live web search required for this internal query.";

    // 6. Build prompt
    const prompt = `${SYSTEM_PROMPT}

=== GROUNDING CONTEXT ===
[SITE DATA]
${siteContext}

[UPLOADED COMPANY DOCUMENTS]
${docContext}

[LIVE WEB INTELLIGENCE]
${webContext}
=========================

Candidate Question: "${trimmedQuery}"
Shree Response:`;

    let reply = "";
    try {
      reply = await callTextModel(prompt, 350);
    } catch (llmErr) {
      console.warn("[ask-shree] LLM call failed or key not configured, synthesizing from grounded documents:", llmErr);
      if (docMatches.length > 0) {
        const topDoc = docMatches[0];
        const cleaned = topDoc.excerpt.replace(/\n+/g, " ").trim();
        reply = `Based on AskShree's verified documents (${topDoc.documentTitle}): ${cleaned}`;
      } else if (contextJob) {
        reply = `For the ${contextJob.title} position in ${contextJob.department || "Engineering"} (${contextJob.salary_range || "Competitive"}), we prioritize structured problem solving, continuous learning, and high craft. Feel free to Quick Apply to start the screening process!`;
      } else {
        reply = "AskShree is built on continuous learning, transparent compensation, and zero-bias hiring. Select any role on the left or type a question to learn more!";
      }
    }

    const sourcesUsed = docMatches.map((m) => ({
      title: m.documentTitle,
      category: m.category,
      excerpt: m.excerpt,
      score: m.score,
    }));

    return NextResponse.json({
      reply: reply.trim(),
      sourcesUsed,
      groundedInWeb: !!webSearchData,
    });
  } catch (err) {
    console.error("[ask-shree fatal error]:", err);
    return NextResponse.json({
      reply:
        "Thank you for asking! AskShree is built on continuous learning, transparent compensation, and zero-bias hiring. Feel free to Quick Apply to start the screening process.",
      sourcesUsed: [],
    });
  }
}
