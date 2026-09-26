"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import UniversalPlatformShell from "@/components/UniversalPlatformShell";
import Icon from "@/components/Icon";
import { createClient } from "@/lib/supabase/client";
import JobPostingTemplate from "@/components/JobPostingTemplate";
import { STAGES } from "@/lib/talentStages";

export interface AtsRequisition {
  id: string;
  req_no: string;
  title: string;
  department?: string | null;
  location?: string | null;
  employment_type?: string | null;
  work_mode?: string | null;
  headcount?: number;
  status: string;
  priority?: string | null;
  hiring_manager?: string | null;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AtsApplication {
  id: string;
  stage: string;
  rating?: number | null;
  match_score?: number | null;
  match_score_note?: string | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  current_company?: string | null;
  current_location?: string | null;
  experience_years?: number | null;
  notice_period?: string | null;
  current_ctc?: number | null;
  expected_ctc?: number | null;
  qualification?: string | null;
  resume_file_name?: string | null;
  has_resume_file?: boolean;
  met_must_have_skills?: string[] | null;
  missing_must_have_skills?: string[] | null;
  created_at: string;
  requisition_id: string;
  requisition_title?: string | null;
  requisition_req_no?: string | null;
}

// Content blocks for a posting.
// TODO (Phase 3): Replace free-text blocks with the JobPostingTemplate component.
interface PostingContent {
  who_we_are?: string;
  success_stories?: string;
  why_join_us?: string;
  what_you_will_do?: string;
  core_strengths?: string;
  additional_strengths?: string;
  how_you_grow?: string;
}

type ActiveFeature = "new_requisition" | "all_requisitions" | "all_applications" | "post_to_boards";

export default function RecruiterPage() {
  const router = useRouter();
  const [activeFeature, setActiveFeature] = useState<ActiveFeature>("all_requisitions");
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [requisitions, setRequisitions] = useState<AtsRequisition[]>([]);
  const [loadingReqs, setLoadingReqs] = useState(true);
  const [reqError, setReqError] = useState<string | null>(null);
  // Distinguishes "this account has no recruiter-side role" (403 from
  // /api/ats/requisitions) from a generic load failure, so the page can
  // show one clean message instead of the KPI row + a raw "Forbidden"
  // error sitting underneath it.
  const [noAccess, setNoAccess] = useState(false);

  const [applications, setApplications] = useState<AtsApplication[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [appReqFilter, setAppReqFilter] = useState<string>("");
  const [appStageFilter, setAppStageFilter] = useState<string>("");

  const [newReqForm, setNewReqForm] = useState({
    title: "", department: "", location: "",
    work_mode: "on-site" as "on-site" | "remote" | "hybrid",
    employment_type: "full-time",
    headcount: 1,
    priority: "medium" as "low" | "medium" | "high" | "urgent",
    hiring_manager: "", description: "", must_have_skills: "", good_to_have_skills: "",
  });
  const [creatingReq, setCreatingReq] = useState(false);
  const [newReqMsg, setNewReqMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [rawJdText, setRawJdText] = useState("");
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [analyzingJd, setAnalyzingJd] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [postTargetReqId, setPostTargetReqId] = useState<string>("");
  const [postBoards, setPostBoards] = useState<Set<string>>(new Set(["askshree"]));
  const [boardDropdownOpen, setBoardDropdownOpen] = useState(false);
  const [postHideCompany, setPostHideCompany] = useState(false);
  const [postValidThrough, setPostValidThrough] = useState("");
  const [postContent, setPostContent] = useState<PostingContent>({});
  const [postStatus, setPostStatus] = useState<"draft" | "published">("draft");
  const [savingPost, setSavingPost] = useState(false);
  const [postMsg, setPostMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    async function check() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/login?next=/recruiter"); return; }
        setCheckingAuth(false);
      } catch { setCheckingAuth(false); }
    }
    check();
  }, [router]);

