"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import Link from "next/link";
import type { ShreeDecisionRecord, LaneTrustRecord } from "@/lib/agent/shreeOrchestrator";

export type SourcedCandidate = {
  id: string;
  name: string;
  email?: string;
  stage?: string;
  experience_years?: number | string | null;
  current_company: string | null;
  current_location: string | null;
  linkedin_url: string | null;
  match_score: number | null;
  source: string | null;
  created_at: string;
  tags?: string[];
  requisition?: {
    id: string;
    title: string;
    req_no: string;
  };
};

type OutreachDrafts = {
  candidateId: string;
  candidateName: string;
  requisitionTitle: string;
  engageUrl: string;
  drafts: {
    linkedin: {
      message: string;
      charCount?: number;
    };
    email: {
      subject: string;
      body: string;
    };
    whatsapp: {
      message: string;
    };
  };
};

export default function ShreeRecruiterCockpit({
  requisitionId,
  onCandidateUpdated,
}: {
  requisitionId?: string;
  onCandidateUpdated?: () => void;
}) {
  const [decisions, setDecisions] = useState<ShreeDecisionRecord[]>([]);
  const [lanes, setLanes] = useState<LaneTrustRecord[]>([]);
  const [sourcedCandidates, setSourcedCandidates] = useState<SourcedCandidate[]>([]);
  const [offerCandidates, setOfferCandidates] = useState<SourcedCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [generatingOfferId, setGeneratingOfferId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"queue" | "outreach" | "offers" | "trust">("queue");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Outreach Modal State
  const [selectedCandidate, setSelectedCandidate] = useState<SourcedCandidate | null>(null);
  const [outreachDraft, setOutreachDraft] = useState<OutreachDrafts | null>(null);
  const [generatingOutreach, setGeneratingOutreach] = useState(false);
  const [outreachModalOpen, setOutreachModalOpen] = useState(false);
  const [activeChannel, setActiveChannel] = useState<"linkedin" | "email" | "whatsapp" | "link">("linkedin");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  async function loadData() {
    try {
      setLoading(true);
      const reqParam = requisitionId ? `?requisitionId=${encodeURIComponent(requisitionId)}` : "";
      const [decRes, trustRes, candRes] = await Promise.all([
        fetch(`/api/talent-ai/shree/decisions${reqParam}`),
        fetch(`/api/talent-ai/shree/trust`),
        fetch(`/api/talent-ai/candidates${reqParam}`),
      ]);
      const decData = await decRes.json();
      const trustData = await trustRes.json();
      const candData = await candRes.json();

      const loadedDecisions = decData.decisions && decData.decisions.length > 0 ? decData.decisions : SAMPLE_DECISIONS;
      const loadedLanes = trustData.lanes && trustData.lanes.length > 0 ? trustData.lanes : SAMPLE_LANES;
      
      const allCandidates = candData.candidates || [];
      const sourced = allCandidates.filter((c: any) => c.stage === "sourced");
      const loadedSourced = sourced.length > 0 ? sourced : SAMPLE_SOURCED;
      const forOffers = allCandidates.filter((c: any) => ["interview", "offer", "hired"].includes(c.stage));

      setDecisions(loadedDecisions);
      setLanes(loadedLanes);
      setSourcedCandidates(loadedSourced);
      setOfferCandidates(forOffers);
    } catch (err) {
      console.error("Failed to load Shree cockpit data:", err);
      setDecisions(SAMPLE_DECISIONS);
      setLanes(SAMPLE_LANES);
      setSourcedCandidates(SAMPLE_SOURCED);
      setOfferCandidates([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateOffer(candId: string) {
    try {
      setGeneratingOfferId(candId);
      const res = await fetch("/api/candidate/offer/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId: candId }),
      });
      const json = await res.json();
      if (json.ok) {
        await loadData();
        if (onCandidateUpdated) onCandidateUpdated();
      } else {
        alert(json.error || "Failed to generate offer.");
      }
    } catch (e) {
      console.error("Offer generation failed:", e);
      alert("Network error generating offer.");
    } finally {
      setGeneratingOfferId(null);
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

  async function handleGenerateOutreach(candidate: SourcedCandidate) {
    setSelectedCandidate(candidate);
    setOutreachModalOpen(true);
    setGeneratingOutreach(true);
    setOutreachDraft(null);

    try {
      const res = await fetch("/api/v1/agent/outreach/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: candidate.id,
          requisitionId: candidate.requisition?.id || null,
          tone: "conversational",
        }),
      });
      const json = await res.json();
      if (res.ok && json.ok && json.data) {
        setOutreachDraft(json.data);
      } else {
        // Fallback draft
        const engageUrl = `https://www.askshree.com/candidate/engage?token=${candidate.id}`;
        setOutreachDraft({
          candidateId: candidate.id,
          candidateName: candidate.name,
          requisitionTitle: candidate.requisition?.title || "Strategic Role",
          engageUrl,
          drafts: {
            linkedin: {
              message: `Hi ${candidate.name.split(" ")[0]}, loved your background at ${candidate.current_company || "your team"}. We have an open ${candidate.requisition?.title || "opportunity"} that aligns directly with your expertise. Check out the details here: ${engageUrl}`,
              charCount: 220,
            },
            email: {
              subject: `${candidate.name.split(" ")[0]} — ${candidate.requisition?.title || "Role"} opportunity at AskShree`,
              body: `Hi ${candidate.name.split(" ")[0]},\n\nI came across your profile and was impressed by your track record at ${candidate.current_company || "your company"}. We are hiring for a ${candidate.requisition?.title || "strategic role"} and would love for you to explore it.\n\nYou can review the role and apply in 1 click here:\n${engageUrl}\n\nBest,\nShree Talent Partner`,
            },
            whatsapp: {
              message: `Hi ${candidate.name.split(" ")[0]}! This is Shree from AskShree. We loved your background and have a standout role that matches your skills: ${engageUrl}`,
            },
          },
        });
      }
    } catch {
      // Fallback draft on network error
      const engageUrl = `https://www.askshree.com/candidate/engage?token=${candidate.id}`;
      setOutreachDraft({
        candidateId: candidate.id,
        candidateName: candidate.name,
        requisitionTitle: candidate.requisition?.title || "Strategic Role",
        engageUrl,
        drafts: {
          linkedin: {
            message: `Hi ${candidate.name.split(" ")[0]}, came across your profile at ${candidate.current_company}. Check out our opening: ${engageUrl}`,
          },
          email: {
            subject: `Role alignment at AskShree`,
            body: `Hi ${candidate.name.split(" ")[0]},\n\nCheck out the role here: ${engageUrl}`,
          },
          whatsapp: {
            message: `Hi ${candidate.name.split(" ")[0]}! Check out this role: ${engageUrl}`,
          },
        },
      });
    } finally {
      setGeneratingOutreach(false);
    }
  }

  function handleCopy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
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
              Autonomous candidate screening, shadow reviews, and personalized candidate outreach.
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
            onClick={() => setActiveTab("outreach")}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === "outreach"
                ? "bg-brand text-white shadow-button"
                : "text-ink-2 hover:bg-page hover:text-ink"
            }`}
          >
            <Icon name="send" size={14} />
            Sourced Outreach
            {sourcedCandidates.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white text-brand font-bold">
                {sourcedCandidates.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("offers")}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === "offers"
                ? "bg-brand text-white shadow-button"
                : "text-ink-2 hover:bg-page hover:text-ink"
            }`}
          >
            <Icon name="briefcase" size={14} />
            Offers &amp; Handoff
            {offerCandidates.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white text-brand font-bold">
                {offerCandidates.length}
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
          <div className="py-12 text-center text-xs text-ink-muted">
            Checking Shree decisions, sourced talent, and graduation metrics...
          </div>
        ) : activeTab === "queue" ? (
          /* TAB 1: REVIEW QUEUE */
          <div>
            {decisions.length === 0 ? (
              <div className="py-10 text-center text-ink-muted">
                <div className="w-12 h-12 mx-auto rounded-full bg-page flex items-center justify-center text-ink-muted mb-2">
                  <Icon name="check" size={20} />
                </div>
                <p className="text-sm font-medium text-ink">Review queue is clean!</p>
                <p className="text-xs mt-1 text-ink-muted">
                  All candidate recommendations have been resolved.
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
                              <span className="font-bold text-sm text-ink font-display">
                                {cand?.name || "Candidate"}
                              </span>
                              {cand?.match_score && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                  🎯 {cand.match_score}% Fit
                                </span>
                              )}
                              <span className="text-[9.5px] font-semibold px-2 py-0.5 rounded bg-page text-ink-muted border border-border">
                                {cand?.stage || "applied"}
                              </span>
                            </div>
                            <p className="text-xs text-ink-muted mt-0.5">
                              {cand?.current_company ? `🏢 ${cand.current_company}` : ""} • Target:{" "}
                              <strong className="text-ink font-medium">{req?.title || "Role"}</strong>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDecision(d.id, "approved_as_is", d.target_stage || "screening")}
                            disabled={resolvingId === d.id}
                            className="px-3 py-1.5 rounded-xl bg-good hover:bg-good/90 text-white text-xs font-bold shadow-soft-sm transition-colors"
                          >
                            ✓ Approve ({d.target_stage || "Advance"})
                          </button>
                          <button
                            onClick={() => handleDecision(d.id, "rejected")}
                            disabled={resolvingId === d.id}
                            className="px-3 py-1.5 rounded-xl border border-border hover:bg-critical-wash text-critical text-xs font-semibold transition-colors"
                          >
                            Decline
                          </button>
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : d.id)}
                            className="p-1.5 rounded-xl border border-border text-ink-muted hover:text-ink transition-colors"
                          >
                            <Icon name={isExpanded ? "chevronUp" : "chevronDown"} size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Summary */}
                      <p className="text-xs text-ink mt-3 leading-relaxed bg-page p-3 rounded-xl border border-border/70">
                        <strong className="text-brand">Shree Rationale: </strong>
                        {r?.summary || "Fit evaluated against core requirements."}
                      </p>

                      {/* Citations */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-border grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          <div className="bg-good-wash/50 border border-good/20 rounded-xl p-3">
                            <span className="font-bold text-good-text block mb-1.5">✓ Matched Criteria</span>
                            {(r?.matched_criteria || []).map((m, idx) => (
                              <div key={idx} className="mb-1 text-ink">
                                • {m.criteria}: <span className="text-ink-muted italic">&ldquo;{m.evidence}&rdquo;</span>
                              </div>
                            ))}
                          </div>
                          <div className="bg-brand-wash/50 border border-brand/20 rounded-xl p-3">
                            <span className="font-bold text-brand block mb-1.5">⚠ Probes &amp; Missing Criteria</span>
                            {(r?.missing_criteria || []).map((gap, idx) => (
                              <div key={idx} className="mb-1 text-ink">
                                • {gap.criteria}: <span className="text-ink-muted">{gap.impact}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : activeTab === "outreach" ? (
          /* TAB 2: SOURCED OUTREACH QUEUE */
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-gradient-to-r from-brand-wash/60 via-surface to-surface border border-brand/20 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-ink font-display">
                  Sourced Talent Queue (Ready for AI Outreach)
                </h4>
                <p className="text-xs text-ink-muted mt-0.5">
                  Candidates brought in via the Chrome Extension or Ingestion API. They stay in the <strong>Sourced</strong> stage until they actively confirm interest via your outreach link.
                </p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-brand text-white font-bold shadow-soft-sm">
                {sourcedCandidates.length} Awaiting Contact
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sourcedCandidates.map((cand) => (
                <div
                  key={cand.id}
                  className="border border-border rounded-2xl p-4.5 bg-surface hover:border-brand/40 shadow-soft-sm transition-all space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-ink font-display">
                            {cand.name}
                          </span>
                          <span className="text-[9.5px] font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                            Sourced
                          </span>
                        </div>
                        <p className="text-xs text-ink-muted mt-0.5">
                          {cand.current_company ? `🏢 ${cand.current_company}` : ""}
                          {cand.current_location ? ` • 📍 ${cand.current_location}` : ""}
                        </p>
                      </div>

                      {cand.match_score && (
                        <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 whitespace-nowrap">
                          🎯 {cand.match_score}% Fit
                        </span>
                      )}
                    </div>

                    {cand.tags && cand.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {cand.tags.slice(0, 4).map((tag, idx) => (
                          <span
                            key={idx}
                            className="text-[9.5px] px-2 py-0.5 rounded-md bg-page text-ink-muted border border-border"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-border flex items-center justify-between">
                    <span className="text-[11px] text-ink-muted">
                      Source: <strong>{cand.source || "LinkedIn Extension"}</strong>
                    </span>
                    <button
                      onClick={() => handleGenerateOutreach(cand)}
                      className="px-3 py-1.5 rounded-xl bg-brand hover:bg-brand-dark text-white text-xs font-bold shadow-soft-sm transition-all flex items-center gap-1.5"
                    >
                      <span>✨</span>
                      <span>Generate Outreach</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : activeTab === "offers" ? (
          /* TAB 3: OFFERS & HANDOFF VIEW */
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-bold text-ink font-display">
                  Autonomous Offer Orchestration &amp; Day-One Handoff
                </h4>
                <p className="text-xs text-ink-muted">
                  Orchestrate executive compensation, review digital signature envelopes, and monitor Day-One onboarding.
                </p>
              </div>
              <span className="text-xs text-brand font-bold px-3 py-1 rounded-full bg-brand-wash border border-brand/20">
                {offerCandidates.length} Pipeline Candidates
              </span>
            </div>

            {offerCandidates.length === 0 ? (
              <div className="py-12 text-center text-ink-muted bg-page rounded-xl border border-border">
                <div className="w-12 h-12 mx-auto rounded-full bg-surface border border-border flex items-center justify-center text-ink-muted mb-2 text-xl">
                  📄
                </div>
                <p className="text-sm font-medium text-ink">No candidates in interview or offer stage yet.</p>
                <p className="text-xs mt-1 text-ink-muted">
                  Candidates who complete screening and interview rounds appear here for 1-click offer generation.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {offerCandidates.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 rounded-xl bg-surface border border-border hover:border-brand/40 transition-all flex flex-wrap items-center justify-between gap-3 shadow-soft-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-wash text-brand border border-brand/20 flex items-center justify-center font-bold text-sm">
                        {c.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="text-sm font-bold text-ink font-display">{c.name}</h5>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              c.stage === "hired"
                                ? "bg-good-wash text-good-text border border-good/20"
                                : c.stage === "offer"
                                ? "bg-brand-wash text-brand border border-brand/20"
                                : "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                            }`}
                          >
                            {(c.stage || "candidate").toUpperCase()}
                          </span>
                        </div>
                        <p className="text-xs text-ink-muted">
                          {c.email} • {c.current_company || "Direct Talent"} {c.experience_years ? `• ${c.experience_years}y exp` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {c.stage === "interview" && (
                        <button
                          onClick={() => handleGenerateOffer(c.id)}
                          disabled={generatingOfferId === c.id}
                          className="px-4 py-2 rounded-xl bg-brand hover:bg-brand-dark text-white text-xs font-bold shadow-soft transition-all hover:scale-[1.02] flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <span>✨</span>
                          <span>{generatingOfferId === c.id ? "Generating..." : "Generate Executive Offer ›"}</span>
                        </button>
                      )}

                      {c.stage === "offer" && (
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/candidate/offer/${encodeURIComponent(c.id)}`}
                            target="_blank"
                            className="px-4 py-2 rounded-xl bg-brand hover:bg-brand-dark text-white text-xs font-bold shadow-soft transition-all hover:scale-[1.02] flex items-center gap-1.5"
                          >
                            <span>📄</span>
                            <span>Review Offer Portal ›</span>
                          </Link>
                          <button
                            onClick={() => handleCopy(`${window.location.origin}/candidate/offer/${c.id}`, `offer-${c.id}`)}
                            className="px-3 py-2 rounded-xl bg-page border border-border text-ink hover:border-brand/40 text-xs font-semibold transition-all"
                          >
                            {copiedKey === `offer-${c.id}` ? "Copied Link! ✓" : "Copy Signing Link"}
                          </button>
                        </div>
                      )}

                      {c.stage === "hired" && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-good flex items-center gap-1 px-3 py-1.5 rounded-xl bg-good-wash border border-good/20">
                            <span>✓</span> Officially Hired
                          </span>
                          <Link
                            href={`/candidate/offer/${encodeURIComponent(c.id)}`}
                            target="_blank"
                            className="px-3 py-1.5 rounded-xl bg-page border border-border hover:border-brand/40 text-xs font-bold text-ink"
                          >
                            View Agreement ›
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* TAB 3: TRUST GRADUATION VIEW */
          <div>
            <div className="mb-4 bg-surface border border-border rounded-xl p-3.5 text-xs text-ink-2 shadow-soft-sm">
              <span className="font-bold text-ink">How Trust Graduation Works: </span>
              Lanes start in Shadow Mode. As humans agree with Shree&apos;s screening decisions, the lane graduates to autonomous execution.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {lanes.map((lane) => (
                <div key={lane.id} className="border border-border rounded-2xl p-4 bg-surface shadow-soft-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-ink">{lane.role_family}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        lane.is_autonomous
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                      }`}
                    >
                      {lane.is_autonomous ? "Autonomous" : "Shadow Mode"}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-ink-muted">
                    <div className="flex justify-between">
                      <span>Evaluations:</span>
                      <strong className="text-ink">{lane.total_evaluations}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Agreement Rate:</span>
                      <strong className="text-good">{(lane.agreement_rate * 100).toFixed(1)}%</strong>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleKillSwitch(lane.role_family, lane.kill_switch_engaged)}
                    className="w-full py-1.5 rounded-xl text-xs font-semibold border border-border hover:bg-page transition-colors"
                  >
                    {lane.kill_switch_engaged ? "Re-engage Lane" : "Emergency Pause"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* OUTREACH GENERATION MODAL / DRAWER */}
      {outreachModalOpen && selectedCandidate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl shadow-soft max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-gradient-to-r from-brand-wash/40 to-surface">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand text-white flex items-center justify-center font-bold text-sm shadow-soft-sm">
                  ✨
                </div>
                <div>
                  <h3 className="font-bold text-base text-ink font-display">
                    Shree Outreach Ghostwriter
                  </h3>
                  <p className="text-xs text-ink-muted">
                    Drafting personalized outreach for <strong>{selectedCandidate.name}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOutreachModalOpen(false)}
                className="w-8 h-8 rounded-full border border-border hover:bg-page flex items-center justify-center text-ink-muted hover:text-ink text-sm transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4 flex-1 overflow-y-auto">
              {generatingOutreach && (
                <div className="py-12 text-center text-xs text-ink-muted space-y-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand animate-pulse inline-block" />
                  <p>Shree is analyzing candidate trajectory and crafting personalized messages...</p>
                </div>
              )}

              {!generatingOutreach && outreachDraft && (
                <div className="space-y-4">
                  {/* Channel Selector */}
                  <div className="flex items-center gap-2 border-b border-border pb-2 text-xs">
                    <button
                      onClick={() => setActiveChannel("linkedin")}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                        activeChannel === "linkedin"
                          ? "bg-brand text-white shadow-soft-sm"
                          : "text-ink-muted hover:text-ink hover:bg-page"
                      }`}
                    >
                      LinkedIn InMail
                    </button>
                    <button
                      onClick={() => setActiveChannel("email")}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                        activeChannel === "email"
                          ? "bg-brand text-white shadow-soft-sm"
                          : "text-ink-muted hover:text-ink hover:bg-page"
                      }`}
                    >
                      Executive Cold Email
                    </button>
                    <button
                      onClick={() => setActiveChannel("whatsapp")}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                        activeChannel === "whatsapp"
                          ? "bg-brand text-white shadow-soft-sm"
                          : "text-ink-muted hover:text-ink hover:bg-page"
                      }`}
                    >
                      WhatsApp Message
                    </button>
                    <button
                      onClick={() => setActiveChannel("link")}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                        activeChannel === "link"
                          ? "bg-brand text-white shadow-soft-sm"
                          : "text-ink-muted hover:text-ink hover:bg-page"
                      }`}
                    >
                      Priority Link
                    </button>
                  </div>

                  {/* Channel 1: LinkedIn */}
                  {activeChannel === "linkedin" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-ink-muted">
                        <span>Connection Request / InMail (Ready to paste)</span>
                        <span className="font-mono text-[11px]">
                          {outreachDraft.drafts.linkedin.message.length} chars
                        </span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-page border border-border font-sans text-xs text-ink leading-relaxed whitespace-pre-wrap">
                        {outreachDraft.drafts.linkedin.message}
                      </div>
                      <button
                        onClick={() => handleCopy(outreachDraft.drafts.linkedin.message, "linkedin")}
                        className="px-4 py-2 rounded-xl bg-brand hover:bg-brand-dark text-white text-xs font-bold shadow-soft-sm transition-colors flex items-center gap-1.5"
                      >
                        <Icon name="copy" size={13} />
                        <span>{copiedKey === "linkedin" ? "✓ Copied to Clipboard!" : "Copy LinkedIn Message"}</span>
                      </button>
                    </div>
                  )}

                  {/* Channel 2: Email */}
                  {activeChannel === "email" && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-[11px] font-bold text-ink-muted block mb-1">Subject Line</label>
                        <div className="p-2.5 rounded-xl bg-page border border-border text-xs font-bold text-ink flex items-center justify-between">
                          <span>{outreachDraft.drafts.email.subject}</span>
                          <button
                            onClick={() => handleCopy(outreachDraft.drafts.email.subject, "email-subject")}
                            className="text-xs text-brand hover:underline font-medium"
                          >
                            {copiedKey === "email-subject" ? "✓ Copied" : "Copy"}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-ink-muted block mb-1">Email Body</label>
                        <div className="p-3.5 rounded-xl bg-page border border-border font-sans text-xs text-ink leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                          {outreachDraft.drafts.email.body}
                        </div>
                      </div>
                      <button
                        onClick={() => handleCopy(outreachDraft.drafts.email.body, "email-body")}
                        className="px-4 py-2 rounded-xl bg-brand hover:bg-brand-dark text-white text-xs font-bold shadow-soft-sm transition-colors flex items-center gap-1.5"
                      >
                        <Icon name="copy" size={13} />
                        <span>{copiedKey === "email-body" ? "✓ Copied to Clipboard!" : "Copy Email Body"}</span>
                      </button>
                    </div>
                  )}

                  {/* Channel 3: WhatsApp */}
                  {activeChannel === "whatsapp" && (
                    <div className="space-y-3">
                      <div className="text-xs text-ink-muted">Mobile Outreach Snippet</div>
                      <div className="p-3.5 rounded-xl bg-page border border-border font-sans text-xs text-ink leading-relaxed whitespace-pre-wrap">
                        {outreachDraft.drafts.whatsapp.message}
                      </div>
                      <button
                        onClick={() => handleCopy(outreachDraft.drafts.whatsapp.message, "whatsapp")}
                        className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold shadow-soft-sm transition-colors flex items-center gap-1.5"
                      >
                        <Icon name="copy" size={13} />
                        <span>{copiedKey === "whatsapp" ? "✓ Copied to Clipboard!" : "Copy WhatsApp Message"}</span>
                      </button>
                    </div>
                  )}

                  {/* Channel 4: Priority Link */}
                  {activeChannel === "link" && (
                    <div className="space-y-3">
                      <div className="text-xs text-ink-muted">
                        Secure Tokenized Engagement Link (Directs candidate to priority invitation without upfront password)
                      </div>
                      <div className="p-3 rounded-xl bg-page border border-border font-mono text-[11px] text-ink break-all select-all">
                        {outreachDraft.engageUrl}
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleCopy(outreachDraft.engageUrl, "engage-link")}
                          className="px-4 py-2 rounded-xl bg-brand hover:bg-brand-dark text-white text-xs font-bold shadow-soft-sm transition-colors flex items-center gap-1.5"
                        >
                          <Icon name="copy" size={13} />
                          <span>{copiedKey === "engage-link" ? "✓ Copied Link" : "Copy Link"}</span>
                        </button>
                        <a
                          href={outreachDraft.engageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-bold text-brand hover:underline"
                        >
                          Preview Invitation Page ›
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border flex items-center justify-between bg-surface">
              <span className="text-xs text-ink-muted">
                Candidate Stage: <strong>Sourced</strong> (Transitions to <strong>Applied</strong> upon link click)
              </span>
              <button
                onClick={() => setOutreachModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-page border border-border hover:bg-surface text-ink text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const SAMPLE_SOURCED: SourcedCandidate[] = [
  {
    id: "sample-cand-1",
    name: "Arjun Mehta",
    current_company: "Uber",
    current_location: "Bengaluru, India",
    linkedin_url: "https://linkedin.com/in/arjun-mehta-distributed",
    match_score: 96,
    source: "LinkedIn Extension",
    created_at: new Date().toISOString(),
    tags: ["Go", "Distributed Systems", "Kubernetes", "gRPC", "Kafka"],
    requisition: {
      id: "req-1",
      title: "Senior Backend Engineer",
      req_no: "R-22082607",
    },
  },
  {
    id: "sample-cand-2",
    name: "Devin Thorpe",
    current_company: "Cloudflare",
    current_location: "San Francisco, CA",
    linkedin_url: "https://linkedin.com/in/devin-thorpe-systems",
    match_score: 91,
    source: "LinkedIn Extension",
    created_at: new Date(Date.now() - 3600000).toISOString(),
    tags: ["Go", "Kubernetes", "Kafka", "Rust"],
    requisition: {
      id: "req-1",
      title: "Senior Backend Engineer",
      req_no: "R-22082607",
    },
  },
];

const SAMPLE_DECISIONS: ShreeDecisionRecord[] = [
  {
    id: "demo-dec-1",
    org_id: "demo-org",
    requisition_id: "req-1",
    candidate_id: "cand-1",
    action_type: "screen",
    target_stage: "screening",
    shree_confidence: 0.94,
    human_decision: "pending",
    graduated_at_execution: false,
    created_at: new Date().toISOString(),
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
      summary: "Exceptional distributed systems background. Led the migration of Stripe core authorization engine to a high-throughput event-driven microservices architecture.",
      matched_criteria: [
        {
          criteria: "High-Throughput Distributed Systems",
          evidence: "Architected event-driven ingestion pipeline processing 2B+ daily financial events with zero data loss.",
        },
        {
          criteria: "Polyglot Language Fluency",
          evidence: "Extensive production experience in Go, TypeScript, Rust, and PostgreSQL clustering.",
        },
      ],
      missing_criteria: [],
      interview_focus_areas: ["Evaluate experience with real-time WebSocket protocol synchronization at scale."],
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
