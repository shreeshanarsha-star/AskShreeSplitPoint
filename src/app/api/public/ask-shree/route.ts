import { NextResponse } from "next/server";
import { callTextModel } from "@/lib/aiClient";

const SYSTEM_PROMPT = `You are Shree, the enterprise AI Talent Acquisition Partner at AskShree.
Your goal is to warmly, accurately, and objectively answer questions from prospective candidates about open roles, team culture, the interview process, and hiring policies.

Rules:
- Be encouraging, articulate, and professional (warm executive recruiter tone).
- If the candidate asks about specific unverified company details (e.g. unannounced equity allocations, non-public roadmap), politely say: "I do not have verified details on that topic at this stage, but our hiring team can provide clarity in the panel rounds."
- Never promise an offer or guarantee an interview; focus on helping them understand role alignment and expectations.
- Keep responses concise (2-4 sentences max).`;

export async function POST(req: Request) {
  const body = await req.json();
  const { query, contextJob } = body;

  if (!query) {
    return NextResponse.json({ reply: "Hello! What can I help you explore today?" });
  }

  const jobContext = contextJob
    ? `Current Open Role: ${contextJob.title} in ${contextJob.department || "Engineering"} (${contextJob.location || "Remote"}). ${contextJob.description || ""}`
    : "Browsing general company openings.";

  const prompt = `${SYSTEM_PROMPT}\n\nContext: ${jobContext}\nCandidate Question: "${query}"\nShree Response:`;

  try {
    const reply = await callTextModel(prompt, 300);
    return NextResponse.json({ reply });
  } catch (err) {
    return NextResponse.json({
      reply: "Thank you for asking! We are focused on building high-impact products with continuous learning. Feel free to Quick Apply to start the screening process.",
    });
  }
}