  async function loadRequisitions() {
    setLoadingReqs(true); setReqError(null); setNoAccess(false);
    try {
      const res = await fetch("/api/ats/requisitions");
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        if (res.status === 403) { setNoAccess(true); return; }
        setReqError(d.error || "Failed to load requisitions.");
        return;
      }
      const data = await res.json();
      setRequisitions(Array.isArray(data.requisitions) ? data.requisitions : []);
    } catch { setReqError("Network error loading requisitions."); }
    finally { setLoadingReqs(false); }
  }

  useEffect(() => { if (!checkingAuth) loadRequisitions(); }, [checkingAuth]);

  // Deep-link support: /recruiter?feature=post_to_boards&req=<id> (used by
  // the requisition detail page's Post/Applications buttons).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const qs = new URLSearchParams(window.location.search);
    const feature = qs.get("feature") as ActiveFeature | null;
    const reqParam = qs.get("req");
    if (feature) setActiveFeature(feature);
    if (reqParam) {
      setPostTargetReqId(reqParam);
      setAppReqFilter(reqParam);
    }
  }, []);

  // Fetches ALL of the requisition's candidates (no stage filter) so the
  // stage tabs below can show live counts and switching tabs is instant --
  // filtering by stage happens client-side against this one loaded set.
  async function loadApplications() {
    setLoadingApps(true);
    try {
      const params = new URLSearchParams();
      if (appReqFilter) params.set("requisition_id", appReqFilter);
      const res = await fetch(`/api/ats/applications?${params.toString()}`);
      const data = await res.json().catch(() => ({}));
      setApplications(Array.isArray(data.applications) ? data.applications : []);
    } catch { setApplications([]); }
    finally { setLoadingApps(false); }
  }

  useEffect(() => {
    if (activeFeature === "all_applications" && !checkingAuth) loadApplications();
  }, [activeFeature, appReqFilter, checkingAuth]);

  const stageTabCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of applications) counts[a.stage] = (counts[a.stage] || 0) + 1;
    return counts;
  }, [applications]);

  const visibleApplications = useMemo(
    () => (appStageFilter ? applications.filter((a) => a.stage === appStageFilter) : applications),
    [applications, appStageFilter]
  );

  const [expandedAppId, setExpandedAppId] = useState<string | null>(null);
  const [editingAppId, setEditingAppId] = useState<string | null>(null);
  const [savingAppEdit, setSavingAppEdit] = useState(false);

  async function patchApplication(id: string, patch: Record<string, unknown>) {
    setSavingAppEdit(true);
    try {
      const res = await fetch(`/api/ats/applications/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save.");
      setApplications((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save change.");
    } finally { setSavingAppEdit(false); }
  }

  async function viewResume(id: string) {
    try {
      const res = await fetch(`/api/ats/applications/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load resume.");
      const url = data.application?.resumeUrl;
      if (url) window.open(url, "_blank", "noopener,noreferrer");
      else alert("No CV on file for this candidate yet.");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to load resume.");
    }
  }

  function whatsappCallbackLink(app: AtsApplication) {
    if (!app.phone) return null;
    const digits = app.phone.replace(/[^0-9]/g, "");
    const msg = encodeURIComponent(
      `Hi ${app.name}, this is the recruiting team${app.requisition_title ? ` for ${app.requisition_title}` : ""}. Could you please call us back when you get a chance? Thank you!`
    );
    return `https://wa.me/${digits}?text=${msg}`;
  }

  async function handleAnalyzeJd(file?: File) {
    const targetFile = file || jdFile;
    if (!targetFile && !rawJdText.trim()) return;
    setAnalyzingJd(true);
    try {
      let res: Response;
      if (targetFile) {
        const fd = new FormData(); fd.append("files", targetFile);
        res = await fetch("/api/public/job-postings/analyze", { method: "POST", body: fd });
      } else {
        res = await fetch("/api/public/job-postings/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rawText: rawJdText }) });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed.");
      const draft = data.drafts?.[0];
      if (!draft || draft.error) throw new Error("Could not parse JD.");
      setNewReqForm((f) => ({
        ...f,
        title: draft.title || f.title,
        department: draft.industry || f.department,
        location: draft.location || f.location,
        must_have_skills: Array.isArray(draft.must_have_skills) ? draft.must_have_skills.join(", ") : f.must_have_skills,
        good_to_have_skills: Array.isArray(draft.good_to_have_skills) ? draft.good_to_have_skills.join(", ") : f.good_to_have_skills,
        description: draft.rawJdText || draft.description || rawJdText || f.description,
      }));
      setNewReqMsg({ type: "success", text: "JD analysed. Fields autofilled. Please review before submitting." });
    } catch (err) {
      setNewReqMsg({ type: "error", text: err instanceof Error ? err.message : "JD analysis failed." });
    } finally { setAnalyzingJd(false); }
  }

  async function handleSubmitRequisition(e: React.FormEvent) {
    e.preventDefault();
    if (!newReqForm.title.trim()) { setNewReqMsg({ type: "error", text: "Job title is required." }); return; }
    setCreatingReq(true); setNewReqMsg(null);
    try {
      const res = await fetch("/api/ats/requisitions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newReqForm.title.trim(),
          department: newReqForm.department || undefined,
          location: newReqForm.location || undefined,
          work_mode: newReqForm.work_mode,
          employment_type: newReqForm.employment_type,
          headcount: Number(newReqForm.headcount) || 1,
          priority: newReqForm.priority,
          hiring_manager: newReqForm.hiring_manager || undefined,
          description: newReqForm.description || undefined,
          eligibility_criteria: {
            must_have_skills: newReqForm.must_have_skills.split(",").map((s) => s.trim()).filter(Boolean),
            good_to_have_skills: newReqForm.good_to_have_skills.split(",").map((s) => s.trim()).filter(Boolean),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create requisition.");
      setNewReqMsg({ type: "success", text: data.message || "Requisition created." });
      setNewReqForm({ title: "", department: "", location: "", work_mode: "on-site", employment_type: "full-time", headcount: 1, priority: "medium", hiring_manager: "", description: "", must_have_skills: "", good_to_have_skills: "" });
      setRawJdText(""); setJdFile(null);
      await loadRequisitions();
      setTimeout(() => { setActiveFeature("all_requisitions"); setNewReqMsg(null); }, 1800);
    } catch (err) {
      setNewReqMsg({ type: "error", text: err instanceof Error ? err.message : "Failed to create requisition." });
    } finally { setCreatingReq(false); }
  }

  async function handleSavePosting(e: React.FormEvent) {
    e.preventDefault();
    if (!postTargetReqId) { setPostMsg({ type: "error", text: "Select a requisition first." }); return; }
    if (postBoards.size === 0) { setPostMsg({ type: "error", text: "Select at least one job board." }); return; }
    setSavingPost(true); setPostMsg(null);
    try {
      const boards = Array.from(postBoards);
      const results = await Promise.all(boards.map(async (board) => {
        const res = await fetch(`/api/ats/requisitions/${postTargetReqId}/postings`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ board, hide_company_name: postHideCompany, valid_through: postValidThrough || null, status: postStatus, content: postContent }),
        });
        const data = await res.json();
        return { board, ok: res.ok, error: data.error as string | undefined };
      }));
      const failed = results.filter((r) => !r.ok);
      if (failed.length === results.length) {
        throw new Error(failed[0]?.error || "Failed to save posting.");
      }
      if (failed.length > 0) {
        setPostMsg({ type: "error", text: `Saved to ${results.length - failed.length} of ${results.length} boards. Failed: ${failed.map((f) => f.board).join(", ")}.` });
      } else {
        setPostMsg({ type: "success", text: `Posting saved to ${results.length} job board${results.length > 1 ? "s" : ""}.` });
      }
    } catch (err) {
      setPostMsg({ type: "error", text: err instanceof Error ? err.message : "Failed to save posting." });
    } finally { setSavingPost(false); }
  }

  const kpis = useMemo(() => ({
    totalReqs: requisitions.length,
    openReqs: requisitions.filter((r) => r.status === "open" || r.status === "approved").length,
    pendingApproval: requisitions.filter((r) => r.status === "pending_approval").length,
  }), [requisitions]);

  const navItems = [
    { id: "new_requisition", label: "+ New Requisition", icon: "sparkle", active: activeFeature === "new_requisition", onClick: () => setActiveFeature("new_requisition") },
    { id: "all_requisitions", label: "All Requisitions", icon: "briefcase", badge: kpis.totalReqs > 0 ? String(kpis.totalReqs) : undefined, badgeColor: "amber" as const, active: activeFeature === "all_requisitions", onClick: () => setActiveFeature("all_requisitions") },
    { id: "all_applications", label: "All Applications", icon: "users", active: activeFeature === "all_applications", onClick: () => setActiveFeature("all_applications") },
    { id: "post_to_boards", label: "Post to Boards", icon: "chart", active: activeFeature === "post_to_boards", onClick: () => setActiveFeature("post_to_boards") },
    { id: "candidate_search", label: "Search Candidates", icon: "search", active: false, onClick: () => router.push("/recruiter/candidates") },
  ];

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      open: "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300",
      approved: "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300",
      pending_approval: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300",
      rejected: "bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300",
      closed: "bg-gray-100 text-gray-600 border-gray-300",
    };
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${map[status] ?? "bg-gray-100 text-gray-600 border-gray-300"}`}>{status.replace(/_/g, " ")}</span>;
  };

  if (checkingAuth) return <div className="min-h-screen flex items-center justify-center bg-page"><div className="w-5 h-5 rounded-full border-2 border-brand border-t-transparent animate-spin" /></div>;
  return (
    <UniversalPlatformShell
      portalTitle="Recruiter Hub"
      leftTitle="Recruiter Hub"
      leftSubtitle="Requisitions, Applications & Postings"
      navItems={navItems}
      activeNavId={activeFeature}
      onSelectNav={(id) => setActiveFeature(id as ActiveFeature)}
      avatarConfig={{ title: "Shree", subtitle: "AI powered hiring partner", badgeText: "Active 24/7" }}
      searchPlaceholder="Search requisitions, candidates, or skills..."
      suggestedQuestions={["Show all open requisitions", "Which candidates are in HM Review?", "What requisitions are pending approval?"]}
    >
      {/* NEW REQUISITION */}
      {activeFeature === "new_requisition" && (
        <div className="max-w-3xl mx-auto w-full space-y-4 py-2">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-ink font-display">New Requisition</h2>
            <p className="text-xs text-ink-muted mt-0.5">Drop a JD or fill the form. Org licence enters approval queue; individual licence opens immediately.</p>
          </div>
          {newReqMsg && (
            <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${newReqMsg.type === "success" ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20" : "bg-rose-500/10 text-rose-800 dark:text-rose-300 border border-rose-500/20"}`}>
              <Icon name={newReqMsg.type === "success" ? "check" : "alert-triangle"} className="w-4 h-4" />
              <span>{newReqMsg.text}</span>
            </div>
          )}
          <div className="bg-surface border border-border rounded-2xl p-5 shadow-soft space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">Step 1 — Upload or paste Job Description (optional)</span>
            <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) { setJdFile(f); handleAnalyzeJd(f); } }} onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border hover:border-brand/60 rounded-xl p-6 bg-subtle/20 hover:bg-brand-wash/10 cursor-pointer transition-all flex flex-col items-center text-center gap-2">
              <div className="w-10 h-10 rounded-full bg-brand-wash text-brand flex items-center justify-center"><Icon name="sparkle" size={18} /></div>
              <p className="text-[13px] font-bold text-ink m-0">{jdFile ? jdFile.name : "Drag & drop JD (PDF, DOCX, TXT)"}</p>
              <p className="text-[11px] text-ink-muted m-0">or click to browse</p>
              <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setJdFile(f); handleAnalyzeJd(f); } }} />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-1">Or paste JD text</label>
              <textarea rows={2} value={rawJdText} onChange={(e) => setRawJdText(e.target.value)} placeholder="Paste job description text..." className="w-full text-xs p-3 rounded-xl border border-border bg-page text-ink focus:border-brand focus:outline-none resize-none" />
            </div>
            <button type="button" disabled={analyzingJd || (!jdFile && !rawJdText.trim())} onClick={() => handleAnalyzeJd()}
              className="w-full bg-brand text-white text-xs font-bold py-2.5 rounded-xl shadow-button hover:opacity-95 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer">
              {analyzingJd ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Analysing...</span></> : <><Icon name="sparkle" size={14} /><span>Analyse JD with Shree AI</span></>}
            </button>
          </div>
          <form onSubmit={handleSubmitRequisition} className="bg-surface border border-border rounded-2xl p-5 shadow-soft space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">Step 2 — Review & fill requisition details</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {([
                { label: "Job Title *", field: "title", placeholder: "e.g. Senior ML Engineer", required: true },
                { label: "Department", field: "department", placeholder: "e.g. Engineering" },
                { label: "Location", field: "location", placeholder: "e.g. Bangalore / Remote" },
                { label: "Hiring Manager", field: "hiring_manager", placeholder: "e.g. Ananya Sharma" },
              ] as { label: string; field: keyof typeof newReqForm; placeholder: string; required?: boolean }[]).map(({ label, field, placeholder, required }) => (
                <div key={field}>
                  <label className="block text-xs font-bold text-ink mb-1">{label}</label>
                  <input type="text" required={required} value={String(newReqForm[field])} onChange={(e) => setNewReqForm({ ...newReqForm, [field]: e.target.value })} placeholder={placeholder} className="w-full px-3 py-2 rounded-xl bg-page border border-border text-xs text-ink focus:border-brand focus:outline-none" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-bold text-ink mb-1">Work Mode</label>
                <select value={newReqForm.work_mode} onChange={(e) => setNewReqForm({ ...newReqForm, work_mode: e.target.value as typeof newReqForm.work_mode })} className="w-full px-3 py-2 rounded-xl bg-page border border-border text-xs text-ink focus:border-brand focus:outline-none">
                  <option value="on-site">On-site</option><option value="remote">Remote</option><option value="hybrid">Hybrid</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-ink mb-1">Employment Type</label>
                <select value={newReqForm.employment_type} onChange={(e) => setNewReqForm({ ...newReqForm, employment_type: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-page border border-border text-xs text-ink focus:border-brand focus:outline-none">
                  <option value="full-time">Full-Time</option><option value="part-time">Part-Time</option><option value="contract">Contract</option><option value="internship">Internship</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-ink mb-1">Openings</label>
                <input type="number" min={1} value={newReqForm.headcount} onChange={(e) => setNewReqForm({ ...newReqForm, headcount: Number(e.target.value) || 1 })} className="w-full px-3 py-2 rounded-xl bg-page border border-border text-xs text-ink focus:border-brand focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-ink mb-1">Priority</label>
                <select value={newReqForm.priority} onChange={(e) => setNewReqForm({ ...newReqForm, priority: e.target.value as typeof newReqForm.priority })} className="w-full px-3 py-2 rounded-xl bg-page border border-border text-xs text-ink focus:border-brand focus:outline-none">
                  <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-ink mb-1">Must-Have Skills (comma-separated)</label>
              <input type="text" value={newReqForm.must_have_skills} onChange={(e) => setNewReqForm({ ...newReqForm, must_have_skills: e.target.value })} placeholder="e.g. React, TypeScript, Node.js" className="w-full px-3 py-2 rounded-xl bg-page border border-border text-xs text-ink focus:border-brand focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink mb-1">Good-To-Have Skills (comma-separated)</label>
              <input type="text" value={newReqForm.good_to_have_skills} onChange={(e) => setNewReqForm({ ...newReqForm, good_to_have_skills: e.target.value })} placeholder="e.g. GraphQL, Docker" className="w-full px-3 py-2 rounded-xl bg-page border border-border text-xs text-ink focus:border-brand focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink mb-1">What You Will Do (responsibilities)</label>
              <textarea rows={3} value={newReqForm.description} onChange={(e) => setNewReqForm({ ...newReqForm, description: e.target.value })} placeholder="Describe day-to-day responsibilities..." className="w-full text-xs p-3 rounded-xl border border-border bg-page text-ink focus:border-brand focus:outline-none resize-none" />
            </div>
            <div className="pt-3 flex items-center justify-between border-t border-border">
              <span className="text-[11px] text-ink-muted">Org licence enters approval queue. Individual licence opens immediately.</span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setActiveFeature("all_requisitions")} className="px-4 py-2 rounded-xl text-xs font-semibold text-ink-muted hover:text-ink cursor-pointer">Cancel</button>
                <button type="submit" disabled={creatingReq || !newReqForm.title.trim()} className="bg-brand text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-button hover:opacity-95 transition-opacity disabled:opacity-50 flex items-center gap-2 cursor-pointer">
                  {creatingReq ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Submitting...</span></> : <><Icon name="sparkle" size={13} /><span>Submit Requisition</span></>}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ALL REQUISITIONS */}
      {activeFeature === "all_requisitions" && (
        noAccess ? (
          <div className="p-8 border border-dashed border-border rounded-xl text-center bg-surface max-w-md mx-auto">
            <Icon name="briefcase" className="w-8 h-8 text-ink-muted mx-auto mb-2" />
            <h4 className="text-sm font-bold text-ink m-0">No recruiter access on this account</h4>
            <p className="text-xs text-ink-muted mt-1">
              This account isn&apos;t set up with a recruiter, hiring manager, or org-admin role yet.
              Ask the platform owner to grant access, or sign in with a recruiter account instead.
            </p>
          </div>
        ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-ink font-display">All Requisitions</h2>
              <p className="text-xs text-ink-muted mt-0.5">{kpis.openReqs} open · {kpis.pendingApproval} pending approval · {kpis.totalReqs} total</p>
            </div>
            <button onClick={() => setActiveFeature("new_requisition")} className="bg-brand text-white text-xs font-bold px-3.5 py-1.5 rounded-lg shadow-sm hover:opacity-95 transition-opacity flex items-center gap-1.5 cursor-pointer">
              <Icon name="sparkle" size={13} /><span>+ New</span>
            </button>
          </div>
          {loadingReqs ? (
            <div className="py-12 text-center text-xs text-ink-muted">Loading requisitions...</div>
          ) : reqError ? (
            <div className="p-4 rounded-xl border border-rose-300 bg-rose-50 dark:bg-rose-950/20 text-xs text-rose-700 dark:text-rose-300">{reqError}</div>
          ) : requisitions.length === 0 ? (
            <div className="p-8 border border-dashed border-border rounded-xl text-center bg-surface">
              <Icon name="briefcase" className="w-8 h-8 text-ink-muted mx-auto mb-2" />
              <h4 className="text-sm font-bold text-ink m-0">No requisitions yet</h4>
              <p className="text-xs text-ink-muted mt-1">Use &quot;+ New Requisition&quot; to create your first one.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {requisitions.map((req) => (
                <div key={req.id} onClick={() => router.push(`/recruiter/requisitions/${req.id}`)} className="bg-surface border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-border-strong transition-colors shadow-soft-sm cursor-pointer">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-brand-wash flex items-center justify-center text-brand flex-shrink-0 mt-0.5"><Icon name="briefcase" size={18} /></div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10.5px] font-mono text-ink-muted font-bold">{req.req_no}</span>
                        <h3 className="text-sm font-bold text-ink truncate m-0">{req.title}</h3>
                        {statusBadge(req.status)}
                      </div>
                      <p className="text-[11px] text-ink-muted mt-0.5 m-0">
                        {[req.department, req.location, req.work_mode].filter(Boolean).join(" · ")}
                        {req.hiring_manager && <> · HM: <strong className="text-ink">{req.hiring_manager}</strong></>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                    <button onClick={(e) => { e.stopPropagation(); setPostTargetReqId(req.id); setActiveFeature("post_to_boards"); }} className="text-xs font-semibold text-brand border border-brand/30 bg-brand-wash/40 hover:bg-brand-wash px-3 py-1.5 rounded-lg transition-colors cursor-pointer">Post</button>
                    <button onClick={(e) => { e.stopPropagation(); setAppReqFilter(req.id); setActiveFeature("all_applications"); }} className="text-xs font-semibold text-ink-muted border border-border bg-page hover:border-border-strong px-3 py-1.5 rounded-lg transition-colors cursor-pointer">Applications</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        )
      )}

      {/* ALL APPLICATIONS */}
      {activeFeature === "all_applications" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-ink font-display">All Applications</h2>
              <p className="text-xs text-ink-muted mt-0.5">Candidates from your requisitions, by pipeline stage.</p>
            </div>
            <div className="flex items-center gap-2">
              <select value={appReqFilter} onChange={(e) => setAppReqFilter(e.target.value)} className="text-xs px-3 py-1.5 rounded-lg border border-border bg-page text-ink focus:border-brand focus:outline-none">
                <option value="">All Requisitions</option>
                {requisitions.map((r) => <option key={r.id} value={r.id}>{r.req_no} — {r.title}</option>)}
              </select>
              <button onClick={loadApplications} className="text-xs font-semibold text-ink-muted border border-border px-3 py-1.5 rounded-lg hover:border-border-strong transition-colors cursor-pointer">Refresh</button>
            </div>
          </div>

          {/* Stage tabs with live counts */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
            <button onClick={() => setAppStageFilter("")}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${appStageFilter === "" ? "bg-brand text-white" : "bg-page text-ink-muted border border-border hover:border-border-strong"}`}>
              All <span className="opacity-70 font-semibold">({applications.length})</span>
            </button>
            {STAGES.map((s) => (
              <button key={s.id} onClick={() => setAppStageFilter(s.id)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${appStageFilter === s.id ? "bg-brand text-white" : "bg-page text-ink-muted border border-border hover:border-border-strong"}`}>
                {s.label} <span className="opacity-70 font-semibold">({stageTabCounts[s.id] || 0})</span>
              </button>
            ))}
          </div>

          {loadingApps ? (
            <div className="py-12 text-center text-xs text-ink-muted">Loading applications...</div>
          ) : visibleApplications.length === 0 ? (
            <div className="p-8 border border-dashed border-border rounded-xl text-center bg-surface">
              <Icon name="users" className="w-8 h-8 text-ink-muted mx-auto mb-2" />
              <h4 className="text-sm font-bold text-ink m-0">No applications found</h4>
              <p className="text-xs text-ink-muted mt-1">Applications appear here once candidates apply to published postings.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {visibleApplications.map((app) => {
                const expanded = expandedAppId === app.id;
                const editing = editingAppId === app.id;
                const waLink = whatsappCallbackLink(app);
                return (
                  <div key={app.id} className="bg-surface border border-border rounded-xl shadow-soft-sm overflow-hidden">
                    <div className="p-4 space-y-2">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-ink m-0">{app.name}</h4>
                            {app.match_score != null
                              ? <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-brand-wash text-brand border border-brand/20">{app.match_score}% Match</span>
                              : <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 text-gray-500 border border-gray-200 dark:bg-gray-800 dark:text-gray-400">Not scored</span>
                            }
                            {!editing && statusBadge(app.stage)}
                          </div>
                          <p className="text-[11px] text-ink-muted mt-0.5 m-0 truncate">
                            {app.email}{app.current_company && ` · ${app.current_company}`}
                            {app.requisition_req_no && <> · <span className="font-mono">{app.requisition_req_no}</span> {app.requisition_title}</>}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button title="View CV" onClick={() => viewResume(app.id)} disabled={!app.has_resume_file}
                            className={`p-1.5 rounded-lg border transition-colors ${app.has_resume_file ? "border-border text-ink-muted hover:border-brand hover:text-brand cursor-pointer" : "border-border/50 text-ink-muted/40 cursor-not-allowed"}`}>
                            <Icon name="file" size={14} />
                          </button>
                          {waLink ? (
                            <a title="Request callback via WhatsApp" href={waLink} target="_blank" rel="noopener noreferrer"
                              className="p-1.5 rounded-lg border border-border text-ink-muted hover:border-emerald-500 hover:text-emerald-600 transition-colors">
                              <Icon name="whatsapp" size={14} />
                            </a>
                          ) : (
                            <span title="No phone number on file" className="p-1.5 rounded-lg border border-border/50 text-ink-muted/40 cursor-not-allowed">
                              <Icon name="whatsapp" size={14} />
                            </span>
                          )}
                          <button title={editing ? "Cancel edit" : "Edit"} onClick={() => setEditingAppId(editing ? null : app.id)}
                            className="p-1.5 rounded-lg border border-border text-ink-muted hover:border-brand hover:text-brand transition-colors cursor-pointer">
                            <Icon name={editing ? "x" : "edit"} size={14} />
                          </button>
                          <button title={expanded ? "Show less" : "Show more"} onClick={() => setExpandedAppId(expanded ? null : app.id)}
                            className="p-1.5 rounded-lg border border-border text-ink-muted hover:border-border-strong transition-colors cursor-pointer">
                            <Icon name={expanded ? "chevronUp" : "chevronDown"} size={14} />
                          </button>
                        </div>
                      </div>

                      {editing ? (
                        <form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            const fd = new FormData(e.currentTarget);
                            await patchApplication(app.id, {
                              stage: String(fd.get("stage") || app.stage),
                              notice_period: String(fd.get("notice_period") || ""),
                              expected_ctc: fd.get("expected_ctc") ? Number(fd.get("expected_ctc")) : null,
                              qualification: String(fd.get("qualification") || ""),
                            });
                            setEditingAppId(null);
                          }}
                          className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1"
                        >
                          <div>
                            <label className="text-[10px] uppercase font-bold text-ink-muted block mb-0.5">Stage</label>
                            <select name="stage" defaultValue={app.stage} className="w-full text-xs px-2 py-1.5 rounded-lg border border-border bg-page text-ink focus:border-brand focus:outline-none">
                              {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] uppercase font-bold text-ink-muted block mb-0.5">Notice Period</label>
                            <input name="notice_period" defaultValue={app.notice_period ?? ""} className="w-full text-xs px-2 py-1.5 rounded-lg border border-border bg-page text-ink focus:border-brand focus:outline-none" />
                          </div>
                          <div>
                            <label className="text-[10px] uppercase font-bold text-ink-muted block mb-0.5">Expected CTC</label>
                            <input name="expected_ctc" type="number" defaultValue={app.expected_ctc ?? ""} className="w-full text-xs px-2 py-1.5 rounded-lg border border-border bg-page text-ink focus:border-brand focus:outline-none" />
                          </div>
                          <div>
                            <label className="text-[10px] uppercase font-bold text-ink-muted block mb-0.5">Qualification</label>
                            <input name="qualification" defaultValue={app.qualification ?? ""} className="w-full text-xs px-2 py-1.5 rounded-lg border border-border bg-page text-ink focus:border-brand focus:outline-none" />
                          </div>
                          <div className="col-span-2 sm:col-span-4 flex justify-end">
                            <button type="submit" disabled={savingAppEdit} className="bg-brand text-white text-xs font-bold px-4 py-1.5 rounded-lg shadow-button hover:opacity-95 transition-opacity disabled:opacity-50 cursor-pointer">
                              {savingAppEdit ? "Saving..." : "Save"}
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px]">
                          {([{ label: "Location", value: app.current_location }, { label: "Experience", value: app.experience_years ? `${app.experience_years} yrs` : null }, { label: "Notice", value: app.notice_period }, { label: "Expected CTC", value: app.expected_ctc ? String(app.expected_ctc) : null }] as {label:string;value:string|null|undefined}[]).filter((f) => f.value).map((f) => (
                            <div key={f.label} className="p-2 rounded-lg bg-page border border-border/50">
                              <span className="text-[10px] uppercase font-bold text-ink-muted block">{f.label}</span>
                              <span className="font-semibold text-ink truncate block">{f.value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {expanded && (
                      <div className="px-4 pb-4 pt-1 border-t border-border/70 space-y-2 text-[11px]">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                          {([{ label: "Qualification", value: app.qualification }, { label: "Current CTC", value: app.current_ctc ? String(app.current_ctc) : null }, { label: "Phone", value: app.phone }, { label: "Applied", value: new Date(app.created_at).toLocaleDateString() }] as {label:string;value:string|null|undefined}[]).filter((f) => f.value).map((f) => (
                            <div key={f.label} className="p-2 rounded-lg bg-page border border-border/50">
                              <span className="text-[10px] uppercase font-bold text-ink-muted block">{f.label}</span>
                              <span className="font-semibold text-ink truncate block">{f.value}</span>
                            </div>
                          ))}
                        </div>
                        {(app.met_must_have_skills?.length || app.missing_must_have_skills?.length) && (
                          <div className="flex flex-wrap gap-1.5">
                            {(app.met_must_have_skills || []).map((sk) => (
                              <span key={`met-${sk}`} className="px-2 py-0.5 rounded text-[10.5px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">✓ {sk}</span>
                            ))}
                            {(app.missing_must_have_skills || []).map((sk) => (
                              <span key={`miss-${sk}`} className="px-2 py-0.5 rounded text-[10.5px] font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20">✗ {sk}</span>
                            ))}
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

      {/* POST TO BOARDS */}
      {activeFeature === "post_to_boards" && (
        <div className="max-w-2xl mx-auto w-full space-y-4 py-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-ink font-display">Post to Boards</h2>
              <p className="text-xs text-ink-muted mt-0.5">Fill content blocks and preview before publishing.</p>
            </div>
            <button type="button" onClick={() => setShowPreview((v) => !v)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${showPreview ? "bg-brand text-white border-brand" : "border-border text-ink-muted hover:border-border-strong hover:text-ink"}`}>
              {showPreview ? "Hide Preview" : "Live Preview"}
            </button>
          </div>

          {/* Live template preview — shown when showPreview is true */}
          {showPreview && (
            <div className="border border-brand/20 rounded-2xl overflow-hidden">
              <div className="px-4 py-2 bg-brand-wash/20 border-b border-brand/10">
                <span className="text-[11px] font-bold uppercase tracking-wider text-brand">Template Preview</span>
              </div>
              <div className="p-4">
                {(() => {
                  const selectedReq = requisitions.find((r) => r.id === postTargetReqId);
                  return (
                    <JobPostingTemplate
                      title={selectedReq?.title ?? "Job Title"}
                      department={selectedReq?.department}
                      location={selectedReq?.location}
                      workMode={selectedReq?.work_mode}
                      employmentType={selectedReq?.employment_type}
                      hideCompanyName={postHideCompany}
                      coreStrengthsList={[]}
                      additionalStrengthsList={[]}
                      content={postContent}
                      isEditable={false}
                    />
                  );
                })()}
              </div>
            </div>
          )}
          {postMsg && (
            <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${postMsg.type === "success" ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20" : "bg-rose-500/10 text-rose-800 dark:text-rose-300 border border-rose-500/20"}`}>
              <Icon name={postMsg.type === "success" ? "check" : "alert-triangle"} className="w-4 h-4" />
              <span>{postMsg.text}</span>
            </div>
          )}
          <form onSubmit={handleSavePosting} className="bg-surface border border-border rounded-2xl p-5 shadow-soft space-y-4">
            <div>
              <label className="block text-xs font-bold text-ink mb-1">Requisition *</label>
              <select required value={postTargetReqId} onChange={(e) => setPostTargetReqId(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-page border border-border text-xs text-ink focus:border-brand focus:outline-none">
                <option value="">Select a requisition...</option>
                {requisitions.map((r) => <option key={r.id} value={r.id}>{r.req_no} — {r.title}</option>)}
              </select>
            </div>
            <div className="relative">
              <span className="block text-xs font-bold text-ink mb-2">Job Board</span>
              <button
                type="button"
                onClick={() => setBoardDropdownOpen((v) => !v)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-page border border-border text-xs text-ink hover:border-border-strong transition-colors cursor-pointer"
              >
                <span className="font-semibold">
                  {postBoards.size === 0 ? "Select job boards..." : Array.from(postBoards).map((b) => (b === "askshree" ? "AskShree" : "Google Jobs")).join(", ")}
                </span>
                <Icon name={boardDropdownOpen ? "chevronUp" : "chevronDown"} size={14} />
              </button>
              {boardDropdownOpen && (
                <div className="absolute z-10 mt-1 w-full bg-surface border border-border rounded-xl shadow-soft p-1.5 space-y-0.5">
                  {(["askshree", "google"] as const).map((b) => (
                    <label key={b} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-page cursor-pointer">
                      <input
                        type="checkbox"
                        checked={postBoards.has(b)}
                        onChange={() => setPostBoards((prev) => {
                          const next = new Set(prev);
                          if (next.has(b)) next.delete(b); else next.add(b);
                          return next;
                        })}
                        className="w-3.5 h-3.5 rounded border-border accent-brand"
                      />
                      <span className="text-xs font-semibold text-ink">{b === "askshree" ? "AskShree" : "Google Jobs"}</span>
                    </label>
                  ))}
                  <div className="my-1 border-t border-border" />
                  {(["indeed", "linkedin", "naukri"] as const).map((b) => (
                    <div key={b} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg opacity-60 cursor-not-allowed">
                      <input type="checkbox" disabled className="w-3.5 h-3.5 rounded border-border" />
                      <span className="text-xs font-semibold text-ink-muted capitalize">{b}</span>
                      <span className="text-[10px] text-ink-muted ml-auto">Not connected</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={postHideCompany} onChange={(e) => setPostHideCompany(e.target.checked)} className="sr-only peer" />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:bg-brand peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
              </label>
              <div>
                <span className="text-xs font-semibold text-ink">Hide Company Name</span>
                <p className="text-[11px] text-ink-muted m-0">Shows &quot;Confidential&quot; publicly. Not available for Google Jobs.</p>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-ink mb-1">Valid Through (optional)</label>
              <input type="date" value={postValidThrough} onChange={(e) => setPostValidThrough(e.target.value)} className="px-3 py-2 rounded-xl bg-page border border-border text-xs text-ink focus:border-brand focus:outline-none" />
            </div>
            <div className="space-y-3 pt-2 border-t border-border">
              <p className="text-[11px] text-ink-muted italic">
                {/* TODO (Phase 3): Replace these textareas with the JobPostingTemplate component */}
                Content blocks are stored as JSON. Full template renders in Phase 3.
              </p>
              {([
                { key: "who_we_are", label: "Who We Are" },
                { key: "success_stories", label: "Our Success Stories" },
                { key: "why_join_us", label: "Why Join Us" },
                { key: "what_you_will_do", label: "What You Will Do" },
                { key: "core_strengths", label: "Core Strengths (must-have)" },
                { key: "additional_strengths", label: "Additional Strengths (good-to-have)" },
                { key: "how_you_grow", label: "How You Grow With Us" },
              ] as { key: keyof PostingContent; label: string }[]).map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-[11px] font-bold text-ink mb-1">{label}</label>
                  <textarea rows={2} value={postContent[key] ?? ""} onChange={(e) => setPostContent((c) => ({ ...c, [key]: e.target.value }))} placeholder={`${label}...`} className="w-full text-xs p-2.5 rounded-xl border border-border bg-page text-ink focus:border-brand focus:outline-none resize-none" />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-border gap-3 flex-wrap">
              <div className="inline-flex rounded-lg border border-border bg-page p-0.5">
                {(["draft", "published"] as const).map((s) => (
                  <button key={s} type="button" onClick={() => setPostStatus(s)}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${postStatus === s ? "bg-brand text-white shadow-soft-sm" : "text-ink-muted hover:text-ink"}`}>
                    {s === "draft" ? "Save as Draft" : "Publish"}
                  </button>
                ))}
              </div>
              <button type="submit" disabled={savingPost || !postTargetReqId}
                className="bg-brand text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-button hover:opacity-95 transition-opacity disabled:opacity-50 flex items-center gap-2 cursor-pointer">
                {savingPost ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Saving...</span></> : <><Icon name="sparkle" size={13} /><span>{postStatus === "published" ? "Publish Posting" : "Save Draft"}</span></>}
              </button>
            </div>
          </form>

          {/* AI Agents — Coming in V2 (no fabricated metrics) */}
          <div className="bg-surface border border-border rounded-2xl p-5 shadow-soft">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-brand-wash flex items-center justify-center text-brand flex-shrink-0"><Icon name="sparkle" size={18} /></div>
              <div>
                <h3 className="text-xs font-bold text-ink m-0">AI Agents — Coming in V2</h3>
                <p className="text-[11px] text-ink-muted m-0">Autonomous sourcing, screening, and outreach agents.</p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-page border border-border text-[11.5px] text-ink-muted">
              Agentic capabilities — auto-sourcing, resume scoring, interview coordination — are on the product roadmap for V2. No metrics are shown until these features are live and connected to real data.
            </div>
          </div>
        </div>
      )}
    </UniversalPlatformShell>
  );
}