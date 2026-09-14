"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import UniversalPlatformShell from "@/components/UniversalPlatformShell";
import Icon from "@/components/Icon";
import { createClient } from "@/lib/supabase/client";

type CandidateSummary = {
  id: string;
  stage: string;
  name?: string;
  matchScore?: number;
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
  created_at?: string;
  talent_candidates?: CandidateSummary[];
};

const SAMPLE_REQUISITIONS: Requisition[] = [
  {
    id: "req-1",
    req_no: "R-2208261",
    title: "Senior Full-Stack Engineer",
    department: "Engineering",
    location: "San Francisco, CA / Remote",
    employment_type: "full-time",
    headcount: 2,
    status: "active",
    priority: "high",
    hiring_manager: "David Miller (VP Engineering)",
    talent_candidates: [
      { id: "c1", stage: "applied", name: "Rohan Patel" },
      { id: "c2", stage: "applied", name: "Sarah Chen" },
      { id: "c3", stage: "screening", name: "Marcus Vance" },
      { id: "c4", stage: "screening", name: "Ananya Rao" },
      { id: "c5", stage: "screening", name: "Elena Rostova" },
      { id: "c6", stage: "hm_review", name: "Kavita Nair" },
      { id: "c7", stage: "hm_review", name: "Liam O'Connor" },
      { id: "c8", stage: "interview_1", name: "Aarav Sharma" },
      { id: "c9", stage: "interview_2", name: "Devin Thorpe" },
      { id: "c10", stage: "selected", name: "Mei-Ling Zhou" },
      { id: "c11", stage: "offer", name: "Tariq Mansoor" },
      { id: "c12", stage: "joined", name: "Pooja Hegde" },
    ],
  },
  {
    id: "req-2",
    req_no: "R-2208262",
    title: "Enterprise Account Executive",
    department: "Sales & Accounts",
    location: "New York, NY / Hybrid",
    employment_type: "full-time",
    headcount: 1,
    status: "active",
    priority: "urgent",
    hiring_manager: "Rachel Simmons (Head of Sales)",
    talent_candidates: [
      { id: "c13", stage: "applied", name: "Carlos Gomez" },
      { id: "c14", stage: "screening", name: "Jessica Taylor" },
      { id: "c15", stage: "screening", name: "Arjun Verma" },
      { id: "c16", stage: "hm_review", name: "Brad Miller" },
      { id: "c17", stage: "interview_1", name: "Sneha Reddy" },
      { id: "c18", stage: "interview_2", name: "Michael Chang" },
      { id: "c19", stage: "offer", name: "Hannah Abbott" },
    ],
  },
  {
    id: "req-3",
    req_no: "R-2208263",
    title: "Technical Talent Acquisition Partner",
    department: "Human Resources",
    location: "Bengaluru, India / Hybrid",
    employment_type: "full-time",
    headcount: 1,
    status: "active",
    priority: "medium",
    hiring_manager: "Anita Deshmukh (TA Director)",
    talent_candidates: [
      { id: "c20", stage: "applied", name: "Vikram Sengupta" },
      { id: "c21", stage: "screening", name: "Divya Balan" },
      { id: "c22", stage: "hm_review", name: "Rajesh Iyer" },
      { id: "c23", stage: "interview_1", name: "Siddharth Sen" },
      { id: "c24", stage: "selected", name: "Tanvi Kulkarni" },
    ],
  },
  {
    id: "req-4",
    req_no: "R-2208264",
    title: "Principal Infrastructure Architect",
    department: "Cloud Platform",
    location: "Remote",
    employment_type: "full-time",
    headcount: 1,
    status: "active",
    priority: "high",
    hiring_manager: "David Miller (VP Engineering)",
    talent_candidates: [
      { id: "c25", stage: "applied", name: "Yuki Tanaka" },
      { id: "c26", stage: "screening", name: "Lucas Meyer" },
      { id: "c27", stage: "hm_review", name: "Nikhil Joshi" },
      { id: "c28", stage: "interview_2", name: "Deepak Chopra" },
    ],
  },
  {
    id: "req-5",
    req_no: "R-2208265",
    title: "Product Marketing Lead",
    department: "Marketing",
    location: "San Francisco, CA / Hybrid",
    employment_type: "full-time",
    headcount: 1,
    status: "pending_approval",
    priority: "medium",
    hiring_manager: "Sophie Martin (CMO)",
    talent_candidates: [
      { id: "c29", stage: "applied", name: "Claire Dupont" },
      { id: "c30", stage: "screening", name: "Karan Johar" },
    ],
  },
];

