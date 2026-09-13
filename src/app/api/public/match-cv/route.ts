import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractDocumentText } from "@/lib/contracts/textExtract";
import { parseCandidateProfile } from "@/lib/jobPostings/screen";
import { callTextModel } from "@/lib/aiClient";

export const maxDuration = 60;

interface MatchResult {
  jobId: string;
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  reason: string;
}

interface AiMatchPayload {
  summary: string;
  matches: MatchResult[];
}

const COMMON_SKILLS = [
  "TypeScript", "JavaScript", "React", "Next.js", "Node.js", "Python", "Go", "Java", "C++",
  "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Supabase", "AWS", "GCP", "Azure", "Docker",
  "Kubernetes", "Microservices", "REST APIs", "GraphQL", "CI/CD", "Git", "Tailwind CSS",
  "Customer Success", "Account Management", "Retention", "Renewals", "Onboarding", "NPS", "CSAT",
  "Enterprise Sales", "B2B Sales", "Lead Generation", "CRM", "Salesforce", "HubSpot", "Negotiation",
  "Digital Marketing", "SEO", "SEM", "Google Ads", "Content Strategy", "Social Media", "Campaigns",
  "Talent Acquisition", "Recruiting", "Sourcing", "HR", "People Operations", "Interviewing",
  "Contracts", "Compliance", "Legal Risk", "Corporate Governance", "Drafting", "Regulatory",
  "Finance", "Budgeting", "Forecasting", "Financial Modeling", "Accounting", "Excel",
  "Product Management", "Roadmapping", "Agile", "Scrum", "User Research", "Wireframing"
];

