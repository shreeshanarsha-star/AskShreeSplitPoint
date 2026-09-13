"use client";

import { useEffect, useState, useMemo, useRef } from "react";
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

const SUGGESTED_QUESTIONS = [
  "What are the interview stages?",
  "What skills are prioritized for this role?",
  "Tell me about AskShree team culture",
  "What is the hiring timeline & compensation band?",
];

export default function CareersLandingPage() {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [selectedDept, setSelectedDept] = useState("All Roles");
  const [search, setSearch] = useState("");
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState<"chat" | "specs">("chat");
  const [user, setUser] = useState<{ email?: string; id?: string } | null>(null);

  // Shree AI Avatar & Conversational State
  const [messages, setMessages] = useState<Array<{ role: "assistant" | "user"; text: string }>>([
    {
      role: "assistant",
      text: "Hello! I am Shree, your autonomous AI Talent Acquisition partner. Select any open role on the left to discuss it, or ask me anything about our interview process, expectations, and culture.",
    },
  ]);
  const [inputQuery, setInputQuery] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Quick Apply Form State
  const [applyName, setApplyName] = useState("");
  const [applyEmail, setApplyEmail] = useState("");
  const [applyPhone, setApplyPhone] = useState("");
  const [applyExpectedSalary, setApplyExpectedSalary] = useState("");
  const [applyResume, setApplyResume] = useState("");
  const [applyConsented, setApplyConsented] = useState(false);
  const [applySubmitting, setApplySubmitting] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);
  const [submittedInterviewToken, setSubmittedInterviewToken] = useState<string | null>(null);

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

  // Auto-scroll chat transcript to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  function speakText(text: string) {
    if (!voiceEnabled) return;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.05;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  }

  async function handleSendQuery(e?: React.FormEvent, customQuery?: string) {
    if (e) e.preventDefault();
    const q = (customQuery || inputQuery).trim();
    if (!q || isThinking) return;

    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setInputQuery("");
    setIsThinking(true);
    setRightPanelTab("chat");

    try {
      const res = await fetch("/api/public/ask-shree", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, contextJob: selectedJob }),
      });
      const data = await res.json();
      const reply =
        data.reply ||
        "I am here to guide your application and answer any questions about our team and roles.";
      setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
      speakText(reply);
    } catch (err) {
      console.error("Chat error:", err);
      const fallback =
        "We are actively reviewing applicants and looking for passionate peers. Feel free to Quick Apply to start the AI screening process!";
      setMessages((prev) => [...prev, { role: "assistant", text: fallback }]);
      speakText(fallback);
    } finally {
      setIsThinking(false);
    }
  }

  function handleSelectJob(job: JobPosting) {
    setSelectedJob(job);
    const greeting = `I see you are interested in the ${job.title} role (${job.department || "General"} • ${job.location || "Remote"}). Would you like to know about the interview stages, tech stack, or compensation band?`;
    setMessages((prev) => [...prev, { role: "assistant", text: greeting }]);
    speakText(greeting);
  }

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
      const data = await res.json();
      if (res.ok) {
        setApplySuccess(true);
        if (data.interviewToken) {
          setSubmittedInterviewToken(data.interviewToken);
        }
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

      {/* 2. Global Search Bar (Universal Front Door) */}
      <section className="border-b border-border bg-surface/50 py-3 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">
          <GlobalSearchBar />
        </div>
      </section>

      {/* 3. Main Dual-Panel Viewport: Job Postings (Left) + AI Avatar Candidate Studio (Right) */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col space-y-5">
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

        {/* Dual Panel Grid: Left Job Postings (6 cols) + Right AI Avatar Candidate Studio (6 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ================= LEFT PANEL: Job Postings List (6 Cols) ================= */}
          <div className="lg:col-span-6 space-y-3">
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
              <span className="text-[11px] text-ink-muted">Click any role to consult Shree</span>
            </div>

            {filteredJobs.length === 0 ? (
              <div className="p-8 text-center text-xs text-ink-muted border border-dashed border-border rounded-2xl bg-surface">
                No roles currently match &quot;{search || selectedDept}&quot;. Try selecting &quot;All Roles&quot;.
              </div>
            ) : (
              <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
                {filteredJobs.map((job) => {
                  const isSelected = selectedJob?.id === job.id;
                  return (
                    <div
                      key={job.id}
                      onClick={() => handleSelectJob(job)}
                      className={`cursor-pointer p-4 rounded-2xl border transition-all ${
                        isSelected
                          ? "bg-surface border-brand shadow-soft ring-1 ring-brand/30"
                          : "bg-surface border-border hover:border-brand/40 shadow-soft-sm"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm text-ink">{job.title}</h3>
                            {isSelected && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-wash text-brand border border-brand/20">
                                Active
                              </span>
                            )}
                          </div>
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

                      {job.description && (
                        <p className="text-xs text-ink-muted line-clamp-2 mt-2 leading-relaxed">
                          {job.description}
                        </p>
                      )}

                      <div className="mt-3 flex items-center justify-between text-xs pt-2.5 border-t border-border">
                        <span className="text-[11px] text-ink-muted flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>Fast Track AI Screen</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedJob(job);
                              setRightPanelTab("specs");
                            }}
                            className="px-2.5 py-1 text-xs text-ink-muted hover:text-ink font-medium"
                          >
                            View Specs
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedJob(job);
                              setShowApplyModal(true);
                            }}
                            className="px-3.5 py-1 rounded-xl text-xs font-bold bg-brand hover:bg-brand-dark text-white shadow-button transition-all"
                          >
                            Quick Apply
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ================= RIGHT PANEL: Shree AI Avatar Candidate Studio (6 Cols) ================= */}
          <div className="lg:col-span-6 bg-surface border border-border rounded-2xl shadow-soft overflow-hidden flex flex-col h-[640px] sticky top-20">
            {/* Top Avatar Visual & Audio Header */}
            <div className="bg-gradient-to-b from-brand-wash/70 via-surface to-surface border-b border-border p-4 relative flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="relative flex-shrink-0">
                  <div
                    className={`w-14 h-14 rounded-full bg-gradient-to-tr from-brand to-brand-dark p-0.5 shadow-emblem transition-transform ${
                      isSpeaking ? "scale-105 ring-4 ring-brand/30" : ""
                    }`}
                  >
                    <div className="w-full h-full rounded-full bg-surface flex items-center justify-center text-2xl select-none">
                      👩‍💼
                    </div>
                  </div>
                  {isSpeaking && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full bg-brand text-[8.5px] font-bold text-white uppercase tracking-wider animate-pulse shadow-soft-sm">
                      Speaking
                    </span>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-sm text-ink font-display">Shree</h2>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-brand-wash text-brand border border-brand/20 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live Conversational
                    </span>
                  </div>
                  <p className="text-[11px] text-ink-muted mt-0.5">
                    AI Talent Acquisition Partner • Real-time Candidate Guidance
                  </p>
                </div>
              </div>

              {/* Controls & Mode Switcher */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const next = !voiceEnabled;
                    setVoiceEnabled(next);
                    if (!next && typeof window !== "undefined" && "speechSynthesis" in window) {
                      window.speechSynthesis.cancel();
                      setIsSpeaking(false);
                    }
                  }}
                  title={voiceEnabled ? "Voice Enabled (click to mute)" : "Voice Muted (click to enable voice)"}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1 ${
                    voiceEnabled
                      ? "bg-brand text-white border-brand shadow-button"
                      : "bg-page text-ink-muted border-border hover:text-ink hover:border-brand/30"
                  }`}
                >
                  <span>{voiceEnabled ? "🔊 Voice On" : "🔇 Voice Off"}</span>
                </button>
              </div>
            </div>

            {/* Context Pill & Tabs Header */}
            <div className="px-4 py-2 border-b border-border bg-page/50 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 truncate max-w-[65%]">
                <span className="text-ink-muted text-[11px]">Context:</span>
                {selectedJob ? (
                  <span className="font-semibold text-ink truncate text-[11.5px]">
                    {selectedJob.title} ({selectedJob.salary_range || selectedJob.location})
                  </span>
                ) : (
                  <span className="text-ink-muted italic text-[11px]">All Open Roles</span>
                )}
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setRightPanelTab("chat")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    rightPanelTab === "chat"
                      ? "bg-surface text-brand shadow-soft-sm border border-border"
                      : "text-ink-muted hover:text-ink"
                  }`}
                >
                  AI Chat
                </button>
                <button
                  type="button"
                  onClick={() => setRightPanelTab("specs")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    rightPanelTab === "specs"
                      ? "bg-surface text-brand shadow-soft-sm border border-border"
                      : "text-ink-muted hover:text-ink"
                  }`}
                >
                  Role Specs
                </button>
                {selectedJob && (
                  <button
                    type="button"
                    onClick={() => setShowApplyModal(true)}
                    className="ml-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-brand hover:bg-brand-dark text-white shadow-button transition-all"
                  >
                    Quick Apply
                  </button>
                )}
              </div>
            </div>

            {/* Panel Body: Chat or Role Specs */}
            {rightPanelTab === "chat" ? (
              <div className="flex-1 flex flex-col overflow-hidden bg-page">
                {/* Chat Messages Transcript */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
                  {messages.map((m, i) => (
                    <div
                      key={i}
                      className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 leading-relaxed text-[12.5px] ${
                          m.role === "user"
                            ? "bg-brand text-white rounded-br-xs shadow-soft-sm"
                            : "bg-surface border border-border text-ink rounded-bl-xs shadow-soft-sm"
                        }`}
                      >
                        {m.text}
                      </div>
                    </div>
                  ))}

                  {isThinking && (
                    <div className="flex items-center gap-2 text-xs text-ink-muted italic pl-2 py-1">
                      <span className="w-2 h-2 rounded-full bg-brand animate-ping" />
                      <span>Shree is thinking...</span>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Suggested Quick Prompt Chips */}
                <div className="px-3 py-2 bg-surface border-t border-border flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                  {SUGGESTED_QUESTIONS.map((promptText) => (
                    <button
                      key={promptText}
                      type="button"
                      onClick={() => handleSendQuery(undefined, promptText)}
                      disabled={isThinking}
                      className="text-[11px] px-2.5 py-1 rounded-full bg-page hover:bg-brand-wash hover:text-brand border border-border text-ink-muted whitespace-nowrap transition-colors flex-shrink-0"
                    >
                      {promptText}
                    </button>
                  ))}
                </div>

                {/* Chat Input Bar */}
                <form
                  onSubmit={handleSendQuery}
                  className="p-3 border-t border-border bg-surface flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={inputQuery}
                    onChange={(e) => setInputQuery(e.target.value)}
                    placeholder={
                      selectedJob
                        ? `Ask Shree about ${selectedJob.title}, team, or expectations...`
                        : "Ask Shree about roles, process, or expectations..."
                    }
                    className="flex-1 text-xs bg-page border border-border rounded-xl px-3.5 py-2.5 text-ink placeholder:text-ink-muted focus:outline-none focus:border-brand"
                  />
                  <button
                    type="submit"
                    disabled={!inputQuery.trim() || isThinking}
                    className="p-2.5 bg-brand hover:bg-brand-dark disabled:opacity-40 text-white rounded-xl transition-colors shadow-button flex-shrink-0"
                    title="Send message"
                  >
                    <Icon name="arrowRight" size={14} />
                  </button>
                </form>
              </div>
            ) : (
              /* Role Specs Tab */
              <div className="flex-1 p-6 overflow-y-auto space-y-5 bg-surface text-xs leading-relaxed text-ink-2">
                {selectedJob ? (
                  <>
                    <div className="pb-4 border-b border-border flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-base font-bold text-ink font-display">
                          {selectedJob.title}
                        </h3>
                        <p className="text-xs text-ink-muted mt-0.5">
                          {selectedJob.department || "Engineering"} • {selectedJob.location || "Remote"} • {selectedJob.type || "Full-Time"}
                        </p>
                      </div>
                      {selectedJob.salary_range && (
                        <span className="text-xs font-bold text-good-text bg-good-wash border border-good/20 px-3 py-1 rounded-full">
                          {selectedJob.salary_range}
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-ink font-display mb-1 uppercase tracking-wider">
                        Role Overview
                      </h4>
                      <p className="text-ink-muted">
                        {selectedJob.description ||
                          "Join our mission-driven team to architect and scale autonomous talent workflows. You will work directly with modern TypeScript, distributed systems, and real-time AI agents."}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-ink font-display mb-1 uppercase tracking-wider">
                        Key Responsibilities
                      </h4>
                      <ul className="list-disc pl-5 space-y-1 text-ink-muted">
                        <li>Design and deliver production-grade microservices and interfaces.</li>
                        <li>Collaborate cross-functionally with recruiters, founders, and hiring managers.</li>
                        <li>Ensure sub-second response times, resilient data sync, and high security.</li>
                        <li>Mentor peers and champion code craft, unit testing, and design systems.</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-ink font-display mb-1 uppercase tracking-wider">
                        Candidate Benefits
                      </h4>
                      <ul className="list-disc pl-5 space-y-1 text-ink-muted">
                        <li>Competitive market compensation with transparent pay bands.</li>
                        <li>Remote-first flexibility with modern equipment allowance.</li>
                        <li>Comprehensive health insurance for you and your family.</li>
                        <li>60-second transparent application review with guaranteed feedback.</li>
                      </ul>
                    </div>

                    <div className="pt-3 border-t border-border flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setRightPanelTab("chat")}
                        className="text-brand font-semibold text-xs hover:underline"
                      >
                        ← Ask Shree questions about this role
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowApplyModal(true)}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-brand hover:bg-brand-dark text-white shadow-button transition-all"
                      >
                        Quick Apply Now
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="py-20 text-center text-xs text-ink-muted">
                    Select a role on the left to view detailed responsibilities and compensation.
                  </div>
                )}
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
                <h3 className="font-bold text-base text-ink font-display">
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
                  Your application has been received and indexed into the review pipeline. Shree has started the objective blind review.
                </p>
                <div className="pt-2 flex justify-center gap-3">
                  <Link
                    href={`/interview/${submittedInterviewToken || "demo"}`}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-brand hover:bg-brand-dark text-white shadow-button"
                  >
                    Start AI Pre-Screen Now →
                  </Link>
                  <Link
                    href={`/candidate/status`}
                    className="px-4 py-2 rounded-xl text-xs font-semibold border border-border text-ink-2 hover:bg-page"
                  >
                    Track Status
                  </Link>
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
                    <label className="block text-ink-2 font-semibold mb-1">Target Annual Salary</label>
                    <input
                      type="text"
                      value={applyExpectedSalary}
                      onChange={(e) => setApplyExpectedSalary(e.target.value)}
                      placeholder="$120,000"
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

