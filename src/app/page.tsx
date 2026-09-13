"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import Logo from "@/components/Logo";
import TopbarStatus from "@/components/TopbarStatus";
import GlobalSearchBar from "@/components/GlobalSearchBar";
import { createClient } from "@/lib/supabase/client";

type JobPosting = {
  id: string;
  title: string;
  department?: string;
  location?: string;
  type?: string;
  salary_range?: string;
  description?: string;
};

const DEPARTMENTS = [
  "All Roles",
  "Engineering & Technology",
  "Product & Design",
  "Sales & Partnerships",
  "Human Resources",
  "Legal & Operations",
];

export default function CareersLandingPage() {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [selectedDept, setSelectedDept] = useState("All Roles");
  const [search, setSearch] = useState("");
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [user, setUser] = useState<{ email?: string; id?: string } | null>(null);

  // Quick Apply Form State
  const [applyName, setApplyName] = useState("");
  const [applyEmail, setApplyEmail] = useState("");
  const [applyPhone, setApplyPhone] = useState("");
  const [applyExpectedSalary, setApplyExpectedSalary] = useState("");
  const [applyResume, setApplyResume] = useState("");
  const [applyConsented, setApplyConsented] = useState(false);
  const [applySubmitting, setApplySubmitting] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);

  useEffect(() => {
    // Check user auth state for Track Status gating
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    // Load live job postings
    async function loadJobs() {
      try {
        const res = await fetch("/api/public/jobs");
        if (res.ok) {
          const data = await res.json();
          const loadedJobs: JobPosting[] = data.jobs || [];
          setJobs(loadedJobs);
          if (loadedJobs.length > 0) setSelectedJob(loadedJobs[0]);
        }
      } catch (err) {
        console.error("Failed to load jobs:", err);
      }
    }
    loadJobs();
  }, []);

  async function handleQuickApply(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedJob || !applyName || !applyEmail || !applyConsented) return;

    setApplySubmitting(true);
    try {
      const res = await fetch("/api/public/quick-apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requisitionId: selectedJob.id,
          name: applyName,
          email: applyEmail,
          phone: applyPhone,
          expectedSalary: applyExpectedSalary,
          resumeText: applyResume,
        }),
      });
      if (res.ok) {
        setApplySuccess(true);
      }
    } catch (err) {
      console.error("Apply failed:", err);
    } finally {
      setApplySubmitting(false);
    }
  }

  const filteredJobs = useMemo(() => {
    return jobs.filter((j) => {
      const matchesDept =
        selectedDept === "All Roles" ||
        (j.department && j.department.toLowerCase().includes(selectedDept.toLowerCase()));
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        j.title.toLowerCase().includes(q) ||
        (j.department && j.department.toLowerCase().includes(q)) ||
        (j.location && j.location.toLowerCase().includes(q));
      return matchesDept && matchesSearch;
    });
  }, [jobs, selectedDept, search]);

  return (
    <div className="min-h-screen bg-page text-ink flex flex-col selection:bg-brand-wash selection:text-brand">
      {/* 1. Global Navigation Header */}
      <header className="px-6 py-3.5 border-b border-border bg-surface shadow-soft-sm flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center hover:opacity-90 transition-opacity">
            <Logo height={28} showPunchline={true} />
          </Link>
          <span className="text-border hidden sm:inline select-none">/</span>
          <span className="font-semibold text-[13.5px] sm:text-[14.5px] text-ink-2 hidden sm:inline font-display">
            Careers Portal
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs">
          {user ? (
            <Link
              href="/candidate/status"
              className="text-ink-muted hover:text-ink font-semibold transition-colors flex items-center gap-1.5"
            >
              <Icon name="check" size={13} />
              <span>My Application Status</span>
            </Link>
          ) : (
            <Link
              href="/login?next=/candidate/status"
              className="text-ink-muted hover:text-brand font-semibold transition-colors flex items-center gap-1.5"
              title="Registered candidates only"
            >
              <Icon name="user" size={13} />
              <span>Track Status (Sign in)</span>
            </Link>
          )}
          <span className="w-px h-5 bg-border flex-shrink-0" />
          <TopbarStatus />
        </div>
      </header>

      {/* 2. Hero Section with Global Search Bar */}
      <section className="border-b border-border bg-gradient-to-b from-surface via-surface to-page/60 pt-8 pb-10 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-wash border border-brand/20 text-brand text-[11px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
            <span>Autonomous AI Hiring Partner</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold font-display text-ink tracking-tight">
            Build the Future of Hiring at AskShree
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted max-w-xl mx-auto leading-relaxed">
            Explore high-impact positions, experience zero-bias AI screening, and benchmark your market compensation with full pay transparency.
          </p>

          {/* Global Search Bar (Every User Front Door) */}
          <div className="pt-4 max-w-2xl mx-auto">
            <GlobalSearchBar />
          </div>
        </div>
      </section>

      {/* 3. Main Dual-Panel Viewport (Spacious Job Feed & Deep Preview) */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col space-y-6">
        {/* Department Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {DEPARTMENTS.map((dept) => (
            <button
              key={dept}
              onClick={() => setSelectedDept(dept)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedDept === dept
                  ? "bg-brand text-white shadow-button"
                  : "bg-surface border border-border text-ink-muted hover:text-ink hover:border-brand/30"
              }`}
            >
              {dept}
            </button>
          ))}
        </div>

        {/* Roles Grid: Left Feed (5 Cols) + Right Details (7 Cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Job Cards */}
          <div className="lg:col-span-5 space-y-3">
            {/* Quick in-page filter */}
            <div className="flex items-center gap-2.5 bg-surface border border-border rounded-xl px-3.5 py-2 shadow-soft-sm">
              <Icon name="search" size={15} className="text-ink-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter by title, skill, or location..."
                className="bg-transparent border-none text-xs w-full focus:outline-none text-ink placeholder:text-ink-muted"
              />
              {search && (
                <button onClick={() => setSearch("")} className="text-ink-muted hover:text-ink text-xs">
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-ink-muted px-1">
              <span className="font-semibold uppercase tracking-wider text-[10.5px]">
                {filteredJobs.length} {filteredJobs.length === 1 ? "Role" : "Roles"} Available
              </span>
            </div>

            {filteredJobs.length === 0 ? (
              <div className="p-8 text-center text-xs text-ink-muted border border-dashed border-border rounded-2xl bg-surface">
                No roles currently match &quot;{search || selectedDept}&quot;. Try selecting &quot;All Roles&quot;.
              </div>
            ) : (
              filteredJobs.map((job) => {
                const isSelected = selectedJob?.id === job.id;
                return (
                  <div
                    key={job.id}
                    onClick={() => setSelectedJob(job)}
                    className={`cursor-pointer p-4 rounded-2xl border transition-all ${
                      isSelected
                        ? "bg-surface border-brand shadow-soft ring-1 ring-brand/30"
                        : "bg-surface border-border hover:border-brand/40 shadow-soft-sm"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-sm text-ink">{job.title}</h3>
                        <p className="text-xs text-ink-muted mt-0.5">
                          {job.department || "Engineering"} • {job.location || "Remote"}
                        </p>
                      </div>
                      {job.salary_range && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-good-wash border border-good/20 text-good-text whitespace-nowrap">
                          {job.salary_range}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs pt-2.5 border-t border-border">
                      <span className="text-[11px] text-ink-muted flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Fast Track AI Screen
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedJob(job);
                          setShowApplyModal(true);
                        }}
                        className="px-3 py-1 rounded-lg text-xs font-bold bg-brand hover:bg-brand-dark text-white shadow-button transition-all"
                      >
                        Quick Apply
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Column: Deep Job Details Preview */}
          <div className="lg:col-span-7 bg-surface border border-border rounded-2xl p-6 sm:p-8 shadow-soft sticky top-20">
            {selectedJob ? (
              <div className="space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-border">
                  <div>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-brand-wash text-brand border border-brand/20">
                      {selectedJob.department || "Engineering"}
                    </span>
                    <h2 className="text-xl sm:text-2xl font-bold text-ink mt-2 font-display">
                      {selectedJob.title}
                    </h2>
                    <p className="text-xs text-ink-muted mt-1 flex items-center gap-2">
                      <span>{selectedJob.location || "Bangalore / Remote"}</span>
                      <span>•</span>
                      <span>{selectedJob.type || "Full-Time"}</span>
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {selectedJob.salary_range && (
                      <span className="text-sm font-bold text-good-text bg-good-wash border border-good/20 px-3 py-1 rounded-full">
                        {selectedJob.salary_range}
                      </span>
                    )}
                    <button
                      onClick={() => setShowApplyModal(true)}
                      className="px-5 py-2 rounded-xl text-xs font-bold bg-brand hover:bg-brand-dark text-white shadow-button transition-all flex items-center gap-1.5"
                    >
                      <span>Apply Now</span>
                      <Icon name="arrowRight" size={13} />
                    </button>
                  </div>
                </div>

                {/* Description & Requirements */}
                <div className="space-y-4 text-xs leading-relaxed text-ink-2">
                  <div>
                    <h3 className="text-sm font-bold text-ink font-display mb-1.5">About This Role</h3>
                    <p>
                      {selectedJob.description ||
                        "Join our mission-driven team to architect and scale autonomous talent workflows. You will work directly with modern TypeScript, distributed systems, and real-time AI agents."}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-ink font-display mb-1.5">Key Responsibilities</h3>
                    <ul className="list-disc pl-5 space-y-1 text-ink-muted">
                      <li>Design and deliver production-grade microservices and interfaces.</li>
                      <li>Collaborate cross-functionally with recruiters, founders, and hiring managers.</li>
                      <li>Ensure sub-second response times, resilient data sync, and high security.</li>
                      <li>Mentor peers and champion code craft, unit testing, and design systems.</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-ink font-display mb-1.5">What We Offer</h3>
                    <ul className="list-disc pl-5 space-y-1 text-ink-muted">
                      <li>Competitive market compensation with transparent pay bands.</li>
                      <li>Remote-first flexibility with modern equipment allowance.</li>
                      <li>Comprehensive health insurance for you and your family.</li>
                      <li>60-second transparent application review with guaranteed feedback.</li>
                    </ul>
                  </div>
                </div>

                <div className="pt-4 border-t border-border flex items-center justify-between">
                  <span className="text-xs text-ink-muted">Ready to step forward?</span>
                  <button
                    onClick={() => setShowApplyModal(true)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-brand hover:bg-brand-dark text-white shadow-button transition-all"
                  >
                    Quick Apply with Resume
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-24 text-center text-xs text-ink-muted">
                Select a role on the left to view detailed responsibilities and compensation.
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 4. Quick Apply Modal */}
      {showApplyModal && selectedJob && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl max-w-lg w-full p-6 shadow-soft space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="font-bold text-base text-ink">
                  Quick Apply: {selectedJob.title}
                </h3>
                <p className="text-xs text-ink-muted mt-0.5">
                  60-second conversational screening. No password required.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowApplyModal(false);
                  setApplySuccess(false);
                }}
                className="text-ink-muted hover:text-ink text-sm"
              >
                ✕
              </button>
            </div>

            {applySuccess ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-good-wash text-good-text border border-good/20 flex items-center justify-center text-xl shadow-soft-sm">
                  ✓
                </div>
                <h4 className="font-bold text-base text-ink font-display">Application Received!</h4>
                <p className="text-xs text-ink-muted max-w-sm mx-auto leading-relaxed">
                  Your application has been received and indexed into the review pipeline. Registered candidates can track milestone progress anytime.
                </p>
                <div className="pt-2 flex justify-center gap-3">
                  <Link
                    href={`/candidate/status`}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-brand hover:bg-brand-dark text-white shadow-button"
                  >
                    Track Status
                  </Link>
                  <button
                    onClick={() => {
                      setShowApplyModal(false);
                      setApplySuccess(false);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold border border-border text-ink-2 hover:bg-page"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleQuickApply} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-ink-2 font-semibold mb-1">Full Name *</label>
                    <input
                      required
                      type="text"
                      value={applyName}
                      onChange={(e) => setApplyName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full bg-page border border-border rounded-xl p-2.5 text-ink focus:border-brand focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-ink-2 font-semibold mb-1">Email *</label>
                    <input
                      required
                      type="email"
                      value={applyEmail}
                      onChange={(e) => setApplyEmail(e.target.value)}
                      placeholder="jane@example.com"
                      className="w-full bg-page border border-border rounded-xl p-2.5 text-ink focus:border-brand focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-ink-2 font-semibold mb-1">Phone</label>
                    <input
                      type="tel"
                      value={applyPhone}
                      onChange={(e) => setApplyPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full bg-page border border-border rounded-xl p-2.5 text-ink focus:border-brand focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-ink-2 font-semibold mb-1">Target Annual Compensation</label>
                    <input
                      type="text"
                      value={applyExpectedSalary}
                      onChange={(e) => setApplyExpectedSalary(e.target.value)}
                      placeholder="₹30L or $140,000"
                      className="w-full bg-page border border-border rounded-xl p-2.5 text-ink focus:border-brand focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-ink-2 font-semibold mb-1">
                    Paste Resume / Key Experience Highlights *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={applyResume}
                    onChange={(e) => setApplyResume(e.target.value)}
                    placeholder="Paste your resume text, GitHub/LinkedIn links, or key technical highlights..."
                    className="w-full bg-page border border-border rounded-xl p-2.5 text-ink focus:border-brand focus:outline-none"
                  />
                </div>

                <label className="flex items-start gap-2.5 pt-1 cursor-pointer select-none">
                  <input
                    required
                    type="checkbox"
                    checked={applyConsented}
                    onChange={(e) => setApplyConsented(e.target.checked)}
                    className="mt-0.5 rounded border-border text-brand"
                  />
                  <span className="text-[11px] text-ink-muted">
                    I grant consent for statutory AI screening and privacy-preserving candidate evaluation (no demographic bias, deletion on request).
                  </span>
                </label>

                <div className="pt-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowApplyModal(false)}
                    className="px-4 py-2 text-ink-muted hover:text-ink font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={applySubmitting || !applyConsented}
                    className="px-5 py-2 rounded-xl font-bold bg-brand hover:bg-brand-dark disabled:opacity-50 text-white shadow-button"
                  >
                    {applySubmitting ? "Submitting..." : "Submit Application"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

