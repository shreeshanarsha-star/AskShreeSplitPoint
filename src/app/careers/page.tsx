"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import Logo from "@/components/Logo";

type JobPosting = {
  id: string;
  title: string;
  department?: string;
  location?: string;
  type?: string;
  salary_range?: string;
  description?: string;
};

export default function CareersGatewayPage() {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [search, setSearch] = useState("");
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);
  const [showApplyModal, setShowApplyModal] = useState(false);

  // Avatar Conversational State
  const [messages, setMessages] = useState<Array<{ role: "assistant" | "user"; text: string }>>([
    {
      role: "assistant",
      text: "Hello! I am Shree, your AI Talent Acquisition partner. Ask me anything about our open roles, team culture, or hiring process — or browse openings on the left.",
    },
  ]);
  const [inputQuery, setInputQuery] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);

  // Quick Apply Form
  const [applyName, setApplyName] = useState("");
  const [applyEmail, setApplyEmail] = useState("");
  const [applyPhone, setApplyPhone] = useState("");
  const [applyExpectedSalary, setApplyExpectedSalary] = useState("");
  const [applyResume, setApplyResume] = useState("");
  const [applyConsented, setApplyConsented] = useState(false);
  const [applySubmitting, setApplySubmitting] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);

  useEffect(() => {
    async function loadJobs() {
      try {
        const res = await fetch("/api/public/jobs");
        if (res.ok) {
          const data = await res.json();
          setJobs(data.jobs || []);
          if (data.jobs?.length > 0) setSelectedJob(data.jobs[0]);
        }
      } catch (err) {
        console.error("Failed to load jobs:", err);
      }
    }
    loadJobs();
  }, []);

  function speakText(text: string) {
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

  async function handleSendQuery(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const q = inputQuery.trim();
    if (!q || isThinking) return;

    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setInputQuery("");
    setIsThinking(true);

    try {
      const res = await fetch("/api/public/ask-shree", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, contextJob: selectedJob }),
      });
      const data = await res.json();
      const reply = data.reply || "I am here to help guide your application and answer questions about our team.";
      setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
      speakText(reply);
    } catch (err) {
      const fallback = "We are actively reviewing applicants and looking for talented peers. Feel free to submit your application!";
      setMessages((prev) => [...prev, { role: "assistant", text: fallback }]);
      speakText(fallback);
    } finally {
      setIsThinking(false);
    }
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
      if (res.ok) {
        setApplySuccess(true);
      }
    } catch (err) {
      console.error("Apply failed:", err);
    } finally {
      setApplySubmitting(false);
    }
  }

  const filteredJobs = jobs.filter((j) => {
    const q = search.toLowerCase();
    return (
      j.title.toLowerCase().includes(q) ||
      (j.department && j.department.toLowerCase().includes(q)) ||
      (j.location && j.location.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-page text-ink flex flex-col">
      {/* Top Navigation */}
      <header className="px-6 py-3.5 border-b border-border bg-surface shadow-soft-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center hover:opacity-90 transition-opacity">
            <Logo height={28} showPunchline={true} />
          </Link>
          <span className="text-border hidden sm:inline select-none">/</span>
          <span className="font-semibold text-[13.5px] sm:text-[14.5px] text-ink-2 hidden sm:inline">
            Careers Portal
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <Link
            href="/candidate/status"
            className="text-ink-muted hover:text-ink font-semibold transition-colors"
          >
            My Application Status
          </Link>
          <Link
            href="/recruiter"
            className="px-3.5 py-1.5 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold shadow-button transition-all"
          >
            Recruiter Login →
          </Link>
        </div>
      </header>

      {/* Main Dual-Panel Viewport */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* LEFT PANEL: Job Feed & Details (7 cols) */}
        <div className="lg:col-span-7 border-r border-border flex flex-col h-[calc(100vh-65px)] overflow-y-auto p-6 space-y-4 bg-page">
          {/* Search Header */}
          <div className="flex items-center gap-3 bg-surface border border-border rounded-xl px-4 py-2.5 shadow-soft-sm">
            <Icon name="search" size={16} className="text-ink-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by role title, department, or location..."
              className="bg-transparent border-none text-xs w-full focus:outline-none text-ink placeholder:text-ink-muted"
            />
          </div>

          {/* Job List */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-ink-muted uppercase tracking-wider">
              Open Positions ({filteredJobs.length})
            </h2>

            {filteredJobs.length === 0 ? (
              <div className="p-8 text-center text-xs text-ink-muted border border-dashed border-border rounded-2xl bg-surface">
                No open roles matching your search criteria.
              </div>
            ) : (
              filteredJobs.map((job) => {
                const isSelected = selectedJob?.id === job.id;
                return (
                  <div
                    key={job.id}
                    onClick={() => setSelectedJob(job)}
                    className={`cursor-pointer p-4.5 rounded-2xl border transition-all ${
                      isSelected
                        ? "bg-surface border-brand shadow-soft ring-1 ring-brand/30"
                        : "bg-surface border-border hover:border-brand/40 shadow-soft-sm"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-sm text-ink">{job.title}</h3>
                        <p className="text-xs text-ink-muted mt-0.5">
                          {job.department || "General"} • {job.location || "Remote / Hybrid"}
                        </p>
                      </div>
                      {job.salary_range && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-good-wash border border-good/20 text-good-text">
                          {job.salary_range}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-border">
                      <span className="text-[11px] text-ink-muted">Full-time • Fast Track Screen</span>
                      <button
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
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Talking Shree Avatar (5 cols) */}
        <div className="lg:col-span-5 bg-surface flex flex-col h-[calc(100vh-65px)] overflow-hidden border-l border-border">
          {/* Avatar Video / Visual Loop */}
          <div className="h-60 sm:h-64 bg-gradient-to-b from-brand-wash/60 via-surface to-surface border-b border-border relative flex flex-col items-center justify-center p-6 text-center">
            <div className="relative">
              <div
                className={`w-24 h-24 rounded-full bg-gradient-to-tr from-brand to-brand-dark p-1 shadow-emblem transition-transform ${
                  isSpeaking ? "scale-105 ring-4 ring-brand/30" : ""
                }`}
              >
                <div className="w-full h-full rounded-full bg-surface flex items-center justify-center text-4xl select-none">
                  👩‍💼
                </div>
              </div>

              {isSpeaking && (
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-brand text-[10px] font-bold text-white uppercase tracking-wider animate-pulse shadow-soft-sm">
                  Speaking
                </div>
              )}
            </div>

            <h3 className="font-bold text-sm text-ink mt-3 font-display">Shree</h3>
            <p className="text-[11px] text-brand font-semibold">AI Talent Acquisition Partner</p>

            <div className="absolute top-3 right-3">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] bg-brand-wash text-brand border border-brand/20 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-good animate-pulse" />
                Live Conversational
              </span>
            </div>
          </div>

          {/* Chat Transcript Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs bg-page">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 leading-relaxed ${
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
              <div className="text-[11px] text-ink-muted italic pl-2">
                Shree is thinking...
              </div>
            )}
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
              placeholder="Ask Shree about roles, process, or expectations..."
              className="flex-1 text-xs bg-page border border-border rounded-xl px-3.5 py-2.5 text-ink placeholder:text-ink-muted focus:outline-none focus:border-brand"
            />
            <button
              type="submit"
              disabled={!inputQuery.trim() || isThinking}
              className="p-2.5 bg-brand hover:bg-brand-dark disabled:opacity-40 text-white rounded-xl transition-colors shadow-button"
            >
              <Icon name="arrowRight" size={14} />
            </button>
          </form>
        </div>
      </main>

      {/* Quick Apply Modal */}
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
                <h4 className="font-bold text-base text-ink">Application Received!</h4>
                <p className="text-xs text-ink-muted max-w-sm mx-auto">
                  Shree is evaluating your profile against the role criteria. Check your email or view your live status link below.
                </p>
                <div className="pt-2 flex justify-center gap-3">
                  <Link
                    href={`/interview/demo`}
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
                    Paste Resume / LinkedIn Summary *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={applyResume}
                    onChange={(e) => setApplyResume(e.target.value)}
                    placeholder="Paste your resume text or experience highlights here..."
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
                    I grant consent for AI screening and data retention under statutory privacy guidelines (no demographic bias, deletion on request).
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
