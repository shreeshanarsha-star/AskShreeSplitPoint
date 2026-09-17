import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractDocumentText } from "@/lib/contracts/textExtract";
import { structureJD } from "@/lib/jobPostings/structure";
import { getClientIp, peekPostingUsage } from "@/lib/jobPostings/gating";

export const maxDuration = 60;

const MAX_FILES = 10;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

// Step 1 of the public posting flow: upload JDs, get AI-structured drafts
// back for review -- nothing is written to the database yet, and this
// step doesn't consume the free-posting quota (only the actual "Post"
// action, /api/public/job-postings, does that). An already-locked IP is
// blocked here too, so analysis can't be used to route around the quota.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ip = getClientIp(request);
  const usage = await peekPostingUsage(ip, user?.id ?? null);
  if (!usage.allowed && !user) {
    return NextResponse.json({ error: usage.message || "Free posting limit reached." }, { status: 403 });
  }

  const contentType = request.headers.get("content-type") || "";

  // Handle direct raw text JSON
  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => null);
    const rawText = body?.rawText || body?.text || "";
    if (!rawText || rawText.trim().length < 20) {
      return NextResponse.json({ error: "Please provide at least 20 characters of job description text." }, { status: 400 });
    }
    const structured = await structureJD(rawText);
    return NextResponse.json({
      drafts: [{ fileName: "Job Description", rawJdText: rawText, ...structured }],
    });
  }

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Expected multipart form data or JSON." }, { status: 400 });

  // Handle form field rawText if passed
  const formRawText = form.get("rawText");
  if (typeof formRawText === "string" && formRawText.trim().length >= 20) {
    const structured = await structureJD(formRawText);
    return NextResponse.json({
      drafts: [{ fileName: "Job Description", rawJdText: formRawText, ...structured }],
    });
  }

  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) return NextResponse.json({ error: "Attach at least one job description or provide text." }, { status: 400 });
  if (files.length > MAX_FILES) return NextResponse.json({ error: `Up to ${MAX_FILES} files at a time.` }, { status: 400 });

  const drafts = [];
  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) {
      drafts.push({ fileName: file.name, error: "File is over 5MB." });
      continue;
    }
    const isDoc = ALLOWED_TYPES.includes(file.type) || /\.(pdf|doc|docx)$/i.test(file.name);
    const isTxt = file.type === "text/plain" || /\.txt$/i.test(file.name);

    if (!isDoc && !isTxt) {
      drafts.push({ fileName: file.name, error: "Must be a PDF, Word, or TXT document." });
      continue;
    }
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      let fullText = "";

      if (isTxt) {
        fullText = buffer.toString("utf-8");
      } else {
        const extracted = await extractDocumentText(buffer, file.name, file.type);
        fullText = extracted.fullText;
      }

      if (!fullText || fullText.trim().length < 20) {
        drafts.push({ fileName: file.name, error: "Couldn't read selectable text from this file." });
        continue;
      }
      const structured = await structureJD(fullText);
      drafts.push({ fileName: file.name, rawJdText: fullText, ...structured });
    } catch (err) {
      drafts.push({ fileName: file.name, error: err instanceof Error ? err.message : "Couldn't analyze this file." });
    }
  }

  return NextResponse.json({ drafts });
}