export async function POST(req: Request) {
  try {
    let fileName = "resume.pdf";
    let mimeType = "application/pdf";
    let buffer: Buffer | null = null;

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file");
      if (file && typeof file === "object" && "arrayBuffer" in file) {
        const f = file as File;
        fileName = f.name || "resume.pdf";
        mimeType = f.type || "application/pdf";
        buffer = Buffer.from(await f.arrayBuffer());
      }
    } else {
      const body = await req.json().catch(() => null);
      if (body?.fileBase64) {
        fileName = body.fileName || "resume.pdf";
        mimeType = body.mimeType || "application/pdf";
        buffer = Buffer.from(body.fileBase64, "base64");
      }
    }

    if (!buffer || buffer.length === 0) {
      return NextResponse.json(
        { error: "No CV file received. Please upload or drop a .pdf, .docx, or .txt file." },
        { status: 400 }
      );
    }

    // 1. Extract Plain Text from CV
    let resumeText = "";
    const lowerName = fileName.toLowerCase();
    if (mimeType.startsWith("text/") || lowerName.endsWith(".txt")) {
      resumeText = buffer.toString("utf-8");
    } else {
      try {
        const extracted = await extractDocumentText(buffer, fileName, mimeType);
        resumeText = extracted.fullText;
      } catch (err) {
        console.warn("Text extraction failed:", err);
      }
    }

    if (!resumeText || resumeText.trim().length < 20) {
      return NextResponse.json(
        {
          error:
            "Could not read text from your CV. Please make sure the document contains selectable text and try again.",
        },
        { status: 400 }
      );
    }

    // 2. Parse candidate structured profile (AI + Resilient Heuristics)
    const candidate = await parseCandidateProfile(resumeText);

    const lowerResume = resumeText.toLowerCase();
    const extractedSkills = COMMON_SKILLS.filter((s) => lowerResume.includes(s.toLowerCase()));

    if (candidate.skills.length === 0 && extractedSkills.length > 0) {
      candidate.skills = extractedSkills;
    }

    if (candidate.name === "Unknown" || !candidate.name) {
      const lines = resumeText.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
      for (const line of lines.slice(0, 5)) {
        if (!line.includes("@") && !line.includes("http") && !line.includes(":") && line.length > 2 && line.length < 40) {
          candidate.name = line;
          break;
        }
      }
    }

    if (!candidate.email) {
      const emailMatch = resumeText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (emailMatch) candidate.email = emailMatch[0];
    }

    if (!candidate.phone) {
      const phoneMatch = resumeText.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
      if (phoneMatch) candidate.phone = phoneMatch[0];
    }

    // 3. Fetch active requisitions
    const admin = createAdminClient();
    const { data: reqs } = await admin
      .from("talent_requisitions")
      .select("id, req_no, title, location, description, status")
      .in("status", ["open", "active", "published", "approved"])
      .order("created_at", { ascending: false })
      .limit(15);

    const activeJobs =
      reqs && reqs.length > 0
        ? reqs.map((r) => ({
            id: r.id,
            title: r.title,
            department: "Engineering & Technology",
            location: r.location || "Bangalore / Remote",
            description: r.description || "",
          }))
        : [
            {
              id: "demo-req-1",
              title: "Senior Full-Stack Engineer",
              department: "Product Engineering",
              location: "Bangalore / Remote",
              description:
                "Build high-throughput web applications with Next.js, TypeScript, and Supabase. Distributed architecture experience required.",
            },
            {
              id: "demo-req-2",
              title: "Enterprise Account Executive",
              department: "Sales & Partnerships",
              location: "Mumbai / Hybrid",
              description:
                "Drive strategic enterprise B2B sales cycles with Fortune 500 accounts. Experience closing high-ACV SaaS solutions required.",
            },
            {
              id: "demo-req-3",
              title: "Technical Talent Acquisition Partner",
              department: "Human Resources",
              location: "Remote",
              description:
                "Partner with engineering leadership to source, interview, and calibrate top-tier distributed engineering and product talent.",
            },
          ];

    // 4. Semantic Matching with Shree (AI)
    let aiPayload: AiMatchPayload = {
      summary: "",
      matches: [],
    };

    const jobsOverview = activeJobs
      .map(
        (j) =>
          `[JOB_ID: ${j.id}] Title: ${j.title} | Department: ${j.department} | Location: ${j.location}\nDescription: ${j.description}`
      )
      .join("\n\n");

    const prompt = `You are Shree, an autonomous, highly discerning AI Talent Acquisition partner.
Screen this candidate's CV against our current active job openings.

--- ACTIVE JOB OPENINGS ---
${jobsOverview}

--- CANDIDATE CV TEXT ---
${resumeText.slice(0, 4500)}

--- PARSED CANDIDATE SKILLS ---
${candidate.skills.join(", ") || "None specifically identified"}

Instructions:
1. Score each job honestly (0-100) based on genuine skill, experience, and domain alignment.
2. Only include jobs where matchScore >= 50 in the "matches" array. If no jobs match >= 50, "matches" MUST be an empty array [].
3. For matched jobs, list the specific skills that matched, any key missing skills, and a concise 1-2 sentence rationale for the candidate.
4. Provide a warm, professional 1-2 sentence overview in "summary" mentioning their core skills and domain.
5. Respond strictly in JSON:
{
  "summary": "1-2 sentences summarizing candidate strengths and domain",
  "matches": [
    {
      "jobId": "exact JOB_ID string",
      "matchScore": 88,
      "matchedSkills": ["skill1", "skill2"],
      "missingSkills": ["skill3"],
      "reason": "1-2 sentences explaining why they are a strong fit."
    }
  ]
}`;

    try {
      const raw = await callTextModel(prompt, 1000);
      const cleaned = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned) as Partial<AiMatchPayload>;
      aiPayload = {
        summary: parsed.summary || "",
        matches: Array.isArray(parsed.matches)
          ? parsed.matches.filter((m) => typeof m.matchScore === "number" && m.matchScore >= 50)
          : [],
      };
    } catch (aiErr) {
      console.warn("AI matching failed, falling back to heuristic matching:", aiErr);

      // Heuristic fallback matching
      const lowerText = resumeText.toLowerCase();

      const matchedList: MatchResult[] = [];
      for (const job of activeJobs) {
        const titleLower = job.title.toLowerCase();
        const titleWords = titleLower.split(/\s+/).filter((w: string) => w.length > 3);
        const descWords = job.description.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);
        const combined = [...new Set([...titleWords, ...descWords])];

        const matchedSkills = candidate.skills.filter((s) => {
          const sLower = s.toLowerCase();
          return combined.some((w: string) => sLower.includes(w) || w.includes(sLower));
        });

        const titleMatch = titleWords.some((w: string) => lowerText.includes(w)) || lowerText.includes(titleLower);

        let score = 0;
        if (titleMatch) score += 55;
        score += Math.min(40, matchedSkills.length * 15);

        // Department / domain affinity
        if (titleLower.includes("engineer") && (lowerText.includes("engineer") || lowerText.includes("developer"))) {
          if (!titleMatch) score += 30;
        }
        if (titleLower.includes("success") && lowerText.includes("customer")) {
          if (!titleMatch) score += 40;
        }

        if (score >= 50) {
          matchedList.push({
            jobId: job.id,
            matchScore: Math.min(96, score),
            matchedSkills: matchedSkills.length ? matchedSkills : candidate.skills.slice(0, 4),
            missingSkills: [],
            reason: `Your verified experience in ${matchedSkills.slice(0, 3).join(", ") || candidate.skills.slice(0, 3).join(", ") || "this domain"} is a strong fit for the ${job.title} role.`,
          });
        }
      }

      aiPayload = {
        summary: `I analyzed your profile highlighting competencies in ${candidate.skills.slice(0, 4).join(", ") || "your field"}.`,
        matches: matchedList.sort((a, b) => b.matchScore - a.matchScore),
      };
    }

    // Enrich matches with job metadata
    const enrichedMatches = aiPayload.matches
      .map((m) => {
        const job = activeJobs.find((j) => j.id === m.jobId);
        if (!job) return null;
        return {
          jobId: job.id,
          title: job.title,
          department: job.department,
          location: job.location,
          description: job.description,
          matchScore: m.matchScore,
          matchedSkills: m.matchedSkills || [],
          missingSkills: m.missingSkills || [],
          reason: m.reason || `Strong alignment with ${job.title}.`,
        };
      })
      .filter((m): m is NonNullable<typeof m> => m !== null)
      .sort((a, b) => b.matchScore - a.matchScore);

    return NextResponse.json({
      candidate,
      summary: aiPayload.summary,
      matches: enrichedMatches,
      hasMatches: enrichedMatches.length > 0,
      resumeText,
      fileName,
      fileBase64: buffer.toString("base64"),
    });
  } catch (error: unknown) {
    console.error("Error in match-cv route:", error);
    const message = error instanceof Error ? error.message : "Failed to analyze CV.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
