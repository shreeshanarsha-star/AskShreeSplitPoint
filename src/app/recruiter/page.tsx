"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import UniversalPlatformShell from "@/components/UniversalPlatformShell";
import Icon from "@/components/Icon";
import { createClient } from "@/lib/supabase/client";

export interface CandidateApplicationDetail {
  id: string;
  candidate_name: string;
  candidate_email: string;
  candidate_phone?: string | null;
  status: string;
  match_score?: number | null;
  matched_skills?: string[] | null;
  missing_skills?: string[] | null;
  ai_evidence?: string | null;
  ai_cover_note?: string | null;
  created_at: string;
  resume_path?: string | null;
}

export interface RequisitionItem {
  id: string;
  req_no: string;
  title: string;
  department?: string | null;
  location?: string | null;
  employment_type?: string | null;
  headcount?: number;
  status: string;
  raw_status?: string;
  priority?: string | null;
  hiring_manager?: string | null;
  must_have_skills?: string[];
  good_to_have_skills?: string[];
  qualification?: string | null;
  min_years_experience?: number | null;
  ctc_budget?: string | null;
  description?: string | null;
  created_at?: string;
  totalApplications: number;
  hmReviewCount: number;
  applications?: CandidateApplicationDetail[];
}

function parseCandidate9Fields(app: CandidateApplicationDetail) {
  let location = "Not specified";
  let presentSalary = "Not specified";
  let noticePeriod = "30 Days";
  let qualification = "Degree";
  let currentOrganization = "Previous Employer";
  let switchingReason = "Seeking career growth & opportunities";

  if (app.ai_evidence) {
    try {
      const parsed = JSON.parse(app.ai_evidence);
      if (parsed.location) location = parsed.location;
      if (parsed.presentSalary) presentSalary = parsed.presentSalary;
      if (parsed.noticePeriod) noticePeriod = parsed.noticePeriod;
      if (parsed.qualification) qualification = parsed.qualification;
      if (parsed.currentOrganization) currentOrganization = parsed.currentOrganization;
      if (parsed.switchingReason) switchingReason = parsed.switchingReason;
    } catch {
      // not json, use default
    }
  }

  return {
    fullName: app.candidate_name,
    email: app.candidate_email,
    phone: app.candidate_phone || "Not specified",
    location,
    presentSalary,
    noticePeriod,
    qualification,
    currentOrganization,
    switchingReason,
  };
}

