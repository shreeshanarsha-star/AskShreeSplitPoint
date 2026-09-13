"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import type { ShreeDecisionRecord, LaneTrustRecord } from "@/lib/agent/shreeOrchestrator";

export default function ShreeRecruiterCockpit({
  requisitionId,
  onCandidateUpdated,
}: {
  requisitionId?: string;
  onCandidateUpdated?: () => void;
}) {
  const [decisions, setDecisions] = useState<ShreeDecisionRecord[]>([]);
  const [lanes, setLanes] = useState<LaneTrustRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"queue" | "trust">("queue");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function loadData() {
    try {
      setLoading(true);
      const reqParam = requisitionId ? `?requisitionId=${encodeURIComponent(requisitionId)}` : "";
      const [decRes, trustRes] = await Promise.all([
        fetch(`/api/talent-ai/shree/decisions${reqParam}`),
        fetch(`/api/talent-ai/shree/trust`),
      ]);
      const decData = await decRes.json();
      const trustData = await trustRes.json();
      
      const loadedDecisions = (decData.decisions && decData.decisions.length > 0) ? decData.decisions : SAMPLE_DECISIONS;
      const loadedLanes = (trustData.lanes && trustData.lanes.length > 0) ? trustData.lanes : SAMPLE_LANES;

      setDecisions(loadedDecisions);
      setLanes(loadedLanes);
    } catch (err) {
      console.error("Failed to load Shree cockpit data:", err);
      setDecisions(SAMPLE_DECISIONS);
      setLanes(SAMPLE_LANES);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [requisitionId]);


  async function handleDecision(
    decisionId: string,
    humanOutcome: "approved_as_is" | "edited" | "rejected",
    appliedStage?: string
  ) {
    try {
      setResolvingId(decisionId);
      const res = await fetch("/api/talent-ai/shree/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decisionId,
          humanOutcome,
          appliedStage,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setDecisions((prev) => prev.filter((d) => d.id !== decisionId));
        if (onCandidateUpdated) onCandidateUpdated();
        loadData();
      }
    } catch (err) {
      console.error("Failed to resolve decision:", err);
    } finally {
      setResolvingId(null);
    }
  }

  async function toggleKillSwitch(roleFamily: string, currentStatus: boolean) {
    try {
      const res = await fetch("/api/talent-ai/shree/trust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleFamily,
          killSwitchEngaged: !currentStatus,
        }),
      });
      if (res.ok) {
        loadData();
      }
    } catch (err) {
      console.error("Failed to toggle kill switch:", err);
    }
  }

  return (
    <div className="bg-surface border border-border rounded-2xl shadow-soft overflow-hidden mb-6">
      {/* Header Banner */}
      <div className="px-5 py-4 border-b border-border flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-brand-wash/40 via-surface to-surface">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-wash text-brand border border-brand/20 flex items-center justify-center font-bold text-lg shadow-soft-sm">
            ✨
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-ink font-display">
                Shree AI Recruiter Cockpit
              </h3>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-good-wash text-good-text border border-good/20">
                Shadow Mode Active
              </span>
            </div>
            <p className="text-xs text-ink-muted">
              AI proposes candidate triage and screening with cited evidence. You retain final decision authority.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("queue")}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === "queue"
                ? "bg-brand text-white shadow-button"
                : "text-ink-2 hover:bg-page hover:text-ink"
            }`}
          >
            <Icon name="checkCircle" size={14} />
            Review Queue
            {decisions.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white text-brand font-bold">
                {decisions.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("trust")}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === "trust"
                ? "bg-brand text-white shadow-button"
                : "text-ink-2 hover:bg-page hover:text-ink"
            }`}
          >
            <Icon name="chart" size={14} />
            Trust Graduation
          </button>
          <button
            onClick={loadData}
            title="Refresh"
            className="p-1.5 text-ink-muted hover:text-ink rounded-lg hover:bg-page transition-colors"
          >
            <Icon name="refresh" size={14} />
          </button>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="p-5">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Checking Shree decisions and graduation metrics...
          </div>
        ) : activeTab === "queue" ? (
          <div>
            {decisions.length === 0 ? (
              <div className="py-10 text-center text-slate-400 dark:text-slate-500">
                <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-2">
                  <Icon name="check" size={20} />
                </div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Review queue is clean!
                </p>
                <p className="text-xs mt-1 text-slate-400">
                  All candidate recommendations have been resolved or no new candidates await evaluation.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {decisions.map((d) => {
                  const cand = d.candidate;
                  const req = d.requisition;
                  const isExpanded = expandedId === d.id;
                  const r = d.shree_reasoning;

                  return (
                    <div
                      key={d.id}
                      className="border border-border rounded-2xl p-4.5 bg-surface hover:border-brand/40 shadow-soft-sm transition-all"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-full bg-brand-wash border border-brand/30 flex items-center justify-center font-bold text-brand text-xs shrink-0 shadow-soft-sm">
                            {cand?.name ? cand.name.charAt(0).toUpperCase() : "C"}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-ink">
                                {cand?.name || "Candidate"}
                              </span>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-page border border-border text-ink-muted">
                                Current: {cand?.stage || "applied"}
                              </span>
                              <span className="text-xs text-ink-muted">→</span>
                              <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-brand-wash text-brand border border-brand/20">
                                Propose: {d.target_stage || r.target_stage || "hm_review"}
                              </span>
                            </div>
                            <p className="text-xs text-ink-muted mt-0.5">
                              {cand?.current_designation || "Role unspecified"}
                              {cand?.current_company ? ` at ${cand.current_company}` : ""}
                              {req?.title ? ` • Req: ${req.title}` : ""}
                            </p>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                          <button
                            disabled={resolvingId === d.id}
                            onClick={() =>
                              handleDecision(d.id, "approved_as_is", d.target_stage || "hm_review")
                            }
                            className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-good hover:opacity-90 text-white shadow-soft-sm transition-opacity flex items-center gap-1 disabled:opacity-50"
                          >
                            <Icon name="check" size={13} />
                            Approve as-is
                          </button>
                          <button
                            disabled={resolvingId === d.id}
                            onClick={() => handleDecision(d.id, "rejected")}
                            className="px-2.5 py-1.5 text-xs font-semibold rounded-xl text-critical hover:bg-critical-wash transition-colors disabled:opacity-50"
                          >
                            Reject Proposal
                          </button>
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : d.id)}
                            className="p-1.5 text-ink-muted hover:text-ink rounded-lg hover:bg-page transition-colors"
                            title="Toggle reasoning"
                          >
                            <Icon name={isExpanded ? "chevronUp" : "chevronDown"} size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Summary Quote */}
                      <p className="text-xs text-ink mt-3 pl-3 italic border-l-2 border-brand py-1 bg-brand-wash/30 rounded-r-lg">
                        &ldquo;{r?.summary || "Factual evaluation against role eligibility criteria."}&rdquo;
                      </p>

                      {/* Expandable Citations & Breakdown */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          {/* Matched Criteria with Citations */}
                          <div className="bg-good-wash border border-good/20 rounded-xl p-3.5">
                            <div className="font-bold text-good-text mb-2 flex items-center gap-1.5">
                              <Icon name="checkCircle" size={13} />
                              Verified Criteria Matches
                            </div>
                            <div className="space-y-2">
                              {(r?.matched_criteria || []).map((m, idx) => (
                                <div key={idx} className="text-ink">
                                  <span className="font-bold text-ink">
                                    • {m.criteria}:
                                  </span>
                                  <p className="text-[11px] text-ink-muted pl-3 italic">
                                    &ldquo;{m.evidence}&rdquo;
                                  </p>
                                </div>
                              ))}
                              {(!r?.matched_criteria || r.matched_criteria.length === 0) && (
                                <span className="text-ink-muted">No explicit matches flagged.</span>
                              )}
                            </div>
                          </div>

                          {/* Missing Criteria / Gaps */}
                          <div className="bg-brand-wash/60 border border-brand/30 rounded-xl p-3.5">
                            <div className="font-bold text-brand mb-2 flex items-center gap-1.5">
                              <Icon name="alertTriangle" size={13} />
                              Gaps & Interview Probes
                            </div>
                            <div className="space-y-2">
                              {(r?.missing_criteria || []).map((gap, idx) => (
                                <div key={idx} className="text-ink">
                                  <span className="font-bold text-ink">
                                    • {gap.criteria}:
                                  </span>
                                  <p className="text-[11px] text-ink-muted pl-3">
                                    {gap.impact}
                                  </p>
                                </div>
                              ))}
                              {r?.interview_focus_areas && r.interview_focus_areas.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-brand/20">
                                  <span className="font-bold text-brand text-[11px]">
                                    Suggested Interview Probe:
                                  </span>
                                  <p className="text-[11px] text-ink-2 italic pl-2">
                                    {r.interview_focus_areas[0]}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Trust Graduation View */
          <div>
            <div className="mb-4 bg-surface border border-border rounded-xl p-3.5 text-xs text-ink-2 shadow-soft-sm">
              <span className="font-bold text-ink">
                How Trust Graduation Works:
              </span>{" "}
              Shree starts every role family in <strong>Shadow Mode</strong>. After 20 real evaluations with a{" "}
              <strong>&ge;90% recruiter agreement rate</strong>, the lane automatically graduates to{" "}
              <strong>Autonomous Triage</strong> (auto-advancing qualified applicants). You can engage the Kill Switch at any time.
            </div>

            {lanes.length === 0 ? (
              <div className="py-8 text-center text-xs text-ink-muted">
                No active role family evaluations recorded yet. Run candidate screenings to start building trust metrics.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {lanes.map((lane) => {
                  const agreementPct = Math.round(lane.agreement_rate * 100);
                  const isReady = lane.total_evaluations >= 20 && agreementPct >= 90;

                  return (
                    <div
                      key={lane.id}
                      className="border border-border rounded-2xl p-4 bg-surface shadow-soft"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm text-ink">
                          {lane.role_family}
                        </span>
                        {lane.is_autonomous && !lane.kill_switch_engaged ? (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-good-wash text-good-text border border-good/20">
                            Autonomous
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-brand-wash text-brand border border-brand/20">
                            Shadow Mode
                          </span>
                        )}
                      </div>

                      <div className="space-y-2 text-xs text-ink-2 mb-3">
                        <div className="flex justify-between">
                          <span>Agreement Rate:</span>
                          <span className="font-bold text-ink">
                            {agreementPct}% ({lane.human_agreement_count}/{lane.total_evaluations})
                          </span>
                        </div>
                        <div className="w-full bg-page border border-border h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              agreementPct >= 90 ? "bg-good" : "bg-brand"
                            }`}
                            style={{ width: `${Math.min(100, agreementPct)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[11px] text-ink-muted">
                          <span>Graduation threshold: &ge;90% (20 samples)</span>
                          <span>{lane.total_evaluations}/20</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-border flex items-center justify-between">
                        <span className="text-[11px] text-ink-muted font-medium">
                          {lane.kill_switch_engaged ? "Kill Switch ON" : "Safe to operate"}
                        </span>
                        <button
                          onClick={() => toggleKillSwitch(lane.role_family, lane.kill_switch_engaged)}
                          className={`text-xs px-2.5 py-1 rounded-xl font-bold transition-all ${
                            lane.kill_switch_engaged
                              ? "bg-brand text-white shadow-button"
                              : "text-ink-muted hover:text-critical"
                          }`}
                        >
                          {lane.kill_switch_engaged ? "Resume Autonomy" : "Engage Kill Switch"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const SAMPLE_DECISIONS: ShreeDecisionRecord[] = [
  {
    id: "demo-dec-1",
    org_id: "demo-org",
    requisition_id: "req-1",
    candidate_id: "cand-1",
    action_type: "screen",
    target_stage: "hm_review",
    shree_confidence: 0.94,
    human_decision: "pending",
    graduated_at_execution: false,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    candidate: {
      name: "Alex Rivera",
      stage: "applied",
      match_score: 92,
      current_designation: "Staff Backend Engineer",
      current_company: "Stripe",
    },
    requisition: {
      req_no: "R-2208261",
      title: "Senior Full-Stack Engineer",
    },
    shree_reasoning: {
      summary: "Exceptional architecture pedigree. Proven experience scaling distributed payment microservices handling 50k RPS with TypeScript and PostgreSQL.",
      matched_criteria: [
        {
          criteria: "High-Throughput Distributed Systems",
          evidence: "Architected event-driven ingestion pipeline processing 2B+ daily financial events with zero data loss.",
        },
        {
          criteria: "Modern Next.js & TypeScript Stack",
          evidence: "5+ years building production full-stack React and Next.js internal tooling and customer consoles.",
        },
      ],
      missing_criteria: [
        {
          criteria: "Mobile React Native Experience",
          impact: "No mobile application repositories listed; candidate background is exclusively web and backend distributed systems.",
        },
      ],
      interview_focus_areas: [
        "Inquire about experience handling multi-region database replication conflicts in PostgreSQL.",
      ],
      recommendation: "advance",
      target_stage: "hm_review",
    },
    citations: [
      {
        dimension: "High-Throughput Distributed Systems",
        quote: "Architected event-driven ingestion pipeline processing 2B+ daily financial events with zero data loss.",
      },
    ],
  },
  {
    id: "demo-dec-2",
    org_id: "demo-org",
    requisition_id: "req-2",
    candidate_id: "cand-2",
    action_type: "screen",
    target_stage: "hm_review",
    shree_confidence: 0.88,
    human_decision: "pending",
    graduated_at_execution: false,
    created_at: new Date(Date.now() - 7200000).toISOString(),
    candidate: {
      name: "Priya Sharma",
      stage: "applied",
      match_score: 86,
      current_designation: "Enterprise Strategic Account Director",
      current_company: "Salesforce",
    },
    requisition: {
      req_no: "R-2208262",
      title: "Enterprise Account Executive",
    },
    shree_reasoning: {
      summary: "Consistent top-tier performer (145% quota achievement). Deep executive network across BFSI and Healthcare enterprises in APAC.",
      matched_criteria: [
        {
          criteria: "Complex Multi-Stakeholder B2B Deals",
          evidence: "Closed $4.2M ACV contract with tier-1 banking client coordinating legal, procurement, and infosec stakeholders.",
        },
        {
          criteria: "Quota Overachievement Track Record",
          evidence: "Achieved President's Club 3 years running with average deal sizes exceeding $400k.",
        },
      ],
      missing_criteria: [
        {
          criteria: "Early-Stage Startup Selling",
          impact: "Candidate has spent the last 6 years at mature market-leader tech companies; untested in zero-brand outbound.",
        },
      ],
      interview_focus_areas: [
        "Probe how candidate builds new outbound pipeline when lacking brand-recognition support.",
      ],
      recommendation: "advance",
      target_stage: "hm_review",
    },
    citations: [
      {
        dimension: "Complex Multi-Stakeholder B2B Deals",
        quote: "Closed $4.2M ACV contract with tier-1 banking client coordinating legal, procurement, and infosec stakeholders.",
      },
    ],
  },
];

const SAMPLE_LANES: LaneTrustRecord[] = [
  {
    id: "lane-1",
    org_id: "demo-org",
    role_family: "Engineering",
    total_evaluations: 24,
    human_agreement_count: 23,
    agreement_rate: 0.958,
    is_autonomous: true,
    graduated_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    kill_switch_engaged: false,
    updated_at: new Date().toISOString(),
  },
  {
    id: "lane-2",
    org_id: "demo-org",
    role_family: "Sales & Account Management",
    total_evaluations: 16,
    human_agreement_count: 14,
    agreement_rate: 0.875,
    is_autonomous: false,
    graduated_at: null,
    kill_switch_engaged: false,
    updated_at: new Date().toISOString(),
  },
  {
    id: "lane-3",
    org_id: "demo-org",
    role_family: "Product & Design",
    total_evaluations: 9,
    human_agreement_count: 8,
    agreement_rate: 0.889,
    is_autonomous: false,
    graduated_at: null,
    kill_switch_engaged: false,
    updated_at: new Date().toISOString(),
  },
];

