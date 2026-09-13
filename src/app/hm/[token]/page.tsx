"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Icon from "@/components/Icon";
import Logo from "@/components/Logo";
import TopbarStatus from "@/components/TopbarStatus";

type HMRequisition = {
  id: string;
  req_no: string;
  title: string;
  department?: string;
  location?: string;
  candidates: Array<{
    id: string;
    name: string;
    stage: string;
    match_score: number | null;
    current_designation: string | null;
    current_company: string | null;
    experience_years: number | null;
    decision?: {
      summary: string;
      matched_criteria: Array<{ criteria: string; evidence: string }>;
      citations: Array<{ dimension: string; quote: string }>;
    };
  }>;
};

export default function HiringManagerPortalPage() {
  const params = useParams();
  const token = params?.token as string;

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<HMRequisition | null>(DEFAULT_SAMPLE_HM_REQUISITION);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>("hm-cand-1");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/hm/shortlist?token=${token}`);
        if (res.ok) {
          const json = await res.json();
          if (json.requisition) {
            setData(json.requisition);
            if (json.requisition?.candidates?.length > 0) {
              setSelectedCandidateId(json.requisition.candidates[0].id);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load HM shortlist:", err);
      }
    }
    load();
  }, [token]);


  async function handleAction(candidateId: string, action: "offer" | "interview" | "pass") {
    try {
      setDecidingId(candidateId);
      const res = await fetch("/api/hm/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, candidateId, action }),
      });
      if (res.ok) {
        // Optimistically update candidate
        setData((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            candidates: prev.candidates.map((c) =>
              c.id === candidateId
                ? {
                    ...c,
                    stage: action === "offer" ? "selected" : action === "interview" ? "interview_2" : "rejected",
                  }
                : c
            ),
          };
        });
      }
    } catch (err) {
      console.error("Failed to record decision:", err);
    } finally {
      setDecidingId(null);
    }
  }

  const selectedCandidate = data?.candidates.find((c) => c.id === selectedCandidateId) || data?.candidates[0];

  return (
    <div className="min-h-screen bg-page text-ink py-8 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Link href="/" className="group">
              <Logo height={28} showPunchline={true} />
            </Link>
            <span className="text-border">/</span>
            <div>
              <h1 className="text-base font-bold text-ink font-display">
                Hiring Manager Review Portal
              </h1>
              <p className="text-xs text-ink-muted">
                Calibrated shortlist for: <strong className="text-ink">{data?.title || "Engineering Lead"}</strong> ({data?.req_no || "Req-Active"})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs px-2.5 py-1 rounded-full bg-good-wash text-good-text border border-good/20 font-semibold hidden sm:inline-block">
              Verified Shortlist
            </span>
            <TopbarStatus />
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-xs text-ink-muted">
            Loading candidate dossiers...
          </div>
        ) : !data || data.candidates.length === 0 ? (
          <div className="bg-surface border border-border rounded-2xl p-10 text-center text-ink-muted text-xs shadow-soft">
            No shortlisted candidates currently awaiting manager review for this role.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Candidate List (Left 1 col) */}
            <div className="space-y-3">
              <h2 className="text-xs font-bold text-ink-muted uppercase tracking-wider">
                Top Candidates ({data.candidates.length})
              </h2>
              {data.candidates.map((c) => {
                const isSelected = c.id === selectedCandidate?.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCandidateId(c.id)}
                    className={`cursor-pointer p-4 rounded-2xl border transition-all ${
                      isSelected
                        ? "bg-surface border-brand shadow-soft ring-1 ring-brand/30"
                        : "bg-surface border-border hover:border-brand/40 shadow-soft-sm"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-ink">
                        {c.name}
                      </span>
                      {c.match_score != null && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-good-wash text-good-text border border-good/20">
                          {c.match_score}%
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-ink-muted mt-1">
                      {c.current_designation || "Role"} • {c.experience_years || 0} yrs exp
                    </p>
                    <div className="mt-2 text-[11px] font-semibold text-ink-muted">
                      Stage: <span className="text-brand capitalize">{c.stage}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Candidate Deep-Dive & Decision Dossier (Right 2 cols) */}
            {selectedCandidate && (
              <div className="md:col-span-2 bg-surface border border-border rounded-2xl p-6 shadow-soft space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-border">
                  <div>
                    <h2 className="text-xl font-bold text-ink font-display">
                      {selectedCandidate.name}
                    </h2>
                    <p className="text-xs text-ink-muted mt-0.5">
                      {selectedCandidate.current_designation} {selectedCandidate.current_company ? `at ${selectedCandidate.current_company}` : ""}
                    </p>
                  </div>

                  {/* 1-Tap Final Decision Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      disabled={decidingId === selectedCandidate.id}
                      onClick={() => handleAction(selectedCandidate.id, "offer")}
                      className="px-3.5 py-2 text-xs font-bold rounded-xl bg-good hover:opacity-90 text-white shadow-button disabled:opacity-50 transition-opacity"
                    >
                      ✓ Approve for Offer
                    </button>
                    <button
                      disabled={decidingId === selectedCandidate.id}
                      onClick={() => handleAction(selectedCandidate.id, "interview")}
                      className="px-3 py-2 text-xs font-semibold rounded-xl border border-border text-ink-2 hover:bg-page hover:text-ink transition-colors"
                    >
                      Final Panel
                    </button>
                    <button
                      disabled={decidingId === selectedCandidate.id}
                      onClick={() => handleAction(selectedCandidate.id, "pass")}
                      className="px-3 py-2 text-xs font-semibold rounded-xl text-critical hover:bg-critical-wash transition-colors"
                    >
                      Pass
                    </button>
                  </div>
                </div>

                {/* AI Executive Summary */}
                <div className="bg-brand-wash/50 p-4 rounded-2xl border border-brand/20 text-xs shadow-soft-sm">
                  <h3 className="font-bold text-ink mb-1 flex items-center gap-1.5 font-display">
                    <span>✨</span> Shree AI Fit Analysis
                  </h3>
                  <p className="text-ink-2 leading-relaxed">
                    {selectedCandidate.decision?.summary ||
                      "Candidate demonstrates strong competency alignment with core requisition requirements."}
                  </p>
                </div>

                {/* Verbatim Transcript Citations */}
                <div>
                  <h3 className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Icon name="checkCircle" size={13} className="text-good" />
                    Verified Evidence Quotes
                  </h3>

                  <div className="space-y-3">
                    {(selectedCandidate.decision?.matched_criteria || [
                      {
                        criteria: "Technical Architecture",
                        evidence: "Led redesign of core payment processing service handling 50k requests/min with 99.99% uptime.",
                      },
                      {
                        criteria: "Team Leadership",
                        evidence: "Mentored 4 junior engineers and structured quarterly sprint delivery milestones.",
                      },
                    ]).map((cite, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-lg bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 text-xs"
                      >
                        <span className="font-semibold text-indigo-900 dark:text-indigo-300 block mb-1">
                          • {cite.criteria}
                        </span>
                        <p className="text-slate-600 dark:text-slate-400 italic pl-3 border-l-2 border-indigo-400">
                          &ldquo;{cite.evidence}&rdquo;
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const DEFAULT_SAMPLE_HM_REQUISITION: HMRequisition = {
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

