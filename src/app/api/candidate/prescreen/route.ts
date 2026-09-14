import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// Generate tailored pre-screening questions based on role context
function generateRoleQuestions(roleTitle: string, department: string = "", skills: string[] = []): string[] {
  const title = (roleTitle || "").toLowerCase();
  const dept = (department || "").toLowerCase();

  if (title.includes("legal") || dept.includes("legal")) {
    return [
      "Can you give an overview of your legal background and the types of commercial contracts or regulatory frameworks you have handled most recently?",
      "Walk us through a scenario where business stakeholders wanted to move forward with a high-risk commercial deal. How did you structure the terms to protect the company while enabling the business?",
      "How do you manage complex multi-jurisdictional compliance or privacy considerations (such as GDPR, CCPA, or local statutory mandates)?",
      "What motivated you to consider this Legal Counsel role with AskShree, and how do you prioritize competing requests from executive teams?",
    ];
  }

  if (title.includes("engineer") || title.includes("developer") || title.includes("architect") || dept.includes("tech") || dept.includes("engineering")) {
    const primarySkill = skills.length > 0 ? skills[0] : "distributed systems";
    return [
      `Can you share an overview of your technical background and a standout project where you leveraged ${primarySkill} or core architecture?`,
      "Tell us about a complex technical trade-off or architectural compromise you had to make under tight deadlines. What were the alternatives and how did you measure success?",
      "How do you ensure high reliability, observability, and automated testing across distributed production services?",
      "What excites you about building autonomous AI infrastructure with AskShree, and what kind of technical impact are you looking to drive next?",
    ];
  }

  if (title.includes("product") || title.includes("design") || dept.includes("product")) {
    return [
      "Can you walk us through a core product or feature you launched from 0 to 1, and the key metrics you used to validate its impact?",
      "How do you resolve conflicting priorities between customer feature requests, technical debt, and executive strategic mandates?",
      "Describe how you partner closely with engineering and design teams during rapid discovery and sprint cycles.",
      "What draws you to AskShree's autonomous hiring vision, and how would you evolve our candidate and recruiter experiences?",
    ];
  }

  if (title.includes("sales") || title.includes("account") || dept.includes("sales") || dept.includes("revenue")) {
    return [
      "Can you share your track record in enterprise SaaS sales, your typical deal cycle length, and average contract values (ACV)?",
      "Describe a complex enterprise deal that stalled in legal or procurement. How did you navigate executive stakeholders to bring it across the finish line?",
      "How do you qualify outbound prospects and maintain a predictable, high-conversion pipeline?",
      "Why is AskShree's AI talent platform compelling to you, and how would you position our value to Fortune 500 talent leaders?",
    ];
  }

  // General executive / corporate questions
  return [
    `Can you provide an overview of your background and the most impactful achievements relevant to this ${roleTitle || "strategic"} role?`,
    "Tell us about a difficult operational or cross-functional problem you resolved recently. What was your process and what was the outcome?",
    "How do you approach stakeholder communication, alignment, and managing unexpected shifts in priorities?",
    "What motivates you about this opportunity with AskShree, and how does it fit into your long-term career trajectory?",
  ];
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token") || "";

    if (!token) {
      return NextResponse.json(
        { ok: false, error: "Candidate token or ID is required." },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Demo fallback for previewing
    if (token === "demo") {
      return NextResponse.json(
        {
          ok: true,
          data: {
            candidate: {
              id: "demo",
              name: "Alex Rivera",
              company: "Stripe",
              stage: "applied",
              matchScore: 92,
              skills: ["Distributed Systems", "Go", "Kubernetes", "Next.js"],
            },
            requisition: {
              id: "demo-req-1",
              reqNo: "R-2208261",
              title: "Senior Full-Stack Engineer",
              department: "Product Engineering",
              location: "San Francisco / Remote",
            },
            questions: generateRoleQuestions("Senior Full-Stack Engineer", "Product Engineering", ["Distributed Systems", "Go"]),
            bipaConsentRequired: true,
          },
        },
        { headers: CORS_HEADERS }
      );
    }

    const admin = createAdminClient();

    // Query candidate
    const { data: candidate, error: candError } = await admin
      .from("talent_candidates")
      .select("id, name, stage, match_score, tags, current_company, current_location, requisition_id")
      .eq("id", token)
      .maybeSingle();

    if (candError || !candidate) {
      return NextResponse.json(
        { ok: false, error: "Candidate session not found or link has expired." },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    // Query target requisition
    let requisitionData: {
      id: string;
      reqNo: string;
      title: string;
      department: string;
      location: string;
      description?: string;
    } | null = null;

    if (candidate.requisition_id) {
      const { data: req } = await admin
        .from("talent_requisitions")
        .select("id, req_no, title, department, location, description")
        .eq("id", candidate.requisition_id)
        .maybeSingle();

      if (req) {
        requisitionData = {
          id: req.id,
          reqNo: req.req_no || "REQ-LIVE",
          title: req.title || "Strategic Opening",
          department: req.department || "General",
          location: req.location || "Remote",
          description: req.description || "",
        };
      }
    }

    const skills = Array.isArray(candidate.tags) ? candidate.tags : [];
    const questions = generateRoleQuestions(
      requisitionData?.title || "Key Role",
      requisitionData?.department || "",
      skills
    );

    return NextResponse.json(
      {
        ok: true,
        data: {
          candidate: {
            id: candidate.id,
            name: candidate.name,
            company: candidate.current_company,
            stage: candidate.stage,
            matchScore: candidate.match_score,
            skills,
          },
          requisition: requisitionData,
          questions,
          bipaConsentRequired: true,
        },
      },
      { headers: CORS_HEADERS }
    );
  } catch (err) {
    console.error("[prescreen] unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error loading pre-screening session." },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
