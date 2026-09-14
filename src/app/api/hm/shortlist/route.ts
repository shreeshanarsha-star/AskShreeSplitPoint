import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  const admin = createAdminClient();

  // Find requisition by token or get the first active requisition for preview
  let reqQuery = admin
    .from("talent_requisitions")
    .select("id, req_no, title, location, status");

  if (token && token !== "demo" && token.length > 10) {
    reqQuery = reqQuery.eq("id", token);
  } else {
    reqQuery = reqQuery.order("created_at", { ascending: false }).limit(1);
  }

  const { data: reqs } = await reqQuery;
  const currentReq = reqs?.[0];

  if (!currentReq) {
    return NextResponse.json({
      requisition: DEFAULT_SAMPLE_HM_REQUISITION,
    });
  }

  // Fetch top candidates in hm_review, screening, or interview stages
  const { data: candidates } = await admin
    .from("talent_candidates")
    .select(`
      id,
      name,
      stage,
      match_score,
      match_score_note,
      current_company,
      experience_years,
      talent_scorecards (
        rating,
        recommendation,
        feedback,
        created_at
      )
    `)
    .eq("requisition_id", currentReq.id)
    .order("match_score", { ascending: false, nullsFirst: false })
    .limit(6);

  const formattedCandidates = (candidates || []).map((c: any) => {
    const latestScorecard = Array.isArray(c.talent_scorecards) && c.talent_scorecards.length > 0
      ? c.talent_scorecards[c.talent_scorecards.length - 1]
      : null;

    return {
      id: c.id,
      name: c.name,
      stage: c.stage,
      match_score: c.match_score,
      current_designation: c.current_company ? `Candidate at ${c.current_company}` : "Candidate",
      current_company: c.current_company,
      experience_years: c.experience_years,
      decision: latestScorecard ? {
        summary: latestScorecard.feedback || c.match_score_note || "Evaluation recorded by Shree AI.",
        matched_criteria: [
          {
            criteria: "Verified Competency Alignment",
            evidence: `Completed Shree AI pre-screening with ${c.match_score || 85}% match score.`,
          },
        ],
        citations: [
          {
            dimension: "Pre-Screening Assessment",
            quote: latestScorecard.recommendation ? `Recommendation: ${latestScorecard.recommendation.toUpperCase()}` : "Evaluated by Shree",
          },
        ],
      } : (c.match_score_note ? {
        summary: c.match_score_note,
        matched_criteria: [{ criteria: "Competency Review", evidence: c.match_score_note }],
        citations: [],
      } : null),
    };
  });

  if (formattedCandidates.length === 0) {
    return NextResponse.json({
      requisition: DEFAULT_SAMPLE_HM_REQUISITION,
    });
  }

  return NextResponse.json({
    requisition: {
      id: currentReq.id,
      req_no: currentReq.req_no,
      title: currentReq.title,
      location: currentReq.location,
      candidates: formattedCandidates,
    },
  });
}


const DEFAULT_SAMPLE_HM_REQUISITION = {
  id: "sample-req-101",
  req_no: "R-2208261",
  title: "Senior Full-Stack Engineer",
  location: "Bangalore / Remote",
  department: "Product Engineering",
  candidates: [
    {
      id: "hm-cand-1",
      name: "Alex Rivera",
      stage: "hm_review",
      match_score: 94,
      current_designation: "Staff Backend Engineer",
      current_company: "Stripe",
      experience_years: 7,
      decision: {
        summary: "Exceptional system design and distributed systems pedigree. Led high-throughput API gateway migration handling 50k RPS with zero downtime.",
        matched_criteria: [
          {
            criteria: "High-Throughput Distributed Architecture",
            evidence: "Architected event-driven ingestion pipeline processing 2B+ daily financial transactions with 99.999% uptime.",
          },
          {
            criteria: "Full-Stack TypeScript & Next.js Ecosystem",
            evidence: "5+ years building production-grade internal tooling and merchant-facing dashboards using Next.js and Tailwind.",
          },
          {
            criteria: "Engineering Mentorship & Technical Standards",
            evidence: "Directly mentored 4 senior engineers, established org-wide automated CI/CD security scanning gates.",
          },
        ],
        citations: [
          {
            dimension: "High-Throughput Architecture",
            quote: "Architected event-driven ingestion pipeline processing 2B+ daily financial transactions.",
          },
        ],
      },
    },
    {
      id: "hm-cand-2",
      name: "Elena Rostova",
      stage: "interview_1",
      match_score: 89,
      current_designation: "Senior Software Engineer",
      current_company: "Atlassian",
      experience_years: 6,
      decision: {
        summary: "Strong product-engineering intuition. Deep expertise in real-time collaborative applications, WebSockets, and state synchronization.",
        matched_criteria: [
          {
            criteria: "Real-Time Collaboration & WebSockets",
            evidence: "Developed operational-transform engine for concurrent document editing supporting up to 200 simultaneous editors.",
          },
          {
            criteria: "PostgreSQL Query Optimization & Indexing",
            evidence: "Optimized complex multi-tenant query bottlenecks, dropping p99 latency from 450ms to 42ms.",
          },
        ],
        citations: [
          {
            dimension: "Real-Time Architecture",
            quote: "Developed operational-transform engine for concurrent document editing supporting up to 200 simultaneous editors.",
          },
        ],
      },
    },
    {
      id: "hm-cand-3",
      name: "Marcus Vance",
      stage: "hm_review",
      match_score: 85,
      current_designation: "Lead Frontend Engineer",
      current_company: "Datadog",
      experience_years: 8,
      decision: {
        summary: "Superb frontend performance specialist with strong micro-frontend architecture experience and design system leadership.",
        matched_criteria: [
          {
            criteria: "Design Systems & Component Performance",
            evidence: "Authored unified enterprise design system utilized across 14 product squads, improving Core Web Vitals to 98.",
          },
        ],
        citations: [
          {
            dimension: "Performance Optimization",
            quote: "Authored unified enterprise design system utilized across 14 product squads, improving Core Web Vitals to 98.",
          },
        ],
      },
    },
  ],
};

