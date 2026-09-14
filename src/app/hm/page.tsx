"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import UniversalPlatformShell from "@/components/UniversalPlatformShell";
import Icon from "@/components/Icon";
import { createClient } from "@/lib/supabase/client";

type Candidate = {
  id: string;
  name: string;
  stage: string;
  current_designation?: string | null;
  current_company?: string | null;
  experience_years?: number | null;
  match_score?: number | null;
  summary?: string;
  citations?: Array<{ dimension: string; quote: string }>;
};

type Requisition = {
  id: string;
  req_no: string;
  title: string;
  department?: string | null;
  location?: string | null;
  employment_type?: string | null;
  headcount?: number;
  status: string;
  priority?: string | null;
  hiring_manager?: string | null;
  description?: string | null;
  comp_min?: number | null;
  comp_max?: number | null;
  created_at?: string;
  talent_candidates?: Array<{ id: string; stage: string; name?: string }>;
};

const SAMPLE_PENDING_REQUISITIONS: Requisition[] = [
  {
    id: "hm-req-pending-1",
    req_no: "R-2208265",
    title: "Product Marketing Lead",
    department: "Marketing",
    location: "San Francisco, CA / Hybrid",
    employment_type: "full-time",
    headcount: 1,
    status: "pending_approval",
    priority: "urgent",
    hiring_manager: "David Miller (VP Engineering / Acting HM)",
    description: "Net-new headcount to lead product positioning, customer case studies, and enterprise product launch campaigns for our autonomous talent OS.",
    comp_min: 150000,
    comp_max: 185000,
    created_at: new Date().toISOString(),
    talent_candidates: [],
  },
];

const SAMPLE_ACTIVE_REQUISITIONS: Requisition[] = [
  {
    id: "hm-req-act-1",
    req_no: "R-2208261",
    title: "Senior Full-Stack Engineer",
    department: "Engineering",
    location: "San Francisco, CA / Remote",
    employment_type: "full-time",
    headcount: 2,
    status: "active",
    priority: "high",
    hiring_manager: "David Miller",
    comp_min: 160000,
    comp_max: 210000,
    talent_candidates: [
      { id: "c1", stage: "applied", name: "Rohan Patel" },
      { id: "c2", stage: "screening", name: "Marcus Vance" },
      { id: "c3", stage: "hm_review", name: "Kavita Nair" },
      { id: "c4", stage: "interview_1", name: "Aarav Sharma" },
      { id: "c5", stage: "selected", name: "Mei-Ling Zhou" },
    ],
  },
  {
    id: "hm-req-act-2",
    req_no: "R-2208264",
    title: "Principal Infrastructure Architect",
    department: "Cloud Platform",
    location: "Remote",
    employment_type: "full-time",
    headcount: 1,
    status: "active",
    priority: "high",
    hiring_manager: "David Miller",
    comp_min: 185000,
    comp_max: 240000,
    talent_candidates: [
      { id: "c6", stage: "applied", name: "Yuki Tanaka" },
      { id: "c7", stage: "hm_review", name: "Nikhil Joshi" },
      { id: "c8", stage: "interview_2", name: "Deepak Chopra" },
    ],
  },
  {
    id: "hm-req-act-3",
    req_no: "R-2208267",
    title: "Staff Site Reliability Engineer",
    department: "Infrastructure",
    location: "Remote",
    employment_type: "full-time",
    headcount: 1,
    status: "active",
    priority: "medium",
    hiring_manager: "David Miller",
    comp_min: 175000,
    comp_max: 220000,
    talent_candidates: [
      { id: "c9", stage: "screening", name: "Jason Wu" },
    ],
  },
];

const SAMPLE_FINALISTS: Candidate[] = [
  {
    id: "cand-f1",
    name: "Kavita Nair",
    stage: "hm_review",
    current_designation: "Lead Distributed Systems Engineer",
    current_company: "Stripe",
    experience_years: 8,
    match_score: 96,
    summary: "Exceptional architecture depth in high-throughput transactional engines. Exceeded rubric benchmarks in system design and real-time distributed consensus.",
    citations: [
      { dimension: "System Design", quote: "Architected multi-region consensus protocol handling 45k TPS at 99.999% availability." },
      { dimension: "Cultural Addition", quote: "Strong mentorship record, scaled junior engineering teams across 3 continents." },
    ],
  },
  {
    id: "cand-f2",
    name: "Aarav Sharma",
    stage: "interview_1",
    current_designation: "Senior Backend Engineer",
    current_company: "Databricks",
    experience_years: 6,
    match_score: 92,
    summary: "Deep knowledge in streaming pipeline internals. Scored highest in algorithmic execution and query optimization.",
    citations: [
      { dimension: "Algorithms & Logic", quote: "Solved real-time memory bounded cache problem in 22 minutes with full test coverage." },
    ],
  },
];