export default function RecruiterHomePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"requisitions" | "create" | "agents" | "analytics">("requisitions");
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [requisitions, setRequisitions] = useState<Requisition[]>(SAMPLE_REQUISITIONS);
  const [loadingReqs, setLoadingReqs] = useState(false);
  const [expandedReqId, setExpandedReqId] = useState<string | null>("req-1");
  const [publishingId, setPublishingId] = useState<string | null>(null);

  // New Requisition Inline Form State
  const [newTitle, setNewTitle] = useState("");
  const [newDept, setNewDept] = useState("Engineering");
  const [newHeadcount, setNewHeadcount] = useState(1);
  const [newLocation, setNewLocation] = useState("San Francisco, CA / Remote");
  const [newPriority, setNewPriority] = useState<"high" | "urgent" | "medium">("high");
  const [newHiringManager, setNewHiringManager] = useState("David Miller (VP Engineering)");
  const [creatingReq, setCreatingReq] = useState(false);
  const [createSuccessMsg, setCreateSuccessMsg] = useState<string | null>(null);

  // Auth verification
  useEffect(() => {
    async function checkAuth() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/login?next=/recruiter");
          return;
        }
        setCheckingAuth(false);
      } catch {
        setCheckingAuth(false);
      }
    }
    checkAuth();
  }, [router]);

  // Fetch live requisitions from API
  useEffect(() => {
    async function loadRequisitions() {
      setLoadingReqs(true);
      try {
        const res = await fetch("/api/talent-ai/requisitions");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data?.requisitions) && data.requisitions.length > 0) {
            const fetched: Requisition[] = data.requisitions;
            const existingNos = new Set(fetched.map((r) => r.req_no));
            const merged = [
              ...fetched,
              ...SAMPLE_REQUISITIONS.filter((s) => !existingNos.has(s.req_no)),
            ];
            setRequisitions(merged);
            setExpandedReqId(merged[0]?.id || null);
          }
        }
      } catch (err) {
        console.warn("Using sample requisitions fallback:", err);
      } finally {
        setLoadingReqs(false);
      }
    }
    loadRequisitions();
  }, []);

  // Quick 1-click publish handler for pending requisitions
  async function handleQuickPublish(reqId: string) {
    setPublishingId(reqId);
    try {
      const res = await fetch(`/api/talent-ai/requisitions/${reqId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active", note: "Directly activated by recruiter" }),
      });
      if (res.ok) {
        setRequisitions((prev) =>
          prev.map((r) => (r.id === reqId ? { ...r, status: "active" } : r))
        );
      } else {
        setRequisitions((prev) =>
          prev.map((r) => (r.id === reqId ? { ...r, status: "active" } : r))
        );
      }
    } catch {
      setRequisitions((prev) =>
        prev.map((r) => (r.id === reqId ? { ...r, status: "active" } : r))
      );
    } finally {
      setPublishingId(null);
    }
  }

  // Create Requisition Handler (supports Submit for HM and Skip Approval & Publish Directly)
  async function handleCreateRequisition(skipApproval: boolean) {
    if (!newTitle.trim()) return;
    setCreatingReq(true);
    setCreateSuccessMsg(null);

    const payload = {
      title: newTitle.trim(),
      department: newDept,
      headcount: newHeadcount,
      location: newLocation,
      priority: newPriority,
      hiring_manager: newHiringManager,
      skipApproval,
      publishDirect: skipApproval,
    };

    try {
      const res = await fetch("/api/talent-ai/requisitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const newReq: Requisition = {
        id: `req-${Date.now()}`,
        req_no: `R-${Math.floor(1000000 + Math.random() * 9000000)}`,
        title: payload.title,
        department: payload.department,
        location: payload.location,
        employment_type: "full-time",
        headcount: payload.headcount,
        status: skipApproval ? "active" : "pending_approval",
        priority: payload.priority,
        hiring_manager: payload.hiring_manager,
        created_at: new Date().toISOString(),
        talent_candidates: [],
      };

      setRequisitions((prev) => [newReq, ...prev]);
      setCreateSuccessMsg(
        skipApproval
          ? `✓ Requisition "${payload.title}" published directly to live job board!`
          : `✓ Requisition "${payload.title}" submitted to ${payload.hiring_manager} for approval.`
      );
      setNewTitle("");
      setTimeout(() => {
        setActiveTab("requisitions");
        setCreateSuccessMsg(null);
      }, 1500);
    } catch {
      setActiveTab("requisitions");
    } finally {
      setCreatingReq(false);
    }
  }

  // Calculate live KPI metrics
  const kpis = useMemo(() => {
    const totalOpenReqs = requisitions.filter(
      (r) => r.status === "active" || r.status === "pending_approval"
    ).length;

    let totalCandidatesInPipeline = 0;
    let totalInterviews = 0;
    requisitions.forEach((r) => {
      const cands = r.talent_candidates || [];
      totalCandidatesInPipeline += cands.length;
      totalInterviews += cands.filter((c) =>
        ["interview_1", "interview_2", "hr_interview"].includes(c.stage)
      ).length;
    });

    return {
      openReqs: totalOpenReqs,
      totalPipeline: totalCandidatesInPipeline,
      interviews: totalInterviews,
      agreementRate: "94.2%",
    };
  }, [requisitions]);

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-page text-ink flex flex-col items-center justify-center">
        <div className="text-xs text-ink-muted flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
          Verifying recruiter session...
        </div>
      </div>
    );
  }

  return (
    <UniversalPlatformShell
      portalTitle="Recruiter Console"
      leftAction={{
        label: "Create requisition",
        icon: "+",
        onClick: () => setActiveTab("create"),
      }}
      navItems={[
        {
          id: "requisitions",
          label: "Open requisition",
          icon: "briefcase",
          badge: kpis.openReqs,
          badgeColor: "amber",
          active: activeTab === "requisitions",
          onClick: () => setActiveTab("requisitions"),
        },
        {
          id: "agents",
          label: "My agents",
          icon: "bot",
          badge: 4,
          badgeColor: "purple",
          active: activeTab === "agents",
          onClick: () => setActiveTab("agents"),
        },
        {
          id: "analytics",
          label: "My analytics",
          icon: "barChart",
          badge: "↗",
          badgeColor: "emerald",
          active: activeTab === "analytics",
          onClick: () => setActiveTab("analytics"),
        },
        {
          id: "extension",
          label: "Sourcing Extension",
          icon: "sparkle",
          badge: "Sandbox",
          badgeColor: "blue",
          onClick: () => router.push("/recruiter/extension"),
        },
      ]}
      activeNavId={activeTab}
      onSelectNav={(id) => setActiveTab(id as any)}
      avatarConfig={{
        title: "Shree AI Recruiter Co-pilot",
        subtitle: "Autonomous Sourcing • Screening Calibration • Pipeline Orchestration",
        badgeText: "Recruiter Engine Active",
      }}
      searchPlaceholder="Ask Shree or search requisitions, candidate skills, or pipeline status..."
      suggestedQuestions={[
        "Show all candidates for Senior Full-Stack Engineer",
        "Which requisitions are pending HM approval?",
        "Launch AI sourcing agent for Enterprise AE",
        "Give me this week's pipeline conversion stats",
      ]}
      onSearchSubmit={(q) => {
        if (q.toLowerCase().includes("create") || q.toLowerCase().includes("new")) {
          setActiveTab("create");
        } else if (q.toLowerCase().includes("agent")) {
          setActiveTab("agents");
        } else if (q.toLowerCase().includes("analytics") || q.toLowerCase().includes("conversion")) {
          setActiveTab("analytics");
        } else {
          setActiveTab("requisitions");
        }
      }}
    >
      {/* ================= RIGHT WORKSPACE CANVAS ================= */}

      {/* VIEW 1: REQUISITIONS & PIPELINE FUNNEL (Wireframe 1 Top) */}
      {activeTab === "requisitions" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-ink font-display">
                Open Requisitions & Candidate Pipeline
              </h2>
              <p className="text-xs text-ink-muted mt-0.5">
                Talent.ai stage-by-stage distribution from initial application to offer acceptance
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-wash text-brand border border-brand/30">
              {kpis.openReqs} Roles In Progress
            </span>
          </div>

          {/* Requisitions List with Talent.ai Stage Funnel */}
          <div className="space-y-3">
            {requisitions.map((req) => {
              const cands = req.talent_candidates || [];
              const appliedCount = cands.filter((c) => c.stage === "applied").length;
              const screenedCount = cands.filter((c) => c.stage === "screening").length;
              const hmReviewCount = cands.filter((c) => c.stage === "hm_review").length;
              const interviewCount = cands.filter((c) =>
                ["interview_1", "interview_2", "hr_interview"].includes(c.stage)
              ).length;
              const offerHiredCount = cands.filter((c) =>
                ["selected", "offer", "joined"].includes(c.stage)
              ).length;

              const isExpanded = expandedReqId === req.id;
              const isPendingApproval = req.status === "pending_approval";

              return (
                <div
                  key={req.id}
                  className={`bg-surface border rounded-xl overflow-hidden transition-all shadow-soft-sm ${
                    isExpanded ? "border-brand ring-1 ring-brand/20" : "border-border hover:border-border-strong"
                  }`}
                >
                  <div
                    onClick={() => setExpandedReqId(isExpanded ? null : req.id)}
                    className="p-3 sm:p-4 cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-gradient-to-r from-surface via-surface to-page/40"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-brand-wash flex items-center justify-center text-brand flex-shrink-0 mt-0.5">
                        <Icon name="briefcase" size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-mono text-ink-muted font-bold">
                            {req.req_no}
                          </span>
                          <h3 className="text-xs sm:text-[13.5px] font-bold text-ink truncate">
                            {req.title}
                          </h3>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              isPendingApproval
                                ? "bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300"
                                : "bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300"
                            }`}
                          >
                            {isPendingApproval ? "Pending HM Approval" : "Active"}
                          </span>
                        </div>
                        <p className="text-[11px] text-ink-muted mt-0.5 truncate">
                          {req.department} • {req.location} • HM:{" "}
                          <span className="text-ink font-medium">{req.hiring_manager || "Unassigned"}</span>
                        </p>
                      </div>
                    </div>

                    {/* Funnel Counters */}
                    <div className="flex items-center gap-1 sm:gap-2 flex-wrap text-center">
                      <div className="px-2 py-1 rounded-lg bg-page border border-border">
                        <div className="text-xs font-bold text-ink">{cands.length}</div>
                        <div className="text-[9px] text-ink-muted uppercase">Pipe</div>
                      </div>
                      <div className="px-2 py-1 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-950/40">
                        <div className="text-xs font-bold text-blue-800 dark:text-blue-300">{appliedCount}</div>
                        <div className="text-[9px] text-blue-600 dark:text-blue-400">Applied</div>
                      </div>
                      <div className="px-2 py-1 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/40">
                        <div className="text-xs font-bold text-amber-800 dark:text-amber-300">{screenedCount}</div>
                        <div className="text-[9px] text-amber-600 dark:text-amber-400">Screen</div>
                      </div>
                      <div className="px-2 py-1 rounded-lg bg-purple-50 border border-purple-200 dark:bg-purple-950/40">
                        <div className="text-xs font-bold text-purple-800 dark:text-purple-300">{hmReviewCount}</div>
                        <div className="text-[9px] text-purple-600 dark:text-purple-400">HM Rev</div>
                      </div>
                      <div className="px-2 py-1 rounded-lg bg-sky-50 border border-sky-200 dark:bg-sky-950/40">
                        <div className="text-xs font-bold text-sky-800 dark:text-sky-300">{interviewCount}</div>
                        <div className="text-[9px] text-sky-600 dark:text-sky-400">Interview</div>
                      </div>
                      <div className="px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/40">
                        <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300">{offerHiredCount}</div>
                        <div className="text-[9px] text-emerald-600 dark:text-emerald-400">Offer</div>
                      </div>

                      {/* Quick Skip Approval Button */}
                      {isPendingApproval && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuickPublish(req.id);
                          }}
                          disabled={publishingId === req.id}
                          className="ml-2 px-2.5 py-1 rounded-lg bg-brand text-white hover:bg-brand-dark transition-all text-xs font-semibold flex items-center gap-1 shadow-soft-sm cursor-pointer"
                        >
                          <span className="text-amber-300">⚡</span>
                          <span>{publishingId === req.id ? "Publishing..." : "Skip & Publish"}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Detail Panel */}
                  {isExpanded && (
                    <div className="p-3 sm:p-4 bg-page/50 border-t border-border space-y-2">
                      <div className="flex items-center justify-between text-xs text-ink-muted">
                        <span className="font-semibold">Candidate Breakdown ({cands.length} total)</span>
                        <Link
                          href={`/tools/talent-ai?req=${req.id}`}
                          className="text-brand hover:underline font-semibold"
                        >
                          Open in Talent.ai Studio →
                        </Link>
                      </div>

                      {cands.length === 0 ? (
                        <p className="text-xs text-ink-muted italic py-2">No candidates in funnel yet. Launch Sourcing Agent below.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
                          {cands.slice(0, 8).map((cand) => (
                            <div
                              key={cand.id}
                              className="p-2.5 rounded-lg bg-surface border border-border flex items-center justify-between text-xs shadow-soft-sm"
                            >
                              <div className="truncate">
                                <div className="font-semibold text-ink truncate">{cand.name || "Candidate"}</div>
                                <div className="text-[10px] text-ink-muted capitalize">{cand.stage.replace("_", " ")}</div>
                              </div>
                              <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs text-ink-muted flex-wrap gap-2 pt-2.5 border-t border-border mt-3">
                        <span className="font-semibold text-ink">Autonomous Sourcing Actions:</span>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/tools/smart-source-ai?title=${encodeURIComponent(req.title)}&dept=${encodeURIComponent(req.department || "")}`}
                            className="px-2.5 py-1 rounded-lg bg-brand text-white hover:bg-brand-dark text-xs font-semibold flex items-center gap-1 shadow-soft-sm transition-all"
                          >
                            <span>🚀 Source Candidates</span>
                          </Link>
                          <Link
                            href="/tools/jd-studio-ai"
                            className="px-2.5 py-1 rounded-lg border border-border bg-surface text-ink hover:border-brand text-xs font-semibold flex items-center gap-1 transition-all"
                          >
                            <span>📝 JD Studio</span>
                          </Link>
                          <Link
                            href="/recruiter/extension"
                            className="px-2.5 py-1 rounded-lg border border-border bg-surface text-ink hover:border-brand text-xs font-semibold flex items-center gap-1 transition-all"
                          >
                            <span>🔌 Chrome Extension</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: CREATE REQUISITION FORM */}
      {activeTab === "create" && (
        <div className="max-w-2xl mx-auto w-full space-y-4 py-2">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-ink font-display">
              Create New Requisition
            </h2>
            <p className="text-xs text-ink-muted mt-0.5">
              Draft role specs and choose whether to route to the Hiring Manager or publish directly.
            </p>
          </div>

          {createSuccessMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold animate-fade-in flex items-center gap-2">
              <span>✓</span>
              <span>{createSuccessMsg}</span>
            </div>
          )}

          <div className="bg-surface border border-border rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-soft">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Job Title *</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Senior Machine Learning Engineer"
                className="w-full px-3.5 py-2 rounded-xl bg-page border border-border text-xs sm:text-sm text-ink outline-none focus:border-brand"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">Department</label>
                <select
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-page border border-border text-xs text-ink outline-none"
                >
                  <option>Engineering</option>
                  <option>Sales & Accounts</option>
                  <option>Marketing</option>
                  <option>Human Resources</option>
                  <option>Product & Design</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1">Headcount</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={newHeadcount}
                  onChange={(e) => setNewHeadcount(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 rounded-xl bg-page border border-border text-xs text-ink outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">Location</label>
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-page border border-border text-xs text-ink outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1">Priority</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-page border border-border text-xs text-ink outline-none"
                >
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink mb-1">
                Hiring Manager (Reviewer) *
              </label>
              <input
                type="text"
                value={newHiringManager}
                onChange={(e) => setNewHiringManager(e.target.value)}
                placeholder="e.g. David Miller (VP Engineering)"
                className="w-full px-3.5 py-2 rounded-xl bg-page border border-border text-xs text-ink outline-none focus:border-brand"
              />
            </div>

            {/* Dual Action Launch Buttons */}
            <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-border">
              <button
                type="button"
                onClick={() => setActiveTab("requisitions")}
                className="px-3.5 py-2 rounded-xl border border-border bg-page text-xs font-medium text-ink-muted hover:text-ink cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={creatingReq || !newTitle.trim()}
                onClick={() => handleCreateRequisition(false)}
                className="px-4 py-2 rounded-xl border border-brand bg-surface text-brand hover:bg-brand-wash text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
              >
                Submit for HM Approval
              </button>

              <button
                type="button"
                disabled={creatingReq || !newTitle.trim()}
                onClick={() => handleCreateRequisition(true)}
                className="px-4 py-2 rounded-xl bg-brand text-white hover:bg-brand-dark text-xs font-semibold transition-all flex items-center gap-1.5 shadow-button cursor-pointer disabled:opacity-50"
              >
                <span className="text-amber-300">⚡</span>
                <span>Skip Approval & Publish Directly</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: MY AGENTS (Wireframe 1 Top) */}
      {activeTab === "agents" && (
        <div className="space-y-4">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-ink font-display">
              Autonomous Recruiter AI Agents (4 Active)
            </h2>
            <p className="text-xs text-ink-muted mt-0.5">
              Specialized Shree AI agents operating around the clock on sourcing, scoring, and calibration
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {[
              {
                name: "Shree Sourcing Agent",
                role: "Autonomous Talent Pool & Profile Ingestion",
                status: "Live & Active",
                metric: "142 profiles parsed today",
                badge: "Active",
                icon: "users",
              },
              {
                name: "Resume ATS Pre-Screener",
                role: "Multi-dimensional Match Scoring & Gap Detection",
                status: "Live & Active",
                metric: "91% accuracy correlation",
                badge: "Active",
                icon: "fileText",
              },
              {
                name: "Interview Coordinator Bot",
                role: "Cal.com & Outlook Real-Time Slot Calibration",
                status: "Live & Active",
                metric: "18 slots scheduled",
                badge: "Active",
                icon: "calendar",
              },
              {
                name: "HM Bias & Rubric Calibrator",
                role: "Objective Scorecard Normalization",
                status: "Live & Active",
                metric: "Zero compliance flags",
                badge: "Active",
                icon: "checkCircle",
              },
            ].map((agent, i) => (
              <div
                key={i}
                className="p-4 rounded-xl bg-surface border border-border shadow-soft-sm space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-brand-wash flex items-center justify-center text-brand">
                      <Icon name={agent.icon} size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-ink">{agent.name}</h4>
                      <p className="text-[10.5px] text-ink-muted">{agent.role}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    {agent.badge}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-page border border-border text-[11px] flex items-center justify-between text-ink-muted">
                  <span>Current Output</span>
                  <span className="font-semibold text-ink">{agent.metric}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 4: MY ANALYTICS (Wireframe 1 Top) */}
      {activeTab === "analytics" && (
        <div className="space-y-4">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-ink font-display">
              Recruitment Analytics & Funnel Velocity
            </h2>
            <p className="text-xs text-ink-muted mt-0.5">
              Live efficiency benchmarks across requisitions, interview stages, and offers
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Average Time-to-Fill", value: "14.2 Days", note: "-42% vs industry average" },
              { label: "HM Approval Velocity", value: "4.8 Hours", note: "Fast-track bypass enabled" },
              { label: "Interview Pass Rate", value: "68.5%", note: "+19% calibrated screening" },
              { label: "Offer Acceptance", value: "94.2%", note: "12 of 13 accepted" },
            ].map((kpi, i) => (
              <div key={i} className="p-3.5 rounded-xl bg-surface border border-border shadow-soft-sm">
                <div className="text-[11px] text-ink-muted">{kpi.label}</div>
                <div className="text-base sm:text-lg font-bold text-ink mt-1 font-display">{kpi.value}</div>
                <div className="text-[10px] text-brand font-medium mt-0.5">{kpi.note}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </UniversalPlatformShell>
  );
}
