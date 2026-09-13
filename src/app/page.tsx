"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import Logo from "@/components/Logo";
import TopbarStatus from "@/components/TopbarStatus";
import JobShareButton from "@/components/JobShareButton";
import ShareToEarnModal from "@/components/ShareToEarnModal";
import { getCandidateCredits } from "@/lib/credits";

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: { [i: number]: { [j: number]: { transcript: string } } }; length?: number }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

type JobPosting = {
  id: string;
  title: string;
  department?: string;
  location?: string;
  type?: string;
  salary_range?: string;
  description?: string;
};



const SUGGESTED_QUESTIONS = [
  "What are the interview stages?",
  "What skills are prioritized for this role?",
  "Tell me about AskShree team culture",
  "What is the hiring timeline & compensation band?",
];

export default function HomePage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [roleFilter, setRoleFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [candidateCredits, setCandidateCredits] = useState(25);
  const [shareJob, setShareJob] = useState<JobPosting | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const chipsRef = useRef<HTMLDivElement | null>(null);
  const ROLES_PER_PAGE = 3;

  // Shree AI Avatar & Conversational State
  const [messages, setMessages] = useState<Array<{ role: "assistant" | "user"; text: string }>>([
    {
      role: "assistant",
      text: "Hello! I am Shree, your autonomous AI Talent Acquisition partner. Select any open job on the left to discuss it, or ask me anything about our interview process, expectations, and culture.",
    },
  ]);
  const [inputQuery, setInputQuery] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  function toggleMic() {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      alert("Voice input is not supported in this browser. Please try Chrome, Edge, or Safari.");
      return;
    }
    try {
      const rec = new Ctor();
      recognitionRef.current = rec;
      rec.lang = "en-US";
      rec.interimResults = true;
      rec.continuous = false;
      rec.onresult = (e) => {
        const transcript = e.results[0]?.[0]?.transcript;
        if (transcript) {
          setInputQuery(transcript);
        }
      };
      rec.onerror = () => {
        setListening(false);
      };
      rec.onend = () => {
        setListening(false);
      };
      rec.start();
      setListening(true);
    } catch (err) {
      console.error("Speech recognition error:", err);
      setListening(false);
    }
  }

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
    // Load live job postings
    async function loadJobs() {
      try {
        const res = await fetch("/api/public/jobs");
        if (res.ok) {
          const data = await res.json();
          const loadedJobs: JobPosting[] = data.jobs || [];
          setJobs(loadedJobs);
          if (loadedJobs.length > 0) {
            let initialJob = loadedJobs[0];
            if (typeof window !== "undefined") {
              const p = new URLSearchParams(window.location.search).get("role");
              if (p) {
                const found = loadedJobs.find((j) => j.id === p);
                if (found) initialJob = found;
              }
            }
            setSelectedJob(initialJob);
          }
        }
      } catch (err) {
        console.error("Failed to load jobs:", err);
      }
    }
    loadJobs();
  }, []);

  // Listen for real-time candidate credit updates
  useEffect(() => {
    setCandidateCredits(getCandidateCredits());
    function handleCreditsUpdate(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (detail && typeof detail.credits === "number") {
        setCandidateCredits(detail.credits);
      }
    }
    window.addEventListener("askshree_credits_updated", handleCreditsUpdate);
    return () => window.removeEventListener("askshree_credits_updated", handleCreditsUpdate);
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

    // If query matches roles, filter the roles list and pre-select first match
    const lowerQ = q.toLowerCase();
    const matchedJobs = jobs.filter(
      (j) =>
        j.title.toLowerCase().includes(lowerQ) ||
        (j.department && j.department.toLowerCase().includes(lowerQ)) ||
        (j.location && j.location.toLowerCase().includes(lowerQ))
    );
    if (matchedJobs.length > 0) {
      setRoleFilter(q);
      setCurrentPage(1);
      setSelectedJob(matchedJobs[0]);
    }

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
    if (!roleFilter.trim()) return jobs;
    const q = roleFilter.toLowerCase().trim();
    return jobs.filter((j) => {
      return (
        j.title.toLowerCase().includes(q) ||
        (j.department && j.department.toLowerCase().includes(q)) ||
        (j.location && j.location.toLowerCase().includes(q)) ||
        (j.description && j.description.toLowerCase().includes(q))
      );
    });
  }, [jobs, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / ROLES_PER_PAGE));
  const displayedJobs = filteredJobs.slice(
    (currentPage - 1) * ROLES_PER_PAGE,
    currentPage * ROLES_PER_PAGE
  );

  return (
    <div className="min-h-screen bg-page text-ink flex flex-col selection:bg-brand-wash selection:text-brand">
      {/* 1. Global Navigation Header */}
      <header className="px-6 py-3.5 border-b border-border bg-surface shadow-soft-sm flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center hover:opacity-90 transition-opacity">
            <Logo height={28} showPunchline={true} />
          </Link>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <TopbarStatus />
        </div>
      </header>

      {/* 2. Main Dual-Panel Viewport: Job Postings (Left) + AI Avatar Candidate Studio (Right) */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {/* Dual Panel Grid: Left Job Postings (6 cols) + Right AI Avatar Candidate Studio (6 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ================= LEFT PANEL: Job Postings List (6 Cols) ================= */}
          <div className="lg:col-span-6 space-y-3">
            {/* Open Jobs Header: Total count, active filter, & clickable pagination arrows (Zero scrollbars) */}
            <div className="flex items-center justify-between text-xs px-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[13.5px] text-ink font-display tracking-tight flex items-center gap-1.5">
                  <span>Open Jobs</span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-brand-wash text-brand border border-brand/20">
                    {filteredJobs.length}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const targetJob = selectedJob || jobs[0];
                    if (targetJob) {
                      setShareJob(targetJob);
                      setShowShareModal(true);
                    }
                  }}
                  title="Your Candidate Credits (Click to Share & Earn more)"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-brand-wash text-brand border border-brand/20 font-bold hover:border-brand/40 transition-all shadow-soft-sm"
                >
                  <span>🎁 {candidateCredits} Credits</span>
                </button>
                {roleFilter && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-brand-wash text-brand border border-brand/20 font-medium">
                    <span>Filter: &quot;{roleFilter}&quot;</span>
                    <button
                      type="button"
                      onClick={() => {
                        setRoleFilter("");
                        setCurrentPage(1);
                      }}
                      className="hover:text-brand-dark ml-0.5"
                      title="Clear filter"
                    >
                      ✕
                    </button>
                  </span>
                )}
              </div>

              {/* Clickable Pagination Arrows */}
              {totalPages > 1 && (
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-[11px] text-ink-muted">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    aria-label="Previous jobs page"
                    className="w-6 h-6 rounded-lg border border-border bg-surface text-ink-muted hover:text-brand hover:border-brand/40 flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none transition-all shadow-soft-sm text-sm"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    aria-label="Next jobs page"
                    className="w-6 h-6 rounded-lg border border-border bg-surface text-ink-muted hover:text-brand hover:border-brand/40 flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none transition-all shadow-soft-sm text-sm"
                  >
                    ›
                  </button>
                </div>
              )}
            </div>

            {filteredJobs.length === 0 ? (
              <div className="p-8 text-center text-xs text-ink-muted border border-dashed border-border rounded-2xl bg-surface">
                No open jobs match &quot;{roleFilter}&quot;. Use the global search bar below Shree to discover jobs or clear your filter.
              </div>
            ) : (
              <div className="space-y-3">
                {displayedJobs.map((job) => {
                  const isSelected = selectedJob?.id === job.id;
                  return (
                    <div
                      key={job.id}
                      onClick={() => router.push(`/jobs/${job.id}`)}
                      className={`group cursor-pointer p-4 rounded-2xl border transition-all ${
                        isSelected
                          ? "bg-surface border-brand shadow-soft ring-1 ring-brand/30"
                          : "bg-surface border-border hover:border-brand/40 shadow-soft-sm hover:shadow-soft"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm text-ink group-hover:text-brand transition-colors">
                              {job.title}
                            </h3>
                            {isSelected && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-wash text-brand border border-brand/20">
                                Active Context
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
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectJob(job);
                          }}
                          className={`text-[11.5px] font-semibold flex items-center gap-1.5 transition-colors ${
                            isSelected ? "text-brand" : "text-ink-muted hover:text-brand"
                          }`}
                          title="Set active context in Shree AI studio"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>💬 Consult Shree</span>
                        </button>
                        <div className="flex items-center gap-1.5">
                          <JobShareButton
                            job={{
                              id: job.id,
                              title: job.title,
                              company: job.department,
                              location: job.location,
                              salary_range: job.salary_range,
                            }}
                            variant="pill"
                          />
                          <Link
                            href={`/jobs/${job.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="px-2.5 py-1 text-xs text-ink-muted hover:text-brand font-semibold flex items-center gap-1 transition-colors"
                          >
                            <span>View Specs</span>
                            <Icon name="chevronRight" size={11} />
                          </Link>
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

                {/* Bottom Pagination Bar (Zero scrollbars) */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between text-xs pt-2 px-1 text-ink-muted">
                    <span className="text-[11px]">
                      Showing {(currentPage - 1) * ROLES_PER_PAGE + 1}–{Math.min(currentPage * ROLES_PER_PAGE, filteredJobs.length)} of {filteredJobs.length} roles
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-2 py-1 rounded-lg border border-border bg-surface text-xs text-ink-muted hover:text-brand hover:border-brand/40 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1"
                      >
                        <span>‹</span> Previous
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-2 py-1 rounded-lg border border-border bg-surface text-xs text-ink-muted hover:text-brand hover:border-brand/40 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1"
                      >
                        Next <span>›</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ================= RIGHT PANEL: Shree AI Conversational Studio (6 Cols) ================= */}
          <div className="lg:col-span-6 bg-surface border border-border rounded-2xl shadow-soft overflow-hidden flex flex-col h-[calc(100vh-170px)] min-h-[580px] sticky top-20">
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

            {/* Context Sub-Header with Specs Link & Quick Apply */}
            <div className="px-4 py-2 border-b border-border bg-page/50 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 truncate max-w-[65%]">
                <span className="text-ink-muted text-[11px]">Context:</span>
                {selectedJob ? (
                  <span className="font-semibold text-ink truncate text-[11.5px]">
                    {selectedJob.title} {selectedJob.salary_range ? `• ${selectedJob.salary_range}` : ""}
                  </span>
                ) : (
                  <span className="text-ink-muted italic text-[11px]">All Open Jobs</span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {selectedJob && (
                  <>
                    <JobShareButton
                      job={{
                        id: selectedJob.id,
                        title: selectedJob.title,
                        company: selectedJob.department,
                        location: selectedJob.location,
                        salary_range: selectedJob.salary_range,
                      }}
                      variant="pill"
                    />
                    <Link
                      href={`/jobs/${selectedJob.id}`}
                      className="text-xs font-semibold text-brand hover:underline flex items-center gap-0.5"
                    >
                      <span>View Specs</span>
                      <Icon name="chevronRight" size={11} />
                    </Link>
                    <button
                      type="button"
                      onClick={() => setShowApplyModal(true)}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-brand hover:bg-brand-dark text-white shadow-button transition-all"
                    >
                      Quick Apply
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Conversational Studio Body */}
            <div className="flex-1 flex flex-col overflow-hidden bg-page">
              {/* Chat Messages Transcript */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs min-h-0">
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

              {/* Suggested Quick Prompt Chips with Clickable Navigation Arrows (Zero scrollbars) */}
              <div className="px-2 py-2 bg-surface border-t border-border flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => chipsRef.current?.scrollBy({ left: -180, behavior: "smooth" })}
                  aria-label="Scroll suggested questions left"
                  className="w-6 h-6 rounded-lg border border-border bg-page text-ink-muted hover:text-brand hover:border-brand/40 flex items-center justify-center flex-shrink-0 text-xs shadow-soft-sm transition-all"
                >
                  ‹
                </button>
                <div
                  ref={chipsRef}
                  className="flex-1 flex items-center gap-1.5 overflow-x-auto scrollbar-none"
                >
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
                <button
                  type="button"
                  onClick={() => chipsRef.current?.scrollBy({ left: 180, behavior: "smooth" })}
                  aria-label="Scroll suggested questions right"
                  className="w-6 h-6 rounded-lg border border-border bg-page text-ink-muted hover:text-brand hover:border-brand/40 flex items-center justify-center flex-shrink-0 text-xs shadow-soft-sm transition-all"
                >
                  ›
                </button>
              </div>

              {/* Global Search Bar Capsule (Wired to Shree AI Avatar) */}
              <div className="p-3 border-t border-border bg-surface">
                <form
                  onSubmit={handleSendQuery}
                  className="w-full bg-page border border-border rounded-full shadow-search flex items-center px-3.5 py-1.5 gap-2.5 transition-all focus-within:border-brand focus-within:shadow-search-focus"
                >
                  <Icon name="search" className="w-[16px] h-[16px] text-ink-muted flex-shrink-0" />
                  <input
                    type="text"
                    value={inputQuery}
                    onChange={(e) => setInputQuery(e.target.value)}
                    placeholder={
                      selectedJob
                        ? `Ask Shree about ${selectedJob.title}, culture, rubrics...`
                        : "Ask Shree about open jobs, benefits, culture, or rubrics..."
                    }
                    className="flex-1 bg-transparent border-none outline-none text-ink text-xs placeholder:text-ink-muted leading-tight"
                  />
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={toggleMic}
                      aria-label="Ask Shree with your voice"
                      title={listening ? "Listening... (click to stop)" : "Dictate your question"}
                      className={`w-7 h-7 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors ${
                        listening
                          ? "border-brand/40 bg-brand-wash text-brand animate-pulse"
                          : "border-border bg-surface text-ink-muted hover:border-border-strong hover:text-brand"
                      }`}
                    >
                      <Icon name="mic" className="w-[13px] h-[13px]" />
                    </button>
                    <button
                      type="submit"
                      disabled={!inputQuery.trim() || isThinking}
                      aria-label="Send message to Shree"
                      title="Ask Shree"
                      className="w-7 h-7 rounded-full bg-[radial-gradient(circle_at_35%_30%,var(--accent-btn-1),var(--accent-btn-2))] text-white border-none flex items-center justify-center flex-shrink-0 shadow-button hover:brightness-110 transition-all disabled:opacity-40"
                    >
                      <Icon name="arrowUp" className="w-[13px] h-[13px]" />
                    </button>
                  </div>
                </form>
              </div>
            </div>
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

      {/* 5. Share & Earn Credits Modal */}
      {showShareModal && shareJob && (
        <ShareToEarnModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          job={{
            id: shareJob.id,
            title: shareJob.title,
            company: shareJob.department,
            location: shareJob.location,
            salary_range: shareJob.salary_range,
          }}
          onConsultCv={(j) => {
            const query = `Shree, please review and consult on my CV for the ${j.title} role. What critical competencies and keywords should I emphasize?`;
            handleSendQuery(undefined, query);
          }}
          onQuickApply={(j) => {
            const found = jobs.find((x) => x.id === j.id);
            if (found) setSelectedJob(found);
            setShowApplyModal(true);
          }}
        />
      )}
    </div>
  );
}

