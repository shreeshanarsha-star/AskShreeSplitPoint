import { NextResponse } from "next/server";
import { extractDocumentText } from "@/lib/contracts/textExtract";
import { callTextModel } from "@/lib/aiClient";

export const maxDuration = 45;

export interface QuickApplyExtractedProfile {
  fullName: string;
  phone: string;
  email: string;
  location: string;
  presentSalary: string;
  noticePeriod: string;
  qualification: string;
  currentOrganization: string;
  switchingReason: string;
  skills: string[];
  rawText: string;
}

const QUICK_APPLY_EXTRACT_PROMPT = `You extract 9 candidate profile fields from a resume/CV text for quick apply.
Return JSON only (no markdown fences, no prose):
{
  "fullName": string (candidate's full name),
  "phone": string (phone number, or empty string if not found),
  "email": string (email address, or empty string if not found),
  "location": string (current city/country, or empty string if not found),
  "presentSalary": string (current compensation/CTC if mentioned, e.g. "$120k", "18 LPA", or empty string),
  "noticePeriod": string (notice period if stated e.g. "Immediate", "30 days", "2 months", or empty string),
  "qualification": string (highest degree or education, e.g. "B.Tech Computer Science", "MBA", or empty string),
  "currentOrganization": string (most recent or current company/employer name, or empty string),
  "switchingReason": string (reason for job change if stated or infer e.g. "Career growth & new challenges", or empty string),
  "skills": array of top 5-8 key technical or domain skills
}

--- Resume Text ---
`;

export async function POST(request: Request) {
  try {
    let fileName = "resume.pdf";
    let mimeType = "application/pdf";
    let buffer: Buffer | null = null;

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");
      if (file && typeof file === "object" && "arrayBuffer" in file) {
        const f = file as File;
        fileName = f.name || "resume.pdf";
        mimeType = f.type || "application/pdf";
        buffer = Buffer.from(await f.arrayBuffer());
      }
    } else {
      const body = await request.json().catch(() => null);
      if (body?.fileBase64) {
        fileName = body.fileName || "resume.pdf";
        mimeType = body.mimeType || "application/pdf";
        buffer = Buffer.from(body.fileBase64, "base64");
      }
    }

    if (!buffer || buffer.length === 0) {
      return NextResponse.json(
        { error: "No CV file received. Please drop or upload a .pdf, .docx, or .txt file." },
        { status: 400 }
      );
    }

    // 1. Extract Plain Text
    let fullText = "";
    const lowerName = fileName.toLowerCase();
    if (mimeType.startsWith("text/") || lowerName.endsWith(".txt")) {
      fullText = buffer.toString("utf-8");
    } else {
      try {
        const extracted = await extractDocumentText(buffer, fileName, mimeType);
        fullText = extracted.fullText;
      } catch (err) {
        console.warn("Text extraction failed:", err);
      }
    }

    if (!fullText || fullText.trim().length < 20) {
      return NextResponse.json(
        { error: "Could not read selectable text from this CV. Try a different file." },
        { status: 400 }
      );
    }

    // 2. Extract using AI with heuristic fallback
    let parsed: Partial<QuickApplyExtractedProfile> = {};
    try {
      const raw = await callTextModel(`${QUICK_APPLY_EXTRACT_PROMPT}${fullText.slice(0, 4000)}`, 800);
      const cleaned = raw.replace(/```json|```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch (aiErr) {
      console.warn("AI parse failed, using heuristic extraction:", aiErr);
    }

    // 3. Fallback Heuristics for essential fields
    const emailMatch = fullText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const phoneMatch = fullText.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    
    // Heuristic name from first line if missing
    let fallbackName = "Candidate";
    const firstLines = fullText.split("\n").map(l => l.trim()).filter(l => l.length > 2 && l.length < 50);
    if (firstLines.length > 0) {
      fallbackName = firstLines[0].replace(/[^a-zA-Z\s]/g, "").trim() || "Candidate";
    }

    const profile: QuickApplyExtractedProfile = {
      fullName: parsed.fullName?.trim() || fallbackName,
      phone: parsed.phone?.trim() || (phoneMatch ? phoneMatch[0] : ""),
      email: parsed.email?.trim() || (emailMatch ? emailMatch[0] : ""),
      location: parsed.location?.trim() || "",
      presentSalary: parsed.presentSalary?.trim() || "",
      noticePeriod: parsed.noticePeriod?.trim() || "Immediate / 30 Days",
      qualification: parsed.qualification?.trim() || "",
      currentOrganization: parsed.currentOrganization?.trim() || "",
      switchingReason: parsed.switchingReason?.trim() || "Seeking career growth & impactful opportunities",
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
      rawText: fullText,
    };

    return NextResponse.json({ ok: true, profile });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to parse CV." },
      { status: 500 }
    );
  }
}
