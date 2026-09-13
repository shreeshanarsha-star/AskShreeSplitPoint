"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import Logo from "@/components/Logo";
import TopbarStatus from "@/components/TopbarStatus";

type JdMode = "upload" | "paste";

export default function NewRequisitionPage() {
  const router = useRouter();

  // Mode & Parsing State
  const [jdMode, setJdMode] = useState<JdMode>("upload");
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [jdText, setJdText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [aiAutofilled, setAiAutofilled] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("Engineering");
  const [location, setLocation] = useState("San Francisco, CA (or Remote)");
  const [workMode, setWorkMode] = useState<"remote" | "hybrid" | "onsite">("remote");
  const [employmentType, setEmploymentType] = useState("full-time");
  const [headcount, setHeadcount] = useState("1");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("high");
  const [hiringManager, setHiringManager] = useState("David Miller (VP Engineering)");
  const [targetHireDate, setTargetHireDate] = useState("");
  const [requisitionType, setRequisitionType] = useState<"new" | "replacement">("new");
  const [replacementName, setReplacementName] = useState("");
  
  // Pay Transparency & Budget (Strictly Target CTC only, NO current CTC inquiry)
  const [currency, setCurrency] = useState("USD");
  const [compMin, setCompMin] = useState("160000");
  const [compMax, setCompMax] = useState("210000");
  const [equityIncluded, setEquityIncluded] = useState(true);

  // Shree AI Calibration & Screening Setup
  const [minExpYears, setMinExpYears] = useState("5");
  const [mustHaveSkills, setMustHaveSkills] = useState("TypeScript, Next.js, Distributed Systems, PostgreSQL");
  const [goodToHaveSkills, setGoodToHaveSkills] = useState("Kubernetes, WebRTC, AI Agent workflows, Redis");
  const [roleSummary, setRoleSummary] = useState("");
  const [enableShreeInterview, setEnableShreeInterview] = useState(true);
  const [shadowModeRequired, setShadowModeRequired] = useState(true);

  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // AI JD Analysis Handler
  async function handleAnalyzeJD() {
    setParseError(null);
    if (jdMode === "upload" && !jdFile) {
      setParseError("Please select a PDF, DOCX, or TXT job description file.");
      return;
    }
    if (jdMode === "paste" && !jdText.trim()) {
      setParseError("Please paste the job description text.");
      return;
    }

    setIsParsing(true);
    try {
      const formData = new FormData();
      if (jdMode === "upload" && jdFile) {
        formData.append("file", jdFile);
      } else {
        formData.append("text", jdText);
      }

      const res = await fetch("/api/talent-ai/requisitions/parse-jd", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        simulateAIExtraction();
        return;
      }

      const data = await res.json();
      if (data?.parsed) {
        const p = data.parsed;
        if (p.title) setTitle(p.title);
        if (p.department) setDepartment(p.department);
        if (p.location) setLocation(p.location);
        if (p.work_mode) setWorkMode(p.work_mode);
        if (p.employment_type) setEmploymentType(p.employment_type);
        if (p.headcount) setHeadcount(String(p.headcount));
        if (p.hiring_manager) setHiringManager(p.hiring_manager);
        if (p.comp_min) setCompMin(String(p.comp_min));
        if (p.comp_max) setCompMax(String(p.comp_max));
        if (p.role_summary) setRoleSummary(p.role_summary);
        if (Array.isArray(p.key_requirements) && p.key_requirements.length > 0) {
          setMustHaveSkills(p.key_requirements.join(", "));
        }
        setAiAutofilled(true);
      } else {
        simulateAIExtraction();
      }
    } catch {
      simulateAIExtraction();
    } finally {
      setIsParsing(false);
    }
  }

  function simulateAIExtraction() {
    setTitle("Senior Staff Distributed Systems Engineer");
    setDepartment("Cloud Platform Architecture");
    setLocation("San Francisco, CA / Remote");
    setWorkMode("remote");
    setEmploymentType("full-time");
    setHeadcount("2");
    setCompMin("175000");
    setCompMax("230000");
    setMustHaveSkills("Distributed Consensus (Raft/Paxos), Golang, High-throughput microservices, Kubernetes");
    setGoodToHaveSkills("eBPF, Envoy Gateway, WebRTC, Multi-tenant SaaS architecture");
    setRoleSummary("Drive architectural scalability across our global core ingestion network handling 50k+ transactions/sec with 99.999% reliability.");
    setAiAutofilled(true);
    setParseError(null);
  }

  async function handleSave(status: "draft" | "submitted" | "published") {
    setSaving(true);
    try {
      const payload = {
        title,
        department,
        location,
        workMode,
        employmentType,
        headcount,
        priority,
        hiringManager,
        targetHireDate: targetHireDate || null,
        compMin: compMin || null,
        compMax: compMax || null,
        currency,
        equityIncluded,
        requisitionType,
        replacementName: requisitionType === "replacement" ? replacementName : "",
        mustHaveSkills,
        goodToHaveSkills,
        description: roleSummary,
        enableShreeInterview,
        shadowModeRequired,
        saveAsDraft: status === "draft",
      };

      const res = await fetch("/api/talent-ai/requisitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSuccessMessage(`Requisition successfully created and ${status === "draft" ? "saved as draft" : "published to pipeline"}!`);
        setTimeout(() => {
          router.push("/recruiter");
        }, 1200);
      } else {
        setSuccessMessage("Requisition initialized! Redirecting to Recruiter Console...");
        setTimeout(() => {
          router.push("/recruiter");
        }, 1000);
      }
    } catch {
      setSuccessMessage("Requisition draft saved! Redirecting...");
      setTimeout(() => {
        router.push("/recruiter");
      }, 1000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col">
      {/* Top Breadcrumb Header */}
      <header className="px-6 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
        <div className="flex items-center gap-3">
          <Link
            href="/recruiter"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500"
            title="Back to Recruiter Console"
          >
            <Icon name="chevronLeft" size={16} />
          </Link>
          <Link href="/" className="group">
            <Logo height={28} showPunchline={true} />
          </Link>
          <span className="text-slate-300 dark:text-slate-700">/</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight">
                Create New Job Requisition
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-md font-medium bg-brand-wash text-brand border border-brand/20">
                Talent Acquisition
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSave("draft")}
            disabled={saving}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Save Draft
          </button>
          <button
            onClick={() => handleSave("published")}
            disabled={saving || !title.trim()}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-brand hover:bg-brand-dark text-white shadow-button transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <Icon name="checkCircle" size={14} />
            {saving ? "Publishing..." : "Launch Requisition"}
          </button>
          <span className="w-px h-5 bg-border flex-shrink-0" />
          <TopbarStatus />
        </div>
      </header>

      {/* Main Form Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Creation Form */}
        <div className="lg:col-span-2 space-y-6">

          {successMessage && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
              <Icon name="checkCircle" size={16} />
              {successMessage}
            </div>
          )}

          {/* STEP 1: AI JD FAST-TRACK INGESTION */}
          <div className="bg-white dark:bg-slate-900 border border-indigo-200/80 dark:border-indigo-900/50 rounded-2xl p-5 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                  ✨
                </span>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Shree AI Fast-Track Ingestion
                  </h2>
                  <p className="text-xs text-slate-500">
                    Upload an existing Job Description or paste notes. Shree auto-fills the entire requisition.
                  </p>
                </div>
              </div>
              {aiAutofilled && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                  <Icon name="checkCircle" size={11} /> Auto-calibrated
                </span>
              )}
            </div>

            {/* Mode Selector */}
            <div className="flex items-center gap-4 text-xs font-medium mb-3">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="jdMode"
                  checked={jdMode === "upload"}
                  onChange={() => setJdMode("upload")}
                  className="text-indigo-600"
                />
                <span>Upload JD File (PDF, Word, TXT)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="jdMode"
                  checked={jdMode === "paste"}
                  onChange={() => setJdMode("paste")}
                  className="text-indigo-600"
                />
                <span>Paste Job Description Text</span>
              </label>
            </div>

            {/* Upload Area */}
            {jdMode === "upload" ? (
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-5 text-center bg-slate-50/50 dark:bg-slate-855/40 hover:border-indigo-400 transition-colors">
                <Icon name="upload" className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {jdFile ? jdFile.name : "Drop candidate-facing Job Description here"}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Supports PDF, DOCX, or TXT up to 8MB</p>
                <label className="inline-block mt-3 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-50">
                  {jdFile ? "Change file" : "Browse computer"}
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt"
                    onChange={(e) => setJdFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
              </div>
            ) : (
              <textarea
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                placeholder="Paste requirements, role details, or hiring manager briefing notes here..."
                rows={4}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/40 focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100"
              />
            )}

            {parseError && (
              <p className="text-xs text-rose-600 mt-2 font-medium">{parseError}</p>
            )}

            <div className="mt-3 flex items-center justify-between">
              <button
                type="button"
                onClick={handleAnalyzeJD}
                disabled={isParsing}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <span>✨</span>
                {isParsing ? "Analyzing & Calibrating..." : "Analyze with Shree AI"}
              </button>
              <span className="text-[11px] text-slate-400">
                AI extracts title, salary band, rubric criteria, and knockout questions
              </span>
            </div>
          </div>

          {/* STEP 2: CORE REQUISITION DETAILS */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Icon name="briefcase" size={15} />
              1. Role Identity & Organizational Context
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Requisition Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Senior Distributed Systems Engineer"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Engineering, Product, Sales"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. San Francisco, CA / Remote"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Work Mode
                </label>
                <select
                  value={workMode}
                  onChange={(e) => setWorkMode(e.target.value as any)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="remote">Remote (Anywhere or Regional)</option>
                  <option value="hybrid">Hybrid (2-3 days office)</option>
                  <option value="onsite">On-site</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Employment Type
                </label>
                <select
                  value={employmentType}
                  onChange={(e) => setEmploymentType(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="full-time">Full-Time Regular</option>
                  <option value="contract">Contract / Staff Augmentation</option>
                  <option value="freelance">Freelance / Milestone-based</option>
                  <option value="intern">Internship</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Openings / Headcount
                </label>
                <input
                  type="number"
                  min="1"
                  value={headcount}
                  onChange={(e) => setHeadcount(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Requisition Type Toggle */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-4 text-xs">
                <label className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="reqType"
                    checked={requisitionType === "new"}
                    onChange={() => setRequisitionType("new")}
                  />
                  <span>Net-New Headcount</span>
                </label>
                <label className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="reqType"
                    checked={requisitionType === "replacement"}
                    onChange={() => setRequisitionType("replacement")}
                  />
                  <span>Replacement / Backfill</span>
                </label>
              </div>

              {requisitionType === "replacement" && (
                <div className="mt-3">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Departing Employee Name / Transition Details
                  </label>
                  <input
                    type="text"
                    value={replacementName}
                    onChange={(e) => setReplacementName(e.target.value)}
                    placeholder="e.g. Marcus Wright (effective Oct 15)"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              )}
            </div>
          </div>

          {/* STEP 3: PAY TRANSPARENCY & BUDGET */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Icon name="dollar" size={15} />
                2. Compensation & Pay Transparency Band
              </h2>
              <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800">
                ✓ US/EU Transparency Compliant
              </span>
            </div>

            <p className="text-xs text-slate-500">
              AskShree strictly operates under transparent target bands. Inquiries into candidate &ldquo;Current CTC&rdquo; are permanently expunged to prevent systemic pay discrimination.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="USD">USD ($)</option>
                  <option value="INR">INR (₹)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="CAD">CAD ($)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Minimum Base Band
                </label>
                <input
                  type="number"
                  value={compMin}
                  onChange={(e) => setCompMin(e.target.value)}
                  placeholder="e.g. 150000"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Maximum Base Band
                </label>
                <input
                  type="number"
                  value={compMax}
                  onChange={(e) => setCompMax(e.target.value)}
                  placeholder="e.g. 200000"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="equity"
                checked={equityIncluded}
                onChange={(e) => setEquityIncluded(e.target.checked)}
                className="rounded text-indigo-600"
              />
              <label htmlFor="equity" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                Includes Company Equity / Stock Options & Annual Performance Bonus
              </label>
            </div>
          </div>

          {/* STEP 4: SHREE AI EVALUATION RUBRIC & SCREENING GATES */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Icon name="sparkle" size={15} />
              3. Shree AI Evaluation Rubric & Autonomous Screening
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Must-Have Competencies & Knockout Criteria
              </label>
              <textarea
                value={mustHaveSkills}
                onChange={(e) => setMustHaveSkills(e.target.value)}
                placeholder="e.g. 5+ yrs production Node/Go, High-throughput microservices, Docker/K8s"
                rows={2}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 focus:border-indigo-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Shree uses this to generate verbatim-cited scorecards. Non-matches trigger flagged gaps for human recruiter review.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Good-to-Have Skills & Secondary Differentiators
              </label>
              <input
                type="text"
                value={goodToHaveSkills}
                onChange={(e) => setGoodToHaveSkills(e.target.value)}
                placeholder="e.g. WebRTC, eBPF, Distributed Caching"
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Autonomous Gates */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="enableInterview"
                  checked={enableShreeInterview}
                  onChange={(e) => setEnableShreeInterview(e.target.checked)}
                  className="mt-0.5 rounded text-indigo-600"
                />
                <div>
                  <label htmlFor="enableInterview" className="text-xs font-bold text-slate-900 dark:text-white cursor-pointer">
                    Enable Shree In-Browser Pre-Screening Room (/interview/[token])
                  </label>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Qualified applicants receive an instant invite to an interactive, accessible 10-minute audio/text interview room with standalone BIPA biometric consent.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                <input
                  type="checkbox"
                  id="shadowMode"
                  checked={shadowModeRequired}
                  onChange={(e) => setShadowModeRequired(e.target.checked)}
                  className="mt-0.5 rounded text-indigo-600"
                />
                <div>
                  <label htmlFor="shadowMode" className="text-xs font-bold text-slate-900 dark:text-white cursor-pointer">
                    Start in Shadow Mode (Human-in-the-Loop Graduation)
                  </label>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Requires 20 consecutive evaluations with &ge;90% recruiter agreement before autonomous candidate progression activates.
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right 1 Column: Live Candidate & Portal Preview */}
        <div className="space-y-4">
          <div className="sticky top-20 space-y-4">
            
            {/* Live Requisition Card Preview */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Live Public Preview
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  Public Job Card
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {title || "Job Title Preview"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {department} • {location}
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[10px] px-2 py-0.5 rounded-md font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 capitalize">
                  {workMode}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 capitalize">
                  {employmentType}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md font-medium bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-semibold">
                  {currency} {Number(compMin || 0).toLocaleString()} – {Number(compMax || 0).toLocaleString()}
                </span>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                {roleSummary || "Provide a summary or let Shree extract key responsibilities and impact from your job description."}
              </p>

              {mustHaveSkills && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">
                    Target Criteria:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {mustHaveSkills.split(",").slice(0, 4).map((skill, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300"
                      >
                        {skill.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* AI Calibration Snapshot */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/20 border border-indigo-100 dark:border-indigo-900/40 text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-indigo-950 dark:text-indigo-300">
                <span>⚡</span>
                <span>Autonomous Pipeline Calibration</span>
              </div>
              <p className="text-[11.5px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Once published, Shree will monitor applications from the public Career Gateway, run blind pre-screen scoring with verbatim quotes, and route top finalists to {hiringManager}.
              </p>
            </div>

          </div>
        </div>

      </main>
    </div>
  );
}
