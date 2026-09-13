"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

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
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Top Navigation */}
      <header className="px-6 py-4 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-base shadow-sm">
            S
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight text-white block">
              AskShree Careers
            </span>
            <span className="text-[10px] text-slate-400 block -mt-0.5">
              AI-Native Talent Gateway
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <Link
            href="/candidate/status"
            className="text-slate-400 hover:text-white transition-colors"
          >
            My Application Status
          </Link>
          <Link
            href="/tools/talent-ai"
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            Recruiter Login →
          </Link>
        </div>
      </header>

      {/* Main Dual-Panel Viewport */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* LEFT PANEL: Job Feed & Details (7 cols) */}
        <div className="lg:col-span-7 border-r border-slate-800 flex flex-col h-[calc(100vh-65px)] overflow-y-auto p-6 space-y-6">
          {/* Search Header */}
          <div className="flex items-center gap-3 bg-slate-950/70 border border-slate-800 rounded-xl px-4 py-2.5 shadow-inner">
            <Icon name="search" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by role title, department, or location..."
              className="bg-transparent border-none text-xs w-full focus:outline-hidden text-white placeholder-slate-500"
            />
          </div>

          {/* Job List */}
          <div className="space-y-3">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Open Positions ({filteredJobs.length})
            </h2>

            {filteredJobs.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                No open roles matching your search criteria.
              </div>
            ) : (
              filteredJobs.map((job) => {
                const isSelected = selectedJob?.id === job.id;
                return (
                  <div
                    key={job.id}
                    onClick={() => setSelectedJob(job)}
                    className={`cursor-pointer p-4.5 rounded-xl border transition-all ${
                      isSelected
                        ? "bg-slate-850 border-indigo-500 shadow-md shadow-indigo-950/40"
                        : "bg-slate-950/50 border-slate-800/80 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-sm text-white">{job.title}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {job.department || "General"} • {job.location || "Remote / Hybrid"}
                        </p>
                      </div>
                      {job.salary_range && (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-800/60 text-emerald-400">
                          {job.salary_range}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-800/60">
                      <span className="text-[11px] text-slate-500">Full-time • Fast Track Screen</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedJob(job);
                          setShowApplyModal(true);
                        }}
                        className="px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs"
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
        <div className="lg:col-span-5 bg-slate-950 flex flex-col h-[calc(100vh-65px)] overflow-hidden">
          {/* Avatar Video / Visual Loop */}
          <div className="h-64 sm:h-72 bg-gradient-to-b from-indigo-950/40 via-slate-900 to-slate-950 border-b border-slate-800 relative flex flex-col items-center justify-center p-6 text-center">
            <div className="relative">
              <div
                className={`w-28 h-28 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 p-1 shadow-2xl transition-transform ${
                  isSpeaking ? "scale-105 ring-4 ring-indigo-500/50" : ""
                }`}
              >
                <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-5xl select-none">
                  👩‍💼
                </div>
              </div>

              {isSpeaking && (
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-emerald-500 text-[10px] font-bold text-slate-950 uppercase tracking-wider animate-pulse">
                  Speaking
                </div>
              )}
            </div>

            <h3 className="font-bold text-sm text-white mt-3">Shree</h3>
            <p className="text-[11px] text-indigo-400">AI Talent Acquisition Partner</p>

            <div className="absolute top-3 right-3">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Zero-Burn Organic
              </span>
            </div>
          </div>

          {/* Chat Transcript Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 leading-relaxed ${
                    m.role === "user"
                      ? "bg-indigo-600 text-white rounded-br-xs"
                      : "bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-xs"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {isThinking && (
              <div className="text-[11px] text-slate-500 italic pl-2">
                Shree is thinking...
              </div>
            )}
          </div>

          {/* Chat Input Bar */}
          <form
            onSubmit={handleSendQuery}
            className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Ask Shree about roles, process, or expectations..."
              className="flex-1 text-xs bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={!inputQuery.trim() || isThinking}
              className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl transition-colors shadow-xs"
            >
              <Icon name="arrowRight" size={14} />
            </button>
          </form>
        </div>
      </main>

      {/* Quick Apply Modal */}
      {showApplyModal && selectedJob && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-base text-white">
                  Quick Apply: {selectedJob.title}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  60-second conversational screening. No password required.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowApplyModal(false);
                  setApplySuccess(false);
                }}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {applySuccess ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xl">
                  ✓
                </div>
                <h4 className="font-bold text-base text-white">Application Received!</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Shree is evaluating your profile against the role criteria. Check your email or view your live status link below.
                </p>
                <div className="pt-2 flex justify-center gap-3">
                  <Link
                    href={`/interview/demo`}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white"
                  >
                    Start AI Pre-Screen Now →
                  </Link>
                  <Link
                    href={`/candidate/status`}
                    className="px-4 py-2 rounded-xl text-xs font-medium border border-slate-700 text-slate-300 hover:bg-slate-800"
                  >
                    Track Status
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleQuickApply} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Full Name *</label>
                    <input
                      required
                      type="text"
                      value={applyName}
                      onChange={(e) => setApplyName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Email *</label>
                    <input
                      required
                      type="email"
                      value={applyEmail}
                      onChange={(e) => setApplyEmail(e.target.value)}
                      placeholder="jane@example.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={applyPhone}
                      onChange={(e) => setApplyPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Target Annual Salary</label>
                    <input
                      type="text"
                      value={applyExpectedSalary}
                      onChange={(e) => setApplyExpectedSalary(e.target.value)}
                      placeholder="$120,000"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">
                    Paste Resume / LinkedIn Summary *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={applyResume}
                    onChange={(e) => setApplyResume(e.target.value)}
                    placeholder="Paste your resume text or experience highlights here..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                  />
                </div>

                <label className="flex items-start gap-2.5 pt-1 cursor-pointer select-none">
                  <input
                    required
                    type="checkbox"
                    checked={applyConsented}
                    onChange={(e) => setApplyConsented(e.target.checked)}
                    className="mt-0.5 rounded border-slate-700 bg-slate-950 text-indigo-600"
                  />
                  <span className="text-[11px] text-slate-400">
                    I grant consent for AI screening and data retention under statutory privacy guidelines (no demographic bias, deletion on request).
                  </span>
                </label>

                <div className="pt-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowApplyModal(false)}
                    className="px-4 py-2 text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={applySubmitting || !applyConsented}
                    className="px-5 py-2 rounded-xl font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white shadow-md"
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