export default function RecruiterHomePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"requisitions" | "create" | "agents" | "analytics">("requisitions");
  const [activeRolePerspective, setActiveRolePerspective] = useState<"recruiter" | "hiring_manager">("recruiter");
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [requisitions, setRequisitions] = useState<RequisitionItem[]>([]);
  const [loadingReqs, setLoadingReqs] = useState(true);
  const [expandedReqId, setExpandedReqId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [forwardingAppId, setForwardingAppId] = useState<string | null>(null);

  // Requisition Creation State with JD Drop
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [rawJdText, setRawJdText] = useState("");
  const [analyzingJd, setAnalyzingJd] = useState(false);
  const [creatingReq, setCreatingReq] = useState(false);
  const [createMsg, setCreateMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Extracted/Editable Fields
  const [formFields, setFormFields] = useState({
    title: "",
    department: "Engineering",
    location: "Remote / Hybrid",
    employment_type: "full-time",
    headcount: 1,
    priority: "high",
    hiring_manager: "Hiring Lead",
    mustHaveSkills: "",
    goodToHaveSkills: "",
    qualification: "",
    minYearsExperience: "3",
    ctcBudget: "",
    description: "",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auth verification
  useEffect(() => {
    async function checkAuth() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
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

  // Load Requisitions
  async function loadRequisitions() {
    setLoadingReqs(true);
    try {
      const res = await fetch("/api/requisitions");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.requisitions)) {
          setRequisitions(data.requisitions);
          if (data.requisitions.length > 0 && !expandedReqId) {
            setExpandedReqId(data.requisitions[0].id);
          }
        }
      }
    } catch (err) {
      console.warn("Failed to load requisitions:", err);
    } finally {
      setLoadingReqs(false);
    }
  }

  useEffect(() => {
    loadRequisitions();
  }, []);

  // Handle JD File / Text Analysis
  async function handleAnalyzeJd(file?: File) {
    const targetFile = file || jdFile;
    if (!targetFile && !rawJdText.trim()) {
      setCreateMsg({ type: "error", text: "Please upload a JD document or paste job description text." });
      return;
    }

    setAnalyzingJd(true);
    setCreateMsg(null);

    try {
      let res: Response;
      if (targetFile) {
        const formData = new FormData();
        formData.append("files", targetFile);
        res = await fetch("/api/public/job-postings/analyze", {
          method: "POST",
          body: formData,
        });
      } else {
        res = await fetch("/api/public/job-postings/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rawText: rawJdText }),
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed.");

      const draft = data.drafts?.[0];
      if (!draft) throw new Error("Could not parse job description. Please review and type details manually.");
      if (draft.error) throw new Error(draft.error);

      setFormFields({
        title: draft.title || formFields.title || "Requisition Role",
        department: draft.industry || formFields.department || "Engineering & Technology",
        location: draft.location || formFields.location || "Remote / Hybrid",
        employment_type: "full-time",
        headcount: 1,
        priority: "high",
        hiring_manager: draft.company ? `${draft.company} Lead` : (formFields.hiring_manager || "Hiring Lead"),
        mustHaveSkills: Array.isArray(draft.must_have_skills) && draft.must_have_skills.length > 0
          ? draft.must_have_skills.join(", ")
          : (formFields.mustHaveSkills || "Problem Solving, Communication"),
        goodToHaveSkills: Array.isArray(draft.good_to_have_skills)
          ? draft.good_to_have_skills.join(", ")
          : formFields.goodToHaveSkills,
        qualification: draft.qualification || formFields.qualification || "Bachelor's degree or equivalent",
        minYearsExperience: draft.min_years_experience != null ? String(draft.min_years_experience) : (formFields.minYearsExperience || "3"),
        ctcBudget: draft.ctc_budget || formFields.ctcBudget || "",
        description: draft.rawJdText || draft.description || rawJdText || formFields.description || "",
      });
      setCreateMsg({ type: "success", text: "AI successfully analyzed JD! Specifications autofilled below for your review." });
    } catch (err) {
      setCreateMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to analyze JD. You can fill fields manually.",
      });
    } finally {
      setAnalyzingJd(false);
    }
  }

  // Handle Requisition Submit
  async function handleSubmitRequisition(e: React.FormEvent) {
    e.preventDefault();
    if (!formFields.title.trim()) {
      setCreateMsg({ type: "error", text: "Job title is required." });
      return;
    }

    setCreatingReq(true);
    setCreateMsg(null);

    try {
      const payload = {
        title: formFields.title.trim(),
        department: formFields.department,
        location: formFields.location,
        employment_type: formFields.employment_type,
        headcount: Number(formFields.headcount) || 1,
        priority: formFields.priority,
        hiring_manager: formFields.hiring_manager,
        must_have_skills: formFields.mustHaveSkills.split(",").map((s) => s.trim()).filter(Boolean),
        good_to_have_skills: formFields.goodToHaveSkills.split(",").map((s) => s.trim()).filter(Boolean),
        qualification: formFields.qualification,
        min_years_experience: Number(formFields.minYearsExperience) || null,
        ctc_budget: formFields.ctcBudget,
        description: formFields.description || formFields.title,
        raw_jd_text: rawJdText || formFields.description,
      };

      const res = await fetch("/api/requisitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create requisition.");

      setCreateMsg({
        type: "success",
        text: data.message || "Requisition created successfully!",
      });

      // Reload requisitions & switch to list
      await loadRequisitions();
      setTimeout(() => {
        setActiveTab("requisitions");
        setCreateMsg(null);
      }, 1500);
    } catch (err) {
      setCreateMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to create requisition.",
      });
    } finally {
      setCreatingReq(false);
    }
  }

  // Forward candidate to HM Review
  async function handleForwardToHM(reqId: string, appId: string) {
    setForwardingAppId(appId);
    try {
      const res = await fetch(`/api/requisitions/${reqId}/applications/${appId}/forward`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "hm_review" }),
      });

      if (res.ok) {
        setRequisitions((prev) =>
          prev.map((r) => {
            if (r.id !== reqId) return r;
            const updatedApps = (r.applications || []).map((a) =>
              a.id === appId ? { ...a, status: "hm_review" } : a
            );
            return {
              ...r,
              applications: updatedApps,
              hmReviewCount: updatedApps.filter((a) => a.status === "hm_review").length,
            };
          })
        );
      }
    } catch (err) {
      console.warn("Forward to HM failed:", err);
    } finally {
      setForwardingAppId(null);
    }
  }

  // Quick 1-click publish handler for Org Admin
  async function handleQuickApprove(reqId: string) {
    setPublishingId(reqId);
    try {
      const res = await fetch(`/api/requisitions/${reqId}/approve`, {
        method: "PATCH",
      });
      if (res.ok) {
        setRequisitions((prev) =>
          prev.map((r) =>
            r.id === reqId ? { ...r, status: "active", raw_status: "published" } : r
          )
        );
      }
    } catch (err) {
      console.warn("Approval failed:", err);
    } finally {
      setPublishingId(null);
    }
  }

  // KPIs
  const kpis = useMemo(() => {
    const totalOpenReqs = requisitions.length;
    let totalApps = 0;
    let totalHmReview = 0;

    requisitions.forEach((r) => {
      totalApps += r.totalApplications || 0;
      totalHmReview += r.hmReviewCount || 0;
    });

    return {
      openReqs: totalOpenReqs,
      totalApps,
      totalHmReview,
    };
  }, [requisitions]);

  return (
    <UniversalPlatformShell
      portalTitle="Talent Partner Hub"
      leftTitle="Talent Operations"
      leftSubtitle="Requisitions, AI Triage & Candidate Calibration"
      navItems={[
        {
          id: "requisitions",
          label: "My Requisitions",
          icon: "briefcase",
          badge: String(kpis.openReqs),
          badgeColor: "amber",
          active: activeTab === "requisitions",
          onClick: () => setActiveTab("requisitions"),
        },
        {
          id: "agents",
          label: "AI Agents",
          icon: "users",
          active: activeTab === "agents",
          onClick: () => setActiveTab("agents"),
        },
        {
          id: "analytics",
          label: "Funnel Analytics",
          icon: "chart",
          active: activeTab === "analytics",
          onClick: () => setActiveTab("analytics"),
        },
      ]}
      activeNavId={activeTab}
      onSelectNav={(id) => setActiveTab(id as any)}
      avatarConfig={{
        title: "Shree",
        subtitle: "AI powered hiring partner",
        badgeText: "Active 24/7",
      }}
      searchPlaceholder="Search requisitions, candidates, or skills..."
      suggestedQuestions={[
        "Show all candidates across active requisitions",
        "Which requisitions are pending approval?",
        "How many candidates were forwarded to HM review?",
      ]}
    >
      {/* PERSPECTIVE CONTROL BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-subtle/30 border border-border rounded-xl mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-ink-muted uppercase tracking-wider">
            Active Perspective:
          </span>
          <div className="inline-flex rounded-lg border border-border bg-page p-0.5">
            <button
              type="button"
              onClick={() => setActiveRolePerspective("recruiter")}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                activeRolePerspective === "recruiter"
                  ? "bg-brand text-white shadow-soft-sm"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              Recruiter (TA) Hub
            </button>
            <button
              type="button"
              onClick={() => setActiveRolePerspective("hiring_manager")}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                activeRolePerspective === "hiring_manager"
                  ? "bg-brand text-white shadow-soft-sm"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              Hiring Manager (HM) Hub
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-ink-muted">
          <span>
            Mode:{" "}
            <strong className="text-ink">
              {activeRolePerspective === "recruiter" ? "Full Candidate Access" : "Count Only (Locked until TA sends)"}
            </strong>
          </span>
        </div>
      </div>

      {/* ================= TAB 1: REQUISITIONS LIST & CANDIDATE INGESTION ================= */}
      {activeTab === "requisitions" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-ink font-display">
                {activeRolePerspective === "recruiter" ? "Recruiter Pipeline & Requisitions" : "Hiring Manager Requisitions"}
              </h2>
              <p className="text-xs text-ink-muted mt-0.5">
                {activeRolePerspective === "recruiter"
                  ? "Full visibility into all applications, candidate profiles, and HM review forwarding"
                  : "Track candidate volume metrics — candidate profiles unlock once forwarded by TA"}
              </p>
            </div>
            <button
              onClick={() => setActiveTab("create")}
              className="bg-brand text-white text-xs font-bold px-3.5 py-1.5 rounded-lg shadow-sm hover:opacity-95 transition-opacity flex items-center gap-1.5"
            >
              <Icon name="sparkle" size={13} />
              <span>+ Create Requisition</span>
            </button>
          </div>

          {loadingReqs ? (
            <div className="py-12 text-center text-xs text-ink-muted">
              Loading requisitions...
            </div>
          ) : requisitions.length === 0 ? (
            <div className="p-8 border border-dashed border-border rounded-xl text-center bg-surface">
              <Icon name="briefcase" className="w-8 h-8 text-ink-muted mx-auto mb-2" />
              <h4 className="text-sm font-bold text-ink m-0">No Requisitions Found</h4>
              <p className="text-xs text-ink-muted mt-1">
                Click "+ Create Requisition" above to drop your JD and publish to the Guest Hub.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {requisitions.map((req) => {
                const isExpanded = expandedReqId === req.id;
                const isPending = req.raw_status === "pending_approval";
                const apps = req.applications || [];
                const hmReviewApps = apps.filter((a) => a.status === "hm_review");

                return (
                  <div
                    key={req.id}
                    className={`bg-surface border rounded-xl overflow-hidden transition-all shadow-soft-sm ${
                      isExpanded ? "border-brand ring-1 ring-brand/20" : "border-border hover:border-border-strong"
                    }`}
                  >
                    {/* Requisition Card Header */}
                    <div
                      onClick={() => setExpandedReqId(isExpanded ? null : req.id)}
                      className="p-4 cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-gradient-to-r from-surface via-surface to-page/40"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-brand-wash flex items-center justify-center text-brand flex-shrink-0 mt-0.5">
                          <Icon name="briefcase" size={18} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-mono text-ink-muted font-bold">
                              {req.req_no}
                            </span>
                            <h3 className="text-sm sm:text-[14px] font-bold text-ink truncate m-0">
                              {req.title}
                            </h3>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                isPending
                                  ? "bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300"
                                  : "bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300"
                              }`}
                            >
                              {isPending ? "Pending Approval" : "Published (Guest Hub Live)"}
                            </span>
                          </div>
                          <p className="text-[11.5px] text-ink-muted mt-0.5 truncate m-0">
                            {req.department} • {req.location} • HM: <span className="text-ink font-semibold">{req.hiring_manager}</span>
                          </p>
                        </div>
                      </div>

                      {/* Right KPIs & Quick Actions */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Application Count Pill */}
                        <div className="px-3 py-1.5 rounded-lg bg-page border border-border text-center">
                          <div className="text-sm font-bold text-ink">{req.totalApplications}</div>
                          <div className="text-[9.5px] text-ink-muted uppercase">Applications</div>
                        </div>

                        {/* Forwarded to HM Count */}
                        <div className="px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-center">
                          <div className="text-sm font-bold text-purple-700 dark:text-purple-300">
                            {req.hmReviewCount}
                          </div>
                          <div className="text-[9.5px] text-purple-600 dark:text-purple-400 uppercase">
                            In HM Review
                          </div>
                        </div>

                        {/* Org Admin Quick Approve if pending */}
                        {isPending && (
                          <button
                            type="button"
                            disabled={publishingId === req.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickApprove(req.id);
                            }}
                            className="bg-brand text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm hover:opacity-95 transition-opacity flex items-center gap-1 cursor-pointer"
                          >
                            <span>⚡</span>
                            <span>{publishingId === req.id ? "Publishing..." : "Approve & Publish"}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expanded Requisition Panel */}
                    {isExpanded && (
                      <div className="p-4 bg-page/40 border-t border-border space-y-4">
                        {/* RECRUITER PERSPECTIVE: ALL APPLICATIONS */}
                        {activeRolePerspective === "recruiter" && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between pb-2 border-b border-border">
                              <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-ink m-0">
                                  All Applications ({apps.length})
                                </h4>
                                <p className="text-[11.5px] text-ink-muted mt-0.5 m-0">
                                  Review candidates, evaluate 9 profile fields, and forward qualified talent to Hiring Manager.
                                </p>
                              </div>
                              <Link
                                href={`/jobs/${req.id}`}
                                target="_blank"
                                className="text-xs font-semibold text-brand hover:underline flex items-center gap-1"
                              >
                                <span>View on Guest Hub</span>
                                <span>↗</span>
                              </Link>
                            </div>

                            {apps.length === 0 ? (
                              <div className="py-8 text-center border border-dashed border-border rounded-xl bg-surface/50">
                                <Icon name="users" className="w-6 h-6 text-ink-muted mx-auto mb-1.5" />
                                <p className="text-xs font-semibold text-ink m-0">No applications received yet</p>
                                <p className="text-[11px] text-ink-muted mt-0.5">
                                  Candidates can apply directly via Quick Apply on the Guest Hub.
                                </p>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 gap-3">
                                {apps.map((app) => {
                                  const details = parseCandidate9Fields(app);
                                  const isInHmReview = app.status === "hm_review";

                                  return (
                                    <div
                                      key={app.id}
                                      className="p-4 rounded-xl bg-surface border border-border shadow-soft-sm space-y-3"
                                    >
                                      {/* Candidate Card Header */}
                                      <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <h5 className="text-[14px] font-bold text-ink m-0">
                                              {details.fullName}
                                            </h5>
                                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-brand-wash text-brand border border-brand/20">
                                              {app.match_score ? `${app.match_score}% Match` : "80% Match"}
                                            </span>
                                            {isInHmReview && (
                                              <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                                                ✓ Forwarded to HM Review
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-xs text-ink-muted mt-0.5 m-0">
                                            {details.email} • {details.phone}
                                          </p>
                                        </div>

                                        {/* Forward to HM Action */}
                                        <div>
                                          {!isInHmReview ? (
                                            <button
                                              type="button"
                                              disabled={forwardingAppId === app.id}
                                              onClick={() => handleForwardToHM(req.id, app.id)}
                                              className="bg-brand text-white text-xs font-bold px-3.5 py-1.5 rounded-lg shadow-sm hover:opacity-95 transition-opacity flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                            >
                                              <Icon name="sparkle" size={13} />
                                              <span>{forwardingAppId === app.id ? "Sending..." : "Send to HM Review"}</span>
                                            </button>
                                          ) : (
                                            <span className="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                                              <span>✓</span>
                                              <span>In HM Review</span>
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      {/* 9 Candidate Fields Grid */}
                                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2 border-t border-border/60 text-[11.5px]">
                                        <div className="p-2 rounded-lg bg-page border border-border/50">
                                          <span className="text-[10px] uppercase font-bold text-ink-muted block">Location</span>
                                          <span className="font-semibold text-ink truncate block">{details.location}</span>
                                        </div>
                                        <div className="p-2 rounded-lg bg-page border border-border/50">
                                          <span className="text-[10px] uppercase font-bold text-ink-muted block">Current Org</span>
                                          <span className="font-semibold text-ink truncate block">{details.currentOrganization}</span>
                                        </div>
                                        <div className="p-2 rounded-lg bg-page border border-border/50">
                                          <span className="text-[10px] uppercase font-bold text-ink-muted block">Qualification</span>
                                          <span className="font-semibold text-ink truncate block">{details.qualification}</span>
                                        </div>
                                        <div className="p-2 rounded-lg bg-page border border-border/50">
                                          <span className="text-[10px] uppercase font-bold text-ink-muted block">Present CTC</span>
                                          <span className="font-semibold text-ink truncate block">{details.presentSalary}</span>
                                        </div>
                                        <div className="p-2 rounded-lg bg-page border border-border/50">
                                          <span className="text-[10px] uppercase font-bold text-ink-muted block">Notice Period</span>
                                          <span className="font-semibold text-ink truncate block">{details.noticePeriod}</span>
                                        </div>
                                        <div className="p-2 rounded-lg bg-page border border-border/50">
                                          <span className="text-[10px] uppercase font-bold text-ink-muted block">Applied On</span>
                                          <span className="font-semibold text-ink truncate block">
                                            {new Date(app.created_at).toLocaleDateString()}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Reason for Switching & Skills */}
                                      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                                        <div className="text-ink-muted">
                                          <strong className="text-ink">Reason for Switching:</strong> {details.switchingReason}
                                        </div>
                                        {Array.isArray(app.matched_skills) && app.matched_skills.length > 0 && (
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="text-[11px] font-semibold text-ink-muted">Matched:</span>
                                            {app.matched_skills.slice(0, 3).map((sk) => (
                                              <span
                                                key={sk}
                                                className="px-1.5 py-0.5 rounded text-[10.5px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium"
                                              >
                                                {sk}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}

                        {/* HIRING MANAGER PERSPECTIVE: COUNT ONLY (LOCKED UNTIL SENT) */}
                        {activeRolePerspective === "hiring_manager" && (
                          <div className="space-y-4">
                            {/* HM Volume Metric Card */}
                            <div className="p-5 rounded-xl border border-brand/30 bg-gradient-to-r from-brand-wash/30 via-surface to-page text-center sm:text-left flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div>
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 mb-2">
                                  <span>🔒 Raw Triage Gated</span>
                                </div>
                                <h4 className="text-base sm:text-lg font-bold text-ink m-0">
                                  {req.totalApplications} Applications Received
                                </h4>
                                <p className="text-xs text-ink-muted mt-1 max-w-md m-0">
                                  Talent Acquisition is screening and calibrating incoming applicants against STAR rubrics. Candidate profiles unlock here once forwarded to HM Review.
                                </p>
                              </div>

                              <div className="p-3 rounded-xl bg-surface border border-border text-center shrink-0">
                                <div className="text-2xl font-bold text-brand font-display">
                                  {hmReviewApps.length}
                                </div>
                                <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                                  Ready for Your Review
                                </div>
                              </div>
                            </div>

                            {/* HM Review Shortlist (Only candidates forwarded by Recruiter) */}
                            <div>
                              <h4 className="text-xs font-bold uppercase tracking-wider text-ink mb-2">
                                Candidates Forwarded for HM Review ({hmReviewApps.length})
                              </h4>

                              {hmReviewApps.length === 0 ? (
                                <div className="p-6 border border-dashed border-border rounded-xl text-center text-xs text-ink-muted bg-surface/50">
                                  No candidates forwarded to HM review yet. Recruiter triage in progress.
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 gap-3">
                                  {hmReviewApps.map((app) => {
                                    const details = parseCandidate9Fields(app);

                                    return (
                                      <div
                                        key={app.id}
                                        className="p-4 rounded-xl bg-surface border border-brand/40 shadow-soft-sm space-y-2.5"
                                      >
                                        <div className="flex items-center justify-between">
                                          <div>
                                            <h5 className="text-[14px] font-bold text-ink m-0">
                                              {details.fullName}
                                            </h5>
                                            <p className="text-xs text-ink-muted mt-0.5 m-0">
                                              {details.currentOrganization} • {details.qualification} • {details.location}
                                            </p>
                                          </div>
                                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-brand-wash text-brand border border-brand/20">
                                            {app.match_score}% Calibrated
                                          </span>
                                        </div>

                                        <div className="p-2.5 rounded-lg bg-page border border-border text-xs text-ink-muted">
                                          <strong className="text-ink">Notice Period:</strong> {details.noticePeriod} | <strong className="text-ink">Expected CTC:</strong> {details.presentSalary}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: CREATE REQUISITION WITH JD DROP & AI PARSE ================= */}
      {activeTab === "create" && (
        <div className="max-w-3xl mx-auto w-full space-y-4 py-2">
          <div className="flex items-center justify-between">
            <div>
              <button
                type="button"
                onClick={() => setActiveTab("requisitions")}
                className="text-xs font-semibold text-brand hover:underline flex items-center gap-1 mb-1 cursor-pointer"
              >
                <span>←</span>
                <span>Back to My Requisitions</span>
              </button>
              <h2 className="text-sm sm:text-base font-bold text-ink font-display m-0">
                Create New Requisition (JD Ingestion)
              </h2>
              <p className="text-xs text-ink-muted mt-0.5 m-0">
                Drop your JD document or paste text. Shree AI will analyze and autofill specifications for your review.
              </p>
            </div>
          </div>

          {createMsg && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold animate-fade-in flex items-center gap-2 ${
                createMsg.type === "success"
                  ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20"
                  : "bg-critical-wash text-critical border border-critical/20"
              }`}
            >
              <Icon name={createMsg.type === "success" ? "check" : "alert-triangle"} className="w-4 h-4" />
              <span>{createMsg.text}</span>
            </div>
          )}

          {/* STEP 1: JD DROP ZONE */}
          <div className="bg-surface border border-border rounded-2xl p-5 shadow-soft space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                Step 1: Upload or Drop Job Description
              </span>
              {jdFile && (
                <span className="text-xs font-semibold text-brand">
                  Attached: {jdFile.name}
                </span>
              )}
            </div>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file) {
                  setJdFile(file);
                  handleAnalyzeJd(file);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border hover:border-brand/60 rounded-xl p-6 bg-subtle/20 hover:bg-brand-wash/10 cursor-pointer transition-all flex flex-col items-center text-center gap-2"
            >
              <div className="w-12 h-12 rounded-full bg-brand-wash text-brand flex items-center justify-center">
                <Icon name="sparkle" size={20} />
              </div>
              <p className="text-[13.5px] font-bold text-ink m-0">
                Drag &amp; drop JD file (PDF, DOCX, TXT)
              </p>
              <p className="text-[11.5px] text-ink-muted m-0">
                or click to browse from your computer
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setJdFile(file);
                    handleAnalyzeJd(file);
                  }
                }}
              />
            </div>

            {/* Optional Paste JD Text */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-1">
                Or paste raw JD text here
              </label>
              <textarea
                rows={3}
                value={rawJdText}
                onChange={(e) => setRawJdText(e.target.value)}
                placeholder="Paste job description requirements, responsibilities, and qualifications..."
                className="w-full text-xs p-3 rounded-xl border border-border bg-page text-ink focus:border-brand focus:outline-none resize-none"
              />
            </div>

            <button
              type="button"
              disabled={analyzingJd || (!jdFile && !rawJdText.trim())}
              onClick={() => handleAnalyzeJd()}
              className="w-full bg-brand text-white text-xs font-bold py-2.5 rounded-xl shadow-button hover:opacity-95 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {analyzingJd ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>AI is parsing JD fields...</span>
                </>
              ) : (
                <>
                  <Icon name="sparkle" size={14} />
                  <span>Analyse JD with Shree AI</span>
                </>
              )}
            </button>
          </div>

          {/* STEP 2: REVIEW & REFINE EXTRACTED REQUISITION FIELDS */}
          <form onSubmit={handleSubmitRequisition} className="bg-surface border border-border rounded-2xl p-5 shadow-soft space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                Step 2: Review &amp; Refine Specifications
              </span>
              <span className="text-[11px] text-ink-muted">
                Adjust any fields prior to submission
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-ink mb-1">Job Title *</label>
                <input
                  type="text"
                  required
                  value={formFields.title}
                  onChange={(e) => setFormFields({ ...formFields, title: e.target.value })}
                  placeholder="e.g. Senior Machine Learning Engineer"
                  className="w-full px-3 py-2 rounded-xl bg-page border border-border text-xs text-ink focus:border-brand focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">Department</label>
                <input
                  type="text"
                  value={formFields.department}
                  onChange={(e) => setFormFields({ ...formFields, department: e.target.value })}
                  placeholder="e.g. Engineering / Product"
                  className="w-full px-3 py-2 rounded-xl bg-page border border-border text-xs text-ink focus:border-brand focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">Location / Workplace Mode</label>
                <input
                  type="text"
                  value={formFields.location}
                  onChange={(e) => setFormFields({ ...formFields, location: e.target.value })}
                  placeholder="e.g. San Francisco, CA / Remote"
                  className="w-full px-3 py-2 rounded-xl bg-page border border-border text-xs text-ink focus:border-brand focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">Hiring Manager (Lead)</label>
                <input
                  type="text"
                  value={formFields.hiring_manager}
                  onChange={(e) => setFormFields({ ...formFields, hiring_manager: e.target.value })}
                  placeholder="e.g. David Miller (VP Engineering)"
                  className="w-full px-3 py-2 rounded-xl bg-page border border-border text-xs text-ink focus:border-brand focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">Min Years Experience</label>
                <input
                  type="number"
                  min={0}
                  value={formFields.minYearsExperience}
                  onChange={(e) => setFormFields({ ...formFields, minYearsExperience: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-page border border-border text-xs text-ink focus:border-brand focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">Salary / Compensation Budget</label>
                <input
                  type="text"
                  value={formFields.ctcBudget}
                  onChange={(e) => setFormFields({ ...formFields, ctcBudget: e.target.value })}
                  placeholder="e.g. $140,000 - $180,000 / 25-35 LPA"
                  className="w-full px-3 py-2 rounded-xl bg-page border border-border text-xs text-ink focus:border-brand focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">Must-Have Skills (comma separated)</label>
              <input
                type="text"
                value={formFields.mustHaveSkills}
                onChange={(e) => setFormFields({ ...formFields, mustHaveSkills: e.target.value })}
                placeholder="e.g. React, TypeScript, Node.js"
                className="w-full px-3 py-2 rounded-xl bg-page border border-border text-xs text-ink focus:border-brand focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">Good-To-Have Skills (comma separated)</label>
              <input
                type="text"
                value={formFields.goodToHaveSkills}
                onChange={(e) => setFormFields({ ...formFields, goodToHaveSkills: e.target.value })}
                placeholder="e.g. GraphQL, Docker, Next.js 15"
                className="w-full px-3 py-2 rounded-xl bg-page border border-border text-xs text-ink focus:border-brand focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">Qualification / Education</label>
              <input
                type="text"
                value={formFields.qualification}
                onChange={(e) => setFormFields({ ...formFields, qualification: e.target.value })}
                placeholder="e.g. B.Tech / M.S. in Computer Science or equivalent"
                className="w-full px-3 py-2 rounded-xl bg-page border border-border text-xs text-ink focus:border-brand focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">Job Description / Responsibilities</label>
              <textarea
                rows={4}
                value={formFields.description}
                onChange={(e) => setFormFields({ ...formFields, description: e.target.value })}
                placeholder="Detailed expectations and specifications for this role..."
                className="w-full text-xs p-3 rounded-xl border border-border bg-page text-ink focus:border-brand focus:outline-none resize-none"
              />
            </div>

            <div className="pt-3 flex items-center justify-between border-t border-border">
              <span className="text-[11.5px] text-ink-muted">
                License-Aware: Individual license auto-publishes to Guest Hub; Org license enters approval queue.
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("requisitions")}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-ink-muted hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingReq || !formFields.title.trim()}
                  className="bg-brand text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-button hover:opacity-95 transition-opacity disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {creatingReq ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Icon name="sparkle" size={13} />
                      <span>Submit Requisition</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ================= TAB 3: AGENTS ================= */}
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
                icon: "sparkle",
              },
              {
                name: "Interview Coordinator Bot",
                role: "Real-Time Slot Calibration",
                status: "Live & Active",
                metric: "18 slots scheduled",
                badge: "Active",
                icon: "briefcase",
              },
              {
                name: "HM Bias & Rubric Calibrator",
                role: "Objective Scorecard Normalization",
                status: "Live & Active",
                metric: "Zero compliance flags",
                badge: "Active",
                icon: "check",
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
                      <h4 className="text-xs sm:text-sm font-bold text-ink m-0">{agent.name}</h4>
                      <p className="text-[10.5px] text-ink-muted m-0">{agent.role}</p>
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

      {/* ================= TAB 4: ANALYTICS ================= */}
      {activeTab === "analytics" && (
        <div className="space-y-4">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-ink font-display">
              Recruitment Analytics &amp; Funnel Velocity
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
