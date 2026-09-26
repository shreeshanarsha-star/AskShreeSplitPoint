import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrgContext } from "@/lib/org";
import { getUserRoles, RECRUITER_READER_ROLES } from "@/lib/talentRoles";
import { callTextModel, hasAiKey } from "@/lib/aiClient";

type GenerateOutreachPayload = {
  candidateId: string;
  requisitionId?: string | null;
  tone?: "executive" | "conversational" | "technical";
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: Request) {
  try {
    // This route reads a real candidate's PII (name, current company/
    // location, resume excerpt, a live engage-link token) and burns AI-key
    // spend on every call. It previously had no auth check at all -- the
    // only thing standing between the internet and any candidate's data
    // was knowing (or guessing) their candidateId. Session cookie first,
    // then the same recruiter-side role gate /api/ats/requisitions already
    // enforces, so this route can't be reached by anyone that route itself
    // would turn around and reject.
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    const admin = createAdminClient();
    const ctx = await getOrgContext(admin, user.id);
    const callerRoles = await getUserRoles(admin, user.id);

    if (!ctx.isPlatformOwner && !callerRoles.some((r) => RECRUITER_READER_ROLES.includes(r))) {
      return NextResponse.json(
        { ok: false, error: "Forbidden" },
        { status: 403, headers: CORS_HEADERS }
      );
    }

    const body = (await request.json().catch(() => null)) as GenerateOutreachPayload | null;

    if (!body || !body.candidateId) {
      return NextResponse.json(
        { ok: false, error: "Candidate ID is required." },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // 1. Fetch Candidate
    const { data: candidate, error: candError } = await admin
      .from("talent_candidates")
      .select("id, name, current_company, current_location, linkedin_url, resume_text, tags, requisition_id, match_score")
      .eq("id", body.candidateId)
      .maybeSingle();

    if (candError || !candidate) {
      return NextResponse.json(
        { ok: false, error: "Candidate not found." },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    // 2. Fetch Requisition
    const targetReqId = body.requisitionId || candidate.requisition_id;
    let requisition: { id: string; req_no: string; title: string; department: string; location: string; description: string | null; org_id: string | null } | null = null;

    if (targetReqId) {
      const { data: req } = await admin
        .from("talent_requisitions")
        .select("id, req_no, title, department, location, description, org_id")
        .eq("id", targetReqId)
        .maybeSingle();
      if (req) requisition = req;
    }

    // Org scoping -- talent_candidates has no org_id column of its own;
    // org membership is inherited from the requisition it's tied to. Never
    // let a recruiter from one org pull outreach copy (and a live engage
    // link) for a candidate that belongs to a different org's pipeline.
    // The platform owner bypasses this, same as every other org-scoped
    // route. A candidate with no resolvable requisition/org is denied to
    // non-owners rather than allowed through unscoped.
    if (!ctx.isPlatformOwner && requisition?.org_id !== ctx.orgId) {
      return NextResponse.json(
        { ok: false, error: "Forbidden" },
        { status: 403, headers: CORS_HEADERS }
      );
    }

    const reqTitle = requisition?.title || "Key Strategic Role";
    const reqDept = requisition?.department || "Our Team";
    const reqLoc = requisition?.location || "Remote / Hybrid";
    const firstName = candidate.name.split(" ")[0] || "there";
    const currentCompany = candidate.current_company || "your current team";
    const skillsList = Array.isArray(candidate.tags) && candidate.tags.length > 0 ? candidate.tags.join(", ") : "your domain expertise";

    // 3. Generate Engagement URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.askshree.com";
    const engageUrl = `${baseUrl}/candidate/engage?token=${candidate.id}`;

    // 4. Generate Outreach Copy via AI (or high-craft fallback)
    let linkedinMsg = "";
    let emailSubject = "";
    let emailBody = "";
    let whatsappMsg = "";

    if (hasAiKey()) {
      try {
        const prompt = `You are Shree, an elite executive AI talent partner at AskShree.
Generate 3 personalized outreach messages for a candidate who was externally sourced for an open job.

CANDIDATE:
- Name: ${candidate.name}
- Current Company: ${currentCompany}
- Headline/Summary: ${candidate.resume_text?.slice(0, 300) || ""}
- Key Competencies: ${skillsList}

ROLE:
- Title: ${reqTitle}
- Department: ${reqDept}
- Location: ${reqLoc}
- Link: ${engageUrl}

TONE: ${body.tone || "conversational"}, authentic, respectful of their time, zero corporate spam clichés.

Output strictly valid JSON with this exact schema (no markdown fences, no prose):
{
  "linkedin": {
    "message": "Short connection/InMail note under 300 characters highlighting their background and the link"
  },
  "email": {
    "subject": "Punchy 5-7 word email subject line",
    "body": "Crisp 3-paragraph outreach email mentioning their background at ${currentCompany}, why this ${reqTitle} role aligns, and embedding the link"
  },
  "whatsapp": {
    "message": "Friendly, professional 2-3 sentence mobile message with link"
  }
}`;

        const aiResponse = await callTextModel(prompt, 600);
        const parsed = JSON.parse(aiResponse.replace(/```json/gi, "").replace(/```/g, "").trim());
        linkedinMsg = parsed.linkedin?.message || "";
        emailSubject = parsed.email?.subject || "";
        emailBody = parsed.email?.body || "";
        whatsappMsg = parsed.whatsapp?.message || "";
      } catch (err) {
        console.warn("AI generation fallback:", err);
      }
    }

    // Fallback if AI was unavailable or skipped
    if (!linkedinMsg) {
      linkedinMsg = `Hi ${firstName}, came across your impressive work at ${currentCompany}. We're scaling our ${reqDept} team and thought your background in ${skillsList.slice(0, 30)} would be a great fit for our ${reqTitle} role. Would love for you to check it out: ${engageUrl}`;
    }
    if (!emailSubject) {
      emailSubject = `${firstName} — ${reqTitle} opportunity at AskShree?`;
    }
    if (!emailBody) {
      emailBody = `Hi ${firstName},\n\nI hope you're having a productive week.\n\nI was reviewing top talent in ${skillsList.slice(0, 40)} and your background at ${currentCompany} immediately stood out. Our team is currently hiring for a ${reqTitle} (${reqLoc}), and given your trajectory, I wanted to reach out directly.\n\nYou can review the role and confirm your interest in 1 click here:\n${engageUrl}\n\nLooking forward to connecting!\n\nBest regards,\nShree • AI Talent Partner`;
    }
    if (!whatsappMsg) {
      whatsappMsg = `Hi ${firstName}! This is Shree from AskShree. We loved your background at ${currentCompany} and have a standout ${reqTitle} role that matches your skills. Check out the details here: ${engageUrl}`;
    }

    return NextResponse.json(
      {
        ok: true,
        data: {
          candidateId: candidate.id,
          candidateName: candidate.name,
          requisitionTitle: reqTitle,
          engageUrl,
          drafts: {
            linkedin: {
              message: linkedinMsg,
              charCount: linkedinMsg.length,
            },
            email: {
              subject: emailSubject,
              body: emailBody,
            },
            whatsapp: {
              message: whatsappMsg,
            },
          },
        },
      },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