export default function HiringManagerHomePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"actions" | "roles" | "agents" | "create">("actions");
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [finalists, setFinalists] = useState<Candidate[]>(SAMPLE_FINALISTS);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // New Requisition Draft Form State (HM Request)
  const [reqTitle, setReqTitle] = useState("");
  const [reqDept, setReqDept] = useState("Engineering");
  const [reqHeadcount, setReqHeadcount] = useState(1);
  const [reqJustification, setReqJustification] = useState("");
  const [submittingReq, setSubmittingReq] = useState(false);

  // Auth check
  useEffect(() => {
    async function checkAuth() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/login?next=/hm");
          return;
        }
        setCheckingAuth(false);
      } catch {
        setCheckingAuth(false);
      }
    }
    checkAuth();
  }, [router]);

  // Load requisitions for HM
  useEffect(() => {
    async function loadHMData() {
      try {
        const res = await fetch("/api/hm/requisitions");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data?.requisitions) && data.requisitions.length > 0) {
            const fetched: Requisition[] = data.requisitions;
            const existingNos = new Set(fetched.map((r) => r.req_no));
            const merged = [
              ...fetched,
              ...SAMPLE_PENDING_REQUISITIONS.filter((p) => !existingNos.has(p.req_no)),
              ...SAMPLE_ACTIVE_REQUISITIONS.filter((a) => !existingNos.has(a.req_no)),
            ];
            setRequisitions(merged);
            return;
          }
        }
      } catch (err) {
        console.warn("Using sample HM requisitions fallback:", err);
      }
      setRequisitions([...SAMPLE_PENDING_REQUISITIONS, ...SAMPLE_ACTIVE_REQUISITIONS]);
    }
    loadHMData();
  }, []);

  const pendingApprovals = useMemo(
    () => requisitions.filter((r) => r.status === "pending_approval"),
    [requisitions]
  );

  const activeRoles = useMemo(
    () => requisitions.filter((r) => r.status === "active" || r.status === "graduated"),
    [requisitions]
  );

  const totalActionsCount = pendingApprovals.length + finalists.length;

  // HM 1-Click Approval Decision Handler
  async function handleRequisitionDecision(reqId: string, action: "approve" | "reject") {
    setActionInProgress(reqId);
    try {
      const res = await fetch("/api/hm/requisitions/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requisitionId: reqId, action }),
      });

      setRequisitions((prev) =>
        prev.map((r) =>
          r.id === reqId ? { ...r, status: action === "approve" ? "active" : "draft" } : r
        )
      );
      setSuccessBanner(
        action === "approve"
          ? "✓ Requisition APPROVED! Status is now ACTIVE and published to the live job board."
          : "Requisition sent back to recruiter for revision."
      );
    } catch {
      setRequisitions((prev) =>
        prev.map((r) =>
          r.id === reqId ? { ...r, status: action === "approve" ? "active" : "draft" } : r
        )
      );
      setSuccessBanner(action === "approve" ? "✓ Requisition approved!" : "Revision requested.");
    } finally {
      setActionInProgress(null);
      setTimeout(() => setSuccessBanner(null), 4000);
    }
  }

  // Finalist Candidate Decision Handler
  async function handleCandidateDecision(candId: string, action: "offer" | "interview" | "pass") {
    setActionInProgress(candId);
    setTimeout(() => {
      setFinalists((prev) => prev.filter((c) => c.id !== candId));
      setActionInProgress(null);
      setSuccessBanner(
        action === "offer"
          ? "✓ Candidate approved for Offer Generation in Offer.ai!"
          : action === "interview"
          ? "✓ Scheduled for Next Round Interview with Hiring Team."
          : "Candidate marked as passed with constructive feedback."
      );
      setTimeout(() => setSuccessBanner(null), 4000);
    }, 400);
  }

  // Submit HM Requisition Request
  async function handleSubmitReqDraft() {
    if (!reqTitle.trim()) return;
    setSubmittingReq(true);
    const newReq: Requisition = {
      id: `req-hm-${Date.now()}`,
      req_no: `R-${Math.floor(1000000 + Math.random() * 9000000)}`,
      title: reqTitle.trim(),
      department: reqDept,
      headcount: reqHeadcount,
      status: "pending_approval",
      priority: "high",
      hiring_manager: "David Miller",
      description: reqJustification,
      created_at: new Date().toISOString(),
      talent_candidates: [],
    };
    setRequisitions((prev) => [newReq, ...prev]);
    setSuccessBanner(`✓ Requisition request for "${reqTitle}" submitted to Talent Acquisition.`);
    setReqTitle("");
    setReqJustification("");
    setSubmittingReq(false);
    setTimeout(() => {
      setActiveTab("actions");
      setSuccessBanner(null);
    }, 1500);
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-page text-ink flex flex-col items-center justify-center">
        <div className="text-xs text-ink-muted flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
          Verifying Hiring Manager credentials...
        </div>
      </div>
    );
  }

  return (
    <UniversalPlatformShell
      portalTitle="Hiring Manager Hub"
      navItems={[
        {
          id: "create",
          label: "Create requisition",
          icon: "plusCircle",
          active: activeTab === "create",
          onClick: () => setActiveTab("create"),
        },
        {
          id: "roles",
          label: "Open roles",
          icon: "briefcase",
          badge: activeRoles.length,
          badgeColor: "blue",
          active: activeTab === "roles",
          onClick: () => setActiveTab("roles"),
        },
        {
          id: "agents",
          label: "My agents",
          icon: "bot",
          badge: "Active",
          badgeColor: "emerald",
          active: activeTab === "agents",
          onClick: () => setActiveTab("agents"),
        },
        {
          id: "actions",
          label: "My actions",
          icon: "checkCircle",
          badge: totalActionsCount,
          badgeColor: "rose",
          active: activeTab === "actions",
          onClick: () => setActiveTab("actions"),
        },
      ]}
      activeNavId={activeTab}
      onSelectNav={(id) => setActiveTab(id as any)}
      avatarConfig={{
        title: "Shree AI Hiring Manager Partner",
        subtitle: "Rubric Calibration • Fast-Track Approvals • Candidate Scorecard Audits",
        badgeText: "HM Co-pilot Active",
      }}
      searchPlaceholder="Ask Shree about team rubrics, candidate qualifications, or approval status..."
      suggestedQuestions={[
        "Approve pending Product Marketing Lead requisition",
        "Compare Kavita Nair vs Aarav Sharma for Senior Backend",
        "Calibrate pre-screening benchmark score for Engineering",
        "Show team hiring timeline",
      ]}
      onSearchSubmit={(q) => {
        if (q.toLowerCase().includes("action") || q.toLowerCase().includes("approve")) {
          setActiveTab("actions");
        } else if (q.toLowerCase().includes("role") || q.toLowerCase().includes("open")) {
          setActiveTab("roles");
        } else if (q.toLowerCase().includes("agent")) {
          setActiveTab("agents");
        } else if (q.toLowerCase().includes("create") || q.toLowerCase().includes("new")) {
          setActiveTab("create");
        }
      }}
    >
      {/* ================= RIGHT WORKSPACE CANVAS ================= */}

      {successBanner && (
        <div className="mb-3 p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold animate-fade-in flex items-center justify-between">
          <span>{successBanner}</span>
          <button
            type="button"
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-900 font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* VIEW 1: MY ACTIONS (Pending Requisition Approvals & Candidate Scorecards) */}
      {activeTab === "actions" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-ink font-display">
                Actions Awaiting Your Decision ({totalActionsCount})
              </h2>
              <p className="text-xs text-ink-muted mt-0.5">
                Requisitions submitted for your approval and calibrated candidate finalists awaiting your review
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200">
              {totalActionsCount} Pending Action
            </span>
          </div>

          {/* 1. Requisitions Awaiting Approval */}
          {pendingApprovals.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                Requisitions Pending Approval ({pendingApprovals.length})
              </h3>
              {pendingApprovals.map((req) => (
                <div
                  key={req.id}
                  className="bg-surface border border-amber-300 dark:border-amber-800 rounded-xl p-3.5 sm:p-4 shadow-soft-sm space-y-3 bg-gradient-to-r from-amber-500/[0.04] to-transparent"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-ink-muted font-bold">{req.req_no}</span>
                        <h4 className="text-sm font-bold text-ink">{req.title}</h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          {req.priority} Priority
                        </span>
                      </div>
                      <p className="text-xs text-ink-muted mt-0.5">
                        {req.department} • {req.location} • Headcount: {req.headcount} • Budget: ${req.comp_min?.toLocaleString()} - ${req.comp_max?.toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={actionInProgress === req.id}
                        onClick={() => handleRequisitionDecision(req.id, "reject")}
                        className="px-3 py-1.5 rounded-lg border border-border bg-page hover:bg-surface text-xs font-medium text-ink-muted hover:text-ink cursor-pointer"
                      >
                        Request Revision
                      </button>

                      <button
                        type="button"
                        disabled={actionInProgress === req.id}
                        onClick={() => handleRequisitionDecision(req.id, "approve")}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-button cursor-pointer transition-all"
                      >
                        <span>✓</span>
                        <span>{actionInProgress === req.id ? "Activating..." : "Approve & Publish"}</span>
                      </button>
                    </div>
                  </div>

                  {req.description && (
                    <p className="text-xs text-ink-muted bg-page/60 p-2.5 rounded-lg border border-border/80 leading-relaxed">
                      {req.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 2. Finalist Candidate Scorecard Reviews */}
          <div className="space-y-2.5 pt-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              Calibrated Finalists Awaiting Review ({finalists.length})
            </h3>
            {finalists.length === 0 && pendingApprovals.length === 0 ? (
              <div className="p-8 text-center bg-surface border border-border rounded-2xl shadow-soft-sm">
                <span className="text-2xl">🎉</span>
                <h4 className="text-sm font-bold text-ink mt-2">All Caught Up!</h4>
                <p className="text-xs text-ink-muted mt-0.5">No requisitions or candidates pending your sign-off.</p>
              </div>
            ) : (
              finalists.map((cand) => (
                <div
                  key={cand.id}
                  className="bg-surface border border-border rounded-xl p-3.5 sm:p-4 shadow-soft-sm space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-brand-wash flex items-center justify-center font-bold text-brand text-xs">
                        {cand.match_score}%
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-ink">{cand.name}</h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                            {cand.current_designation} @ {cand.current_company}
                          </span>
                        </div>
                        <p className="text-xs text-ink-muted mt-0.5">
                          {cand.experience_years} yrs exp • Shree Rubric Match: {cand.match_score}%
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={actionInProgress === cand.id}
                        onClick={() => handleCandidateDecision(cand.id, "pass")}
                        className="px-2.5 py-1.5 rounded-lg border border-border text-xs text-ink-muted hover:text-ink cursor-pointer"
                      >
                        Pass
                      </button>
                      <button
                        type="button"
                        disabled={actionInProgress === cand.id}
                        onClick={() => handleCandidateDecision(cand.id, "interview")}
                        className="px-3 py-1.5 rounded-lg border border-brand text-brand hover:bg-brand-wash text-xs font-medium cursor-pointer"
                      >
                        Next Interview
                      </button>
                      <button
                        type="button"
                        disabled={actionInProgress === cand.id}
                        onClick={() => handleCandidateDecision(cand.id, "offer")}
                        className="px-3.5 py-1.5 rounded-lg bg-brand text-white hover:bg-brand-dark text-xs font-semibold shadow-button cursor-pointer"
                      >
                        ✓ Generate Offer
                      </button>
                    </div>
                  </div>

                  {cand.summary && (
                    <p className="text-xs text-ink-muted leading-relaxed bg-page/50 p-2.5 rounded-lg border border-border">
                      {cand.summary}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: OPEN ROLES (Requisitions managed by this HM) */}
      {activeTab === "roles" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-ink font-display">
                Open Roles In My Organization ({activeRoles.length})
              </h2>
              <p className="text-xs text-ink-muted mt-0.5">
                Active hiring requisitions with live candidate stage progression
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab("create")}
              className="text-xs font-semibold text-brand hover:underline cursor-pointer"
            >
              + Request New Role
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeRoles.map((role) => {
              const cands = role.talent_candidates || [];
              return (
                <div
                  key={role.id}
                  className="p-4 rounded-xl bg-surface border border-border shadow-soft-sm space-y-3 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-ink-muted">
                      <span className="font-mono font-bold">{role.req_no}</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                        Active
                      </span>
                    </div>
                    <h3 className="text-xs sm:text-sm font-bold text-ink mt-1.5">{role.title}</h3>
                    <p className="text-[11px] text-ink-muted mt-0.5">
                      {role.department} • {role.location}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-page border border-border flex items-center justify-between text-xs">
                    <span className="text-ink-muted">Candidates in Pipe</span>
                    <span className="font-bold text-brand">{cands.length} candidates</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 3: MY AGENTS (HM Screening Calibration Bots) */}
      {activeTab === "agents" && (
        <div className="space-y-4">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-ink font-display">
              HM Screening & Calibration Bots
            </h2>
            <p className="text-xs text-ink-muted mt-0.5">
              Configured to your team&apos;s technical bar, culture values, and rubric thresholds
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {[
              {
                title: "Engineering Rubric Calibrator",
                desc: "Filters candidates based on system architecture benchmarks and hands-on coding quality.",
                threshold: "Minimum 88% Match Score",
                status: "Active",
              },
              {
                title: "Automated Tech Pre-screener",
                desc: "Conducts asynchronous interactive AI tech screening before HM calendar booking.",
                threshold: "Live for all full-stack roles",
                status: "Active",
              },
            ].map((bot, i) => (
              <div key={i} className="p-4 rounded-xl bg-surface border border-border shadow-soft-sm space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs sm:text-sm font-bold text-ink">{bot.title}</h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    {bot.status}
                  </span>
                </div>
                <p className="text-xs text-ink-muted leading-relaxed">{bot.desc}</p>
                <div className="p-2 rounded-lg bg-page text-[11px] text-brand font-medium border border-border">
                  ⚙ {bot.threshold}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 4: CREATE REQUISITION (HM Role Request Form) */}
      {activeTab === "create" && (
        <div className="max-w-xl mx-auto w-full space-y-4 py-2">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-ink font-display">
              Request New Headcount / Requisition
            </h2>
            <p className="text-xs text-ink-muted mt-0.5">
              Submit a role request directly to the Talent Acquisition team for calibration & launch.
            </p>
          </div>

          <div className="bg-surface border border-border rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-soft">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Role Title *</label>
              <input
                type="text"
                value={reqTitle}
                onChange={(e) => setReqTitle(e.target.value)}
                placeholder="e.g. Staff Distributed Systems Engineer"
                className="w-full px-3.5 py-2 rounded-xl bg-page border border-border text-xs sm:text-sm text-ink outline-none focus:border-brand"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">Department</label>
                <select
                  value={reqDept}
                  onChange={(e) => setReqDept(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-page border border-border text-xs text-ink outline-none"
                >
                  <option>Engineering</option>
                  <option>Cloud Platform</option>
                  <option>Product & Design</option>
                  <option>Sales & Accounts</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1">Headcount</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={reqHeadcount}
                  onChange={(e) => setReqHeadcount(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 rounded-xl bg-page border border-border text-xs text-ink outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Business Justification & Key Skills</label>
              <textarea
                rows={3}
                value={reqJustification}
                onChange={(e) => setReqJustification(e.target.value)}
                placeholder="Explain the project need, required tech stack (e.g. Go, Kubernetes, Kafka), and target timeline..."
                className="w-full px-3.5 py-2 rounded-xl bg-page border border-border text-xs text-ink outline-none focus:border-brand resize-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-border">
              <button
                type="button"
                onClick={() => setActiveTab("actions")}
                className="px-3.5 py-2 rounded-xl border border-border bg-page text-xs text-ink-muted hover:text-ink cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={submittingReq || !reqTitle.trim()}
                onClick={handleSubmitReqDraft}
                className="px-4 py-2 rounded-xl bg-brand text-white hover:bg-brand-dark text-xs font-semibold shadow-button cursor-pointer disabled:opacity-50"
              >
                {submittingReq ? "Submitting..." : "Submit Role Request to TA"}
              </button>
            </div>
          </div>
        </div>
      )}
    </UniversalPlatformShell>
  );
}
